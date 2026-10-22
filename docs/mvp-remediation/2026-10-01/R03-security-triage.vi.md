# R03 — Triage bảo mật và dependency

Review 01/10/2026. Source/lock/advisory preparation; chưa patch dependency, exploit, deploy hoặc test ghi database. Canonical Deep Security Scan đã thất bại trước khởi tạo, không retry và không dùng tài liệu này thay scan coverage.

Ưu tiên beta: R02 foreign schema; R10 auth/input/quota/atomic credits trước provider cost; dependency patches theo đường chạy; R22 live RLS/capabilities/native/privacy. Local tests không thay các cổng này.

## Baseline: không trộn mẫu số

Audit lịch sử `docs/reviews/2026-09-30/dependency-audit.json` (`npm audit --omit=dev --json`) có 218 vulnerable package entries: 1 critical,184 high,33 moderate. 185 C/H entries gồm 12 entries có advisory objects và 173 propagation; dedupe ra **37 advisory high/critical URLs**. Mỗi C/H entry liên kết đến nhóm advisory trong graph; không đồng nghĩa 185 đường khai thác từ mobile.

Current normalized lock SHA256 `ba3e99deb94ffd6b862f2008b5886cb60aac9a60d4fa1c28cc98f4226a2bbedb`; mobile manifest `71bed88f043629f67e9674ec6abc8fbd99956d68e57176abdb853416cd24d7ab`. R09 npm-install stdout: 1514 audited /37 vulnerabilities (26moderate,10high,1critical), **không có post-install audit JSON hoặc chứng cứ --omit=dev**. Không báo đã sửa218→37. Con số37 stdout khác37 uniqueURLs lịch sử.

`npm explain --json` OOM không cung cấp graph hợp lệ. Copies/parents dưới đây đọc trực tiếp lock. Không thấy direct import các leaf ngoài AJV tại các routed product sources; absence direct import không chứng minh transitive runtime absence.

## Current copies và điều kiện khai thác

| Nhóm | Version/đường chạy quan sát | Triage |
|---|---|---|
| tar | 7.5.16, Expo CLI | Critical/high cần archive attacker kiểm soát. Không thấy product archive-upload; tooling vẫn cần patch trước build trên input ngoài |
| xmldom | root0.8.13 qua Expo plist; nested0.9.10 | XML/HTML parse/serialize không tin cậy; plist tooling. Hai issues HTML/PI-regex của0.9 không gán blanket cho0.8 |
| brace-expansion | 1.1.16,2.1.2,5.0.7 | Glob/brace CPU/memory/stack từ untrusted patterns. Observed repo globs; chưa thấy chat→glob |
| browserslist | 4.28.2 | Untrusted query/stats trong Babel/Metro build; chưa thấy customer endpoint |
| fast-uri/AJV | npm fast-uri3.1.2/AJV8.17.1; Edge AJV8.17.1, **local Deno fast-uri3.1.8** | URI mismatch cần parser allowlist→fetch khác semantics. Fixed Astrology schemas, không $data/loadSchema/customer schema. Deno lock patched khác npm; deployed bundle chưa xác minh |
| image-size | 1.2.1 qua Metro | Malformed JXL/HEIF/ICNS parser; checked-in assets, chưa thấy customer image→Metro |
| joi | 17.13.3, RN CLI | Long ISO-string validation; chưa thấy product Joi input |
| js-yaml | root3.15.0 /xcpretty4.3.0 affected; Astro4.3.2 ngoài reviewed ranges | Untrusted YAML merge/omap; nested patched không giải quyết root |
| postcss | Expo8.4.49; Astro8.5.28 ngoài reviewed ranges | Attacker sourceMappingURL trong compiled CSS. Chưa thấy customer CSS compile |
| shell-quote | 1.8.4, devtools/CLI | Long untrusted parse input gây complexity, không chỉ metacharacters |
| undici | Expo6.27.0; other copies7.29.0/8.10.2 khác line | Malicious WebSocket/subprotocol. Không đồng nhất npm copy với browser/native/built-in fetch |

