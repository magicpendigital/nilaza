# Chiêm tinh — khởi động, đánh giá UX/UI và luồng Admin (14/11/2026)

> Tài liệu đề xuất, chưa sửa mã. Căn cứ: đọc mã trên `origin/main` tại `cb32621`.
> **Chưa** chạy app trên máy hay giả lập, **chưa** truy vấn cơ sở dữ liệu Singapore, **chưa** mở Admin staging.
> Mọi chỗ ghi "chưa kiểm" cần được xác nhận trước khi coi là sự thật.
>
> Hai việc đang có agent khác làm, tài liệu này chỉ coi là **phụ thuộc** và không đề xuất làm lại:
> (1) bộ chạy thử và chấm điểm (eval adapter) cho Đọc sâu Chiêm tinh, kèm việc đổi ngân sách chạy thử thành 1 USD/tháng;
> (2) cấu hình ngữ cảnh gửi cho model theo từng tính năng AI.

---

## 1. Tóm tắt cho Owner

**Phần tính toán và nội dung Chiêm tinh trên app đã chạy được.** Người dùng nhập ngày giờ nơi sinh, xem bánh xe 12 cung, Big 3, 12 nhà, các góc chiếu, thần thoại, so hợp đôi và lịch trăng. Tất cả được tính ngay trên điện thoại. Không có công tắc nào đang giấu Chiêm tinh.

**Phần "Đọc sâu với AI" rất có thể chưa chạy được cho người dùng thật.** Có bốn lý do:

1. **Máy chủ có thể thiếu hai thứ** (cần Owner kiểm và duyệt):
   - tuyến model đúng định dạng câu trả lời mới;
   - cặp prompt VI + EN đang hoạt động.
   
   Hai thứ này hiện chỉ có trong dữ liệu mẫu ở máy dev, không có trong các bản cập nhật cơ sở dữ liệu. Nếu thiếu, app báo "AI chưa sẵn sàng".
2. **Khách chưa đăng nhập bấm "Mở khóa" thì không có gì xảy ra.** Màn hình còn ghi "Có trong Premium · Sắp ra mắt". Thực tế mọi tài khoản đã đăng nhập đều là Premium, nên câu đúng phải là "Đăng nhập để dùng, 1 lượt/ngày".
3. **Có lỗi tính sai lá số khi gõ giờ kiểu 24 giờ.** Ví dụ gõ "15" giờ khi đang chọn "Sáng" sẽ ra 03:xx. Lá số sai thì cung Mọc sai, và mọi diễn giải phía sau đều sai.
4. **Câu báo khủng hoảng trong Chiêm tinh không có số 115.** Câu hiện tại chỉ ghi "dịch vụ khẩn cấp tại địa phương", trái quy tắc an toàn của Nilaza.

**Về Admin:**
- Prompt Chiêm tinh hiện chỉ sửa được ở một trình soạn cũ.
  - Bản nháp chỉ nằm trong trình duyệt.
  - Không có so sánh, không khôi phục được bản trước.
  - Bản phát hành không đi qua cổng kiểm tra.
- Trang "Prompt & phiên bản" mới thì có đủ các thứ đó, nhưng luôn chặn phát hành Chiêm tinh vì chưa có bộ chạy thử. Bộ này đang được agent khác làm.
- Một tính năng đang mang ba tên kỹ thuật khác nhau, nên Owner khó biết mình đang sửa đúng chỗ hay không.
- Nội dung Chiêm tinh (Big 3, 12 nhà, hợp đôi, thần thoại, từ điển) **hoàn toàn không sửa được trong Admin**.

**Đề xuất 4 giai đoạn:**

| Giai đoạn | Việc | Quy mô |
|---|---|---|
| **P0 — Khởi động** | Kiểm và bật tuyến + prompt trên máy chủ (Owner duyệt); sửa 4 lỗi app ở trên; tắt hàm "Astrology report" cũ | S–M |
| **P1 — Gọn trải nghiệm** | Gom một tên "Đọc sâu"; trang kết quả gọn hơn; bỏ chữ kỹ thuật; chạm 48dp; chữ lớn | M |
| **P2 — Admin một đường** | Một thẻ "Chiêm tinh · Đọc sâu"; prompt phát hành qua cổng, có xem trước và khôi phục; gỡ trình soạn cũ | M–L, chờ bộ chạy thử |
| **P3 — Nội dung vào Admin** | Mục "Nội dung › Chiêm tinh"; duyệt biên tập phần thần thoại | L |

Có **9 câu hỏi cần Owner quyết định** (mục 6). Mỗi câu kèm phương án khuyến nghị.

---

## 2. Danh sách việc để "khởi động" Chiêm tinh

Phân loại:
- **[Mã]**: cần sửa code.
- **[Nội dung]**: cần viết hoặc duyệt nội dung.
- **[Owner duyệt]**: chạy SQL, deploy hàm, đọc hoặc đặt bí mật.
- **[Quyết định]**: Owner chọn hướng.

### 2.1 Chặn trực tiếp tính năng AI (phải xong trước khi coi là "đã bật")

- [ ] **K1 [Owner duyệt]** Kiểm trên Singapore xem đã có **tuyến model `astrology_report` đang hoạt động, đúng định dạng `astrology_ai_insight_v1`** chưa.
  - Hàm Đọc sâu đòi đúng định dạng này: `supabase/functions/ai-astrology-insight/index.ts:236-239`. Thiếu thì trả `route_not_ready`.
  - Mặc định trong mã vẫn là định dạng cũ `astrology_report_v1`: `supabase/functions/_shared/model-router.ts:132-146`.
  - Dòng đúng chỉ có trong dữ liệu mẫu ở máy dev: `supabase/seed.generated.sql:608`, `supabase/config.toml:87`.
  - Cảnh báo về chỗ thiếu này chỉ hiện ở trình soạn cũ: `apps/admin/app.js:2068`.
  - Bước làm: một câu truy vấn chỉ đọc (Owner duyệt). Nếu thiếu thì lưu tuyến qua trang "Nhà cung cấp & Model" với định dạng `astrology_ai_insight_v1`. Trang này đã ghi đúng định dạng ở `apps/admin/model-providers.js:32`.
- [ ] **K2 [Owner duyệt]** Kiểm xem đã có **cặp prompt VI + EN đang hoạt động** cho `astrology_report` chưa.
  - Hàm đọc prompt ở `ai-astrology-insight/index.ts:240-252`. Thiếu một ngôn ngữ thì trả `prompt_not_ready`.
  - Cặp `2026-09-25-ai-insight-v1` chỉ có ở `supabase/seed.generated.sql:138-143`, không nằm trong bản cập nhật cơ sở dữ liệu nào.
  - Hiện tại chỉ phát hành được qua trình soạn cũ (mục 4).
