# Giá trị sau lá bài — báo cáo UI/UX Tarot và Bản đồ sao (21/11/2026)

> Bản đầy đủ có mô phỏng màn hình: <https://claude.ai/artifact/UaekT5zES8H1TcK5ge7iqV> (riêng tư, Owner chia sẻ qua menu Share).
> Căn cứ: đọc mã `origin/main` `0ed204d`, [chiến lược Nil 15/11](../NIL_PRICING_STRATEGY_2026-11-15.vi.md), [Tarot v2](TAROT_FREE_DRAW_AI_DEPTH_2026-11-15.vi.md), [đánh giá UX Chiêm tinh 14/11](ASTROLOGY_UX_REVIEW_2026-11-14.vi.md), nghiên cứu công khai (nguồn cuối tài liệu).
> **Owner duyệt 21/11:** cả 5 khuyến nghị ở mục 9 và cho bắt đầu triển khai theo kế hoạch mục 8 (từ Lô A).

## 1. Kết luận nhanh

Màn kết quả Tarot miễn phí đang tự hạ giá trị của nó. Câu tóm tắt chỉ ghép câu hỏi với tên kiểu trải và tên các lá, rồi xin lỗi “diễn giải AI chưa hoàn tất”. Màn hình nói ba lần rằng đây là “nghĩa chung”, “giống nhau với ai rút cùng các lá”, “chưa có diễn giải riêng”. Mỗi lá chỉ có khoảng 2 câu, và các câu rào đón an toàn bị viết thẳng vào nội dung. Nút AI thì mô tả cơ chế, không nói người dùng sẽ nhận được gì.

| Giả thuyết của Owner | Đánh giá | Điều chỉnh |
|---|---|---|
| Nội dung soạn sẵn sơ sài, người dùng rời đi ngay | Đúng, nghiêm trọng | Sửa lời văn (Lô A), kho diễn giải ghép lớp (Lô B), lời nhắn AI ngắn miễn phí (Lô C) |
| Free dùng model rẻ, trả phí dùng model tốt | Đúng một phần | Hai sản phẩm có tên rõ ràng: lời nhắn ngắn (model rẻ) và báo cáo chuyên sâu (model tốt hơn, nhiều ngữ cảnh hơn, có bố cục). Chọn model bằng chạy thử mù |
| Bài đọc nên là báo cáo chi tiết | Đúng | Báo cáo có cấu trúc, câu trả lời đặt trước, lưu/xem lại/chia sẻ được. “Hỏi tiếp” chỉ là phần thêm |
| Bài đọc dạng trò chuyện thì người dùng sang ChatGPT | Đúng, rủi ro chiến lược | Lợi thế nằm ở rút bài trung thực có khóa, lá số tính đúng, trí nhớ, kết hợp Tarot × lá số × pha trăng, nghi thức |
| Bản đồ sao cũng vậy | Đúng, nhẹ hơn | Nội dung miễn phí đã dày; thiếu báo cáo lá số trọn vẹn và lý do quay lại hằng tháng |

## 2. Hiện trạng (đã kiểm chứng trong mã)

| # | Phát hiện | Mức | Bằng chứng |
|---|---|---|---|
| H1 | Tóm tắt miễn phí chỉ là câu ghép kèm lời xin lỗi “AI chưa hoàn tất” | Cao | `apps/mobile/App.tsx` `buildLocalTarotInterpretation` |
| H2 | Nghĩa mỗi lá khoảng 2 câu, giống nhau ở mọi vị trí; có nhãn “chưa có diễn giải riêng” | Cao | `packages/content/data/tarot-cards.json`, `TarotResultView.tsx` |
| H3 | Lời văn phòng thủ, không gọi tên nhu cầu thật của người hỏi | Cao | Ví dụ Two of Cups: “…không xác nhận người kia có cùng tình cảm” |
| H4 | Lời mời AI tự hạ giá bài miễn phí; hộp xác nhận chỉ nói về dữ liệu và lượt | Cao | `TarotDeepAnalysis.tsx`, Alert trong `App.tsx` |
| H5 | Prompt Tarot và Chiêm tinh đều yêu cầu “concise” | Vừa | `_shared/tarot-prompt.ts`, `_shared/astrology-system-prompt.ts` |
| H6 | Chưa chọn được model theo gói | Vừa | `_shared/model-router.ts` |
| H7 | AI chưa nhận hướng dẫn kiểu trải, quan hệ giữa các lá, lịch sử người dùng | Vừa | `spreadGuide`, `cardFacts` chưa làm |
| H8 | Chưa có dòng thời gian bài đọc, lá lặp lại | Vừa | — |
| H9 | Khách rút bài xong không thấy ý nghĩa nào | Vừa | Q2 16/11 |
| H10 | Chiêm tinh: nội dung rời theo mục; bài AI chỉ hiện 4 dòng; chưa có báo cáo lá số và bản tin tháng | Vừa | `AiDeepRead.tsx` |

