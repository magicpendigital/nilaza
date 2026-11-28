# Bàn giao: chia sẻ Bản đồ số, chia sẻ Bầu trời hôm nay và trang mở link chia sẻ mới (28/11/2026)

Nhánh `claude/share-numerology-landing`, cắt từ `origin/main` fb847f6. Hồ sơ: `docs/feature-plans/share-numerology-landing-2026-11-28.json`. Đề xuất gốc Owner đã duyệt: `docs/proposals/SHARE_LANDING_REVIEW_2026-11-24.vi.md` (Bước A + phần máy chủ của Bước B).

Chưa push, chưa mở PR, chưa deploy. `PLAN.md` do phiên chính cập nhật.

## 1. Vì sao chia sẻ Bản đồ số bị hỏng (nguyên nhân gốc)

1. Trong app, danh sách "chỗ chia sẻ được ghi nhận" (`shareEvents.ts`) thiếu `numerology_map`, nên khi người dùng chia sẻ Bản đồ số, app lặng lẽ bỏ sự kiện, không gửi lên máy chủ.
2. Nếu có gửi, máy chủ (`share-events`) cũng từ chối cả lô (lỗi 400) vì danh sách của máy chủ cũng thiếu `numerology_map`.
3. Link chia sẻ Bản đồ số mở `/vi/share`, trang này chỉ có lời lẽ về Tarot; và trang web bỏ mất tên "chỗ chia sẻ", nên số liệu "mở link" và "đăng ký từ link" ghi nhận chỗ chia sẻ là trống.
4. Không cần sửa cơ sở dữ liệu: cột lưu là dữ liệu tự do (jsonb), không có ràng buộc → **không có migration**.

## 2. Đã làm gì

**Máy chủ (`supabase/functions/share-events`)**: thêm `numerology_map` và `daily_sky` vào danh sách được nhận. Tên lạ hoặc gần giống vẫn bị từ chối. Danh sách của web, app và máy chủ giờ giống hệt nhau (có bài kiểm tự động so ba nơi).

**App**
- Bản đồ số: sự kiện chia sẻ giờ được gửi; link mở `/vi/share/numbers`, **không** mang tên, ngày sinh hay con số nào.
- Bầu trời hôm nay: thêm nút **"Chia sẻ bầu trời hôm nay"** ở cuối màn hình (Khám phá → Chiêm tinh → Bầu trời hôm nay). Thẻ chỉ có bầu trời chung của ngày (Trăng ở cung nào, pha trăng, dòng của ngày), không có bản đồ sao riêng, cung Mặt Trời, ngày sinh hay tên — kể cả khi người dùng đã nhập giờ sinh (có bài kiểm). Link chỉ mang 4 giá trị công khai: cung của Trăng, chặng (đầu/giữa/cuối), pha trăng, ngày.

**Trang web (apps/web)** — một khung chung, bốn biến thể, mỗi biến thể có trang tĩnh và tiêu đề/mô tả xem trước (Zalo, Messenger) riêng:
- `/vi/share/card`, `/vi/share/reading` (Tarot): hình lá bài thật của bộ Moon Garden (ảnh nhỏ webp, lớn nhất ~15,5 KB), 3 từ khóa, một câu hỏi soi chiếu; nút **"Rút lá của bạn"** rút ngay trên trình duyệt, không gửi gì đi.
- `/vi/share/numbers` (Bản đồ số): người xem nhập ngày sinh → tính số chủ đạo ngay trên trình duyệt bằng đúng hàm tính của app → hiện một đoạn đã được Owner duyệt (bộ `2026-11-25-approved1`). Có dòng nói rõ ngày sinh không được gửi đi. Ngày sinh không vào link, không vào số liệu.
- `/vi/share/sky` (Bầu trời): hiện dòng bầu trời của ngày được chia sẻ + lời mời.
- `/vi/share` cũ vẫn chạy cho các link đã gửi: tự chọn biến thể theo `utm_campaign`.
- Một nút hành động duy nhất: **"Đăng ký thử bản Android"** (danh sách chờ). Khi có link Google Play, chỉ cần điền `shareCtaConfig.playStoreUrl` trong `apps/web/src/lib/shareCta.ts` là nút đổi thành nút Google Play (chỉ nhận link đúng dạng `https://play.google.com/store/apps/details?id=...`).
- Dải tin cậy: "Tính ngay trên máy của bạn", "Để tự soi chiếu, không là lời dự đoán", "Dành cho người từ 18 tuổi", link Chính sách và An toàn. Không có số đếm giả, lời khen giả hay đếm ngược.
- Trang so bản đồ sao (`/compare`) dùng cùng nút và dải tin cậy.
- Số liệu: giữ `share_link_opened`, `waitlist_cta_click`, `signup_from_share`; thêm `share_landing_try` chỉ mang tên biến thể (bài kiểm chứng minh ngày sinh/số/lá bài bị loại bỏ dù có truyền vào).

## 3. Đường đi đầu-cuối (sau khi sửa)

