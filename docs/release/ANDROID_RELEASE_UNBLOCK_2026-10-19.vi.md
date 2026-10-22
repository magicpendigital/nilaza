# Nilaza — kết quả gỡ nghẽn kiểm tra local cho ứng viên Android

Cập nhật ngày 20/10/2026, Asia/Bangkok. Hồ sơ bắt đầu ngày 19/10; ngày trong tên tệp được giữ để đối chiếu bằng chứng.

**34/34 hạng mục kiểm tra local được chọn đã PASS, cùng 6/6 lệnh preflight trên một commit cố định.** Đã tạo được bundle JavaScript web và Android bằng dependency cài mới. Đây là kết quả local trên Windows; CI online, APK/AAB có chữ ký và nghiệm thu trên điện thoại chưa chạy. Chưa có push, PR, deploy, SQL cloud, đổi key hoặc phát hành.

[Biên nhận tổng hợp](../../artifacts/android-release-unblock-2026-10-19/final-local-validation.json) có SHA-256 `de6c5e97a4455c1ae8221d7198c609596d747502d00ab3e3cfd013008b1bc52b`. Các kết quả này cập nhật phần kiểm tra local còn thiếu trong [báo cáo ngày 18/10](ANDROID_CANDIDATE_AND_CREDENTIALS_2026-10-18.vi.md); không thay bằng chứng cloud/native hoặc phê duyệt release.

## 1. Bản nguồn và phạm vi đã hoàn tất

Ứng viên riêng nằm ở `D:/nilaza/.cache/android-release-unblock-2026-10-19/attempt2/candidate-clean`, branch `codex/android-release-unblock-2026-10-19`, commit **`ab597f41d9dea9ec82c9a1ed83a676850909a44c`**. Có 3.992 tệp nguồn, 1.631.387.667 byte. Đây là kích thước nguồn gồm artwork/tài liệu, không phải dung lượng ứng dụng tải từ Play.

Các lần chạy đều đối chiếu đủ tệp nguồn trước/sau với inventory đã chốt. HEAD/index của workspace gốc và candidate v4 trước đó giữ nguyên; công việc chưa commit của Owner được bảo toàn. Root vẫn ở `235f03acb5ab2ad5a598691f25dedb18e2013448`, v4 vẫn ở `5b3c438fa859db75b55e487ee4668d4e516f6d7a`. Không đưa các thay đổi riêng của candidate trở lại root hoặc main trong lượt này. Xem [hồ sơ commit](../../artifacts/android-release-unblock-2026-10-19/source-commit.json) và [inventory nguồn](../../artifacts/android-release-unblock-2026-10-19/staging-v3/inventory.json).

Môi trường dùng Node **24.19.0**, npm **11.12.1** và cài mới theo lockfile vào candidate, thay cho dependency junction từng làm Metro thất bại ở v4. Lifecycle scripts bị tắt; tiến trình không nhận biến môi trường backend hoặc cấu hình tài khoản npm/Git của Owner. App lockfile giữ SHA-256 `ba3e99deb94ffd6b862f2008b5886cb60aac9a60d4fa1c28cc98f4226a2bbedb`. [Biên nhận dependency](../../artifacts/android-release-unblock-2026-10-19/candidate-dependencies.json).

Candidate đã nhận đối chiếu đổi đường dẫn Tinh Quang sang `celestial-reverie`, giữ tên VI **Tinh Quang**, tên EN **Celestial Reverie** và trạng thái Free. Lookup tương thích ID cũ/mới và bảo toàn dữ liệu cache/outbox khi xung đột đã có trong nguồn được kiểm. Chưa đổi slug/UUID cloud, chưa suy ra deck remote đã xuất hiện trên app đăng nhập. [Hồ sơ đổi đường dẫn](../CELESTIAL_REVERIE_PATH_RENAME_2026-10-19.vi.md).

## 2. Kết quả kiểm tra thực tế