## 3. Người dùng (nghiên cứu công khai)

- Pew 2025 (Mỹ, n=9.593): 30% người lớn xem chiêm tinh, Tarot hoặc bói ít nhất mỗi năm; gần 1/4 người 18–29 tuổi xem Tarot; 46% phụ nữ 18–49 xem chiêm tinh. Chỉ 1% dựa “nhiều” vào những thứ này khi ra quyết định lớn.
- YouGov 2017 (Việt Nam): 75% người được hỏi “xem tử vi nghiêm túc”, cao nhất châu Á.
- Động cơ: cảm giác kiểm soát, được an ủi, chữa lành, chọn việc; người dùng coi là “chỉ để tham khảo”.
- Hiệu ứng Barnum: cùng một đoạn văn, khi được nói là “dành cho bạn” thì người đọc thấy đúng hơn hẳn. Vấn đề của Nilaza là **thiếu khung cá nhân**, không phải nội dung sai.
- Khoảng trống tò mò (Loewenstein) và tiến độ có sẵn (34% so với 19%) ủng hộ cách cho xem mục lục và phần đầu báo cáo.
- Giá người Việt đang trả: 50–100 nghìn mỗi câu hỏi Tarot trên TikTok, 200–300 nghìn mỗi buổi; Nebula (App Store VN) 229k/tuần, 129k cho một lần kiểm tra mối quan hệ; ChatGPT Go khoảng 132k/tháng; Spotify 65k/tháng.

## 4. Giá trị quyết định trả tiền

- Người Việt đã dán ngày sinh vào ChatGPT để xem tử vi. Nghiên cứu CHI 2026 (12 người, mẫu nhỏ) cho thấy AI bị chê là “gật đầu với mọi thứ”; bài đọc thấy “của mình” khi có **ngữ cảnh cá nhân tích lũy**.
- Nilaza đã có: rút bài ở máy chủ có khóa, lá số tính đúng, ranh giới an toàn. Còn thiếu: trí nhớ và dòng thời gian, khung báo cáo không cần viết lệnh, kết hợp nhiều nguồn, báo cáo đẹp để lưu.
- Chia model theo gói: chưa có bằng chứng người dùng nhận ra sự khác biệt. Giảm chất lượng âm thầm làm mất lòng tin; bản miễn phí quá hào phóng làm giảm tỷ lệ trả phí (một app giảm từ 20% xuống 9%).
- Chính sách Google Play: phải ghi rõ dùng thử, giá sau dùng thử, tự gia hạn, dễ hủy; quyền lợi dùng một lần phải bán như sản phẩm mua một lần. FTC 2026 khiếu nại Nebula vì gói đăng ký ẩn. Ở Play, 31% lần hủy gói là do lỗi thanh toán; MoMo và trả qua nhà mạng đã có trên Play.

## 5. Ba tầng giá trị

