# Trò chuyện với tri thức: sách, tác giả, hồ sơ tri thức và Oracle (24/11/2026)

> Trạng thái: **đề xuất, chưa xây gì**. Không có mã, SQL, deploy hay đổi cấu hình nào đi kèm tài liệu này.
> Yêu cầu của Owner (24/11): rà soát toàn bộ nhân vật trong Trò chuyện; mỗi nhân vật phải "chất" và có hàm lượng tri thức cao; người dùng trò chuyện trực tiếp với cuốn sách; Oracle phải mang chiều sâu tri thức và định vị thương hiệu.
> Mẫu đi kèm: [`data/book-brief-sample-binh-phap-ton-tu.vi.md`](data/book-brief-sample-binh-phap-ton-tu.vi.md).
> Liên quan: [`AI_EVAL_ARENA_2026-11-24.vi.md`](AI_EVAL_ARENA_2026-11-24.vi.md) (thử mù), [`AI_CONTEXT_CONFIG_2026-11-14.vi.md`](AI_CONTEXT_CONFIG_2026-11-14.vi.md) (dữ liệu gửi cho AI), [`../NIL_PRICING_STRATEGY_2026-11-15.vi.md`](../NIL_PRICING_STRATEGY_2026-11-15.vi.md) (chi phí theo gói).

**Cách đọc nhãn:** **[Đã kiểm chứng]** = đã đọc trong mã/dữ liệu của repo (nhánh `main`, 24/11). **[Giả định]** = suy luận hoặc thông tin ngoài repo, chưa kiểm chứng. Chưa chạy app, chưa xem Admin đang chạy; prompt trên máy chủ thật có thể đã được sửa qua Admin và khác bản gốc trong repo.

## 0. Tóm tắt một đoạn

Hiện 17 nhân vật chỉ khác nhau ở tên, ảnh và vài tính từ; trong luồng gửi cho AI không có chỗ nào chứa tri thức. Đề xuất: (1) tách **Sách** và **Tác giả** thành hai loại thẻ có liên kết hai chiều; (2) mỗi thẻ có một **hồ sơ tri thức do Nilaza tự viết** (không chép nội dung sách) và một phương pháp trả lời riêng; (3) nới giới hạn độ dài, bật suy luận, nâng mức chờ và cho chọn **hạng model** theo nhân vật trong Admin; (4) Oracle dùng chung các hồ sơ này như "skill", mỗi lượt một lăng kính hợp nhất; (5) chỉ mở rộng sau khi thí điểm 3 cuốn thắng rõ trong thử mù.

## 1. Quyết định của Owner trong chat 24/11

| # | Quyết định | Ghi chú |
|---|---|---|
| Q1 | **Tách sách khỏi tác giả**; sách nằm trong mục liên kết của tác giả và ngược lại | Lý do của Owner: một tác giả có thể viết nhiều sách. |
| Q2 | **Không đưa nội dung sách vào app**; dựa vào kiến thức sẵn có của model, hướng tới người đã đọc hoặc muốn hiểu nhanh chiều sâu cuốn sách | Kèm điều kiện ở mục 4: mỗi sách có hồ sơ do Nilaza tự viết. |
| Q3 | **Nới giới hạn ký tự** (có độ dài mặc định, không thả hoàn toàn) | Hai giới hạn, xem mục 2. |
| Q4 | **Bật suy luận (thinking)** cho nhân vật tri thức | Phải tăng trần đầu ra đi kèm. |
| Q5 | **Không bỏ timeout; nâng mức chờ** và cho chữ hiện dần | Con số cụ thể chờ Owner chốt (mục 9). |
| Q6 | **Chọn model theo hạng** cho từng nhân vật trong Admin (2–3 hạng), không cấu hình rời từng nhân vật | Mỗi lần đổi model phải chấm lại. |

## 2. Hiện trạng [Đã kiểm chứng]

**Luồng trả lời của một nhân vật** (`supabase/functions/ai-persona-chat/index.ts`, `_shared/persona-prompt-assembler.ts`):

| Lớp | Nội dung thật | Sửa trong Admin? |
|---|---|---|
| Prompt chung | 3 câu (`packages/agent-config/prompt-library.json`, `persona_chat_system`) | Có |
| Prompt riêng | ~10 dòng sinh từ một khuôn: tên, vai trò, 3–4 tính từ, 4 từ khóa chủ đề (`supabase/seed.generated.sql`, bản `2026-06-28-persona-skill-v1`). Không có khái niệm hay lập luận nào | Có (Persona Studio) |
| Khuôn phương pháp | 3 khuôn kiểu coaching, chọn theo từ khóa (`selectMethodPack`) | **Không**, viết cứng trong mã |
| Quy tắc đầu ra | "ngắn gọn, một câu hỏi phản chiếu hoặc một bước nhỏ", lặp ở cả ba lớp trên | Không |

