# R03 — Forward boundary cho raw source

Ngày01/10/2026. SQL mới đã chuẩn bị local sau exact preflight. **Chưa apply/replay PostgreSQL hoặc nghiệm thu live**. QA cũ giữ nguyên; ledger vẫn blocked.

Nguồn historical25: policy `anyone reads source chunks/embeddings` FOR SELECT USING(true) tồn tại sau capability migration vì chỉ policy staffwrite được sửa. Reconcile grants SELECT cho authenticated và không thay policy khi table đã tồn tại. Root catalog metadata còn thấy6policies/2tables: legacyPUBLICSELECTtrue fingerprint`b326b5062b2f0e69046810717534cb09`, không restrictiveSELECT. Grants hiện có SELECT cho cảanon/authenticated. Không đọc chunk/embedding rows, không thử exploit; metadata/source xác nhận boundary rộng, không suy có dữ liệu nhạy cảm đã lộ.

File mới `supabase/migrations/20261001000000_private_source_read_boundary.sql` giữ lịch sử25SQL. Guard đúng2tables/RLS/capabilityhelper; revoke rawtable privileges anon/PUBLIC, revoke non-row TRUNCATE/REFERENCES/TRIGGER củaauthenticated; bỏ2PUBLICreadpolicies; thêmstaffSELECT theo`content.read`. Existing content.publish writes/ownerdelete restrictive policies giữ nguyên. Không DROPtable/CASCADE, backfill hay read private data.

Licensed/approved không đồng nghĩa được phát toàn văn trực tiếp tới khách hàng. Khách nhận guidance qua backend; R14 retrieval phải kiểm parentstatus/rights/approvedsources. SQL này bảo vệ Data API rawsource; service_role bypassRLS vẫn cần backend policy, không coiSQL là R14 hoàn thành. Không thấy rawsource directfetch trong routed mobile/Admin/Edge sources đã rg; đây là phạm vi search, không proof về mọi integration ngoàirepo.

Role acceptance trên QA sạch sau exactapplyapproval: guest và normalA/B không đọc rawsource kể cả approved; staff cócontent.read **hoặc** content.publish xem được fixture draft/blocked đểreview (policyFORALL hiện hữu vẫn tham giaSELECT theoOR); staff bị thu hồi cả hai capability bị chặn; writes vẫn cầncontent.publish/deletioncontent.delete. Kiểm publisher/revoke và effective policylist, không chỉ policy mới. Servicebackend chỉ lấy approved/licensed/publicdomain theoR14. Kiểm revokedgrants và TRUNCATE riêng bằng authorizedrolefixture, không qua private production data. Staticvalidator không thayrole/Postgres tests.

Rollback trướccutover: dừng exposure target, giữ safe denial và bảnbackup; không phục hồiPUBLICUSINGtrue để UI xanh. Nếu staffpath lỗi, sửa capability/helper theo reviewedforwardversion; giữ rawrows và legacyQA. Áp SQL/retarget/rolebootstrap là bước riêng sauownerapproval. Plan-QC verified-current: exactscope/security/data/IP và livegate vẫn đúng.
