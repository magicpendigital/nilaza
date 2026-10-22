// Deterministic exports from repository-owned, checksum-pinned Open Reflection sources.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

export const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
export function repoPath(relative){
  const full=path.resolve(repoRoot,relative);
  if(path.isAbsolute(relative)||!full.startsWith(repoRoot+path.sep))throw Error(`Path outside repository: ${relative}`);
  return full;
}
export async function generateBrandAssets({check=false}={}){
  const manifest=JSON.parse(await fs.readFile(repoPath('packages/content/data/brand-identity.json'),'utf8'));
  const sources=new Map();
  for(const a of manifest.assets){
    if(!a.path.startsWith('assets/brand/open-reflection/v1/') && !(a.role==='feature-artwork' && /^assets\/features\/open-reflection-(home|welcome)\.png$/.test(a.path)))throw Error(`Invalid brand source: ${a.path}`);
    const bytes=await fs.readFile(repoPath(a.path));
    if(digest(bytes)!==a.sha256)throw Error(`Master checksum changed: ${a.path}. Review/version the master explicitly.`);
    if(sources.has(a.id))throw Error(`Duplicate asset id: ${a.id}`);
    sources.set(a.id,bytes);
  }
  const lock={brandVersion:manifest.version,exports:[]};const drift=[];
  for(const o of manifest.outputs){
    if(!/^apps\/(mobile\/assets|mobile\/android\/app\/src\/main\/res|web\/public|admin\/assets|admin\/favicon)/.test(o.path))throw Error(`Invalid brand export target: ${o.path}`);
    let bytes=sources.get(o.asset);if(!bytes)throw Error(`Unknown source: ${o.asset}`);
    if(o.transform){
      const t=o.transform;
      let pipeline=sharp(bytes).resize({width:Math.round(t.width),height:t.height?Math.round(t.height):undefined,fit:t.fit||'inside',background:{r:0,g:0,b:0,alpha:0}});
      if(t.round){
        // Platform round mask only; brand geometry itself always comes from the master.
        const s=Math.round(t.width),mask=Buffer.alloc(s*s);
        for(let y=0;y<s;y++)for(let x=0;x<s;x++)mask[y*s+x]=Math.round(255*Math.max(0,Math.min(1,s/2-Math.hypot(x+.5-s/2,y+.5-s/2))));
        const alpha=await sharp(mask,{raw:{width:s,height:s,channels:1}}).png().toBuffer();
        bytes=await pipeline.ensureAlpha().png().toBuffer();
        pipeline=sharp(bytes).removeAlpha().joinChannel(await sharp(alpha).raw().toBuffer(),{raw:{width:s,height:s,channels:1}});
      }
      bytes=await (t.format==='jpeg'?pipeline.jpeg({quality:86,mozjpeg:true}):pipeline.png()).toBuffer();
    }
    lock.exports.push({path:o.path,sha256:digest(bytes)});
    const target=repoPath(o.path);
    if(check){const existing=await fs.readFile(target).catch(()=>null);if(!existing||digest(existing)!==digest(bytes))drift.push(o.path);}
    else{
      const existing=await fs.readFile(target).catch(()=>null);
      if(!existing||digest(existing)!==digest(bytes)){
        await fs.mkdir(path.dirname(target),{recursive:true});
        for(let attempt=0;;attempt++){
          try{await fs.writeFile(target,bytes);break;}
          catch(error){if(attempt>=2||!['UNKNOWN','EBUSY'].includes(error.code))throw error;await new Promise(resolve=>setTimeout(resolve,100));}
        }
      }
    }
  }
  const lockPath=repoPath('packages/content/data/brand-exports.json'),serialized=JSON.stringify(lock,null,2)+'\n';
  if(check){if(await fs.readFile(lockPath,'utf8').catch(()=>'')!==serialized)drift.push('packages/content/data/brand-exports.json');}
  else await fs.writeFile(lockPath,serialized);
  if(drift.length)throw Error(`Brand export drift (${drift.length}):\n${drift.join('\n')}\nRun npm run assets:generate after reviewing the sources.`);
  return `${check?'Checked':'Generated'} ${lock.exports.length} brand exports from ${sources.size} pinned repository sources (v${manifest.version}).`;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))generateBrandAssets({check:process.argv.includes('--check')}).then(console.log).catch(e=>{console.error(e.message);process.exitCode=1;});