| Phần kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| Mobile | Type check PASS; **327/327 tests**, 53 suites | Chưa phải chạy native trên điện thoại |
| Admin | Check PASS; **176/176 tests** | Chưa phải phiên Admin được bảo vệ trên online |
| AI Operations | **22/22 tests**, gồm SQL publish cấu hình và feedback | Database giả lập local; chưa chứng minh JWT/RLS/concurrency của Supabase đã deploy |
| Release và feature checker | **39/39** và **10/10 tests** | Test đúng hành vi gate; không có nghĩa release được phép chạy |
| Astrology | **14/14 core tests**; accuracy/grid và các contract checks PASS | Không thay nghiệm thu trải nghiệm hoặc chất lượng diễn giải AI |
| Web, dữ liệu, brand, cấu hình | Các hạng mục được chọn trong tổng **34 jobs PASS** | Không phải mọi lệnh/test của toàn repository |
| Preflight | CI mode local với base `235f03a…` và 5 hồ sơ tích hợp đều PASS | Chưa phải GitHub Actions/Linux hoặc base main hiện tại trên remote |

[Biên nhận preflight thực tế](../../artifacts/android-release-unblock-2026-10-19/actual-preflight-v3/results.json) có SHA-256 `20d38a8df6c7e86d185b659bbd5d88d1a07fa12d19b821589ea3f88a938a51a1`.

[QC đối chiếu bổ sung](../../artifacts/android-release-unblock-2026-10-19/final-qc.json) đã kiểm 34 log, sáu preflight, tám inventory trước/sau và bằng chứng SQL/bundle: PASS trong phạm vi local, không có lỗi chặn báo cáo. SHA-256 `71d1dec890e2c723bfd07ec37b47836645577a3eaec7d3adec8f5c14d42a751a`. Không chạy lại các test đã đạt hoặc diễn giải kết quả này thành phê duyệt release.

Metro đã export thực tế, sau đó kiểm lại bytes/hash của toàn bộ output đã ghi:

| Output | Kích thước JS chính | SHA-256 |
| --- | ---: | --- |
| Web JS | 9.403.274 byte | `93486985c385effbe58d8d633c03e61a45cd3dec83db9fb4f4e369dbfe7b0f34` |
| Android embedded JS bundle | 10.249.793 byte | `06d98d6af5fbf05f78d39627a95a3ba826e2cefdd14df81603cb3f2422b7ea58` |

Output web có 723 tệp, 86.205.788 byte; Android có 722 tệp, 108.018.092 byte, gồm assets và output phụ trợ. Các số này không phải dung lượng download/cài đặt APK/AAB. Bundle Android nằm ở `.cache/validation-run01/android/index.android.bundle` bên trong candidate. [Lần export thực tế](../../artifacts/android-release-unblock-2026-10-19/validation-run01/results.json).

## 3. Đối chiếu hồ sơ CI và lịch sử lỗi

Đã giữ **59 snapshot hồ sơ** đúng byte: 56 bản từ v4 và 3 biến thể hiện tại. Năm hồ sơ tích hợp mới bao phủ các thay đổi được review, giữ tiêu chí nghiệm thu/rủi ro/gate còn lại. Đây không phải 59 tính năng đã hoàn tất. Các phạm vi được thu gọn theo đường dẫn sở hữu hẹp để chạy được trên Windows; đối chiếu không mở rộng thêm coverage đối với các tệp tracked hiện có. Checker và chính sách quan trọng được giữ nguyên; không cập nhật hàng loạt hash để bỏ qua lỗi cũ. [Biên nhận đối chiếu](../../artifacts/android-release-unblock-2026-10-19/composition-reviews-v3.receipt.json).

Chỉ ba workflow quality trong candidate đổi Node sang 24.19.0. Sự kiện kích hoạt, quyền và lệnh kiểm tra giữ nguyên. **34 jobs local không đồng nghĩa đã cấu hình hoặc chạy 34 jobs online.** Bộ AI Operations SQL là kiểm tra bổ sung local; workflow Admin hiện chưa gọi bộ này.

Các lỗi trước được giữ nguyên bằng chứng:

