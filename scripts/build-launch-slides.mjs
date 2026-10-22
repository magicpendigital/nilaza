// Run with the bundled Node runtime. All slide text remains editable.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const deps=process.env.NILAZA_ARTIFACT_DEPS;
if(!deps)throw Error('Set NILAZA_ARTIFACT_DEPS to the bundled dependencies directory.');
const req=createRequire(path.join(deps,'node/package.json'));
const {GlobalFonts}=req('@napi-rs/canvas');
const fontPaths=[path.join(root,'assets/brand/open-reflection/v1/source/HankenGrotesk-Regular.ttf'),path.join(root,'assets/brand/open-reflection/v1/source/EBGaramond-Regular.ttf')];
for(const font of fontPaths)GlobalFonts.registerFromPath(font);
try { const {FontLibrary}=req('skia-canvas');FontLibrary.use(fontPaths); }catch{/* napi registry is used by the renderer */}
const artifactReq=createRequire(req.resolve('@oai/artifact-tool'));
try { artifactReq('skia-canvas').FontLibrary.use(fontPaths); }catch{/* shared runtime registry above */}
const {Presentation,PresentationFile}=await import(pathToFileURL(req.resolve('@oai/artifact-tool')));
const skill=process.env.NILAZA_PRESENTATIONS_SKILL;
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')));
const dest=path.join(root,'design/launch/open-reflection-v1');
const work=path.join(root,'.brand-work/slides');await fs.mkdir(work,{recursive:true});
const preview=path.join(dest,'review/slides');await fs.mkdir(preview,{recursive:true});
const brand=JSON.parse(await fs.readFile(path.join(root,'packages/content/data/brand-identity.json'),'utf8'));
const C=brand.palette;
const content={
 vi:[
  ['Một khoảng mở\nđể lắng nghe mình.','Bạn đồng hành AI cho những câu hỏi, cảm xúc\nvà khám phá bản thân.'],
  ['Khi bạn cần nghe rõ\nsuy nghĩ của chính mình.','Một mối quan hệ khiến bạn băn khoăn.\nMột ngày có quá nhiều cảm xúc.\nMột câu hỏi chưa cần lời giải ngay.'],
  ['Bắt đầu nhẹ nhàng.','Tạo tài khoản / Đăng nhập|Xác nhận email khi được yêu cầu.\nChọn điều bạn quan tâm|1–3 mục tiêu hoặc bỏ qua.\nDành một phút phản chiếu|Mở Today Pulse từ Home.'],
  ['Một phút dành cho bạn.','Home có một hành động chính: Bắt đầu phút phản chiếu.\nĐọc gợi ý, ghi nhận cảm xúc nếu muốn, rồi quay lại theo nhịp của bạn.'],
  ['Đi sâu theo cách của bạn.','Trò chuyện|Oracle và người dẫn đường AI gợi thêm góc nhìn.\nTarot|Biểu tượng giúp bạn đặt câu hỏi mở.\nNhật ký|Lưu và xem lại insight từ trải nghiệm.'],
  ['Cá nhân hóa theo lựa chọn.','Đổi mục tiêu, giọng trả lời và ngôn ngữ trong Hồ sơ.\nNgày sinh là tùy chọn khi bạn muốn dùng Chiêm tinh.\nCouncil và người dẫn đường nằm trong Explore / Chat.'],
  ['Gợi mở. Tôn trọng\nquyền tự quyết.','Nội dung dành cho giải trí và tự phản chiếu.\nKhông phải dự đoán chắc chắn hay tư vấn chuyên môn.\nPersona là AI lấy cảm hứng từ nhân vật, không phải người thật.'],
  ['Một khoảng mở\nbắt đầu từ bạn.','Tham gia danh sách chờ\nnilaza.magicpendigital.com/vi\nNilaza đang chuẩn bị cho đợt thử nghiệm giới hạn.']
 ],
 en:[
  ['A space to listen\nto yourself.','An AI companion for your questions, feelings,\nand self-discovery.'],
  ['When you need to hear\nyour own thoughts.','A relationship that leaves you wondering.\nA day with too many feelings.\nA question that does not need an answer just yet.'],
  ['A gentle beginning.','Create an account / Log in|Confirm your email if prompted.\nChoose what matters|Pick 1–3 interests, or skip.\nTake a moment to reflect|Open Today Pulse from Home.'],
  ['A moment just for you.','One main action on Home: Start a moment of reflection.\nRead a prompt, check in with your mood if you wish,\nand return at your own pace.'],
  ['Explore in your own way.','Chat|Oracle and AI guides invite another perspective.\nTarot|Symbols help you ask open questions.\nJournal|Save and revisit insights from your experience.'],
  ['Personalization by choice.','Change your interests, tone and language in Profile.\nBirth details are optional when you want astrology.\nFind Council and AI guides in Explore / Chat.'],
  ['An invitation to reflect.\nThe choice is yours.','For entertainment and self-reflection.\nNot certain predictions or professional advice.\nPersonas are AI experiences inspired by figures, not real people.'],
  ['Your space\nstarts with you.','Join the waitlist\nnilaza.magicpendigital.com/en\nNilaza is being prepared for a limited beta.']
 ]
};
for(const locale of ['vi','en']){
 const p=Presentation.create({slideSize:{width:1280,height:720}});
 const text=(s,value,x,y,w,h,size=28,font='Hanken Grotesk',color=C.ivory)=>{
   const sh=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
   sh.text=value;sh.text.style={typeface:font,fontSize:size,color,bold:false,autoFit:'none'};return sh;
 };
 const img=async(s,rel,x,y,w,h,fit='contain')=>s.images.add({blob:new Uint8Array(await fs.readFile(path.join(root,rel))),contentType:rel.endsWith('.jpg')?'image/jpeg':'image/png',alt:rel.includes('logo')?'Nilaza Open Reflection':locale==='vi'?'Artwork phản chiếu Nilaza':'Nilaza reflection artwork',position:{left:x,top:y,width:w,height:h},fit});
 for(let i=0;i<8;i++){
   const s=p.slides.add();s.background.fill=i===1||i===6?C.ivory:C.charcoal;
   const dark=i!==1&&i!==6;const fg=dark?C.ivory:C.charcoal;
   await img(s,`assets/brand/open-reflection/v1/logo/horizontal-compact-${dark?'ivory':'charcoal'}.png`,64,30,180,66);
   text(s,`NILAZA · BETA   /   ${String(i+1).padStart(2,'0')}`,970,52,245,24,14,'Hanken Grotesk',dark?C.moonGray:C.teal);
   const [heading,body]=content[locale][i];
   if(i===0||i===7){
     await img(s,'apps/mobile/assets/runtime/features/open-reflection-welcome.jpg',820,130,396,525,'cover');
     text(s,heading,64,175,735,230,68,'EB Garamond');
     text(s,body,68,450,700,180,25);
   }else if(i===2||i===4){
     text(s,heading,64,140,1140,95,58,'EB Garamond');
     body.split('\n').forEach((row,j)=>{const [label,detail]=row.split('|');text(s,String(j+1).padStart(2,'0'),64+j*390,286,70,50,28,'Hanken Grotesk',C.gold);text(s,label,64+j*390,355,350,100,36,'EB Garamond');text(s,detail,64+j*390,474,344,144,25);});
   }else if(i===3){
     text(s,heading,64,156,640,160,60,'EB Garamond');text(s,body,68,350,610,240,28);
     const screenshotRelative=`design/launch/open-reflection-v1/review/browser/${locale==='en'?'home-en-390.png':'home-390x844.png'}`;
     const screenshot=path.join(root,screenshotRelative);
     if(await fs.stat(screenshot).catch(()=>null)){
       await img(s,screenshotRelative,856,112,245,530);
       text(s,locale==='vi'?'Ảnh web preview · dữ liệu kiểm thử':'Web preview · test data',784,650,420,28,14,'Hanken Grotesk',C.moonGray);
     }else await img(s,'apps/web/public/brand/v1/artwork/home.jpg',744,194,470,360,'cover');
   }else{
     text(s,heading,64,155,1140,190,60,'EB Garamond',fg);
     text(s,body,68,383,1070,225,29,'Hanken Grotesk',fg);
   }
   text(s,locale==='vi'?'Open Reflection 1.0.0 · Bản chuẩn bị, chưa phát hành':'Open Reflection 1.0.0 · Prepared, not released',64,677,1100,22,13,'Hanken Grotesk',dark?C.moonGray:C.teal);
   s.speakerNotes.textFrame.setText(`Source: Nilaza public Help ${locale}, https://nilaza.magicpendigital.com/${locale}/help. Brand: Open Reflection 1.0.0. App reference: 0.1.0 working tree 2026-09-11. Native RC approval pending. No prices, release date or store URL is confirmed.`);
   const blob=await p.export({slide:s,format:'png',scale:1});await fs.writeFile(path.join(preview,`${locale}-${i+1}.png`),new Uint8Array(await blob.arrayBuffer()));
 }
 await fs.writeFile(path.join(dest,`source/slides-${locale}.json`),JSON.stringify({locale,brandVersion:brand.version,appReference:'0.1.0 working tree / 2026-09-11',slides:content[locale]},null,2)+'\n');
 const candidatePath=path.join(work,`candidate-${locale}.pptx`);await(await PresentationFile.exportPptx(p)).save(candidatePath);
 const revision=process.env.NILAZA_LAUNCH_REVISION||'r4';
 const finalPath=path.join(dest,`exports/nilaza-introduction-${locale}-${revision}.pptx`);
 const result=await finalizePresentation({workspaceDir:root,candidatePath,finalPath,pythonExecutable:path.join(deps,'python/python.exe'),integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],explicitTotalSlideCount:8,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'user_request',families:['EB Garamond','Hanken Grotesk']},verifyArtifactToolImport:true,receiptPath:path.join(work,`${locale}-${revision}.validation.json`)});
 console.log(`${locale}: ${result.finalPath}`);
}
