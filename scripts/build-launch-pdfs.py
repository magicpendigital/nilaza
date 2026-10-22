"""PDF edition from the same public JSON source as DOCX. No private docs are published."""
from pathlib import Path
import json,re
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'design/launch/open-reflection-v1'
OUT=DEST/'exports';OUT.mkdir(parents=True,exist_ok=True)
BRAND=ROOT/'assets/brand/open-reflection/v1'
pdfmetrics.registerFont(TTFont('Hanken',str(BRAND/'source/HankenGrotesk-Regular.ttf')))
pdfmetrics.registerFont(TTFont('Garamond',str(BRAND/'source/EBGaramond-Regular.ttf')))
INK='#151416';IVORY='#F7F1E6';TEAL='#0E5A5A';GOLD='#C9A45C'
W,H=595.276,841.89
def para(c,text,x,y,w,size=11,font='Hanken',color=INK):
    p=Paragraph(escape(text).replace('\n','<br/>'),ParagraphStyle('p',fontName=font,fontSize=size,leading=size*1.4,textColor=HexColor(color)))
    _,height=p.wrap(w,H)
    if y-height<54:raise ValueError(f'Page overflow: {text[:60]}')
    p.drawOn(c,x,y-height);return y-height
def start(c,title,locale,page,dark=False):
    bg=INK if dark else IVORY;fg=IVORY if dark else INK
    c.setFillColor(HexColor(bg));c.rect(0,0,W,H,fill=1,stroke=0)
    c.drawImage(str(BRAND/f'logo/horizontal-compact-{"ivory" if dark else "charcoal"}.png'),44,H-80,105,39,mask='auto',preserveAspectRatio=True)
    c.setFont('Hanken',8);c.setFillColor(HexColor(fg));c.drawRightString(W-44,34,f'Nilaza · Open Reflection 1.0.0 · Beta 0.1.0 · {locale.upper()} · {page}')
    return para(c,title,44,H-110,W-88,30,'Garamond',fg)-22
def strip(t):return re.sub(r'\[([^\]]+)\]\([^)]+\)',r'\1',t).replace('**','').lstrip('> ')
for locale in ['vi','en']:
    data=json.loads((DEST/f'source/guides-{locale}.json').read_text('utf-8'))
    title='Hướng dẫn sử dụng' if locale=='vi' else 'User guide'
    c=canvas.Canvas(str(OUT/f'nilaza-user-guide-{locale}.pdf'),pagesize=(W,H));c.setTitle('Nilaza — '+title)
    page_no=0
    for i in range(0,8,2):
        page_no+=1
        y=start(c,title,locale,page_no)
        if i==0:y=para(c,'Bản chuẩn bị cho beta · Chưa phát hành' if locale=='vi' else 'Prepared for beta · Not released',44,y,W-88,10,color=TEAL)-20
        for item in data['articles'][i:i+2]:
            y=para(c,item['title'],44,y,W-88,21,'Garamond')-10
            for block in item['body'].split('\n\n'):
                heading=block.startswith('## ')
                text=strip(block[3:] if heading else block)
                size=13 if heading else 10.5
                estimate=Paragraph(escape(text).replace('\n','<br/>'),ParagraphStyle('estimate',fontName='Garamond' if heading else 'Hanken',fontSize=size,leading=size*1.4)).wrap(W-88,H)[1]
                if y-estimate < (105 if heading else 64):
                    c.showPage();page_no+=1;y=start(c,item['title'],locale,page_no)
                y=para(c,text,44,y,W-88,size,'Garamond' if heading else 'Hanken')-9
            y-=14
        c.showPage()
    c.save()
    c=canvas.Canvas(str(OUT/f'nilaza-quick-start-{locale}.pdf'),pagesize=(W,H));c.setTitle('Nilaza — Quick start')
    for i,(heading,sections) in enumerate(data['quickStart']):
        y=start(c,heading,locale,i+1)
        for sub,body in sections:
            y=para(c,sub,44,y,W-88,20,'Garamond')-10
            y=para(c,body,44,y,W-88,12)-26
        c.showPage()
    c.save()

