# Hội đồng: rà soát trải nghiệm và đề xuất "nhiều hội đồng" (14/11/2026)

> **Loại tài liệu:** đề xuất, chưa sửa app. Viết cho Owner (ngôn ngữ sản phẩm); chi tiết kỹ thuật nằm ở **Phụ lục**.
> **Yêu cầu của Owner (14/11):** phân tích lại UI/UX phần Hội đồng; định hướng người dùng tạo được **nhiều hội đồng** riêng, bên cạnh các hội đồng gợi ý sẵn của Nilaza. Hiện app chỉ có một hội đồng.
> **Cơ sở:** đọc mã nguồn trên `origin/main` (cb32621). **Chưa thử trên máy thật** cho phần này. Mỗi phát hiện ghi rõ *đã kiểm chứng* (đọc thấy trực tiếp trong mã hoặc ghi chép thử máy trước đó) hay *suy luận* (đoán từ cách mã chạy, cần thử máy để chắc).
> **Liên quan:** đề xuất cấu hình ngữ cảnh gửi cho AI theo từng tính năng (kiểu n8n — chọn khối dữ liệu nào đi vào mô hình) đang được soạn song song. Tài liệu này **không** lặp lại phần đó; chỗ nào cần sẽ ghi "theo đề xuất cấu hình ngữ cảnh".

---

## 1. Tóm tắt một trang

**Hiện trạng trong một câu:** người dùng thấy một phòng "Hội đồng 3 góc nhìn" với 4 chủ đề gợi ý, nhưng cả 4 chủ đề đều dùng **cùng 3 người dẫn**; người dùng chỉ lưu được **một** hội đồng tự chọn, và (suy luận) khi đã đăng nhập, máy chủ có thể **bỏ qua** lựa chọn người dẫn của họ.

**Năm vấn đề lớn nhất (xếp theo mức độ):**

1. **Lựa chọn người dẫn có thể không được tôn trọng** — máy chủ ưu tiên danh sách người dẫn của chủ đề; người thứ 4 bị cắt. (Suy luận, cần thử máy — mức **Nghiêm trọng**.)
2. **"4 chủ đề, cùng một nhóm người"** — cả 4 hội đồng gợi ý đều là Người thầy giao tiếp + Lão Tử + Aristotle; 2 chủ đề còn ở trạng thái nháp vẫn hiện cho người dùng. (Đã kiểm chứng — **Cao**.)
3. **Chỉ một ô "hội đồng của tôi"**, nút "Lưu hội đồng" và "Xong" khó phân biệt, chọn chủ đề khác là mất hội đồng tự tạo khỏi màn hình. (Đã kiểm chứng — **Cao**.)
4. **Mỗi lượt hỏi tiếp tạo một phiên mới trên máy chủ** → lịch sử có thể bị trùng/tách. (Suy luận — **Cao**.)
5. **Hết lượt, chưa đăng nhập, mất mạng**: thông báo chưa có nút hành động, không cho biết còn mấy câu hỏi tiếp; khách vào được phòng rồi mới biết phải đăng nhập. (Đã kiểm chứng trong mã — **Cao/Trung bình**.)

**Đề xuất "nhiều hội đồng" — bản đầu (MVP):**

- Màn **"Hội đồng"** mới dạng thư viện: *Gợi ý từ Nilaza* (hội đồng soạn sẵn, mỗi cái có người dẫn khác nhau) + *Hội đồng của bạn* (tối đa 10) + *Tiếp tục cuộc họp gần đây*.
- Tạo hội đồng qua **3 bước**: chọn 2–4 người dẫn → chọn mục đích và giọng → đặt tên và biểu tượng. Có **"Sao chép để chỉnh"** từ hội đồng gợi ý, **sửa**, **xóa** (có xác nhận), **ghim** lên đầu.
- Lưu hội đồng tự tạo **trên tài khoản** (máy chủ, chỉ chủ tài khoản xem được), có bản nhớ tạm trên máy; khách chỉ xem được hội đồng gợi ý.
- App chỉ gửi **mã người dẫn**, máy chủ tự kiểm và tự lấy hồ sơ người dẫn — không bao giờ nhận lời dặn AI từ điện thoại.
- **Lượt dùng không đổi**: 1 cuộc họp/ngày + 4 câu hỏi tiếp, dù có bao nhiêu hội đồng.

**Thứ tự làm:** Gói 0 sửa lỗi hiện có (nhỏ–vừa) → Gói 1 nhiều hội đồng (vừa–lớn) → Gói 2 Admin quản lý hội đồng gợi ý + thống kê ẩn danh (vừa) → Gói 3 hoàn thiện (nhỏ–vừa).

**Owner cần quyết 9 câu hỏi** ở mục 5 (mỗi câu có sẵn khuyến nghị).

---

## 2. Rà soát trải nghiệm hiện tại

### 2.1 Hành trình người dùng hôm nay

| Bước | Người dùng thấy gì | Nhận xét |
|---|---|---|
| Lối vào | Thẻ "Hội đồng 3 góc nhìn" ở Khám phá và Trò chuyện; thẻ trên Trang chủ ghi "AI Council / Mở Council"; Oracle có thể chuyển sang Hội đồng kèm câu hỏi. | Ba tên gọi khác nhau; tiếng Anh lẫn vào. |
| Chọn chủ đề | 4 chip: chuyện tình cảm, công việc mù mờ, nghĩ quá nhiều, quyết định lớn. | Đổi chủ đề nhưng người dẫn **không đổi**. |
| Chọn người dẫn | Menu "Tự chọn người dẫn" mở một bảng phủ: tên, giọng, chủ đề, 8 người dẫn gợi ý. | Bảng dày, nút nhỏ, hai nút cuối mơ hồ. |
| Hỏi | Ô nhập + 3 câu mở đầu gợi ý. | Tốt. Chú thích chỉ ghi "1 lượt hội đồng mỗi ngày". |
| Các người dẫn nói | Lần lượt từng bong bóng; có nút trò chuyện riêng và nút báo cáo. | Nút 34×34 — nhỏ hơn chuẩn 48. |
| Tổng hợp | Thẻ "Tổng hợp": điểm chung, điểm còn căng, giả định, bước nhỏ, câu hỏi mở. | Nội dung tốt; không được lưu vào nhật ký. |
| Hỏi tiếp | Tối đa 4 câu. | Không có bộ đếm còn lại. |
| Lưu / chia sẻ | "Lưu biên bản" → nhật ký với tiêu đề cố định "Hội đồng 3 góc nhìn". | Không có chia sẻ; mọi biên bản cùng tên. |

### 2.2 Danh sách phát hiện (xếp theo mức độ)

