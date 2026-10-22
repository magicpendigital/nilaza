# R20 — Tích hợp canonical Tarot vào generated seeds

Ngày 2026-10-01. Local outputs đã tạo và kiểm; chưa apply SQL/publish content hoặc nghiệm thu artwork.

Plan: `docs/feature-plans/mvp-R20-seed-integration-2026-10-01.json`. Root đã đọc Admin AGENTS và giữ Content Operations/AI Studio. Chạy generator qua feature:run sau preflight; lỗi EPERM sandbox được xử lý bằng lệnh local đã được duyệt, không sửa quyền ứng dụng.

Đã tạo lại `apps/admin/generated/content-seed.json` và `supabase/seed.generated.sql` từ canonical R20 của content Agent. 78 card records trong Admin seed deep-equal nguồn; 468 giá trị VI/EN meaning/question trong SQL khớp sau xử lý JSON/SQL escaping. Không thực thi file SQL này.

Checks: admin:check đạt sourceVersion **cf389bd2fae6**, 3 workspaces / 27 capabilities; admin:test **78/78**; validate:data đạt (7 decks / 78 cards, 0 legacy ASCII/mojibake/safety lint). Canonical normalized SHA-256 **2688f997eb10bfcf5a59107b5ff09b7034168eb8a1ca39ac165df2cb192a6865**. Mobile regression hiện đọc canonical trực tiếp, nhưng published bundle/cache có thể override source; live consumer cần readback riêng.

Browser read-only đã kiểm lại cả `#/content/personas` và `#/ai-studio/workflow` qua phiên QA có quyền hiện hành. Content Overview hiện source seed cf389bd2fae6 và online bundle vẫn published v4; Personas hoạt động. AI Studio hiện đúng target akg và “Planned capability · not connected / No live scores”; không bấm Save/Publish/Test Run. Initial login/checking-access là trạng thái hydration, sau đó protected shell và cả hai workspace tải được.

Chưa đạt: publish/readback trên môi trường đúng; bilingual reviewer độc lập; 546 content/art bindings của 7×78 cards. Không refresh rồi sao chép nhãn PASS cũ, không tạo artwork mới chỉ để hash khớp.

Manager path: mở Card Library, đối chiếu Three of Swords/Three of Pentacles VI/EN; mở AI Studio để đảm bảo workspace vẫn có. Sau khi R02 mở gate, publish đúng đường Admin rồi kiểm lại app consumer và version. Không dùng seed file thay evidence live.

Rollback: hoàn tác riêng generated outputs hoặc regenerate từ canonical đã được review; không overwrite owner canonical bằng legacy generator. Tarot Content/Deck Production và Plan-QC skills vẫn current: các quy tắc này đã được skill yêu cầu.
