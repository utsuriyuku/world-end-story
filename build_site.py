from pathlib import Path
import gzip,hashlib,json,shutil
root=Path(__file__).resolve().parent
out=root/'dist'
shutil.copytree(root/'site',out,dirs_exist_ok=True)
m=json.loads((root/'large-assets/manifest.json').read_text())
data=b''.join((root/'large-assets'/p).read_bytes() for p in m['parts'])
assert len(data)==m['bytes'] and hashlib.sha256(data).hexdigest()==m['sha256']
(out/m['target']).write_bytes(data)
wasm=out/'prologue/game.wasm.gz'
wasm.with_suffix('').write_bytes(gzip.decompress(wasm.read_bytes()))
wasm.unlink()
# Replace the desktop server's PNG-to-WebP fallback with static aliases.
for p in list(out.rglob('*.webp')):
 alias=p.with_suffix('.png')
 if not alias.exists(): shutil.copyfile(p,alias)
(out/'.nojekyll').touch()
print('Static game built:',sum(p.stat().st_size for p in out.rglob('*') if p.is_file()),'bytes')
