# Kế hoạch: “Báo cáo tổng hợp” (Bản đồ số) và “Hai hệ cùng nhìn bạn” (28/11/2026)

> **Loại tài liệu:** kế hoạch. **Owner đã chốt 8 câu ngày 28/11 (xem mục 8); bắt đầu làm H0, H1, R0–R2.** Áp SQL, deploy, chọn model, bật công tắc và Data safety vẫn cần Owner duyệt riêng từng lần. Owner yêu cầu 28/11: “Hãy lập kế hoạch triển khai bổ sung Báo cáo tổng hợp và Hai hệ cùng nhìn bạn.”
> **Căn cứ:** [đặc tả Astro Numerology](ASTRO_NUMEROLOGY_IMPLEMENTATION_2026-11-23.vi.md) (mục 4, 5, 7, 8), [gói backend B1–B8 “Lời nhắn riêng”](NUMEROLOGY_AI_PRIVATE_MESSAGE_BACKEND_2026-11-25.vi.md), [báo cáo giá trị ba tầng](TAROT_ASTRO_VALUE_REPORT_2026-11-21.vi.md) (Q2, Q3, Q5), `PLAN.md` mục 1 và 7.
> **Ký hiệu:** điều nào đặc tả chưa nói, kế hoạch này ghi **(đề xuất, chờ Owner)**.

## 0. Tóm tắt một phút

- **Hai hệ cùng nhìn bạn** đặt Chiêm tinh và Bản đồ số cạnh nhau: “điểm gặp” và “chỗ khác giọng” giữa nguyên tố cung Mặt Trời và số chủ đạo. **Đề xuất bản đầu không dùng AI**: máy ghép từ khoảng 42 khối nội dung đã duyệt. Không tốn tiền AI, không gửi dữ liệu nào ra khỏi máy, không cần SQL hay deploy. Làm trước.
- **Báo cáo tổng hợp** là báo cáo Bản đồ số dài (khoảng 1.200–1.800 chữ, 7 phần) do AI **chọn và nối các khối đã duyệt**, chỉ nhận con số đã tính và mã khối như “Lời nhắn riêng”. Cần hàm máy chủ mới, prompt, tuyến model, hạn mức, SQL, deploy và sửa Data safety: mỗi việc Owner duyệt riêng. Làm sau.
- Người dùng Free thấy mục lục và phần đầu (ghép từ khối có sẵn, **không gọi AI**), các phần sau hiện mờ, không đếm ngược (quyết định Q3 ngày 21/11).

## 1. Hai tính năng nhìn từ phía người dùng

### 1.1 Hai hệ cùng nhìn bạn

| | Nội dung |
|---|---|
| Giá trị | Trả lời câu hỏi “hai hệ nói gì giống nhau về mình, chỗ nào khác?”. Mỗi câu ghi rõ nguồn (“Mặt Trời Bạch Dương · nguyên tố Lửa” + “Số chủ đạo 1”), giọng “có thể/nghiêng về”, hai mặt, một câu hỏi tự phản chiếu. Đúng nguyên tắc đặc tả mục 4: máy tính, người viết, AI không tự viết |
| Ở đâu | Hàng “Hai hệ cùng nhìn bạn” trong mục Premium của “Tôi là ai” (hiện là hàng tĩnh nhãn “Sắp có”, `apps/mobile/src/features/profile/WhoAmI.tsx` dòng 206–209). Bấm mở màn mới. Đề xuất thêm một dòng nhỏ “Xem cùng chiêm tinh” cuối mục “Bạn” của màn Bản đồ số **(đề xuất, chờ Owner)** |
| Điều kiện | Cần cung Mặt Trời **chắc chắn** (hàm `certainSigns` ở `whoAmIModel.ts`) và ngày sinh hợp lệ (`lifePathLabel`). Thiếu thứ nào thì mời lập lá số / nhập ngày sinh, không hiện số giả (đặc tả mục 7) |
| Free | Thấy cặp chip (nguyên tố + số chủ đạo) và đoạn “Điểm gặp”; “Chỗ khác giọng” và câu hỏi hiện mờ kèm nhãn Premium, không đếm ngược **(đề xuất, chờ Owner)** |
| Premium | Đọc đủ ba phần; có nút “Viết vào Nhật ký” với câu hỏi của khối |
| Khách | Thấy hàng và lời mời đăng nhập; không có dữ liệu thì không hiện nội dung |
| Closed test | `account-tier-policy.json` đang `mode: "all_premium"`, nên mọi tài khoản đăng nhập thấy bản Premium |

