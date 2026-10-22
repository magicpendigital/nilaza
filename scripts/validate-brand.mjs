import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {generateBrandAssets,repoPath,digest} from './generate-brand-assets.mjs';

const errors=[];
const assert=(condition,message)=>{if(!condition)errors.push(message);};
try{console.log(await generateBrandAssets({check:true}));}catch(e){errors.push(e.message);}
const manifest=JSON.parse(await fs.readFile(repoPath('packages/content/data/brand-identity.json'),'utf8'));
assert(manifest.version==='1.0.0'&&manifest.name==='Nilaza Open Reflection','Unexpected identity version/name');
assert(manifest.palette.charcoal==='#151416','Charcoal token drift');
assert(manifest.typography.wordmark.family==='EB Garamond'&&manifest.typography.wordmark.weight===400,'Wordmark font drift');
assert(manifest.typography.body.family==='Hanken Grotesk','Body font drift');
assert(manifest.copy.vi.tagline==='Một khoảng mở để lắng nghe mình.'&&manifest.copy.en.tagline==='A space to listen to yourself.','Approved tagline drift');
assert(manifest.motion.durationMs===800&&manifest.motion.reducedMotion==='static-final-frame','Motion contract drift');
const paths=new Set();for(const o of manifest.outputs){assert(!paths.has(o.path),`Duplicate export ${o.path}`);paths.add(o.path);}
for(const a of manifest.assets.filter(a=>a.role==='logo'&&a.path.endsWith('.svg'))){const s=await fs.readFile(repoPath(a.path),'utf8');assert(!/<(image|text|foreignObject)\b|https?:\/\/(?!www.w3.org)/i.test(s),`Logo is not self-contained outlines: ${a.path}`);}
for(const p of ['apps/mobile/assets/icon.png','apps/mobile/assets/adaptive-icon.png','apps/mobile/assets/monochrome-icon.png']){const m=await sharp(repoPath(p)).metadata();assert(m.width===1024&&m.height===1024,`Wrong icon canvas ${p}`);if(p.endsWith('/icon.png'))assert(!m.hasAlpha,'Store icon must be opaque');}
const glyph=await sharp(repoPath('apps/mobile/assets/notification-icon.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let ink=0,clear=0;for(let i=0;i<glyph.data.length;i+=4){if(glyph.data[i+3]){ink++;assert(glyph.data[i]===255&&glyph.data[i+1]===255&&glyph.data[i+2]===255,'Notification glyph must be white');}else clear++;}
assert(ink>0&&clear>0,'Notification glyph needs visible mark and transparent background');
const adaptive=await sharp(repoPath('apps/mobile/assets/adaptive-icon.png')).ensureAlpha().raw().toBuffer();let maxRadius=0;for(let y=0;y<1024;y++)for(let x=0;x<1024;x++)if(adaptive[(y*1024+x)*4+3]>127)maxRadius=Math.max(maxRadius,Math.hypot(x+.5-512,y+.5-512));assert(maxRadius<=1024*33/108,'Adaptive symbol exceeds safe circle');
const expo=JSON.parse(await fs.readFile(repoPath('apps/mobile/app.json'),'utf8')).expo;
assert(expo.plugins.some(p=>Array.isArray(p)&&p[0]==='expo-splash-screen'),'Splash plugin missing');
assert(expo.plugins.some(p=>Array.isArray(p)&&p[0]==='expo-notifications'&&p[1].icon==='./assets/notification-icon.png'),'Notification config uses wrong image');
for(const p of ['scripts/generate-brand-assets.mjs','scripts/build-mobile-runtime-assets.ps1','apps/mobile/src/auth/AuthFlow.tsx','apps/mobile/src/a2ui/index.tsx','apps/web/src/components/SiteHeader.astro','apps/admin/index.html']){
 const text=await fs.readFile(repoPath(p),'utf8');assert(!/\.gemini|nilaza[-_]botanical[-_]infinity|nilaza-infinity|nilaza-brand-emblem|>∞<|brand-mark[^>]*>N</i.test(text),`Active legacy identity source: ${p}`);
}
for(const p of ['AGENTS.md','docs/AGENT_TASK_ROUTER.md','docs/PLAN_QC_PROTOCOL.md','DESIGN.md','docs/STITCH_DESIGN_STATUS.md','apps/mobile/src/a2ui/README.md'])assert((await fs.readFile(repoPath(p),'utf8')).includes('BRAND_GUIDELINES.md'),`Missing brand route: ${p}`);
const skills=JSON.parse(await fs.readFile(repoPath('skills/manifest.json'),'utf8'));
for(const s of skills.skills)for(const f of s.files){assert(digest(await fs.readFile(repoPath(`skills/${s.name}/${f.path}`)))===f.sha256,`Skill source drift ${s.name}/${f.path}`);}
const publicDirs=['apps/web/public','apps/web/src/content/help','apps/web/src/content/legal'];
async function scan(dir){for(const e of await fs.readdir(repoPath(dir),{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())await scan(p);else{assert(!/(AGENTS|OWNER_GUIDE|prompt-library|coding-agents|BRAND_ROLLOUT)/i.test(e.name),`Internal file in public content: ${p}`);if(/\.(md|json|txt|html)$/i.test(e.name)){const s=await fs.readFile(repoPath(p),'utf8');assert(!/NILAZA_ADMIN_AI_STUDIO_OWNER_GUIDE|service_role|OPENAI_API_KEY/.test(s),`Internal content leak: ${p}`);}}}}
for(const dir of publicDirs)await scan(dir);
if(errors.length){console.error([...new Set(errors)].join('\n'));process.exitCode=1;}else console.log(`Brand validation passed: v${manifest.version}, ${manifest.assets.length} sources, ${paths.size} exports, native image checks, document routes and public boundary. Native behavior still requires a release-device test.`);