- [ ] **K3 [Owner duyệt — chỉ xác nhận, không đọc giá trị]** Biến môi trường `AI_TRACE_ENVIRONMENT` của hàm phải là `staging`, `production` hoặc `live`, nếu không hàm trả 503 (`ai-astrology-insight/index.ts:161-164`). Owner chỉ cần xác nhận "đã đặt", không cần gửi giá trị.
- [ ] **K4 [Mã]** Khách chưa đăng nhập thấy "Có trong Premium" và "Sắp ra mắt", còn nút "Mở khóa" thì không làm gì.
  - Nguồn của hai dòng chữ: `AiDeepRead.tsx:68-77, 93`. Chính sách đặt khách = free, đã đăng nhập = Premium: `accountTierPolicy.ts:29-43`.
  - Đường đi của nút: `AstrologyAiGuidePanel` → `ChartStory.requestUnlock` (`AstrologyChartStory.tsx:577-578`) → `beginAiQuestion` (`AstrologyExperience.tsx:569-584`). Hàm này đặt lại trạng thái "khóa" mà không báo gì.
  - Sửa: khi chưa đăng nhập thì nút ghi "Đăng nhập để dùng Đọc sâu · 1 lượt/ngày" và mở màn đăng nhập.
- [ ] **K5 [Mã]** Câu báo khủng hoảng không có 115: `AstrologyExperience.tsx:646`. Thay bằng câu chuẩn có **115** đang dùng ở các tính năng khác.
- [ ] **K6 [Mã]** Ô giờ sinh tính sai khi gõ 13–23: `BirthFields.tsx:16-20` (`Number(hour) % 12 + (afternoon ? 12 : 0)`). Phút như "75" không bị chặn. Xem chi tiết ở U3.
- [ ] **K7 [Mã]** Nút "Đọc đầy đủ" mở sai thẻ. Nó dẫn về `setStage("chart")` (`AstrologyExperience.tsx:1360`), mà `AstrologyChartStory` mặc định mở thẻ "story" (`:241, :260`) thay vì thẻ "guide", nơi có câu trả lời AI.

### 2.2 Dọn đường cũ (nên làm cùng P0)

- [ ] **K8 [Owner duyệt + Mã]** Tắt rồi gỡ hàm **`ai-astrology-report`**. Owner đã quyết định gộp vào Đọc sâu từ 04/11 (PLAN.md; `ADMIN_SCREENS_SPEC_2026-11-04.vi.md:169`).
  - App không còn đường nào gọi hàm này. Nơi gọi duy nhất là `generateAstrologyPreview` (`App.tsx:4362-4425`), mà hàm này không được gọi ở đâu.
  - Hàm cũ vẫn còn nguy cơ:
    - gửi **nguyên ngày, giờ, nơi sinh và tọa độ** cho model;
    - không hỏi đồng ý;
    - prompt viết cứng trong mã, giới hạn 3 lượt/ngày;
    - ghi vào `birth_profiles`.
    
    Bằng chứng: `ai-astrology-report/index.ts:394-407, 449-451, 491-506, 537-549`.
  - Thứ tự: tắt công tắc `astrology_report` → gỡ hàm (Owner duyệt) → xóa mã hàm, `generateAstrologyReport` (`backendClient.ts:670-677`), dòng công tắc (`apps/admin/feature-switches.js:12`) và dòng "đang gỡ" (`apps/admin/ai-features.js:21`).
- [ ] **K9 [Mã — phụ thuộc agent khác]** Cổng phát hành chặn mọi prompt hay cấu hình Chiêm tinh với lỗi `NZE06` (`supabase/migrations/20261113110000_ai_eval_release_gate.sql:676`) cho tới khi có bộ chạy thử. **Agent khác đang làm**, ở đây chỉ chờ.

### 2.3 Đã ổn (đã đọc mã, chưa thử trên máy)

- Giới hạn **1 lượt/ngày theo giờ Việt Nam**, kèm 2 lần lỗi không tính: `ai-astrology-insight/index.ts:26, 213-234`; `account-tier-policy.json` (`dailyLimit 1`, `dayOffsetMinutes 420`).
- Công tắc: mặc định bật, thiếu dòng thì coi là bật (`20261031100000:7,17`; `_shared/feature-switch.ts:15-26`). Đúng với "tất cả ON trên prod".
- Hỏi đồng ý gửi dữ liệu cho AI: có (`astrology-ai-insight.ts:116, 155-156`; `AstrologyChartStory.tsx:1257`; `AstrologyExperience.tsx:586`).
- Đọc sâu **không** gửi ngày, giờ, nơi sinh. Chỉ gửi các "dữ kiện" đã tính sẵn. Câu trả lời bị kiểm `evidenceFactIds` (`AstrologyExperience.tsx:617-625`).
- 10 tệp nội dung `packages/content/astrology-*.json` không thiếu chữ VI/EN nào, không có chuỗi rỗng.

### 2.4 Nội dung và quyết định (không chặn bật AI, nhưng chặn "khởi động nội dung đầy đủ")

- [ ] **K10 [Nội dung]** Trạng thái duyệt nội dung chưa đồng đều:
  - `astrology-mythology-chapters` đang ở `prototype_for_editorial_review`;
  - `astrology-visual-system` ở `device_review_candidate`;
  - `astrology-chart-fixtures` là `internal`;
  - `mythology-depth`, `zodiac-guides` và `strategy` **không có trạng thái**;
  - big3, moon-houses, topic-placements và synastry đã duyệt ngày 31/10.
  
  Cần một vòng duyệt biên tập phần thần thoại trước khi quảng bá.
- [ ] **K11 [Nội dung + Mã]** Có phần diễn giải **không nằm trong tệp nội dung** mà viết cứng trong mã:
  - Mặt Trời, Sao Thủy, Sao Mộc và các hành tinh xa trong cung;
  - 12 nhà;
  - các góc chiếu;
  - toàn bộ từ điển.
  
  Bằng chứng: `apps/mobile/src/features/astrology/interpretation.ts:5-33`, `AstrologyGlossary.tsx:5-54+`. Phần này nằm ngoài quy trình kiểm nội dung và Admin không sửa được.
- [ ] **K12 [Quyết định]** Dữ liệu ngày sinh trong Hồ sơ **được đồng bộ lên máy chủ** và dùng cho "Nhịp hoàng đạo hằng ngày". Trong khi đó màn Chiêm tinh ghi "Dữ liệu lưu trên thiết bị này, chưa đồng bộ cloud". Xem U9 và câu hỏi Q4.
- [ ] **K13 [Quyết định]** Dòng "chưa chứng nhận độc lập" ở phần AI (`AstrologyChartStory.tsx:267, 1042-1045, 1243`; `astrologyAiInsight.ts:108, 224`): giữ nguyên, rút gọn hay bỏ (Q8).

