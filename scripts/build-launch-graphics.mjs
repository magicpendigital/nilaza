// Editable HTML templates, rendered with the approved local Playwright workflow.
import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const deps=process.env.NILAZA_ARTIFACT_DEPS;if(!deps)throw Error('Set NILAZA_ARTIFACT_DEPS to bundled dependencies.');
const req=createRequire(path.join(deps,'node/package.json'));const {chromium}=req('playwright');
const dir=path.join(root,'design/launch/open-reflection-v1');const source=path.join(dir,'source/graphics');const out=path.join(dir,'exports/graphics');await fs.mkdir(source,{recursive:true});await fs.mkdir(out,{recursive:true});
const identity=JSON.parse(await fs.readFile(path.join(root,'packages/content/data/brand-identity.json'),'utf8'));
const data=async(p,mime)=>`data:${mime};base64,${(await fs.readFile(path.join(root,p))).toString('base64')}`;
const logo=await data('assets/brand/open-reflection/v1/logo/horizontal-compact-ivory.png','image/png');
const symbol=await data('assets/brand/open-reflection/v1/logo/symbol-ivory.png','image/png');
const art=await data('apps/web/public/brand/v1/artwork/home.jpg','image/jpeg');
const eb=await data('assets/brand/open-reflection/v1/source/EBGaramond-Regular.ttf','font/ttf');
const hk=await data('assets/brand/open-reflection/v1/source/HankenGrotesk-Regular.ttf','font/ttf');
const copy={vi:[['Giới thiệu Nilaza',identity.copy.vi.tagline,identity.copy.vi.intro],['Phút phản chiếu','Dành một phút\ncho chính mình.','Một gợi ý nhỏ để gọi tên cảm xúc và nhìn lại điều đang quan tâm.'],['Câu hỏi hôm nay','Điều gì đang cần\nbạn lắng nghe?','Bạn không cần tìm ra mọi câu trả lời ngay hôm nay.']],en:[['Meet Nilaza',identity.copy.en.tagline,identity.copy.en.intro],['A moment of reflection','Take a moment\nfor yourself.','A small prompt to name a feeling and reflect on what matters.'],['A question for today','What needs\nyour attention?','You do not have to find every answer today.']]};
const browser=await chromium.launch({headless:true,executablePath:process.env.NILAZA_BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage();const records=[];
try{
for(const locale of ['vi','en'])for(const format of [[1080,1080],[1080,1350],[1080,1920],[1200,630]]){
 const [w,h]=format;const og=h===630;
 for(let i=0;i<(og?1:3);i++){
  const [eyebrow,title,body]=copy[locale][i];const file=og?`og-${locale}`:`social-${i+1}-${locale}-${w}x${h}`;
  const inset=og?64:84;const story=h===1920;const headSize=og?64:82;
  const html=`<!doctype html><html lang="${locale}"><meta charset="utf-8"><title>${eyebrow}</title><style>
@font-face{font-family:EB;src:url('${eb}')}@font-face{font-family:HK;src:url('${hk}')}*{box-sizing:border-box}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#151416;color:#F7F1E6}body{font-family:HK}main{position:relative;width:100%;height:100%;padding:${story?220:og?44:64}px ${inset}px ${story?240:64}px;display:flex;flex-direction:column;align-items:flex-start}.logo{width:${og?220:270}px;height:auto;object-fit:contain}.art{position:absolute;inset:${og?'0 0 0 56%':`${story?'48%':'38%'} 0 0 0`};width:${og?'44%':'100%'};height:${og?'100%':story?'52%':'62%'};object-fit:cover}.shade{position:absolute;inset:0;background:${og?'linear-gradient(90deg,#151416 38%,transparent)':'linear-gradient(#151416 25%,rgba(21,20,22,.8) 48%,rgba(21,20,22,.25) 70%,#151416)'}}.logo,.content,footer{position:relative;z-index:1}.content{margin-top:${og?24:story?100:40}px;max-width:${og?670:880}px}.eyebrow{font-size:${og?18:23}px;text-transform:uppercase;letter-spacing:3px;color:#C9A45C;margin:0 0 24px}h1{font:400 ${headSize}px/1.08 EB;letter-spacing:-.4px;margin:0 0 ${og?20:28}px;white-space:pre-line}.body{font-size:${og?23:29}px;line-height:1.45;max-width:${og?550:760}px;margin:0}footer{margin-top:auto;width:100%;font-size:${og?18:24}px;display:flex;justify-content:space-between;gap:24px;align-items:end}footer small{font-size:${og?14:19}px;color:#A8A3A0}</style><main><img class="art" src="${art}" alt=""><div class="shade"></div><img class="logo" src="${logo}" alt="Nilaza"><section class="content"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="body">${body}</p></section><footer><span>${identity.copy[locale].publicCta}<br>nilaza.magicpendigital.com/${locale}</span><small>${locale==='vi'?'Thử nghiệm giới hạn':'Limited beta'}</small></footer></main></html>`;
  await fs.writeFile(path.join(source,`${file}.html`),html);await page.setViewportSize({width:w,height:h});await page.setContent(html,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
  const fits=await page.evaluate(()=>{const content=document.querySelector('.content').getBoundingClientRect(),footer=document.querySelector('footer').getBoundingClientRect();return content.bottom+24<=footer.top;});if(!fits)throw Error(`Text overlaps footer: ${file}`);
  const bytes=await page.screenshot({path:path.join(out,`${file}.png`)});
  records.push({role:og?'open-graph':`social-template-${i+1}`,locale,width:w,height:h,source:`source/graphics/${file}.html`,output:`exports/graphics/${file}.png`,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 }
}
// Avatar uses the approved icon export without redrawing the mark.
await fs.copyFile(path.join(root,'assets/brand/open-reflection/v1/icon/app-icon-charcoal-1024.png'),path.join(out,'avatar-1024.png'));
await fs.writeFile(path.join(dir,'source/graphics-manifest.json'),JSON.stringify({brandVersion:identity.version,status:'prepared-not-released',appReference:'0.1.0 working tree / 2026-09-11',safeArea:{social:84,storyTop:220,storyBottom:240,openGraph:64},records},null,2)+'\n');
console.log(`Prepared ${records.length} graphics and brand avatar.`);
}finally{await browser.close();}
