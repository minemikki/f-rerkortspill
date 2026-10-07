# Turns a Poly Haven grass diffuse into a greener Nordic summer lawn (hue shift browns → green).
import sys, json, os, subprocess
from PIL import Image
import numpy as np
RAW, OUT = sys.argv[1], sys.argv[2]
id = 'leafy_grass'
f = json.load(open(f'{RAW}/{id}_files.json'))
for key, suf in [('Diffuse', 'diff'), ('nor_gl', 'nor'), ('arm', 'arm')]:
    p = f'{RAW}/{id}_{suf}.jpg'
    if not os.path.exists(p): subprocess.run(['curl', '-sSfL', '-o', p, f[key]['1k']['jpg']['url']], check=True)
    im = Image.open(p).convert('RGB').resize((512, 512), Image.LANCZOS)
    if suf == 'diff':
        hsv = np.array(im.convert('HSV')).astype(np.float32)
        h = hsv[..., 0] * 360 / 255
        # pull hues in [0,70] toward ~82° (yellow-green), keep a little variation
        w = np.clip((75 - np.abs(h - 40)) / 75, 0, 1)
        h = h + (82 - h) * 0.72 * w
        hsv[..., 0] = h * 255 / 360
        hsv[..., 1] = np.clip(hsv[..., 1] * 1.05, 0, 255)
        hsv[..., 2] = np.clip(hsv[..., 2] * 0.98, 0, 255)
        im = Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB')
    im.save(f'{OUT}/grass_{suf}.jpg', quality=82, optimize=True, progressive=True)
print('ok')
