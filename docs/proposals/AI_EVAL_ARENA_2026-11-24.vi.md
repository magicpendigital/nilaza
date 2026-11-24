# Eval Arena: một cách thử mù chung cho mọi tính năng AI (24/11/2026)

> Trạng thái: **đề xuất, chưa xây gì**. Không có mã, SQL, deploy hay đổi cấu hình nào đi kèm tài liệu này.
> Câu hỏi của Owner: "phân tích và đề xuất phương án thử mù tối ưu hơn và dễ mở rộng cho các features tương tự về sau".
> Liên quan: [`TAROT_NOTE_READER_ROUTER_CAMPAIGNS_2026-11-23.vi.md`](TAROT_NOTE_READER_ROUTER_CAMPAIGNS_2026-11-23.vi.md) mục 3 (chiến dịch) và mục 4 (thử mù 20 câu).

**Cách đọc nhãn:** **[Đã kiểm chứng]** = đã đọc trong mã/tài liệu của repo. **[Giả định]** = suy luận hoặc thông tin ngoài repo, chưa kiểm chứng.

## 0. Tóm tắt một đoạn

Hiện thử mù mới được mô tả cho riêng Tarot, chạy một lần, một người chấm. Đề xuất: biến nó thành **một cơ chế dùng chung (Eval Arena)** gồm bốn mảnh: (1) **bộ câu thử** cố định cho từng tính năng, (2) **các "thí sinh" là tuyến model** có cùng dạng với các bản của chiến dịch, (3) **chấm theo tầng**: kiểm tự động (miễn phí) → máy chấm sơ loại (tùy chọn) → Owner chấm mù **từng cặp** trên điện thoại, (4) **bàn giao thẳng** bản thắng sang chiến dịch thật rồi xuất bản. Các "model quyết định" (jev, `gpt-6-luna`, `gemini-decision-1`) không viết được chữ nên không thi viết lời nhắn, nhưng **rất hợp để thi chọn người dẫn** (`reader_router`), và phần đó chạy hoàn toàn tự động sau khi Owner gán nhãn đáp án một lần.

## 1. Cái gì còn yếu trong kế hoạch hiện tại (cách A/B)

Kế hoạch hiện tại (mục 4 tài liệu 23/11): 20 câu hỏi tiếng Việt, mỗi model viết một bài, tên ẩn thành Bài X/Y/Z, Owner chấm "bài nào hay nhất". Cách A mở rộng `admin-ai-eval-run`; cách B là script trên máy Owner.

| # | Điểm yếu | Vì sao đáng ngại |
|---|---|---|
| 1 | **Làm một lần, bỏ đi** | Mỗi lần có model mới (tháng nào cũng có) lại phải dựng lại từ đầu. |
| 2 | **Chỉ Tarot** | Chat người dẫn, báo cáo chiêm tinh, Bản đồ số, insight hằng ngày đều cần thử mà chưa có chỗ. |
| 3 | **Một người chấm, một lần** | Owner mệt, mood trong ngày ảnh hưởng; không có cách đo "mình chấm có nhất quán không". |
| 4 | **20 mục là ít về mặt thống kê** | Nếu hai model hơn kém nhau 55/45, 20 lượt không đủ phân biệt với may rủi. Chỉ nên kết luận khi chênh lệch lớn. |
| 5 | **"Chọn hay nhất trong 3" là việc khó** | Phải đọc 3 bài dài rồi xếp hạng; người mệt thường chọn bài đầu hoặc bài dài nhất. |
| 6 | **Thiên lệch vị trí** | Bài ở vị trí đầu thường được ưu ái; xáo ngẫu nhiên chưa đủ nếu không cân bằng có chủ đích. |
| 7 | **Mệt mỏi** | 20 câu × 3 bài × ~200 từ ≈ 12.000 từ phải đọc; chất lượng chấm giảm dần về cuối. |
| 8 | **Không nối với hệ chiến dịch** | Kết quả thử mù nằm riêng; muốn chạy thật phải dựng lại tuyến model bằng tay. |
| 9 | **Không đo tự động các lỗi đo được** | Độ dài, đúng vị trí lá, "đoán ý người khác", an toàn khủng hoảng đều kiểm bằng máy được, không cần người. |

