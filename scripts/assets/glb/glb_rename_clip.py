import json, struct, sys
p, a, b = sys.argv[1], sys.argv[2], sys.argv[3]
d = open(p, 'rb').read(); ln, _ = struct.unpack_from('<II', d, 12); g = json.loads(d[20:20 + ln]); rest = d[20 + ln:]
for an in g['animations']:
    if a in an['name']: an['name'] = b
j = json.dumps(g, separators=(',', ':')).encode(); j += b' ' * ((4 - len(j) % 4) % 4)
open(p, 'wb').write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(j) + len(rest)) + struct.pack('<II', len(j), 0x4E4F534A) + j + rest)
print([x['name'] for x in g['animations']])
