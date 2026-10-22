"""Editable VI/EN guides from the public Help allowlist. Use the bundled Python."""
from pathlib import Path
import json, re, hashlib
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'design/launch/open-reflection-v1'
OUT = DEST / 'exports'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = DEST / 'source'
SOURCE.mkdir(exist_ok=True)
brand = json.loads((ROOT/'packages/content/data/brand-identity.json').read_text('utf-8'))
topics = ['getting-started', 'oracle-today-pulse', 'guides-council', 'tarot', 'journal-data', 'account-notifications', 'astrology-premium', 'beta-waitlist']

def plain(text):
    return re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text).replace('**','').replace('`','').lstrip('> ')

def articles(locale):
    result=[]
    for topic in topics:
        rel=f'apps/web/src/content/help/{locale}/{topic}.md'
        raw=(ROOT/rel).read_text('utf-8')
        header,body=raw.split('---',2)[1:]
        title=re.search(r'title: "([^"]+)"',header)[1]
        result.append(dict(title=title,body=body.strip(),source=rel,url=f'https://nilaza.magicpendigital.com/{locale}/help/{topic}',sha256=hashlib.sha256(raw.encode()).hexdigest()))
    return result

def base(locale,title):
    doc=Document()
    sec=doc.sections[0]; sec.page_width=Inches(8.27);sec.page_height=Inches(11.69)
    sec.top_margin=sec.bottom_margin=Inches(.65)
    sec.left_margin=sec.right_margin=Inches(.8)
    normal=doc.styles['Normal'];normal.font.name='Hanken Grotesk';normal.font.size=Pt(11)
    normal.paragraph_format.space_after=Pt(7)
    normal.paragraph_format.line_spacing=1.12
    # The runtime's default Word template contains a blue title rule and theme
    # font references. Remove both so explicit Nilaza styles win in Word/LO.
    for st in doc.styles:
        for fonts in st.element.findall('.//' + qn('w:rFonts')):
            for attr in list(fonts.attrib):
                if 'theme' in attr.lower():del fonts.attrib[attr]
        for border in st.element.findall('.//' + qn('w:pBdr')):border.getparent().remove(border)
    for name,size in [('Title',30),('Heading 1',23),('Heading 2',17)]:
        st=doc.styles[name];st.font.name='EB Garamond';st.font.size=Pt(size);st.font.bold=False
        st.font.color.rgb=RGBColor.from_string('151416')
    caption=doc.styles['Caption'];caption.font.name='Hanken Grotesk';caption.font.size=Pt(9)
    caption.font.bold=False;caption.font.color.rgb=RGBColor.from_string('625F61')
    doc.core_properties.title=title;doc.core_properties.author='Nilaza';doc.core_properties.language=locale
    sec.header.paragraphs[0].add_run().add_picture(str(ROOT/'assets/brand/open-reflection/v1/logo/horizontal-compact-charcoal.png'),width=Inches(1.35))
    footer=sec.footer.paragraphs[0]
    footer.text='Nilaza · Open Reflection 1.0.0 · Beta preview 0.1.0 · 2026-09-11   |   '
    footer.style='Caption'
    field=OxmlElement('w:fldSimple');field.set(qn('w:instr'),'PAGE');footer._p.append(field)
    return doc

def blocks(doc,body):
    for block in body.split('\n\n'):
        if block.startswith('## '):doc.add_heading(plain(block[3:]),2)
        else:
            for line in block.splitlines():
                if not line.strip():continue
                doc.add_paragraph(plain(line))

def help_link(doc,locale,url):
    p=doc.add_paragraph(style='Caption')
    link=OxmlElement('w:hyperlink')
    link.set(qn('r:id'),doc.part.relate_to(url,RT.HYPERLINK,is_external=True))
    run=OxmlElement('w:r');props=OxmlElement('w:rPr')
    color=OxmlElement('w:color');color.set(qn('w:val'),'0E5A5A');props.append(color)
    run.append(props);text=OxmlElement('w:t');text.text='Trợ giúp trực tuyến' if locale=='vi' else 'Online Help'
    run.append(text);link.append(run);p._p.append(link)

