# Workflow graph Admin Nilaza — phát hành 04/10/2026

**Đã triển khai và nghiệm thu frontend local cùng Admin staging.** Mở [AI Studio → Workflow Tarot](https://nilaza-admin-staging.vercel.app/#/ai-studio/workflow?feature=tarot_reading&locale=vi). Deployment `dpl_5e8V1U1hP25JBaFoCxwQfFQTTZqo` đã READY và stable alias trỏ đúng bản này; kiểm tra lại 13/13 mục trên cả URL deployment và domain chính đều đạt. Phạm vi kết luận là graph quan sát và frontend Admin; các cổng backend/MVP vẫn được nêu riêng bên dưới. Kết quả lưu trong `validation.json`, `admin-deployment.json` và hai hồ sơ parity.

## Phạm vi và cách sử dụng

AI Studio → Workflow → chọn tính năng. Chọn node để đọc Inputs/Outputs, kiểu dữ liệu, nguồn, cách dùng, nơi nhận, mức riêng tư và reference. Chọn cạnh để đọc điều kiện và mapping trường. Zoom/Fit giúp xem tổng thể; List giúp đọc từng bước và dùng bàn phím.

Graph là sơ đồ quan sát chỉ đọc, phản ánh mã nguồn đã đối chiếu. Một node có nhiều cạnh ra có thể là nhánh điều kiện hoặc cấp dữ liệu cho bước sau; không tự đồng nghĩa chạy song song. Bảy khối cũ còn ở mục tham chiếu thu gọn để giữ lối vào các editor đã có.

Catalog có **8 graph, 73 node, 69 cạnh, 205 port và 34 source digest**. Đường truyền dữ liệu và điều khiển có nhãn riêng. Node/edge mở được bằng chuột hoặc Enter trong List. Khi inspector xuống dưới ở laptop, dùng **View inspector** để chuyển focus tới nội dung. Source freshness kiểm local bằng hash; thông tin backend deployment và recorded trace được hiển thị riêng.

Đợt này không tạo editor kết nối node, engine DAG, provider call, publish cấu hình AI, apply schema hay phát hành mobile.

## Những khác biệt quan trọng được đưa vào sơ đồ

- Tarot: backend làm giàu dữ liệu lá bài từ ID chuẩn, chọn prompt với fallback, xử lý safety và provider fallback, parse output linh hoạt rồi lưu reading. Tone trong preview chưa được runtime này dùng; lưu Journal là hành động riêng.
- Oracle: mã nguồn candidate có nhánh hỗ trợ an toàn trước compiler/provider; provider vẫn bị khóa. Bản candidate local chưa đồng nhất với Edge Function QA đã phát hành trước đó.
- Council: hiện dùng một lần gọi model tạo nhiều góc nhìn; không có nhiều agent/model chạy song song như sơ đồ bảy khối dễ gợi ra.
- Daily Insight: prompt hệ thống hiện cố định và context Journal cần được xem xét thêm. Ghi usage không đồng nghĩa đã lưu một daily insight.
- Astrology: tính toán dữ kiện và kiểm tra quyền sở hữu đi trước diễn giải AI; trace feature dùng chung với endpoint legacy nên model span không xác định được mọi bước trước đó đã chạy.
- Notifications: không gọi LLM. Ticket/receipt của Expo không chứng minh thông báo đã hiển thị trên thiết bị. Một số kiểm soát dispatch vẫn cần hoàn thiện.
- Face Reading: deferred, không được thể hiện như tính năng đã hoạt động.

## Bằng chứng thực thi và giới hạn

Graph chỉ nhận metadata allowlist của trace đã che nội dung, đúng tính năng, tài khoản, backend target và trace đang chọn. Đổi scope hoặc rời workspace phải xóa evidence và loại response về muộn. Không đưa prompt, câu hỏi, Journal, birth data, raw QA hoặc private attributes vào graph.

Review còn phát hiện client cached có thể giữ project A khi ENV trên trang đổi sang B. Đã pin URL/public key tại khởi tạo transport; cấu hình đổi sẽ khóa quyền, xóa state, chặn dispatch và bỏ response về muộn cho đến khi reload. Origin initialized được expose chỉ đọc để graph gắn đúng môi trường. Regression transport đạt 15/15, gồm đổi URL/key, đổi trong lúc kiểm quyền/session và RPC/Edge response về muộn; không dùng tài khoản/token thật trong fixtures.

Instrumentation hiện tại giữ tên span provider `llm.<provider>.primary/fallback`, nhưng che các chuỗi stage của một số finalization output. Chỉ matching provider record được gắn vào node Model Call; các node khác giữ trạng thái chưa có bằng chứng. Root completed, GET thành công hoặc route active không chứng minh cả pipeline. Cạnh giữ mapping từ source, không được tô thành đường thực thi suy luận.

Review SQL local phát hiện `authenticated` có thể INSERT trace run/span với `user_id=auth.uid()` trong migration `20260909014614_ai_trace_observability.sql`. Điều này kiểm tra chủ bản ghi, không chứng minh ai đã phát sinh sự kiện; client có thể tự tạo một span `llm.*` trạng thái ok. Graph vì vậy ghi **Recorded span · writer origin unverified**, không coi bản ghi là bằng chứng provider thật đã chạy. Đây là kết luận từ source/policy local; chưa kiểm quyền live trên QA và chưa thử ghi dữ liệu giả. [Tài liệu RLS của Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) giải thích vai trò grants và điều kiện kiểm row.

Việc cần sửa ở gate QA sạch: server-only producer cho trace/safety/usage có giá trị vận hành, quyền ghi không cấp trực tiếp cho consumer, kiểm quyền migration thực tế và fixtures chống giả mạo. Kết hợp endpoint/function/revision/provenance và audit để phân biệt event được backend phát sinh với record do client tự ghi. Không apply SQL trên ledger cũ đang blocked trong đợt này.

Muốn quan sát đầy đủ runtime cần đợt riêng: khóa nguồn ghi đáng tin cậy, định nghĩa event stage có version, giữ identity không riêng tư qua sanitizer, gắn revision/function/contract và correlation, kiểm tra quyền/retention, rồi nghiệm thu trên QA sạch. Frontend graph này không tự bổ sung instrumentation backend.

## Đồng bộ theo từng lớp

| Lớp | Trạng thái và lý do |
| --- | --- |
| Frontend local → Admin staging | Đã phát hành bản allowlist 60 file; READY, stable alias đúng deployment, 12 hash static + 1 kiểm public runtime config đều đạt trên URL riêng và domain chính. Browser Owner đã kiểm node/edge/List/Fit và cả ba workspace trên domain chính. |
| Catalog → local source | Kiểm tra freshness bằng hash nguồn thực thi; cần review lại graph khi nguồn thay đổi. Hash local không chứng minh cloud đã deploy. |
| Backend / database / AI config | Giữ nguyên QA cũ. Người dùng đang tự tạo project QA sạch trả phí; migration ledger cũ còn blocked. Chưa cutover, deploy Edge hoặc publish AI config. |
| Owner Guide | Source và generated consumer đã cập nhật local; guide trong backend cloud chưa deploy trong đợt frontend này. Cần phát hành protected guide với backend QA đã nghiệm thu. |
| Skill phát triển | PlanQC 1.5.3 đã validate, sync vào máy hiện tại và kiểm tra parity. Bổ sung ranh giới source/cloud, trace writer chưa xác minh và backend target của transport. Không phải tài nguyên runtime online; máy/Agent khác phải sync từ nguồn đã review. |
| Session / drafts | Localhost và domain online có origin/storage riêng. Graph evidence ở RAM, không có cơ chế đồng bộ payload riêng tư. |
| Mobile native | Không thay đổi APK/IPA hay native runtime. Cần build và nghiệm thu thiết bị riêng. |

## Nghiệm thu và rollback

Tiêu chí W01–W14 trong `acceptance.vi.md` đạt trong phạm vi graph quan sát; bằng chứng và giới hạn nằm trong `validation.json`. **158/158 Admin tests PASS**, sau thay đổi câu chữ cuối có thêm **3/3 targeted tests PASS**. `admin:check`, catalog/source freshness, data, brand, governance, skill validation/sync/check đều đạt. Các workspace Content Operations, AI Studio và Growth Operations vẫn protected và mở được bằng phiên Owner thật. Không tạo lần gọi LLM mới để kiểm graph.

Nghiệm thu browser local ở **1024×768**: sửa phần header/health quá cao làm node đầu bị khuất; health thu gọn, node đầu hiện đầy đủ. Đã sửa chọn node bị mất khi auth refresh tạm null và Fit không tác dụng ngay sau chuyển List. Inspector lá bài chuẩn hiển thị nguồn `request.selectedCards`, schema, cách dùng và destination; keyboard chọn node/cạnh có trạng thái selected rõ. Trace reader tải 12 record đã redact, apply trace phù hợp chỉ gắn một matching provider record vào node Model Call với nhãn origin unverified; các node/cạnh còn lại không được tô thành đã chạy. Rời workspace xóa evidence.

Browser online ở kích thước mặc định **888×884**: Tarot có 9 node/11 cạnh; keyboard chọn node mở typed ports, edge Locale ghi mapping `language → language`; List→Fit hoạt động, zoom hoạt động. Oracle ghi candidate/provider disabled; Notifications không có Model Call; Face deferred. Content mở overview và Personas với bundle published v4; Growth tải snapshot 30/09, không gắn nhãn runtime live. Kiểm tra online này xác nhận giao diện và luồng đọc; không xác nhận cả backend pipeline đã vận hành. Đã reset viewport tạm và giữ tab staging ở Tarot Workflow.

Ảnh nghiệm thu: [local 1024 sau sửa](screenshots/02-local-1024-compact.png), [typed ports local](screenshots/03-local-ports.png), [typed ports online](screenshots/04-online-ports.png), [graph online đã phát hành](screenshots/05-online-workflow-final.png). Ảnh `01-local-1024-graph.png` giữ làm bằng chứng vấn đề trước sửa.

Artifact frontend có **1.650.842 byte / 60 file**, tăng **107.006 byte (~6,9%)** so với bản trước. Không thêm thư viện graph, dependency hay media. Hai module mới catalog/view lần lượt 74.519/10.962 byte nguồn, gzip 21.674/3.580 byte; đây là phép đo gzip local, không phải chứng nhận header nén hay Core Web Vitals trên cloud. Chưa đo long-session memory hoặc native performance. SHA artifact: `c193a047a8fbcdf945d647627810161a7ebba524b60096b2e3d3d53464c39c50`.

Các lỗi trong quá trình thực hiện đã được xử lý trước kết luận: test từng khớp nhầm chữ Recorded span trong caveat, sau đó kiểm đúng badge/class node; generated Owner Guide từng stale và được build lại; installed skill từng lệch version và đã sync/check lại. CLI deploy lần đầu thiếu team scope báo không có quyền; xác minh project/team rồi deploy đúng `magicpens-projects`. Script refresh hồ sơ ban đầu xử lý nhầm binary như text và sandbox từ chối ghi; không ghi thành công ở hai lần đó, đã dùng đúng hash binary/text và chạy preflight lại đạt. Không thay quyền, credential hay backend để vượt lỗi.

Rollback frontend: kiểm checksum và promote lại deployment đã review trước graph `dpl_BuWee6a83hqbPNCkpyMxnbuvT9xu` trên cùng project staging. Bản nguồn và bằng chứng trước sửa được giữ trong `pre-edit-admin/` và hồ sơ configure revision 2. Rollback frontend không thay đổi backend/config/database.

Đợt graph giúp quản trị hiểu cấu hình và giới hạn hiện tại; không tự mở các cổng nghiệm thu MVP còn thiếu: QA sạch, quota/tokenizer/provider/evaluation, atomic config publication, safety offline và native acceptance.