| Tầng | Cho ai | Nội dung | Chi phí AI |
|---|---|---|---|
| **Bài đọc Nilaza** | Mọi người đã đăng nhập | Thông điệp chính; từng lá theo vị trí × chủ đề × chiều; năng lượng chung; một việc nhỏ trong 24 giờ; câu hỏi nhật ký. Không còn câu xin lỗi | 0 |
| **Lời nhắn riêng** | Free, 1 lần/ngày, tự chạy | 150–250 chữ viết thẳng vào câu hỏi, gọi tên nhu cầu bên dưới, kết bằng mục lục báo cáo | ~15–50đ/lượt (model rẻ) |
| **Báo cáo chuyên sâu** | Premium (mức năng lượng “sâu”) | 1.500–2.500 chữ, 9 phần; ngữ cảnh: hướng dẫn kiểu trải, quan hệ lá, lần đọc trước, Big 3 và pha trăng (nếu đồng ý); lưu, xuất ảnh, “Hỏi tiếp” bám báo cáo | ~610đ (cỡ Haiku) – ~1.830đ (cỡ Sonnet) |

Khung báo cáo 9 phần: (1) câu trả lời ngắn; (2) bức tranh tổng thể; (3) từng lá trong câu chuyện của bạn; (4) điều nằm bên dưới câu hỏi; (5) hai hoặc ba kịch bản; (6) khung quan sát 7–14 ngày; (7) kế hoạch 3 bước và một câu nên hỏi người ấy; (8) liên hệ với bạn (lần đọc trước, Big 3, pha trăng); (9) câu hỏi nhật ký và lời nhắc xem lại.

Ranh giới khi viết: trả lời nhu cầu cảm xúc thay vì né câu hỏi; đưa ra hướng nghiêng rõ ràng kèm điều kiện; dùng kịch bản và khung quan sát thay cho dự đoán; gợi ý câu nên hỏi người kia thay vì đoán suy nghĩ của họ; câu miễn trừ đặt ở chân trang một lần.

Ước tính chi phí (cần đo bằng trace thật): với ngân sách AI khoảng 19.500đ/tháng cho một người trả 99k, đủ khoảng 30 báo cáo cỡ Haiku hoặc khoảng 10 báo cáo cỡ Sonnet.

## 6. Chiêm tinh

- Miễn phí: thêm trang chân dung 1 màn hình ghép từ nội dung có sẵn (3 điểm mạnh, 2 điều hay vướng, chủ đề lớn). Giữ “Đọc sâu” 1 lần/ngày, kết bằng mục lục báo cáo lá số.
- Premium: báo cáo lá số theo chương (sinh một lần, lưu bất biến); bản tin tháng về chuyển dịch hành tinh chạm vào lá số; báo cáo hợp đôi theo chương.

## 7. Kế hoạch hành động

| Lô | Nội dung | Cần Owner |
|---|---|---|
| **A** (2–3 ngày) | Sửa lời văn màn kết quả Tarot và Chiêm tinh: bỏ câu tự hạ giá; tóm tắt miễn phí thành bài đọc thật; lời mời AI nói kết quả nhận được; hộp xác nhận nói giá trị trước, dữ liệu sau; rà nghĩa 78 lá (bỏ câu phòng thủ trong thân bài) | Duyệt merge; không cần SQL/deploy |
| **B** (1–2 tuần) | Bài đọc Nilaza v1: kho diễn giải 5 lớp, ưu tiên 3 kiểu trải × 3 chủ đề | Duyệt mẫu từng lớp |
| **C** (1–2 tuần) | Lời nhắn riêng (Free); chọn model theo gói trong bộ định tuyến và Admin; `spreadGuide`, `cardFacts`; chạy thử mù 20 câu hỏi tiếng Việt | Deploy, cấu hình model, có thể migration |
| **D** (2–3 tuần) | Báo cáo chuyên sâu Tarot 9 phần, màn báo cáo, xem trước mờ, dòng thời gian bài đọc | Gắn với Nil P2–P4 (chưa duyệt) |
| **E** (2–4 tuần) | Chân dung, báo cáo lá số theo chương, bản tin tháng | — |
| Liên tục | Phễu đo (thấy kết quả → cuộn → thấy lời mời → bấm → đọc xong → xem gói → mua); câu hỏi 1 chạm “Bài đọc có nói đúng điều bạn đang nghĩ không?”; giữ chân ngày 1/7/30; phỏng vấn 5–8 người thử | — |