Mức độ: **Nghiêm trọng** (người dùng nhận kết quả sai so với điều họ chọn) · **Cao** (gây bối rối/mất dữ liệu/mất lượt) · **Trung bình** (khó dùng, sai chuẩn) · **Thấp** (đánh bóng).

| # | Mức | Phát hiện | Ảnh hưởng đến người dùng | Cách sửa | Bằng chứng | Chắc chắn |
|---|---|---|---|---|---|---|
| U1 | Nghiêm trọng | Khi máy chủ tìm thấy cấu hình chủ đề đang hoạt động, nó dùng **danh sách người dẫn của chủ đề**, không dùng người dùng tự chọn. Người dẫn thứ 4 bị cắt vì máy chủ giới hạn theo số người của chủ đề. | Người dùng chọn Phù thủy + Đứa trẻ bên trong nhưng vẫn nghe Lão Tử, Aristotle → mất niềm tin. | Máy chủ nhận danh sách mã người dẫn, kiểm hợp lệ và **dùng đúng** danh sách đó (xem 3.5). | `supabase/functions/ai-council/index.ts` L307–336, L426; app `useAiCouncilRoom.ts` L172–189 | Suy luận (cần thử máy) |
| U2 | Cao | Cả 4 hội đồng gợi ý dùng cùng 3 người: communication-mentor, laozi, aristotle. 2 chủ đề trạng thái nháp (`draft_review`) vẫn hiện. | "Đổi chủ đề" không đổi gì; cảm giác Hội đồng nghèo nàn dù có 17 người dẫn. | Soạn lại bộ gợi ý với người dẫn khác nhau; chỉ hiện chủ đề đã duyệt. | `packages/agent-config/ai-council.json`; `useAiCouncilRoom.ts` L462 | Đã kiểm chứng |
| U3 | Cao | Chỉ **một** hội đồng tự tạo (một ô lưu cố định). Chọn chủ đề gợi ý khác thì hội đồng tự tạo biến khỏi màn hình. Hai nút "Lưu hội đồng" và "Xong" không rõ khác nhau; mọi lần bấm chọn người dẫn đều tự đặt tên theo chủ đề. | Người dùng không giữ được nhiều nhóm; tưởng đã lưu nhưng không. | Thư viện nhiều hội đồng + trình tạo 3 bước (mục 3). | `useAiCouncilRoom.ts` L39–41, L587–626, L821–847, L829; `AiCouncilRoom.tsx` L272–383 | Đã kiểm chứng |
| U4 | Cao | Máy chủ tạo **một phiên mới cho mỗi lượt** (kể cả câu hỏi tiếp); app chuyển sang mã phiên mới mỗi lần. | Lịch sử có thể hiện nhiều mục cho cùng một cuộc họp; lịch sử trên máy chủ bị tách mảnh. | Máy chủ tạo phiên ở lượt mở đầu, các lượt sau dùng lại mã phiên. | `index.ts` L507–528; `useAiCouncilRoom.ts` L739–741 | Suy luận |
| U5 | Cao | Hết lượt: cùng một câu "Hôm nay bạn đã dùng lượt hội đồng…" cho cả hết cuộc họp lẫn hết câu hỏi tiếp; nút "Hội đồng mới" vẫn bấm được rồi mới báo hết lượt; không có bộ đếm "còn 3 câu hỏi tiếp". Nếu AI trả lời lỗi định dạng, người dùng nhận câu trả lời soạn sẵn nhưng **vẫn bị trừ lượt**. | Mất lượt oan; không biết mình còn gì. | Hai thông điệp riêng; hiển thị "Còn x câu hỏi tiếp hôm nay"; không trừ lượt khi trả lời dự phòng. | `useAiCouncilRoom.ts` L758–768; `AiCouncilRoom.tsx` L508–521; `index.ts` L487, L572–591 | Đã kiểm chứng (thông điệp) / Suy luận (trừ lượt) |
| U6 | Cao | Chưa đăng nhập: vào được phòng, gõ câu hỏi, rồi mới thấy "Đăng nhập để dùng Hội đồng 3 góc nhìn." — không có nút đăng nhập. | Mất công gõ; ngõ cụt. | Khách xem được thư viện và giới thiệu; ô nhập thay bằng nút "Đăng nhập để bắt đầu"; giữ câu hỏi đã gõ sau khi đăng nhập. | `useAiCouncilRoom.ts` L758–768; `index.ts` L391 | Đã kiểm chứng trong mã |
| U7 | Cao | App gửi **cả hồ sơ người dẫn** (tên, vai trò, ghi chú) lên máy chủ; khi máy chủ không tìm đủ người dẫn, nó dùng chữ do app gửi để dặn AI. Tên gọi (biệt danh) người dùng chưa được gửi. Tên hội đồng tự đặt không được kiểm. | Rủi ro an toàn (chữ từ điện thoại vào lời dặn AI); AI không gọi đúng tên người dùng. | Chỉ gửi mã; máy chủ tự tra hồ sơ; gửi biệt danh qua khối dữ liệu (đã có sẵn ở máy chủ). | `useAiCouncilRoom.ts` L636–788; `index.ts` L30–61, L307–336; backlog CO-03 | Đã kiểm chứng |
| U8 | Cao | App **ghim phiên bản cấu hình** đóng gói sẵn; Admin hiện **khóa** nút xuất bản Hội đồng. Nếu sau này Admin xuất bản bản mới (bản cũ bị lưu trữ), máy chủ không tìm thấy bản app ghim → quay về dùng dữ liệu do app gửi. | Hội đồng gợi ý không cập nhật được từ Admin; nếu mở khóa sai cách sẽ làm hỏng hội đồng gợi ý. | App tải danh sách hội đồng gợi ý từ máy chủ; xuất bản nguyên khối qua một thủ tục duy nhất (Gói 2). | `index.ts` L250–305; `admin-ai-council-config/index.ts`; `apps/admin/app.js` L1273; backlog AI-09 | Đã kiểm chứng |
| U9 | Trung bình | Nút/chip nhỏ hơn 48dp: chip chủ đề 40, chip giọng và chip chủ đề trong bảng ~30, nút "Lưu hội đồng"/"Xong" 38, "Lưu biên bản" 36, nút trên bong bóng 34. | Khó bấm, nhất là người lớn tuổi; trái chuẩn thương hiệu. | Đưa tất cả lên tối thiểu 48 (dùng `layout.minimumTouchTarget`). | `AiCouncilRoom.tsx` L542, L301–339, L879–908 | Đã kiểm chứng |
| U10 | Trung bình | Nút đóng bảng "Tự chọn người dẫn" chỉ có biểu tượng, **không có nhãn đọc màn hình**. Thẻ người dẫn đã chọn bị vô hiệu khi chỉ còn 2 người mà không giải thích. | TalkBack đọc "nút" không tên; người dùng không hiểu vì sao không bỏ chọn được. | Thêm nhãn "Đóng"; giải thích "Cần ít nhất 2 người dẫn". | `AiCouncilRoom.tsx` L284–286, L343–364 | Đã kiểm chứng (mã); TalkBack chưa thử máy |
| U11 | Trung bình | Chưa có giới hạn phóng chữ (`maxFontSizeMultiplier`); hàng 3 ảnh đại diện 72px và bảng phủ tuyệt đối dễ vỡ khi chữ 150–200%. Bàn phím che ô nhập (CH-12). | Người dùng chữ lớn thấy chữ tràn, nút bị che. | Kiểm bố cục chữ lớn; bảng phủ → màn riêng; xử lý bàn phím chung theo CH-12. | `AiCouncilRoom.tsx` L392–416, L272; PLAN Gói B | Suy luận |
| U12 | Trung bình | Chữ không thống nhất: "Hội đồng 3 góc nhìn" dù có 2–4 người; "AI Council", "Mở Council", "guide", "group", "người dẫn đường" lẫn "người dẫn"; câu gợi ý hỏi tiếp từ máy chủ dùng "guide". "Bước tiếp theo:" viết hoa giữa câu ở câu trả lời dự phòng. | Thiếu chuyên nghiệp; trái quy ước dùng "người dẫn". | Một bảng thuật ngữ (mục 2.4) và sửa toàn bộ. | `AiCouncilRoom.tsx` L164–168; `App.tsx` L6551–6610; `index.ts` L610–613; `useAiCouncilRoom.ts` L191–217 | Đã kiểm chứng |
| U13 | Trung bình | Biên bản lưu vào nhật ký luôn tên "Hội đồng 3 góc nhìn" và **không** gồm phần tổng hợp; không có chia sẻ. | Người dùng mất phần giá trị nhất; khó tìm lại. | Tiêu đề = tên hội đồng + ngày; lưu cả tổng hợp; thêm chia sẻ văn bản (Gói 3). | `useAiCouncilRoom.ts` L790–819 | Đã kiểm chứng |
| U14 | Trung bình | Xuất dữ liệu cá nhân **không** gồm hội đồng tự tạo. | Thiếu so với cam kết xuất dữ liệu. | Thêm vào bản xuất (và vào bảng máy chủ khi chuyển sang lưu tài khoản). | `features/privacy/localExport.ts` L5–14 | Đã kiểm chứng |
| U15 | Thấp | Nhãn viết hoa, đậm 900 thay vì phông thương hiệu (Hanken Grotesk/EB Garamond); chữ 10–12px. | Lệch thương hiệu, khó đọc. | Dùng kiểu chữ chuẩn của theme. | `AiCouncilRoom.tsx` L650–655 và các style nhãn | Đã kiểm chứng |
| U16 | Thấp | Màn `CouncilHub` trong `App.tsx` không bao giờ được mở (mã chết), chữ tiếng Anh. | Không ảnh hưởng người dùng; gây nhầm cho người sửa. | Xóa, hoặc dùng làm nền cho thư viện mới. | `App.tsx` L5639–5640, L6765–6870 | Đã kiểm chứng |
| U17 | Thấp | Thông báo an toàn trong phòng không được lưu cùng phiên. | Mở lại phiên không thấy thẻ hỗ trợ. | Lưu cờ an toàn vào phiên. | `AiCouncilRoom.tsx` L486–491 | Đã kiểm chứng |