**[Đã kiểm chứng]** `runner.ts` hiện chạy mỗi câu hai lần (bản nháp so với bản đang chạy), và chỉ hỗ trợ sáu tính năng: `persona_chat`, `oracle_router`, `tarot_reading`, `daily_insight`, `ai_council`, `astrology_insight`. Chưa có `tarot_note`, `reader_router`. Chưa có "tuyến thay thế theo từng bản" (đó là phần cách A phải thêm).

## 2. Đề xuất: Eval Arena

### 2.1 Những gì đã có và có thể dùng lại

**[Đã kiểm chứng]**

- Bảng `ai_eval_sets`, `ai_eval_cases`, `ai_eval_runs`, `ai_eval_results` (migration `20261113110000_ai_eval_release_gate.sql`).
- Ngân sách chạy thử **1 USD mỗi tháng** (giờ Việt Nam), giữ chỗ trước mỗi lần gọi model (0,02 USD/lượt), chạy vượt thì bị từ chối chứ không chạy dở (migration `20261114090100`).
- Bộ thử **bắt buộc có ca khủng hoảng**; ca này không đến model, chỉ đạt khi trả lời bằng nội dung hỗ trợ có số **115**.
- Trang Admin chạy thử (`apps/admin/ai-evals.js`) và hàm `admin-ai-eval-run` dùng đúng cách ghép lời nhắc như hàm tính năng thật.

Vì vậy Eval Arena là **mở rộng**, không dựng lại.

### 2.2 Bộ câu thử (eval set) theo từng tính năng

Mỗi tính năng có một bộ câu cố định, có phiên bản, **toàn bộ tổng hợp** (không lấy câu hỏi người dùng thật).

| Thành phần | Tarot / lời nhắn | Chiêm tinh | Chat người dẫn |
|---|---|---|---|
| Đầu vào | câu hỏi + **bộ lá gieo hạt cố định** | **bản đồ sao mẫu** (đã có "chart tổng hợp" trong migration 20261114) | người dẫn + đoạn hội thoại mẫu |
| Nhãn (tag) | chủ đề (tình yêu, công việc, bản thân, gia đình, chung), độ khó | chủ đề, hành tinh nổi bật | người dẫn, tông cảm xúc |
| Ca an toàn | bắt buộc ≥ 2 ca khủng hoảng + vài ca "nhạy cảm" (sức khỏe, tiền, người thứ ba) | như trên | như trên |

Quy tắc chung:

- **Phiên bản:** sửa bộ thì tăng phiên bản; kết quả luôn ghi "bộ nào, phiên bản nào" để so sánh công bằng.
- **Không dữ liệu thật.** Nếu sau này muốn lấy mẫu từ người dùng thật (ẩn danh hóa), đó là **quyết định riêng của Owner** kèm đánh giá riêng; tài liệu này không đề xuất.
- **Bộ 20 câu hỏi ở mục 4 tài liệu 23/11 chính là bộ đầu tiên** của Tarot (6 tình yêu, 5 công việc, 5 bản thân, 2 gia đình, 2 chung). Nên thêm 2 ca khủng hoảng và 3–4 ca nhạy cảm để đủ cho kiểm an toàn.
- **Cỡ bộ:** 20 là đủ để *loại bỏ* model rõ ràng tệ; để *phân biệt hai model gần nhau* cần 40–60 (xem 2.5). Bộ có thể lớn dần theo thời gian vì dùng lại được.

### 2.3 Thí sinh = tuyến model (route variant)

Mỗi thí sinh là một **tuyến**: danh sách tối đa 4 bước, mỗi bước gồm nhà cung cấp + model (cùng dạng JSON với `model-router.ts` và với các bản của chiến dịch ở mục 3 tài liệu 23/11). **[Đã kiểm chứng]** tuyến hiện có dạng này.

