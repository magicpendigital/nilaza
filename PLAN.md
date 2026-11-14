# PLAN — bảng tiến độ sống của Nilaza

> **Cập nhật lần cuối: 13/11/2026** — thẻ chia sẻ + sao chép link + sự kiện chia sẻ (hàm `share-events` chờ Owner deploy); `main` đã gồm PR chia sẻ. Trạng thái Singapore xem mục 2, 4, 4b.
> Đây là **tệp đầu tiên** Owner và mọi Agent đọc khi bắt đầu phiên mới. Nó trả lời: *đang ở đâu, còn gì, chờ ai*. Lý do, quy trình và bẫy môi trường nằm ở [`docs/HANDOFF_CURRENT_STATE.vi.md`](docs/HANDOFF_CURRENT_STATE.vi.md); chi tiết từng việc nằm ở `docs/feature-plans/*.json`.

## Quy tắc cập nhật (bắt buộc với Agent)

1. **Đầu phiên:** `git fetch` rồi làm việc trên `origin/main` mới nhất (03/11 từng có thư mục làm việc tụt 84 commit so với GitHub). Đọc tệp này → chỉ mở tài liệu mà mục liên quan trỏ tới.
2. **Cuối mỗi PR / mỗi phiên:** sửa tệp này trong **cùng PR**: đổi trạng thái, thêm số PR, cập nhật "Cập nhật lần cuối". Mã mục (HO-02, AD-01…) phải khớp `docs/backlog/review-2026-10-30.json` — cập nhật `status`/`pr`/`note` ở đó luôn.
3. Chỉ ghi điều **đã kiểm chứng**; cái gì chưa thử trên máy thật/cloud thì ghi rõ "chưa kiểm".
4. Giữ tệp ngắn (≤ 200 dòng): việc xong quá 2 tuần chuyển xuống "Đã xong gần đây" rồi xóa; lịch sử đã có trong Git.

Ký hiệu: ✅ xong · 🟡 làm một phần · ⬜ chưa làm · ⛔ bị chặn (chờ Owner/cloud) · 🔍 chờ kiểm trên máy thật

## 1. Mục tiêu và quyết định đang hiệu lực

- **Mục tiêu:** bản Android **miễn phí** lên Google Play; closed test ≥ 12 người × 14 ngày (tài khoản Play cá nhân). iOS làm sau.
- AI qua **OpenRouter**, model cấu hình trong Admin, khóa chỉ ở backend. Mặc định mọi tính năng: `deepseek/deepseek-v4.1-flash` → dự phòng `xiaomi/mimo-v2.6-flash` (quyết định 02/11).
- 18+; khách xem được nội dung tĩnh; tính năng gọi AI cần đăng nhập. Mọi tài khoản đăng nhập là Premium trong closed test; nội dung Premium ghi "Sắp có".
- Ngân sách AI QA 5 USD/ngày, 50 USD/14 ngày. Hạn mức: Chat+Oracle 5/ngày, Tarot 1/ngày, Chiêm tinh AI 1/ngày, Council 1/ngày (+4 câu hỏi tiếp).
- Crisis: chỉ dùng số **115**. Tên lá: tên gốc tiếng Anh là tiêu đề, tên Việt dòng nhỏ.
- **04/11:** dự phòng LLM giai đoạn 0 được duyệt; nhà cung cấp trực tiếp ưu tiên **Anthropic → Gemini (khóa trả phí) → OpenAI → DeepSeek**; được gửi **tên gọi** người dùng cho AI trong chat; **Tarot AI 1 lượt/ngày** cho mọi tài khoản; tài khoản thử `magicpendigital@gmail.com` được đặt Premium để test.
- Backend: Supabase **Singapore** `etfajmrwyywokgafzxsb` — **đã có schema (33 migration + seed) từ 08/11**, chưa có Edge Function, khóa hay người dùng; đăng ký người mới **đang tắt**. App và Admin staging **vẫn trỏ project QA cũ** `akgrokwnkfqnfjqrildi` cho tới khi chuyển (phương án C, [phân tích](docs/release/BACKEND_ENVIRONMENT_STRATEGY_2026-11-08.vi.md)).

## 2. Giai đoạn

