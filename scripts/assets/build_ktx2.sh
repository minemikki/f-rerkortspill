#!/usr/bin/env bash
# Rebuild public/assets/ktx2/*.ktx2 from public/assets/tex (JPG/PNG stay as fallback).
# ETC1S + mipmaps; normal maps use the normal-map preset; images are flipped to
# match TextureLoader's flipY so UVs and normal-map green stay identical.
# Needs: node, python3 + Pillow. Downloads the Basis Universal encoder (Apache-2.0).
set -euo pipefail
cd "$(dirname "$0")/../.."
WORK="${TMPDIR:-/tmp}/kjor-ktx2"; mkdir -p "$WORK/enc" "$WORK/rgba" public/assets/ktx2
URL=https://cdn.jsdelivr.net/gh/BinomialLLC/basis_universal@master/webgl/encoder/build
[ -f "$WORK/enc/basis_encoder.wasm" ] || { curl -sSfo "$WORK/enc/basis_encoder.js" "$URL/basis_encoder.js"; curl -sSfo "$WORK/enc/basis_encoder.wasm" "$URL/basis_encoder.wasm"; }
python3 -I scripts/assets/ktx2_batch.py public/assets/tex public/assets/ktx2 "$WORK/enc" scripts/assets "$WORK/rgba"
# transcoder shipped with three.js (must match the three version in package.json)
mkdir -p public/basis && cp node_modules/three/examples/jsm/libs/basis/basis_transcoder.{js,wasm} public/basis/
