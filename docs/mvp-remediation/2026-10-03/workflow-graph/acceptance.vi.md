# Nghiệm thu Workflow graph — 03/10/2026

Phạm vi: graph quan sát theo feature của Admin; không phải editor DAG hay engine thực thi. Backend, database, provider, mobile và QA cũ giữ nguyên. Plan: `docs/feature-plans/admin-workflow-graph-2026-10-03.json`.

| Mã | Công việc và tiêu chí cần kiểm |
| --- | --- |
| W01 | Workflow mở graph theo feature; bảy khối cũ chỉ là reference thu gọn. Graph thiếu module phải báo không khả dụng, không thay bằng sơ đồ giả. |
| W02 | Node có input/output, type, nguồn, mục đích, destination/privacy và source reference. Dữ liệu mẫu không được nhận diện như payload thật. |
| W03 | Edge ghi control/data, điều kiện và mapping from/to. Nhiều cạnh ra không tự đồng nghĩa chạy song song. Node/edge chọn được bằng chuột và bàn phím. |
| W04 | Tarot thể hiện canonical card enrichment, prompt source/fallback, safety, provider fallback, parse linh hoạt và lưu reading; tone preview không thành runtime input. |
| W05 | Oracle candidate có nhánh crisis trước compiler/provider; provider bị khóa. Không đánh đồng source candidate với bản cloud đang chạy. |
| W06 | Persona/Council/Daily/Astrology có graph và caveat riêng; Council không được mô tả như nhiều agent/model chạy song song. Notifications không có LLM; Face giữ deferred. |
| W07 | Source hash checker phát hiện contract thay đổi; không suy từ hash local rằng cloud đã deploy. Static artifact chỉ chứa metadata cấu trúc không bí mật. |
| W08 | Trace projector chỉ dùng run/span allowlist của đúng account, target, trace và feature; không nhận input/output, raw QA, prompt, câu hỏi, Journal, birth data hoặc secrets. |
| W09 | Root completed/route active/GET thành công không tô toàn graph đã chạy. Chỉ exact matching provider record được gắn vào node model với nhãn nguồn ghi chưa xác minh; client-writable records không chứng minh provider execution. Edge và stage không instrument giữ unknown. |
| W10 | Đổi feature/account/target/trace/URL/shell/workspace loại evidence cũ; response về muộn không được gắn vào graph mới. |
| W11 | Zoom/Fit/List và viewport cuộn hoạt động ở laptop 1024; focus rõ, inspector đọc được, không dùng màu như tín hiệu duy nhất. Không tạo network write/provider/reveal khi chọn graph. |
| W12 | Content Operations, AI Studio và Growth Operations vẫn protected và mở được; modal publish, drafts, Oracle preview và route/Back không bị regression. |
| W13 | Local được kiểm trực tiếp, hosted artifact READY và checksum đọc lại khớp; stable alias đúng deployment, browser Owner nghiệm thu node/edge trên domain đã phát hành. |
| W14 | Owner Guide source/generated local và skill development cập nhật/validate/sync. Guide cloud/backend/native chưa đồng bộ phải có lý do và gate cụ thể trong report. |

**Kết quả 04/10/2026: W01–W14 PASS trong phạm vi graph quan sát/frontend Admin.** Bằng chứng theo từng tiêu chí và giới hạn kiểm chứng nằm trong `validation.json`; kết quả phát hành/đồng bộ nằm trong `report.vi.md` và `admin-deployment.json`. W13 gồm 13/13 kiểm parity trên URL deployment và domain chính, cùng browser Owner trên domain chính. W14 xác nhận guide generated local và skill1.5.3; guide cloud/backend/native vẫn là gate riêng. Kết quả này không nghiệm thu provider execution hoặc toàn MVP.