c=canvas.Canvas(str(OUT/'nilaza-brand-guidelines.pdf'),pagesize=(W,H));c.setTitle('Nilaza — Open Reflection v1 Brand Guidelines')
y=start(c,'Open Reflection', 'vi/en',1,True)
c.drawImage(str(BRAND/'logo/stacked-ivory.png'),165,300,265,245,mask='auto',preserveAspectRatio=True)
para(c,'Một khoảng mở để lắng nghe mình.\nA space to listen to yourself.',65,250,W-130,24,'Garamond',IVORY)
para(c,'Brand Guidelines · v1.0.0\nThiết kế đã chốt / Design approved\nTích hợp và phát hành có cổng nghiệm thu riêng.',65,137,W-130,11,color=IVORY);c.showPage()
pages=[
 ('01 · Ý nghĩa / Meaning',[('Một khoảng mở','Hai đường cong và một điểm sáng gợi không gian lắng nghe và sự phản chiếu. Biểu tượng luôn mở; không biến thành vòng vô cực, chữ N hoặc khung kín.'),('Dành cho ai','Gen Z và phụ nữ quan tâm tới tự khám phá, Tarot, Chiêm tinh và những cuộc trò chuyện có chiều sâu. Cảm giác trưởng thành, gần gũi, huyền nhiệm vừa đủ.'),('Giọng văn','Ấm áp, ngắn gọn, gợi mở và tôn trọng quyền lựa chọn. Hỏi “Bạn muốn nhìn điều gì rõ hơn?”; tránh “Điều này chắc chắn sẽ xảy ra”.'),('Thông điệp','Một khoảng mở để lắng nghe mình. / A space to listen to yourself.')]),
 ('02 · Biểu tượng / Logo',[('Bản biểu tượng, ngang và dọc','Chọn bản biểu tượng cho icon; bản ngang compact cho header; bản dọc cho bìa và welcome. Dùng bản xuất chính thức có wordmark đã chuyển thành đường nét.'),('Khoảng trống','Giữ khoảng trống tối thiểu bằng đường kính điểm sáng quanh nét ngoài cùng. Không đặt chữ hoặc ảnh chi tiết vào vùng này.'),('Kích thước','Symbol tối thiểu 24 px digital; header ngang compact từ 180 px; wordmark riêng từ 112 px. Ở không gian hẹp, ưu tiên symbol và kiểm tra trên thiết bị thật.'),('Đúng / Sai','Đúng: giữ tỷ lệ, màu đơn sắc và đủ tương phản. Sai: kéo giãn, xoay, đổi cấu trúc, thêm bóng/viền, gõ lại wordmark hoặc lấy ảnh từ concept board.')]),
 ('03 · Màu và chữ / Color & type',[('Typography','NILAZA: EB Garamond Regular 400. Tiêu đề: EB Garamond. Nội dung và nút: Hanken Grotesk. Không dùng chữ đậm giả cho wordmark.'),('Nền chủ đạo','Charcoal #151416 và Soft ivory #F7F1E6. Deep teal #0E5A5A làm điểm tựa. Gold #C9A45C, rose #C9828D và moon gray #A8A3A0 là màu phụ.'),('Khả năng đọc','Ưu tiên ivory trên charcoal và charcoal trên ivory. Không dùng màu nhấn nhạt cho chữ nhỏ nếu chưa kiểm tra tương phản.')]),
 ('04 · Chuyển động / Motion',[('800 ms · Một lần ở welcome','Điểm sáng hiện trong 120 ms, hai đường cong chuyển vị trí/độ mờ trong 680 ms tiếp theo. Ba lớp chung một canvas, kết thúc đúng hình tĩnh.'),('Reduce Motion','Hiển thị ngay khung cuối. Không lặp chuyển động, không khóa CTA và không bắt người quay lại xem lại.'),('Splash native','Màn launch dùng biểu tượng tĩnh trên charcoal. Chỉ chuyển khi phiên, dữ liệu cục bộ và font sẵn sàng hoặc có trạng thái lỗi. Không chờ nội dung mạng để kéo dài splash.')]),
 ('05 · Ứng dụng / Applications',[('Nhận diện khác artwork','Logo là biểu tượng thương hiệu. Icon chức năng dùng hệ icon UI. Artwork tạo cảm xúc cho welcome/Home; hình Tarot và persona là nội dung riêng, không thay logo.'),('Bộ public VI/EN','Giữ thông điệp và CTA danh sách chờ. Không tự thêm giá, hạn mức, ngày ra mắt, lời chứng thực hay cam kết sức khỏe.'),('Bốn trạng thái','Đã chốt thiết kế → đã tích hợp → đã kiểm chứng → đã phát hành. Ấn phẩm và ảnh store chỉ phát hành sau nghiệm thu release candidate.'),('Domain chính thức / Official domains','Tổ chức / Organization: magicpendigital.com. Website Nilaza: nilaza.magicpendigital.com. VI/EN Help: /vi/help và /en/help trên cùng domain.'),('Nguồn chuẩn','Brand Guidelines trong repo là chuẩn chi tiết. Manifest brand-identity phiên bản 1.0.0 định danh nguồn, vai trò và checksum. Concept cũ giữ để tham khảo lịch sử.')])]
for idx,(title,sections) in enumerate(pages,2):
    y=start(c,title,'vi/en',idx)
    if idx==3:
        for i,name in enumerate(['symbol-charcoal','horizontal-compact-charcoal','stacked-charcoal']):
            c.drawImage(str(BRAND/f'logo/{name}.png'),44+i*170,590,145,105,mask='auto',preserveAspectRatio=True)
        y=565
    for heading,body in sections:
        y=para(c,heading,44,y,W-88,19,'Garamond')-8
        y=para(c,body,44,y,W-88,11)-22
    if idx==4:
        for i,color in enumerate([INK,IVORY,TEAL,GOLD,'#C9828D','#A8A3A0']):
            x=44+i*85;c.setFillColor(HexColor(color));c.rect(x,115,75,55,fill=1,stroke=0);para(c,color,x,101,80,9)
    c.showPage()
c.save()
print('Prepared 5 PDF documents: user guides, 2-page quick starts, 6-page brand guide.')