| GĐ | Nội dung | Trạng thái |
|---|---|---|
| 0 | Repo sạch, Vercel, CI | ✅ |
| 1 | Làm sạch Android release (manifest) | ✅ (chưa dựng AAB) |
| 2 | Backend Singapore: SQL 2a ✅ 2b ✅ **2c ✅ 08/11** (33/33 migration + seed, kiểm sau áp 10/10, Security Advisor 0 lỗi — [biên nhận](docs/release/singapore-packet-v2-2026-11-04/execution-receipt-2026-11-08.json)); Edge Function + khóa ✅ 09/11 (18 hàm, gồm `account-delete`; đăng nhập thật ES256 qua cổng ✅; Tarot AI gọi được model nhưng bị loại vì model đặt sai mã mục (`section_key`) → đã sửa bộ kiểm, deploy lại `ai-tarot-reading` v2 ✅ 10/11, smoke test ĐẠT 10/11 (Tarot AI trả lời thật, qua bộ kiểm); còn trang web xóa dữ liệu + hộp thư + bật trong app ⬜), Auth/SMTP ⬜, chặn chi phí AI 🟡 | 🟡 |
| 3 | UI/UX trước closed test (Gói A + rà soát 30/10) | 🟡 phần lớn xong, xem mục 3 |
| 4 | QA online + thiết bị + AAB đầu tiên | ⬜ chặn bởi GĐ 2 và biến EAS |
| 5 | Play Console, Data safety, store listing | ⬜ Owner |
| 6–7 | Internal → Closed (≥14 ngày) → Production | ⬜ |

## 3. Việc còn mở theo khu vực

Bảng rà soát 30/10: **107 mục — 50 xong, 24 làm một phần, 33 chưa làm** (`docs/backlog/review-2026-10-30.json`).

### App (làm được ngay, không cần backend)
- ✅ (nhánh này) Nút Oracle nổi: không còn trên Khám phá, cao 48px, chừa đệm cuối danh sách (U-A).
- ✅ (nhánh này) Thanh tab luôn giữ nhãn, chỉ ẩn khi cuộn xuống dài (U-I).
- ✅ (nhánh này) Nút 👍/👎/Lưu và nút Báo cáo mới trên từng tin nhắn persona, nút Council đạt 48px (mục 0.2 roadmap).
- ✅ (nhánh này) Tôi: tài khoản mới thấy lời mời thay vì 0/0/0 (U-F); gợi ý "Chạm để xem" ở kiểu trải chỉ hiện khi thẻ đóng (U-G).
- ✅ 11/11 TA-15 (đã sửa từ lần làm lại màn rút bài) · 🟡 CO-03 lỗi Council hiện trong phòng, trả câu hỏi về ô nhập, lịch sử gửi đi ≤ 800 ký tự ([hồ sơ](docs/feature-plans/council-inline-error-2026-11-11.json)); còn gửi mã persona thay vì cả hồ sơ (cần sửa server).
- ⬜ CH-12 bàn phím che ô nhập (cần máy Android thật) · HO-07 nối "lá hôm nay" với Tarot (cần quyết định thiết kế) · JO-08 xuất Nhật ký dạng văn bản (sau Play).
- 🟡 TA-06 đổi biểu tượng "Bắt đầu lại" · HO-04 · JO-06/07/09 · CH-14/15 · N-04 · PR-04 (chi tiết trong backlog).
- ⬜ Chữ lớn 150–200% (`maxFontSizeMultiplier`), ảo hóa danh sách dài (U-B, U-C), thang tiêu đề/placeholder/thumbnail (U-D/E/H) — Gói B.

### App (bị chặn)
- ⛔ Xóa tài khoản: giao diện đã có nhưng tắt (`accountDeleteLive=false`); hàm, trang web và hộp thư đã có — chờ app trỏ Singapore (PR-01, xem 4b).
- 🟡 Oracle gọi AI thật (OR-01, Owner đổi quyết định 11/11 — xem 4b) · ⛔ Daily AI tự chạy (HO-02) · Tarot AI mở rộng kiểu trải · Báo cáo về server (CH-02 cần deploy `ai-feedback`).
- 🔍 Chờ thử trên máy thật: Back, TalkBack, nhắc buổi sáng, chọn ngày giờ native, bàn phím, chữ lớn.

