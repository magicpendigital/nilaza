# R08 — Bản nháp ghi chú cá nhân

Ngày 01/10/2026. Agent chuẩn bị và review độc lập; root áp patch/preflight, App và privacy integration. Source/unit đã kiểm; chưa nghiệm thu native/cloud.

Store key nilaza.journalDraft.v1 trong namespace account. Hydrate thành công mới chỉnh sửa, không empty-overwrite read/corrupt errors. Autosave có thứ tự và ACK; disk fail giữ RAM, cảnh báo memory-only và retry. Store lock giữ qua tab/unmount. Note save ACK rồi clear ACK mới đóng form; clear fail chỉ retry cleanup, không tạo note thứ hai trong phiên.

Bridge App memo theo scope/storage, strict saveJsonOrThrow, active lifetime. storage.markHydrated trước loaded; Composer chỉ mount sau đó. Export đọc/validate persisted envelope và chỉ title/body/mood; không RAM chưa lưu, extras hoặc credentials. Local clear dùng exact account prefix, bao gồm draft.

Review độc lập phát hiện missed ACK giữa render và subscribe; root refresh ngay sau subscribe và thêm regression. 8 store +8 Composer tests đạt (gồm2legacy); cùng4exporttests: **20/20**. TypeScript đạt; final full mobile **44 suites/269 tests PASS**,35.619s, không skip/tăng timeout. Các ca gồm stale autosave→clear, read/disk/clear failure, restart, remount khi save đang chờ và account close.

Lượt browser đầu 01/10 hiển thị form cũ vì Metro đã chết (ENOENT watch thư mục tạm từ install). Nháp mất khi Quay lại trên tab đó **không được tính là chứng cứ bản mới**. Browser hiện hành phải được khởi động và kiểm lại; kết quả cuối sẽ ghi trong board, không suy PASS từ source.

Manager path: Nhật ký → Viết ghi chú → title/body/mood → chờ autosave kết thúc → Quay lại/tab khác → mở lại → restart sauACK → còn draft. Save thành công → mở composer trống và chỉ một note. A→B không thấyA. Native keyboard/Back/reader riêng.

Giới hạn: note save/draft clear chưa atomic. Kill hoặc đổi account sau note ACK trước clear ACK có thể để draft cũ ở namespaceA khi login lạiA; lock trongRAM chỉ bảo vệ phiên hiện tại. Không leakA→B, nhưng chưa exactly-once qua process death. Disk fail không hứa restart safety. Receipt/idempotency chung Journal transaction là scope kế tiếp, không âm thầm đánh đạt.

Rollback tháo optional bridge, giữ private key/cache; không xóa draft tự động. Plan-QC và brand guidance vẫn current; không đổi skill, schema, provider hoặc role.
