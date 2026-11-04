import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from threading import Lock

from PIL import Image
from rembg import new_session, remove


MAX_UPLOAD_BYTES = 20 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000
MODEL_NAME = "u2netp"
model_session = None
model_lock = Lock()


def get_model_session():
    global model_session
    if model_session is None:
        with model_lock:
            if model_session is None:
                model_session = new_session(MODEL_NAME)
    return model_session


class AppHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/api/remove-background":
            self.send_error(404)
            return

        content_type = self.headers.get("Content-Type", "")
        if not content_type.startswith("image/"):
            self.send_json_error(415, "Upload an image file.")
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_json_error(400, "Invalid image size.")
            return

        if content_length <= 0 or content_length > MAX_UPLOAD_BYTES:
            self.send_json_error(413, "Image must be smaller than 20 MB.")
            return

        image_bytes = self.rfile.read(content_length)
        try:
            with Image.open(BytesIO(image_bytes)) as image:
                if image.width * image.height > MAX_IMAGE_PIXELS:
                    self.send_json_error(413, "Image resolution is too large.")
                    return
                image.verify()
            cutout = remove(image_bytes, session=get_model_session())
        except Exception as error:
            print(f"Background removal failed: {error}", flush=True)
            self.send_json_error(422, "Could not remove the background from this image.")
            return

        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(cutout)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(cutout)

    def send_json_error(self, status, message):
        payload = json.dumps({"error": message}, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), AppHandler)
    print(f"Closet is running at http://localhost:{port}", flush=True)
    server.serve_forever()