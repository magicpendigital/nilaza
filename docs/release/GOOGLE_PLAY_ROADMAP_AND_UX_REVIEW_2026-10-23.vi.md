# Nilaza — hiện trạng, đánh giá UI/UX và kế hoạch lên Google Play

Ngày 23/10/2026, Asia/Bangkok. Mục tiêu phase tiếp theo: **đưa bản Android lên Google Play**; iOS làm sau khi Android thành công (theo quyết định Owner 16/10). Tài liệu này là báo cáo đánh giá và kế hoạch, **không** cấp quyền chạy SQL, retarget, đổi key hay phát hành.

**Nguồn bằng chứng** — đọc lần này: tài liệu release 04–21/10, board MVP remediation (02/10), các audit UX 14/09–14/10 và 30/09, cấu hình Android/EAS/manifest trong source, theme token. **Quan sát trực tiếp hôm nay:** chạy Expo web ở khung 390×844, chế độ local (không backend, không dotenv), tài khoản giả; xem Welcome → Đăng ký → Mục tiêu → Home → Khám phá → Tarot (chủ đề, kiểu trải) → Nhật ký → Hồ sơ. Đây **không phải** nghiệm thu trên điện thoại: chữ lớn, TalkBack, Back, bàn phím, hiệu năng native vẫn chưa quan sát.

---

## 0. Quyết định của Owner (23/10/2026) và tác động lên kế hoạch

| # | Quyết định | Tác động |
|---|---|---|
| 1 | Tài khoản Play **cá nhân, tạo sau 13/11/2023** | **Bắt buộc closed test: 12 người thử, liên tục ≥14 ngày**, rồi mới xin production access. Đây là đường găng cứng. |
| 2 | Bản đầu **miễn phí**, chưa bán Premium | Không cần RevenueCat/purchase/restore. Mọi chỗ ghi “Premium” trong UI phải được hiểu là “sắp có”, không chặn tính năng đã mở. |
| 3 | AI qua **OpenRouter**; model cấu hình trong trang quản trị | Dùng route sẵn có trong Admin; khóa OpenRouter chỉ nằm ở backend. Còn thiếu **trần chi phí** (xem mục 7). Cần chọn model/nhà cung cấp **không dùng prompt để huấn luyện** (xem mục 0.2). |
| 4 | **Council và Astrology AI nằm trong bản Play đầu** | Mở rộng phạm vi: các task R14–R17, R21 (chưa bắt đầu) trở thành điều kiện phát hành; thêm đường quyền cho người dùng miễn phí (hiện Astrology AI đòi entitlement Premium). Thời gian tăng khoảng **2 tuần** (xem mục 6). |
| 5 | **18+**; chưa đăng nhập xem được nội dung tĩnh, nội dung chạy AI yêu cầu đăng nhập | Cần thêm **chế độ khách** (hiện app auth-first). Khai báo đối tượng 18+ trong Play Console. |
| 6 | Tắt Auto Backup (`allowBackup=false`) | Làm trong giai đoạn 1. |
| 7 | Nhờ tôi phân tích và chọn | Đề xuất ở mục 0.1: **tạo repo mới sạch từ snapshot allowlist, giữ repo cũ làm bản lưu trữ**. Cần Owner duyệt thao tác cụ thể trước khi tôi làm. |
| 8 | Tìm người thử sau | Chấp nhận, nhưng cần **đủ ≥12 người (nên 15–20 để dự phòng) trước khi bản closed test được duyệt, dự kiến tuần 5–6**. |

### 0.1 Phân tích và lựa chọn cho câu 7 (chuyển nguồn an toàn)

**Dữ kiện đã kiểm hôm nay (chỉ đọc metadata, không mở nội dung tệp):**
- Repo `magicpendigital/nilaza` là **private**, 1 collaborator, 0 fork, 0 Actions secret, 29 nhánh, 27 PR (21 mở, phần lớn nhánh `jules-*`/test-coverage tự sinh).
- Lịch sử **đã chứa hồ sơ trình duyệt Chrome QA**: commit `9f7db54` (31/08/2026, “from lenovo laptop”) thêm `.codex-chrome-rose-qa/` gồm các tệp tên `Login Data`, `Cookies`, `History`, `Web Data`, `Local Storage`; còn 3 thư mục `.codex-ui-audit-chrome*`. Cả `origin/main` lẫn nhánh hiện tại **đã có** các tệp này, và **1.360 tệp hồ sơ vẫn đang được theo dõi ở HEAD**. `.gitignore` chỉ chặn `.brand-work/` và `.cache/`, chưa chặn các thư mục này.
- `.git` nặng ~3 GB (pack 2,15 GB) vì có cả mô hình `.tflite` 36 MB ×2, `.wasm`, `.zip` 35 MB nằm trong các hồ sơ đó.
- Cây nguồn thật (không tính hồ sơ trình duyệt) có ~6.320 tệp. HEAD cục bộ = `235f03a` = tip của nhánh remote; **726 thay đổi chưa commit**, nên ứng viên `ab597f4` không nằm trên remote.

**Hệ quả:** vấn đề không còn là “có nên đẩy lịch sử lên không” — lịch sử bẩn **đã ở trên GitHub (private)**. Các tệp Login Data/Cookies của Chrome thường được mã hóa gắn với tài khoản Windows, nên rủi ro đọc trực tiếp thấp, nhưng tôi không kiểm được nội dung và không nên giả định an toàn.

