// Owner-authorized Nilaza history only. Unmatched candidate values never leave this process.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {StringDecoder} from 'node:string_decoder';
import {createZstdDecompress} from 'node:zlib';
import {DatabaseSync} from 'node:sqlite';

export function extractCandidates(text){
  if(typeof text!=='string'||text.length>8388608)return [];
  const values=new Set();
  for(const re of [
    /\bsk-[A-Za-z0-9_-]{12,}/g,
    /\bpk-lf-[A-Za-z0-9-]{20,}/g,
    /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{12,}/g,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    /\b0x[A-Za-z0-9_-]{20,}/g,
    /postgres(?:ql)?:\/\/[^\s"'`<>\\]+/g,
    /https:\/\/[^\s"'`<>\\]+/g
  ])for(const m of text.matchAll(re))if(Buffer.byteLength(m[0])<=16384)values.add(m[0]);
  // Fixed variable vocabulary; quoted literals only, never evaluate assignments or follow paths.
  const assignments=/\b(?:OPENAI_API_KEY|OPENROUTER_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY|LANGFUSE_PUBLIC_KEY|LANGFUSE_SECRET_KEY|LANGFUSE_BASE_URL|TURNSTILE_SECRET_KEY|AI_TRACE_QA_ENCRYPTION_KEY|SUPABASE_DB_URL|DATABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)["']?\s*[:=]\s*(["'])([^\r\n]*?)\1/g;
  for(const m of text.matchAll(assignments))if(m[2].length&&Buffer.byteLength(m[2])<=16384)values.add(m[2]);
  return [...values];
}
export function isNilazaCwd(cwd){
  if(typeof cwd!=='string')return false;
  cwd=cwd.replace(/^\\\\\?\\(?=[A-Za-z]:[\\/])/,'');
  if(!/^D:[\\/]/i.test(cwd))return false;
  const normalized=path.win32.resolve(cwd).toLowerCase();return normalized==='d:\\nilaza'||normalized.startsWith('d:\\nilaza\\');
}
export function normalizeHistoryPath(row){
  if(!isNilazaCwd(row?.cwd)||typeof row.rollout_path!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.id))throw Error('HISTORY_PATH');
  const original=path.win32.resolve(row.rollout_path.replace(/^\\\\\?\\(?=[A-Za-z]:[\\/])/ ,''));
  const roots=['C:\\Users\\Admin\\.codex\\sessions\\','C:\\Users\\Admin\\.codex\\archived_sessions\\'];
  const suffix=new RegExp('^'+row.id+'(?:_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?\\.jsonl(?:\\.zst)?$','i');
  const basename=path.win32.basename(original);
  const firstId=basename.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  if(firstId?.[0].toLowerCase()!==row.id.toLowerCase()||!roots.some(r=>original.toLowerCase().startsWith(r.toLowerCase()))||!suffix.test(basename.slice(firstId?.index??0)))throw Error('HISTORY_PATH');
  return original;
}
function firstMeta(file){
  const b=Buffer.alloc(65536);const fd=fs.openSync(file,'r');
  try{let n=0;while(n<b.length){if(fs.readSync(fd,b,n,1,null)!==1)break;if(b[n++]===10)break;}
    const x=JSON.parse(b.subarray(0,n).toString('utf8'));
    const p=x.payload;
    return x.type==='session_meta'&&isNilazaCwd(p?.cwd)&&/^[a-f0-9-]{36}$/i.test(p.id)?{id:p.id}:null;
  }catch{return null;}finally{b.fill(0);fs.closeSync(fd);}
}
function discover(){
  const out=[];
  for(const base of ['C:/Users/Admin/.codex/sessions/2026','C:/Users/Admin/.codex/archived_sessions']){
    if(!fs.existsSync(base))continue;
    const walk=(dir,depth)=>{
      if(depth>4||fs.realpathSync.native(dir).toLowerCase()!==path.resolve(dir).toLowerCase())return;
      for(const e of fs.readdirSync(dir,{withFileTypes:true})){
        if(e.isSymbolicLink())continue;const p=path.join(dir,e.name);
        if(e.isDirectory())walk(p,depth+1);
        else if(e.isFile()&&e.name.endsWith('.jsonl')){
          const meta=firstMeta(p);if(meta){if(out.length>=1000)throw Error('HISTORY_LIMIT');out.push({file:p,...meta});}
        }
      }
    };walk(base,0);
  }
  return out;
}
function strings(value,visit,depth=0){
  if(depth>12)return;
  if(typeof value==='string'){
    visit(value);
    if(value.length<8388608&&/^[\s]*[\[{]/.test(value)){let parsed;try{parsed=JSON.parse(value);}catch{}if(parsed!==undefined)strings(parsed,visit,depth+1);}
  }else if(Array.isArray(value))for(const x of value)strings(x,visit,depth+1);
  else if(value&&typeof value==='object')for(const x of Object.values(value))strings(x,visit,depth+1);
}
export async function recoverFromHistory(targets){
  if(!Array.isArray(targets)||targets.length>100)throw Error('TARGETS');
  const byDigest=new Map();
  for(const t of targets){if(!/^[a-f0-9]{64}$/i.test(t.digest))continue;const h=t.digest.toLowerCase();if(!byDigest.has(h))byDigest.set(h,[]);byDigest.get(h).push(t);}
  const matches=new Map(),seen=new Set();let scannedFiles=0,skippedOversizedLines=0;
  if(!byDigest.size)return {matches:[],scannedFiles:0,candidateCount:0,skippedOversizedLines:0};
  const db=new DatabaseSync('C:/Users/Admin/.codex/state_5.sqlite',{readOnly:true});
  let rows;
  try{rows=db.prepare("SELECT id,cwd,rollout_path FROM threads WHERE lower(cwd) LIKE '%nilaza%' ORDER BY CASE WHEN lower(title) LIKE '%backend%' OR lower(title) LIKE '%supabase%' OR lower(title) LIKE '%openrouter%' OR lower(title) LIKE '%langfuse%' OR lower(title) LIKE '%smtp%' OR lower(title) LIKE '%turnstile%' THEN 0 ELSE 1 END, created_at DESC").all();}finally{db.close();}
  const files=new Map();let missingFiles=0;
  for(const row of rows){
    if(!isNilazaCwd(row.cwd)||typeof row.rollout_path!=='string'||!/^[a-f0-9-]{36}$/i.test(row.id))continue;
    const original=normalizeHistoryPath(row);
    const file=fs.existsSync(original)?original:original.endsWith('.jsonl')&&fs.existsSync(original+'.zst')?original+'.zst':null;
    if(!file){missingFiles++;continue;}
    if(fs.realpathSync.native(file).toLowerCase()!==path.resolve(file).toLowerCase()||fs.lstatSync(file).isSymbolicLink())throw Error('HISTORY_PATH');
    files.set(row.id,{id:row.id,file});
  }
  if(files.size>1000)throw Error('HISTORY_LIMIT');
  let scannedBytes=0,limited=false;
  for(const source of files.values()){
    if(!byDigest.size)break;
    scannedFiles++;
    const visit=text=>{
      for(const value of extractCandidates(text)){
        const digest=crypto.createHash('sha256').update(value).digest('hex');
        if(seen.has(digest))continue;seen.add(digest);
        if(seen.size>500000)throw Error('CANDIDATE_LIMIT');
        for(const t of byDigest.get(digest)??[])matches.set(t.projectRef+':'+t.name,{projectRef:t.projectRef,name:t.name,value,threadId:source.id});
      }
    };
    const input=fs.createReadStream(source.file,{highWaterMark:65536});
    const stream=source.file.endsWith('.zst')?input.pipe(createZstdDecompress({chunkSize:65536})):input;
    const decoder=new StringDecoder('utf8');let overlap='';
    try{
      for await(const chunk of stream){
        scannedBytes+=chunk.length;
        if(scannedBytes>8589934592){limited=true;break;}
        const text=overlap+decoder.write(chunk);
        visit(text);
        // JSON-escaped tool arguments can contain quoted literals. Decode escapes as data only.
        const decoded=text.replace(/\\"/g,'"').replace(/\\n/g,'\n');if(decoded!==text)visit(decoded);
        overlap=text.slice(-16640);chunk.fill(0);
      }
    }finally{input.destroy();stream.destroy();overlap='';}
    if(limited)break;
    if(matches.size===targets.filter(t=>/^[a-f0-9]{64}$/i.test(t.digest)).length)break;
  }
  return {matches:[...matches.values()],scannedFiles,candidateCount:seen.size,skippedOversizedLines,scannedBytes,eligibleFiles:files.size,missingFiles,limited};
}
