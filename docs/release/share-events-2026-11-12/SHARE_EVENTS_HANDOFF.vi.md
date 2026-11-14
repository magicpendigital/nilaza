# Sao chép link khi chia sẻ ảnh và đưa sự kiện chia sẻ lên máy chủ — bàn giao (12/11/2026)

Trạng thái: **code và test xong; hàm `share-events` CHƯA deploy lên Singapore; không có SQL nào được chạy.** Hồ sơ kế hoạch: [`share-events-clipboard-2026-11-12.json`](../../feature-plans/share-events-clipboard-2026-11-12.json).

## 1. Đã làm gì

1. **Sao chép link (clipboard):** bấm **Chia sẻ ảnh** thì link theo dõi được sao chép sẵn rồi mới mở bảng chia sẻ; app báo "Đã sao chép link. Hãy dán vào tin nhắn cùng với ảnh." Nếu clipboard lỗi, ảnh vẫn được chia sẻ. Nút **Gửi kèm link** vẫn gửi đoạn chữ + link như trước. Thêm thư viện `expo-clipboard` ~8.0.8 (bộ Expo SDK 54).
2. **Hàm Edge Function mới `share-events`:** nhận `share_tapped` và `share_completed` từ app, ghi vào bảng **`usage_events` đã có sẵn** (`feature = 'share'`, `metadata` chỉ có `surface`, `action`, `outcome`).
   - Bắt buộc đăng nhập, người dùng ẩn danh bị từ chối **trước khi đọc nội dung**.
   - `user_id` lấy từ token đã xác thực, **không** nhận từ nội dung gửi lên.
   - Chỉ nhận giá trị trong danh sách cho phép; thừa trường hay chữ tự do → 400. Tối đa 10 sự kiện mỗi yêu cầu, **100 sự kiện/người/24 giờ** (vượt → 429).
3. **App gửi sự kiện lên máy chủ** (chỉ khi đã đăng nhập và có địa chỉ máy chủ). Không bao giờ chặn việc chia sẻ; lỗi hay hàm chưa deploy chỉ bị bỏ qua, sự kiện cục bộ vẫn được ghi như cũ.

## 2. SQL: không cần

Tôi đã kiểm tra: `usage_events` có sẵn `event_name`, `feature`, `metadata`, `user_id`; các hàm AI khác đã ghi vào đó bằng service role; tính năng xóa tài khoản đã xóa các dòng này theo `user_id`. Vì vậy **không có migration mới**, gói SQL Singapore và mã băm của nó **không đổi**. Bước "hàm + SQL" bạn duyệt thu gọn thành "chỉ hàm".

## 3. Việc Owner làm: deploy hàm (một lần duyệt)

Tôi không deploy thay bạn (quy tắc dự án: deploy hàm cần Owner chạy, như các lần trước). Lệnh:

```bash
npx supabase functions deploy share-events --use-api --project-ref etfajmrwyywokgafzxsb
```

Sau đó kiểm tra: gọi không đăng nhập phải trả **401**. Rồi bấm chia sẻ trên điện thoại (đã đăng nhập) và chạy câu truy vấn này trong Supabase (chỉ đọc):

```sql
select event_name, metadata->>'surface' as surface, metadata->>'action' as action,
       metadata->>'outcome' as outcome, count(*) as n
from public.usage_events
where feature = 'share'
group by 1, 2, 3, 4
order by 1, 2, 3, 4;
```

Hoàn tác: xóa hàm trên Supabase (app vẫn chạy bình thường) và, nếu muốn xóa dữ liệu đã thu: `delete from public.usage_events where feature = 'share';` (cần Owner duyệt riêng).

## 4. Quyền riêng tư và Data safety

Sự kiện chỉ chứa giá trị liệt kê sẵn: không câu hỏi, ghi chú, tâm trạng, ngày giờ nơi sinh, tên, mã lá bài hay link. Dòng dữ liệu gắn với tài khoản nên bị xóa khi xóa tài khoản. Form Data safety cần ghi "tương tác trong ứng dụng, dùng cho phân tích".