| Phương án | Ưu | Nhược | Đánh giá |
|---|---|---|---|
| **A. Giữ repo, chỉ `git rm --cached` + `.gitignore`** | Nhanh, không phá gì | Lịch sử và 21 PR vẫn giữ nguyên các tệp; repo ~3 GB làm chậm clone/CI/EAS; không giải quyết nguyên nhân | Chỉ là bước tạm |
| **B. Repo mới từ snapshot allowlist, repo cũ đổi tên và lưu trữ** | Repo phát hành sạch hoàn toàn (không lịch sử bẩn, không PR cũ), nhỏ, clone/CI nhanh; dùng lại công cụ allowlist đã có (từ chối hồ sơ trình duyệt, `.env`, key); repo cũ giữ nguyên làm bản sao lưu, không mất gì | Mất lịch sử chi tiết trong repo mới (giữ ở repo cũ); phải nối lại Vercel Admin (1 project) và CI; 0 Actions secret nên không phải tạo lại bí mật | **Khuyến nghị** |
| **C. Viết lại lịch sử tại chỗ (`git filter-repo`) rồi force-push** | Giữ tên repo, liên kết Vercel | Phải viết lại 29 nhánh; force-push `main` là thao tác phá hủy; `refs/pull/*` của 27 PR và cache GitHub vẫn giữ đối tượng cũ cho đến khi GitHub Support dọn; rủi ro hỏng repo 3 GB | Không khuyến nghị |

**Tôi chọn B.** Lý do: giá trị của lịch sử commit cũ thấp (tiêu đề kiểu “from lenovo laptop”, “Update 16-09-26”), trong khi Play không cần nó; B là phương án duy nhất loại bỏ hẳn hồ sơ trình duyệt khỏi repo phát hành; và nó khớp với cơ chế allowlist/hash đã chuẩn bị ngày 18–20/10.

**Trình tự B (mỗi bước cloud cần Owner duyệt riêng):**
1. *(local, không cần duyệt)* Sao lưu cây làm việc hiện tại ra thư mục ngoài repo (loại hồ sơ trình duyệt và `.env*`), ghi hash.
2. *(local)* Hợp nhất: lấy cây của ứng viên `ab597f4` làm nền, đối chiếu với 726 thay đổi trong root để bắt các sửa đổi sau ngày 19/10; chốt **một cây nguồn chuẩn**, chạy lại kiểm tra local và ghi inventory/hash.
3. *(Owner duyệt)* Đổi tên repo cũ thành `nilaza-legacy` (private, giữ nguyên, tắt liên kết Vercel/Actions), tạo repo `nilaza` mới (private), đẩy **một nhánh `main` chỉ có 1 commit khởi đầu** từ cây chuẩn + `.gitignore`/`.easignore` mở rộng (`.codex-*`, `.brand-work`, `.cache`, `*.keystore`, `.env*`, profile/leveldb).
4. *(Owner duyệt)* Nối lại Vercel Admin vào repo mới (nhánh Preview chỉ chạy theo quy tắc đã lưu 21/10), chạy CI online đúng commit.
5. **Việc Owner nên làm song song, bất kể phương án:** đăng xuất/thu hồi phiên của các tài khoản từng đăng nhập trong các Chrome profile QA (Google, GitHub, Vercel, Supabase, ChatGPT nếu có) và đổi mật khẩu nơi cần. Tôi không đọc được nội dung nên không thể liệt kê chính xác.
6. Sau khi bản phát hành đầu lên Play và repo mới ổn định, mới cân nhắc xóa repo cũ. Không xóa trước.

### 0.2 Việc phát sinh từ các quyết định 3–5 (tôi đề xuất mặc định, Owner có thể đổi)

- **OpenRouter:** (a) giữ khóa chỉ ở backend; (b) trong cài đặt OpenRouter bật “không lưu/không huấn luyện từ prompt” và chọn model/nhà cung cấp phù hợp, **tránh model “:free” có điều khoản dùng dữ liệu để huấn luyện** cho nội dung nhật ký/giờ sinh của người dùng 18+; (c) nếu dashboard cho đặt hạn mức tín dụng cho từng key thì đặt làm trần cứng ngoài lớp chặn trong backend; (d) Data safety phải khai “chia sẻ dữ liệu với nhà cung cấp xử lý AI”.
- **Hạn mức dùng AI cho bản Play (mở rộng R00):** Tarot 1 lá/ngày; Chat + Oracle dùng chung 5 lượt/ngày (đã duyệt). **Đề xuất thêm:** Astrology AI 1 lượt/ngày, Council 1 lượt/ngày; tất cả đi qua quota + kill switch. Cần đường **entitlement cấp cho người dùng miễn phí** thay vì khóa Premium (U18).
- **Điều kiện “khóa phát hành” cho Astrology AI/Council:** vì đã chốt đưa vào bản đầu, mỗi tính năng phải đạt rubric grounding/an toàn (R15/R17/R21) trước closed test. Giữ **công tắc tắt trong Admin**: nếu tới tuần 6 chưa đạt, ẩn tính năng đó khỏi bản Play thay vì hoãn cả phát hành.
- **Chế độ khách (đề xuất phạm vi):** cho xem thư viện Tarot 78 lá, giới thiệu bộ bài, 12 cung/thần thoại, hướng dẫn, Trợ giúp; Welcome thêm lối “Xem trước nội dung”. Mọi thứ **gọi model AI** (Oracle, Chat, giải Tarot AI, Astrology AI, Council), **Nhật ký, hồ sơ, lá số lưu, thông báo** yêu cầu đăng nhập với thông điệp rõ ràng. Cần phạm vi lưu trữ riêng cho khách (không lẫn với dữ liệu tài khoản).
- **18+:** xác nhận “Tôi từ 18 tuổi trở lên” khi tạo tài khoản (không thu ngày sinh); đối tượng mục tiêu 18+ trong Play Console; điều khoản ghi rõ.
- **Chính sách nội dung AI của Play:** ứng dụng sinh nội dung bằng AI phải có **báo cáo/gắn cờ nội dung ngay trong app** ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/13985936)). Nilaza đã có FeedbackPanel và nút phản hồi trên tin nhắn persona; cần **kiểm chúng có mặt ở Oracle, Chat, Tarot AI, Astrology AI, Council** và đủ vùng chạm 48px (hiện nút phản hồi persona chỉ 14px — U/M06).

