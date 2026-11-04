# Closet

Standalone English-language virtual wardrobe and outfit recommender prototype.

## Run

Run `bash start.sh` with Python 3.12. The script installs the local CPU dependencies into `.deps/` on first run, then starts the app at `http://localhost:8000`. The cutout model downloads on the first garment upload.

Upload one or more tops, the same number of trousers, and three pairs of shoes. The app removes garment-photo backgrounds locally with U2NetP and stores both originals and cutouts in the browser's IndexedDB. Your full-body photo is stored there too. The files are not sent to a third-party image service. They remain available in the same browser profile and app origin until you remove them or clear site data.

Garment colors are estimated automatically from the cutout pixels. The wardrobe displays the detected color; patterned or multicolor items may be classified by their dominant shade.

You can drag and resize each cutout over the full-body photo. For the best background removal, upload a photo of one garment by itself, laid flat or on a hanger. The mockup does not warp clothing to body shape like a dedicated virtual try-on model.