Lưu ý trung thực: vì nội dung nằm sẵn trong app, khóa Premium ở đây **chỉ là khóa giao diện** (giống bộ bài `premium-preview`). Không có chi phí máy chủ nên chấp nhận được.

### 1.2 Báo cáo tổng hợp (Bản đồ số)

| | Nội dung |
|---|---|
| Giá trị | Một bài đọc liền mạch thay cho nhiều thẻ rời: AI nối các khối đã duyệt thành câu chuyện, đặt câu trả lời lên trước, lưu và xem lại được (tầng “báo cáo chuyên sâu” ở báo cáo giá trị 21/11). Chỉ là Bản đồ số, đúng nhãn đang hiện ở `PaywallPanel.tsx` dòng 27 “Bản đồ số AI: Báo cáo tổng hợp” |
| Bố cục 7 phần **(đề xuất, chờ Owner)** | (1) Bạn trong vài dòng: số chủ đạo + số ngày sinh; (2) Tên của bạn: biểu đạt, linh hồn, nhân cách (bỏ nếu không nhập tên); (3) Biểu đồ ngày sinh: số có mặt, mũi tên đủ/trống; (4) Năm nay và tháng này; (5) Giai đoạn đỉnh cao hiện tại và thử thách đi kèm; (6) Trong quan hệ, bạn thường…; (7) Ba câu hỏi nhật ký. Mọi phần dùng khối có sẵn trong `packages/content/data/numerology-blocks.json` (các nhóm `numbers`, `masters`, `digits`, `arrows`, `personalYear`, `personalMonth`, `pinnacles`, `challenges`, `relationship`) |
| Ở đâu | Thẻ “Báo cáo tổng hợp” dưới thẻ “Lời nhắn riêng” trên màn Bản đồ số (`NumerologyScreen.tsx`); báo cáo đã tạo hiện ở “Báo cáo đã lưu” trong “Tôi là ai” |
| Free | Mục lục 7 phần + phần (1) ghép thẳng từ khối, **không gọi AI**; phần 2–7 mờ, không đếm ngược, không giảm giá ép (Q3) |
| Premium | Bấm “Tạo báo cáo” → hộp xác nhận (nói rõ chỉ gửi con số và mã khối, như hộp B8) → báo cáo đủ 7 phần, lưu trên máy |
| Khi tắt | Công tắc tắt, nội dung chưa duyệt hoặc chưa Premium: thẻ hiện “Sắp có” hoặc ghi chú Premium (giống “Lời nhắn riêng”) |

## 2. Ảnh hưởng toàn app (Whole-App Impact Brief)