### 2.3 An toàn (khủng hoảng) — hiện đã ổn ở phần chính

- Câu hỏi có dấu hiệu khủng hoảng được chặn **trước khi** tính lượt và gọi AI, chuyển sang thẻ hỗ trợ với số **115** (đã kiểm chứng trong mã máy chủ và có kiểm thử tự động ở app).
- Khi mất mạng, app dùng bộ lọc chung trên máy (đã kiểm chứng: thử máy 11/11 thấy câu trả lời dự phòng khi bật chế độ máy bay).
- **Còn thiếu:** tên hội đồng do người dùng đặt chưa được lọc (từ ngữ xúc phạm, mạo danh người thật, nội dung khủng hoảng). Cần thêm khi cho tạo nhiều hội đồng (mục 3.8).

### 2.4 Thuật ngữ đề xuất

| Dùng | Không dùng |
|---|---|
| Hội đồng | Council, AI Council, group, "Hội đồng 3 góc nhìn" (trừ khi đúng 3 người) |
| người dẫn | guide, người dẫn đường |
| cuộc họp (một lần hỏi + các câu hỏi tiếp) | phiên, session |
| câu hỏi tiếp | follow-up |
| biên bản | transcript |
| Hội đồng gợi ý từ Nilaza / Hội đồng của bạn | preset, custom council |

Người dẫn luôn được mô tả là **AI lấy cảm hứng từ** một tác phẩm, nhân vật hay hình mẫu — không phải người thật đang nói chuyện.

---

## 3. Thiết kế "nhiều hội đồng"

### 3.1 Mô hình sản phẩm

**Hai loại hội đồng:**

| | Hội đồng gợi ý (Nilaza soạn) | Hội đồng của bạn |
|---|---|---|
| Ai tạo | Nilaza, qua Admin | Người dùng |
| Ai thấy | Mọi người dùng | Chỉ chủ tài khoản |
| Sửa được không | Không; bấm "Sao chép để chỉnh" | Có |
| Thành viên | 2–4 người dẫn, có thể gồm người dẫn trả phí | 2–4 người dẫn người dùng được phép dùng |
| Có vai trò trong cuộc họp | Có (người mở đầu, người phản biện, người tổng kết…) | Tự động gán theo thứ tự chọn |

**Một hội đồng gồm:**

- **Tên** — tối đa 40 ký tự, bắt buộc, được lọc (mục 3.8). Gợi ý sẵn tên nếu người dùng không muốn nghĩ.
- **Biểu tượng** — chọn từ bộ ~16 biểu tượng có sẵn của thương hiệu (không tải ảnh lên).
- **Mục đích** — chọn 1 trong danh sách cố định: Tình cảm, Công việc, Nghĩ quá nhiều, Quyết định lớn, Gia đình, Tự hiểu mình, Khác. Dùng để gợi câu mở đầu và sắp xếp; không phải chữ tự do.
- **Giọng** — Cân bằng, Nhẹ nhàng, Thẳng thắn, Thực tế, Tâm linh (lấy từ danh sách giọng máy chủ đã chấp nhận).
- **Người dẫn** — 2 đến 4.