### Admin — đề xuất: [`docs/proposals/ADMIN_REDESIGN_2026-11-03.vi.md`](docs/proposals/ADMIN_REDESIGN_2026-11-03.vi.md)
- ⬜ Nghiêm trọng: AD-01 publish 1 mục đẩy toàn bộ · AD-03/06 nháp và bản publish đè nhau · AD-05 nội dung sửa ở Admin không tới AI · AD-07 không có khôi phục · AD-08 không upload ảnh · AD-09 nháp AI Studio không lưu · AD-11 chỉ prompt Chiêm tinh publish được.
- ⬜ AD-14/15, 17/18, 19, 20, 21, 23, 24/25, 28–31 (quyền, lưu, xem trước, audit, ngôn ngữ, hộp phản hồi, điều hướng).
- 🟡 AD-10 công tắc AI: Tarot, Daily, Lá số tóm tắt có migration 11/11, chờ áp · AD-26/27.

### AI / backend — đề xuất: [`docs/proposals/LLM_PROVIDERS_FALLBACK_2026-11-03.vi.md`](docs/proposals/LLM_PROVIDERS_FALLBACK_2026-11-03.vi.md)
- ⛔ **Ưu tiên chi phí/an toàn:** ~~`ai-daily-insight` và `ai-astrology-report` không bắt đăng nhập, không hạn mức~~ (đã sửa và deploy 10/11, xem 4b); ~~Chat persona và Tarot AI không có hạn mức phía server~~ (đã deploy 11/11 — xem 4b) (AI-02).
- ⬜ AI-10 Astrology report và Đọc sâu dùng chung route khác hợp đồng · AI-06 cờ không lưu dữ liệu (ZDR) chỉ có ở Chiêm tinh · AI-05 mục tiêu/giọng ghép thẳng vào system prompt · AI-03 Owner không sửa được prompt Tarot/Persona · AI-07 không chấm điểm trước khi publish · AI-04, 09, 12, 13, 15, 17, 18.
- ⬜ Dự phòng nhiều nhà cung cấp: Giai đoạn 0 (chỉ OpenRouter: `models[]`, ZDR, kiểm định dạng trong bộ định tuyến) → 1 → 2 → 3.

## 4. Đang chờ Owner (mỗi mục một quyết định)

1. **Tiếp theo trên Singapore (mỗi việc một lần duyệt):** (a) ✅ **09/11: 18 Edge Function ACTIVE + khóa OpenRouter mới** ([biên nhận](docs/release/singapore-edge-functions-2026-11-09/deploy-receipt-2026-11-09.json)); gọi không đăng nhập đều bị từ chối. Chưa kiểm: phiên đăng nhập thật qua cổng (cần tài khoản thử) và lần gọi model đầu tiên; (b) deploy `account-delete`; (c) Auth/SMTP qua Resend rồi bật lại đăng ký; (d) chuyển Admin staging + EAS sang Singapore, đóng băng QA cũ; (e) nâng tổ chức lên Pro (~25 USD/tháng) trước khi mời người thử thật. [Phân tích phương án](docs/release/BACKEND_ENVIRONMENT_STRATEGY_2026-11-08.vi.md).
2. Owner tự làm: gắn 3 biến `EXPO_PUBLIC_*` vào EAS production (đã đồng ý 04/11) → dựng AAB đầu tiên; tuyển ≥ 12 (nên 15–20) người thử.
3. Bộ thiết kế Admin chi tiết (19 màn): PR #32 (đã merge vào nhánh release 11/11) + [đặc tả](docs/proposals/ADMIN_SCREENS_SPEC_2026-11-04.vi.md) + canvas <https://claude.ai/artifact/JfSTk3fKJANL1T8Ptcxo9k>. Owner đã chốt 04/11: gộp Astrology report vào Đọc sâu; Daily bỏ toàn văn Nhật ký; tâm trạng chỉ dùng nếu ghi trong 24 giờ; dự phòng đắt hơn được, trần 0,02 USD/lượt; biên tập viên chỉ lưu nháp, Owner phát hành. Cổng phát hành theo mục 5.1 của đặc tả (duyệt 04/11): không bỏ qua lớp an toàn; chỉ Owner bỏ qua lớp chất lượng khi khôi phục hoặc sửa khẩn cấp, gắn nhãn "Chưa chấm" và chấm lại trong 24 giờ. **Còn chờ:** các con số độ dài (đội biên tập).

