# -*- coding: utf-8 -*-
"""压缩参考图：长边 > 1600px 的缩到 1600，> 500KB 的重编码，格式与扩展名保持一致。"""
import os, sys
from PIL import Image

root = sys.argv[1]
MAX_EDGE = 1600
THRESHOLD = 500 * 1024

before = after = 0
shrunk = 0
errors = []

for dirpath, _dirs, files in os.walk(root):
    if os.path.basename(dirpath) in ('_pages', '_tools'):
        continue
    for fn in files:
        p = os.path.join(dirpath, fn)
        if not fn.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            continue
        try:
            sz = os.path.getsize(p)
            before += sz
            if sz <= THRESHOLD:
                after += sz
                continue
            with Image.open(p) as im:
                fmt = (im.format or 'JPEG').upper()
                w, h = im.size
                if max(w, h) <= MAX_EDGE and fmt == 'JPEG':
                    after += sz
                    continue
                im = im.convert('RGB') if fmt in ('JPEG',) else im
                if max(w, h) > MAX_EDGE:
                    im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
                if fmt == 'PNG':
                    # 照片类 PNG 用 256 色调色板显著减小体积，扩展名不变
                    im = im.convert('RGBA') if 'A' in im.getbands() else im.convert('RGB')
                    im = im.convert('P', palette=Image.ADAPTIVE, colors=256)
                    im.save(p, format='PNG', optimize=True)
                elif fmt == 'WEBP':
                    im.save(p, format='WEBP', quality=88, method=6)
                else:
                    im.save(p, format='JPEG', quality=88, optimize=True, progressive=True)
            ns = os.path.getsize(p)
            after += ns
            shrunk += 1
        except Exception as e:
            errors.append((p, str(e)))
            after += sz if 'sz' in dir() else 0

print(f"before : {before/1024/1024:.1f} MB")
print(f"after  : {after/1024/1024:.1f} MB")
print(f"re-encoded: {shrunk}")
if errors:
    print("errors:")
    for p, e in errors[:10]:
        print("  ", os.path.basename(p), e)