| Mục | Hai hệ (bản đầu) | Báo cáo tổng hợp |
|---|---|---|
| Lối vào | Hàng ở “Tôi là ai”; (đề xuất) dòng trên Bản đồ số | Thẻ trên màn Bản đồ số; hàng “Báo cáo đã lưu” |
| Dữ liệu ghi | Không ghi gì mới | Báo cáo lưu **trên máy** (khóa đề xuất `nilaza.numerology.report.v1`, gắn với bộ số đã tính), xóa được ở “Tôi là ai”, có trong “Xuất dữ liệu”. Máy chủ chỉ ghi sự kiện đếm lượt (`usage_events`) và trace đã che nội dung, **không lưu báo cáo** |
| Hợp đồng backend | Không đổi | Hàm mới `ai-numerology-report`; tuyến `numerology_report`; công tắc `numerology_report` (đọc chặt: thiếu dòng = tắt); hạn mức mới trong `account-tier-policy.json`; prompt `numerology_report_system` (vi+en) |
| Admin | Không đổi | Trace và chi phí hiện như các hàm AI khác; tuyến hiện trong trang tuyến model sau khi deploy lại `admin-model-router-config` (cần duyệt riêng). Admin **chưa sửa được prompt** này (giống B2) |
| Riêng tư | Không gửi gì ra khỏi máy | Chỉ gửi: phiên bản, ngôn ngữ, nhãn số (`11/2`, `6`…), mã mũi tên, chữ số có mặt (không đếm số lần), số đỉnh cao và thử thách theo giai đoạn, mã khối. **Không** gửi họ tên, tên chuẩn hóa, ngày/tháng/năm sinh, tuổi, khoảng tuổi, tổng chữ cái. Máy chủ từ chối mọi khóa lạ; chỉ tuyến `zdr` + `data_collection: "deny"` (đã có test ở `_shared/model-provider.test.ts`) |
| An toàn nội dung | Khối đã duyệt, test từ cấm | AI chỉ nối khối; đầu ra kiểm từ cấm (đặc tả mục 4), không số 4 chữ số (chặn năm), không “sẽ”, mỗi phần chỉ dùng mã khối thuộc phần đó |
| Đo lường | Sự kiện tên-only: mở màn, thấy phần mờ, bấm Premium | Thấy mục lục, bấm tạo, giao xong, lỗi (mã lỗi). Không gửi con số trong sự kiện |
| Hoàn tác | Ẩn hàng bằng cờ trong app, trả về “Sắp có” | Tắt công tắc → thẻ về “Sắp có”, báo cáo đã lưu vẫn đọc được; tắt tuyến; migration ngược xóa dòng seed |
| Không đụng | Tarot, Chat, Council, Oracle, Chiêm tinh AI (`ai-astrology-insight`), “Lời nhắn riêng” (`ai-numerology-message` giữ nguyên, không deploy lại), Hợp số (ngày sinh người kia vẫn không rời máy), thẻ chia sẻ, trang web | như cột trái |

**Mỗi push lên `main` tự deploy Admin staging** (vô hại, tốn một lần build).

## 3. Nội dung cần viết

### 3.1 Hai hệ: khối ghép cặp **(đề xuất, chờ Owner)**

- **Trục ghép bản đầu:** nguyên tố của cung Mặt Trời (Lửa, Đất, Khí, Nước; app đã có dữ liệu nguyên tố trong `packages/content/data/astrology-zodiac-guides.json`) × số chủ đạo **gốc** 1–9. Số 11 và 22 dùng khối của 2 và 4 kèm câu “sắc thái” đã có (`masters.11`, `masters.22`), giữ quy tắc “không đặc biệt hơn”.
- **Vì sao không 12 cung × 9 số (108 khối):** gấp 3 lần công viết và duyệt, dễ thành câu chung chung (trượt phép thử “đổi số”). Nguyên tố đủ khác nhau để có “điểm gặp” thật.
- **Khối lượng:** 36 khối cặp + 4 khung nguyên tố + 1 lời mở đầu và 1 ghi chú nguồn = **khoảng 42 khối, 3.000–3.500 chữ** mỗi ngôn ngữ (vi + en).
- **Mẫu một khối:** `id` (`fire.1`), `điểm gặp` (2 câu), `chỗ khác giọng` (1–2 câu), `câu hỏi` (1 câu), `nguồn` (nguyên tố + số), `người duyệt`, `ngày duyệt`, `phiên bản`. Tệp mới `packages/content/data/two-systems-blocks.json`, có trường `review` như `numerology-blocks.json`.
- **Để sau (v1.1):** nguyên tố Mặt Trăng × số linh hồn (cần họ tên, thêm 36 khối).
- **Ai duyệt:** AI soạn → skill `nilaza-content-review` (chuyên gia chiêm tinh, chuyên gia thần số, ngôn ngữ, an toàn) → phép thử “đổi số”, “đổi nguyên tố”, “thế hệ” → **Owner duyệt cuối** và khóa phiên bản. Hiện vẫn **chưa có người duyệt chuyên môn bên ngoài** (giống nội dung Bản đồ số, Owner duyệt 25/11).

