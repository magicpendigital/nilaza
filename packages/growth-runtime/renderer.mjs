import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const WIDTH=1080, HEIGHT=1350;
const palette={charcoal:'#151416',ivory:'#F7F1E6',teal:'#0E5A5A',gold:'#C9A45C'};
const footer={vi:'Nội dung để giải trí và tự phản chiếu; không thay thế hỗ trợ chuyên môn.',en:'For entertainment and self-reflection; not a substitute for professional support.'};

function brandSource(repoRoot, manifest, id) {
  const record=manifest.assets?.find(item=>item.id===id) || manifest.sources?.find(item=>item.id===id);
  if (!record || !record.path.startsWith('assets/brand/open-reflection/v1/')) throw new Error('BRAND_SOURCE_NOT_APPROVED');
  const file=path.join(repoRoot,record.path), bytes=fs.readFileSync(file);
  if(digest(bytes)!==record.sha256) throw new Error('BRAND_SOURCE_HASH_CHANGED');
  return {file,record};
}

export async function renderCreative({repoRoot,outputDir,packet,candidate}) {
  if(!packet?.slides || packet.slides.length!==3) throw new Error('THREE_SLIDES_REQUIRED');
  if(fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) throw new Error('RENDER_DIRECTORY_NOT_EMPTY');
  const manifest=JSON.parse(fs.readFileSync(path.join(repoRoot,'packages/content/data/brand-identity.json'),'utf8'));
  const logo=brandSource(repoRoot,manifest,'logo-horizontal-ivory-png');
  const bodyFont=brandSource(repoRoot,manifest,'source-HankenGrotesk-Regular-ttf');
  const headingFont=brandSource(repoRoot,manifest,'font-eb-garamond-full');
  fs.mkdirSync(outputDir,{recursive:true});
  const files=[], layout=[];
  const mark=await sharp(logo.file).resize({width:360}).png().toBuffer();
  const markMeta=await sharp(mark).metadata();
  async function text(value,{font,source,size,width=900,color=palette.ivory,maxHeight=400}) {
    const {data,info}=await sharp({text:{text:`<span foreground="${color}">${escape(value)}</span>`,font:`${font} ${size}`,fontfile:source.file,width,dpi:72,rgba:true,spacing:10,wrap:'word'}}).png().toBuffer({resolveWithObject:true});
    if(info.width>width || info.height>maxHeight) throw new Error('CREATIVE_TEXT_OVERFLOW');
    return {input:data,info};
  }
  for(const locale of ['vi','en']) {
    for(let index=0;index<3;index++) {
      const slide=packet.slides[index][locale], layers=[{input:mark,left:76,top:64}], boxes=[];
      const label=await text(locale==='vi'?'MỘT CÂU HỎI CHO MÌNH':'A QUESTION FOR YOURSELF',{font:'Hanken Grotesk',source:bodyFont,size:22,color:palette.gold,maxHeight:55});
      layers.push({input:label.input,left:80,top:222});
      const heading=await text(slide.headline,{font:'EB Garamond',source:headingFont,size:78,width:900,maxHeight:305});
      layers.push({input:heading.input,left:76,top:306}); boxes.push({type:'headline',x:76,y:306,width:heading.info.width,height:heading.info.height,fontSize:78});
      const bodyY=Math.max(620,306+heading.info.height+64);
      if(index===1) {
        const panel=Buffer.from(`<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg"><rect x="76" y="${bodyY-42}" width="928" height="370" rx="8" fill="${palette.teal}"/></svg>`);
        layers.push({input:panel,left:0,top:0});
      }
      const body=await text(slide.body,{font:'Hanken Grotesk',source:bodyFont,size:37,width:index===1?828:900,maxHeight:300});
      layers.push({input:body.input,left:index===1?126:80,top:bodyY}); boxes.push({type:'body',x:index===1?126:80,y:bodyY,width:body.info.width,height:body.info.height,fontSize:37});
      if(index===2) {
        const cta=await text(packet.copy[locale].cta,{font:'Hanken Grotesk',source:bodyFont,size:30,width:850,maxHeight:65});
        layers.push({input:Buffer.from(`<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg"><rect x="76" y="982" width="928" height="88" rx="8" fill="${palette.teal}"/></svg>`),left:0,top:0});
        layers.push({input:cta.input,left:114,top:1004});
      }
      const safe=await text(footer[locale],{font:'Hanken Grotesk',source:bodyFont,size:22,width:900,maxHeight:90});
      layers.push({input:safe.input,left:80,top:1144});
      const stamp=await text(`${locale==='vi'?'BẢN NHÁP NỘI BỘ':'INTERNAL DRAFT'}  •  ${index+1}/3`,{font:'Hanken Grotesk',source:bodyFont,size:19,color:palette.gold,maxHeight:40});
      layers.push({input:stamp.input,left:80,top:1274});
      for(const box of boxes) if(box.y+box.height>975) throw new Error('CREATIVE_LAYOUT_COLLISION');
      const filename=`slide-${locale}-${String(index+1).padStart(2,'0')}.png`;
      await sharp({create:{width:WIDTH,height:HEIGHT,channels:4,background:palette.charcoal}}).composite(layers).png().toFile(path.join(outputDir,filename));
      files.push(filename); layout.push({file:filename,locale,width:WIDTH,height:HEIGHT,altText:slide.altText,boxes,logo:{source:logo.record.path,width:360,height:markMeta.height},evidenceStatus:'rendered_internal_draft'});
    }
  }
  const copyRecord={brandVersion:'open-reflection-v1',artifactId:candidate?.id || packet.jobId,briefId:packet.briefId,locales:['vi','en'],copy:packet.copy,slides:packet.slides,publicationAuthority:'none',appReference:'brand editorial creative; no app screenshot or release claim'};
  fs.writeFileSync(path.join(outputDir,'copy.json'),JSON.stringify(copyRecord,null,2)+'\n',{flag:'wx'}); files.push('copy.json');
  fs.writeFileSync(path.join(outputDir,'layout.json'),JSON.stringify({rendererVersion:'nilaza-typographic-carousel-1.0.0',brandSources:[logo.record,bodyFont.record,headingFont.record],palette,slides:layout},null,2)+'\n',{flag:'wx'}); files.push('layout.json');
  const pages=['vi','en'].map(locale=>`<section><h2>${locale==='vi'?'Tiếng Việt':'English'}</h2><div class="slides">${packet.slides.map((slide,index)=>`<figure><img src="slide-${locale}-${String(index+1).padStart(2,'0')}.png" alt="${escape(slide[locale].altText)}"><figcaption>${index+1}/3</figcaption></figure>`).join('')}</div><h3>${locale==='vi'?'Caption':'Caption'}</h3><p class="caption">${escape(packet.copy[locale].caption)}</p></section>`).join('');
  const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Nilaza — Review creative nội bộ</title><style>body{margin:0;background:#151416;color:#F7F1E6;font:17px/1.55 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:32px}h1,h2{font-weight:500}aside{border-left:4px solid #C9A45C;padding:16px;background:#0E5A5A}.slides{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}figure{margin:0}img{display:block;width:100%;height:auto}.caption{white-space:pre-wrap;max-width:800px}pre{white-space:pre-wrap;overflow-wrap:anywhere}details{margin:32px 0}@media(max-width:750px){.slides{grid-template-columns:1fr}main{padding:20px}}</style><main><h1>Nilaza — Creative nội bộ</h1><aside>Bản render dùng để Owner review. QA, hash và trạng thái hiện tại nằm trong hồ sơ job; trang này không tự cập nhật hoặc cấp quyền xuất bản. Không có số liệu chiến dịch hay chứng nhận phát hành app.</aside><p>Brief ${escape(packet.briefId)} · Open Reflection v1 · VI/EN · 1080 × 1350</p>${pages}<details><summary>Nghiên cứu và phương án kinh doanh cần review</summary><p>Giả thuyết từ tài liệu nội bộ; chưa có phỏng vấn khách hàng hay kết quả chiến dịch. Giá, quota và quảng cáo là phương án tương lai.</p><pre>${escape(JSON.stringify({research:packet.research || null,strategy:packet.strategy || null},null,2))}</pre></details></main></html>`;
  fs.writeFileSync(path.join(outputDir,'review.html'),html,{flag:'wx'}); files.push('review.html');
  return {files,rendererVersion:'nilaza-typographic-carousel-1.0.0',evidenceStatus:'rendered_internal_draft'};
}