- Lỗi chọn khuôn: `communication-mentor` nhận khuôn ra quyết định vì từ "practical" được xét trước nhóm quan hệ.
- Model: `persona_chat` và `oracle_router` cùng dùng `deepseek/deepseek-v4.1-flash`, suy luận tắt, trần đầu ra 2.000 token (`packages/agent-config/model-routing.json`). Model chọn theo **tính năng**, chưa theo nhân vật.
- Trí nhớ: 8 lượt gần nhất, mỗi lượt cắt còn 800 ký tự (`ai-persona-chat/persona-context.ts`). Hạn mức 5 tin/ngày dùng chung Chat + Oracle. Mức chờ hiển thị trong Admin: 40 giây.
- Oracle (`ai-oracle-turn/handler.ts`, `_shared/oracle-tools.ts`): trả lời 2–4 câu, tối đa 700 ký tự, chọn tối đa 2 nút; prompt nằm trong bộ khóa phiên bản nên Admin không sửa được; danh sách người dẫn viết cứng 12/17 (thiếu `confucius`, `sun-tzu`, `strategic-thinker`, `harmony-guide`, `stoic-journal`); không lưu hội thoại.
- Danh sách nhân vật (`packages/content/data/personas-*.json`): 3/5 nhân vật sách trùng với nhân vật lịch sử (Chiến Lược Gia Cổ Điển ≈ Tôn Tử, Người Dẫn Lối Tự Nhiên ≈ Lão Tử, Nhật Ký Khắc Kỷ ≈ Marcus Aurelius); 5/7 nhân vật Nilaza tự tạo cùng gắn Tarot.
- Giao diện (`apps/mobile/src/features/chat/ChatHub.tsx`, `persona/PersonaChatRoom.tsx`, `App.tsx`): trang Trò chuyện có 3 bộ lọc, không có "Sách" (hàm lọc đã hỗ trợ `books` nhưng không hiện); 8 thẻ nổi bật chỉ có 1 sách; lời mở đầu trong phòng chat giống nhau cho mọi nhân vật; 3 câu gợi ý cố định lặp sau mỗi tin.
- Trang chi tiết (`packages/content/data/persona-detail-content.json`): có câu trong ngoặc kép không phải nguyên văn (đã đối chiếu Aristotle, Lão Tử, Khổng Tử; chưa đối chiếu 14 nhân vật còn lại); mục "Dấu vết gần đây" là chữ cố định.

## 3. Sách và Tác giả: hai loại thẻ

| | Sách | Tác giả |
|---|---|---|
| Tên thẻ | Tên sách quen thuộc với người Việt | Tên tác giả |
| Phạm vi | Chỉ trong cuốn đó | Xuyên suốt tác phẩm, cuộc đời, bối cảnh |
| Câu hỏi điển hình | "Cuốn này nói gì? Phần nào bàn chuyện này? Lập luận có vững không?" | "Ông ấy sẽ nhìn chuyện của tôi thế nào? Vì sao ông nghĩ vậy?" |
| Giọng | Người đọc kỹ đang giảng lại, ngôi "mình" | Lăng kính tư tưởng của tác giả, vẫn minh bạch là AI lấy cảm hứng |

Quy tắc:

1. **Sách là đơn vị chính.** Chỉ tạo thẻ tác giả khi có điều thẻ sách không có: nhiều tác phẩm, hoặc cuộc đời đáng nói. Tôn Tử và Lão Tử có thể chưa cần thẻ tác giả ở đợt đầu.
2. **Liên kết hai chiều** trên trang chi tiết ("Tác giả" trên trang sách, "Tác phẩm" trên trang tác giả). Khi bấm sang, mạch chuyện đi theo bằng cơ chế chuyển ngữ cảnh đã có (`_shared/chat-handoff.ts`).
3. **Hai lối vào trên trang sách:** "Tôi đã đọc" (tranh luận, áp dụng) và "Tôi chưa đọc" (tổng quan → ý chính → đi sâu).
4. **Mỗi thẻ phải trả lời được:** tri thức gốc là gì, hỏi được gì, không dùng để làm gì.

## 4. Hồ sơ tri thức (thay cho prompt riêng 10 dòng)

Mỗi sách hoặc tác giả có một hồ sơ **do Nilaza tự viết bằng lời của mình**. Ý tưởng không được bảo hộ bản quyền, cách diễn đạt mới được; hồ sơ không chép câu chữ của sách. [Giả định: cần luật sư xác nhận trước khi phát hành sách còn bản quyền.]

