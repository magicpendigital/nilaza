# PLAN — bảng tiến độ sống của {{TÊN DỰ ÁN}}

> **Cập nhật lần cuối: {{YYYY-MM-DD}}** — `main` tại `{{commit}}` ({{PR gần nhất}}).
> Tệp đầu tiên Owner và mọi Agent đọc. Trả lời: *đang ở đâu, còn gì, chờ ai*. Lý do và môi trường ở `docs/HANDOFF.md`; chi tiết từng việc ở `docs/feature-plans/`.

## Quy tắc cập nhật
1. Đầu phiên: `git fetch`, làm trên `main` mới nhất, đọc tệp này.
2. Cuối mỗi PR: sửa tệp này trong cùng PR (trạng thái, số PR, ngày). Mã mục khớp `docs/backlog/`.
3. Chỉ ghi điều đã kiểm chứng; chưa thử thì ghi "chưa kiểm".
4. Giữ ≤ 200 dòng: việc xong quá 2 tuần thì xóa (lịch sử đã có trong Git).

Ký hiệu: ✅ xong · 🟡 làm một phần · ⬜ chưa làm · ⛔ chờ Owner/hạ tầng · 🔍 chờ kiểm thật

## 1. Mục tiêu và quyết định đang hiệu lực
- **Mục tiêu:** {{mục tiêu hiện tại, mốc thời gian}}
- {{Quyết định Owner 1 (ngày)}}
- {{Quyết định Owner 2 (ngày)}}

## 2. Giai đoạn
| GĐ | Nội dung | Trạng thái |
|---|---|---|
| 0 | Repo, CI, môi trường staging | ⬜ |
| 1 | {{lát cắt đầu tiên}} | ⬜ |
| 2 | QA trên môi trường thật / thiết bị | ⬜ |
| 3 | Phát hành | ⬜ |

## 3. Việc còn mở theo khu vực
### {{Khu vực A}}
- ⬜ {{MÃ-01}} {{mô tả ngắn}}
### {{Khu vực B}}
- ⬜ {{MÃ-02}} {{mô tả ngắn}}

## 4. Đang chờ Owner (mỗi mục một quyết định)
1. {{quyết định cần, đích/hash, liên kết phiếu duyệt}}

## 5. Đã xong gần đây
- {{ngày}} · {{PR}} · {{tóm tắt}} · kiểm: {{đã kiểm gì}}

## 6. Bản đồ tài liệu
| Cần | Đọc |
|---|---|
| Quyết định, môi trường, việc cấm tự làm | `docs/HANDOFF.md` |
| Cổng chất lượng, hồ sơ việc | `docs/PLAN_QC.md`, `docs/feature-plans/` |
| Danh sách rà soát | `docs/backlog/` |
| Duyệt và nhật ký duyệt | `docs/APPROVALS.md` |
