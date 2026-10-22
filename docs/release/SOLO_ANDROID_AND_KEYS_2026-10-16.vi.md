# Nilaza: vận hành một chủ dự án, Android trước và kho key riêng

Ngày 16/10/2026, múi giờ Asia/Bangkok. Tài liệu hướng dẫn theo quyết định mới của Owner: dự án chỉ có Owner và AI hỗ trợ; ưu tiên đưa Android lên Google Play, sau đó mới nghiệm thu và phát hành iOS. Phạm vi key gồm recovery, Android và backend/API.

**Phương án đề xuất:** Owner giữ quyền tài khoản, mật khẩu khôi phục và quyền duyệt phát hành; AI chuẩn bị, kiểm thử và hướng dẫn thực thi. Giữ repository private, dùng hạ tầng hiện có và chưa mua thêm gói quản trị. Kho Google Drive lưu bản key đã mã hóa và hồ sơ không bí mật. Thư mục được tạo không đồng nghĩa key đã được sao lưu hoặc ứng dụng đã đủ điều kiện phát hành.

## 1. Tình trạng thực tế và thay đổi ưu tiên

| Hạng mục | Trạng thái để ra quyết định |
|---|---|
| Nhân sự | Owner là người duyệt, giữ tài khoản và giữ khả năng khôi phục. AI phụ trách công việc kỹ thuật trong phạm vi được giao. Không cần chỉ định một người thứ hai không tồn tại. |
| Android | Đã nhận thiết bị Air1 Ultra, API 33. App hiện có là `0.1.3` / versionCode `4`; APK local đã kiểm thuộc dòng QA cũ, ký debug. Cùng số phiên bản không chứng minh cùng source, signing hoặc backend. Chưa nghiệm thu thiết bị cho A1–A3. |
| Dữ liệu trên điện thoại | Giữ nguyên ứng dụng và dữ liệu hiện có. Kiểm tra kết nối không phải cho phép xóa dữ liệu, gỡ app hoặc thay signing key. |
| iOS | Hoãn theo quyết định Owner đến sau khi Android lên Google Play thành công. Không đánh dấu iOS PASS; khi bắt đầu iOS sẽ có build, signing và nghiệm thu riêng. |
| Backend | Singapore vẫn là đích đã chọn. Báo cáo QA ngày 16/10 ghi nhận project chưa có schema/Edge Functions và client còn trỏ QA cũ. Thay đổi ưu tiên nền tảng không tự mở quyền SQL, retarget hoặc production. |
| Key và recovery | Đã có kho Drive riêng và kiểm tra vận chuyển bản QA giả trước đây. **Chưa có bằng chứng hoàn tất sao lưu key thật và khôi phục mất máy** tại thời điểm lập hướng dẫn này. |

Chi tiết kết quả đã chạy, giới hạn và 12 ca kiểm thử nằm trong [báo cáo QA 16/10](AI_OPERATIONS_QA_2026-10-16.vi.md). Không dùng bundle JavaScript, APK cũ hoặc việc ADB nhận điện thoại để thay cho nghiệm thu ứng viên mới.

## 2. Cách phối hợp phù hợp với một người phát triển cùng AI

Owner không cần học toàn bộ công cụ hay đọc SQL trước mỗi việc. AI cần đưa ra một phiếu ngắn cho mỗi lần phát hành: thay đổi gì, bản nào, môi trường nào, kiểm thử nào đạt/chưa chạy, chi phí tối đa và cách dừng/khôi phục. Owner duyệt phiếu cụ thể rồi thực hiện những bước riêng tư mà AI không được đọc.

| Công việc | AI xử lý | Owner thực hiện |
|---|---|---|
| Phát triển và chất lượng | Sửa code, kiểm thử, đọc logs đã lọc, chuẩn bị build và checklist; giữ công việc chưa commit của dự án. | Kiểm tra trải nghiệm trên điện thoại và xác nhận kết quả mong muốn. |
| Tài khoản và key | Lập danh mục, tổ chức thư mục, chuẩn bị quy trình mã hóa, kiểm checksum/quyền và receipt không bí mật. | Đăng nhập/MFA, nhập mật khẩu trong cửa sổ riêng và giữ phương án recovery ngoài Drive. |
| QA cloud | Chuẩn bị hồ sơ đúng Singapore, migration, Auth/SMTP, giới hạn AI, kiểm quyền và khôi phục; trình phần cần duyệt. | Duyệt đúng phạm vi, ngân sách và ứng viên khi hồ sơ đã đủ. |
| Phát hành | Chuẩn bị artifact có checksum, hướng dẫn thực thi và kiểm tra sau triển khai. | Giữ quyền phát hành; thực hiện bước yêu cầu danh tính hoặc mở khóa riêng tư. |
| Sự cố | Phân tích dấu vết kỹ thuật, đề xuất disable/forward fix/restore theo bằng chứng. | Quyết định khi phải chấp nhận mất dữ liệu, thời gian gián đoạn hoặc chi phí ngoài phạm vi đã duyệt. |