Lợi ích của việc dùng đúng một dạng:

```
Thử mù (offline, bộ câu tổng hợp)
   → Chiến dịch (người dùng thật, chia %, nhỏ)
      → Xuất bản (tuyến mặc định)
```

Tuyến thắng ở bước 1 **chép nguyên** sang bước 2 (không dựng lại), và bản thắng ở bước 2 xuất bản bằng nút đã có trong thiết kế chiến dịch. Một dạng, ba giai đoạn.

### 2.4 Bộ chạy (runner)

Mở rộng `admin-ai-eval-run`:

- Nhận **"tuyến thay thế theo từng thí sinh"** (hiện chỉ so bản nháp với bản đang chạy), 2–4 thí sinh một lần.
- Chạy theo **lô nhỏ** trong ngân sách tháng đang có; **hiện chi phí ước tính trước khi chạy** và từ chối nếu vượt phần còn lại (cơ chế này đã có).
- Tự ghi cho mỗi bài: **chi phí, thời gian phản hồi, lỗi định dạng, bị chặn an toàn, có dùng dự phòng không**. **[Đã kiểm chứng]** `EvalResult` đã có các trường `formatPass`, `safetyPass`, `latencyMs`, `costMicro`, `fallbackUsed`.
- Bài dùng dự phòng bị gắn nhãn, **không** tính là điểm của thí sinh (nếu không sẽ chấm nhầm model dự phòng).
- Tính năng mới tham gia bằng cách thêm vào danh sách tính năng của runner (xem 2.7).

Ước tính chi phí (**[Giả định]**, theo ước tính 0,1–0,4 USD cho 20 câu × 3 model ở tài liệu 23/11): lặp lại với bộ 40 câu × 4 thí sinh cỡ vài chục US cent, nằm trong 1 USD/tháng nếu không chạy quá nhiều lần. Máy chấm sơ loại (2.5b) tốn thêm, nên có dòng ngân sách riêng.

### 2.5 Chấm theo ba tầng

**(a) Kiểm tự động (miễn phí, luôn chạy).** Máy kiểm những gì đo được, ví dụ cho lời nhắn Tarot:

- đúng định dạng và độ dài **150–250 từ**;
- **nhắc đúng vị trí các lá** đã rút;
- **không khẳng định điều người khác nghĩ/cảm** (ví dụ "người ấy yêu bạn", "anh ấy đang nhớ bạn");
- ca khủng hoảng thì trả lời hỗ trợ có **115**, không qua model;
- không có email/số điện thoại trong bài.

Bài trượt tầng này **bị loại khỏi vòng người chấm** nhưng vẫn được đếm vào "tỉ lệ lỗi" của thí sinh. **[Đã kiểm chứng]** hiện đã có kiểm định dạng (`checkTarotOutputText`) và kiểm an toàn khủng hoảng; các kiểm còn lại (đếm từ, đoán ý người khác, vị trí lá) là **thêm mới**.

**(b) Máy chấm sơ loại bằng model khác (tùy chọn).** Một LLM chấm theo bảng tiêu chí ngắn (có trả lời đúng câu hỏi không, có chung chung không, có đoán ý người khác không, giọng có ấm và không phán xét không). Quy tắc:

- **Phải là model khác họ với các thí sinh** (model tự chấm bài của chính mình thường thiên vị).
- Chỉ dùng để **loại bài rất tệ và gắn cờ**, **không** để chọn người thắng.
- Có thể bật/tắt; tắt thì Owner chấm nhiều hơn một chút.

**(c) Owner chấm mù theo cặp, tiếng nói cuối cùng.** Trên màn hình điện thoại, mỗi lượt hiện **một câu hỏi + bộ lá + hai bài (A, B)**, các nút:

- "A hay hơn" / "B hay hơn";
- "**Hòa**" (ngang nhau);
- "**Cả hai đều tệ**";
- gắn lỗi (nhiều lựa chọn): đoán ý người khác, chung chung, không trả lời câu hỏi, giọng phán xét, sai lá, quá dài/ngắn.

