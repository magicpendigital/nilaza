# Bàn giao P1-B: khoá và phát lại kết quả Chiêm tinh, khoá hồ sơ sinh (15–16/11/2026)

Nhánh: `claude/nil-p1-astro-2026-11-15`, cắt từ `claude/nil-p0-p1-2026-11-15`. Chỉ có commit cục bộ, **chưa push và chưa áp lên Supabase nào**.

## 1. Đã thay đổi những gì (nói theo sản phẩm)

- **Hỏi lại cùng một lá số và cùng một chủ đề** thì Nilaza trả lại đúng bài đọc đã lưu. Không gọi AI và không trừ lượt. App hiện dòng: “Nilaza giữ nguyên diễn giải trước cho chủ đề này để kết quả luôn nhất quán — không tốn thêm lượt.”
- **Hỏi một chủ đề mới** (ví dụ chuyển từ tình cảm sang công việc) thì có bài đọc mới, vẫn trong hạn mức mỗi ngày như cũ.
- **Danh mục chủ đề cố định:** tổng quan, bản thân, tình cảm, công việc, gia đình, tiền bạc, sức khoẻ tinh thần, học tập, quyết định, khuôn mẫu, chung. Chủ đề được nhận ra từ chế độ, chủ đề đã chọn, hoặc từ khoá trong câu hỏi.
- **Khoá do máy chủ tính.** Máy chủ tự tính mã băm (input_hash) từ dữ kiện lá số đã chuẩn hoá. Mã băm hay khoá do app gửi lên sẽ bị từ chối.
- **Kết quả không sửa được.** Bài đọc đã xong chỉ có thể bị ẩn (xoá mềm) hoặc gắn biên nhận một lần. Bài bị lỗi không giữ khoá và không trừ lượt.
- **Hai yêu cầu giống nhau gửi cùng lúc** chỉ tạo một lần gọi AI và một bài đọc. Yêu cầu thứ hai nhận thông báo nhẹ “Nilaza vẫn đang viết bài đọc…”.
- **App chỉ còn quyền đọc** bài đọc của chính mình. Nút “xoá” giờ là ẩn: bài vẫn được giữ trên máy chủ, vẫn tính vào khoá và hạn mức.
- **Hồ sơ sinh của chính bạn:**
  - Trong 7 ngày đầu được sửa tối đa 2 lần, sau đó khoá. Hai con số này để trong hằng số, sau này Admin có thể điều khiển.
  - Thêm giờ sinh chính xác cho cùng ngày và nơi sinh thì được miễn một lần.
  - Mỗi lần sửa ghi lại một bản lưu chỉ có mã băm trước và sau, không có ngày giờ sinh thật.
  - Khi đã khoá, app hiện: “Hồ sơ sinh đã được khoá để kết quả luôn nhất quán. Nếu bạn nhập nhầm, hãy liên hệ hỗ trợ”.
  - Tính lá số và xem lá số đã lưu trên máy vẫn **không giới hạn** và không gọi AI.
  - Khoá chỉ được kiểm khi **lưu** lá số của chính mình, hoặc khi hỏi AI trên một lá số chưa lưu.
- **Lá số người khác** giữ giới hạn 20 như cũ.
- **Không đổi:** câu trả lời khủng hoảng vẫn có thẻ 115 và không gọi AI; khi bảo trì app vẫn báo “lượt của bạn chưa bị trừ”.

## 2. Tệp chính

- Migration mới: `supabase/migrations/20261115110000_astrology_lock.sql`
  **LF SHA-256: `90bdbf600f2fd3522ec4a2d166aa31543ed897169acde7603c25b9f61cffd11c`**
- Edge Function: `supabase/functions/ai-astrology-insight/` (`index.ts` nối dịch vụ, `handler.ts` xử lý, `handler_test.ts` kiểm thử), cùng `supabase/functions/_shared/astrology-lock.ts`.
- App:
  - `apps/mobile/src/features/astrology/birthProfileLock.ts` (mới)
  - `persistence.ts`, `AstrologyExperience.tsx`, `astrologyAiInsight.ts`
  - riêng đoạn Chiêm tinh trong `apps/mobile/src/backendClient.ts`
- Kiểm thử SQL: `scripts/astrology-lock-sql.test.mjs`.

## 3. Owner kiểm thế nào (sau khi được duyệt áp và deploy trên staging)

1. Đăng nhập tài khoản thử có Premium, tạo lá số và hỏi “Mình hợp với công việc nào?”. Bạn sẽ nhận một bài đọc và lượt bị trừ 1.
2. Hỏi lại câu đó (hoặc đổi cách diễn đạt nhưng vẫn về công việc). Bạn sẽ thấy cùng bài đọc, dòng “không tốn thêm lượt”, và lượt không đổi.
3. Hỏi về tình cảm. Bạn sẽ nhận bài mới, hoặc thấy thông báo hết lượt nếu đã dùng hết hạn mức trong ngày.
4. Xoá hồ sơ ngày sinh trong app rồi hỏi lại đúng câu cũ. Bạn vẫn nhận bài cũ và không bị trừ lượt.
5. Sửa ngày sinh 2 lần rồi lưu, sau đó sửa lần thứ 3 và lưu. Bạn sẽ thấy câu “Hồ sơ sinh đã được khoá…”.