### 3.2 Hai hệ có cần AI không?

**Khuyến nghị: bản đầu chỉ dùng mẫu, không AI.** So sánh:

| | Chỉ mẫu (khuyến nghị) | Có AI |
|---|---|---|
| Chi phí | 0 | mỗi lượt tốn tiền model |
| Dữ liệu ra khỏi máy | không | vị trí sao + con số; **vị trí Mặt Trời theo độ đủ để đoán lại ngày sinh**, nên nếu làm AI chỉ được gửi tên cung và nguyên tố, không gửi độ, nhà hay cung Mọc |
| Cổng Owner | duyệt nội dung + gộp | thêm SQL, deploy, prompt, tuyến, hạn mức, Data safety |
| Chạy khi mất mạng | có | không |
| Độ an toàn câu chữ | đã duyệt từng câu | phụ thuộc kiểm đầu ra |

Nếu sau closed test người dùng muốn sâu hơn, làm bản AI theo đúng khuôn của “Báo cáo tổng hợp” (mục 4), dùng chung hàm với tham số phần.

### 3.3 Báo cáo tổng hợp

Không viết khối mới (đặc tả mục 4, lớp 5: “AI chọn và nối khối theo mã”). Chỉ cần thêm vào `numerology-blocks.json` nhóm chữ giao diện `synthesisReport` (tiêu đề 7 phần, mục lục, hộp xác nhận, lỗi, “Sắp có”), khoảng 20 chuỗi, Owner duyệt lại vì sửa tệp đã duyệt.

## 4. Phần AI của “Báo cáo tổng hợp”

| Hạng mục | Đề xuất |
|---|---|
| Hàm | `supabase/functions/ai-numerology-report` (mới, tách khỏi `ai-numerology-message` để không phải deploy lại hàm đang chạy). Rút phần kiểm số hợp lệ dùng chung sang `_shared/numerology-payload.ts` |
| Thứ tự cổng (theo B6) | đăng nhập (401) → công tắc chặt (503 `feature_paused`) → nội dung `approved` có tên người duyệt (503 `content_not_approved`) → Premium bằng quyền mua hoặc công tắc gói (403 `premium_required`) → hạn mức (429) → **sau đó** mới đọc body; từ chối khóa lạ (400); kiểm từng số (1–9, 11/2, 22/4, thử thách 0–8, mã mũi tên trong danh sách) |
| Dữ liệu gửi | `buildReportPayload` mới trong `apps/mobile/src/features/numerology/aiPayload.ts`, mở rộng từ `buildPrivateMessagePayload`, cùng test “không chứa họ tên, ngày, năm, tuổi” |
| Máy chủ làm gì | Tự tra văn bản từng mã khối trong kho đã duyệt; gửi cho model khung 7 phần + văn bản khối; model trả JSON |
| Đầu ra | `numerology_report_v1`: `{ sections: [{ id, title, body, blockIds }], questions: [3] }`; 7 `id` cố định; `blockIds` phải là tập con của mã đã gửi **và** thuộc đúng phần; mỗi phần ≤ 350 chữ; kiểm từ cấm, chặn “sẽ”, chặn số 4 chữ số. Kiểm trong router để rơi sang model dự phòng một lần; hỏng nữa thì 503 `report_unavailable`, **không** thay bằng chữ soạn sẵn, không tính lượt |
| Tuyến model | `numerology_report` trong `packages/agent-config/model-routing.json`: bắt đầu bằng cặp đang dùng cho mọi tính năng (`deepseek/deepseek-v4.1-flash` → `xiaomi/mimo-v2.6-flash`), suy luận tắt, `maxOutputTokens` khoảng 4.000, `safetyPolicy.approvedBlocksOnly`. Theo Q2 (21/11), **chốt model sau chạy thử mù**: so cặp hiện tại với một model cỡ Haiku trên 20 bộ số thật |
| Hạn mức | **(đề xuất, chờ Owner)** 1 báo cáo giao thành công / ngày giờ Việt Nam + 2 lần lỗi (dùng lại cơ chế đếm ngày của `numerologyMessage`, `account-tier-policy.json` dòng 28–31). App **dùng lại báo cáo đã lưu** khi bộ số không đổi; nút “Tạo lại” chỉ hiện khi năm cá nhân đổi (1/1) hoặc người dùng sửa ngày sinh/tên |
| Công tắc | Dòng `numerology_report` trong `ai_feature_switches`, seed **tắt** |
| Chi phí mỗi báo cáo | Công thức: (token vào × giá vào) + (token ra × giá ra). Giả định: vào ≈ 5.000 token (prompt ~1.000 + ~25 khối × ~150 token tiếng Việt), ra ≈ 3.000–4.000 token (1.200–1.800 chữ tiếng Việt). Giá mỗi triệu token lấy từ OpenRouter lúc chạy thử mù, **không đoán ở đây**. Mốc tham khảo chưa đo: báo cáo 21/11 ước ~610đ (cỡ Haiku) đến ~1.830đ (cỡ Sonnet) cho báo cáo 1.500–2.500 chữ. Nếu một người tạo mỗi ngày bằng model cỡ Haiku: ~18.300đ/tháng, sát mức ~19.500đ/tháng mà báo cáo 21/11 tính cho người trả gói (giá gói chưa chốt). Đây là lý do khuyến nghị dùng lại báo cáo đã lưu. **Chi phí thật chỉ có sau trace** |
| Data safety | Không thêm loại dữ liệu mới so với “Lời nhắn riêng” (“các con số Thần số học đã tính”, gửi khi người dùng bấm); sửa mô tả trong bản nháp Play và chính sách vi/en để nêu cả báo cáo. Owner điền Play Console |