---

## 1. Kết luận ngắn

| Câu hỏi | Trả lời |
|---|---|
| Đã sẵn sàng lên Google Play chưa? | **Chưa.** Chưa có AAB ký đúng, chưa có backend production đúng đích, chưa có luồng xóa tài khoản cloud, chưa nghiệm thu trên máy thật. |
| Phần mềm đã tốt đến đâu? | Nền tảng khá chắc: 327/327 test mobile, 176/176 Admin, 34/34 hạng mục kiểm local PASS trên commit ứng viên. Giao diện nhất quán, cao cấp, hành động chính rõ. |
| Điều gì chặn lâu nhất? | (1) **Closed test 14 ngày với 12 người** nếu tài khoản Play là cá nhân tạo sau 13/11/2023 — đây là thời gian không rút ngắn được; (2) backend Singapore còn trống schema/Edge Functions; (3) nguồn chưa lên remote/CI online. |
| Rủi ro lớn nhất cần xử lý ngay? | Công việc nằm trong **một cây làm việc chưa commit (726 thay đổi)** và một bản ứng viên chỉ có ở máy local. Cần đường sao lưu/chuyển nguồn an toàn trước mọi việc khác. |
| Ước lượng | **~10–12 tuần** sau các quyết định ngày 23/10 (đưa Council/Astrology AI và chế độ khách vào bản đầu; xem mục 6). Ước lượng theo thứ tự phụ thuộc, không phải cam kết ngày phát hành. |

---

## 2. Hiện trạng cập nhật (23/10/2026)

### 2.1 Đã có bằng chứng