Deno lock normalizedSHA `b2ac0fc2a07bd790a0d1c87827e0f2a313a8b280f049c8867511f58f8c409b98` ghi redirect fast-uri^3.0.1→3.1.8. Nó không chứng minh function đang deployed enforce lock. AJV moderate [$data ReDoS](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6) cần $data:true, không thấy tại fixed-schema imports.

## Các gap source quan trọng

- Baseline `user-credits/index.ts` từng đọc amounts→sum→check→INSERT; `/deduct` tách khỏi generation. [R10 local](R10-credits-read-guard.vi.md) đã chuyển GET sang canonical `delta` theo caller đã xác thực, kiểm exact count và đóng cả POST gốc/`deduct` thiếu bảo vệ. 9 test handler và Deno check pass; **chưa deploy**. AI handlers vẫn chưa có atomic reserve/consume chung. Giới hạn đọc 1.000 row fail-closed là biện pháp tạm thời, không thay aggregate RPC/concurrency/cost guard.
- [R10 request guard local](R10-ai-request-guard.vi.md) đã đưa Tarot/Persona qua verified auth trước parse, cap 32 KiB UTF-8 thực tế, 5 giây deadline và lỗi sanitized; 13 test guard cùng 9 regression Tarot pass. Chưa deploy. Validation từng trường và tổng system/history/retrieval token budget, các endpoint AI khác, quota/reservation vẫn mở; cap body không thay các cổng này.
- Persona/Tarot source hiện dùng shared guard yêu cầu verified UUID và explicit non-anonymous; unknown class fail-closed. Auth service outage được tách khỏi invalid-token bằng lỗi 503. Actual runtime compatibility/Auth deadline/account state và toàn bộ AI endpoints vẫn cần nghiệm thu; đây không phải kết luận baseline có auth bypass hoặc rollout đã an toàn.
- Owner capability/RLS forward migrations có restrictive parent ownership và search_path boundary; không chỉ nhìn policy MVP cũ. Live grants/revoke/A-B và MCY interference chưa kiểm chứng.
- Inventory chỉ đọc catalog R02 xác nhận `source_chunks`/`source_embeddings` còn policy SELECT public `true` và anon/authenticated SELECT grants. [Forward SQL R03](R03-source-read-forward.vi.md) thu hẹp đọc trực tiếp về staff có `content.read` hoặc quyền `content.publish` từ policy ALL hiện có; chưa apply/replay PostgreSQL/role fixture và chưa đọc raw data để chứng minh leak. Service role vẫn cần approved/licensed retrieval contract riêng.
- Owner-only raw trace endpoint và direct-table revoke có source; purge scheduling chưa xác minh. Capture giữ tắt.
- Advisor lịch sử: leaked-password protection, mutable search_path, public vector, FK indexes. Refresh sau R02, phân loại Nilaza/MCY; không move extension/drop/create indexes hàng loạt để advisor xanh. Performance indexes cần representative query plans.

## Scope sửa tiếp theo — chưa triển khai

1. **D01 tooling:** một owner giữ package.json/lock; mobile manifest chỉ khi parent cần đổi. Review parent-compatible ranges/all copies, không audit fix --force hoặc blanket override. Advisory targets đã được security Agent kiểm ngày01/10: tar7.5.21; xmldom0.8.15/0.9.12; browserslist4.28.7; joi17.13.7; js-yaml3.15.2/4.3.2; shell-quote1.9.0; undici6.28.1; brace1.1.21/2.1.7/5.0.12; PostCSS8.5.23; fast-uri3.1.8. image-size2.0.3 là major/API review riêng. Verify registry hiện hành trước install; lưu audit mới với flags chính xác và chạy affected build paths.
2. **D02 AJV:** exact import/generator/runtime tests và lock riêng; review AJV8.18.0/CDN transitive resolution, giữ fixed schemas. Tests `supabase/tests/astrology_ai_insight_validation_test.ts`, `scripts/astrology-ai-contract.test.mjs`; no deploy/schema/model change. Serialize lock vớiD01.
3. **R10 request/cost:** credit read/debit gate và hai AI request guards đã có slice local ở trên. Còn field/token/shared-all-endpoint guards và atomic RPC SQL, auth→shape/size→reserve→provider→settle, chống double spend/replay và settle timeout. Tarot 1 lá/ngày đã chốt; [Chat/Oracle và ngân sách](R00-quota-budget-proposal.vi.md) còn là đề xuất, không tự lấy client defaults làm chính sách.
4. **D03 advisors/perf:** exact Nilaza objects và measured indexes sauR02; password policy/provider console scope riêng. SQL diff/preconditions/backup/inverse reviewed.

