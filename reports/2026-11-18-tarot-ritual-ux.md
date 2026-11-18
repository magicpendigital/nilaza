# 18/11/2026 — Tarot nghi thức: 4 lá, nhịp lật, bố cục, kích thước lá

Hồ sơ: [`docs/feature-plans/tarot-ritual-ux-2026-11-18.json`](../docs/feature-plans/tarot-ritual-ux-2026-11-18.json) · nhánh `claude/tarot-ritual-ux-2026-11-18` (chưa gộp `main`).

## Góp ý của Owner (17/11, thử trên APK Singapore)
1. Rút 4 lá nhưng ảnh xem trước để chia sẻ chỉ có 3 lá.
2. Lật bài hơi nhanh, chưa giống một nghi thức cần bình tâm và tập trung vào câu hỏi.
3. Nội dung bên dưới dãy bài khó thấy, người dùng thường không biết phải cuộn xuống.
4. (18/11) Rút 1 lá thì lá hơi nhỏ, còn khoảng trắng bên dưới khi chưa có phần phân tích. Có nên cho kích thước lá thay đổi theo màn hình không?

## Nguyên nhân và cách sửa
| # | Nguyên nhân | Sửa |
|---|---|---|
| 1 | Mã chia sẻ cắt cứng ở 3 lá (`maxCards = 3`) ở ảnh, link và lời nhắn; trang web cũng chỉ nhận 3 mã lá | Một hằng số `MAX_SHARE_CARDS = 4` dùng chung; ảnh chia sẻ thu nhỏ lá và khoảng cách khi có 4 lá; trang web nhận tối đa 4 mã, vẫn mở được link cũ 1–3 lá |
| 2 | Thời gian các giai đoạn bay/lật đặt rải rác, rất ngắn | `ritualLayout.ts` gom thành 5 giai đoạn có tên: bay ra giữa 0,8 giây · **giữ úp 1,5 giây** (hiện câu hỏi của bạn và dòng "Giữ câu hỏi của bạn trong tâm trí", lá "thở" nhẹ) · **lật 1,5 giây** · **giữ tên lá 2 giây** · về vị trí 0,85 giây (tổng ≈ 6,7 giây mỗi lá). Nút rút hiện "Giữ câu hỏi trong tâm trí..." trong lúc bay và chờ xong mới cho rút tiếp. Người bật giảm chuyển động hoặc bấm "Lật cả N lá ngay" vẫn bỏ qua được hiệu ứng |
| 3 | Phần trạng thái, lỗi và nút rút ngẫu nhiên/lật cả bộ nằm dưới quạt bài, lẫn trong vùng cuộn | Trạng thái và thông báo đặt ngay dưới các ô vị trí; một hàng điều khiển nằm trên quạt bài (mũi tên trái/phải + "Rút ngẫu nhiên" + "Lật cả N lá ngay"); quạt bài thấp hơn (212 thay vì 230) để nút và quạt đều nằm trên nút "Lật lá này" cố định |
| 4 | Độ rộng ô lá cố định, không phụ thuộc màn hình hay số lá | Hàm `slotSizing` tính từ bề ngang vùng chứa, chiều cao màn hình và số lá. **Có, nên responsive**: 1 lá lúc còn quạt bài ≈ 42% bề ngang (110–160 px, bị giới hạn theo chiều cao để quạt bài không bị đẩy xuống dưới nút); khi đã rút xong, lá lớn lên ≈ 62% (150–220 px) với hiệu ứng mượt; 2–4 lá chia đều hàng, có trần theo số lá (140/120/92 px) |

## Đã kiểm chứng
- Jest `tarot` + `share`: 20 bộ, **108/108 đạt**; `tsc --noEmit` cho `apps/mobile` sạch.
- Có kiểm thử mới cho: 4 lá trong ảnh/link/lời nhắn (lá thứ 5 bị bỏ), hàm kích thước, thứ tự nội dung trên quạt bài, câu giữ tâm trí và tín hiệu bay xong.
- Trình duyệt, khung 360×800: bố cục 1 lá và 4 lá (ô vị trí, câu nhắc, hàng điều khiển, quạt bài) đều nằm trên nút cố định, không cần cuộn.

## Chưa kiểm chứng
- **Nhịp lật và hiệu ứng bay trên máy thật**: bản xem thử trên web không chạy được bước lật (lỗi tải mã lười, chỉ xảy ra ở môi trường xem thử). Cần Owner cảm nhận trên điện thoại.
- Ảnh chia sẻ 4 lá trên máy thật (độ vừa khung 4:5), bố cục 3 lá, và các cỡ màn hình khác (chỉ kiểm qua hàm và kiểm thử đơn vị).
- Link chia sẻ 4 lá chỉ mở đủ 4 lá sau khi **triển khai lại trang web** (`apps/web`, việc riêng cần Owner duyệt). Trước đó link 4 lá vẫn mở được nhưng trang chỉ hiện 3 lá đầu.

## APK để thử
EAS build `8c241d42-8a48-4903-91c0-e00463128259` (preview, Singapore): https://expo.dev/accounts/magicpen/projects/nilaza/builds/8c241d42-8a48-4903-91c0-e00463128259

APK đã tải về và cài lên điện thoại Android đang kết nối (18/11, `adb install` báo Success, gói `app.nilaza.mobile` bản 0.1.3). Chưa kiểm nhịp lật bài trên máy: chờ Owner cảm nhận.

## Chờ Owner
1. Thử APK rồi cho ý kiến về nhịp lật (có thể chỉnh số ở `FLIGHT_STAGES`).
2. ✅ Owner đã duyệt commit → merge → push vào `main` (18/11).
3. Quyết định riêng: triển khai lại trang web cho link 4 lá; xóa tài khoản thử; tải ghi chú khôi phục lên Drive.