**Giới hạn đề xuất:** tối đa **10** hội đồng của bạn (gói miễn phí và trả phí như nhau ở bản đầu). Lượt dùng **không đổi**: 1 cuộc họp/ngày + 4 câu hỏi tiếp, tính trên tài khoản, không theo từng hội đồng.

**Thao tác:** tạo mới · sao chép từ hội đồng gợi ý · sửa · đổi tên · xóa (có xác nhận; biên bản cũ vẫn giữ trong nhật ký) · ghim lên đầu (thay cho kéo thả sắp xếp ở bản đầu, dễ dùng hơn với TalkBack).

**Người dẫn trả phí:** hiện có 4 người dẫn "xem trước gói trả phí". Khuyến nghị: người dùng miễn phí thấy họ trong danh sách nhưng có nhãn khóa; hội đồng gợi ý có người dẫn trả phí vẫn dùng được (để giới thiệu) — xem câu hỏi Q4.

### 3.2 Màn hình và luồng

Sơ đồ phác bằng chữ; kích thước nút tối thiểu 48dp, thẻ bo góc ≤ 8, nút và chip dạng viên thuốc theo chuẩn thương hiệu.

**(A) Thư viện "Hội đồng"** — thay cho việc mở thẳng vào phòng.

```
┌─────────────────────────────────────┐
│ ←  Hội đồng                         │
│ Nhiều góc nhìn cho một chuyện thật. │
│ Hôm nay: còn 1 cuộc họp             │
├─────────────────────────────────────┤
│ TIẾP TỤC                            │
│ ┌─────────────────────────────────┐ │
│ │ ◐ Nhóm cân não · 2 giờ trước    │ │
│ │ "Có nên nhận việc ở Đà Nẵng…"   │ │
│ │ Còn 3 câu hỏi tiếp       [Mở]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ HỘI ĐỒNG CỦA BẠN        [+ Tạo mới] │
│ ┌──────────────┐ ┌──────────────┐   │
│ │ ★ Nhóm cân não│ │ ☾ Đêm khó ngủ│   │
│ │ ○○○ 3 người  │ │ ○○ 2 người   │   │
│ │ Công việc    │ │ Nghĩ quá nhiều│  │
│ └──────────────┘ └──────────────┘   │
│                                     │
│ GỢI Ý TỪ NILAZA                     │
│ ┌──────────────┐ ┌──────────────┐   │
│ │ Khi tim rối  │ │ Ngã rẽ sự    │   │
│ │ ○○○          │ │ nghiệp ○○○   │   │
│ └──────────────┘ └──────────────┘   │
│ ...                                 │
└─────────────────────────────────────┘
```

- Bấm thẻ → **trang giới thiệu hội đồng** (B).
- Giữ lâu / nút "⋯" trên thẻ của bạn → Sửa · Ghim · Xóa. Trên thẻ gợi ý → Sao chép để chỉnh.
- Trên điện thoại hẹp, thẻ xếp một cột; với chữ lớn, thẻ tự giãn cao.

**(B) Trang giới thiệu hội đồng** (trước khi họp)

```
┌─────────────────────────────────────┐
│ ←  Nhóm cân não                 ⋯   │
│ Công việc · Giọng thực tế           │
├─────────────────────────────────────┤
│ (◯) Người thầy chiến lược           │
│     Mở đầu: nhìn bức tranh lớn      │
│ (◯) Khổng Tử                        │
│     Phản biện: trách nhiệm, quan hệ │
│ (◯) Người hòa giải bên trong        │
│     Tổng kết: điều bạn cần lúc này  │
│ Người dẫn là AI lấy cảm hứng từ     │
│ tác phẩm/nhân vật, không phải người │
│ thật.                               │
├─────────────────────────────────────┤
│ Gợi ý câu mở đầu:                   │
│ [ Mình đang phân vân giữa hai việc ]│
│ [ Sếp vừa nói một điều làm mình …  ]│
├─────────────────────────────────────┤
│ [ Kể tình huống của bạn…         ➤ ]│
│ 1 cuộc họp/ngày · tối đa 4 câu hỏi  │
│ tiếp                                │
└─────────────────────────────────────┘
```

Khi gửi câu đầu tiên, trang này trở thành **phòng họp** (C) — không đổi màn hình, giảm cảm giác "nhảy trang".

**(C) Phòng họp** — giữ cấu trúc hiện có, sửa:

- Tiêu đề = tên hội đồng; dưới tiêu đề là ảnh nhỏ các người dẫn.
- Bỏ menu "Tự chọn người dẫn" khỏi phòng (việc này chuyển sang trình tạo).
- Thanh trạng thái phía trên ô nhập: "Còn 3 câu hỏi tiếp hôm nay".
- Thẻ Tổng hợp có 2 nút cỡ 48: **Lưu vào nhật ký** · **Chia sẻ** (Gói 3).
- Hết câu hỏi tiếp: ô nhập thay bằng thẻ "Cuộc họp hôm nay đã đủ. Bạn có thể lưu biên bản hoặc quay lại vào ngày mai." + nút Lưu biên bản.

**(D) Trình tạo/sửa hội đồng — 3 bước, mỗi bước một màn**

```
Bước 1/3 · Chọn người dẫn               [Hủy]
Chọn 2 đến 4 người. Đã chọn 2/4.
[Tất cả] [Hình mẫu] [Từ sách] [Nhân vật]   ← chip lọc
┌─────────────────────────────────────┐
│ (◯) Phù thủy          ✓ Đã chọn     │
│     Trực giác, biểu tượng           │
│ (◯) Lão Tử            [ Chọn ]      │
│     Buông bớt, thuận tự nhiên       │
│ (◯) Marcus Aurelius   🔒 Gói trả phí │
└─────────────────────────────────────┘
                         [ Tiếp tục → ]   (tắt cho đến khi đủ 2)
```

```
Bước 2/3 · Hội đồng này giúp bạn việc gì?
( ) Tình cảm   ( ) Công việc   ( ) Nghĩ quá nhiều
( ) Quyết định lớn  ( ) Gia đình  ( ) Tự hiểu mình  ( ) Khác
Giọng trả lời:
( ) Cân bằng ( ) Nhẹ nhàng ( ) Thẳng thắn ( ) Thực tế ( ) Tâm linh
                         [ ← Quay lại ] [ Tiếp tục → ]
```

```
Bước 3/3 · Đặt tên
Tên hội đồng  [ Nhóm cân não            ] 12/40
Biểu tượng    ☾ ★ ◐ ✿ ⌂ ♡ ✦ …
Xem trước:  ★ Nhóm cân não · 3 người dẫn · Công việc
                         [ ← Quay lại ] [ Lưu hội đồng ]
```

