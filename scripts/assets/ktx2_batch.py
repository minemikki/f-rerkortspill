import glob, os, subprocess, sys
from PIL import Image
src, out, enc, scripts, tmp = sys.argv[1:6]
for f in sorted(glob.glob(os.path.join(src, '*'))):
    name = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f)
    alpha = im.mode == 'RGBA'
    im = im.convert('RGBA').transpose(Image.FLIP_TOP_BOTTOM)  # match TextureLoader flipY
    raw = os.path.join(tmp, name + '.rgba')
    open(raw, 'wb').write(im.tobytes())
    kind = 'normal' if name.endswith('_nor') else ('linear' if name.endswith('_arm') else 'srgb')
    q = '200' if kind == 'normal' else '160'
    dst = os.path.join(out, name + '.ktx2')
    r = subprocess.run(['node', os.path.join(scripts, 'ktx2_encode.cjs'), enc, raw, str(im.width), str(im.height), dst, kind, q, '1' if alpha else '0'], capture_output=True, text=True)
    if r.returncode: print('FAIL', name, r.stderr[-300:]); continue
    print(name, os.path.getsize(f), '->', os.path.getsize(dst))
