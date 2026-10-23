import json, struct, sys
for p in sys.argv[1:]:
    d = open(p, 'rb').read()
    clen, _ = struct.unpack_from('<II', d, 12)
    g = json.loads(d[20:20 + clen])
    nodes = g.get('nodes', [])
    joints = [nodes[j].get('name') for s in g.get('skins', []) for j in s['joints']]
    tris = 0
    for m in g.get('meshes', []):
        for pr in m['primitives']:
            if 'indices' in pr: tris += g['accessors'][pr['indices']]['count'] // 3
            else: tris += g['accessors'][pr['attributes']['POSITION']]['count'] // 3
    print(p, f"{len(d)/1e6:.2f} MB", 'tris', tris, 'meshes', len(g.get('meshes', [])), 'skins', len(g.get('skins', [])), 'joints', len(joints))
    print('  anims', [a.get('name') for a in g.get('animations', [])])
    print('  images', [(i.get('mimeType'), g['bufferViews'][i['bufferView']]['byteLength'] if 'bufferView' in i else i.get('uri')) for i in g.get('images', [])])
    print('  joints', joints[:30])
    print('  materials', [(m.get('name'), m.get('alphaMode'), list(m.get('pbrMetallicRoughness', {}).keys())) for m in g.get('materials', [])])