---

## 3. Đánh giá UX/UI trên app

Hành trình đã xem: mở lần đầu → nhập ngày sinh → xác nhận → lá số → diễn giải → Đọc sâu AI → lưu, chia sẻ.

Mức độ:
- **Cao**: sai kết quả, an toàn, hoặc nút chết.
- **Vừa**: gây rối hoặc mất thời gian.
- **Thấp**: chỉ là đánh bóng.

### Mức Cao

**U1. Nút "Mở khóa" chết và chữ "Premium · Sắp ra mắt" với khách** (= K4)
- Bằng chứng:
  - `AiDeepRead.tsx:68-77, 93`
  - `App.tsx:5991-5992` (`canRequestAstrologyAi` đòi đăng nhập)
  - `AstrologyExperience.tsx:569-584`
  - Chữ trong khung Người dẫn đường: `AstrologyAiGuidePanel.tsx:148-159` ("NGƯỜI DẪN ĐƯỜNG AI · PREMIUM", "Mở khóa Người dẫn đường AI").
  - Chữ dự phòng: `AstrologyChartStory.tsx:1030-1054` ("Premium đang được hoàn thiện · chưa có giao dịch", "Xem trạng thái phát triển AI").
- Ảnh hưởng:
  - Khách nghĩ tính năng phải trả tiền và chưa có, trong khi thật ra chỉ cần đăng nhập.
  - Nút bấm không phản hồi làm giảm niềm tin.
  - Đây là lỗi lặp lại của mục AS-01 (đã đánh dấu xong) cho riêng nhóm khách.
- Sửa:
  - Ba trạng thái rõ ràng: *Chưa đăng nhập* → "Đăng nhập để dùng · 1 lượt/ngày"; *Còn lượt* → "Viết bài đọc sâu"; *Hết lượt* → "Đã dùng lượt hôm nay · có lượt mới sau 0:00 (giờ Việt Nam)".
  - Bỏ chữ "Premium" và "Sắp ra mắt" khi `premiumOnSale=false`.

**U2. Câu báo khủng hoảng thiếu 115** (= K5)
- Bằng chứng: `AstrologyExperience.tsx:646`. Bảng thông báo lỗi nằm ở `:636-647`.
- Ảnh hưởng: vi phạm quy tắc an toàn. Người đang gặp nguy không có số cụ thể để gọi.
- Sửa: dùng chung câu khủng hoảng chuẩn có 115, không viết riêng cho Chiêm tinh. Thêm kiểm thử.

**U3. Giờ sinh 12h/24h dễ cho ra lá số sai** (= K6)
- Bằng chứng:
  - `BirthFields.tsx:16-20` dùng phép tính `% 12`, nên gõ 15 khi đang chọn "Sáng" thành 03.
  - Phút chỉ kiểm "là số, tối đa 2 chữ số".
  - Lịch chọn của hệ điều hành dùng 24h, trong khi ô gõ dùng 12h.
  - Chữ báo lỗi trái với giao diện: "Dùng HH:mm, hệ 24 giờ" (`AstrologyExperience.tsx:106-108`) và "Dùng YYYY-MM-DD" (`:102-104`), trong khi màn hình có ô ngày/tháng/năm riêng.
  - Nút chọn giờ dùng biểu tượng lịch (`BirthFields.tsx:36, 120`).
  - Nút Sáng/Chiều cao 44 (`:138`).
  - Kiểm thử `BirthFields.test.ts` không có ca 13–23.
- Ảnh hưởng: người Việt quen viết 24h. Sai giờ thì sai cung Mọc và sai nhà, tức sai toàn bộ diễn giải. Người dùng không phát hiện được.
- Sửa:
  - Dùng **một ô giờ 24h** (00–23) và một ô phút (00–59), bỏ Sáng/Chiều. Nếu muốn giữ Sáng/Chiều thì gõ 13–23 phải tự chuyển sang Chiều.
  - Chặn phút > 59.
  - Viết lại chữ báo lỗi theo đúng ô trên màn hình.
  - Biểu tượng đồng hồ cho nút chọn giờ.
  - Thêm kiểm thử 13–23 và 60–99.

**U4. Đọc sâu có thể báo "chưa sẵn sàng" với mọi người** (= K1, K2)
- Ảnh hưởng: tính năng được quảng bá trong bản Play đầu nhưng không trả lời được. Mỗi lần thử còn tốn một lượt chờ 60 giây.
- Sửa: làm K1–K3. Thêm câu báo thân thiện cho `route_not_ready` và `prompt_not_ready`, ví dụ "Đọc sâu đang bảo trì, lượt của bạn chưa bị trừ". Theo mã (`ai-astrology-insight/index.ts:222-234`), chỉ bài đọc đã giao mới trừ lượt; lần lỗi được tính vào giới hạn thử (1 + 2 lần lỗi). Cần thử thật để xác nhận.

### Mức Vừa

**U5. Hai lối vào AI, nhiều tên gọi, dùng chung 1 lượt/ngày**
- Bằng chứng:
  - Lối 1 là thẻ "Đọc sâu với AI" trên trang kết quả, dùng câu hỏi soạn sẵn (`AstrologyExperience.tsx:1350-1361`).
  - Lối 2 là thẻ "Người dẫn đường AI" trong lá số, cho câu hỏi tự do.
  - Còn có các tên "AI Chiêm tinh" và "Người dẫn đường", trùng với "Người dẫn" (persona).
  - Hộp đồng ý ghi "Đồng ý và gửi một câu hỏi" (`:1612`) ngay cả khi đi từ Đọc sâu, nơi người dùng không đặt câu hỏi.
- Ảnh hưởng: người dùng không hiểu hai lối khác nhau thế nào. Dùng một lối là mất lối kia, không có báo trước.
- Sửa:
  - Một tên duy nhất **"Đọc sâu"**.
  - Một lối chính: hai lựa chọn "Đọc tổng quan" và "Hỏi một điều cụ thể" trong cùng một khung, ghi rõ "1 lượt/ngày cho cả hai".
  - Chữ hộp đồng ý theo đúng hành động.

**U6. "Đọc đầy đủ" mở sai thẻ** (= K7)
- Sửa: truyền `initialTab="guide"` khi đi từ thẻ Đọc sâu.