- Chỉ **một** nút lưu ở cuối; thoát giữa chừng thì hỏi "Bỏ hội đồng đang tạo?".
- "Sao chép để chỉnh" mở thẳng trình tạo với dữ liệu điền sẵn và tên "Bản của tôi — <tên gốc>".
- Sửa hội đồng dùng cùng trình tạo, mở ở bước người dùng chọn.

**(E) Từ Oracle sang Hội đồng:** giữ chức năng hiện có; Oracle gợi ý một hội đồng gợi ý phù hợp chủ đề, mở trang (B) với câu hỏi điền sẵn, người dùng có thể đổi sang hội đồng của mình trước khi gửi.

### 3.3 Trạng thái trống, lần đầu, lỗi

| Tình huống | Nội dung đề xuất |
|---|---|
| Lần đầu mở | Thẻ giới thiệu ngắn: "Hội đồng là vài người dẫn AI cùng nhìn một chuyện của bạn từ nhiều phía, rồi tóm lại điểm chung và một bước nhỏ." + nút "Thử một hội đồng gợi ý". |
| Chưa có hội đồng của bạn | Ô nét đứt: "Chưa có hội đồng riêng. Ghép những người dẫn bạn tin để dùng lại lần sau." + [Tạo hội đồng] + [Sao chép từ gợi ý]. |
| Đã có 10 hội đồng | Nút Tạo mới hiện "Đã đủ 10 hội đồng. Xóa bớt một hội đồng để tạo thêm." |
| Khách (chưa đăng nhập) | Xem thư viện gợi ý và trang giới thiệu; ô nhập thay bằng [Đăng nhập để bắt đầu]; mục "Hội đồng của bạn" hiện "Đăng nhập để tạo và lưu hội đồng riêng." |
| Hết cuộc họp hôm nay | Đầu thư viện: "Hôm nay bạn đã họp rồi. Hẹn bạn ngày mai." Thẻ "Tiếp tục" vẫn mở được để đọc lại / hỏi tiếp nếu còn câu. |
| Hết câu hỏi tiếp | Như mục 3.2 (C). Thông điệp khác với hết cuộc họp. |
| Mất mạng | "Chưa kết nối được. Câu hỏi của bạn vẫn còn đây, thử lại khi có mạng." + [Thử lại]. Không trừ lượt. |
| Tính năng tạm dừng | "Hội đồng đang tạm nghỉ để bảo trì." — không hiện nút Thử lại. |
| Người dẫn trong hội đồng của bạn bị gỡ/khóa | Thẻ hội đồng có dấu "Cần sửa: 1 người dẫn không còn dùng được" → mở trình tạo ở bước 1. Không tự thay người. |
| Khủng hoảng | Giữ như hiện nay: thẻ hỗ trợ với **115**, không chạy cuộc họp. |

### 3.4 Lưu hội đồng ở đâu

| Cách | Ưu | Nhược |
|---|---|---|
| Chỉ trên máy (như hiện nay) | Nhanh, không cần máy chủ | Mất khi đổi máy/cài lại; máy chủ không kiểm được; không có thống kê |
| **Trên tài khoản (máy chủ) + nhớ tạm trên máy** | Theo người dùng sang máy mới; máy chủ kiểm hợp lệ một chỗ; xóa tài khoản là xóa sạch; có thống kê ẩn danh | Cần một bảng mới và một lần chạy SQL (Owner duyệt) |

**Khuyến nghị: lưu trên tài khoản**, vì Hội đồng vốn đã bắt buộc đăng nhập (AI chạy trên máy chủ). Cụ thể:

- Mỗi người chỉ đọc/sửa được hội đồng của chính mình (khóa theo tài khoản ở tầng cơ sở dữ liệu).
- Khách không tạo hội đồng riêng (chỉ dùng thử hội đồng gợi ý sau khi đăng nhập).
- **Xóa tài khoản** → hội đồng xóa theo. **Xuất dữ liệu** → có danh sách hội đồng (tên, mục đích, giọng, người dẫn, ngày tạo).
- Hội đồng tự tạo hiện đang lưu trên máy: lần đầu mở bản mới, app hỏi "Lưu hội đồng 'X' vào tài khoản?" rồi chuyển lên; nếu người dùng từ chối, giữ trên máy như cũ.
- Biên bản cuộc họp: giữ cách lưu hiện có (trên máy + lịch sử phiên trên máy chủ), ghi thêm hội đồng nào đã họp.

### 3.5 Thay đổi giữa app và máy chủ (bản dễ hiểu)

- App gửi: **câu hỏi**, **lịch sử ngắn** của cuộc họp, và **"đang họp với hội đồng nào"** — dạng mã: hoặc "hội đồng gợi ý số X, phiên bản Y", hoặc "hội đồng của tôi số Z". Với hội đồng của bạn, máy chủ tự đọc danh sách người dẫn từ tài khoản.
- Máy chủ **tự kiểm**: người dẫn có tồn tại, đang mở, người dùng có quyền dùng (gói), số lượng 2–4. Sai → báo lỗi rõ ràng, không tự đổi người.
- Máy chủ **tự lấy hồ sơ người dẫn** (giọng, chủ đề, lời dặn) từ cơ sở dữ liệu. App **không bao giờ** gửi chữ để dặn AI.
- **Tên gọi người dùng** (biệt danh) đi trong phần "dữ liệu, không phải chỉ dẫn" (máy chủ đã hỗ trợ sẵn, app chỉ cần gửi). **Tên hội đồng không gửi cho AI** ở bản đầu (không cần cho chất lượng câu trả lời; tránh rủi ro chèn lệnh qua tên). Việc khối dữ liệu nào đi vào AI sẽ theo **đề xuất cấu hình ngữ cảnh** đang soạn song song.
- **Lượt dùng:** máy chủ xác định "mở cuộc họp hay hỏi tiếp" dựa trên **mã cuộc họp** do chính nó cấp, không dựa vào app nói lịch sử trống hay không.
- **Chi phí:** mỗi cuộc họp gọi AI một lần cho cả hội đồng; độ dài câu trả lời tăng theo số người dẫn. Hội đồng 4 người tốn khoảng **1,3–1,5 lần** hội đồng 3 người (ước tính, cần đo ở Admin sau khi chạy). Có giới hạn độ dài mỗi người dẫn để chặn trên. Số cuộc họp không đổi nên tổng chi phí tăng ít.

### 3.6 Phía Admin