Tên model, chi phí, thời gian **chỉ hiện sau khi chấm xong**.

**Vì sao chấm theo cặp tốt hơn "chọn hay nhất trong 3" với một người mệt:**

- Mỗi lượt chỉ so **hai bài** thay vì giữ ba bài trong đầu: nhanh hơn, ít nhầm hơn.
- Có lối thoát "Hòa" và "Cả hai đều tệ" nên không bị ép chọn bừa.
- **Thiên lệch vị trí được cân bằng có chủ đích:** với mỗi cặp, số lần model nào đứng bên trái = số lần đứng bên phải (không chỉ xáo ngẫu nhiên).
- Có thể **dừng bất cứ lúc nào**: kết quả vẫn dùng được với số lượt đã chấm; không bỏ phí như khi bỏ dở danh sách 20 câu.
- Các lượt chấm lại một cặp (thêm một ít cặp lặp ngầm) cho biết Owner có nhất quán không.

**Xếp hạng bằng lời thường:** mỗi thí sinh có **tỉ lệ thắng** (thắng 1 điểm, hòa nửa điểm) trên các cặp đã chấm. Cách đơn giản này đủ cho 3–4 thí sinh. Nếu muốn chặt hơn, dùng kiểu **Bradley-Terry** (mỗi thí sinh có một "điểm mạnh", cặp nào mạnh hơn thì thắng nhiều hơn; điểm được tính lại từ toàn bộ các cặp cùng lúc, nên một thí sinh chưa đấu hết mọi cặp vẫn xếp được). Trong cả hai cách, Admin **luôn kèm ghi chú độ tin cậy**: nếu khoảng dao động của hai thí sinh chồng nhau thì ghi "chưa đủ dữ liệu để kết luận", đúng tinh thần bảng số đo của chiến dịch.

Cỡ mẫu tham khảo (**[Giả định]**, quy tắc ngón tay cái): để thấy rõ tỉ lệ thắng 65/35 cần khoảng 40–50 lượt có kết quả (không hòa) mỗi cặp thí sinh; 20 lượt chỉ cho thấy chênh lệch rất lớn. Vì vậy bộ nên lớn dần.

### 2.6 Model quyết định nằm ở đâu

**Thông tin mới (Owner ghi nhận 24/11, [Giả định] chưa kiểm chứng ở repo):** có ba "model quyết định": TypeSafe `jev` (`typesafe/jev-1.14` qua OpenRouter, API Decisions bản alpha), OpenAI `gpt-6-luna` (`/v1/decisions`), Google `gemini-decision-1`. Chúng trả về **một lựa chọn + xác suất + độ tin cậy, không trả văn bản**, giá khoảng 0,04–0,10 USD mỗi triệu token vào. **Hỗ trợ tiếng Việt chưa có tài liệu. Chính sách dữ liệu của jev qua OpenRouter chưa kiểm chứng.**

Hệ quả:

- **Không thể là thí sinh** cho lời nhắn Tarot, báo cáo chiêm tinh, chat (không viết được chữ).
- **Rất hợp làm bộ phân loại** cho việc "chọn một trong N": gợi ý người dẫn (`reader_router`), phân loại khủng hoảng sơ bộ, gắn nhãn ý định.
- **Rẻ nên làm "phiếu sơ loại"** trong tầng 2.5b: ví dụ hỏi "bài này có đoán ý người khác không? có/không" cho kết quả kèm độ tin cậy, thay cho một LLM chấm viết dài.

**Bài thi nhỏ cho `reader_router` (chạy hoàn toàn tự động):**

1. Owner gán nhãn **40 câu hỏi** tiếng Việt với "người dẫn đúng" (một lần; khoảng 20–30 phút, chưa tính dữ liệu thật vì câu là tổng hợp). Nên có ca mơ hồ (cho phép 2 đáp án chấp nhận được) và vài ca khủng hoảng.
2. Chạy năm thí sinh với **cùng danh sách người dẫn và cùng câu hỏi**:
   - `jev` (`typesafe/jev-1.14`);
   - `gpt-6-luna`;
   - `gemini-decision-1`;
   - **một LLM chat rẻ** (đang là ứng viên tuyến `reader_router`);
   - **bộ luật hiện có trên máy** (tầng luật ở mục 2 tài liệu 23/11) làm mốc đối chứng.