**U7. Trang kết quả quá dày, nút Lưu ở cuối**
- Bằng chứng: trang `AstrologyExperience.tsx:1315-1580` xếp theo thứ tự:
  1. tiêu đề và múi giờ
  2. thẻ Big 3 cùng phần tóm tắt Big 3
  3. thẻ bầu trời
  4. liên kết lá số
  5. Đọc sâu
  6. **3 thẻ lặp lại Mặt Trời/Mặt Trăng/Mọc** (lần thứ ba)
  7. đoạn văn dài
  8. **Lưu** (`:1480-1495`)
  9. Nhật ký và Trò chuyện
  10. cảnh báo trước 1970 và Sửa
  11. "Độ tin cậy & phương pháp" kèm "Astronomy Engine 2.1.19 (MIT)… NASA/JPL 0,0051°" (`:1543`)
  12. phiên bản tính toán, tzdata (`:1550-1562`)
- Ảnh hưởng: phải cuộn rất xa mới tới nút Lưu. Big 3 lặp ba lần làm loãng. Thông tin kỹ thuật chiếm chỗ.
- Sửa:
  - Thứ tự đề xuất: Big 3 (một lần) → Đọc sâu → Lưu/Chia sẻ đặt cạnh tiêu đề hoặc cố định ở đáy → "Khám phá thêm" (lá số, chủ đề, thần thoại) → Nhật ký/Trò chuyện.
  - Gộp "Độ tin cậy & phương pháp" và các số phiên bản vào một mục **thu gọn** "Cách Nilaza tính".

**U8. Chữ kỹ thuật lộ ra người dùng**
- Bằng chứng:
  - Màn xác nhận hiện múi giờ IANA, "lệch giờ quốc tế", "Khoảng UTC: … → …" và "UTC: …" (`:1291`), cùng "Hoàng đạo nhiệt đới · hệ nhà Whole Sign" (`:1296`). AS-04 đã đánh dấu xong nhưng UTC vẫn hiện.
  - Cài đặt "múi giờ hiển thị" là ô gõ IANA tự do (`:980`).
  - Từ điển `:134` ("Whole Sign…").
- Sửa: màn xác nhận chỉ cần "Sinh lúc 15:30 ngày 12/3/1995 tại Hà Nội (giờ Việt Nam)". Phần UTC, IANA và hệ nhà đưa vào mục thu gọn. Múi giờ hiển thị đổi thành danh sách chọn có ô tìm kiếm.

**U9. Lời hứa riêng tư chưa khớp thực tế**
- Bằng chứng:
  - App ghi "Dữ liệu lưu trên thiết bị này, chưa đồng bộ cloud" (`:1006-1010`) và "Ngày, giờ và nơi sinh không được gửi cho AI Chiêm tinh" (`:960-964`). Câu sau đúng với Đọc sâu.
  - Nhưng ngày sinh trong **Hồ sơ** được đồng bộ lên `birth_profiles`: `App.tsx:3462-3483, 4215-4224` → `profile-upsert/index.ts:94-102`.
  - Nó cũng được gửi cho "Nhịp hoàng đạo hằng ngày" (`ai-daily-zodiac-pulse/index.ts:109-127`).
  - Đồng ý về dữ liệu ngày sinh là một hằng số đóng dấu sẵn `astrology_birth_data_v1` (`App.tsx:840`).
  - Có hai nguồn ngày sinh: Hồ sơ và lá số Chiêm tinh. Lá số mới lấy sẵn từ Hồ sơ (`App.tsx:6003`).
- Ảnh hưởng: rủi ro niềm tin và chính sách (Google Play Data safety). Người dùng tưởng dữ liệu chỉ ở trên máy.
- Sửa: xem Q4. Tối thiểu cần viết lại chữ cho đúng ("Lá số lưu trên máy. Ngày sinh trong Hồ sơ được lưu vào tài khoản để tạo Nhịp hằng ngày") và hỏi đồng ý thật trước khi đồng bộ.

**U10. Hộp xóa ghi chú dùng nhầm hộp xóa "report AI"**
- Bằng chứng:
  - Xóa một suy ngẫm (`:940`) mở hộp có tiêu đề "Xóa bản đã chọn và report AI?" (`:1627`).
  - Khi xác nhận, app gọi xóa report trên máy chủ trước (`:1645-1660`). Người đã đăng nhập mà mất mạng thì không xóa được ghi chú cục bộ, và nhận thông báo "Chưa xóa được report trên tài khoản".
- Sửa: tách hộp xóa ghi chú (chỉ xóa trên máy) khỏi hộp xóa bản đọc AI. Bỏ chữ "report".

**U11. Vùng chạm nhỏ hơn 48dp**
- Bằng chứng:
  - `AstrologyChartStory.tsx`: `peekPlacement` 38 (`:1489`, dùng ở `:745`), `storyDataLink` 32 (`:1653`, dùng ở `:858` "12 nhà + dữ liệu"), `storySelectionPill` 36 (`:1673`, dùng ở `:880, :914`).
  - `BirthFields` Sáng/Chiều 44 (`:138`).
  - `AstrologySignGuide` sourceLink 44 (`:278`).
- Sửa: đặt `minHeight: layout.minimumTouchTarget` (48) hoặc thêm `hitSlop`.

**U12. Chưa hỗ trợ chữ lớn có kiểm soát**
- Bằng chứng: không có `maxFontSizeMultiplier` ở đâu trong `apps/mobile/src`. Mục U-B vẫn mở.
- Ảnh hưởng: khi phóng chữ lớn, nhãn trên bánh xe, các viên thuốc chọn và thẻ Big 3 có thể tràn hoặc bị cắt. Chưa thử trên máy.
- Sửa: thử ở cỡ chữ 200% trên Android. Đặt giới hạn cho nhãn trong SVG và chip. Cho phép xuống dòng ở thẻ.

**U13. Suy ngẫm tách khỏi Nhật ký**
- Bằng chứng: "Suy ngẫm đã lưu" nằm trong dữ liệu Chiêm tinh (`:918-940`), trong khi "Lưu câu hỏi vào Nhật ký" là một nút khác (`:1497-1512`).
- Ảnh hưởng: người dùng có hai nơi ghi chép, nên khó tìm lại.
- Sửa: lưu suy ngẫm vào **Nhật ký** kèm nhãn "Chiêm tinh". Chuyển dữ liệu cũ một lần.

**U14. Chữ tiếng Anh và tên lẫn lộn trong giao diện VI**
- Bằng chứng:
  - "NILAZA · ASTROLOGY" (`:835`)
  - "report" (`:1627`)
  - "Mở trò chuyện với Astrologer" (`:1516`); persona này tên VI là "The Astrologer" (`personas-archetypes.json:60-66`)
  - ô nơi sinh gợi ý "Hanoi, Paris, New York…" (`:1163-1164`)
  - dùng lẫn "lá số", "bản đồ" và "bản đồ sao"