quick={
 'vi':[
  ('Bắt đầu với Nilaza',[('Một khoảng mở để lắng nghe mình.','Bạn đồng hành AI cho những câu hỏi, cảm xúc và khám phá bản thân.'),('01 · Tạo tài khoản hoặc đăng nhập','Chọn ngôn ngữ ở màn chào. Tạo tài khoản bằng tên, email và mật khẩu. Nếu được yêu cầu, xác nhận email rồi đăng nhập. Quên mật khẩu? Dùng hành động khôi phục ở màn đăng nhập.'),('02 · Chọn điều bạn quan tâm','Chọn 1–3 mục tiêu hoặc Bỏ qua lúc này. Không cần nhập lại tên. Khi lưu thất bại, thử lại; tài khoản đã hoàn tất thiết lập không cần làm lại.'),('03 · Dành một phút cho mình','Tại Home, chọn Bắt đầu phút phản chiếu. Đọc Today Pulse, ghi nhận cảm xúc nếu muốn và đóng để trở lại. Nút đổi thành Xem lại phút phản chiếu trong ngày.')]),
  ('Tiếp tục theo nhịp của bạn',[('Trò chuyện và khám phá','Từ Home, chọn Trò chuyện. Explore dẫn tới người dẫn đường, Tarot, Council và Chiêm tinh. Persona là AI lấy cảm hứng từ nhân vật, không phải người thật.'),('Lưu và xem lại','Dùng hành động lưu insight trong trò chuyện hoặc trải bài khi có. Mở Nhật ký từ Home hoặc tab Journal để xem lại. Ghi chú độc lập chưa có trong đợt này.'),('Cá nhân hóa và trợ giúp','Profile có mục tiêu, giọng trả lời, ngôn ngữ và các tùy chọn dữ liệu. Chỉ thêm ngày sinh khi muốn dùng Chiêm tinh. Khi offline hoặc gặp lỗi, kiểm tra trạng thái lưu trước khi đóng ứng dụng.'),('Dùng Nilaza với kỳ vọng phù hợp','Nilaza đang thử nghiệm giới hạn. Nội dung dành cho giải trí và tự phản chiếu, không phải dự đoán chắc chắn hay tư vấn chuyên môn. Xem hướng dẫn tại nilaza.magicpendigital.com/vi/help. Tham gia danh sách chờ trên website.')])],
 'en':[
  ('Getting started with Nilaza',[('A space to listen to yourself.','An AI companion for your questions, feelings, and self-discovery.'),('01 · Create an account or log in','Choose your language on the welcome screen. Create an account with your name, email and password. Confirm your email if prompted, then log in. Use password recovery on the login screen if needed.'),('02 · Choose what matters to you','Choose 1–3 interests or Skip for now. No need to enter your name again. Retry if saving fails. Returning users who completed setup do not repeat it.'),('03 · Take a moment for yourself','On Home, choose Start a moment of reflection. Read Today Pulse, check in with your mood if you wish, then close it. The button becomes Revisit your reflection for the rest of the day.')]),
  ('Continue at your own pace',[('Talk and explore','Choose Chat on Home. Explore leads to AI guides, tarot, Council and astrology. Personas are AI experiences inspired by a figure, not the real person.'),('Save and revisit','Use the save insight action in a conversation or reading where available. Open Journal from Home or the Journal tab to revisit saved items. Standalone notes are not included in this wave.'),('Personalize and get help','Profile contains your interests, tone, language and data options. Add birth details only when you want astrology. When offline or after an error, check the save state before closing the app.'),('Set expectations that fit','Nilaza is in limited beta. Content is for entertainment and reflection, not certain predictions or professional advice. Visit nilaza.magicpendigital.com/en/help. Join the waitlist on the website.')])]
}

for locale in ['vi','en']:
    items=articles(locale)
    title='Hướng dẫn sử dụng Nilaza' if locale=='vi' else 'Nilaza user guide'
    doc=base(locale,title)
    for i,item in enumerate(items):
        if i==0:
            doc.add_paragraph(title,'Title')
            doc.add_paragraph(brand['copy'][locale]['tagline'])
            doc.add_paragraph('Bản chuẩn bị cho beta · Chưa phát hành' if locale=='vi' else 'Prepared for beta · Not released','Caption')
        doc.add_heading(item['title'],1)
        blocks(doc,item['body'])
        help_link(doc,locale,item['url'])
    screenshots=DEST/'review/browser'
    if (screenshots/'welcome-390.png').exists() and (screenshots/'home-390x844.png').exists():
        doc.add_page_break()
        doc.add_heading('Màn chào và Home' if locale=='vi' else 'Welcome and Home',1)
        doc.add_paragraph('Ảnh web preview đã kiểm tra · Dữ liệu tài khoản kiểm thử · Chưa phải ảnh release candidate.' if locale=='vi' else 'Verified web preview · Test-account data · Not release candidate screenshots.','Caption')
        welcome='welcome-en-390.png' if locale=='en' else 'welcome-390.png'
        home='home-en-390.png' if locale=='en' else 'home-390x844.png'
        p=doc.add_paragraph();p.add_run().add_picture(str(screenshots/welcome),width=Inches(2.65));p.add_run('    ');p.add_run().add_picture(str(screenshots/home),width=Inches(2.65))
    doc.save(OUT/f'nilaza-user-guide-{locale}.docx')
    qdoc=base(locale,'Hướng dẫn nhanh' if locale=='vi' else 'Quick start')
    for i,(title,sections) in enumerate(quick[locale]):
        if i:qdoc.add_page_break()
        qdoc.add_paragraph(title,'Title')
        for heading,body in sections:qdoc.add_heading(heading,2);qdoc.add_paragraph(body)
        if i==1:help_link(qdoc,locale,f'https://nilaza.magicpendigital.com/{locale}/help')
    qdoc.save(OUT/f'nilaza-quick-start-{locale}.docx')
    payload={'locale':locale,'brandVersion':'1.0.0','appReference':'0.1.0 / Open Reflection working tree 2026-09-11; pending native RC','status':'prepared-not-released','articles':items,'quickStart':quick[locale]}
    (SOURCE/f'guides-{locale}.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n','utf-8')
    markdown=f'# {"Hướng dẫn sử dụng Nilaza" if locale=="vi" else "Nilaza user guide"}\n\n> Open Reflection 1.0.0 · Beta preview 0.1.0 · 2026-09-11. {"Bản chuẩn bị, chưa phát hành." if locale=="vi" else "Prepared, not released."}\n\n'
    markdown+='\n\n'.join(f'## {a["title"]}\n\n{a["body"].replace("## ","### ")}\n\n[{"Trợ giúp" if locale=="vi" else "Help"}]({a["url"]})' for a in items)
    (ROOT/'docs'/('NILAZA_END_USER_GUIDE.md' if locale=='vi' else 'NILAZA_END_USER_GUIDE.en.md')).write_text(markdown+'\n','utf-8')
print('Prepared four editable DOCX guides and public-source snapshots. Render validation is required before release.')
