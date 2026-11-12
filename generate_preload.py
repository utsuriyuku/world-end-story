from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parent/'site'
files=[]
for p in (root/'finale').rglob('*'):
 if p.is_file() and p.suffix in ['.webp','.png','.jpg','.mp4']:
  rel=p.relative_to(root).as_posix()
  priority=0 if any(x in rel for x in ['reality_street','realm_bedrock','references/','realm_v2/','street_near_frames','street_wall_frames','fracture_rock']) else 1 if any(x in rel for x in ['corner','district']) else 3 if '/g08_v2/' in rel else 2
  files.append({'url':rel,'bytes':p.stat().st_size,'hash':hashlib.sha256(p.read_bytes()).hexdigest(),'priority':priority})
files.sort(key=lambda x:(x['priority'],x['url']))
version=hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest()[:16]
(root/'preload-manifest.json').write_text(json.dumps({'version':version,'files':files},ensure_ascii=False),encoding='utf-8')
s=(Path(__file__).resolve().parent/'asset-sw.template.js').read_text(encoding='utf-8').replace('__VERSION__',version).replace('__FILES__',json.dumps([f['url'] for f in files]))
(root/'asset-sw.js').write_text(s,encoding='utf-8')
print('Preload manifest:',len(files),'files',sum(x['bytes'] for x in files),'bytes')