3. Đo: **độ chính xác** (trùng nhãn Owner), **thời gian phản hồi**, **chi phí mỗi 1000 lượt**, **tỉ lệ lỗi định dạng/không trả lời**, và (nếu có) mức tự tin có tương ứng với đúng/sai không.
4. Không cần người chấm thêm. Nếu bộ luật trên máy đã ngang model về chính xác thì **không cần gọi model** (rẻ nhất, riêng tư nhất).

**Chặn trước khi chạy [Giả định cần Owner/agent kiểm]:** (i) hỗ trợ tiếng Việt thật của từng model (bài thi này tự là phép đo đó); (ii) chính sách dữ liệu: nên dùng tuyến có **không lưu dữ liệu (ZDR)** hoặc `data_collection` từ chối; nếu một nhà cung cấp không đáp ứng thì không gửi câu hỏi nào, kể cả tổng hợp, vào đến khi rõ; (iii) API Decisions là bản alpha nên tên model/giá có thể đổi; (iv) có thể phải thêm nhà cung cấp mới vào `provider-registry` (một thay đổi mã riêng, ngoài phạm vi tài liệu này).

### 2.7 Dễ mở rộng: thêm tính năng mới cần gì

Một tính năng mới tham gia Arena bằng **ba thứ**, không cần dựng cơ chế mới:

1. **Khóa tính năng** trong danh sách tuyến (`model-router.ts`, hợp đồng `admin-model-router-config/contract.ts`) và, nếu cần, trong danh sách tính năng của runner. **[Đã kiểm chứng]** hiện có 6 khóa; `tarot_note` và `reader_router` đang được đề xuất thêm.
2. **Một tệp bộ câu thử** (đầu vào, gieo hạt/fixture, tag, ca an toàn).
3. **Một bảng tiêu chí** gồm các **kiểm tự động** (định dạng, độ dài, điều cấm) và vài dòng tiêu chí cho máy chấm sơ loại và cho người chấm.

Ví dụ các tính năng sắp tới:

| Tính năng | Bộ câu thử | Kiểm tự động gợi ý | Ai là thí sinh |
|---|---|---|---|
| Chat người dẫn (`persona_chat`) | người dẫn + hội thoại mẫu | giữ đúng giọng, không hứa chắc kết quả, có 115 khi cần | tuyến chat |
| Báo cáo chiêm tinh (`astrology_report`) | bản đồ sao mẫu | chỉ dùng vị trí đã tính, không bịa hành tinh | tuyến viết dài |
| **Bản đồ số** (thần số học) | ngày sinh mẫu | số đúng với bộ tính cố định | tuyến viết |
| Insight hằng ngày (`daily_insight`) | ngày + tâm trạng mẫu | độ dài, không nhắc dữ liệu riêng tư | tuyến viết ngắn |
| **Báo cáo Premium 9 phần** | bộ lá + hồ sơ mẫu | đủ 9 phần, mỗi phần trong khung độ dài | tuyến viết dài |
| Phân loại (gợi ý người dẫn, ý định) | câu hỏi có nhãn | độ chính xác so với nhãn | **cả model quyết định** |

### 2.8 Riêng tư và chi phí

- Bộ thử **tổng hợp**; màn hình chấm **không bao giờ hiện câu hỏi thật** của người dùng.
- Ưu tiên tuyến **ZDR** / từ chối thu thập dữ liệu cho mọi lần chạy thử; thí sinh nào không đáp ứng thì bị gắn cờ trước khi chạy.
- **Ngân sách mỗi lần chạy hiện trước khi bấm chạy**, trừ vào hạn mức tháng (1 USD hiện nay; đổi mức cần migration riêng, Owner duyệt).
- Admin chỉ thấy bài sinh ra từ bộ tổng hợp; không có đường nào đưa dữ liệu người dùng thật vào Arena.
- Không khóa, không đọc `.env`: khóa nhà cung cấp vẫn chỉ nằm trong bí mật của Edge Function, do Owner tự đặt.

