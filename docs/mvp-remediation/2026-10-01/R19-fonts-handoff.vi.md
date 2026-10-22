# R19 — Giảm asset font không dùng

Ngày01/10/2026. Root triển khai theo review read-only của mobile architecture Agent. Preflight `mvp-R19-used-fonts-2026-10-01.json` PASS trước sửa. Chỉ thay7import trong App bằng package per-weight exports; giữ nguyên useFonts/theme/7font variables, không thay thiết kế, dependency hay nội dung.

| Chỉ số production web | Trước | Sau |
|---|---:|---:|
| Font TTF | 29 | 8 |
| Font bytes | 6,897,284 | 2,342,384 |
| Export files / assets | 664 /660 | 643 /639 |
| Export bytes | 77,772,604 | 73,206,942 |
| JS raw bytes | 9,238,430 | 9,227,668 |
| JS gzip bytes (zlib mặc định) | 2,324,729 | 2,322,310 |

Loại21font dư, tiết kiệm4,554,900bytes font; tổng export giảm4,565,662bytes≈4.35MiB/5.87%. Giữ3EB Garamond+4Hanken Grotesk vàIonicons; cả8TTF có SHA256 giống baseline. Không gán4.55MB giảm cho JavaScript. JPG/PNG/canonical content không đổi trong source.

Web JS mới SHA256`d8df816a67a6ea33e278ccde99aabc702ff4d7baae2947138a18e5a0af4d36bf`; artifact `output/mvp-20261001-fonts/web/_expo/static/js/web/index-d192fd23658e6efeb8f6e0d227c3c30a.js`. Export validator69.82MiB PASS. Android embed mới PASS1966modules/639assets; số/hash bundle được ghi ở board/R01 sau đối chiếu. Không APK/AAB/signed/device claim.

TypeScript PASS; đúng2font-readiness tests PASS. Lệnh đầu trỏ nhầm extension`.tsx` báo No tests found/exit1; đã sửa path`.ts` và chạy thực, không passWithNoTests. Full269mobiletests trước import-only slice; không nói đã chạy lại toàn bộ sauR19.

Browser CDP tab mới vẫn timeout sau khi builds hoàn tất, nên visual headings/body/italic/icons ở bản mới và native font200%/startup còn chưa nghiệm thu. Không sửa browser bằng công cụ khác. Manager đọc8font hashes và artifact mới, rồi kiểm UI trên device/preview khi điều khiển khả dụng.

Review bundle: GeoNames `packages/astrology-core/places.json` khoảng5,616,376bytes/60.79% JS baseline. Tối ưu delivery phải giữ tìm kiếm địa điểm/aliases và chart semantics; chưa cắt dữ liệu hay gán tốc độ/RAM từ file size. TTF savings không thay startup/network measurement. A2UI/shared controls và chart layouts giữ nguyên.

Rollback chỉ7import về hai barrels; giữ mọi owner App changes và output baseline. Nilaza Plan-QC/Brand skills verified-current: exact slice, approved typography và separate native gates vẫn đúng, không cần sửa skill.