## 5. Các lô (PR nhỏ)

Mỗi lô: `docs/feature-plans/<tên>.json` + `npm run feature:preflight` **trước khi sửa**; nhánh ngắn hạn cắt từ `origin/main` mới nhất; cuối lô cập nhật `PLAN.md`; xin Owner duyệt **một lần** cho commit → merge → push `main`. Kiểm chung: `npm run mobile:check`, `npm run validate:data`, chữ lớn 150–200%, chạy khi mất mạng và khi là khách.

| Lô | Việc | Tệp chính | Kiểm | Cổng Owner riêng |
|---|---|---|---|---|
| H0 | Soạn 42 khối Hai hệ (vi+en), rà bằng `nilaza-content-review` | `packages/content/data/two-systems-blocks.json`, test dữ liệu (đủ 36 cặp, có trường duyệt, không từ cấm, không câu trùng) | `validate:data`, test từ cấm, phép thử “đổi số/đổi nguyên tố” ghi trong biên bản | **Duyệt nội dung** |
| H1 | Màn Hai hệ (chỉ mẫu), nối hàng ở “Tôi là ai”, phần mờ cho Free, nút Nhật ký; chuyển dòng Hai hệ từ `paywallComingSoon` sang `paywallBenefits` | `features/profile/TwoSystems.tsx`, `twoSystemsModel.ts`, `WhoAmI.tsx`, `PaywallPanel.tsx`, test | test mô hình (cung không chắc chắn → không hiện; 11 → khối 2 + sắc thái), test giao diện Free/Premium/khách | Chỉ duyệt gộp |
| R0 | Chốt bố cục 7 phần, chữ giao diện, prompt nháp, kế hoạch chạy thử mù | `feature-plans`, `numerology-blocks.json` (nhóm `synthesisReport`), `prompt-library.json` | `validate:data` | **Duyệt prompt; duyệt lại `numerology-blocks.json`** |
| R1 | App: `buildReportPayload` + test riêng tư, màn báo cáo có mục lục và phần mờ, lưu trên máy, hàng “Báo cáo đã lưu”, hộp xác nhận, “Xuất dữ liệu”; thẻ hiện “Sắp có” khi hàm trả `feature_paused` | `aiPayload.ts`, `NumerologyReport.tsx` (mới), `NumerologyScreen.tsx`, `WhoAmI.tsx`, `backendClient.ts` | test payload không có họ tên/ngày/năm/tuổi; test giao diện | Chỉ duyệt gộp |
| R2 | Mã backend: hàm + test Deno, `_shared/numerology-payload.ts`, tuyến, hạn mức, migration (công tắc tắt, tuyến, danh sách cho phép; không bảng mới) | `supabase/functions/ai-numerology-report/*`, `model-routing.json`, `account-tier-policy.json`, `supabase/migrations/<ngày>_numerology_report.sql` | `deno test` hàm, test router (ZDR/deny, rơi model dự phòng), test hàm cũ `ai-numerology-message` vẫn xanh | Duyệt gộp (chưa áp, chưa deploy) |
| R3 | Đưa lên Singapore | — | biên nhận có hash migration, gọi không đăng nhập trả 401 | **Áp SQL** · **Deploy hàm** · **Deploy lại `admin-model-router-config`** (mỗi việc một lần) |
| R4 | Chạy thử mù 20 bộ số, đo chi phí thật, chọn model | biên bản trong `docs/release/` | trace, chi phí mỗi báo cáo | **Ngân sách chạy thử** · **chọn model** · **bật công tắc cho tài khoản thử, rồi cho tất cả** · **Data safety** |