- **Sản phẩm (Expo SDK 54, RN 0.81, React 19):** Welcome/Auth → chọn mục tiêu (tùy chọn) → Home với Today Pulse; Tarot 7 bộ × 78 lá VI/EN; Oracle/Persona/Council chat; Astrology (lá số cục bộ + 12 chương thần thoại); Nhật ký (note, draft, export); thông báo; Admin web 2 workspace.
- **Kiểm local ngày 20/10** (Node 24.19, cài mới theo lockfile, commit `ab597f4…` trong thư mục ứng viên riêng): mobile 327/327, Admin 176/176, AI Operations 22/22, release checker 39/39, Astrology 14/14; export Metro web + Android embedded bundle thành công. Chưa có CI online.
- **Cấu hình Android:** `app.nilaza.mobile`, versionName 0.1.3 / versionCode 4, minSdk 24, **targetSdk 36** (đáp ứng yêu cầu Play: từ 31/08/2026 app mới phải target API 36 — [Google](https://developer.android.com/google/play/requirements/target-sdk)).
- **Website công khai:** `https://nilaza.magicpendigital.com/vi/privacy/` trả HTTP 200 (kiểm hôm nay) — có chỗ để gắn Privacy Policy URL.
- **Vercel Admin:** quy tắc Ignored Build Step đã lưu cho nhánh CI (21/10); chưa chứng minh bằng một deployment thật.
- **Key/recovery:** hồ sơ backup Android/backend/recovery đã chuẩn bị; vẫn ghi rõ chưa có bằng chứng khôi phục toàn hệ thống và Google Play chưa chấp nhận khóa nào (chưa từng upload AAB).

### 2.2 Chưa có / đang BLOCKED

| Hạng mục | Trạng thái |
|---|---|
| Nguồn → remote → CI online | **Chưa.** Lịch sử Git cũ từng theo dõi hồ sơ trình duyệt QA; chưa có chứng nhận cách push/bundle an toàn. Root đang ở nhánh `codex/admin-shared-content-sync` với 726 tệp thay đổi chưa commit. |
| Backend Singapore (`etfajmrwyywokgafzxsb`) | Đã chọn nhưng **0 migration/0 bảng/0 Edge Function**; client vẫn trỏ project QA cũ; `release-profile.json.targets=[]`; ledger legacy `blocked_pending_reconciliation`. |
| AI online | Còn thiếu: Auth trước mọi lệnh gọi trả phí, trần chi phí + kill switch, route/schema, entitlement, degraded path. Provider/model/ngân sách chưa chọn. |
| Build ký | **Chưa.** `android/app/build.gradle` release vẫn dùng `debug` signing; EAS production **chưa có** 3 biến `EXPO_PUBLIC_*` (API URL, Supabase URL, anon key). |
| Nghiệm thu thiết bị | Chưa có cho ứng viên mới (Air1 Ultra, API 33 đã nhận; APK cũ là dòng QA ký debug). |
| Board MVP remediation | 26 task: 3 local_verified (R01, R04, R20), 11 partial, 3 preparation, **7 chưa bắt đầu** (R11 Today Pulse/ngày, R14 grounding persona, R15 Council, R16 Admin Test Run, R17 Astrology AI, R21 đánh giá AI, R23 UAT), R24/R25 hoãn. Không task nào `fullCardAccepted`. |
| Thanh toán | Không có RevenueCat; UI ghi “Premium chưa mở bán”. Phù hợp để ra mắt **bản miễn phí** (xem mục 7, câu hỏi 2). |

### 2.3 Phát hiện mới chỉ có từ lần rà này (liên quan trực tiếp tới Google Play)

| # | Mức | Phát hiện | Bằng chứng | Hệ quả |
|---|---|---|---|---|
| G1 | 🔴 | **Không có chức năng xóa tài khoản cloud.** Nút duy nhất là “Xóa dữ liệu trên thiết bị”, copy ghi “tài khoản cloud cần luồng backend riêng”; thư mục `supabase/functions` không có hàm xóa tài khoản. | `App.tsx:5782`, `ls supabase/functions` | Play yêu cầu app cho tạo tài khoản phải có **đường xóa trong app + URL web yêu cầu xóa**, và khai báo trong Data safety ([Google](https://support.google.com/googleplay/android-developer/answer/13327111)). Nhiều khả năng bị từ chối nếu thiếu. |
| G2 | 🔴 | **Manifest chứa quyền không cần dùng:** `READ/WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW` nằm trong `src/main`. | `android/app/src/main/AndroidManifest.xml:3-6` | Quyền nhạy cảm gây cảnh báo/khai báo thêm trong Play; không có tính năng nào cần. Cần gỡ. |
| G3 | 🔴 | **Thiếu `POST_NOTIFICATIONS`** dù app dùng `expo-notifications` và `requestPermissionsAsync`. Vì thư mục `android/` được commit, cấu hình plugin trong `app.json` không tự bổ sung. | manifest + `src/notifications.ts:36` | Trên Android 13+ thông báo sẽ không hiện/không xin được quyền. |
| G4 | 🟡 | `allowBackup="true"`: Android Auto Backup có thể sao lưu dữ liệu Nhật ký/hồ sơ cục bộ lên Google Drive của người dùng, lệch với copy riêng tư “lưu trên máy”. | manifest | Cần quyết định có/không và ghi đúng trong Data safety. |
| G5 | 🟡 | Đăng nhập: hiển thị Apple, Google, Facebook, X; Facebook/X mờ “Sắp ra mắt”, Apple trên Android cần luồng web. | `AuthFlow.tsx:188-191`, quan sát hôm nay | Nhiễu thị giác; nút chưa hoạt động trong bản review làm người duyệt Play thấy tính năng hỏng. Chỉ hiện provider đã chạy thật. |
| G6 | 🟡 | **Người duyệt Play cần tài khoản thử** (mục App access) vì app auth-first, không có chế độ khách. | Welcome chỉ có Tạo tài khoản/Đăng nhập | Phải chuẩn bị tài khoản review ổn định trên backend production và không phụ thuộc email xác nhận. |
| G7 | 🟡 | Hai bản mã nguồn mồ côi `App_fixed.tsx`, `App_restored.tsx` còn nằm cạnh `App.tsx` (16.764 dòng); `todayKey()` vẫn theo UTC. | `App.tsx:1937` | Nợ kỹ thuật/lỗi ngày: người dùng VN trước 07:00 thấy “hôm qua”. |

---

## 3. Đánh giá UI/UX (theo khung design-critique)

Phạm vi: bố cục 390×844, tiếng Việt, chế độ local fallback. Ảnh được xem ở độ phân giải thật; số tương phản tính từ token trong `theme.ts`.

### 3.1 Ấn tượng đầu tiên

Welcome rất mạnh: ảnh trăng trên mặt nước, wordmark NILAZA bằng EB Garamond, câu định vị “Một khoảng mở để lắng nghe mình”, một nút ivory nổi bật và một nút viền. Cảm xúc yên, trưởng thành, đúng “mystical but mature”, không giống app bói rẻ tiền. Mục đích hiểu được trong 2 giây.

### 3.2 Điểm làm tốt — cần giữ

- **Một hành động chính trên mỗi màn:** Home chỉ có “Bắt đầu phút phản chiếu” + hai nút phụ; Mục tiêu có “Tiếp tục” và “Bỏ qua lúc này”; Tarot chia bước nhỏ (chủ đề → kiểu trải → …).
- **Phân cấp chữ và khoảng trắng:** tiêu đề serif lớn, nhãn caps nhỏ, thẻ bo góc 8px đồng nhất; palette hạn chế (charcoal/ivory/gold).
- **Tương phản màu token đạt:** ivory/charcoal 16,3:1; gold 7,8:1; moon 7,4:1; rose 6,2:1; ivory trên teal 7,1:1; chữ charcoal trên nút gold 7,8:1. Chữ phụ (`muted` ≈ 68% ivory) khoảng 8:1 (ước tính).
- **Chuẩn chạm 48px** đã thành token (`minimumTouchTarget: 48`); nhiều nút quan sát đạt kích thước này.
- **Trạng thái rỗng có hướng dẫn** (Nhật ký, Gần đây) và Tarot đã sửa first fold (R04).
- **Trung thực về tính năng:** “Premium chưa mở bán”, “Sắp ra mắt”, nhãn local/online.

### 3.3 Phát hiện

| ID | Mức | Phát hiện | Căn cứ | Đề xuất |
|---|---|---|---|---|
| U-A | 🔴 | **Nút Oracle nổi (FAB) che nội dung** ở Home/Khám phá/Nhật ký/Hồ sơ: che chip lọc cuối hàng của Nhật ký, đè lên thẻ Tarot ở Khám phá và hàng cuối trong Hồ sơ. Đồng thời Oracle xuất hiện **hai lần** trên cùng màn Khám phá (thẻ + FAB) và dùng cùng biểu tượng lấp lánh với tab Trò chuyện. | Quan sát hôm nay | Bỏ FAB trên các tab đã có đường vào Oracle; hoặc chỉ giữ ở Home và Chat; đổi icon tab Trò chuyện (bong bóng) để khác Oracle. Chừa `paddingBottom` cho vùng FAB nếu giữ. |
| U-B | 🔴 | **Chưa chứng minh được trên máy thật:** chữ 150–200%, TalkBack, Reduce Motion, Back, bàn phím, safe-area. Source có 0 lần dùng `allowFontScaling/maxFontSizeMultiplier` (mặc định co giãn theo hệ thống), nên rủi ro cắt chữ/vỡ layout ở chữ lớn là thật. | Grep source; audit 30/09 | Bắt buộc có ma trận QA thiết bị trước closed test (mục 5, giai đoạn 5). |
| U-C | 🟡 | **Hiệu năng danh sách:** không dùng FlatList/SectionList/FlashList ở đâu; 78 lá, toàn bộ Nhật ký và mọi tin nhắn đều render một lần. 7 bộ bài (~50 MiB ảnh) nhúng cố định vào app; `App.tsx` cập nhật state theo từng frame khi cuộn (M12). | Grep; audit 30/09 (M12–M15) | Đo trên Air1 Ultra rồi ảo hóa 3 danh sách dài; cân nhắc tách bộ trả phí/ít dùng thành tải theo nhu cầu (sau Play, không chặn). |
| U-D | 🟡 | **Chữ tiêu đề không nhất quán:** Welcome/Home dùng Garamond nhẹ; Tarot, Nhật ký, Hồ sơ và tiêu đề thẻ dùng kiểu đậm nặng hơn. Brand quy định EB Garamond Regular 400; `theme.ts` còn token tracking âm trong audit cũ. | Quan sát hôm nay; audit M20 | Chuẩn hóa một thang tiêu đề (display/h1/h2/label) và áp cho mọi màn. |
| U-E | 🟡 | **Form đăng ký:** placeholder xám trên nền ivory khá nhạt; chưa thấy chỉ dẫn độ mạnh mật khẩu/quy tắc; lỗi cần kiểm thêm. Nút “Tạo tài khoản” và link “Đăng nhập” không có tên truy cập trong cây accessibility của công cụ kiểm (có thể do cách công cụ đọc, cần xác nhận bằng TalkBack). | Quan sát; cây a11y | Tăng tương phản placeholder ≥4,5:1; thêm `accessibilityLabel` rõ ràng; thông báo lỗi inline gắn trường. |
| U-F | 🟡 | **Màn trống thiếu giá trị:** Hồ sơ hiển thị “0 / 0 / 0” (Chuỗi ngày, Ý định, Dữ liệu trên máy); Nhật ký hiện thống kê 7 ngày toàn số 0. Người mới thấy bảng điểm trống thay vì lời mời. | Quan sát | Ẩn thống kê cho tới khi có dữ liệu; thay bằng một lời mời hành động (“Viết ghi chú đầu tiên”). |
| U-G | 🟡 | **Tarot chọn kiểu trải:** thẻ đã mở vẫn ghi “Chạm để xem khi nào nên chọn kiểu này”; thẻ kế tiếp bị cắt dưới CTA cố định; thông tin “Hợp khi/Cân nhắc/Câu hỏi thử” dày. | Quan sát | Gọn copy: chỉ hiện gợi ý chạm khi thẻ đang đóng; mặc định 1 lá cho người mới (đã đề xuất 14/10). |
| U-H | 🟡 | **Ảnh bộ bài rất tối ở thumbnail Khám phá** khó nhận biết bộ bài. | Quan sát; audit U10 | Tăng sáng/viền nhấn, hoặc dùng ảnh lá sáng làm thumbnail. |
| U-I | 🟡 | **Thanh tab chỉ còn icon khi cuộn** (nhãn biến mất ở Hồ sơ). Tab “Trò chuyện” và Oracle dễ nhầm. | Quan sát | Giữ nhãn cố định hoặc chỉ ẩn khi cuộn xuống dài; kiểm TalkBack. |
| U-J | 🟡 | **Journal/Chat vòng đời:** từ 30/09, M01–M02 (sửa/xóa chỉ local) đã có outbox/tombstone local nhưng cloud lifecycle chưa nghiệm thu; M30 xóa một chạm không undo; M25 mục “Gần đây” chưa mở đúng entry. | Board 02/10 (R07/R08 partial) | Đóng trọn vòng lưu → sửa → xóa → mở lại trên hai thiết bị trước closed test. |
| U-K | 🟡 | **Ngày theo UTC** (`App.tsx:1937`): Today Pulse và hạn mức đổi sai giờ cho người dùng VN/TH. | Grep; R11 chưa bắt đầu | Dùng ngày địa phương + test 23:59→00:01. |
| U-L | 🟢 | Hardware Back: hiện đã có `BackHandler` (6 chỗ trong source, trước đây không có) — chưa nghiệm thu native. | Grep | Đưa vào ma trận QA thiết bị. |
| U-M | 🟡 | **Chất lượng AI hiển thị cho người dùng:** từng quan sát AI viện lá bài không được cung cấp (U13), tổng hợp Tarot khẳng định “đau/chia cắt” khi chưa có dữ kiện (U06), Astrology AI khóa Premium mà chưa có mua hàng (U18). R14–R17, R21 chưa bắt đầu. | Audit 30/09; board | Với bản Play miễn phí: chỉ mở các luồng AI đã qua rubric an toàn/grounding; đóng rõ phần còn lại bằng trạng thái trung thực. |

### 3.4 Khả năng tiếp cận (tóm tắt)

- **Tương phản:** token chính đạt. Teal `#0E5A5A` trên charcoal chỉ **2,3:1** — chỉ dùng cho nền/viền, **không** dùng làm màu chữ hay biểu tượng thông tin.
- **Vùng chạm:** chuẩn 48px nhưng audit trước ghi lệch (hộp gửi chat 44px, mũi tên lịch 34px, icon feedback 14px).
- **Trạng thái chọn:** `Chip` chỉ khác màu, thiếu `accessibilityState` (M08); `ChoiceTile` đã có.
- **Chuyển động:** có hỗ trợ Reduce Motion ở brand/nav/Tarot nhưng chưa phủ FadeIn và loading loop chat (M10). Quan sát hôm nay thấy các màn mờ dần khoảng 0,3–0,5 giây khi đổi màn.
- **Ngôn ngữ:** vẫn còn nhãn lẫn Anh/Việt ở vài chỗ (M23).

---

## 4. Đề xuất tối ưu UI/UX (theo thứ tự giá trị)

**Gói A — Phải xong trước closed test (ảnh hưởng người thử và người duyệt Play)**
1. Gỡ/đặt lại Oracle FAB, phân biệt icon tab Chat, chừa khoảng đệm cuối danh sách (U-A, U-I).
2. Chỉ hiển thị phương thức đăng nhập đang hoạt động; chuẩn bị tài khoản review (G5, G6).
3. Ma trận thiết bị: 360×640, 390×844, chữ 100/150/200%, Reduce Motion, TalkBack, Back, bàn phím, offline/lỗi/retry (U-B, U-L).
4. Ngày địa phương cho Today Pulse/quota (U-K).
5. Đóng vòng Journal sửa/xóa/mở lại, thêm undo/xác nhận khi xóa (U-J).
6. Màn Hồ sơ → “Tài khoản & vận hành”: thêm **Xóa tài khoản** (nối với hàm backend mới, G1) và liên kết Chính sách riêng tư/Điều khoản/Yêu cầu xóa.

**Gói B — Nên xong trước production**
7. Thang tiêu đề chuẩn, tương phản placeholder, accessibilityLabel/State cho Chip, nút icon, lịch (U-D, U-E, M07–M09).
8. Ảo hóa danh sách dài; giảm cập nhật state khi cuộn; đo cold start/RAM/jank trên máy tầm thấp (U-C).
9. Trạng thái rỗng có mời gọi, ẩn thống kê 0 (U-F); thu gọn copy Tarot (U-G); thumbnail sáng hơn (U-H).
10. Một nhãn rõ “Lưu insight” vs “Viết ghi chú”, “Vì sao?” mở giải thích đúng lá/vị trí (U07–U08, đã có phần sửa R04/R08).

**Gói C — Sau khi Android lên Play**
11. Tách deck trả phí/ít dùng thành tải theo nhu cầu có kiểm toàn vẹn; tách `App.tsx` theo màn hình; dọn bản `App_fixed/App_restored`.
12. Đa ngôn ngữ ngoài VI/EN; ảnh chia sẻ thật; polish chuyển cảnh Astrology.

---

## 5. Kế hoạch hoàn thiện để lên Google Play

Quy ước: **AI** = phần agent chuẩn bị/kiểm; **Owner** = đăng nhập, bí mật, duyệt. Mọi bước cloud/SQL/key/phát hành vẫn cần phiếu duyệt riêng (theo AGENTS.md); kế hoạch này không thay thế phiếu.

### Giai đoạn 0 — Chốt nguồn và sao lưu (tuần 1) — *đường găng*
| Việc | Ai | Hoàn tất khi |
|---|---|---|
| Quyết định **nguồn chuẩn**: hợp nhất cây làm việc root (726 thay đổi) với ứng viên `ab597f4`; chốt một nhánh phát hành | AI đề xuất, Owner chọn | Một commit sạch, tái lập được, đã ghi hash |
| **Phương án B (mục 0.1):** repo mới sạch từ snapshot allowlist, đổi tên repo cũ thành `nilaza-legacy` | AI chuẩn bị, Owner duyệt từng thao tác cloud | Repo mới chỉ có nguồn sạch; Vercel Admin nối lại; CI Linux/Node chạy đúng commit |
| Owner thu hồi phiên các tài khoản từng đăng nhập trong Chrome profile QA | Owner | Danh sách tài khoản đã đăng xuất/đổi mật khẩu |
| Sao lưu cây làm việc hiện tại (không mất công việc chưa commit) | AI | Bản sao + hash tồn tại ngoài máy |
| Dọn `App_fixed/App_restored` khỏi app source | AI | `tsc` + test vẫn xanh |

### Giai đoạn 1 — Làm sạch Android release (tuần 1–2, làm song song, thuần local)
- Gỡ `READ/WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW` khỏi manifest chính (giữ riêng cho debug) (G2).
- Thêm `POST_NOTIFICATIONS`; kiểm kênh thông báo và luồng xin quyền (G3).
- Quyết định `allowBackup` (đề xuất `false` hoặc `dataExtractionRules` loại Nhật ký) và ghi vào Data safety (G4).
- Xác minh EAS production dùng **upload keystore** (không phải debug) và AAB (`buildType: app-bundle`); sao lưu keystore theo [hướng dẫn key](ANDROID_KEY_BACKUP_2026-10-18.vi.md); xác minh `expo-dev-client` không làm bản production xuất hiện launcher dev.
- Tăng `versionCode`, kiểm hỗ trợ 16 KB page size (RN 0.81/NDK 27 dự kiến đáp ứng — **cần kiểm trên AAB thực**).
- **Hoàn tất khi:** AAB ký thử qua EAS (chưa gửi Play), `bundletool`/`apksigner` xác nhận package, chữ ký, quyền, versionCode.

### Giai đoạn 2 — Backend Singapore và AI an toàn (tuần 1–4) — *đường găng thứ hai*
1. Packet SQL đúng target (30 migration), Auth/SMTP, bootstrap QA — Owner duyệt từng thao tác cloud; giữ ledger legacy nguyên trạng.
2. **Hàm xóa tài khoản + export** (mới): xóa Auth user, hồ sơ, chat, journal, birth profile, credits, tệp Storage, trace liên quan theo chính sách retention; trạng thái request → processing → completed/failed/retry; test hai tài khoản A/B. (G1)
3. Chốt AI cho bản Play: **một provider/model**, trần chi phí/ngày + tổng, kill switch, Auth bắt buộc trước mọi lệnh gọi trả phí, quota Tarot 1 lá/ngày và Chat/Oracle 5 lượt/ngày (đã duyệt R00) nối vào endpoint; degraded path khi lỗi/hết hạn mức.
4. **Bản Play miễn phí gồm Council và Astrology AI (quyết định 23/10):** làm R14–R17 (grounding persona, Council version/idempotency/atomic result, Admin Test Run đi qua runtime thật, Astrology AI theo chart thật), cấp entitlement cho người dùng miễn phí, thêm quota Astrology AI/Council, chạy rubric R21; giữ công tắc tắt trong Admin. Không bán Premium, không gọi “Premium” là tính năng đang chạy.
4b. **OpenRouter:** khóa ở backend; cấu hình model qua Admin; bật thiết lập quyền riêng tư (không huấn luyện từ prompt); trần chi phí phía OpenRouter nếu có.
5. Retarget cấu hình client + EAS env (3 biến `EXPO_PUBLIC_*`) sau khi QA đạt; **chỉ public/anon key trong client**.
- **Hoàn tất khi:** staging Singapore chạy xuyên App → backend → Admin bằng tài khoản giả; xóa tài khoản thật sự xóa dữ liệu; chi phí đo được và dừng được.

### Giai đoạn 3 — Sprint UI/UX (tuần 2–4, song song giai đoạn 2)
Thực hiện **Gói A** ở mục 4 (6 việc) **cộng chế độ khách** (Welcome thêm “Xem trước nội dung”, cổng đăng nhập cho tính năng AI, lưu trữ riêng cho khách), xác nhận 18+ khi tạo tài khoản, và kiểm nút báo cáo nội dung AI ở mọi phòng chat/AI; rồi Gói B nếu còn thời gian. Mỗi việc theo Plan & QC: impact map, test, `npm --workspace apps/mobile run check`/test, web export + Android embedded bundle.

### Giai đoạn 4 — QA online và thiết bị (tuần 4–5)
- Tài khoản giả A/B/staff; publish xung đột, offline feedback, TTL/purge, quyền, xóa tài khoản.
- Owner thử trên Air1 Ultra theo kịch bản: đăng nhập → Tarot (chọn/rút/xem chi tiết) → lưu/mở lại Nhật ký → feedback → Astrology → mất mạng/retry → chữ lớn → Back/background → xóa/khôi phục.
- Bài kiểm an toàn VI/EN (tự hại, prompt injection, giả lập lá bài); rubric AI R21 rút gọn cho các luồng mở.
- Ghi artifact: SHA-256 AAB/APK, commit, backend target, thiết bị.
- **Hoàn tất khi:** 0 lỗi P0/P1 trong phạm vi mở; mọi lỗi P2 có quyết định.

### Giai đoạn 5 — Play Console và hồ sơ cửa hàng (bắt đầu **ngay tuần 1**, song song)
| Việc | Ghi chú |
|---|---|
| Xác nhận **loại và ngày tạo** tài khoản Play; xác minh danh tính/thiết bị | Quyết định có phải closed test 12×14 ngày không ([yêu cầu Google](https://support.google.com/googleplay/android-developer/answer/14151465)) |
| Chính sách riêng tư (đã có URL), Điều khoản, **URL yêu cầu xóa dữ liệu** | Cần trang web + email hỗ trợ đã cấu hình thật |
| Biểu mẫu **Data safety** | Liệt kê đúng: email, tên, nội dung chat/nhật ký, ngày giờ nơi sinh, thông báo/token, chẩn đoán; chia sẻ với nhà cung cấp AI/Supabase; mã hóa khi truyền; có xóa dữ liệu |
| Content rating (IARC), khai báo quảng cáo = không, đối tượng mục tiêu (không nhắm trẻ em; 18+ hoặc 13+ theo quyết định), khai báo tính năng AI | Nội dung tarot/chiêm tinh luôn ghi “giải trí, tự phản chiếu” |
| Mục **App access** | Tài khoản review ổn định, hướng dẫn từng bước |
| Store listing | Tên, mô tả ngắn/dài VI+EN, icon 512, feature graphic 1024×500, 2–8 ảnh chụp thật (không chứa tài khoản thật), danh mục |
| Nội bộ → closed → production | Upload AAB thủ công qua Console (không cần service-account JSON lúc đầu) |
- Dùng Open Reflection v1, không dùng bản ảnh QA có tài khoản thật.

### Giai đoạn 6 — Internal testing rồi Closed testing (tuần 5 → ≥7)
- Internal testing: cài từ Play, kiểm lại chữ ký Play và **bảo toàn dữ liệu khi nâng cấp** từ APK debug (không gỡ app Owner đang dùng).
- Closed test: **12 người thử liên tục ≥14 ngày** (nếu áp dụng). **Tuyển người ngay từ tuần 1–2** vì thời gian chờ này không nén được; chuẩn bị phiếu phản hồi, kênh hỗ trợ, theo dõi crash/ANR trong Play Console.
- Sửa lỗi thành bản `versionCode` mới trong phạm vi đã duyệt.

### Giai đoạn 7 — Production Android (tuần 8–10)
- Nộp yêu cầu production access (nếu cần) và trả lời câu hỏi kiểm thử; chờ Google duyệt.
- Phát hành **từng phần (10–20%)**, theo dõi crash, chi phí AI, lỗi đăng nhập, phản hồi; sẵn sàng tắt tính năng AI bằng kill switch.
- **Sau đó** mới bắt đầu đợt iOS (build, signing, nghiệm thu riêng).

### Biểu đồ phụ thuộc (đơn giản)

```
G0 Nguồn/CI ──┬─> G1 Android sạch ───┐
              ├─> G2 Backend+AI+Xóa TK ─┼─> G4 QA online/thiết bị ─> G6 Internal → Closed(≥14 ngày) ─> G7 Production
              └─> G3 UI/UX Gói A ──────┘
G5 Play Console/Data safety/Tuyển tester  ──(song song từ tuần 1)──────────────┘
```

---

## 6. Ước lượng thời gian (tham khảo, không cam kết)

| Mốc | Tuần (ước lượng) | Giả định |
|---|---|---|
| G0–G1 hoàn tất | 1–2 | Owner duyệt phương án B và các thao tác repo nhanh |
| G2 + G3 hoàn tất | 5–6 | Gồm R14–R17 (Council, Astrology AI), chế độ khách; Owner duyệt thao tác cloud trong ngày |
| G4 QA + AAB đạt | 6–7 | Không phát sinh lỗi P0/P1 lớn; rubric AI đạt hoặc tắt tính năng bằng công tắc |
| Internal → bắt đầu Closed test | 7 | **Đã có ≥12 người thử (nên 15–20)** — Owner cần bắt đầu tuyển từ tuần 3–4 |
| Closed test kết thúc | ≥9 | 14 ngày liên tục; mất tester làm đếm lại |
| Production access + rollout | 10–12 | Google duyệt trong thời gian thông thường |

Tài khoản của Owner thuộc diện 12×14 ngày (đã xác nhận), nên mốc Closed test là bắt buộc. Nếu backend, nguồn hoặc việc tuyển người trễ, toàn bộ chuỗi sau dịch tương ứng — đây là đường găng. Phương án giảm rủi ro: nếu rubric Council/Astrology AI chưa đạt đến tuần 6, tắt từng tính năng bằng công tắc Admin và vẫn tiếp tục phát hành.

---

## 7. Quyết định còn lại cho Owner (sau ngày 23/10)

Tám quyết định ban đầu đã được trả lời — xem mục 0. Còn lại:

1. **Duyệt phương án B (mục 0.1)**: đổi tên repo cũ thành `nilaza-legacy`, tạo repo `nilaza` mới sạch, nối lại Vercel Admin. Tôi sẽ lập phiếu thao tác cụ thể trước khi chạy.
2. **Trần chi phí AI** cho QA và 14 ngày closed test. Đề xuất dùng lại mức đã duyệt trong R00: **5 USD/ngày và 50 USD/14 ngày**, cộng hạn mức tín dụng trên khóa OpenRouter nếu có.
3. **Hạn mức Astrology AI và Council:** đề xuất 1 lượt/ngày mỗi loại cho tài khoản miễn phí.
4. **Phạm vi chế độ khách** như mục 0.2 (xem tĩnh; AI/Nhật ký/lưu cần đăng nhập). Nói với tôi nếu muốn cho khách rút Tarot cục bộ không cần AI.
5. **Danh sách tài khoản dịch vụ từng đăng nhập trong Chrome profile QA** để thu hồi phiên (Owner tự làm, không gửi mật khẩu).
6. **Tuyển ≥12 người thử** (nên 15–20), bắt đầu từ tuần 3–4.

---

## 8. Giới hạn của báo cáo này

- Quan sát giao diện hôm nay chạy trên **Expo web local, không backend**, nên không chứng minh native, đồng bộ cloud hay chất lượng AI thật; ảnh chụp chỉ xác nhận trạng thái được chụp.
- Số 327/327, 176/176 và 34/34 là kết quả local ngày 20/10 trên commit ứng viên, không phải CI online hay cây làm việc root hiện tại.
- Tôi chưa chạy lại test, chưa mở Play Console, Supabase hay EAS; chưa đọc `.env.local` hay giá trị secret.
- Ngày/điều kiện của Google Play lấy từ trang chính thức khi tra cứu hôm nay; cần đọc lại trong Play Console của Owner trước khi nộp.
- Đây là tài liệu docs-only, chưa có `docs/feature-plans/*.json` hay preflight riêng; mỗi hạng mục triển khai ở trên vẫn phải qua Plan & QC và Feature Preflight trước khi sửa code.

**Nguồn tham khảo ngoài:** [Target API level — Android Developers](https://developer.android.com/google/play/requirements/target-sdk) · [Account deletion — Play Console Help](https://support.google.com/googleplay/android-developer/answer/13327111) · [Testing requirements for new personal accounts — Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465).