- Sửa: dùng một từ **"lá số"**. "CHIÊM TINH" làm dòng phụ đề. Persona đặt tên VI, ví dụ "Nhà Chiêm tinh". Gợi ý nơi sinh "Hà Nội, TP. Hồ Chí Minh, Paris…".

**U15. Danh sách lá số đã lưu khó đọc**
- Bằng chứng: ngày hiện dạng ISO thô (`r.input.date`). Nhãn là "Bản 3", "Mở bản đồ 3", "Xóa bản đồ 3", tức dùng số lần sửa (`:880-910`).
- Sửa: hiển thị "Tên · 12/3/1995 · Hà Nội". Nhãn đọc màn hình "Mở lá số của Minh".

**U16. Ô nơi sinh phải bấm xác nhận thêm một lần**
- Bằng chứng: phải bấm "Đây đúng là nơi sinh của tôi" (`:1180-1195`), nếu không sẽ báo lỗi (`:409-415`). Màn này hiện cả tọa độ và múi giờ.
- Sửa: chọn một kết quả trong danh sách là đủ xác nhận. Tọa độ đưa vào mục thu gọn.

**U17. Câu trả lời AI chỉ còn trên máy nếu người dùng tự bấm "Lưu đầy đủ"**
- Bằng chứng: máy chủ có lưu bản đã làm sạch, nhưng app không có hàm lấy lại (`backendClient.ts` chỉ có `requestAstrologyAiInsight` `:686-724`).
- Ảnh hưởng: người dùng thoát ra là mất bài đọc, dù đã tốn lượt duy nhất trong ngày.
- Sửa: tự lưu bài đọc vào máy ngay khi nhận được, cho phép xóa. Về sau có thể thêm "Bài đọc gần đây" lấy từ tài khoản.

### Mức Thấp

- **U18. Bo góc quá 8px**, lệch quy chuẩn thương hiệu (thẻ ≤ 8, viên thuốc 999):
  - `AstrologyHub.tsx:143, 159` (18)
  - `AstrologyAiGuidePanel.tsx:593` (20), `:658, :703`
  - `AstrologyChartStory.tsx:1388` (24), `1486, 1626, 1671, 1696, 1798`
  - `AstrologyExperience.tsx:1970, 2002`
  - `ZodiacWheel.tsx:605, 980`
- **U19. Ô "Lịch trăng" trông bấm được nhưng không bấm được.** Đó là `View` có kiểu giống ô Thần thoại (`AstrologyHub.tsx:112-116`). Hoặc làm nó bấm được (mở lịch trăng), hoặc đổi kiểu thành thẻ thông tin.
- **U20. Ô nhập** (`AstrologyExperience.tsx:1777-1810`): mọi ô đều tắt tự viết hoa và tự sửa, kể cả ô tên và ô suy ngẫm nhiều dòng. Nên bật tự sửa cho ô suy ngẫm và tự viết hoa cho ô tên.
- **U21. Nhãn đọc màn hình của ô ngày/giờ chỉ là "Ngày"/"Giờ"**, không có chữ gợi ý (`BirthFields.tsx:60`). Nên đổi thành "Ngày sinh, 1 đến 31", "Giờ sinh, 0 đến 23".
- **U22.** Nút "Đóng · không lưu" của hộp suy ngẫm không hỏi lại (`:1768`). Nên hỏi lại khi đã gõ chữ.
- **U23. Chia sẻ bản sao lưu gửi nguyên JSON có ngày sinh** dưới dạng tin nhắn (`:1695`). Đã có cảnh báo, nhưng nên mặc định chia sẻ dạng tệp và ẩn JSON thô.
- **U24. Thuật ngữ góc chiếu** ("Đồng vị", "Lục hợp", "Vuông góc", "Tam hợp", "Đối đỉnh") nhất quán giữa từ điển và nội dung hợp đôi. Cần biên tập viên xác nhận đây có phải cách gọi phổ biến ở Việt Nam không (ví dụ "Hợp", "Xung").
- **U25. Các bước "đang viết" của Đọc sâu chạy theo thời gian**, không theo tiến độ thật (`AiDeepRead.tsx:9-13, 90`). Chấp nhận được, nhưng không nên ghi các bước như thể đã hoàn thành từng phần.

### Những điểm đang làm tốt (nên giữ)

- Bánh xe 12 cung: mỗi cung có vùng chạm 48×48 và nhãn "Chọn cung X". Nút phóng to/thu nhỏ có nhãn (`ZodiacWheel.tsx:589-634, 810-823`).
- Ngăn kéo lá số 3 mức có nút tay cầm hỗ trợ đọc màn hình (`AstrologyChartStory.tsx:696-720`).
- Thần thoại tôn trọng cài đặt "giảm chuyển động" (`MythologyWorld.tsx:153-178`) và xử lý nút Quay lại (`:113-123`).
- Hợp đôi:
  - hỏi đồng ý trước khi lưu dữ liệu người kia;
  - chỉ lưu trên máy, có xóa;
  - chip 48dp;
  - không gửi AI.
  
  Bằng chứng: `SynastryViews.tsx:88-94`, `persistence.ts:25-34, 193-200`.
- Có trạng thái lỗi khi mở dữ liệu (`AstrologyExperience.tsx:268-290`), có báo đang tải, và có xử lý nút Quay lại (`:756-771`).
- Màn trống ở Hub viết tốt (`AstrologyHub.tsx:78-84`).
- **"Diễn giải chỉ dựa trên vị trí đã tính":**
  - Đúng với phần diễn giải tĩnh (tính trên máy, tra nội dung).
  - Đúng với Đọc sâu: chỉ gửi dữ kiện, và câu trả lời phải trỏ `evidenceFactIds` hợp lệ.
  - Hàm cũ `ai-astrology-report` vi phạm điều này (gửi dữ liệu sinh thô), nhưng app không còn gọi nó. Đó là lý do nên gỡ hẳn (K8).

---

## 4. Luồng Admin cho Chiêm tinh

### 4.1 Hiện trạng

**Ba tên cho một tính năng:**
- `astrology` là thẻ trong AI Studio cũ (`app.js:165-193`).
- `astrology_report` là mã của prompt và tuyến model.
- `astrology_insight` là mã của công tắc, cấu hình và bộ chạy thử.

Trang Phiên bản thì ghi cứng tiêu đề "Chuỗi model và prompt Chiêm tinh" (`app.js:2684, 2690`), và lịch sử Chiêm tinh hiện hai lần (`:2697`).