Thứ tự khuyến nghị: H0 → H1 (giao giá trị sớm, không backend) song song R0; rồi R1 → R2 → R3 → R4. Giá gói **không** thuộc kế hoạch này (vẫn theo Play Console, chưa chốt).

## 6. Owner cần quyết

1. **Hai hệ bản đầu chỉ dùng mẫu, không AI?** Khuyến nghị: **Có** (0 chi phí, không dữ liệu rời máy, không SQL/deploy).
2. **Trục ghép Hai hệ:** nguyên tố Mặt Trời × số chủ đạo gốc (36 cặp, ~42 khối). Khuyến nghị: **Có**; Mặt Trăng × số linh hồn để v1.1.
3. **Người duyệt nội dung Hai hệ:** Owner duyệt cuối sau các agent chuyên trách như 25/11, hay chờ chuyên gia bên ngoài? Khuyến nghị: **Owner + agent** để kịp closed test, ghi rõ “chưa có chuyên gia ngoài”.
4. **Free thấy gì ở Hai hệ:** cặp chip + “Điểm gặp”, phần còn lại mờ. Khuyến nghị: **Có**, không đếm ngược.
5. **Báo cáo tổng hợp chỉ là Bản đồ số** (khớp nhãn đang hiện ở màn Premium), phần chiêm tinh để Hai hệ lo. Khuyến nghị: **Có**.
6. **Hạn mức báo cáo:** 1 báo cáo/ngày + 2 lần lỗi, app dùng lại báo cáo đã lưu khi bộ số không đổi. Khuyến nghị: **Có** (thay thế: 1 báo cáo/tuần, cần viết thêm cách đếm theo tuần).
7. **Model:** bắt đầu bằng cặp model rẻ hiện tại, chạy thử mù so với một model cỡ Haiku rồi mới chốt; ngân sách chạy thử nằm trong 5 USD/ngày đang có. Khuyến nghị: **Có**.
8. **Lưu báo cáo chỉ trên máy, máy chủ không giữ nội dung.** Khuyến nghị: **Có** (đổi lại: đổi máy thì mất báo cáo, tạo lại được).

## 7. Rủi ro và điều chưa kiểm chứng