## 3. Các bước làm đề xuất và việc cần Owner duyệt

Mỗi bước độc lập; Owner có thể dừng sau bất kỳ bước nào.

| Bước | Làm gì | Cần Owner duyệt (từng lần) |
|---|---|---|
| **1. Tarot qua bộ chạy mới + màn chấm cặp** | Thêm "tuyến thay thế theo thí sinh" vào `admin-ai-eval-run`; bộ 20 câu Tarot (+ ca an toàn) thành bộ thử đầu tiên; màn chấm cặp trên điện thoại ở Admin; kiểm tự động 2.5a | (1) PR mã (merge `main`, tự deploy Admin staging); (2) migration cho bảng phiếu chấm và liên kết thí sinh nếu cần; (3) **deploy `admin-ai-eval-run`**; (4) xác nhận ngân sách 1 USD/tháng đủ, hoặc đổi mức bằng migration riêng; (5) Owner **chấm** |
| **2. Bài thi `reader_router` với model quyết định** | Owner gán nhãn 40 câu; thêm nhà cung cấp model quyết định; chạy tự động năm thí sinh | (1) PR mã (thêm nhà cung cấp, loại thí sinh "phân loại"); (2) **đặt khóa nhà cung cấp mới (Owner tự đặt, agent không đọc)**; (3) kiểm chính sách dữ liệu của từng nhà cung cấp; (4) deploy; (5) Owner gán nhãn |
| **3. Bàn giao bản thắng sang chiến dịch** | Nút "Tạo chiến dịch từ bản thắng" chép tuyến sang chiến dịch (mục 3 tài liệu 23/11) | Phụ thuộc chiến dịch đã có (đang xây); (1) PR mã; (2) migration liên kết nếu cần; (3) Owner bấm tạo chiến dịch và xuất bản |
| **4. Tính năng khác** | Thêm chat người dẫn, chiêm tinh, Bản đồ số, insight, báo cáo Premium bằng ba thứ ở 2.7 | Mỗi tính năng: bộ câu thử (Owner xem), PR mã, deploy hàm liên quan nếu đổi |

Không bước nào tự đổi tuyến model, lời nhắc hay hạn mức đang chạy; **chỉ xuất bản mới đổi**, và xuất bản vẫn do Owner/vai trò được phép bấm.

## 4. So sánh

| Tiêu chí | Cách A hiện tại (mở rộng runner, Owner chấm hay nhất/3) | Cách B hiện tại (script máy Owner) | **Eval Arena** |
|---|---|---|---|
| Công sức xây | Vừa (sửa runner, deploy) | Thấp (một script) | **Cao hơn lần đầu**, thấp cho tính năng sau |
| Công sức Owner mỗi lần | Cao (đọc 3 bài × 20 câu) | Cao như A | **Thấp hơn**: chấm cặp, dừng được, máy loại bài lỗi trước |
| Chi phí model | ~0,1–0,4 USD/lần (ước tính) | Tương tự, ngoài ngân sách Admin | Trong ngân sách tháng, hiện trước; thêm một ít cho máy chấm sơ loại (tùy chọn) |
| Dùng lại | Không | Không (kết quả ngoài Admin) | **Có**: bộ thử, tiêu chí và tuyến dùng lại cho mọi tính năng |
| Sức mạnh thống kê | Yếu (20 mục, một người, thiên lệch vị trí) | Như A | **Khá hơn**: cặp cân bằng vị trí, bộ lớn dần, có ghi chú độ tin cậy; vẫn là một người chấm |
| Riêng tư | Bộ tổng hợp, qua Edge Function | Khóa nằm máy Owner | Bộ tổng hợp, ưu tiên ZDR, màn chấm không hiện dữ liệu thật |
| Nối chiến dịch | Chưa | Không | **Cùng dạng tuyến** → chép sang chiến dịch |
| Thời gian ra kết quả đầu tiên | Sau PR + deploy | **Nhanh nhất** (vài giờ) | Sau bước 1: chậm hơn B, ngang A; tính năng sau nhanh hơn nhiều |