Các phần của hồ sơ (xem mẫu đầy đủ):

1. Thẻ nhận diện: tên, tác giả, thời đại, tình trạng bản quyền.
2. Luận điểm trung tâm (3–5 câu).
3. Bố cục và ý chính từng phần.
4. Khái niệm then chốt.
5. Chỗ hay bị hiểu sai và câu hay bị gán nhầm.
6. Tranh luận, phê bình, giới hạn của sách.
7. Cách áp dụng vào đời thường, kèm ranh giới an toàn.
8. Phương pháp trả lời riêng của thẻ.
9. Quy tắc trích dẫn.
10. Câu hỏi gợi mở và bộ câu thử.

Lý do cần hồ sơ dù model đã biết về sách nổi tiếng [Giả định, từ hiểu biết chung về model]: model nhớ ý chính khá tốt nhưng hay bịa câu "nguyên văn" và số chương, và chất lượng không đều giữa các sách. Hồ sơ giữ cho câu trả lời đúng, có cấu trúc, và là phần riêng của Nilaza mà ứng dụng chat phổ thông không có.

## 5. Luồng trả lời mới

| Lớp | Hiện nay | Đề xuất |
|---|---|---|
| Prompt chung | 3 câu, yêu cầu ngắn gọn | Bỏ yêu cầu "ngắn gọn"; giữ minh bạch và an toàn |
| Prompt riêng | 10 dòng từ khuôn | Hồ sơ tri thức (mục 4), sửa và phát hành trong Admin như prompt riêng hiện nay |
| Khuôn phương pháp | 3 khuôn viết cứng | Phương pháp nằm trong hồ sơ; 3 khuôn cũ chỉ còn là mặc định cho nhân vật chưa có hồ sơ |
| Quy tắc đầu ra | Ngắn, kết bằng câu hỏi | Độ dài mặc định vừa (khoảng 150–300 từ), có nút "Đào sâu"; nêu nguồn ý (phần nào của sách); không bắt buộc kết bằng câu hỏi |
| Trí nhớ | 8 lượt × 800 ký tự | Nới theo độ dài mới (đề xuất 12 lượt × 2.500 ký tự, chốt sau khi đo chi phí) |
| Model | Một model cho mọi nhân vật, suy luận tắt | Hạng model theo nhân vật, suy luận bật ở hạng "tri thức sâu" |
| Mức chờ | 40 giây | 90–120 giây và chữ hiện dần [Giả định: chưa kiểm app đã có hiện dần chưa, chưa kiểm giới hạn thời gian của nền tảng máy chủ] |

Lớp an toàn (khủng hoảng, ranh giới bất biến) giữ nguyên, luôn chạy trước và không phụ thuộc cấu hình.

## 6. Admin

- **Hồ sơ tri thức:** soạn theo 10 phần, có nháp, phiên bản, so sánh và phát hành, dùng lại cơ chế của "Prompt & phiên bản".
- **Hạng model:** 2–3 hạng (ví dụ "Thường", "Tri thức sâu"), mỗi hạng gồm model chính, model dự phòng, mức suy luận, trần đầu ra, mức chờ. Mỗi nhân vật chọn một hạng.
- **Loại thẻ và liên kết:** trường "Loại" (sách, tác giả, người dẫn Nilaza) và danh sách thẻ liên kết.
- **Cổng phát hành:** hồ sơ mới hoặc đổi hạng model phải qua bộ câu thử của nhân vật đó (mục 8).
- **Hai chỗ sửa prompt nhân vật:** màn "Người dẫn" (`apps/admin/content.js`, trường "Prompt người dẫn") và Persona Studio (`apps/admin/prompt-versions.js`). Cần xác định chỗ nào thật sự tới model rồi gộp về một chỗ. [Chưa kiểm chứng chỗ nào đang có hiệu lực.]

## 7. Oracle (làm sau khi nhân vật đạt)

- Mỗi hồ sơ tri thức là một "skill" ba tầng: mô tả một dòng (luôn có), phần lõi (nạp khi được chọn), chi tiết (nạp khi cần).
- Mỗi lượt: bước 1 chọn **một** hồ sơ hợp nhất (đôi khi thêm một góc đối chiếu) và nút gợi ý; bước 2 viết câu trả lời với hồ sơ đó, nêu rõ nguồn, rồi mời đi sâu với nhân vật.
- Không trộn mọi nhân vật vào một câu trả lời: câu sẽ chung chung và người dùng không còn lý do mở nhân vật.
- Phần riêng của Oracle: dữ liệu của chính người dùng trong Nilaza (lá bài hôm nay, lá số, nhật ký khi được phép).
- Việc kèm theo: danh sách người dẫn lấy từ dữ liệu thay vì viết cứng; mở prompt Oracle cho Admin sửa; lưu hội thoại; nới 700 ký tự.
- Cái giá: hai lần gọi model mỗi lượt, chi phí khoảng gấp đôi. [Giả định, cần đo.]