4. **Lô 11/11 (PR #31):** (a) ✅ 2 migration `20261111090000` + `20261111090100` có trên Singapore (đọc danh sách migration 11/11, 35 bản); (b) ✅ 6 hàm AI deploy lại 11/11 14:44–14:46 (`ai-persona-chat` v3, `ai-tarot-reading` v4, `ai-council` v2, `ai-astrology-insight` v2, `ai-daily-insight` v2, `ai-astrology-report` v2); (c) ✅ smoke test ĐẠT 11/11 (đăng nhập ES256, user-credits 200, Tarot AI trả lời thật qua bộ kiểm, 15 s); (d) ✅ hòm thư hỗ trợ magicpendigital@gmail.com ghi vào trang xóa tài khoản (website chưa deploy lại); (e) ✅ thử trên điện thoại thật 11/11 (Air1 Ultra, Android 13, APK release dựng tại máy trỏ Singapore, cài đè 0.1.3 không mất dữ liệu): Tarot lần 2 trong ngày bị máy chủ chặn và app báo "hết lượt" tại chỗ; chat gọi "Magicpendigital"; tin thứ 6 bị chặn có lời báo, tin vẫn giữ; bàn phím không che ô nhập (CH-12); Hội đồng khi bật chế độ máy bay trả câu dự phòng có nhãn "AI chưa kết nối được" (không hiện thông báo lỗi CO-03). Việc nhỏ cần sửa: ẩn nút "Thử lại" khi lý do là hết lượt; câu dự phòng Hội đồng có chữ "Bước" viết hoa giữa câu. Chưa thử: Daily (cần ngày sinh), Hội đồng hết lượt.

## 4b. Đã duyệt 04/11, đang chờ làm (lát cắt backend tiếp theo)

- ✅ Bắt buộc đăng nhập + hạn mức 3 lần/ngày (Owner chốt 10/11) + công tắc cho `ai-daily-insight` và `ai-astrology-report` ([hồ sơ](docs/feature-plans/ai-daily-report-guard-2026-11-10.json)): **đã deploy Singapore 10/11**, đọc lại ACTIVE, gọi không đăng nhập trả 401 ([biên nhận](docs/release/singapore-edge-functions-2026-11-09/deploy-receipt-2026-11-09.json)). Chưa thử: lần gọi thứ 4 trong ngày bị chặn 429 trên app. Dòng công tắc: migration `20261111090000` chờ áp.
- 🟡 Daily chỉ gửi nhãn tâm trạng ghi trong 24 giờ, không gửi tiêu đề/lời Nhật ký ([hồ sơ](docs/feature-plans/daily-mood-only-2026-11-11.json)): code + test xong 11/11, **chờ deploy `ai-daily-insight`** và bản AAB tới.
- ⬜ Chuyển lối vào Astrology report sang Đọc sâu rồi tắt hàm cũ (đặc tả PR #32).
- 🟡 Dự phòng LLM giai đoạn 0 ([hồ sơ](docs/feature-plans/llm-fallback-phase0-2026-11-11.json)): ZDR + không thu thập dữ liệu cho mọi tính năng (cả 2 model mặc định có endpoint ZDR, kiểm 11/11); Tarot trả sai định dạng thì thử model dự phòng 1 lần; giữ mã lỗi nhà cung cấp; tách lỗi mạng khỏi hết giờ; khóa Gemini sang header. Code + 36 test xong 11/11, **chờ Owner deploy lại các hàm AI**. Không dùng `models[]` trong 1 yêu cầu (bộ định tuyến đã gọi chính → dự phòng tách riêng, dễ truy vết) — xem lại ở giai đoạn 1.
- 🟡 Oracle AI dạng công cụ ([hồ sơ](docs/feature-plans/oracle-ai-tools-2026-11-11.json), Owner yêu cầu 11/11): `ai-oracle-turn` gọi model `oracle_router` (OpenRouter ZDR); model viết 2–4 câu và chọn tối đa 2 công cụ (Trải bài, Hỏi một người dẫn, Hội đồng, Lá số, Nhật ký, Soi tiếp) — máy chủ chỉ nhận công cụ đang bật trong `oracle-actions.json` và tham số trong danh sách cho phép; dùng chung công tắc Chat và 5 lượt/ngày; câu khủng hoảng vẫn tĩnh, không gọi model; hai model đều hỏng → 503, app báo "chưa trả lời được". App: đăng nhập thì gọi AI, thẻ thành nút gọn một dòng (nút đầu nổi bật), dòng giới thiệu ghi "Oracle là AI". 22 test Deno + 459 test app + tsc + validate:backend + admin:check đạt. Owner deploy v2 ngày 12/11 (ACTIVE, gọi không đăng nhập 401); thử trên APK mới: lỗi hiện đúng lời báo, nhưng trace (Owner duyệt, chỉ cột kỹ thuật) cho thấy cả 2 model trả lời 307/209 ký tự mà bộ đọc không nhận → 503. Đã sửa: hợp đồng công cụ đặt trước lời nhắc gốc và nhắc định dạng ở cuối; bộ đọc nhận tên khóa tương đương, văn xuôi thành câu trả lời không nút; 24 test Deno đạt. ✅ Owner deploy v3 12/11, đọc lại ACTIVE; **thử trên điện thoại ĐẠT**: AI trả lời đúng ý câu hỏi tình cảm, tự chọn 2 nút (Trải bài, Hỏi một người dẫn), nút mở đúng The Love Oracle kèm câu chuyện ([biên nhận](docs/release/singapore-edge-functions-2026-11-09/deploy-receipt-2026-11-09.json)). Chưa thử: câu khủng hoảng trong Oracle trên máy, chất lượng chọn công cụ qua nhiều câu. Lỗi có sẵn chưa sửa: `ai-operations:test` (2 test Tarot, 2 test SQL).
- 🟡 Mất mạng/AI bận không còn trả câu soạn sẵn ([hồ sơ](docs/feature-plans/ai-unavailable-notice-2026-11-11.json), Owner yêu cầu 11/11 sau lần thử trên máy): Chat và Hội đồng báo "Đường truyền đang gián đoạn, kiểm tra Internet", "chưa trả lời được, thử lại sau ít phút" hoặc "đăng nhập lại"; giữ tin nhắn/câu hỏi; câu khủng hoảng vẫn trả lời trên máy kèm 115; hết lượt hoặc tạm nghỉ không hiện nút Thử lại. 457 test app + tsc đạt; ✅ thử trên điện thoại 12/11 (chế độ máy bay): Chat và Hội đồng đều báo "Đường truyền đang gián đoạn…", giữ tin/câu hỏi, không còn câu soạn sẵn. Tarot vẫn dùng ý nghĩa lá từ thư viện; Daily/Chiêm tinh chưa đổi.
- ✅ Hạn mức phía server ([hồ sơ](docs/feature-plans/ai-chat-tarot-daily-limit-2026-11-11.json)): Chat persona 5 tin/ngày; Tarot AI 1 bài đạt/ngày (AI lỗi thì được thử lại, tối đa 3 lần/ngày). **Đã deploy Singapore 11/11** (`ai-persona-chat` v2, `ai-tarot-reading` v3, đọc lại ACTIVE, gọi không đăng nhập trả 401). ✅ Đã thử trên điện thoại 11/11: tin thứ 6 và bài Tarot thứ 2 bị chặn, app báo "hết lượt" (mục 4e). Phần app ✅ 11/11 ([hồ sơ](docs/feature-plans/app-daily-limit-messages-2026-11-11.json)): Chat và Tarot báo "hết lượt hôm nay" thay vì nội dung dự phòng; bộ đếm Tarot của app về 1/ngày; 451 test app đạt — đã thấy đúng trên APK thử 11/11, có hiệu lực cho người dùng từ bản AAB tới. Chưa có đếm lượt chat còn lại.
- 🟡 Chia sẻ để lan truyền ([hồ sơ 1](docs/feature-plans/share-card-growth-2026-11-12.json), [hồ sơ 2](docs/feature-plans/share-events-clipboard-2026-11-12.json), [bàn giao](docs/release/share-events-2026-11-12/SHARE_EVENTS_HANDOFF.vi.md)): thẻ ảnh cho lá hôm nay, trải bài, Big 3; lời mời so Mặt Trời (trang web `/share`, `/compare`); **Chia sẻ ảnh sao chép sẵn link** (expo-clipboard); app gửi `share_tapped`/`share_completed` lên hàm mới `share-events` (ghi `usage_events`, **không có SQL mới**). Code + test xong 12/11 (mobile 497/497, Deno 9/9, validate:backend đạt). **Chờ Owner deploy `share-events`** (lệnh trong bàn giao) và deploy lại website cho 2 trang mới. Bản Android 0.1.3 (versionCode 4) đã dựng và cài đè lên Air1 Ultra thành công (13/11). Chưa kiểm: hàm trên project thật; đã thử chia sẻ lá bài hôm nay trên máy (ảnh, sao chép link, gửi kèm link; đã sửa lỗi chồng chữ thẻ); chưa thử bài đọc Tarot, Thiên văn — xem bàn giao mục 7.
- 🟡 Gửi tên gọi cho AI trong chat persona (CH-13, [hồ sơ](docs/feature-plans/chat-nickname-2026-11-11.json)): code + test xong 11/11, câu ở Hồ sơ đã sửa; **chờ deploy `ai-persona-chat`** và bản AAB tới. Data safety/chính sách riêng tư cần ghi "tên gọi gửi cho nhà cung cấp AI".
- ⬜ Đặt `magicpendigital@gmail.com` là Premium trên project đang chạy QA (một câu SQL — sẽ đưa lệnh để Owner xác nhận).
- 🟡 Xóa tài khoản: `account-delete` ✅ ACTIVE trên Singapore 09/11; trang web `/vi|en/account-deletion` ✅ 11/11 ([hồ sơ](docs/feature-plans/web-account-deletion-page-2026-11-11.json), astro check + build đạt, chưa deploy website); hộp thư hỗ trợ magicpendigital@gmail.com ✅ 11/11; còn: deploy lại website và bật `accountDeleteLive` khi app trỏ Singapore.
- 🟡 Migration chờ Owner áp lên Singapore ([hồ sơ](docs/feature-plans/switches-vector-migration-2026-11-11.json)): `20261111090000` thêm công tắc cho Tarot AI, Daily, Lá số tóm tắt (Admin thấy 6 công tắc; Tarot AI giờ tôn trọng công tắc) và `20261111090100` chuyển extension `vector` sang schema `extensions` (cảnh báo Security Advisor 08/11). Đã chạy thử trên PGlite (Postgres 17) 11/11 — chưa chạy trên Supabase. Hai cảnh báo hàm SECURITY DEFINER của công tắc AI được chấp nhận (hàm tự kiểm quyền `ai.read`/`ai.manage`).

## 5. Đã xong gần đây (31/10 – 08/11)

08/11: **Bước 2c xong** — Owner chạy `db push` gói v2 lên Singapore; Local = Remote 33/33, 78 lá Tarot, mọi bảng public bật RLS, client không TRUNCATE/không gọi hàm xóa tài khoản, 0 người dùng; Security Advisor 0 lỗi, 3 cảnh báo đã đánh giá.

04/11 (PR #31): skills được rà soát — `nilaza-plan-qc` 1.6.0, thêm `nilaza-ai-runtime`, skills cài cho cả Claude Code lẫn Codex ([đánh giá](docs/SKILLS_REVIEW_2026-11-04.vi.md)); thư mục `project-template/` cho dự án khác (Owner đã chuyển ra khỏi repo 08/11); gói SQL v2 chạy thử PASS.


PR #9–#30: Home "Hôm nay" (lá hôm nay, ghi chú, nhịp 30 ngày, Bước tiếp theo), chế độ khách, Tarot làm lại theo thiết kế (dock kết quả, Học lá, tên lá gốc + Việt), Nhật ký/Tôi/Đăng nhập theo thiết kế, Chiêm tinh (hub, Big 3, so sánh với người khác, Đọc sâu AI), Chat hub + Council (cuộn tới tin mới, báo cáo, 115), bộ lọc khủng hoảng chung, công tắc AI, Admin (xác nhận thao tác nguy hiểm, chặn trùng ID, môi trường), OpenRouter-only + DeepSeek/Xiaomi, sửa Tarot/Chiêm tinh AI theo live QA (bỏ JSON mode, chờ 60 s, chẩn đoán). Kiểm chứng: mobile 449/449 test, tsc (03/11, máy local).

## 6. Bản đồ tài liệu (chỉ mở khi cần)

| Cần | Đọc |
|---|---|
| Quyết định, bẫy môi trường, việc cấm tự làm | `docs/HANDOFF_CURRENT_STATE.vi.md` mục 2, 6, 7 |
| Sửa ở đâu, kiểm bằng lệnh nào | `docs/AGENT_TASK_ROUTER.md` |
| Cổng Plan & QC, preflight | `docs/PLAN_QC_PROTOCOL.md`, `docs/feature-plans/` |
| Danh sách 107 mục rà soát + trạng thái | `docs/backlog/review-2026-10-30.json` |
| Lộ trình Google Play | `docs/release/GOOGLE_PLAY_ROADMAP_AND_UX_REVIEW_2026-10-23.vi.md` |
| Gói backend Singapore | `docs/release/singapore-backend-readiness-2026-10-25/`, bản v2: `docs/release/singapore-packet-v2-2026-11-04/` |
| Skill nào cho việc gì | `docs/SKILLS_REVIEW_2026-11-04.vi.md` |