Mỗi task có fresh preflight/exact scope. Rollback dependency đúng manifest/lock delta; rollback cost phải đóng paid-provider calls, không quay về debit thiếu bảo vệ. Tooling reachability chưa chứng minh không làm upstream severity thấp hơn.

## R22 security matrix — chưa chạy live

Dùng bounded synthetic A/B trên target owner xác nhận sauR02. Ghi case/ref/authclass/status/correlation/counts/hash, không token/private text/rawtrace. Role setup, seed writes, provider spend cần exact authorization riêng.

| Case | Kết quả cần chứng minh |
|---|---|
| AUTH-01 | Missing/malformed/expired/wrong-audience/anonymous fail-closed theo policy; provider/write=0 |
| OWN-01 | A/B profile/birth/report/Journal/Tarot CRUD denied cross-owner; verified owner, không body userId |
| OWN-02 | Chat/report parent ID củaB không choA child/join/update/delete |
| ADMIN-01 | Content/AI-read/AI-manage/owner và revoke đúng capability; denied không publish |
| COST-01 | Zero/free/premium/replay/concurrent request atomic, không double charge hoặc negative |
| COST-02 | Timeout/safety/cancel/fallback có settle/refund/cancel semantics, bounded retry |
| INPUT-01 | Method/type/locale/oversize/card override rejected trước provider và JSON expansion |
| AI-SAFE-01 | Synthetic injection/crisis/diagnosis/certainty giữ agency/safety/disclosure |
| TRACE-01 | No secrets/full question/birth/privateJournal trong logs/errors/traces; safe versions |
| TRACE-02 | Capture mặc định off, owner-only approval/purge expiry/grants được kiểm thật |
| JOURNAL-01 | ACK contract/auth/env/replay/offline/disk/delete/tombstone/cross-owner đạt hai client |
| DEVICE-01 | Native logout/account switch/in-flight/restart/cache/secure-storage không leakA→B |
| PRIVACY-01 | Private export/cancel/failed share và actual cloud deletion/retention riêng đạt |
| STORAGE-01 | Bucket/list/signedURL/expiry/realtime A/B/guest ownership đúng |
| DEPS-01 | All resolved npm/Edge copies và customer bundles map patched ranges; exact audit artifact |

Phụ lục bên dưới giữ37 URL C/H duy nhất từ artifact audit lịch sử đã được Agent mở/đối chiếu ngày01/10; range là snapshot audit, không phải kết luận mọi copy hiện tại còn affected. Chưa triage toàn bộ33 moderate entries ngoài issues liên quan patch targets. Preparation không phải MVP/security acceptance.

## Phụ lục primary advisory