1. **Run01:** 24 jobs PASS rồi dừng vì hai test SQL import dependency từ đường dẫn output lịch sử không có trong bản nguồn sạch. Các test endpoint đã chạy không thay phần SQL còn thiếu.
2. **Run02:** thêm ba jobs PASS; test release gặp thư mục TEMP nằm trong Git. Checker từ chối fixture offline theo đúng quy tắc, không phải lý do để nới checker.
3. **Run03:** dùng TEMP mới ngoài Git riêng cho test release; sáu jobs PASS, gồm 39 test release và các bài còn lại. Không sửa source/checker hoặc kỳ vọng test.
4. **SQL fixture v1:** xác minh package/tarball công khai đúng integrity nhưng dừng trước npm vì truy vấn `check-ignore --stdin` không nhận cờ `--literal-pathspecs`. Giữ receipt lỗi và toàn bộ bằng chứng.
5. **SQL fixture v2 và Run04:** chỉ sửa truy vấn ignore của ba đường dẫn cố định trong helper local; cài riêng PGlite **0.5.8** đúng integrity mà test gốc yêu cầu, rồi chạy lại AI Operations đạt **22/22**.

Xem [run02](../../artifacts/android-release-unblock-2026-10-19/validation-run02/results.json), [run03](../../artifacts/android-release-unblock-2026-10-19/validation-run03/results.json), [fixture v2](../../artifacts/android-release-unblock-2026-10-19/sqlfixture/install-v2/receipt.json), [run04](../../artifacts/android-release-unblock-2026-10-19/validation-run04/results.json) và [kết quả feedback SQL](../../artifacts/android-release-unblock-2026-10-19/feedback-sql-proof.json).

Không copy output lịch sử, không nâng dependency sản phẩm, không đổi test hoặc migration. Fixture có lock riêng; npm chỉ cài tại prefix cố định, workspace/lifecycle bị tắt. App lock và các fingerprint của dependency root/hidden lock giữ nguyên; **không có tuyên bố đã quét từng byte toàn bộ app node_modules**. SQL chạy với auth schema giả lập và một kết nối PGlite; chưa chứng minh JWT, cạnh tranh nhiều tiến trình hoặc lịch purge online. Đường import fixture gắn với output lịch sử vẫn là nợ portability cần xử lý trước khi đưa bộ SQL này vào CI tái lập.

## 4. Những gate còn thiếu

| Gate | Trạng thái và ý nghĩa |
| --- | --- |
| Vercel/GitHub | Chưa đọc được Git Settings qua tài khoản đúng. Lần kiểm kết nối ngày 20/10 không thấy Chrome; không kết luận Owner chưa đăng nhập hoặc mất quyền. CI online **NOT RUN**. |
| Chuyển nguồn lên remote | Candidate vẫn kế thừa lịch sử qua parent/alternates. Working tree sạch không chứng minh lịch sử không có dữ liệu riêng. Chưa chứng nhận cách push/bundle an toàn; không chuyển toàn bộ lịch sử. |
| Singapore | Vẫn là canonical candidate `etfajmrwyywokgafzxsb`; runtime chưa retarget. `release-profile.json.targets=[]`, ledger legacy vẫn `blocked_pending_reconciliation`. Kiểm ledger PASS chỉ xác nhận quy tắc bảo vệ còn nguyên. |
| AI online | Còn Auth trước mọi paid dispatch, route/default/schema, durable spend reservation/trần chi phí/kill switch, entitlement và degraded path. Chưa chọn/kích hoạt provider/model/ngân sách mới. |
| Quản trị và feedback | Cần nghiệm thu app → backend → Admin, quyền A/B/staff/revocation, publish xung đột/retry, provenance, offline feedback, TTL/purge và xóa tài khoản trên đích quản lý thật. |
| Khôi phục và vận hành | Thử khôi phục key từ Drive trước đây không thay recovery toàn hệ thống DB/Auth/Storage/jobs ở ngữ cảnh khác máy. Credential/operator isolation và các phần backup còn thiếu vẫn cần bằng chứng. |
| Android | Chưa build APK/AAB có chữ ký; chưa cài/nghiệm thu đúng candidate trên điện thoại hoặc từ Play. |
| iOS | Hoãn theo quyết định Android/Google Play trước; **không ghi PASS**, không chặn riêng ứng viên Android. |

