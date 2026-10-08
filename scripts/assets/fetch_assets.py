import json, os, sys, urllib.request, io
from PIL import Image, ImageOps, ImageEnhance
RAW=sys.argv[1]; OUT=sys.argv[2]
def get(url, path):
    if not os.path.exists(path):
        print("GET", url[-70:]); import subprocess; subprocess.run(["curl","-sSfL","-m","300","-o",path,url],check=True)
    return path
def files(id):
    p=os.path.join(RAW, id+"_files.json")
    get("https://api.polyhaven.com/files/"+id, p)
    return json.load(open(p))
# (id, out-name, size, tintable)
TEX=[
 ("asphalt_04","asphalt",1024,False),
 ("concrete_pavement","pavement",512,False),
 ("granite_tile_04","granite",512,False),
 ("leafy_grass","grass",512,False),  # then run lawn.py (hue shift)
 ("gravel_floor_02","gravel",512,False),
 ("white_planks_clean","siding",512,True),
 ("grey_roof_01","roof_dark",512,False),
 ("roof_tiles","roof_red",512,False),
 ("concrete","concrete",512,False),
 ("pine_bark","bark",512,False),
 ("clay_plaster","plaster",512,True),
 ("large_red_bricks","brick",512,False),
]
manifest=[]
for id,name,size,tint in TEX:
    f=files(id)
    for key,suffix in [("Diffuse","diff"),("nor_gl","nor"),("arm","arm")]:
        e=f[key]["1k"]["jpg"]
        raw=get(e["url"], os.path.join(RAW, f"{id}_{suffix}.jpg"))
        im=Image.open(raw).convert("RGB")
        if im.size[0]!=size: im=im.resize((size,size), Image.LANCZOS)
        if suffix=="diff" and tint:
            g=ImageOps.grayscale(im); g=ImageOps.autocontrast(g, cutoff=1)
            g=g.point(lambda v: int(150+v*105/255))  # light, low-contrast base → material.color tints it
            im=g.convert("RGB")
        im.save(os.path.join(OUT,"tex",f"{name}_{suffix}.jpg"), quality=82, optimize=True, progressive=True)
    manifest.append({"name":name,"source":"Poly Haven","asset":id,"url":f"https://polyhaven.com/a/{id}","license":"CC0 1.0"})
# leaf atlas from island_tree_01 (diffuse + alpha → RGBA png)
f=files("island_tree_01")
d=get(f["leaves_diff"]["1k"]["jpg"]["url"], os.path.join(RAW,"leaves_diff.jpg"))
a=get(f["leaves_alpha"]["1k"]["png"]["url"], os.path.join(RAW,"leaves_alpha.png"))
dim=Image.open(d).convert("RGB").resize((512,512), Image.LANCZOS)
aim=Image.open(a).convert("L").resize((512,512), Image.LANCZOS)
dim.putalpha(aim); dim.save(os.path.join(OUT,"tex","leaves_rgba.png"), optimize=True)
manifest.append({"name":"leaves","source":"Poly Haven","asset":"island_tree_01 (leaf texture only)","url":"https://polyhaven.com/a/island_tree_01","license":"CC0 1.0"})
# sky
f=files("kloofendal_48d_partly_cloudy_puresky")
get(f["hdri"]["1k"]["hdr"]["url"], os.path.join(OUT,"sky","sky_1k.hdr"))
tm=get(f["tonemapped"]["url"], os.path.join(RAW,"sky_tonemapped.jpg"))
Image.MAX_IMAGE_PIXELS=None
im=Image.open(tm).convert("RGB").resize((4096,2048), Image.LANCZOS)
im.save(os.path.join(OUT,"sky","sky_4k.jpg"), quality=84, optimize=True, progressive=True)
manifest.append({"name":"sky","source":"Poly Haven","asset":"kloofendal_48d_partly_cloudy_puresky","url":"https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky","license":"CC0 1.0"})
json.dump(manifest, open(os.path.join(OUT,"LICENSES.json"),"w"), indent=2)
print("done")