- Màn **Hội đồng** (council-builder) trở thành nơi soạn **hội đồng gợi ý**: tên, mô tả, biểu tượng, mục đích, 2–4 người dẫn với vai trò, câu mở đầu gợi ý, trạng thái (Nháp → Đã duyệt → Đang hiện → Ẩn), thứ tự hiển thị. Giao diện tiếng Việt.
- **Xuất bản nguyên khối** (toàn bộ hoặc không gì cả) và kiểm xung đột phiên bản; trước khi hiện cho người dùng phải qua **cổng đánh giá** đã có ở A6.
- Mở khóa nút xuất bản chỉ sau khi app đã chuyển sang tải danh sách từ máy chủ (để tránh lỗi U8).
- **Thống kê hội đồng tự tạo — chỉ số tổng hợp**: số hội đồng đã tạo, phân bố 2/3/4 người, người dẫn được chọn nhiều nhất, tỷ lệ hội đồng sao chép từ gợi ý, số cuộc họp theo loại (gợi ý / của bạn). **Không** hiện tên hội đồng, câu hỏi hay danh sách theo từng người dùng; nhóm có dưới 10 người thì gộp vào "khác".
- Danh sách từ khóa cấm cho tên hội đồng quản lý ở Admin (mục 3.8).

### 3.7 Bộ hội đồng gợi ý mẫu (bản nháp để Owner xem)

Dùng người dẫn miễn phí là chính; mỗi bộ khác nhau rõ ràng. Nội dung cụ thể cần qua đánh giá trước khi hiện.

| Tên gợi ý | Mục đích | Người dẫn (mã) |
|---|---|---|
| Khi tim rối | Tình cảm | the-love-oracle, inner-child-healer, communication-mentor |
| Ngã rẽ sự nghiệp | Công việc | the-clear-strategist, strategic-thinker, confucius |
| Dừng vòng suy nghĩ | Nghĩ quá nhiều | calm-living-mentor, laozi, inner-child-healer |
| Quyết định lớn | Quyết định lớn | aristotle, the-clear-strategist, the-shadow-mirror |
| Nhìn sâu vào mình | Tự hiểu mình | the-mystic, the-shadow-mirror, the-star-weaver |
| Nhà và những người thân | Gia đình | communication-mentor, confucius, inner-child-healer |

### 3.8 An toàn

- **Câu hỏi người dùng:** giữ nguyên lọc khủng hoảng trên máy chủ và trên máy cho **mọi** câu (cả câu hỏi tiếp), dẫn tới thẻ **115**.
- **Tên hội đồng:** tối đa 40 ký tự, một dòng; lọc từ ngữ xúc phạm/thù ghét, nội dung tự hại (nếu dính → không lưu, hiện thẻ hỗ trợ nhẹ nhàng), tên mạo danh người thật hoặc tổ chức (danh sách ở Admin), đường link. Kiểm ở **cả** app (báo ngay) và máy chủ (quyết định cuối).
- **Không chữ tự do khác** ở bản đầu: mục đích, giọng, biểu tượng đều chọn từ danh sách.
- Người dẫn luôn kèm câu "AI lấy cảm hứng từ…, không phải người thật"; không cho đặt tên hội đồng kiểu "Hội đồng bác sĩ" / "Luật sư của tôi" (thêm vào danh sách cấm) để tránh hiểu nhầm là tư vấn chuyên môn.
- Nút báo cáo trên từng câu trả lời giữ nguyên.

### 3.9 Lộ trình

| Gói | Nội dung | Cỡ | Phụ thuộc / cần Owner |
|---|---|---|---|
| **0 — Sửa lỗi hiện có** | (a) Máy chủ dùng đúng người dẫn người dùng chọn, giữ đủ 4 (U1); (b) dùng lại một phiên cho cả cuộc họp (U4); (c) không trừ lượt khi trả lời dự phòng, hai thông điệp hết lượt, bộ đếm câu hỏi tiếp, nút đăng nhập (U5, U6); (d) chỉ gửi mã người dẫn + gửi biệt danh (U7, CO-03); (e) nút ≥48, nhãn TalkBack, thuật ngữ (U9, U10, U12, U15); (f) ẩn chủ đề nháp, soạn lại 4 bộ gợi ý với người dẫn khác nhau (U2); (g) biên bản có tổng hợp + tiêu đề có ngày, xuất dữ liệu có hội đồng riêng (U13, U14) | S–M | Deploy lại Edge Function `ai-council` (Owner duyệt); bản Android mới |
| **1 — Nhiều hội đồng (MVP)** | Thư viện (A), trang giới thiệu (B), trình tạo 3 bước (D), sao chép/sửa/xóa/ghim, tối đa 10; bảng hội đồng trên tài khoản + chuyển hội đồng cũ lên; máy chủ nhận "hội đồng nào" và tự kiểm; lọc tên; xóa tài khoản và xuất dữ liệu | M–L | Gói 0 (a, d); một migration SQL mới (Owner duyệt); deploy `ai-council`; kiểm thử máy thật (TalkBack, chữ lớn) |
| **2 — Admin quản lý hội đồng gợi ý** | App tải danh sách gợi ý từ máy chủ; Admin soạn tiếng Việt, xuất bản nguyên khối, qua cổng đánh giá A6; thống kê tổng hợp; danh sách từ cấm | M | Gói 1; migration + thủ tục xuất bản (Owner duyệt); AI-09, AD-21 |
| **3 — Hoàn thiện** | Chia sẻ biên bản dạng văn bản; gợi ý hội đồng phù hợp từ câu hỏi; giới hạn khác cho gói trả phí (nếu Owner muốn) | S–M | Gói 1; quyết định Q4, Q8 |

Có thể phát hành Android với Gói 0 trước; Gói 1 không chặn việc lên Google Play.

---

## 4. Những gì đã và chưa kiểm chứng

**Đã kiểm chứng (đọc trực tiếp trong mã hoặc có trong ghi chép thử máy):** chỉ một ô lưu hội đồng tự tạo; 4 chủ đề dùng cùng 3 người dẫn; chủ đề nháp vẫn hiện; kích thước các nút; nút đóng không nhãn; chữ "AI Council/Council/guide"; thông điệp hết lượt giống nhau; khách bị chặn ở bước gửi với thông báo không có nút; app gửi cả hồ sơ người dẫn và chưa gửi biệt danh; biên bản không có tổng hợp; xuất dữ liệu thiếu hội đồng riêng; app ghim phiên bản cấu hình; Admin khóa xuất bản Hội đồng; lọc khủng hoảng và số 115 (có kiểm thử tự động); câu trả lời dự phòng khi chế độ máy bay (thử máy 11/11).