App: bấm chia sẻ → thẻ ảnh + link `https://…/vi/share/numbers?utm_source=share&utm_medium=card&utm_campaign=numerology_map&utm_content=<mã ngẫu nhiên>` → app gửi `share_tapped`/`share_completed` (surface `numerology_map`) lên `share-events` → bảng `usage_events`. Người nhận mở link → trang `numbers` → `share_link_opened` (surface, variant) → thử tính số → `share_landing_try` → bấm đăng ký → `waitlist_cta_click` → gửi email → `signup_from_share`.

## 4. Trang web được đưa lên mạng thế nào (chỉ đọc, không đổi gì)

- Vercel chỉ phục vụ trang quản trị Admin, **không** phục vụ trang web công khai.
- `apps/web` có lệnh tay `npm --workspace apps/web run deploy:staging` = `wrangler pages deploy dist --project-name nilaza-web-staging --branch main` (Cloudflare Pages). Không có workflow GitHub nào tự deploy trang web.
- Theo `docs/NILAZA_DOMAIN_SETUP_2026-10-04.vi.md`, dự án Cloudflare này **chưa được chứng minh là có thật** trên tài khoản. → Push vào `main` **không** tự cập nhật trang web công khai (nhưng vẫn tự deploy Admin staging).

## 5. Đã kiểm chứng / chưa kiểm chứng

**Đã kiểm chứng (trên máy, 28/11/2026)**
- Máy chủ share-events (Deno): 19/19 đạt.
- App: TypeScript 0 lỗi; jest — xem số ở báo cáo cuối của phiên (bài kiểm chia sẻ, Bầu trời hôm nay đều đạt).
- Trang web: `web:check` 0 lỗi/0 cảnh báo; `web:build` đạt (56 trang, có 8 trang chia sẻ mới); bài kiểm trang chia sẻ 19/19 đạt; ảnh lá bài 78 tệp đều < 30 KB.
- `validate:data`, `validate:backend`, `validate:public-content` đạt.
- Mở bản build trên trình duyệt ở bề ngang 375px: tính số (1990-11-29 → số 5), rút lá, bầu trời (Trăng ở Kim Ngưu, Trăng tròn · 24/11/2026), link `/vi/share` cũ, trang so bản đồ sao — đều hiện đúng, không tràn ngang, link không đổi sau khi nhập ngày sinh, sự kiện chỉ mang biến thể.

**Chưa kiểm chứng**
- Trên điện thoại thật; xem trước link thật trên Zalo/Messenger.
- Máy chủ thật: `share-events` **chưa được deploy lại** → hiện máy chủ vẫn từ chối `numerology_map` và `daily_sky` (app gửi kiểu "bắn rồi quên" nên người dùng không thấy lỗi, chỉ là thiếu số liệu).
- Trang web chưa được đưa lên mạng.
- `validate:brand` **báo lỗi có sẵn từ `main`** (checksum `assets/brand/open-reflection/v1/source/geometry.json`); nhánh này không đụng tới tệp đó (hash tệp trùng với HEAD). Không sửa hash để che lỗi.

## 6. Cần Owner duyệt (phiên chính làm, không phải phiên này)

1. Deploy lại Edge Function `share-events` (để máy chủ nhận hai chỗ chia sẻ mới).
2. Đọc và duyệt nội dung `packages/content/data/astrology-daily-sky.json`: tệp vẫn ghi trạng thái **nháp** (AI soạn, Owner chưa đọc), nhưng dòng của ngày sẽ hiện công khai trên thẻ chia sẻ và trang `/share/sky`. Nên duyệt trước khi đưa trang web lên mạng.
3. Đưa trang web lên mạng (Cloudflare Pages, cần xác nhận dự án có thật).
4. Khi có link Google Play: điền `shareCtaConfig.playStoreUrl`.
5. Xác nhận cách ghi "Dành cho người từ 18 tuổi".
6. Duyệt commit → merge → push vào `main` (nhắc: mỗi push lên `main` tự deploy Admin staging).

## 7. Rủi ro còn mở

- Lỗi checksum thương hiệu có sẵn trên `main` (mục 5).
- Form danh sách chờ (có sẵn) còn chữ "sẽ" trong lời lẽ cũ; không sửa ở đây.
- Trang `/share` cũ cần JavaScript để chọn biến thể; trang riêng từng biến thể thì không.
- Hình lá bài in tên tiếng Anh trên tranh.
- Trang `/compare` (có sẵn) dùng lớp `.status` trùng với kiểu "viên thuốc" chung của trang, có thể hiện một vòng tròn nhỏ dưới dòng riêng tư; trang chia sẻ mới đã tránh lỗi này (`.try-status`), `/compare` chưa sửa.
- Ngày trong link Bầu trời là dữ liệu công khai (ngày của bầu trời), không phải ngày sinh.
- Cách tính chặng/pha giữa app và web dùng cùng danh sách, nhưng múi giờ của người gửi quyết định ngày ghi trong link.