## 8. Quyết định của Owner (21/11/2026: đồng ý cả 5)

1. **Q1** Free có “lời nhắn riêng” AI tự chạy 1 lần/ngày: **Có**.
2. **Q2** Model cho báo cáo Premium: chốt sau chạy thử mù; mặc định cỡ Haiku, thử cỡ Sonnet cho báo cáo lá số.
3. **Q3** Free xem mục lục và phần đầu báo cáo, các phần sau hiện mờ: **Có**, không đếm ngược, không giảm giá ép.
4. **Q4** Làm Lô A ngay: **Có**.
5. **Q5** Bán lẻ từng báo cáo: chưa ở v1; ứng viên mạnh cho P6, nếu làm thì bán như sản phẩm mua một lần theo chính sách Play.

## 9. Mức chắc chắn

- **Đã kiểm chứng (đọc mã và tài liệu):** câu chữ màn kết quả, lời mời AI, hộp xác nhận; độ dài nghĩa lá; prompt yêu cầu “concise”; một tuyến model chung cho mọi gói.
- **Chưa kiểm chứng:** hành vi thật của người dùng Nilaza (chưa có closed test); chất lượng tiếng Việt của model rẻ; chi phí thật mỗi lượt; chưa mở app trên điện thoại; số liệu thị trường chỉ có mức tin cậy theo nguồn, chưa có khảo sát người dùng Việt riêng.

## Nguồn

- Pew Research Center (05/2025): https://www.pewresearch.org/religion/2025/05/21/3-in-10-americans-consult-astrology-tarot-cards-or-fortune-tellers/
- YouGov (2017): https://yougov.com/articles/19426-horoscope-and-behaviour-change
- Báo Pháp Luật (06/2023): https://baophapluat.vn/trao-luu-trai-bai-online-cua-gioi-tre-post477426.html · Báo Hà Tĩnh (02/2025): https://baohatinh.vn/boi-bai-tarot-xu-huong-hay-hiem-hoa-post282408.html · Vietnam News (09/2025): https://vietnamnews.vn/talk-around-town/1725528/why-fate-is-viet-nam-s-favourite-hobby.html
- Tuổi Trẻ News (07/2024): https://news.tuoitre.vn/in-vietnam-young-people-turn-to-fortune-telling-for-career-decisions-10380758.htm · VnExpress (12/2023): https://vnexpress.net/con-nghien-xem-boi-bai-tarot-4695518.html
- Hiệu ứng Barnum: https://en.wikipedia.org/wiki/Barnum_effect · Golman & Loewenstein: https://www.cmu.edu/dietrich/sds/docs/golman/golman_loewenstein_curiosity.pdf · Nunes & Drèze: https://msbfile03.usc.edu/digitalmeasures/jnunes/intellcont/Endowed%20Progress%20Effect-1.pdf
- CHI 2026: https://arxiv.org/html/2602.11367v1 · Văn bản AI và người đọc phổ thông: https://arxiv.org/html/2510.13939v2
- RevenueCat 2026: https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026 · 2025: https://www.revenuecat.com/state-of-subscription-apps-2025 · Thiết kế bản miễn phí: https://www.revenuecat.com/blog/growth/freemium-tier-design.md
- Nebula App Store VN: https://apps.apple.com/vn/app/id1459969523?l=vi
- FTC/Nebula: https://www.pymnts.com/subscriptions/2026/ftc-widens-subscription-crackdown-with-sweeping-complaint-against-genesis-tech/ · Chính sách gói đăng ký Google Play: https://support.google.com/googleplay/android-developer/answer/9900533
- ChatGPT Go tại VN: https://e.vnexpress.net/news/tech/tech-news/openai-s-most-affordable-chatgpt-plan-now-available-in-vietnam-4949761.html · MoMo trên Google Play: https://www.momo.vn/tin-tuc/tin-tuc-su-kien/cau-hoi-thuong-gap-khi-thanh-toan-google-play-qua-vi-momo-1124

Truy cập ngày 21/11/2026.