Vercel có bằng chứng từng tự deploy Admin ở run cũ, nên cần xác minh production branch/preview rules trước một thao tác Git có thể kích hoạt deploy. [Trạng thái kết nối hiện tại](../../artifacts/android-release-unblock-2026-10-19/quality-vercel-browser-2026-10-20.json). Chưa thay project settings hoặc suy rằng cần mua gói mới.

Chất lượng nội dung/UI vẫn là luồng công việc riêng. Cả 78 lá có nghĩa cơ bản nhưng deep-library mới có **6/78** bài đại diện; AI chưa dùng chung toàn bộ knowledge plane thư viện/Admin. Validator/hash không thay review chi tiết, bản quyền hoặc kiểm từng ảnh. Hướng dẫn Owner Admin còn citation publish cũ và thiếu quy trình Feedback Inbox/provenance. Cần cập nhật cùng đợt nghiệm thu; không coi trải nghiệm đã tối ưu chỉ vì test PASS. [Review giới hạn và phần còn thiếu](../../artifacts/android-release-unblock-2026-10-19/review-residual-delivery.json).

## 5. Thứ tự tiếp theo và phần Owner cần thao tác

1. **Kết nối đúng Vercel trước:** Owner đăng nhập trên Chrome, mở [Git Settings của Nilaza Admin](https://vercel.com/magicpens-projects/nilaza-admin-staging/settings/git), giữ tab mở và báo đã mở xong. Tôi kiểm metadata Git/deploy khi Chrome kết nối được. Không cần gửi key, mật khẩu hoặc OTP; chưa đổi setting trong bước đọc này.
2. **Chốt đường CI online:** tôi chuẩn bị cách chuyển nguồn an toàn và mô tả tác động Vercel/GitHub, đối chiếu main/base thực. Chỉ thực hiện push/PR hoặc thay cấu hình deploy khi đúng phạm vi cụ thể được Owner duyệt. CI phải gắn đúng commit; nếu commit/base đổi, kiểm lại phần bị ảnh hưởng, không gắn receipt cũ sang nguồn mới.
3. **Khép blocker backend trước activation:** tôi chuẩn bị sửa Auth/chi phí/route/Admin và packet đúng target, artifact/config/rollback. Khi hồ sơ đủ, Owner chốt provider/model/trần chi phí và duyệt riêng thao tác cloud/SQL/credential cần thiết. Hiện chưa cần Owner tìm thêm key hoặc xoay key cũ.
4. **Online QA rồi bản Android ký:** nghiệm thu publish/provenance/feedback trên dữ liệu giả được duyệt; sau đó chuẩn bị APK đúng signing/target để Owner thử điện thoại. Không gỡ bản app hiện có để xử lý chữ ký khi chưa có phương án bảo toàn dữ liệu.
5. **Owner thử theo kịch bản:** đăng nhập → Tarot chọn bộ/trải/rút/xem chi tiết → lưu/mở lại Journal → gửi feedback và đối chiếu trong Admin; Astrology tính lá số/giải thích; lỗi mạng/retry, chữ lớn, Back/background và xóa/khôi phục. Ghi nhận từng lỗi theo câu trả lời/config đang dùng. Sau nghiệm thu mới chuẩn bị AAB, cài từ Play và các gate tài khoản/closed testing theo Play Console hiện tại. iOS bắt đầu sau thành công Google Play.

Owner là người giữ tài khoản, secret và quyết định release; AI chuẩn bị và kiểm chứng kỹ thuật. Các review bổ sung không thay phê duyệt của Owner. Phần đã hoàn tất trong lượt này là nguồn và kiểm tra local có bằng chứng; phần online/native tiếp tục theo [runbook](RELEASE_RUNBOOK.md), [hướng dẫn solo](SOLO_ANDROID_AND_KEYS_2026-10-16.vi.md) và [phiếu QA](AI_OPERATIONS_QA_2026-10-16.vi.md).