## 5. Kiểm thử đã chạy (12/11/2026)

- Deno: `share-events` **9/9** (gồm dữ liệu riêng tư, thừa trường, vượt hạn mức, ẩn danh, lỗi cơ sở dữ liệu).
- Jest toàn bộ mobile: **497/497, 91 bộ**; tsc sạch. Test mới kiểm tra danh sách giá trị của app **khớp từng chữ** với hàm máy chủ.
- `validate:backend` đạt (23 hàm), kèm kiểm chứng ngược: sửa hàm để lấy `user_id` từ nội dung gửi lên thì bộ kiểm báo lỗi. `supabase:check`: 72 đạt, 0 lỗi. Sổ cái migration vẫn ở trạng thái chặn như dự kiến, không bị đụng tới.

## 6. Chưa kiểm chứng

- Hàm **chưa chạy trên project thật** cho tới khi bạn deploy.
- `share_completed` vẫn chỉ nghĩa "bảng chia sẻ đã trả về".
- Sao chép clipboard ghi đè thứ người dùng đang sao chép.
- Kết quả thử trên điện thoại: xem mục 7.

## 7. Thử trên điện thoại Air1 Ultra

**Đã kiểm chứng trên Air1 Ultra (13/11/2026):**

- Dựng được bản release arm64 (versionCode 4, versionName 0.1.3), trỏ tới project Singapore, chỉ dùng khóa công khai. Lần dựng đầu lỗi vì đường dẫn quá dài (giới hạn 250 ký tự của CMake), lần hai vì máy chỉ còn khoảng 73 MB RAM trống, lần ba thành công sau khi giảm số luồng.
- Cài đè bằng `adb install -r`: **Success**, không gỡ app cũ, dữ liệu giữ nguyên; app mở được, không có sự cố mới trong nhật ký crash.
- Lá bài hôm nay → nút chia sẻ: màn hình chia sẻ mở đúng, thẻ chỉ có nội dung công khai của lá bài.
- **Chia sẻ ảnh:** ảnh chụp được trên kiến trúc mới (Fabric), bảng chia sẻ của Android hiện đúng thẻ; thông báo "Đã sao chép link. Hãy dán vào tin nhắn cùng với ảnh." hiện ra. Không gửi cho ai.
- **Link đã sao chép** (dán thử vào ô nhập của app, không gửi): có mã lá bài công khai và `utm_source=share`, `utm_medium=card`, `utm_campaign=today_card`, `utm_content=<mã ngẫu nhiên>`. Không có tên, câu hỏi hay ngày sinh.

**Lỗi tìm thấy khi thử và đã sửa trong mã:**

1. Chữ chồng nhau trên thẻ (NILAZA đè nhãn "LÁ BÀI HÔM NAY"; hai dòng mô tả đè nhau) vì phần giữa thẻ cao hơn chỗ trống. Đã thu nhỏ ảnh một lá (150 → 112) và chặn tràn. Bản sửa (dựng lần 4) đã cài lên máy và **xem lại: hết chồng chữ**.
2. Thông báo thành công hiện màu hồng như lỗi. Đã đổi: thành công dùng màu trung tính, lỗi vẫn màu hồng. **Đã xem lại trên máy: đúng.**

Sau khi sửa, thử lại trên máy: thẻ bố cục sạch; **Gửi kèm link** mở bảng chia sẻ với đoạn chữ có link (không gửi cho ai).

**Chưa kiểm chứng:**

- Chia sẻ từ bài đọc Tarot; Thiên văn (Big 3 và lời mời so bản đồ sao): tài khoản thử chưa có ngày sinh.
- Hành vi trên Android 13 (máy thử không báo phiên bản đã kiểm).
- Sự kiện lên máy chủ: chỉ kiểm được sau khi deploy `share-events` (mục 3).