Một người có thể giữ nhiều vai trò; điều cần phân tách là bước AI chuẩn bị và bước Owner cho phép dùng quyền nhạy cảm. Không coi AI là người duyệt độc lập thứ hai. Các kiểm tra tự động và đánh giá bổ sung là bằng chứng kỹ thuật, không thay danh tính của Owner.

**Đề xuất thực thi tối giản:** CI chỉ kiểm tra và tạo bằng chứng; thao tác phát hành được Owner mở khóa trong ngữ cảnh riêng, dùng đúng artifact đã duyệt, kiểm target/hash ngay trước khi chạy, giữ một khóa chống hai lần release đồng thời và ghi receipt. Cơ chế này vẫn phải được chuẩn bị, review và chứng minh đáp ứng gate hiện tại trước khi dùng. Tài liệu này chưa triển khai cơ chế bảo vệ hoặc sửa gate.

Không cần mua GitHub Pro/Team chỉ để có environment required reviewers: tính năng đó trên các gói Free/Pro/Team hiện dành cho repository public. Giữ repo private; không mở public để lấy tính năng. Một nút chạy thủ công, tên environment hay file JSON ghi APPROVE không tự bảo vệ deployment. [Giới hạn GitHub environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)

## 3. Kho Google Drive và ý nghĩa từng loại key

