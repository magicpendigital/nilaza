# Chiến lược giá "Nil" cho Nilaza — nhận định, chiến lược, kế hoạch hành động

Ngày: 15/11/2026 · Người nhận: Owner · Trạng thái: **Owner duyệt hướng đi và cho làm P0 + P1 (15/11)**; P2–P6 chưa duyệt. Ghi chú sau khi đọc `PLAN.md` mới nhất: hàm `ai-astrology-report` **đã bị xóa** (repo và Singapore, 15/11, PR #38) nên việc "tắt hàm legacy" ở P1 không còn. Ký hiệu: ✅ đã kiểm chứng (đọc code/tài liệu repo hoặc nguồn công khai), ⚠️ giả định/ước tính cần đo, ❓ chưa kiểm chứng được.

---

## 0. Tóm tắt điều hành

1. **Ý tưởng Nil là đúng hướng và nên làm**: một ví năng lượng duy nhất, cấp theo gói, trừ khi dùng tính năng AI, giá từng tính năng cấu hình ở Admin. Nó giải quyết ba việc thật: (a) chặn rủi ro lỗ ở nhóm dùng nhiều, (b) thêm/đổi tính năng mà không phải tạo SKU mới, (c) tách giá bán khỏi giá token để đổi model/route không làm vỡ gói.
2. **Nhưng "ẩn hoàn toàn giá từng tính năng" cần chỉnh**, vì ba lý do: (i) EU (CPC Network 21/03/2025) coi việc giấu giá thật sau tiền ảo là rủi ro, và Digital Fairness Act đang tới ✅; (ii) Google Play yêu cầu mô tả rõ quyền lợi/giá/gia hạn của gói ✅; (iii) bài học Cursor 2025: đổi quy tắc trừ credit âm thầm gây hủy hàng loạt ✅. Khuyến nghị: **ẩn bảng giá, không ẩn ý nghĩa** — hiện thanh năng lượng + mức nặng/nhẹ ("nhẹ / vừa / sâu") ngay lúc dùng, và mô tả gói bằng "đủ cho khoảng X–Y lượt xem sâu mỗi tháng". Người dùng không có bảng giá để so sánh, nhưng không bao giờ bị bất ngờ.
3. **Số học cho thấy rủi ro lớn nhất không phải người trả tiền trung bình mà là gói Free và nhóm p99** ⚠️: với model rẻ, chi phí AI một lượt chỉ vài chục đến vài trăm đồng; một người dùng Free dùng 5 chat/ngày đã tốn gấp nhiều lần ngân sách Free hợp lý. Nil phải siết Free và đặt trần worst-case cho Premium, không phải để "vắt" người trả tiền.
4. **Tarot/Chiêm tinh: nguyên tắc "một sự kiện — một câu trả lời"** ✅ khớp tuyên bố thương hiệu sẵn có. Hiện repo có **lỗ hổng thật**: bài rút ở client, rút lại miễn phí trước khi gọi AI, quota đếm-rồi-chèn (race), RLS cho client xoá bản ghi, không cache/replay. Giải pháp: **server cấp lá bài + khoá kết quả theo (spread, chủ đề, ngày) + lưu bất biến + "lá làm rõ" và "trò chuyện về lá này" làm van xả cảm xúc**. **Không bán lượt rút lại bằng Nil** (đó là kiếm tiền từ nỗi lo, trái brand và gần với loot-box).
5. **Lộ trình**: (P0) chốt quyết định + hợp nhất tài liệu mâu thuẫn → (P1) vá khoá kết quả và đo chi phí thật (độc lập với Nil, làm ngay) → (P2) lõi Nil ở chế độ **bóng (shadow)** trong closed beta → (P3) Admin Nil Studio → (P4) RevenueCat + paywall trung thực + thanh năng lượng → (P5) pilot trả phí có thí nghiệm giá → (P6) top-up / bậc cao / iOS.

---

## 1. Hiện trạng repo (✅ từ hai đợt khảo sát code)

**Đã có, dùng lại được**
- Quota theo ngày ở server, chỉnh từ Admin: `ai_feature_configs` (nháp → xuất bản → nhật ký, cache 60s, client không đọc được) — mẫu cho bảng giá Nil. `supabase/functions/_shared/feature-config.ts`, `daily-attempts.ts`.
- Công tắc khẩn cấp `ai_feature_switches`; trần chi phí mỗi lượt `cost_cap_micro` (mặc định 0,02 USD) trong `_shared/model-router.ts` (~dòng 797) — nhưng Admin chưa sửa được (`apps/admin/.../ai-features.js:157` ghi "cần backend A7").
- Khung đặt chỗ ngân sách nguyên tử microUSD: `20261002000000_ai_usage_reservation.sql` + `runMeteredOperation` (reserve/claim/receipt/finish, replay không gọi lại model, hoàn khi lỗi). **Chưa nối vào endpoint nào, chưa áp dụng, chỉ phủ Tarot 1 lá.**
- Trace có token/chi phí từng lượt (`ai_trace_spans.attributes`); ngân sách thử kín 5 USD/ngày, 50 USD/14 ngày.
- Webhook RevenueCat + entitlement `premium` (nhánh `claude/revenuecat-billing-lo1`, 22 test Deno đạt; **migration chưa áp, hàm chưa deploy, Lô 2–5 chưa làm**).
- Tài liệu giá trước: `docs/NILAZA_PRICING_AI_QUALITY_STRATEGY_2026-09-25.vi.md` — 1 gói Premium 99k/tháng, 799k/năm (giả thuyết), **chưa bán credits ở pilot đầu**, công thức contribution.

**Khoảng trống**
- Không có ví/sổ cái Nil idempotent (bảng `credit_ledger` bị định nghĩa hai lần trong hai migration; schema thật chưa xác minh), không có bảng gói/SKU, bảng giá theo tính năng, job cấp định kỳ (`pg_cron` chưa cài), không có dashboard chi phí (`overview.js:82` "chưa có số liệu chi phí").
- Thiếu giá tham chiếu cho DeepSeek/Xiaomi trong `provider-registry.ts` → ước tính chi phí route mặc định đang không đúng.
- Mobile: chưa có SDK mua, paywall, restore, số dư; nút "Mở khóa" không làm gì; còn hiển thị giả thuyết giá VND cho Owner.
- **Mâu thuẫn tài liệu cần Owner hợp nhất**: lộ trình Play 23/10 và HANDOFF nói "bản đầu miễn phí"; PLAN.md nhánh RevenueCat (15/11) nói "bán Premium ngay bản Play đầu".
- Nhãn môi trường Singapore (production vs staging) chưa nhất quán trong tài liệu → xác minh trước mọi migration.

---

## 2. Nhận định về ý tưởng Nil

| Khía cạnh | Nhận định | Cách xử lý |
|---|---|---|
| Ví Nil thay "N lượt/ngày" | Tốt hơn cho người dùng (tự chọn dùng gì) và cho ta (kiểm soát chi phí theo giá trị, không theo số lượt) | Làm. Giữ `ai_budget_days` toàn hệ thống làm cầu dao ngoài |
| Giá từng tính năng cấu hình Admin | Tốt: đổi route/model không phải đổi gói | Bảng `nil_feature_prices` có nháp/xuất bản/nhật ký, theo mẫu `ai_feature_configs` |
| Người dùng **không biết** giá | Đạt mục tiêu "không so sánh giá", nhưng gây cảm giác bị qua mặt, vướng EU/Play, và sốc khi Nil về 0 | Ẩn bảng giá; **hiện mức nặng/nhẹ + thanh năng lượng + cảnh báo 50/20/0%** |
| Đổi giá linh hoạt theo chi phí token | Cần cho biên lợi nhuận, nhưng đổi giữa chu kỳ = "shrinkflation", mất tin | Giá là **phiên bản** của tính năng; đổi chỉ áp từ chu kỳ mới + thông báo; **không** định giá cá nhân hoá theo từng người dùng |
| Điều chỉnh theo tính năng dùng nhiều | Hợp lý ở cấp tính năng (giá theo lớp chi phí), không ở cấp người | Dashboard "chi phí thực / Nil đã trừ" theo tính năng, cảnh báo lệch |
| Bán Nil lẻ (top-up) | Biến Nil thành tiền ảo → phải qua Play Billing, giá quy đổi tiền thật phải hiển thị (EU), Apple cấm hết hạn credit mua ❓ | **v1 không bán top-up**: Nil chỉ đến từ gói (là quyền lợi của thuê bao, không phải tiền ảo). Top-up ở P6, tách "ví mua (không hết hạn)" và "ví cấp (hết hạn)" |

---

## 3. Pháp lý, nền tảng, niềm tin (nghiên cứu)

- ✅ **Google Play**: tiền ảo/vật phẩm số bán trong app phải qua Play Billing; tiền ảo chỉ dùng trong app mua nó; thuê bao phải nêu rõ giá, chu kỳ, quyền lợi, gia hạn, hủy. Phí thuê bao 15% (tài liệu EEA; ❓ xác nhận mức áp dụng cho Việt Nam). Vật phẩm ngẫu nhiên có trả tiền phải công bố tỷ lệ (loot-box 2019) → **thêm lý do không bán "rút lại lấy lá tốt hơn"**.
- ✅ **EU CPC Network (21/03/2025)**: giá tiền ảo/nội dung phải hiển thị bằng tiền thật, kể cả khi dùng tiền ảo nhiều lớp; tránh che giấu chi phí; không buộc mua tiền ảo. Không ràng buộc nhưng báo hiệu hướng thực thi; Digital Fairness Act liên quan. ❓ Chưa tìm thấy hành động thực thi cụ thể nào tính đến 11/2026.
- ✅ **Việt Nam**: Luật Bảo vệ quyền lợi người tiêu dùng 19/2023 (hiệu lực 01/07/2024) + NĐ 55/2024: hợp đồng mẫu/điều kiện giao dịch chung phải rõ ràng, cấm ép mua thêm trái ý chí. ❓ Chưa tìm thấy quy định riêng về hiển thị giá in-app → nhờ tư vấn pháp lý trước khi phát hành, và soạn điều khoản Nil rõ ràng.
- ✅ **Bài học Cursor (2025)**: đổi từ hạn mức cố định sang pool credit, thông báo kém, "unlimited" mơ hồ → phản ứng dữ dội, hoàn tiền. Bài học: minh bạch quy tắc, báo trước, bảng theo dõi mức dùng, không đổi âm thầm.
- ✅ **RevenueCat 2026**: app AI kiếm nhiều hơn 41%/người trả tiền nhưng giữ chân kém hơn ~30%; lỗi thanh toán là 32,2% lý do hủy trên Google Play (gấp đôi App Store) → cần grace period/xử lý billing retry ngay từ Lô 2.
- ✅ **Sản phẩm tương tự ở VN (App Store VN, 25/09/2026, tài liệu repo)**: The Pattern 129k/899k; Co–Star 229k; CHANI 279k; Moonly 149k; Labyrinthos 249k + credits 29–199k. Giá 99k/799k nằm dưới đối thủ → có chỗ để thử 89–129k.

**Kết luận pháp lý/niềm tin**: mô hình "Nil cấp theo thuê bao, không bán lẻ, bảng giá không công khai nhưng mức tiêu hao nhìn thấy tại điểm dùng, paywall mô tả bằng số lượt ước tính" là vị trí an toàn nhất mà vẫn giữ được mục tiêu của Owner.

---

## 4. Kinh tế đơn vị và hiệu chỉnh Nil (⚠️ số minh họa — phải thay bằng dữ liệu đo)

**Giả định**: 1 USD ≈ 26.000đ; gói 99.000đ/tháng, thực nhận sau phí store 15% và thuế ≈ **78.000đ** (⚠️ kế toán xác nhận VAT; tài liệu 25/09 dùng 80.000đ); một lượt AI ≈ 2k token vào + 0,7k ra.

| Route (giá ✅/⚠️) | Chi phí/lượt | ≈ đồng |
|---|---|---|
| DeepSeek/Xiaomi flash qua OpenRouter (❓ chưa có giá chuẩn trong repo) | ~0,0005–0,003 USD | 15–80đ |
| Claude Haiku 4.5 ($1/$5 mỗi triệu token ✅) | ~0,0055 USD | ~140đ |
| Cỡ Sonnet ($3/$15 ⚠️) | ~0,0165 USD | ~430đ |

- **Ngân sách AI cho 1 người trả tiền** ≈ 25% thực nhận ≈ **19.500đ/tháng** → ~375 lượt (rẻ), ~136 (Haiku), ~45 (Sonnet). **Model quyết định quota**; vì thế Nil trừ theo *lớp chi phí* và Admin đổi route mà không đổi gói.
- **Ngân sách AI cho 1 người Free**: nếu 3% chuyển đổi và lấy tối đa nửa contribution (~53k) để nuôi Free → ~800–1.600đ/người/tháng ≈ 15–30 lượt rẻ. Hiện cấu hình thử kín (5 chat + 1 Tarot + 1 Chiêm tinh + Hội đồng mỗi ngày) vượt xa mức này nếu mở ra công chúng.
- **Đơn vị Nil đề xuất**: 1 Nil ≈ 50đ chi phí AI gộp (giá trị nội bộ, đổi được bằng bảng giá). Quy tắc an toàn: **cấp phát × 50đ ≤ ~55–60% thực nhận** (worst-case vẫn có lãi nếu mọi người dùng hết).
- **Bảng minh họa** (để Owner thấy logic, *không phải cấu hình*):

| Mục | Giá trị minh họa |
|---|---|
| Free | ~30 Nil/tháng, nhả ~7–8/tuần, không dồn; + 40 Nil chào mừng một lần (server cấp) |
| Premium tháng (99k) | ~800 Nil/tháng (worst-case ≈ 40.000đ ≈ 51% thực nhận; kỳ vọng 16–24k nhờ breakage 40–60%) |
| Premium năm (799k) | cùng cấp theo tháng (không cấp một lần), thực nhận ~52k/tháng → biên mỏng, cân nhắc ~700 Nil/tháng sau pilot |
| Chat nhẹ / Daily insight | ~2–3 Nil |
| Tarot 3 lá + diễn giải | ~6–10 Nil |
| Lá làm rõ | ~2 Nil |
| Hội đồng | ~10–15 Nil |
| Chiêm tinh AI theo câu hỏi | ~15–25 Nil |
| Xem lại bài/bản đồ đã lưu, bản đồ tính trên máy, lá hằng ngày tất định | 0 Nil |

- **Công thức Admin giữ biên**: `giá Nil = ceil(chi_phí_P90_mỗi_lượt × hệ_số / 50đ)`; theo dõi `chi phí thực / (Nil đã trừ × 50đ)` theo tính năng — lệch > ngưỡng (ví dụ nhà cung cấp tăng giá) thì cảnh báo và Owner xuất bản phiên bản giá mới.
- **Chiến lược thí nghiệm** (P5): 3 điểm giá (89k/99k/129k) × 2 mức cấp Nil; đo conversion thật, hoàn tiền, % người trả tiền chạm 0 trước hết chu kỳ (**mục tiêu 10–25%**: thấp hơn = cấp quá tay; cao hơn = gây bực).

---

## 5. Thiết kế gói và nhịp cấp Nil

- **Launch**: Free + **1 gói Premium** (tháng, năm). Bậc cao (Premium+ ×3 Nil) chỉ thêm khi dữ liệu cho thấy ≥15–20% người trả tiền hết Nil sớm. Giữ nhất quán với `NILAZA_PRICING_AI_QUALITY_STRATEGY` (một gói, không "AI không giới hạn").
- **Nhịp cấp**: không cấp theo ngày (tạo áp lực streak/FOMO, trái quy tắc nội dung "không dọa mất streak"). Free: **theo tuần**. Premium: **bể tháng, nhả theo tuần** (chống ăn hết ngày đầu, chống lạm dụng, mượt chi phí), dồn trong tháng; **dồn sang kỳ sau tối đa ~20%** (Admin chỉnh).
- **Hai "xô" trong ví**: `grant` (hết hạn theo chu kỳ, từ gói) và `purchased` (không hết hạn, dành cho top-up sau này, cần cho Apple ❓). Thứ tự trừ: hết hạn trước.
- **Cách cấp**: *cấp lười (lazy grant)* khi mở app lần đầu mỗi kỳ (khóa idempotent theo `plan_period_id`) + webhook RevenueCat khi gia hạn; không phụ thuộc `pg_cron` (chưa cài).
- **Hoàn tiền/hủy**: hoàn tiền → thu hồi phần `grant` chưa dùng của kỳ đó; hủy → giữ đến hết kỳ; billing issue/grace → giữ quyền theo cấu hình RevenueCat. TRANSFER (đang chưa xử lý trong webhook) phải làm trước pilot.
- **Hết Nil**: nội dung không-AI vẫn dùng; thông báo ngày nhả tiếp theo; không dark pattern. Top-up chỉ ở P6.

---

## 6. Chính sách Tarot: "khoá kết quả" thay vì bán lượt rút lại

**Nguyên tắc**: một lần rút = một bản ghi bất biến; diễn giải sinh một lần và phát lại; nhu cầu "xem lại cho yên tâm" được đáp ứng bằng cách khác, không bằng rút lá mới. (Thương hiệu ✅ đã cấm "khuyến khích rút lại liên tục để đổi vận" — `docs/TAROT_ASTROLOGY_CONTENT_ADMIN_REVIEW_2026-10-14.vi.md`; truyền thống đọc bài cũng coi hỏi lặp một câu là dấu hiệu tìm trấn an.)

**Quy tắc đề xuất** (số là mặc định Admin chỉnh được):
1. **Server cấp lá bài** (CSPRNG) tại lần chạm đầu; lưu `draw_id`. Client chỉ "lật". Chặn gọi HTTP với lá tuỳ ý.
2. **Khoá theo (user, spread, chủ đề chuẩn hoá, ngày UTC+7)**: cùng chủ đề + cùng spread trong 24h → trả lại bài đã rút, **0 Nil**. Khoá theo *chủ đề chuẩn hoá* chứ không theo chữ của câu hỏi (diễn đạt lại câu hỏi là đường lách chính).
3. **Chủ đề khác** (tình cảm ↔ sự nghiệp ↔ bản thân) được rút riêng, mỗi lần tốn Nil; trần mềm ~3 spread/ngày.
4. **Van xả cảm xúc** thay cho rút lại: (a) **1 lá làm rõ (clarifier) mỗi bài** — đúng truyền thống, ~2 Nil; (b) **"Trò chuyện về lá này"** (persona/Oracle bị ràng buộc vào đúng các lá đã khoá, nhìn lại góc khác, không đổi lá); (c) ghi vào Journal.
5. **Không** có nút "rút lại" trả phí. Không tính Nil khi xem lại. Hết cửa sổ khoá thì rút mới bình thường ("một thời điểm mới").
6. **Lá hằng ngày (Home)**: seed theo `userId + ngày` (hiện seed theo `goals[0]` + `tone` nên đổi hồ sơ là đổi lá ✅ gap), ghi nhớ đã lật.
7. **Diễn giải bất biến**: lưu kèm `promptVersionId`, `routeVersion`, `contentVersion`; cập nhật prompt chỉ tác động bài mới; replay không gọi model.
8. **Giọng văn khi chặn** (không trách móc): *"Lá bài này vẫn còn điều muốn nói. Hãy ngồi với nó thêm một chút — bạn có thể hỏi thêm về nó, ghi lại cảm nhận, hoặc mở bài mới vào [giờ]."*
9. **Trung thực về ngẫu nhiên**: nói rõ lá được hệ thống rút ngẫu nhiên, ý nghĩa nằm ở cách soi chiếu — khớp chính sách "không phải dự đoán chắc chắn".

Hệ quả kỳ vọng: một số người dùng muốn "đổi vận" sẽ rời đi — chấp nhận, vì nhất quán là tài sản niềm tin. Đo bằng số lượt bị chặn, tỷ lệ dùng clarifier/trò chuyện (nếu cao = van xả hoạt động), và khảo sát "cảm thấy đáng tin".

---

## 7. Chính sách Chiêm tinh

- **Bản đồ sao tính tất định** (✅ `astrology-core`, cùng input → cùng output) nên **xem/tính lại bản đồ đã lưu = 0 Nil**. Rủi ro lách là *đổi giờ/nơi sinh cho đến khi chart "đẹp"*: client hiện tính lại không giới hạn.
- **Khoá hồ sơ sinh**: sau khi tạo, cho **sửa tối đa 2 lần trong 7 ngày** (sửa lỗi nhập), mỗi sửa tạo `revision` có nhật ký; sau đó khoá, mở lại cần lý do (hỗ trợ). Hồ sơ người khác (bạn bè): Free ~2, Premium ~10 (hiện trần cục bộ 20).
- **Giờ sinh không biết**: hiển thị khoảng ("xấp xỉ") đã có, **không** cho thử từng giờ miễn phí để chọn Rising mình thích; tối đa 1 lần "khoảng rectification" cho mỗi hồ sơ.
- **Diễn giải AI**: khoá `(chart_hash, chủ đề chuẩn hoá của câu hỏi, calculationVersion, promptVersion)`; cùng khoá → phát lại **0 Nil** (cột `input_hash` đã có nhưng đang không dùng ✅); chủ đề mới → Nil theo bảng giá. Kết quả sinh ra lưu bất biến.
- **Hợp nhất engine**: bỏ/tắt `ai-astrology-report` legacy (khác kết quả với engine mới ✅); server tính lại hoặc ít nhất băm và ghi `revision` input thay vì tin hoàn toàn fact từ client.
- **Horoscope/transit ngày**: tất định theo (cung/chart, ngày), mọi lần mở trong ngày thấy cùng nội dung; không cho reroll bằng Nil (Daily Insight hiện có `rerollCount` gửi vào prompt → bỏ hoặc giới hạn nghiêm).
- **Temperature**: vì đã cache/replay nên không cần hạ mạnh; nhưng giảm temperature của Tarot/Chiêm tinh (hiện 0,58–0,64) về ~0,3–0,4 để các lần *chưa khoá* (khác chủ đề) vẫn nhất quán giọng.

---

## 8. Kiến trúc kỹ thuật Nil (tái dùng tối đa)

**Dữ liệu (schema `nilaza_private`, client không truy cập, RLS đóng — theo mẫu có sẵn)**
- `nil_plans` (sku/product → chu kỳ, lượng cấp, % dồn, phiên bản, trạng thái).
- `nil_feature_prices` (feature_key, phiên bản, giá Nil, lớp chi phí, trạng thái nháp/xuất bản, người xuất bản, nhật ký) — **theo mẫu `ai_feature_configs`** (cache 60s).
- `nil_wallets` + `nil_ledger` **chỉ ghi thêm (append-only)**: `operation_id` UNIQUE (idempotency), `bucket`, `delta`, `reason`, `feature`, `price_version`, `plan_period_id`, `expires_at`, `cost_micro_actual` (để đối soát).
- Reading lock: cột `lock_key` UNIQUE trên `tarot_readings` / bảng khoá cho `astrology_reports`; `draw_id` phía server.
- Siết quyền: bỏ INSERT/UPDATE/DELETE trực tiếp của client trên `tarot_readings`, `astrology_reports`; xoá = đánh dấu `deleted` vẫn được đếm.

**Luồng trừ** (mở rộng `nilaza_ai_usage_reserve/claim/receipt/finish` và `runMeteredOperation`, bỏ giới hạn `tarotCardCount = 1`): `reserve` (giữ Nil) → gọi model → `commit` (trừ) hoặc `release` (hoàn khi model lỗi, bị chặn an toàn, fallback canned). Thay đếm-rồi-chèn bằng thao tác nguyên tử.
- **Giá cố định theo tính năng, trần thực tế theo lượt**: tận dụng `cost_cap_micro`; lượt vượt trần thì cắt/hạ route, không trừ thêm.
- **Cầu dao ngoài**: `ai_budget_days` toàn hệ thống + công tắc theo tính năng.
- **Chế độ bóng (shadow)**: giai đoạn đầu chỉ *ghi* Nil sẽ trừ, không chặn — để hiệu chỉnh bảng giá bằng dữ liệu beta.

**Tích hợp thanh toán**: webhook RevenueCat (nhánh `claude/revenuecat-billing-lo1`) → ánh xạ product → `nil_plans` → cấp (idempotent theo event id; đã có `nilaza_apply_revenuecat_event`). App phải `logIn(Supabase user id)` trước khi mua (Lô 2).

**Ràng buộc skill `nilaza-ai-runtime`**: mọi trường Admin sửa được phải có nơi runtime đọc (không để "cost cap: chưa áp dụng"); chặn an toàn không rơi sang model khác; văn bản canned luôn gắn nhãn fallback.

---

## 9. Admin "Nil Studio" (apps/admin)

1. **Gói & cấp phát**: sửa lượng Nil/chu kỳ, dồn, hết hạn; nháp → xuất bản → nhật ký.
2. **Bảng giá theo tính năng**: giá Nil, lớp chi phí, trần mỗi lượt; có **mô phỏng "nếu đổi giá"** chạy trên 30 ngày dữ liệu dùng thật.
3. **Dashboard chi phí**: chi phí/lượt theo tính năng & route (từ `ai_trace_spans`), chi phí thực/Nil đã trừ, phân bố số dư, p50/p95/p99 mức tiêu, % người chạm 0, tốc độ đốt so với ngân sách ngày; cảnh báo lệch.
4. **Hạn mức khoá kết quả**: cửa sổ khoá, số lần sửa hồ sơ sinh, số clarifier — cấu hình chung trên một màn.
5. **Tra cứu & hỗ trợ**: xem số dư/sổ cái một người dùng (redacted), cấp/hoàn Nil thủ công có lý do và nhật ký.

---

## 10. Trải nghiệm người dùng

- Tên hiển thị: "Nil" — mô tả trong app: *"Nil là năng lượng để bạn đi sâu vào các trải nghiệm của Nilaza. Gói của bạn nạp lại Nil mỗi tuần/tháng."* Trang FAQ + điều khoản nêu: mức tiêu hao có thể được điều chỉnh, báo trước, không áp dụng giữa kỳ đang trả.
- Thanh năng lượng ở Home/Profile; tại điểm dùng: chip **nhẹ / vừa / sâu** (không số cụ thể — số cụ thể là quyết định ở mục 13); cảnh báo 50% / 20% / 0%, ngày nhả tiếp theo; xác nhận trước hành động "sâu".
- **Paywall trung thực**: tên gói, giá tổng thu, chu kỳ, gia hạn, hủy, restore; quyền lợi bằng ngôn ngữ dùng thật: *"đủ cho khoảng X–Y lượt xem sâu mỗi tháng"* (khoảng, không cam kết cứng); gỡ nhãn `Yearly -40%` chưa có SKU (đã nêu trong tài liệu 25/09).
- Đổi giá/giảm quyền lợi: thông báo trong app + email trước chu kỳ mới; **grandfather một chu kỳ**.
- Xoá giả thuyết giá VND khỏi màn Premium của người dùng thường (đã chỉ Owner thấy).

---

## 11. KPI và guardrail

| Chỉ số | Mục tiêu / ngưỡng |
|---|---|
| Chi phí AI / thực nhận (trung bình người trả tiền) | ≤ ~25–30% |
| Chi phí AI worst-case (hết cả Nil) / thực nhận | ≤ ~55–60% |
| Chi phí AI Free / người / tháng | ≤ ~1.600đ (⚠️ tính lại theo conversion thật) |
| % người trả tiền hết Nil trước hết chu kỳ | 10–25% |
| Free → trả tiền, D7/D30, hoàn tiền | đo thật; hai cohort đủ tuổi trước khi tăng marketing |
| Lượt khoá kết quả chặn / dùng clarifier & trò chuyện | theo dõi tỷ lệ chuyển hướng thành công |
| Cảm giác công bằng ("đáng tin") | khảo sát ngắn sau khi hết Nil và sau bị chặn |
| Khiếu nại/hỗ trợ liên quan Nil, billing issue | ngưỡng cảnh báo để dừng thử nghiệm giá |

---

## 12. Kế hoạch hành động theo pha

> Theo `CLAUDE.md`: mỗi thay đổi không tầm thường cần hồ sơ `docs/feature-plans/<tên>.json` + `npm run feature:preflight` **trước khi sửa**; SQL/migration, deploy Edge Function, cấu hình Play/RevenueCat/Supabase/Vercel **cần Owner duyệt từng lần**; cuối mỗi PR cập nhật `PLAN.md`; push `main` tự deploy Admin staging; gộp theo lô nhỏ, merge sau khi Owner duyệt.

**P0 — Chốt quyết định (không code)**
- Owner trả lời các câu ở mục 13; hợp nhất mâu thuẫn "bản đầu miễn phí" vs "bán Premium từ bản đầu" vào `PLAN.md`/HANDOFF.
- Xác minh schema thật (`credit_ledger` trùng định nghĩa), nhãn production/staging Singapore, đã/chưa cài `pg_cron`.
- Lưu báo cáo này thành `docs/NIL_PRICING_STRATEGY_2026-11-15.vi.md`, liên kết từ tài liệu giá 25/09.

**P1 — Vá lỗ hổng nhất quán + đo chi phí thật (độc lập Nil, làm ngay)**
1. Server cấp lá bài + khoá `(user, spread, chủ đề, ngày)` + phát lại; áp dụng cho `ai-tarot-reading`, lá hằng ngày seed theo userId.
2. Khoá + cache theo `input_hash` cho `ai-astrology-insight`; khoá hồ sơ sinh (2 lần/7 ngày). *(Hàm legacy `ai-astrology-report` đã bị xóa 15/11 — không còn việc.)*
3. Siết RLS/quyền ghi của client; xoá mềm; chống race bằng thao tác nguyên tử.
4. Thêm giá tham chiếu DeepSeek/Xiaomi; ghi chi phí thực vào trace; **truy vấn tổng hợp chi phí theo tính năng** để có số liệu cho bảng giá (chạy 1–2 tuần trên beta).

**P2 — Lõi Nil, chế độ bóng**
- Migration ví/sổ cái/bảng giá/gói; mở rộng RPC reserve/commit/release; nối vào 6 endpoint AI sau cờ; ghi "Nil sẽ trừ" nhưng chưa chặn; nhật ký đối soát chi phí thực / Nil.

**P3 — Admin Nil Studio** (mục 9), bắt đầu từ dashboard chi phí + bảng giá + mô phỏng.

**P4 — Thanh toán & mobile (Lô 2–5 RevenueCat hiện có)**
- App mua/khôi phục/`logIn`, paywall trung thực, thanh năng lượng + chip mức nặng/nhẹ, màn hết Nil, xoá tài khoản/pháp lý, cấu hình Play/RevenueCat/EAS, thử máy thật; xử lý TRANSFER, billing retry/grace; cấp lười + webhook.
- Bật **thực thi** Nil (thoát chế độ bóng) cho nhóm closed beta nhỏ.

**P5 — Pilot trả phí**
- Thí nghiệm giá (89/99/129k) × mức cấp Nil bằng RevenueCat Offerings/Play base plan; theo bảng KPI mục 11; quyết định tiếp/sửa/dừng theo Owner.

**P6 — Mở rộng**: top-up (xô `purchased`, giá tiền thật hiển thị rõ), bậc Premium+ nếu dữ liệu cho thấy, iOS (kiểm lại quy tắc Apple về credit hết hạn ❓), giá theo quốc gia.

---

## 13. Quyết định cần Owner

**Owner đã chốt (15/11/2026, trong phiên này):**
1. ✅ **Minh bạch tại điểm dùng**: thanh năng lượng + mức nhẹ/vừa/sâu (không bảng giá, không số Nil cụ thể).
2. ✅ **Top-up Nil lẻ ở v1**: không; Nil chỉ đến từ gói.
3. ✅ **Khoá Tarot**: 24h theo chủ đề + 1 lá làm rõ + trò chuyện về lá đã rút; không bán rút lại.

**Owner chốt thêm (15/11/2026, đóng P0):**
4. ✅ **Bán Premium ngay từ bản Play đầu tiên** (thay quyết định 23/10 "bản đầu miễn phí"). Hệ quả: RevenueCat (Lô 2–5) và ví Nil (P2) nằm trên đường găng của AAB đầu; không được phát hành bản bán tiền khi Nil/lock chưa qua kiểm thử. Closed test ≥12 người × 14 ngày vẫn bắt buộc.
5. ✅ Chấp nhận một số người dùng muốn "đổi vận" sẽ rời bỏ.
6. ✅ **Ngân sách chấp nhận mất: 1 USD/ngày** cho gói Free khi thử. *Cách hiểu của tôi (xin Owner xác nhận nếu khác):* đây là trần chi phí AI **của người dùng Free trong pha thử**, tách khỏi ngân sách QA hiện hành 5 USD/ngày, 50 USD/14 ngày và ngân sách chạy thử Admin 1 USD/tháng. Tôi **chưa đổi** cấu hình ngân sách nào (cần Owner duyệt). Hệ quả tính nhanh ⚠️: 1 USD/ngày ≈ 30 USD/tháng ≈ 1,5 triệu đồng; với ngân sách ~1.600đ/người Free/tháng ở mục 4 thì nuôi được khoảng **900 người Free hoạt động** (hoặc ~500 người nếu mỗi người dùng nhiều hơn một lượt AI mỗi ngày). Thị trường pilot: Việt Nam, tiếng Việt (giữ nguyên).

---

## 14. Đã / chưa kiểm chứng

**Đã kiểm chứng (✅)**: hiện trạng code/tài liệu repo ở mục 1 và các gap Tarot/Chiêm tinh (đọc code; chưa kiểm DB live/RLS/grants thật); giá Haiku 4.5 $1/$5; nguyên tắc Google Play về tiền ảo/thuê bao/loot-box; CPC Network 03/2025; luật tiêu dùng VN 2023; bài học Cursor; số liệu RevenueCat về app AI và lỗi thanh toán Google Play.

**Chưa kiểm chứng (❓/⚠️)**: toàn bộ số tiền/Nil ở mục 4–5 (giả định); giá thật DeepSeek/Xiaomi/Gemini Flash (các trang tổng hợp mâu thuẫn); tỷ giá, VAT, phí Play áp dụng cho VN; quy tắc Apple về hết hạn credit; quy định VN về hiển thị giá in-app; mức tỷ lệ chuyển đổi/giữ chân thực của Nilaza; giá/doanh thu đối thủ ngoài App Store VN (nguồn tổng hợp độ tin cậy thấp).

**Nguồn**: [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738) · [Google Play EEA terms](https://support.google.com/googleplay/android-developer/answer/14659200) · [Loot-box odds (Fenwick)](https://fenwick.com/insights/publications/google-play-now-requires-disclosure-of-loot-box-odds) · [EU CPC virtual currencies (Baker McKenzie)](https://connectontech.bakermckenzie.com/european-consumer-protection-network-issues-new-key-principles-on-in-game-virtual-currencies-impact-for-gaming-and-gambling-entities-in-belgium-the-eu-and-beyond/) · [Luật BVQLNTD VN (Tilleke & Gibbins)](https://www.tilleke.com/insights/significant-aspects-of-vietnams-new-consumer-protection-law) · [RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps) · [RevenueCat: app AI vs churn (PPC Land)](https://ppc.land/ai-apps-earn-41-more-per-user-but-churn-30-faster-revenuecat-finds/) · [Cursor pricing backlash](https://www.fintechweekly.com/magazine/articles/cursor-pricing-change-user-backlash-refund) · [Giá LLM tổng hợp](https://tech-insider.org/claude-haiku-vs-gemini-flash-vs-gpt-5-4-mini-2026/) (độ tin cậy thấp).

---

## 15. Cách kiểm chứng khi triển khai

- Unit/SQL test ví: idempotency (cùng `operation_id` hai lần chỉ trừ một), hoàn khi model lỗi/bị chặn/fallback, race hai request đồng thời, hết hạn xô `grant`, hoàn tiền thu hồi phần chưa dùng (`scripts/test-ai-usage-sql.mjs` làm mẫu; cần chạy trên Postgres thật — hiện test SQL RevenueCat chưa chạy).
- Test khoá kết quả: gọi trực tiếp HTTP với lá tuỳ ý bị từ chối; đổi chữ câu hỏi cùng chủ đề vẫn nhận bài cũ; xoá bản ghi từ client không reset quota; replay không gọi model (đếm cuộc gọi provider = 0).
- Đối soát shadow mode: tổng Nil sẽ trừ vs chi phí thực từ `ai_trace_spans` theo tính năng; xác nhận hệ số biên ≥ 1.
- Thiết bị thật (Android trước): mua sandbox, restore, hủy, billing retry, cấp lười đúng kỳ, thanh năng lượng, thông điệp khi hết Nil, paywall đúng giá/gia hạn.
- Quy trình Plan-QC của repo: `npm run feature:preflight`, kiểm mobile/Admin/backend/contracts/governance, handoff `PLAN.md`; mọi SQL/deploy/cài đặt cần Owner duyệt.
