import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {repoRoot,digest,repoPath} from './generate-brand-assets.mjs';

const check=process.argv.includes('--check');
const codexRoot=process.env.CODEX_HOME||path.join(os.homedir(),'.codex');
const manifest=JSON.parse(await fs.readFile(repoPath('skills/manifest.json'),'utf8'));
const changes=[];const failures=[];
for(const skill of manifest.skills){
 if(!['nilaza-plan-qc','nilaza-brand-experience','nilaza-tarot-deck-production','nilaza-tarot-content-qc','nilaza-tarot-art-qc'].includes(skill.name))throw Error('Unsupported sync target');
 for(const f of skill.files){
  if(f.path.includes('..')||path.isAbsolute(f.path))throw Error('Invalid skill path');
  const source=await fs.readFile(path.join(repoRoot,'skills',skill.name,f.path));
  if(digest(source)!==f.sha256)throw Error(`Unreviewed source drift: ${skill.name}/${f.path}. Update skills/manifest.json after validation.`);
  const target=path.join(codexRoot,'skills',skill.name,f.path);
  const existing=await fs.readFile(target).catch(()=>null);
  if(existing&&digest(existing)===f.sha256)continue;
  if(check){failures.push(`Missing/drifted ${target}`);continue;}
  if(existing&&digest(existing)!==f.previousInstalledSha256){failures.push(`Installed edits need reconciliation: ${target}`);continue;}
  changes.push({target,source});
 }
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else{for(const c of changes){await fs.mkdir(path.dirname(c.target),{recursive:true});await fs.writeFile(c.target,c.source);}console.log(check?'Project skills match reviewed repository sources.':`Synced ${changes.length} reviewed files; unrelated skills/metadata untouched.`);}