Dùng lại [Keys riêng tư của Nilaza](https://drive.google.com/drive/folders/1XNX6VRbOxGDCNfuARbbeanMxwnmSa-tJ), nằm trong [kho Recovery — Singapore](https://drive.google.com/drive/folders/1LIfjuBxA1D9ya9fLb-RU6IrhYDmCxm4w). Ba thư mục phân loại đã được tạo dưới Keys và kiểm lại quyền: một chủ sở hữu, `shared=false`. [Trạng thái kho](../../artifacts/solo-android-keys-2026-10-16/vault-status.json) ghi bằng chứng của lượt này. Số file key thật hiện là **0**; các thư mục không chứng minh key đã được sao lưu.

| Nhóm lưu trữ | Nội dung phù hợp | Trạng thái cần chứng minh |
|---|---|---|
| [Recovery](https://drive.google.com/drive/folders/1NT8l-G30J2XQzfmBOvAYuymMfGEnsmiR) | Identity đã được mã hóa bằng mật khẩu Owner, public recipient và hướng dẫn khôi phục. | Tạo khóa → kiểm ciphertext → upload → tải lại khớp → Owner thử mở khóa. |
| [Android](https://drive.google.com/drive/folders/1VvV6v_Qx9KaWowcP5NdtnxPoF2tKP-mJ) | Gói mã hóa upload keystore và thông tin cần để sử dụng; metadata package name/certificate fingerprint. | Đúng key đang dùng cho bản phát hành, có bản tải lại khớp và thử ký/xác minh phù hợp. |
| [Backend-API](https://drive.google.com/drive/folders/1I6SrofOkLV0lvAzDLaAHoJih5lc4jyrT) | Gói mã hóa các credential cần phục hồi theo từng dịch vụ/môi trường; hướng dẫn cấp lại hoặc rotation khi cần. | Danh mục đầy đủ, quyền phù hợp, không nhầm Singapore với legacy QA; thử phục hồi được trong phạm vi đã duyệt. |
| Inventory/hướng dẫn | Tên dịch vụ, môi trường, loại key, người giữ, ngày tạo/rotation, vị trí bản mã hóa, checksum và ngày thử restore. | Chỉ metadata; không ghi giá trị secret, mật khẩu, token hay URL tải có chữ ký. |

**Đích upload mới của identity mã hóa:** `owner-v1.age` thuộc thư mục **Keys/Recovery** ở trên theo [hồ sơ enrollment/storage ngày 16/10](../../artifacts/solo-android-keys-2026-10-16/enrollment-context.json). [Hồ sơ enrollment ngày 13/10](../../artifacts/drive-recovery-setup-2026-10-13/enrollment-context.json) được giữ nguyên để bảo toàn lịch sử; đích Keys gốc trong hồ sơ đó không còn là chỉ dẫn upload của lượt mới. Đường tạo file local và yêu cầu console riêng vẫn giữ nguyên; chưa có key thật để di chuyển hoặc thay thế.

Google Drive là nơi giữ bản dự phòng, không phải nơi ứng dụng đọc key lúc chạy. Backend/EAS tiếp tục dùng cơ chế secret tương ứng. Không đưa provider key hoặc Supabase service-role key vào app, `EXPO_PUBLIC_*`, repository hoặc tài liệu. Public/publishable key phục vụ client được phân loại riêng với quyền quản trị; không coi mọi chuỗi có tên “key” là cùng một mức quyền.

Với Android có hai loại khác nhau:

- **App signing key:** Google Play quản lý và dùng để ký APK giao tới người dùng nếu chọn Google-generated Play App Signing. Không hứa tải private key này về Drive. Có thể lưu certificate/fingerprint công khai để kiểm tra tích hợp.
- **Upload key:** Owner/EAS dùng keystore để ký AAB gửi lên Play. Đây là key cần sao lưu dưới dạng mã hóa. Google có quy trình reset upload key nếu mất hoặc bị lộ; reset vẫn cần thời gian và quyền tài khoản, nên không thay cho backup. [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en)

EAS hỗ trợ xuất credentials và keystore. Việc xuất có thể tạo file chứa secret; vì vậy không chạy thao tác đó trong phiên bị agent capture rồi tải raw file lên Drive. Cần dùng quy trình riêng tư đã review để mã hóa và kiểm tra trước khi upload. Không tạo hoặc xoay key mới chỉ để lấp thư mục. [Expo credentials](https://docs.expo.dev/app-signing/app-credentials/), [Expo bảo vệ credentials](https://docs.expo.dev/app-signing/security/)

Với API key, không phải nhà cung cấp nào cũng cho xem lại secret đã tạo. Nếu thiếu bản gốc, ghi trạng thái “chưa phục hồi được”; lập phương án cấp lại/rotation riêng sau khi biết các hệ thống đang dùng. Không tuyên bố kho đã chứa “toàn bộ key” chỉ vì đã tạo đủ ba thư mục.

[Danh mục key từ source](../../artifacts/solo-android-keys-2026-10-16/KEY-INVENTORY.vi.md) đã phân biệt cấu hình public, bí mật Supabase, provider AI, SMTP, upload keystore, EAS và trace. Source hỗ trợ bốn nhà cung cấp AI nhưng không cần tạo đủ bốn key. RevenueCat chưa có consumer key trong phần source đã kiểm, nên chưa coi là credential bắt buộc. Không đọc `.env` thật hoặc giá trị credential để lập danh mục này.

## 4. Bước recovery Owner cần làm

Trong lượt này đã mở cửa sổ PowerShell riêng bằng đúng script/vendor đã kiểm checksum; không chuyển các luồng nhập/xuất của cửa sổ về agent. Kiểm tra chỉ đọc xác nhận tiến trình đang tồn tại; chưa có ciphertext hoặc receipt hoàn tất ở lần kiểm cuối. **Owner hoàn tất tại cửa sổ đã mở, không chạy thêm một phiên Setup song song.** Trạng thái này chưa chứng minh Owner đã thấy cửa sổ hoặc mã hóa thành công. Nếu cửa sổ báo lỗi, chỉ cung cấp thông báo lỗi không chứa bí mật.

Hướng dẫn chính xác đã có trong [phiếu tạo khóa riêng](../../artifacts/drive-recovery-setup-2026-10-13/OWNER_SETUP_REVIEW.vi.md). Dùng công cụ được review, không tự đổi script hoặc bypass ExecutionPolicy.

1. Dùng cửa sổ PowerShell riêng đã mở, không ghi transcript hoặc chuyển stdin/stdout/stderr vào agent.
2. Công cụ `scripts/nilaza-recovery-owner.ps1 -Action Setup` đã được khởi chạy theo ngữ cảnh riêng tư. Owner tự nhập mật khẩu trực tiếp khi công cụ hỏi; không gửi mật khẩu qua chat. Nếu muốn làm lại sau, kiểm receipt và file partial trước để bảo toàn lần tạo trước.
3. Giữ mật khẩu ở nơi Owner có thể lấy lại khi mất máy hoặc mất tài khoản Google. Đề xuất một bản trong trình quản lý mật khẩu Owner đã dùng và một phương án ngoại tuyến cất riêng; không bắt buộc mua công cụ mới. Không chỉ lưu mật khẩu cạnh ciphertext trong cùng tài khoản Drive.
4. Công cụ hiện được thiết kế tạo identity qua pipe và mã hóa thành `C:\Users\Admin\AppData\Local\NilazaRecovery\Keys\owner-v1.age`; xác nhận đã giữ mật khẩu riêng chỉ khi thực sự hoàn tất. Nếu lỗi hoặc không rõ cửa sổ có riêng tư hay không, dừng bước nhập; không thử bằng cách dán mật khẩu vào lệnh.
5. AI chỉ kiểm public receipt và ciphertext, upload bản mã hóa vào **Keys/Recovery** theo hồ sơ storage mới, tải lại kiểm bytes/quyền. Sau đó Owner thực hiện thử mở khóa và bài tập mất máy theo hồ sơ riêng.

Receipt của bước mã hóa/upload chỉ chứng minh bước đó. Recovery toàn hệ thống còn cần DB, Auth, bytes Storage, cấu hình, secret và các tác vụ nền; bài thử phải tránh tự gửi email/gọi AI/chạy job ngoài ý muốn. Bản `QA-SYNTHETIC` ngày 13/10 là bằng chứng vận chuyển, không phải bản sao dữ liệu thật hay key của Owner.

## 5. Lộ trình Android đến Google Play

| Bước | Kết quả cụ thể cần có | AI làm tiếp | Owner cần làm |
|---|---|---|---|
| 1 — Kiểm điện thoại | Thiết bị được nhận, biết OS/package và bảo toàn dữ liệu. | Kiểm read-only, phân biệt bản cũ với ứng viên. | Mở khóa điện thoại và chấp nhận USB debugging nếu hệ thống hỏi. |
| 2 — Chốt ứng viên | Source rõ phạm vi, CI đúng commit, artifact/config có hash. | Review công việc hiện có, chuẩn bị ứng viên sạch và chạy kiểm tra thích hợp. | Xem mô tả thay đổi; không phải đọc tất cả file. |
| 3 — Hoàn tất Singapore | Bootstrap, Auth/SMTP, secret, recovery và kiểm quyền đủ bằng chứng. | Chuẩn bị packet 30 migration hiện tại, chức năng backend và kế hoạch dừng; giữ ledger legacy nguyên trạng. | Duyệt exact packet khi đủ; nhập thông tin riêng tư trực tiếp nơi thích hợp. |
| 4 — QA online và APK | Publish, provenance, feedback chạy xuyên App–backend–Admin trên bản đúng đích. | Chạy tài khoản giả, đo cost/retry/TTL/purge, tạo bản ký theo đường đã duyệt. | Thực hiện trải nghiệm chính trên Air1 Ultra theo checklist. |
| 5 — AAB và Play Rinternal | AAB đúng signing/target, cài từ Play và kiểm lại hành vi. | Chuẩn bị bản build, metadata/store checklist và bằng chứng. | Đăng nhập Play Console, xử lý xác minh tài khoản; upload/duyệt đúng bản. |
| 6 — Closed test nếu áp dụng | Đủ điều kiện tài khoản và phản hồi sử dụng thực tế. | Chuẩn bị phiếu thử, phân tích lỗi và phát hành bản sửa trong phạm vi. | Mời người thử, theo dõi tham gia và gửi yêu cầu production access khi đủ. |
| 7 — Production Android | Hồ sơ phát hành, hỗ trợ, giới hạn chi phí, giám sát và recovery được duyệt. | Tổng hợp nghiệm thu, chuẩn bị phát hành và smoke/quan sát. | Duyệt phát hành công khai cụ thể. Sau thành công mới bắt đầu đợt iOS. |

Đề xuất dùng EAS Build hiện có cho ứng viên ký; dùng APK để cài trực tiếp, AAB cho Google Play. Với tần suất phát hành ban đầu thấp, upload AAB bằng Play Console giúp tránh quản lý thêm service-account JSON chỉ để tự động submit. Đây là lựa chọn đơn giản hóa, không phải quy định bắt buộc: tài liệu Expo hiện hỗ trợ `eas submit` ngay lần đầu để tạo internal draft, và cũng hỗ trợ upload thủ công. Chưa bật auto-submit hoặc tự phát hành mỗi lần push. [Expo Android submission](https://docs.expo.dev/submit/android/)

Việc cài APK debug hiện tại và việc cài từ Google Play có thể dùng certificate khác. Trước khi nâng cấp, kiểm package, versionCode, certificate và đường bảo toàn dữ liệu; không xử lý lỗi chữ ký bằng cách tự gỡ app. Cần nghiệm thu đúng bản do Play phân phối trước khi duyệt production.

Các ca trong [checklist QA](AI_OPERATIONS_QA_2026-10-16.vi.md#phiếu-kiểm-thử-dùng-chung-cho-online-android-và-ios) tiếp tục áp dụng cho Android: đăng nhập/recovery, hai phiên publish xung đột, Tarot/Astrology, lưu/mở lại, feedback offline, quyền A/B, thu hồi staff, xóa/TTL, provider lỗi/cost và UI chữ lớn/Back/background. Đánh dấu iOS hoãn theo phạm vi; không biến kết quả Android thành kết quả hai nền tảng.

## 6. Điều kiện Google Play cần xác minh sớm

Chưa biết loại và ngày tạo Play Console account của Owner. Nếu là tài khoản cá nhân tạo sau **13/11/2023**, Google yêu cầu closed test có ít nhất **12 tester tham gia liên tục tối thiểu 14 ngày**, rồi mới nộp yêu cầu production access và trả lời câu hỏi về kiểm thử/readiness. Đủ thời gian không tự động bảo đảm được duyệt. Những người này là người dùng thử, không phải nhân sự phát triển. [Yêu cầu testing của Google Play](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)

Kế hoạch **5 tài khoản giả trong 7 ngày** ở báo cáo trước là QA kỹ thuật nội bộ; không thay thế closed test này. Nếu tài khoản không thuộc nhóm trên, vẫn phải hoàn thành yêu cầu thực tế mà Play Console hiển thị; không tự suy ra production access đã được mở.

Tài khoản cá nhân mới có thể cần Owner xác minh quyền sử dụng thiết bị qua ứng dụng Play Console. Google nêu thiết bị vật lý không root, Android 10 trở lên. Air1 Ultra API 33 đáp ứng phiên bản OS; chưa kết luận điều kiện không root hoặc xác minh tài khoản đã đạt chỉ từ ADB. [Xác minh thiết bị](https://support.google.com/googleplay/android-developer/answer/14316361?hl=en)

Phần Owner cần cung cấp là loại tài khoản, ngày tạo hoặc trạng thái production access đang hiển thị; không cần gửi password, mã MFA hay giấy tờ qua chat. Owner tự hoàn thành giấy tờ, email/điện thoại và thanh toán nếu Play yêu cầu. AI có thể chuẩn bị khai báo ứng dụng dựa trên hành vi thực, nhưng không thay Owner xác nhận các thông tin pháp lý hoặc danh tính.

## 7. Quyết định còn lại, không lặp lại việc đã chốt

**Đã chốt:** chỉ Owner và AI; Google Drive là nơi lưu bản key mã hóa; phạm vi gồm recovery/Android/backend API; Android làm trước; iOS làm sau Google Play. Không cần hỏi chọn lại project Singapore, nơi lưu key hoặc thuê người vận hành thứ hai.

**Cần Owner tham gia đúng thời điểm:** hoàn tất bước mật khẩu riêng; xác minh tình trạng Play Console; bố trí người thử nếu điều kiện 12/14 áp dụng; chốt trần chi phí AI/email/build và thời gian QA; duyệt ứng viên cloud/store cụ thể sau khi hồ sơ đủ. Chưa mua dịch vụ mới, bật tự nạp tiền hoặc cam kết phí định kỳ dựa trên hướng dẫn này.

Các việc còn lại là trách nhiệm kỹ thuật phải tiếp tục làm: hoàn chỉnh ứng viên, hồ sơ Singapore, cơ chế thực thi bảo vệ secret, backup/restore, signing, actual online QA và checklist thiết bị. Không yêu cầu Owner giải quyết chúng bằng một câu “đồng ý” chung. [Release runbook hiện hành](RELEASE_RUNBOOK.md) và [phiếu duyệt](OWNER_PACKET.vi.md) giữ nguyên hiệu lực; tài liệu này là hướng dẫn vận hành và điều chỉnh thứ tự nền tảng, không phải giấy phép triển khai.
