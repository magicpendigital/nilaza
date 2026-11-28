# Bàn giao Tarot v2 · Gói 1: lá khách rút được giữ lại sau khi đăng nhập (16/11/2026)

Nhánh `claude/tarot-guest-draw-2026-11-16`. Hồ sơ: `docs/feature-plans/tarot-guest-server-draw-2026-11-16.json`. Đề xuất gốc: `docs/proposals/TAROT_FREE_DRAW_AI_DEPTH_2026-11-15.vi.md`. Gói 0 đã vào `main` (PR #46).
**Chưa đặt bí mật, chưa deploy, chưa phát hành app.** Không có SQL mới (không migration). Mọi việc cần Owner nằm ở mục "Thứ tự triển khai".

## Owner đã chốt (16/11): "Chọn cách A"
Khách rút bài trên máy chưa đăng nhập; sau khi đăng nhập vẫn là **đúng những lá đó**, chỉ chạy thêm phần phân tích. Cách A: máy chủ cấp lá cho khách bằng một công thức cố định, không cần lưu gì ở cơ sở dữ liệu.

## Cách hoạt động
1. **Khách (chưa đăng nhập):** app tạo một mã ngẫu nhiên cho máy (không phải tài khoản, không chứa thông tin cá nhân) và gọi hàm công khai mới `tarot-guest-draw`. Máy chủ tính lá từ `HMAC-SHA256(bí mật máy chủ, mã máy + kiểu trải + chủ đề + ngày Việt Nam)`. Cùng đầu vào luôn ra cùng lá, nên khách không thể rút lại để đổi lá, và app không tự chọn được lá. Khách vẫn **chỉ thấy hình và tên lá, không thấy ý nghĩa**.
2. **Sau khi đăng nhập:** nếu máy còn lá của khách trong **cùng ngày Việt Nam**, Trang chủ hiện một thẻ "tiếp tục". Bấm vào, app gọi `ai-tarot-reading` (draw) kèm mã máy; máy chủ tính lại đúng các lá đó và tạo bài đã khóa theo ngày cho tài khoản (`guestAdopted = true`). Người dùng thấy các lá, bài đọc có sẵn của Nilaza và nút "Phân tích chuyên sâu bằng AI". App xóa lá khách đã lưu.
3. **Dự phòng:** hàm tắt, chưa đặt bí mật, mất mạng, hoặc đã sang ngày khác thì khách rút cục bộ (ghi rõ là bản xem thử, không lưu) và tài khoản rút bình thường bằng CSPRNG (`guestAdopted = false`).
4. Nếu tài khoản **đã có** bài khóa cùng khóa trong ngày thì máy chủ trả lại bài cũ, không đổi.

## Phần mã
- Máy chủ: `_shared/tarot-guest-seed.ts` (+ test), hàm mới `supabase/functions/tarot-guest-draw/` (chỉ POST, CORS, `no-store`, đọc JSON có giới hạn, mã máy phải là UUID, 503 `guest_draw_unavailable` nếu bí mật chưa đặt hoặc dưới 32 ký tự), `ai-tarot-reading` nhận thêm `guestDeviceId` tùy chọn và trả thêm `guestAdopted`, `supabase/config.toml` đặt `verify_jwt = false` cho hàm mới, `validate-backend-contracts` và `check-supabase-readiness` liệt kê hàm mới, README hàm.
- App: `src/features/tarot/guestDraw.ts` (lưu mã máy và lá khách), `GuestCarryCard.tsx`, `backendClient.ts` (`requestGuestTarotDraw`, chỉ gửi `apikey`), `GuestPreview.tsx`, `serverDraw.ts`, `App.tsx`.
- Không đổi: khóa theo chủ đề, trần mềm 3, lá làm rõ, kiểm bộ Premium, `interpret`, migration, RLS.

## Thứ tự triển khai (mỗi bước Owner duyệt riêng; agent không làm thay)
0. **Điều kiện trước (từ Gói 0):** áp migration `supabase/migrations/20261116100000_tarot_draw_claim_free_draw.sql` (mã băm `6b37fdac…bfb8d`) **trước** khi deploy `ai-tarot-reading`.
1. **Owner tự đặt bí mật** `TAROT_GUEST_DRAW_SECRET` trong Supabase (chuỗi ngẫu nhiên ≥ 32 ký tự). Agent không đặt và không đọc giá trị. Chưa đặt thì hàm trả 503 và app dự phòng như mục 3 (không hỏng, chỉ mất tính năng giữ lá).
2. Deploy `tarot-guest-draw` (mới, `verify_jwt = false` theo `config.toml`) và deploy lại `ai-tarot-reading`. Hai hàm phải dùng **cùng một** bí mật.
3. Phát hành app mới. App cũ gặp máy chủ mới không hỏng: bỏ qua trường mới.
4. **Chữ về dữ liệu (Play Data safety và chính sách riêng tư):** app gửi một mã ngẫu nhiên của lần cài đặt cùng kiểu trải và chủ đề tới máy chủ khi khách rút bài. Đây là "mã thiết bị hoặc mã khác"; Owner và rà soát pháp lý quyết định cách khai báo trước khi phát hành.

## Cách Owner thử trên điện thoại (sau bước 0–3)
1. Đăng xuất, Xem thử → tab Rút bài → chọn Tình cảm, 3 lá → Rút. Thấy hình và tên lá, **không** thấy ý nghĩa, có dòng nói lá được giữ để đăng nhập. Ghi lại 3 lá.
2. Rút lại cùng kiểu trải và chủ đề: **phải ra đúng 3 lá cũ**. Đổi chủ đề thì ra lá khác.
3. Đăng nhập (cùng ngày). Trang chủ có thẻ tiếp tục; bấm vào: **đúng 3 lá đã ghi**, bài đọc có sẵn, nút Phân tích chuyên sâu. Thử phân tích: nhận bài AI trên đúng các lá đó.
4. Đăng xuất, đợi sang ngày Việt Nam kế tiếp (hoặc xóa dữ liệu app), rút rồi đăng nhập: không có thẻ tiếp tục và rút bình thường.
5. Thử khi chưa đặt bí mật (hoặc tắt mạng lúc rút): khách vẫn rút được, có chú thích bản xem thử, sau khi đăng nhập là rút bình thường.

## Đã kiểm chứng / chưa kiểm chứng
- ✅ Deno 45/45 (qua import map tạm vì `deno.land` bị chặn trong phiên; gồm test mới cho `tarot-guest-seed`, `tarot-guest-draw` và 3 test nhận lá trong `ai-tarot-reading`), Jest nhóm Tarot và khách 63/63, `tsc` app, `validate:backend`, `supabase:check`.
- ❌ Chưa kiểm: Supabase thật, bí mật thật, điện thoại thật, TalkBack, chữ lớn. `drawGuestCard`, hiệu ứng nhận lá và thẻ trên Trang chủ trong `App.tsx` chưa có test tự động (Jest không nạp được `App.tsx`); phần tách ra (`guestDraw`, `GuestCarryCard`, `GuestPreview`, `requestGuestTarotDraw`) có test.

## Rủi ro đã biết
- **Không giới hạn tần suất ở hàm khách** (không lưu gì nên không đếm được). Mỗi cặp (mã máy, kiểu trải, chủ đề, ngày) chỉ cho đúng một kết quả, nên kẻ phá chỉ gây tải, không đổi được lá của người khác. Có thể thêm giới hạn ở cổng sau (Supabase hoặc Vercel); cần Owner duyệt.
- **Khóa theo mã máy:** cài lại app (mã mới) hoặc xóa dữ liệu app thì khách được lá khác. Không ảnh hưởng tài khoản đã đăng nhập.
- **Chỉ giữ lá trong cùng ngày Việt Nam.** Khách rút tối rồi đăng nhập sau 00:00 sẽ rút lại bình thường.
- **Bí mật lộ = lá khách đoán trước được.** Chỉ ảnh hưởng độ ngẫu nhiên của lá khách, không chạm dữ liệu người dùng. Đổi bí mật làm mọi lá khách chưa nhận đổi theo.
- Người dùng có hai thiết bị: chỉ thiết bị có mã máy khớp mới nhận lá; thiết bị kia rút bình thường.

## Hoàn tác
Revert commit. Hoặc chỉ gỡ bí mật/hàm: khách dự phòng sang rút cục bộ và tài khoản sang rút bằng CSPRNG; không cần SQL.
