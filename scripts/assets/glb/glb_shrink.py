"""Downscale embedded textures of a GLB (max side N px, JPEG q) and repack the binary chunk.
usage: python3 -I glb_shrink.py in.glb out.glb [max_px=1024] [quality=84]"""
import io, json, struct, sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
mx = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
q = int(sys.argv[4]) if len(sys.argv) > 4 else 84
d = open(src, 'rb').read()
off, g, b = 12, None, b''
while off < len(d):
    ln, ty = struct.unpack_from('<II', d, off)
    chunk = d[off + 8: off + 8 + ln]
    if ty == 0x4E4F534A: g = json.loads(chunk)
    elif ty == 0x004E4942: b = chunk
    off += 8 + ln
views = g['bufferViews']
new_data = {}
for img in g.get('images', []):
    if 'bufferView' not in img: continue
    bv = views[img['bufferView']]
    raw = b[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
    im = Image.open(io.BytesIO(raw)); im.load()
    w, h = im.size
    if max(w, h) > mx:
        s = mx / max(w, h); im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    out = io.BytesIO(); im.convert('RGB').save(out, 'JPEG', quality=q, optimize=True)
    new_data[img['bufferView']] = out.getvalue(); img['mimeType'] = 'image/jpeg'
    print(f'image {w}x{h} {len(raw)//1024} KB -> {im.size[0]}x{im.size[1]} {len(out.getvalue())//1024} KB')
nb = bytearray()
for i, bv in enumerate(views):
    data = new_data.get(i) or b[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
    while len(nb) % 4: nb.append(0)
    bv['byteOffset'] = len(nb); bv['byteLength'] = len(data); bv['buffer'] = 0
    nb.extend(data)
g['buffers'] = [{'byteLength': len(nb)}]
j = json.dumps(g, separators=(',', ':')).encode(); j += b' ' * ((4 - len(j) % 4) % 4)
while len(nb) % 4: nb.append(0)
with open(dst, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(j) + 8 + len(nb)))
    f.write(struct.pack('<II', len(j), 0x4E4F534A) + j)
    f.write(struct.pack('<II', len(nb), 0x004E4942) + bytes(nb))
print('wrote', dst, len(open(dst, 'rb').read()) // 1024, 'KB')
