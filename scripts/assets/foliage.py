import random, math, sys
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
random.seed(7)
src=Image.open(sys.argv[1]).convert("RGB"); src.putalpha(Image.open(sys.argv[3]).convert("L"))
OUT=sys.argv[2]
# --- extract leaves: find connected alpha blobs via bounding boxes on a coarse grid
W,H=src.size
a=src.split()[3].point(lambda v:255 if v>40 else 0)
# column/row scan to find leaf bboxes (atlas has 2 rows of leaves)
leaves=[]
bbox_all=[]
mask=a.load()
visited=set()
import collections
small=a.resize((W//4,H//4)); sm=small.load(); sw,sh=small.size
seen=[[False]*sh for _ in range(sw)]
for x in range(sw):
    for y in range(sh):
        if sm[x,y]>0 and not seen[x][y]:
            q=collections.deque([(x,y)]); seen[x][y]=True; xs=[];ys=[]
            while q:
                cx,cy=q.popleft(); xs.append(cx); ys.append(cy)
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx,ny=cx+dx,cy+dy
                    if 0<=nx<sw and 0<=ny<sh and not seen[nx][ny] and sm[nx,ny]>0:
                        seen[nx][ny]=True; q.append((nx,ny))
            if len(xs)>200:
                box=(min(xs)*4,min(ys)*4,(max(xs)+1)*4,(max(ys)+1)*4)
                leaves.append(src.crop(box))
print("leaves found:", len(leaves))

def cluster(size, n, scale, hue_shift, name, twig=True, light=1.0):
    img=Image.new("RGBA",(size,size),(0,0,0,0))
    d=ImageDraw.Draw(img)
    cx,cy=size/2,size/2
    if twig:
        for i in range(7):
            ang=random.uniform(0,2*math.pi); L=random.uniform(.25,.45)*size
            d.line([(cx,cy),(cx+math.cos(ang)*L,cy+math.sin(ang)*L)],fill=(70,55,40,255),width=max(2,size//120))
    for i in range(n):
        lf=random.choice(leaves)
        s=random.uniform(.55,1.0)*scale*size/max(lf.size)
        lf2=lf.resize((max(4,int(lf.size[0]*s)),max(4,int(lf.size[1]*s))),Image.LANCZOS)
        lf2=lf2.rotate(random.uniform(0,360),expand=True,resample=Image.BICUBIC)
        # colour variation
        r,g,b,al=lf2.split()
        f=random.uniform(.75,1.15)*light
        rgb=Image.merge("RGB",(r,g,b))
        rgb=ImageEnhance.Brightness(rgb).enhance(f)
        rgb=ImageEnhance.Color(rgb).enhance(random.uniform(.9,1.25))
        if hue_shift:
            rr,gg,bb=rgb.split(); rr=rr.point(lambda v:int(v*hue_shift[0])); gg=gg.point(lambda v:min(255,int(v*hue_shift[1]))); bb=bb.point(lambda v:int(v*hue_shift[2]))
            rgb=Image.merge("RGB",(rr,gg,bb))
        lf2=Image.merge("RGBA",(*rgb.split(),al))
        # radial distribution, denser near centre
        rad=(random.random()**0.7)*size*0.42
        ang=random.uniform(0,2*math.pi)
        px=int(cx+math.cos(ang)*rad-lf2.size[0]/2); py=int(cy+math.sin(ang)*rad-lf2.size[1]/2)
        img.alpha_composite(lf2,(max(0,min(size-lf2.size[0],px)),max(0,min(size-lf2.size[1],py))))
    img.save(f"{OUT}/{name}.png",optimize=True)
    return img

cluster(512, 150, 0.16, (0.92,1.05,0.85), "foliage_cluster")
cluster(512, 210, 0.11, (1.0,1.12,0.8), "birch_cluster", light=1.15)

# --- seamless hedge tile
def hedge(size,n,name):
    img=Image.new("RGBA",(size,size),(38,58,30,255))
    for i in range(n):
        lf=random.choice(leaves)
        s=random.uniform(.5,.9)*0.07*size/max(lf.size)
        lf2=lf.resize((max(3,int(lf.size[0]*s)),max(3,int(lf.size[1]*s))),Image.LANCZOS).rotate(random.uniform(0,360),expand=True)
        r,g,b,al=lf2.split(); rgb=ImageEnhance.Brightness(Image.merge("RGB",(r,g,b))).enhance(random.uniform(.55,1.05))
        rr,gg,bb=rgb.split(); gg=gg.point(lambda v:min(255,int(v*1.08))); bb=bb.point(lambda v:int(v*.8))
        lf2=Image.merge("RGBA",(rr,gg,bb,al))
        x=random.randint(0,size-1); y=random.randint(0,size-1)
        for ox in (-size,0,size):
            for oy in (-size,0,size):
                img.alpha_composite(lf2,(0,0),None) if False else None
                bx=x+ox-lf2.size[0]//2; by=y+oy-lf2.size[1]//2
                if bx<size and by<size and bx+lf2.size[0]>0 and by+lf2.size[1]>0:
                    tmp=Image.new("RGBA",(size,size),(0,0,0,0)); tmp.paste(lf2,(bx,by),lf2); img.alpha_composite(tmp)
    img.convert("RGB").save(f"{OUT}/{name}.jpg",quality=85)
hedge(512, 900, "hedge_diff")

# --- spruce frond card (alpha): a branch with needles, drooping
def spruce(size,name):
    img=Image.new("RGBA",(size,size),(0,0,0,0)); d=ImageDraw.Draw(img)
    # main branch from left-middle to right, slight droop
    def needle_branch(x0,y0,x1,y1,depth,width):
        d.line([(x0,y0),(x1,y1)],fill=(58,44,32,255),width=width)
        L=math.hypot(x1-x0,y1-y0); n=int(L/3)
        for i in range(n):
            t=i/max(1,n); x=x0+(x1-x0)*t; y=y0+(y1-y0)*t
            for side in (-1,1):
                ang=math.atan2(y1-y0,x1-x0)+side*random.uniform(0.7,1.2)
                nl=random.uniform(5,9)*(1-0.5*t)*size/256
                g=random.randint(50,85); col=(int(g*.42),g,int(g*.45),255)
                d.line([(x,y),(x+math.cos(ang)*nl,y+math.sin(ang)*nl)],fill=col,width=max(1,size//256))
        if depth>0:
            for k in range(6):
                t=random.uniform(.15,.85); x=x0+(x1-x0)*t; y=y0+(y1-y0)*t
                ang=math.atan2(y1-y0,x1-x0)+random.choice((-1,1))*random.uniform(.5,1.0)
                l=L*random.uniform(.2,.35)*(1-t*.5)
                needle_branch(x,y,x+math.cos(ang)*l,y+math.sin(ang)*l+l*.15,depth-1,max(1,width-2))
    for j in range(3):
        y=size*(0.35+0.15*j)
        needle_branch(size*0.04,y,size*0.96,y+size*0.12,2,max(2,size//100))
    img=img.filter(ImageFilter.SMOOTH)
    img.save(f"{OUT}/{name}.png",optimize=True)
spruce(512,"spruce_frond")

# --- birch bark (tileable vertical)
def birch(size,name):
    img=Image.new("RGB",(size,size),(228,226,218)); d=ImageDraw.Draw(img)
    for i in range(55):
        y=random.randint(0,size); x=random.randint(0,size); w=random.randint(8,40); h=random.randint(1,4)
        c=random.randint(40,95); d.ellipse([x,y,x+w,y+h],fill=(c,c-4,c-8))
        d.ellipse([x-size,y,x-size+w,y+h],fill=(c,c-4,c-8))
    for i in range(3000):
        x=random.randint(0,size-1); y=random.randint(0,size-1); v=random.randint(190,240)
        d.point((x,y),fill=(v,v-3,v-8))
    img=img.filter(ImageFilter.GaussianBlur(0.6))
    img.save(f"{OUT}/{name}.jpg",quality=85)
birch(256,"birch_bark")
print("ok")
