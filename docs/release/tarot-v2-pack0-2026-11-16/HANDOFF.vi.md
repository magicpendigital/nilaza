# Bàn giao Tarot v2 · Gói 0: rút bài miễn phí, AI chỉ khi bấm (16/11/2026)

Nhánh `claude/admiring-fermi-t41lec` (PR nháp #46). Hồ sơ: `docs/feature-plans/tarot-free-draw-gate-2026-11-16.json`. Đề xuất gốc: `docs/proposals/TAROT_FREE_DRAW_AI_DEPTH_2026-11-15.vi.md`.
**Cập nhật 16/11 (sau khi `main` ghi nhận migration P1-A đã áp lên Singapore):** tệp migration P1-A **không bị sửa** (vẫn đúng mã băm đã áp `e193323e…`); phần thay đổi nằm trong một **migration mới** `supabase/migrations/20261116100000_tarot_draw_claim_free_draw.sql`. **Chưa áp migration mới, chưa deploy hàm mới, chưa phát hành app.** Mọi việc đó cần Owner duyệt riêng (mục "Thứ tự triển khai").

## Owner đã chốt (16/11) và đã làm
| Câu | Quyết định | Trong mã |
|---|---|---|
| Q1 | Tách trần số trải bài khỏi hạn mức AI | `handler.ts`: `drawCap` chỉ còn trần mềm 3. Migration mới thay thân hàm `tarot_draw_claim` để không còn chặn theo hạn mức AI (chữ ký và quyền giữ nguyên). |
| Q2 | Khách chưa đăng nhập **được xem và rút bài, không xem được ý nghĩa bài đọc**; muốn xem phải đăng nhập (để khuyến khích đăng ký) | Màn Xem thử có tab **Rút bài**: rút 1 lá trên máy, thấy hình, tên, xuôi/ngược; ý nghĩa bị khóa, có nút Đăng nhập và Tạo tài khoản. Không gọi máy chủ, không lưu. |
| Q4 | Khóa bộ Premium chỉ khi bán Premium, thêm kiểm bậc ở máy chủ | Khi `premiumOnSale = true`, máy chủ từ chối bộ Premium với tài khoản chưa Premium (403 `premium_required`). Hiện `premiumOnSale = false` nên chưa có tác dụng. |
| Q9 | Gộp vào đợt áp migration và deploy P1-A | P1-A đã áp và deploy lên Singapore trong lúc làm Gói 0, nên không gộp được vào cùng đợt: Gói 0 là **một migration mới + deploy lại một hàm**. **SHA-256 (LF) migration mới: `6b37fdac84e012eb0e3c1f60dc204ae2052b9528dbfab176b38519bdf76bfb8d`.** |
| Q3, Q5–Q8 | Theo đề xuất | Chưa làm trong Gói 0 (nghi thức, kho diễn giải, kiểu trải mới là các gói sau). |

## Thay đổi cho người dùng (tài khoản đã đăng nhập)
- Rút bài xong thấy ngay các lá và **bài đọc có sẵn của Nilaza**, không gọi AI, không tốn lượt. Nhãn: "Bài đọc có sẵn của Nilaza · chưa có phân tích AI · không phải dự đoán chắc chắn".
- Dưới bài đọc có nút **Phân tích chuyên sâu bằng AI**. Bấm sẽ hiện hộp xác nhận (nêu rõ chỉ gửi câu hỏi và các lá, không gửi ngày sinh hay Nhật ký; chỉ tính lượt khi AI trả bài). Đồng ý mới gọi AI, trên đúng các lá đã rút.
- Bài đã có lời diễn giải (rút lại cùng kiểu trải và chủ đề trong ngày) mở ra ngay, không hỏi lại, không tốn lượt.
- Rút được tối đa 3 trải bài mỗi ngày (kiểu trải và chủ đề khác nhau) kể cả khi đã dùng hết lượt AI. Hết lượt AI thì thông báo riêng: "Hôm nay bạn đã dùng hết lượt phân tích bằng AI. Các lá và bài đọc có sẵn vẫn ở đây…".
- Nút "Rút một lá làm rõ" vẫn chỉ hiện sau khi AI đã trả bài (máy chủ yêu cầu bài đã được diễn giải).
- Không có số "Nil" trên màn hình (đúng quyết định 15/11). Thanh năng lượng chờ ví Nil (P2, chưa duyệt).
- Nhãn vị trí thứ ba của kiểu "Tình huống / Thử thách / Lời nhắc" đã thống nhất là **Lời nhắc / Advice** giữa app và máy chủ.

## Thứ tự triển khai (mỗi bước Owner duyệt riêng)
1. Áp `supabase/migrations/20261116100000_tarot_draw_claim_free_draw.sql` theo mã băm `6b37fdac…bfb8d` (chỉ thay thân một hàm; chạy lại an toàn). **Áp trước khi deploy hàm.** Với hàm cũ đang chạy, migration mới không làm hỏng gì (hàm cũ gửi `min(3, hạn mức AI)` làm trần và hàm SQL chỉ áp trần đó).
2. Deploy lại `ai-tarot-reading` (cả thư mục; `_shared/tarot-deck-tier.ts`, `_shared/account-tier-policy.ts`, `_shared/tarot-prompt.ts` đi cùng gói). **Không deploy trước bước 1:** hàm mới gửi trần 3 vào hàm SQL cũ vẫn chặn theo hạn mức AI, nên Free vẫn bị từ chối rút.
3. Phát hành app mới. **Lưu ý:** app cũ gặp máy chủ mới vẫn rút được lá nhưng sẽ gọi AI ngay như trước; không hỏng.

## Cách Owner thử trên điện thoại (sau bước 1–3)
1. Đã đăng nhập, gói Free: Tarot → Tình cảm → 1 lá → rút. Phải thấy bài đọc có sẵn và nút "Phân tích chuyên sâu bằng AI", **chưa** có chữ "Diễn giải AI theo…".
2. Thoát, mở Tarot, chọn **Công việc** cùng ngày, rút: phải rút được (trước đây bị chặn).
3. Quay lại bài Tình cảm, bấm Phân tích chuyên sâu → hộp xác nhận → Phân tích: nhận bài AI. Mở lại bài Tình cảm: thấy đúng bài AI, không hỏi lại.
4. Bấm Phân tích chuyên sâu ở bài Công việc cùng ngày: nhận thông báo đã dùng hết lượt AI, các lá vẫn còn.
5. Rút chủ đề thứ tư trong ngày: thông báo đã mở đủ trải bài.
6. Đăng xuất, vào Xem thử → tab **Rút bài** → Rút một lá: thấy hình và tên lá, **không** thấy ý nghĩa, có nút Đăng nhập.

## Đã kiểm chứng / chưa kiểm chứng
- ✅ PGlite 11/11 (có bài kiểm tra riêng cho trạng thái production: chỉ áp migration P1-A thì vẫn bị chặn theo hạn mức AI, áp migration mới thì không), Deno 35/35 (kiểm tra Tarot và nhắc prompt; có 2 kiểm tra mới: trần số trải bài không phụ thuộc hạn mức AI, bộ Premium), PGlite 10/10, bộ kiểm tra endpoint 23/23, Jest app đầy đủ, `tsc` app.
- ❌ Chưa kiểm: Supabase thật, điện thoại thật, TalkBack, chữ lớn. Phần `drawCards` trong `App.tsx` và hộp xác nhận chưa có test tự động (Jest không nạp được `App.tsx` vì dùng `require.context` của Metro); phần tách ra (nút AI, nhãn nguồn, tab Rút bài) có test.
- Hai bài kiểm tra SQL cũ (`ai-feedback-sql`, `model-route-publish-sql`) cần PGlite ở đường dẫn cố định `output/mvp-20261002/quota-runtime/` nên không chạy được trong phiên này; chúng không liên quan thay đổi này.

## Rủi ro đã biết
- **Khách rút rồi đăng nhập thì lá đổi.** Lá của khách rút trên máy; sau khi đăng nhập, máy chủ rút lá chính thức (để giữ khóa theo ngày và cho phép phân tích AI). Hộp khách nói rõ ý nghĩa dành cho tài khoản nhưng chưa nói lá có thể khác. Phương án thay thế "đăng nhập ẩn danh" không dùng được ngay: `guardAiJsonRequest` từ chối tài khoản ẩn danh (`isAnonymous !== false`) và cần Owner bật cài đặt Supabase.
- **Khách rút lại không giới hạn** trong màn Xem thử (không tốn gì, không lưu).
- Tab Rút bài của khách không mở ý nghĩa thư viện, nhưng khách vẫn đọc được nghĩa chung của từng lá ở tab "78 lá bài" (quyết định N-01, 31/10, giữ nguyên).
- Tài khoản Free có thể dùng đủ 3 trải bài mỗi ngày mà không tốn AI; dữ liệu đo sẽ cho biết có cần đổi trần.
- Bộ đếm "lượt AI hôm nay" ở Hồ sơ vẫn đếm trên máy (sự kiện `tarot_reading_drawn` nay ghi khi AI trả bài); máy chủ là nguồn đúng.

## Hoàn tác
Nếu migration mới đã áp: chạy lại `create or replace function public.tarot_draw_claim` từ `20261115100000_tarot_reading_lock.sql` (thân hàm có kiểm tra delivered và attempts), rồi deploy lại `ai-tarot-reading` bản trước. Chưa áp thì chỉ cần revert commit.