| Việc Owner cần làm | Hiện đang ở đâu | Vấn đề |
|---|---|---|
| Sửa prompt Chiêm tinh (đường **chạy được**) | AI › Prompt & phiên bản → thẻ "Prompt theo tính năng" → chọn Chiêm tinh. Đây là trình soạn cũ (`app.js:535, 2348-2367, 2980, 3009`) | **Không qua cổng** (`release-gate.js:51`; `app.js:2781-2817`). Nháp chỉ nằm trong trình duyệt (`localStorage nilaza.admin.astrologyPromptDraft.v1`, `app.js:445, 3307`). Không so sánh, không khôi phục, không xem toàn văn bản cũ (`:2365, 2693`). Hộp duyệt chỉ hiện số ký tự (`:2806-2808`). Ghi chú phát hành bị bỏ (`:2865`). Tên phiên bản tự sinh `astrology-owner-<giờ>` (`:1378`). Máy chủ chỉ kiểm độ dài 100–12000 ký tự, không kiểm chèn lệnh (`admin-astrology-prompt-config/index.ts:46`) |
| Sửa prompt Chiêm tinh (đường **mới**) | AI › Prompt & phiên bản (A5, `prompt-versions.js:26, 42`) | Có so sánh (`:94-118`), khôi phục (`:208, :375-387`) và cổng (`:266`), nhưng **luôn bị chặn** vì chưa có bộ chạy thử (`NZE06`). Admin tự giải thích điều này bằng một dòng chú thích dài (`release-gate.js:51`) |
| Bật/tắt khẩn cấp | AI › Tính năng AI (`ai-features.js:146-150, 278`) | Hoạt động, không qua cổng (đúng thiết kế) |
| Lượt/ngày, thời gian chờ, câu báo | AI › Tính năng AI (`ai-features.js:19, 101-104, 168-170`) | Sửa được trên màn hình nhưng **không phát hành được**, vì cổng chặn cấu hình Chiêm tinh (`gate.sql:669-676`). Hiện chưa có dòng cấu hình Chiêm tinh nào (`20261113090100:11`), nên đang chạy theo mặc định trong mã. Không có lịch sử, không khôi phục |
| Tuyến model | AI › Nhà cung cấp & Model (`model-providers.js:32`) | Định dạng đúng, nhưng lưu tuyến **không qua cổng** (chỉ ghi nhật ký, `gate.sql:975`). Tuyến `astrology_report` dùng chung với hàm cũ (AI-10) |
| Chạy thử | AI Studio cũ "Chạy thử" | **Không gọi máy chủ**, chỉ hiện hướng dẫn "gửi thử từ app" (`app.js:2735-2740`) |
| Xem phản hồi người dùng | Vận hành › Phản hồi (`feedback-inbox.js:16`) | Nút "đưa vào bộ chạy thử" (`:187`) dẫn tới một bộ chưa chạy được |
| Xem nhật ký AI | Vận hành › Nhật ký AI (`app.js:2137-2141, 2208`) | Có lọc Chiêm tinh |
| Sửa nội dung Chiêm tinh | **Không có** | Admin chỉ quản lý persona, bộ bài, lá bài và chữ trong app (`content-model.mjs:71, 143-152`). Có 3 vị trí chữ liên quan (`content-seed.json:5621, 5640, 5659`). 10 tệp `astrology-*.json` và từ điển không sửa được |
| Xem app sẽ hiện gì | **Không có** | Không có xem trước bài Đọc sâu mẫu. Không có lá số mẫu. Không thấy dòng nào trên app đọc từ prompt nào |

**Quyền:** sửa prompt cần quyền `ai.manage` (`admin-astrology-prompt-config/index.ts:29-31`; `workspace-guard.js:126`), và vai trò `admin` hiện cũng có quyền này. Đặc tả nói chỉ Owner (câu hỏi đang mở trong PLAN.md, xem Q7).

### 4.2 Luồng đích (theo mục 5 của `ADMIN_REDESIGN_2026-11-03.vi.md`)

Nguyên tắc vẫn giữ:
- mỗi nút một nghĩa (**Lưu nháp** / **Phát hành**);
- tiếng Việt;
- chi tiết kỹ thuật thu gọn;
- lớp an toàn không bao giờ được bỏ qua, và chỉ Owner được bỏ qua lớp chất lượng (§5.1 của đặc tả 04/11).

```
AI
├─ Tính năng AI
│   └─ Thẻ "Chiêm tinh · Đọc sâu"       ← một thẻ duy nhất
│       • Công tắc (khẩn cấp, không qua cổng)
│       • 1 lượt/ngày · chờ 60s · câu báo  → Lưu nháp / Phát hành (qua cổng)
│       • Lịch sử + Khôi phục
│       • Lối tắt: Prompt · Model · Chạy thử · Phản hồi · Nhật ký (đã lọc sẵn Chiêm tinh)
├─ Nhà cung cấp & Model
│   └─ Tuyến "Đọc sâu Chiêm tinh" (định dạng astrology_ai_insight_v1), lưu qua cổng
├─ Prompt & phiên bản
│   └─ Chiêm tinh · Đọc sâu: cặp VI + EN
│       • Nháp lưu trên máy chủ (không chỉ trong trình duyệt)
│       • So sánh với bản đang chạy · Khôi phục
│       • Xem trước: bài đọc mẫu từ 1–2 lá số mẫu (chart-fixtures), hiện đúng như trên app
│       • Phát hành qua cổng (cần bộ chạy thử của agent khác)
└─ Chạy thử & chấm điểm
    └─ Bộ "Đọc sâu Chiêm tinh" (agent khác đang làm)

Nội dung
└─ Chiêm tinh   ← mục mới
    • Big 3 · Vị trí theo chủ đề · Mặt Trăng trong nhà · Hợp đôi · Thần thoại · Từ điển
    • Mỗi mục: VI + EN cạnh nhau, trạng thái duyệt, Lưu nháp / Phát hành (giống A3)
```

Thay đổi cụ thể:
1. **Gộp tên gọi:** trên màn hình chỉ có "Chiêm tinh · Đọc sâu". Về kỹ thuật, đổi mã prompt và tuyến từ `astrology_report` sang `astrology_insight` sau khi gỡ hàm cũ, để bỏ phép đổi tên ở `prompt-versions.js:42`.
2. **Gỡ trình soạn cũ** khi bộ chạy thử đã chạy được. Trước đó, đặt một băng thông báo: "Đây là đường tạm, chưa qua cổng. Hãy ghi lý do."
3. **Xem trước:** hiện bài đọc mẫu theo đúng bố cục app (headline, tổng hợp, 1–3 câu hỏi suy ngẫm, các dữ kiện được trích). Việc này dùng lá số mẫu, không dùng dữ liệu người thật.
4. **Lưu tuyến model** của Chiêm tinh cũng đi qua cổng (lớp an toàn).
5. **Ghi chú phát hành** được lưu vào nhật ký thao tác thay vì bị bỏ.
6. Xóa công tắc và dòng "Astrology report — đang gỡ" sau khi gỡ hàm.