Cách B vẫn là lối **nhanh nhất để có một con số đầu tiên** nếu Owner cần kết quả ngay; nhưng nó không đóng góp vào Arena.

## 5. Quyết định cần Owner (mỗi mục kèm đề xuất)

1. **Có chuyển từ cách A/B sang Eval Arena không?** Đề xuất: **Có, làm theo bước 1** (Tarot trước), giữ bộ 20 câu làm bộ đầu tiên. Lựa chọn khác: giữ cách B làm bước tạm để có số sớm.
2. **Cách chấm của Owner:** Đề xuất: **chấm theo cặp** (có "Hòa", "Cả hai đều tệ", gắn lỗi), thay cho "hay nhất trong 3".
3. **Có dùng máy chấm sơ loại (LLM khác họ) không?** Đề xuất: **Có, bật được/tắt được**, chỉ để loại bài rất tệ và gắn cờ, ngân sách riêng nhỏ.
4. **Cỡ bộ thử Tarot:** Đề xuất: bắt đầu **20 câu + 2 ca khủng hoảng + 3–4 ca nhạy cảm**, rồi **lên 40–60** khi cần phân biệt hai model gần nhau.
5. **Ngân sách chạy thử:** Đề xuất: **giữ 1 USD/tháng** cho bước 1; xem lại sau lần chạy đầu (đổi mức cần migration riêng).
6. **Bài thi `reader_router` với model quyết định (bước 2):** Đề xuất: **Làm**, nhưng chỉ sau khi (a) Owner gán nhãn 40 câu, (b) chính sách dữ liệu từng nhà cung cấp được kiểm chứng, (c) tuyến ZDR hoặc từ chối thu thập dữ liệu. Nếu bộ luật trên máy đã đủ tốt thì **không dùng model** cho gợi ý người dẫn.
7. **Ai gán nhãn 40 câu `reader_router`:** Đề xuất: **Owner**, kèm cho phép 2 đáp án chấp nhận được với câu mơ hồ.
8. **Có cho lấy mẫu câu hỏi thật (ẩn danh) vào bộ thử sau này không?** Đề xuất: **Không ở giai đoạn này**; chỉ xem lại khi có đánh giá riêng về quyền riêng tư và chấp thuận của Owner.
9. **Thứ tự tính năng sau Tarot (bước 4):** Đề xuất: **báo cáo Premium 9 phần → chiêm tinh → chat người dẫn → Bản đồ số → insight hằng ngày** (theo giá trị và mức rủi ro nếu chọn sai model).
10. **Bàn giao sang chiến dịch (bước 3):** Đề xuất: **làm sau khi chiến dịch đã chạy ổn**, chưa cần trước bước 1.

## 6. Đã kiểm chứng và chưa kiểm chứng

**Đã kiểm chứng (đọc trong repo 24/11):** các bảng `ai_eval_*`; ngân sách 1 USD/tháng và từ chối thay vì cắt giữa chừng; bộ thử cần ca khủng hoảng; runner hiện so bản nháp với bản đang chạy cho sáu tính năng; tuyến model gồm tối đa 4 bước nhà cung cấp + model; các trường kết quả đo (định dạng, an toàn, thời gian, chi phí, dự phòng); bộ 20 câu và hai cách A/B ở tài liệu 23/11.

**Chưa kiểm chứng:** mọi thông tin về model quyết định (tên, giá, API, hỗ trợ tiếng Việt, chính sách dữ liệu của jev qua OpenRouter) lấy từ ghi nhận của Owner 24/11; cỡ mẫu tham khảo ở 2.5; chi phí ước tính cho bộ lớn hơn; việc cần thêm nhà cung cấp mới vào `provider-registry`; không có phần nào được thử trên thiết bị hay chạy thật.