## 4. Cần Owner duyệt (từng việc một)

Thứ tự bắt buộc: **áp migration trước, deploy function ngay sau**.

1. **Áp migration** `20261115110000_astrology_lock.sql` lên staging, đúng mã băm LF ở trên. Mã băm đổi thì phải duyệt lại.
2. **Deploy Edge Function `ai-astrology-insight`.** Function cần bí mật `SUPABASE_SERVICE_ROLE_KEY`. Bí mật này đã có sẵn trong môi trường Edge và các function khác đã dùng; không cần đặt bí mật mới.
3. Sau đó mới phát hành bản app mới (thuộc lượt phát hành riêng).

Lưu ý: mỗi lần đẩy lên `main` sẽ tự deploy Admin staging.

## 5. Rủi ro

- **Khoảng giữa hai bước:** sau khi áp migration mà chưa deploy function mới, function cũ sẽ lỗi khi ghi bài đọc vì app không còn quyền ghi bảng. Người dùng thấy lỗi nhưng **không bị trừ lượt**. Hãy làm hai bước liền nhau.
- **App bản cũ** (trước P1-B) xoá cứng bài đọc thì sẽ lỗi quyền. Thao tác xoá dữ liệu trên máy vẫn chạy, chỉ phần đồng bộ xoá trên máy chủ báo lỗi. App mới dùng xoá mềm qua RPC.
- **Xoá mềm giữ nội dung trên máy chủ.** Muốn xoá hẳn thì xoá tài khoản (dữ liệu xoá theo dây chuyền). Cần ghi rõ điều này trong chính sách quyền riêng tư.
- **Chủ đề nhận theo từ khoá** nên có thể xếp nhầm. Hỏi một ý mới nhưng rơi vào cùng chủ đề sẽ nhận lại bài cũ; đây là chủ ý để kết quả nhất quán.
- **Khoá hồ sơ sinh chỉ nằm trên máy:**
  - Có thể lách bằng cách cài lại app, xoá dữ liệu Chiêm tinh trên máy, hoặc chỉnh đồng hồ.
  - Thứ bảo vệ AI là khoá input_hash trên máy chủ.
  - Xoá hồ sơ sinh sẽ đổi “muối” nên mã băm cũ không còn đối chiếu được. Nhập lại sau khi xoá không bị tính là một lần sửa.
- **Máy chủ chưa có bộ tính lá số riêng**, nên chưa kiểm được dữ kiện app gửi lên có đúng thiên văn hay không. Nó chỉ kiểm hình dạng dữ kiện và băm lại dữ kiện đó.
- **Ngôn ngữ (vi/en) nằm trong khoá:** cùng chủ đề hỏi bằng ngôn ngữ khác sẽ thành một bài mới.

## 6. Hoàn tác (rollback) — cũng cần Owner duyệt

```sql
begin;
drop function if exists public.astrology_claim_report(uuid,text,text,text,text,text,text,text,integer,integer,timestamptz,jsonb,jsonb);
drop function if exists public.astrology_soft_delete_reports(text);
drop trigger if exists astrology_reports_guard on public.astrology_reports;
drop function if exists nilaza_private.astrology_reports_guard();
drop index if exists public.astrology_reports_user_lock_key_uidx;
drop policy if exists "users read own astrology reports" on public.astrology_reports;
grant select, insert, update, delete on table public.astrology_reports to authenticated;
create policy "users manage own astrology reports" on public.astrology_reports for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
commit;
```

- Các cột mới và các ràng buộc CHECK có thể để nguyên vì chúng vô hại.
- Bài đã xoá mềm sẽ hiện lại khi chính sách cũ (không lọc `deleted_at`) có hiệu lực. Nếu không muốn vậy, xoá hẳn các dòng `status = 'deleted'` trước khi hoàn tác; việc này cũng cần duyệt.
- Sau đó deploy lại bản `ai-astrology-insight` trước P1-B.

## 7. Đề xuất (chưa làm)

- **App.tsx (do agent Tarot sở hữu):** đổi thông báo sau khi xoá hồ sơ thành “Đã xóa hồ sơ ngày sinh trên máy và ẩn các bài đọc AI Chiêm tinh đã đồng bộ.” Lý do: bài đọc giờ chỉ được ẩn chứ không xoá hẳn.
- **Bộ tính lá số trên máy chủ:** tính lại vị trí sao từ ngày, giờ và nơi sinh, rồi băm kết quả đó. Cách này chặn được việc gửi dữ kiện bịa.
- **Daily Insight:** áp cùng cơ chế khoá theo ngày và chủ đề để không “quay lại” được.
- **Giới hạn lá số người khác:** Free khoảng 2, Premium khoảng 10 (hiện tại 20 cho tất cả).