---

## 5. Lộ trình

| Giai đoạn | Việc | Quy mô | Phụ thuộc |
|---|---|---|---|
| **P0a** | Kiểm chỉ đọc trên Singapore: tuyến, prompt VI/EN, `AI_TRACE_ENVIRONMENT` (K1–K3) | S | Owner duyệt từng truy vấn |
| **P0b** | Nếu thiếu: lưu tuyến (định dạng mới) và phát hành cặp prompt VI/EN qua trình soạn cũ, có ghi lý do bỏ cổng | S | P0a, Owner duyệt. Đây là đường tạm có chủ đích |
| **P0c** | Sửa app: nút khách → đăng nhập (K4/U1), 115 (K5/U2), giờ 24h (K6/U3), "Đọc đầy đủ" → thẻ guide (K7/U6), câu báo "đang bảo trì" (U4). Kèm kiểm thử | M | Không. Có thể làm song song với P0a |
| **P0d** | Tắt công tắc `astrology_report` → gỡ hàm `ai-astrology-report` → xóa mã liên quan (K8) | S | Owner duyệt deploy/gỡ. Đã có quyết định 04/11 |
| **P0e** | Thử trên máy Android: đăng nhập → lá số → Đọc sâu → nhận bài → hết lượt → hôm sau. Xem Nhật ký AI | S | P0a–P0d, bản build mới |
| **P1** | Một tên "Đọc sâu" và một lối vào (U5); sắp lại trang kết quả (U7); bỏ chữ kỹ thuật (U8); hộp xóa ghi chú (U10); chạm 48dp (U11); chữ lớn (U12); chữ tiếng Anh (U14); danh sách lá số (U15); nơi sinh (U16); tự lưu bài đọc (U17); bo góc (U18); lịch trăng (U19); U20–U23 | M | P0c. Câu hỏi Q2, Q8 |
| **P1-riêng tư** | Viết lại lời hứa riêng tư và hỏi đồng ý thật cho việc đồng bộ ngày sinh (U9, K12). Cập nhật bản khai Data safety | S–M | Câu hỏi Q4 |
| **P1-ghi chép** | Đưa suy ngẫm vào Nhật ký (U13), chuyển dữ liệu cũ | M | Câu hỏi Q5 |
| **P2** | Admin: thẻ "Chiêm tinh · Đọc sâu"; nháp prompt trên máy chủ; xem trước bằng lá số mẫu; tuyến qua cổng; lưu ghi chú phát hành; gỡ trình soạn cũ; đổi mã `astrology_report` → `astrology_insight` (AI-10) | M–L | **Bộ chạy thử của agent khác.** P0d (đổi mã sau khi gỡ hàm cũ). Cấu hình ngữ cảnh theo tính năng (agent khác) cho phần "dữ kiện gửi model" |
| **P3** | Nội dung › Chiêm tinh trong Admin; chuyển phần diễn giải viết cứng (`interpretation.ts`, `AstrologyGlossary.tsx`) sang `packages/content`; vòng duyệt biên tập thần thoại và thuật ngữ góc chiếu (K10, K11, U24) | L | Câu hỏi Q6. Người biên tập nội dung |

S = vài giờ đến 1 ngày, M = 2–4 ngày, L = hơn 1 tuần (ước lượng thô).

---

## 6. Câu hỏi cần Owner quyết định

| # | Câu hỏi | Khuyến nghị |
|---|---|---|
| Q1 | Khách chưa đăng nhập bấm vào Đọc sâu thì hiện gì? | **Mời đăng nhập** ("Đăng nhập để dùng · 1 lượt/ngày"). Không nhắc Premium khi chưa bán |
| Q2 | Đọc tổng quan và hỏi câu riêng có dùng chung 1 lượt/ngày không? | **Có, dùng chung 1 lượt**, gom về một tên "Đọc sâu" và ghi rõ trên nút |
| Q3 | Gỡ hẳn hàm "Astrology report" cũ ngay bây giờ? | **Có.** Đã quyết định gộp từ 04/11, app không còn gọi, và hàm này gửi ngày sinh thô cho AI |
| Q4 | Ngày sinh trong Hồ sơ có được lưu lên tài khoản không? | **Có, nhưng phải hỏi đồng ý rõ ràng** và sửa chữ "chưa đồng bộ cloud" cho đúng. Nếu người dùng không đồng ý thì Nhịp hằng ngày dùng chế độ không cá nhân hóa |
| Q5 | Suy ngẫm Chiêm tinh có nên chuyển về chung Nhật ký? | **Có**, gắn nhãn "Chiêm tinh" |
| Q6 | Ai duyệt nội dung thần thoại và thuật ngữ góc chiếu trước khi quảng bá? | **Một người biên tập tiếng Việt** duyệt trong P3. Trước đó vẫn hiển thị nhưng không đưa vào tài liệu quảng bá |
| Q7 | Vai trò "admin" có được sửa và phát hành prompt AI không? | **Chỉ Owner** (theo đặc tả). Admin chỉ được xem và lưu nháp |
| Q8 | Dòng "chưa chứng nhận độc lập" ở phần AI giữ thế nào? | **Rút gọn** thành một dòng nhỏ: "Bài đọc do AI viết từ lá số của bạn, để suy ngẫm, không phải lời tiên đoán" |
| Q9 | Trong lúc chờ bộ chạy thử, có cho phép phát hành prompt Chiêm tinh qua đường cũ (không cổng) để khởi động không? | **Có, một lần**, có ghi lý do và thử ngay trên staging. Sau khi có bộ chạy thử thì chỉ dùng đường có cổng |

---

## 7. Đã kiểm / chưa kiểm

**Đã kiểm (đọc mã trên `cb32621`):**
- Mọi bằng chứng có ghi tệp:dòng trong tài liệu này.
- Đã xem lại trực tiếp:
  - `AiDeepRead.tsx`
  - điều kiện `App.tsx:5991-5992`
  - `accountTierPolicy.ts`
  - `BirthFields.tsx` và kiểm thử của nó
  - câu báo lỗi `AstrologyExperience.tsx:101-121, 636-647`
  - đường đọc tuyến và prompt `ai-astrology-insight/index.ts:234-253`
  - dòng chặn `NZE06` trong cổng
  - chú thích không-có-bộ-chạy-thử trong `release-gate.js`
  - chạy thử giả trong `app.js:2733-2741`
  - danh sách tính năng và tuyến trong Admin (`ai-features.js`, `prompt-versions.js`, `model-providers.js`)