- **Gộp số vẫn thu hẹp được ngày sinh:** số ngày sinh + năm cá nhân + đỉnh cao + thử thách không chứa ngày sinh nhưng cùng nhau loại được nhiều ngày. Giảm bằng: không gửi khoảng tuổi, không đếm chữ số, chỉ tuyến ZDR/deny, không ghi log thân yêu cầu, không lưu ở máy chủ. Giai đoạn đỉnh cao hiện tại (1–4) đang được gửi trong “Lời nhắn riêng” và để lộ khoảng tuổi rất rộng; Owner đã chấp nhận ở B1–B8.
- **Nội dung nghe chung chung:** 36 cặp dễ thành câu đúng với ai cũng được; phép thử “đổi số/đổi nguyên tố” là cổng bắt buộc. Chưa có chuyên gia ngoài.
- **Model rẻ viết tiếng Việt dài 7 phần** có thể lệch giọng hoặc vượt khung; chưa đo. Kiểm đầu ra có thể từ chối nhiều, làm tăng lỗi và chi phí.
- **Thời gian chạy:** báo cáo ~4.000 token ra có thể lâu; Supabase gói Free giới hạn 150 giây mỗi lần chạy (đã kiểm ở mục 8 PLAN), cần đo.
- **Khóa Premium của Hai hệ chỉ ở giao diện** (nội dung có trong app).
- **Chưa kiểm chứng:** chi phí thật mỗi báo cáo; chất lượng tiếng Việt; bố cục phần mờ, chữ lớn 150–200%, TalkBack và hiệu năng trên **máy Android thật**; hành vi người dùng với phần mờ; Data safety trên Play Console. Mọi điều trên giữ “chưa kiểm” cho tới khi Owner thử APK và có trace thật.
- **Đã kiểm chứng (đọc mã 28/11):** hàng “Hai hệ” đang là hàng tĩnh “Sắp có” (`WhoAmI.tsx`); hai dòng “Sắp có” ở `PaywallPanel.tsx`; `aiPayload.ts` không chứa họ tên/ngày sinh; `ai-numerology-message/handler.ts` có đủ 5 cổng trước khi đọc body; `numerology-blocks.json` và `astrology-big3.json` đều ở trạng thái `approved`; tuyến `numerology_private_message` dùng `deepseek/deepseek-v4.1-flash` → `xiaomi/mimo-v2.6-flash`, 600 token; tài khoản đang `all_premium`.

## 8. Owner quyết ngày 28/11/2026

| # | Câu hỏi | Owner trả lời | Ảnh hưởng tới kế hoạch |
|---|---|---|---|
| 1 | Hai hệ bản đầu chỉ dùng mẫu, không AI | Đồng ý | Không SQL, không deploy cho Hai hệ |
| 2 | Trục ghép | **Làm cả hai trục ngay:** nguyên tố Mặt Trời × số chủ đạo gốc **và** nguyên tố Mặt Trăng × số linh hồn | Không để Mặt Trăng sang v1.1. Khối lượng H0 tăng từ ~42 lên ~80 khối (36 cặp Mặt Trời + 36 cặp Mặt Trăng + 2 × 4 khung nguyên tố + lời mở đầu + ghi chú nguồn). Trục Mặt Trăng chỉ hiện khi cung Mặt Trăng **chắc chắn** và người dùng đã nhập họ tên (số linh hồn cần tên); thiếu thì mời nhập, không đoán |
| 3 | Người duyệt nội dung | Đồng ý Owner duyệt cuối sau các agent chuyên trách; **bỏ ghi chú “chưa có chuyên gia ngoài”** | Màn Hai hệ và trường `review.note` của tệp mới không ghi câu đó |
| 4 | Free thấy gì | Đồng ý: cặp chip + “Điểm gặp”, phần còn lại mờ, không đếm ngược | Như mục 1.1 |
| 5 | Báo cáo tổng hợp chỉ là Bản đồ số | Có | Như mục 1.2 |
| 6 | Hạn mức báo cáo | Có: 1 báo cáo/ngày + 2 lần lỗi, dùng lại báo cáo đã lưu khi bộ số không đổi | Như mục 4 |
| 7 | Model | Có: bắt đầu bằng cặp model rẻ hiện tại, chạy thử mù so với model cỡ Haiku rồi mới chốt | Như mục 4 và lô R4 |
| 8 | Lưu báo cáo chỉ trên máy | Có | Như mục 2 |

Thứ tự làm sau khi chốt: H0 (soạn ~80 khối, rà bằng `nilaza-content-review`, Owner duyệt nội dung) và H1 (màn Hai hệ) trên một nhánh; R0–R2 (chữ giao diện, prompt nháp, app và mã backend, **chưa áp SQL, chưa deploy**) trên nhánh khác. Mỗi nhánh xin Owner duyệt gộp `main` một lần.