**Suy luận, cần thử máy để chắc:** máy chủ bỏ qua lựa chọn người dẫn của người dùng (U1) — phụ thuộc cơ sở dữ liệu staging có cấu hình đang hoạt động khớp phiên bản app ghim; lịch sử bị trùng do mỗi lượt tạo phiên mới (U4); bị trừ lượt khi AI trả lời lỗi định dạng (U5); bố cục vỡ khi chữ 150–200% (U11); trải nghiệm TalkBack thực tế; trường hợp hết lượt Hội đồng (chưa thử máy theo PLAN).

**Cách thử nhanh U1 trên máy thật (gợi ý cho đợt thử máy tới):** đăng nhập → mở Hội đồng → Tự chọn người dẫn → chọn Phù thủy + Đứa trẻ bên trong + Người tiên tri tình yêu + Người dệt sao → hỏi một câu. Nếu câu trả lời đến từ Lão Tử/Aristotle hoặc chỉ có 3 người → U1 xác nhận.

---

## 5. Câu hỏi cho Owner (mỗi câu có khuyến nghị)

| # | Câu hỏi | Khuyến nghị |
|---|---|---|
| Q1 | Làm **Gói 0** (sửa lỗi hiện có) trước khi làm nhiều hội đồng? | **Có.** Lỗi U1 làm hội đồng tự chọn gần như vô nghĩa; sửa trước thì Gói 1 mới đáng tin. |
| Q2 | Mỗi người được tạo tối đa bao nhiêu hội đồng? | **10.** Đủ cho nhu cầu thật, dễ hiển thị, dễ kiểm soát. |
| Q3 | Lưu hội đồng trên tài khoản (cần một bảng mới, Owner duyệt chạy SQL) hay chỉ trên máy? | **Trên tài khoản**, vì Hội đồng đã bắt buộc đăng nhập; không mất khi đổi máy; xóa/xuất dữ liệu đầy đủ. |
| Q4 | Người dùng miễn phí có được đưa người dẫn trả phí vào hội đồng riêng? | **Không** — thấy nhưng có nhãn khóa. Hội đồng gợi ý của Nilaza thì được dùng người dẫn trả phí để giới thiệu (nếu Owner muốn giữ cho gói trả phí hoàn toàn thì bỏ khỏi gợi ý). |
| Q5 | Lượt dùng có tăng khi có nhiều hội đồng? | **Không đổi**: 1 cuộc họp/ngày + 4 câu hỏi tiếp cho cả tài khoản. Chỉnh sau ở Admin nếu cần. |
| Q6 | Có gửi **tên hội đồng** cho AI không? | **Không** ở bản đầu. Gửi **tên gọi người dùng** thì có (đã có sẵn ở máy chủ). |
| Q7 | Cho số người dẫn mỗi hội đồng là 2–4 như hiện nay? | **Có, 2–4.** Hơn 4 câu trả lời quá dài và tốn chi phí. |
| Q8 | Có làm **chia sẻ biên bản** không? | **Có, ở Gói 3**, chỉ dạng văn bản người dùng tự gửi đi; không tạo liên kết công khai. |
| Q9 | Bộ 6 hội đồng gợi ý ở mục 3.7 có ổn làm điểm khởi đầu? | **Có**, Owner chỉnh tên cho hợp giọng Nilaza; nội dung phải qua đánh giá trước khi hiện. |

---

## Phụ lục A — Chi tiết kỹ thuật theo phát hiện

Đường dẫn tính từ gốc repo, số dòng theo cb32621.

- **U1.** `supabase/functions/ai-council/index.ts` `runtimePersonasFromTemplate` (L307–336): khi `readPublishedCouncilConfig` (L250–305, lọc `.eq("version", input.councilVersion)` và `status = active`) trả về template có roster, máy chủ tra persona theo slug của roster, **bỏ qua** `selectedPersonas` của app; chỉ khi tìm < 2 persona mới quay về dữ liệu app gửi. L426 `maxGuides = clamp(template.maxGuides, 2, 4)` → app gửi 4 bị cắt về số của template (3). Phía app: `toggleGuest` (`useAiCouncilRoom.ts` L587–609) tạo danh sách tự chọn nhưng `buildCouncilTemplatePayload` (L172–189) vẫn gửi `templateId` của template đang chọn. Seed `supabase/seed.generated.sql` L595–599 có cấu hình active khớp `configVersion` bundled → điều kiện xảy ra là thật trên môi trường được seed.
- **U2.** `packages/agent-config/ai-council.json`: 4 template, roster đều `communication-mentor, laozi, aristotle`; `overthinking`, `big_decision` = `draft_review`. `useAiCouncilRoom.ts` L462 chỉ lọc `disabled`.
- **U3.** Khóa lưu `nilaza.aiCouncilCustom.v1` (L39–41), id cố định `"local-custom-council"` (L829); `selectTemplate` (L611–626) đặt `customCouncil = null`; `saveCustomCouncil` (L821–847) ghi đè. Bảng phủ `AiCouncilRoom.tsx` L272–383 (footer "Lưu hội đồng" và "Xong").
- **U4.** `index.ts` L507–528 insert `chat_sessions` mỗi request; app L739–741 `setActiveSessionId(result.remoteSessionId)`.
- **U5.** Thông điệp: `useAiCouncilRoom.ts` L758–768 (chung cho `daily_council_limit` và `daily_followup_limit`). Trừ lượt: `index.ts` L487 parse thất bại → `fallbackTurns` nhưng L572–591 vẫn insert `usage_events`. `isOpening` (L406) dựa trên lịch sử do app gửi: một app sửa đổi có thể gửi lịch sử giả để lượt mở được tính là câu hỏi tiếp (vẫn bị chặn bởi tổng số lượt, nhưng sai ngữ nghĩa) → nên chuyển sang dựa trên `meetingId` do máy chủ cấp (Phụ lục B). `councilAllowance` ở `supabase/functions/_shared/account-tier-policy.ts` L42–52.
- **U6.** `index.ts` L391 trả 401 `sign_in_required`; app hiện chữ, không có hành động.
- **U7.** App L636–788 gửi `selectedPersonas: councilPersonas` (đối tượng persona đầy đủ), `userContext: { goals, tone }` — thiếu `nickname`. Máy chủ đã nhận `userContext.nickname` (L53–54) và có `userDataValues`/`userDataBlock`, `sanitizeNickname` trong `_shared/ai-user-context.ts`.
- **U8.** App pin `councilVersion` bundled; `admin-ai-council-config/index.ts` chèn version mới và archive version active cũ không nguyên tử; Admin `apps/admin/app.js` L1273 `councilPublishBlockedReason`, L1325 action `councilBlocked`. Backlog AI-09.
- **U9–U10, U15.** `AiCouncilRoom.tsx`: `topicChip minHeight: 40` (L542); chip giọng/chủ đề L301–339 không `minHeight`; footer 38; "Lưu biên bản" 36 (L879–890); `bubbleAction` 34 (L900–908); nút đóng L284–286 thiếu `accessibilityLabel`; nhãn `fontWeight: "900"` (L650–655), chữ 10–12px. Theme có `layout.minimumTouchTarget = 48` (`apps/mobile/src/a2ui/theme.ts` L55).
- **U12.** `AiCouncilRoom.tsx` L164–168; `App.tsx` L6087–6091, L6551–6610 (HomeCouncilCard), L2105–2154 (Oracle handoff "three-view council"); `features/chat/ChatHub.tsx` L114–124; `index.ts` L610–613; "Bước" trong `buildCouncilReply` L191–217.
- **U13.** `saveTranscript` L790–819. **U14.** `features/privacy/localExport.ts` L5–14. **U16.** `App.tsx` L5639–5640, L6765–6870. **U17.** `AiCouncilRoom.tsx` L486–491.