**Chưa kiểm:**
- **Chưa chạy app** trên Android, giả lập hay web. Mọi nhận xét về bố cục, chữ lớn, độ tương phản và TalkBack đều suy ra từ mã.
- **Chưa truy vấn Singapore.** Không biết tuyến và prompt Chiêm tinh đã có trên máy chủ hay chưa. Có thể Owner đã thêm tay trước đây; K1–K2 cần kiểm thật.
- Chưa xác nhận `AI_TRACE_ENVIRONMENT` (không đọc bí mật, theo quy định).
- Chưa mở Admin staging. Mô tả luồng Admin dựa trên mã.
- Chưa thử việc lỗi `route_not_ready` và `prompt_not_ready` có trừ lượt hay không. Theo mã thì không trừ lượt đã giao, nhưng tính vào giới hạn 2 lần lỗi mỗi ngày.
- Chưa kiểm bản khai Data safety trên Play Console.
- Chất lượng tiếng Việt của nội dung thần thoại: chỉ xem mẫu, chưa đọc hết.

---

## 8. Phụ lục kỹ thuật

### 8.1 Lối vào Chiêm tinh trên app
- Khám phá: `ExploreHome.tsx:36`. Trên trang Khám phá, chỉ Xem tướng ghi "Sắp có" (`:83`).
- Ô ở Trang chủ: `HomeExperience.tsx:175`.
- Oracle `cast_astrology`: `App.tsx:4658-4665`.
- `startAstrology`: `App.tsx:6049, 6059`. Vẽ màn hình ở `App.tsx:5987-6004`.
- Không có cờ ẩn Chiêm tinh. `runtimeConfig.ts:87` chỉ dùng cho QA trace.

### 8.2 Đường chạy Đọc sâu (máy chủ)

`ai-astrology-insight` chạy theo các bước sau:
1. Kiểm công tắc `astrology_insight` (`:158`).
2. Kiểm `AI_TRACE_ENVIRONMENT` (`:161-164`).
3. Đọc cấu hình `astrology_insight` (`:213`); hiện không có dòng nên dùng mặc định trong mã.
4. Kiểm lượt 1/ngày (`:213-234`).
5. Đọc tuyến `astrology_report`, đòi định dạng `astrology_ai_insight_v1` (`:236-239`).
6. Đọc prompt `astrology_report` theo `invocation.language`, `owner_type = global` (`:240-252`).
7. Gọi model, rồi kiểm câu trả lời (`evidenceFactIds`).

Giới hạn chi phí tra theo `model-router.ts:635`.

### 8.3 Đường phát hành prompt cũ
- Admin `app.js` gửi tới Edge Function `admin-astrology-prompt-config`:
  - GET cần `ai.read`, POST cần `ai.manage` (`:29-31`);
  - kiểm độ dài (`:44-48`);
  - gọi RPC (`:34, :49`).
- RPC SQL nằm trong `20260926152118_ai_studio_operations.sql`: đọc ở `:81-103`, phát hành ở `:105-172`. Hàm phát hành làm các bước sau:
  - khóa (`:123`);
  - kiểm phiên bản, lỗi 40001 (`:136-138`);
  - lưu trữ bản cũ và chèn hai dòng `astrology_report` mới (`:140-158`);
  - ghi nhật ký `ai.astrology_prompt.publish` (`:160-164`).
- Không có RPC khôi phục.
- `20261113095000_prompt_versions_admin_publish.sql:8` cố ý giữ đường này. Ràng buộc cho phép `feature = astrology_insight` (`:17-18, :69`), nhưng hiện không hàm nào đọc mã đó.

### 8.4 Cổng phát hành (A6)
- `20261113110000_ai_eval_release_gate.sql`:
  - `:676` — `NZE06 eval_feature_not_supported` cho `astrology_insight`;
  - `:804` — `NZE01`;
  - `:922` — `publish_prompt_version_gated`;
  - `:975` — tuyến model chỉ ghi nhật ký, không chặn;
  - `:1005-1050` — các bộ chạy thử mẫu bỏ qua Chiêm tinh.
- `runner.ts:26-27` hỗ trợ 5 tính năng.
- `ai-evals.js:22`; `release-gate.js:51-54, 64`.
- **Agent khác đang thêm bộ chạy thử Chiêm tinh.** Khi xong, dòng `:676` và chú thích `release-gate.js:51` cần đổi theo.

### 8.5 Hàm cũ `ai-astrology-report` (cần gỡ)
- Công tắc: `index.ts:448`.
- Dữ liệu sinh thô gửi model: `:491-506`.
- Prompt viết cứng: `:476-517`.
- Giới hạn 3/ngày: `:449-451`.
- Ghi `birth_profiles`: `:537-549`.
- Tuyến dùng chung với Đọc sâu: `openrouter.ts:65` (AI-10).
- Phía app: `backendClient.ts:389, 670-677`; `App.tsx:68, 2608-2622, 4362-4425` (`generateAstrologyPreview`, không được gọi).
- Kiểm thử đang khóa hành vi cũ: `backendClient.test.ts:538-612`; `AstrologyChartStory.test.tsx:95, 115, 134, 219`. Sửa K4/K8 thì phải cập nhật các kiểm thử này.

### 8.6 Dữ liệu ngày sinh đi đâu
| Nguồn | Lưu ở đâu | Gửi đi đâu |
|---|---|---|
| Lá số Chiêm tinh | Máy (`nilaza.astrology.v2`, `persistence.ts`); có trong bản xuất cục bộ (`privacy/localExport.ts:10`) | Không gửi; Đọc sâu chỉ nhận dữ kiện đã tính |
| Hợp đôi (người kia) | Máy, sau khi đồng ý (`persistence.ts:25-34`) | Không gửi |
| Hồ sơ | Máy và `birth_profiles` (`App.tsx:3462-3483, 4215-4224` → `profile-upsert/index.ts:94-102`) | `ai-daily-zodiac-pulse` (`:109-127`) |
| Hàm cũ Astrology report | `birth_profiles` (`:537-549`) | Model (dữ liệu thô) — không còn đường gọi từ app |

Đồng ý dữ liệu sinh: hằng số `astrology_birth_data_v1` được đóng dấu sẵn (`App.tsx:840`), không có màn hỏi riêng.

### 8.7 Danh mục rà soát liên quan (`docs/backlog/review-2026-10-30.json`)
- Đã đóng: AS-01, AS-03, AS-04, AS-05, AS-06, AI-16. Tài liệu này cho thấy **AS-01** (với khách) và **AS-04** (UTC còn hiện) chưa thật sự xong.
- Còn mở: AD-11, AI-10, AI-03, AD-23.
- Làm một phần: AI-06, AD-10, AI-02.
- Đề xuất: khi làm P0c/P1, mở lại hoặc thêm ghi chú cho AS-01 và AS-04 trong cùng PR.