## 8. Thử mù và tiêu chí đạt

Dùng cơ chế trong `AI_EVAL_ARENA_2026-11-24.vi.md`. Với mỗi sách thí điểm:

- 20 câu hỏi cố định (trong hồ sơ, phần 10), gồm cả câu bẫy trích dẫn và câu ngoài phạm vi sách.
- So ba bài: nhân vật Nilaza mới, nhân vật Nilaza hiện tại, một chatbot phổ thông được hỏi thẳng cùng câu.
- Đạt khi: (a) không có câu "nguyên văn" bịa hoặc số chương sai trong cả 20 bài; (b) người chấm mù chọn bài Nilaza mới ở ít nhất 14/20 câu; (c) đối chiếu với sách thật không thấy sai ý.
- Không đạt thì chưa mở rộng sang sách khác.

Số đo trong app sau khi mở: tỉ lệ bấm thẻ, số tin mỗi phiên, tỉ lệ 👍, số lần lưu, quay lại sau 7 ngày.

## 9. Lô việc

| Lô | Nội dung | Cần Owner duyệt riêng |
|---|---|---|
| 0 | Sửa nhanh trong app và dữ liệu: bỏ câu trích không có nguồn, đổi nhãn "Dấu vết gần đây", thêm bộ lọc "Sách", lời mở đầu riêng từng nhân vật, sửa lỗi chọn khuôn, đồng bộ danh sách người dẫn của Oracle | Deploy `ai-persona-chat`, `ai-oracle-turn` |
| 1 | Thí điểm 3 sách tự do bản quyền (Binh pháp Tôn Tử, Đạo Đức Kinh, Suy tưởng): viết hồ sơ, đưa vào prompt riêng qua Admin hiện có, chạy thử mù | Phát hành prompt; ngân sách thử |
| 2 | Hạng model, suy luận, mức chờ, nới độ dài và trí nhớ; chữ hiện dần | Migration, deploy, đổi tuyến model |
| 3 | Loại thẻ Sách/Tác giả, liên kết hai chiều, trang chi tiết mới, hai lối vào | Migration, bản app mới |
| 4 | Oracle dùng hồ sơ tri thức | Migration, deploy |
| 5 | Cắt và gộp danh sách nhân vật theo kết quả; thêm sách mới theo quy trình hồ sơ + thử mù | Từng cuốn |

Mỗi lô khi làm cần hồ sơ `docs/feature-plans/<tên>.json` và `npm run feature:preflight` theo quy định của repo.

## 10. Bản quyền [Giả định, không thay ý kiến luật sư]

- Nguyên tác cổ (Binh pháp, Đạo Đức Kinh, Suy tưởng, Luận Ngữ) tự do; bản dịch hiện đại có bản quyền riêng. Vì không nạp nội dung sách nên chỉ cần tránh chép bản dịch.
- Sách còn bản quyền (ví dụ Đắc Nhân Tâm tại Mỹ, bản quyền 1936 gia hạn 1964, bản sửa đổi 1981): chỉ dùng tên sách để bàn luận; không chép đoạn dài; không dùng bìa của nhà xuất bản; không tóm tắt chi tiết từng chương đến mức thay thế việc mua sách; luôn ghi "không phải sách gốc, tác giả hay nhà xuất bản".
- Quy tắc sẵn có trong `packages/content/data/persona-research-queue.json` (không nạp nội dung có bản quyền) giữ nguyên.

## 11. Câu hỏi còn mở cho Owner

1. Ba cuốn thí điểm: đồng ý Binh pháp Tôn Tử, Đạo Đức Kinh, Suy tưởng, hay muốn thay một cuốn bằng sách hiện đại quen thuộc hơn (rủi ro bản quyền cao hơn)?
2. Mức chờ tối đa chấp nhận được: 90 hay 120 giây?
3. Hạn mức 5 tin/ngày: nới cho nhân vật tri thức ở gói nào, tính Nil ra sao?
4. Số hạng model và ngân sách mỗi tin cho hạng "Tri thức sâu".
5. Ai viết và ai duyệt hồ sơ sách (AI soạn, Owner duyệt, hay có người am hiểu sách đọc lại)?