| Package | Nguồn chính thức | Severity snapshot | Affected range snapshot |
|---|---|---|---|
| tar | [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) | critical | <=7.5.18 |
| @xmldom/xmldom | [GHSA-27p8-2357-5qqv](https://github.com/advisories/GHSA-27p8-2357-5qqv) | high | >=0.7.0 <=0.8.14 |
| js-yaml | [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | high | >=4.0.0 <4.3.2 |
| shell-quote | [GHSA-395f-4hp3-45gv](https://github.com/advisories/GHSA-395f-4hp3-45gv) | high | <=1.8.4 |
| @xmldom/xmldom | [GHSA-3px3-54cx-rmw9](https://github.com/advisories/GHSA-3px3-54cx-rmw9) | high | >=0.9.0 <=0.9.11 |
| fast-uri | [GHSA-4c8g-83qw-93j6](https://github.com/advisories/GHSA-4c8g-83qw-93j6) | high | >=3.0.0 <3.1.3 |
| @xmldom/xmldom | [GHSA-4w3w-2rp5-g8jm](https://github.com/advisories/GHSA-4w3w-2rp5-g8jm) | high | >=0.9.0 <=0.9.10 |
| image-size | [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) | high | >=1.2.0 <=2.0.2 |
| js-yaml | [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) | high | >=4.0.0 <4.3.1 |
| postcss | [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) | high | <=8.5.11 |
| joi | [GHSA-6h2x-m376-mqjq](https://github.com/advisories/GHSA-6h2x-m376-mqjq) | high | >=17.2.0 <17.13.7 |
| brace-expansion | [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | high | >=4.0.0 <5.0.10 |
| @xmldom/xmldom | [GHSA-6mj3-qw4j-hgrw](https://github.com/advisories/GHSA-6mj3-qw4j-hgrw) | high | >=0.9.0-beta.1 <=0.9.11 |
| browserslist | [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) | high | <=4.28.6 |
| fast-uri | [GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7) | high | >=3.0.0 <3.1.5 |
| @xmldom/xmldom | [GHSA-8344-3jmq-59r6](https://github.com/advisories/GHSA-8344-3jmq-59r6) | high | >=0.7.0 <=0.8.14 |
| tar | [GHSA-8x88-c5mf-7j5w](https://github.com/advisories/GHSA-8x88-c5mf-7j5w) | high | <=7.5.17 |
| @xmldom/xmldom | [GHSA-93r5-fhx6-vmg9](https://github.com/advisories/GHSA-93r5-fhx6-vmg9) | high | >=0.7.0 <=0.8.14 |
| @xmldom/xmldom | [GHSA-965w-775f-mr7g](https://github.com/advisories/GHSA-965w-775f-mr7g) | high | >=0.7.0 <=0.8.14 |
| @xmldom/xmldom | [GHSA-c7q8-3ch8-vqpv](https://github.com/advisories/GHSA-c7q8-3ch8-vqpv) | high | >=0.7.0 <=0.8.14 |
| browserslist | [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) | high | <=4.28.6 |
| fast-uri | [GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc) | high | >=3.0.0 <3.1.6 |
| fast-uri | [GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf) | high | >=3.1.2 <3.1.6 |
| @xmldom/xmldom | [GHSA-g53g-w8rj-fmg7](https://github.com/advisories/GHSA-g53g-w8rj-fmg7) | high | >=0.9.0-beta.9 <=0.9.10 |
| fast-uri | [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp) | high | >=3.0.0 <3.1.6 |
| brace-expansion | [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) | high | >=4.0.0 <5.0.8 |
| brace-expansion | [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | high | >=4.0.0 <5.0.11 |
| fast-uri | [GHSA-qw65-cvwx-89v3](https://github.com/advisories/GHSA-qw65-cvwx-89v3) | high | >=3.0.0 <3.1.7 |
| postcss | [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | high | <=8.5.17 |
| tar | [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m) | high | <=7.5.20 |
| undici | [GHSA-rfgv-xxqx-mfg5](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5) | high | >=6.7.0 <6.28.1 |
| brace-expansion | [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | high | <1.1.18 |
| fast-uri | [GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx) | high | >=3.0.0 <=3.1.3 |
| @xmldom/xmldom | [GHSA-vr34-hp96-76pp](https://github.com/advisories/GHSA-vr34-hp96-76pp) | high | >=0.9.10 <=0.9.11 |
| @xmldom/xmldom | [GHSA-w2rr-34g9-rvrj](https://github.com/advisories/GHSA-w2rr-34g9-rvrj) | high | >=0.9.0 <=0.9.10 |
| image-size | [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) | high | >=0.6.3 <=2.0.2 |
| @xmldom/xmldom | [GHSA-x4fp-j954-r2f4](https://github.com/advisories/GHSA-x4fp-j954-r2f4) | high | >=0.7.0 <=0.8.14 |
