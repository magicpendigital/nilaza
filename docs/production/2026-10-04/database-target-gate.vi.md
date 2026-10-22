# Gate migration theo project — W02

Cập nhật 09-10-2026: gate dùng environmentPolicy.databaseResourcePolicies[kind] trong profile, bind exact target và policy Free/Nano hoặc Pro/Micro; không còn hard-code Micro. Xem [packet Singapore Free](../../release/SINGAPORE_FREE_PREPARATION_2026-10-09.vi.md). Settings/quota/recovery phải được xác minh, unknown vẫn BLOCKED.

Ngày 04-10-2026. Công cụ chỉ kiểm tra bằng chứng local, không chạy SQL, tạo project, đăng ký target hoặc cấp quyền phát hành.

## Vì sao cần bổ sung

Gate cũ sử dụng ledger của `akgrokwnkfqnfjqrildi` cho mọi kế hoạch database. QA đó còn lịch sử MCY và tiếp tục bị chặn. Project mới phải có ledger riêng đúng identity; không sửa QA cũ thành “reconciled” để đi tiếp.

`scripts/database-target-gate.mjs` kiểm tra riêng theo organization, project, staging/production và SQL cụ thể. `feature-preflight.mjs` sử dụng gate này khi `externalActions.databaseWrite=true` và có khai báo target. Kế hoạch cũ không có target tiếp tục dùng ledger cũ và bị chặn như trước.

Release profile và `release-evidence.mjs` là gate độc lập. Allowlist hiện rỗng, các blocker release còn nguyên. PASS của công cụ này không xóa những blocker đó, không xác thực danh tính người duyệt, không chứng minh bài test thực sự đã chạy và không thay thế kiểm tra remote ngay trước thao tác. Lệnh shell/connector trực tiếp vẫn cần người thực hiện tuân thủ gate; đây không phải sandbox chặn mọi đường ghi database.

## Cách kiểm tra hiện tại

```powershell
node scripts/database-target-gate.mjs --manifest docs/production/2026-10-04/database-target.draft.json
```

Kết quả cần là `BLOCKED`, exit code 2: manifest còn draft và chưa có Project ID. Exit 0 chỉ là PASS bằng chứng; exit 1 là FAIL khi dữ liệu hoặc hash sai. Không dùng fixture unit test làm bằng chứng production.

## Hợp đồng bằng chứng

| Phần | Nội dung bắt buộc | Nguồn |
|---|---|---|
| `target` | `id`, `kind`, `organizationId`, `projectRef` đúng allowlist và ranh giới organization | Metadata thực + release profile được duyệt riêng |
| `profileSha256` | Hash UTF-8 chuẩn LF của profile hiện tại | `docs/release/release-profile.json` |
| `operation` | `bootstrap` hoặc `forward`; không hỗ trợ `repair` | Đường tiến database cụ thể đã duyệt |
| `ledger` | File/hash; JSON có `target`, `status=reconciled`, `localOnly=[]`, `remoteOnly=[]`, `migrationVersions`, `checkedAt` trong 24 giờ | Đối chiếu thực; bootstrap chỉ cho lịch sử migration rỗng |
| `migrations` | Danh sách `{path, sha256}` theo thứ tự version, chỉ SQL canonical, không trùng hoặc đã apply | SQL đã review; không tự động lấy mọi file trong thư mục |
| `targetMetadata` | File/hash; `target`, `checkedAt`, `status=ACTIVE_HEALTHY`, `postgresMajor`, `compute`, `region`, `paidAddons`, `sideEffectsDisabled=true` | Readback trong 24 giờ; đúng policy target: organizationPlan/compute/region/postgresMajor/paidAddons; resourceSettingsVerified=true, quotaReview=PASS, recoveryReview=PASS |
| `replay` | File/hash; `status=PASS`, `migrationSetSha256`, `postgresMajor`, `syntheticOnly=true`, `sideEffectsDisabled=true`, `finishedAt`, `grantsRlsAcceptance=PASS`, `restoreAcceptance=PASS` | Replay đúng SQL trên PostgreSQL tương thích; tối đa bảy ngày, kiểm thử RLS và khôi phục riêng |
| `ownerApproval` | File/hash; `decision=approved`, exact target/operation, `migrationSetSha256`, `ledgerSha256`, `targetMetadataSha256`, `replaySha256`, `profileSha256`, `approvalReference`, `approvedAt`, `expiresAt` | Quyết định thật của database owner cho candidate cụ thể; hiệu lực tối đa bảy ngày |

File phải nằm trong repository, realpath không ra ngoài, JSON là object và hash khớp. `migrationSetSha256` là SHA-256 của `JSON.stringify(migrations)`, giữ nguyên thứ tự và hai trường mỗi item; hash file chuẩn hóa CRLF thành LF. Đổi SQL, ledger, metadata, replay hoặc profile làm phê duyệt cũ không còn khớp.

Khai báo trong feature plan:

```json
{
  "externalActions": {
    "databaseWrite": true,
    "databaseTarget": {"id": "EXACT_TARGET_ID", "kind": "production", "organizationId": "EXACT_ORG_ID", "projectRef": "EXACT_PROJECT_REF"},
    "databaseTargetManifest": {"path": "REVIEWED_MANIFEST_PATH.json", "sha256": "EXACT_MANIFEST_SHA256"},
    "databaseOwnerApprovalReference": "Reference to the exact owner decision"
  }
}
```

Mẫu này chưa phải record có thể chạy. Không đăng ký project trong profile khi chưa xác minh và duyệt riêng. Chuẩn bị migration không tự động duyệt R10 quota QA cho production; cần policy production riêng và replay đầy đủ trước khi đưa vào danh sách SQL.

Gate resource-policy/no-addon kiểm evidence đã ghi, không tự chứng minh settings, invoice hoặc quyền operator thực tế. Singapore hiện chọn Free/Nano kỳ vọng; plan Free không chứng minh compute/add-on đã đọc. Chi phí AI/email và hóa đơn Pro lịch sử vẫn riêng. Missing policy hoặc đổi environment không được bypass resource/recovery checks.

## Nghiệm thu và rollback

Unit test dùng project giả và SQL `select 1`, không mạng hoặc credentials. Bao gồm sai target, ledger blocked, hash drift, MCY, replay thiếu, phê duyệt hết hạn, Small/PITR ngoài ngân sách, traversal và JSON sai. Đạt test chứng minh logic với fixture, không chứng minh production sẵn sàng.

Rollback revert helper và tích hợp preflight trong scope. Giữ nguyên ledger QA cũ, profile release và dữ liệu cloud. Mobile, Admin, provider runtime, schema và bản online không thay đổi trong W02.
