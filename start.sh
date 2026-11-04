#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -d .deps/rembg || ! -d .deps/onnxruntime ]]; then
  python3.12 -m pip install --target .deps -r requirements.txt
fi

PYTHONPATH="$PWD/.deps${PYTHONPATH:+:$PYTHONPATH}" exec python3.12 server.py