## Phụ lục B — Hợp đồng app ↔ máy chủ đề xuất

Bản mới của `packages/agent-config/council-contract.json` (tăng `version`, sinh lại `_shared/council-contract.ts` bằng `npm run council:contract:generate`; giữ tương thích bản app cũ trong một chu kỳ).

```jsonc
// Yêu cầu (app → ai-council)
{
  "contractVersion": "2026-12-council-ref-v3",
  "council": {
    "kind": "preset",            // hoặc "custom"
    "id": "career_crossroads",   // preset: template key; custom: uuid trong user_councils
    "version": "2026-12-01-01"   // chỉ với preset; máy chủ chấp nhận bản active hoặc bản cũ còn trong cửa sổ hỗ trợ
  },
  "meetingId": null,             // null = mở cuộc họp; có giá trị = câu hỏi tiếp (máy chủ cấp)
  "message": "…",
  "history": [ /* ≤12 lượt × 800 ký tự, như boundCouncilHistory */ ],
  "userContext": { "nickname": "…", "tone": "practical", "goals": [] }
}
// Không còn: selectedPersonas, guideRoles, templatePayload, maxGuidesPerTurn.
```

```jsonc
// Phản hồi
{
  "meetingId": "uuid",                 // ổn định suốt cuộc họp
  "turns": [ { "personaId": "…", "text": "…" } ],
  "synthesis": { … },
  "quota": { "meetingsLeftToday": 0, "followUpsLeft": 3 },
  "fallback": false                    // true → không trừ lượt
}
```

**Kiểm tra phía máy chủ:**

1. `council.kind = "custom"` → đọc `user_councils` theo `id` và `user_id = auth.uid()`; không thấy → 404 `council_not_found`.
2. Danh sách persona: tồn tại, `active`, người dùng đủ quyền theo gói (`canUsePersona` logic chuyển lên máy chủ), số lượng 2–4, không trùng → nếu sai: 422 `council_invalid_members` kèm mã persona lỗi để app hiện "Cần sửa".
3. Hồ sơ persona (tên hiển thị, giọng, chủ đề, prompt) đọc từ DB; giới hạn ~1.500 ký tự/người như registry ở `ADMIN_SCREENS_SPEC_2026-11-04.vi.md` mục 3.9.
4. `meetingId = null` → lượt mở (kiểm `councilAllowance`), tạo `chat_sessions` một lần; có `meetingId` → kiểm phiên thuộc người dùng, kiểm số câu hỏi tiếp trong **phiên đó**.
5. Parse thất bại → trả `fallback: true`, **không** insert `usage_events`.
6. Tên hội đồng **không** đưa vào prompt. Khối dữ liệu đi vào mô hình theo đề xuất cấu hình ngữ cảnh.

## Phụ lục C — Bảng dữ liệu đề xuất

```sql
-- Bản phác, cần Owner duyệt trước khi tạo migration.
create table public.user_councils (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  icon_key text not null,               -- trong bộ biểu tượng cố định
  purpose_key text not null,            -- trong danh sách mục đích cố định
  tone text not null,                   -- trong ALLOWED_TONES
  persona_slugs text[] not null check (array_length(persona_slugs, 1) between 2 and 4),
  source_template_key text,             -- nếu sao chép từ gợi ý
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_councils enable row level security;
create policy user_councils_owner_all on public.user_councils
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Giới hạn 10/người: trigger before insert hoặc kiểm trong Edge Function ghi.
-- chat_sessions: thêm cột user_council_id uuid null references user_councils(id) on delete set null.
```

- Ghi/sửa qua Edge Function (hoặc RPC `security definer`) để lọc tên và kiểm persona ở một chỗ; RLS vẫn là hàng rào cuối.
- Thống kê Admin: view tổng hợp chỉ trả số đếm theo `persona_slug`, `array_length`, `purpose_key`, với ngưỡng k ≥ 10; không có policy cho staff đọc từng dòng.
- Xóa tài khoản: `on delete cascade`. Xuất dữ liệu: thêm `user_councils` vào bản xuất máy chủ và khóa cache trên máy vào `localExport.ts`.
- Cache trên máy: khóa account-namespaced mới (ví dụ `nilaza.councils.v2`), thay `nilaza.aiCouncilCustom.v1` sau khi chuyển.

## Phụ lục D — Tác động đến mã (ước lượng cho người làm)

- App: thư viện + trình tạo (màn mới trong `apps/mobile/src/features/council/`), tách hook `useAiCouncilRoom.ts` (910 dòng) thành phần dữ liệu hội đồng và phần phòng họp; bỏ bảng phủ gather; xóa `CouncilHub` chết trong `App.tsx`; cập nhật 11 kiểm thử hiện có và thêm kiểm thử cho tạo/sửa/xóa/giới hạn/khách/lọc tên.
- Máy chủ: `ai-council/index.ts` (hợp đồng mới, phiên ổn định, không trừ lượt khi dự phòng); Edge Function mới hoặc RPC cho CRUD `user_councils`; mở rộng `council-prompt.ts` không cần đổi luật khóa.
- Admin: council-builder tiếng Việt, xuất bản nguyên khối (RPC), thống kê tổng hợp.
- Quy trình repo: hồ sơ `docs/feature-plans/<tên>.json` + `npm run feature:preflight` trước khi sửa; `npm run council:contract:check` sau khi đổi hợp đồng; cập nhật `PLAN.md` và backlog (CO-03, AI-09, AD-21, CH-12) trong cùng PR.
