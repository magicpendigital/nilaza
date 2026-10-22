# Chiến lược giá và chất lượng phân tích AI cho Nilaza

Ngày nghiên cứu: 25/09/2026. Trạng thái cập nhật 27/09/2026: **chưa cấu hình giá bán, SKU hoặc thanh toán**. Owner UI preview đã tích hợp; Astrology AI v1 và route/prompt đang hoạt động trên Staging, nhưng model DeepSeek hiện active chưa được xác nhận qua lượt E2E trên app. Đây chưa phải quyền lợi thương mại hay bản phát hành. Thị trường thử nghiệm giả định: người trưởng thành tại Việt Nam, dùng tiếng Việt; thị trường khác cần khảo sát giá riêng. Đọc cùng [kế hoạch triển khai và QC Astrology AI](NILAZA_PRICING_AI_IMPLEMENTATION_PLAN_2026-09-25.vi.md), [kế hoạch review Astrology, Owner tier và AI Studio](ASTROLOGY_OWNER_TIER_AI_REVIEW_PLAN_2026-09-24.vi.md), [PRD](FEATURE_PRD.md) và [đánh giá khác biệt/GTM](PRODUCT_DIFFERENTIATION_GTM_REVIEW_2026-09-20.vi.md).

## 1. Quyết định đề xuất

1. **Định giá theo giá trị quay lại, không theo số chữ AI tạo ra.** Giữ bản đồ sao được tính đúng, thư viện 12 cung và một trải nghiệm Tarot/chiêm nghiệm đầu tiên đủ hữu ích ở Free. Premium bán khả năng đi sâu vào chủ đề người dùng chọn, lưu và nhìn lại tiến triển qua Astrology–Tarot–Persona–Journal; chỉ đưa quyền lợi lên paywall khi đã hoạt động thật.
2. **Một gói Premium chính**, trả theo tháng hoặc năm, dễ hiểu hơn nhiều bậc và nhiều loại tiền tệ ảo ở giai đoạn đầu. Giá giả thuyết đầu tiên cho Việt Nam: **99.000đ/tháng**; **799.000đ/năm** *chỉ khi đã chứng minh giá trị lặp lại và thanh toán ổn định*. 799.000đ/năm tương đương khoảng 67.000đ/tháng, thấp hơn khoảng 33% so với 12 tháng mua lẻ; màn mua phải nổi bật **tổng số tiền thu ngay**. Hành lang để kiểm tra mức sẵn lòng trả: 89.000–129.000đ/tháng, 699.000–899.000đ/năm. Đây là giả thuyết, không phải giá được duyệt hoặc giá đã cấu hình.
3. **Không bán một gói “AI không giới hạn” khi chưa đo chi phí ở nhóm sử dụng nhiều.** Lượt giải thích AI có quota rõ trước khi mua, ứng dụng báo số lượt còn lại, thời điểm làm mới và cách xử lý khi hết. Các nội dung tính toán/biên tập chi phí thấp vẫn có thể đọc. Chưa bán credits ở đợt đầu; chỉ xét credits minh bạch cho báo cáo chuyên sâu phát sinh sau khi người dùng hiểu giá trị, chi phí và giới hạn gói.
4. **Không gửi toàn bộ hồ sơ người dùng cho AI.** Chất lượng đến từ câu hỏi đúng, các fact đã tính và được chọn, cách tổng hợp, khả năng chứng minh từng diễn giải, biên tập tiếng Việt và theo dõi điều người dùng tự xác nhận. Astrology AI v1 chỉ dùng chart facts có ID, caveat của giờ sinh và câu hỏi hiện tại; không chuyển ngày/giờ/nơi sinh gốc, tọa độ, Journal hoặc lịch sử chat sang mô hình. Mở rộng ngữ cảnh phải là hợp đồng v2 có lựa chọn riêng, preview/sửa/xóa và chứng cứ cải thiện chất lượng.
5. **Viral là hệ quả của một điều đáng chia sẻ và an toàn để chia sẻ.** Thử thẻ hình ảnh đẹp gồm một ý chính, một câu hỏi tự soi và nhãn nguồn/phương pháp; người dùng xem trước, sửa/ẩn thông tin, chia sẻ chủ động. Mặc định không đưa ngày sinh, nơi sinh, câu hỏi riêng, ghi chú hoặc kết luận nhạy cảm lên ảnh. Đo người nhận mở, tự hoàn tất trải nghiệm có giá trị và quay lại; không dùng share count làm thước đo duy nhất.

Hai lựa chọn ở câu 3 và 4 của [kế hoạch trước](ASTROLOGY_OWNER_TIER_AI_REVIEW_PLAN_2026-09-24.vi.md) đã được Owner đồng ý trong trao đổi 25/09: **AI Astrology v1 trả từng câu theo `current_focus_only`**; **bản test đầu dùng grant staging chỉ dành cho Owner/nội bộ, rồi người dùng thực sau khi P0/P1 và QA thiết bị đạt**. Sự đồng ý đó chưa cấp quyền triển khai hoặc phát hành.

## Cập nhật thực thi UI Owner preview — 25/09/2026

Owner đã yêu cầu thực thi khuyến nghị giá và ngữ cảnh AI. Lát đầu trong app chỉ giúp review giao diện và tính toán giả thuyết; không tạo gói bán, SKU, entitlement hoặc yêu cầu AI thật.

- Owner có thể xem UI theo tài khoản/Free/Premium; chế độ xem thử không đổi quyền server, credits hay số liệu funnel. Daily Insight, Zodiac Pulse, Persona, Oracle, Council và Tarot dừng trước generation khi preview đang bật. Request gửi trước lúc bật preview không bị huỷ và có thể hoàn tất. Astrology cho phép xem form Premium nhưng câu hỏi không được gửi.
- Người dùng thường không thấy giá giả thuyết hoặc CTA mua/khôi phục. Owner thấy 99.000đ/tháng và 799.000đ/năm với nhãn chưa thu tiền; phép tính năm cho mức tiết kiệm 389.000đ (~32,7%) so với 12 tháng trả tháng.
- Astrology copy đã bỏ cam kết giữ ngữ cảnh hội thoại. Composer giới hạn 500 ký tự khớp request schema; khi thiết kế consent flow, câu hỏi mới được gửi cùng calculated facts người dùng chọn theo contract v1.
- Contract v1, endpoint authenticated, report server, entitlement/quota, AI Studio route/prompt và Edge Functions đã có trên Staging. Chart vẫn được tính trên thiết bị; sau consent, endpoint nhận calculated facts theo allowlist. Ba trace spans staging gần nhất được kiểm tra cho thấy model Qwen trả `ok`, trong khi route hiện active đã đổi sang DeepSeek. Chưa xác nhận DeepSeek trả lời và render thành công từ UI điện thoại.
- Migration AI Studio đã được Owner duyệt và apply Staging. Ledger hiện còn một migration yoga/editorial remote-only nên generic `db push`/repair vẫn bị chặn; điều này không xóa hiệu lực của migration đã apply. Chưa cấu hình giá giao dịch, SKU hoặc RevenueCat. Xem [kế hoạch triển khai và QC](NILAZA_PRICING_AI_IMPLEMENTATION_PLAN_2026-09-25.vi.md) để biết acceptance và gate tiếp theo.

## Cập nhật staging 27/09/2026

- Route `astrology_report` hiện active với model `deepseek/deepseek-chat`, schema `astrology_ai_insight_v1`; prompt VI/EN phiên bản `2026-09-25-ai-insight-v1` đang active. Metadata cho thấy route đã publish, còn prompt chưa ghi `published_by`; Owner cần rà lại Versions/Audit.
- Staging có một entitlement `premium_astrology_ai` active, nhưng kiểm tra trạng thái không đọc tài khoản sở hữu. Xác minh đúng tài khoản QA trước lượt test.
- Ba lượt provider spans đã hoàn tất với `qwen/qwen3-235b-a22b-2507`, chưa phải DeepSeek; backend success không chứng minh app đã render.
- `pg_cron` chưa cài. Raw payload chứa system prompt, câu hỏi và model response vẫn tắt; chỉ dùng redacted Trace Explorer cho tới khi purge định kỳ được cài và kiểm chứng.
- Quyết định giá 99.000đ/tháng và 799.000đ/năm vẫn là giả thuyết nghiên cứu. Chưa tạo offer/SKU, chưa bật paywall trả tiền và chưa dùng các con số này để quảng cáo.

## 2. Mức độ chắc chắn của nghiên cứu giá

Nguồn đối thủ dưới đây là **SKU In-App Purchase niêm yết trên App Store Việt Nam, kiểm 25/09/2026**. Một ứng dụng có thể để nhiều SKU cũ, promo hoặc trial cùng lúc; trang cửa hàng không chứng minh offer hiện ra trên paywall của từng tài khoản, tỷ lệ mua hay giá đã trừ thuế/phí. Các sản phẩm khác nhau về thương hiệu, nội dung và thị trường, nên bảng cho **khung tham chiếu**, không chứng minh Nilaza có thể bán cùng giá.

| Sản phẩm | SKU thấy tại Việt Nam | Tín hiệu đóng gói hữu ích cho Nilaza |
| --- | --- | --- |
| [The Pattern](https://apps.apple.com/vn/app/the-pattern/id1071085727) | Go Deeper+ 129.000đ/tháng, 899.000đ/năm | Có phần cập nhật và kết nối miễn phí; gói trả phí nhấn mạnh thư viện, audio và nội dung quan hệ sâu hơn. Listing cũng nhắc AI In-Depth, nhưng **chưa xác minh entitlement cụ thể của AI đó**. |
| [Co–Star](https://apps.apple.com/vn/app/co-star-personalized-astrology/id1264782561) | Pro-Star 229.000đ/tháng; 5 câu hỏi 99.000đ; báo cáo self/relationship 299.000đ | Ví dụ cho mô hình thuê bao cộng sản phẩm theo lượt, nhưng không chứng minh người dùng Nilaza muốn mua câu hỏi lẻ. |
| [CHANI](https://apps.apple.com/vn/app/chani-your-astrology-guide/id1532791252) | 279.000đ/tháng, 2.499.000đ/năm | Một mốc premium cao hơn gắn với nội dung được biên tập; không nên lấy giá đó làm bằng chứng cho Nilaza trước khi có chất lượng/retention. |
| [Moonly](https://apps.apple.com/vn/app/moonly-moon-phases-calendar/id1489889871) | PRO tháng 149.000đ; nhiều SKU năm 249.000–449.000đ, chart 599.000đ | Sự chồng lấn SKU khiến so sánh mức thực thu và giảm giá rất dễ sai. |
| [Labyrinthos](https://apps.apple.com/vn/app/labyrinthos-tarot-reading/id1155180220) | Premium 249.000đ và 2.299.000đ với chu kỳ không rõ trên danh sách IAP; credits 29.000–199.000đ | Tarot miễn phí, nội dung/AI/credits bán thêm; không suy chu kỳ gói từ tên SKU mơ hồ. |

Theo [Apple về thuê bao](https://developer.apple.com/app-store/subscriptions/), freemium hoặc metered paywall đều là mô hình hợp lệ, nhưng màn mua phải nêu tên/thời hạn/lợi ích, toàn bộ giá gia hạn theo tiền địa phương và khôi phục mua. [Google Play](https://support.google.com/googleplay/android-developer/answer/9900533?hl=en) yêu cầu nêu rõ lợi ích lặp lại, giá, thời điểm gia hạn, trial và cách hủy. Vì vậy nhãn `Yearly -40%` hiện trong [Profile mobile](../apps/mobile/App.tsx) phải gỡ hoặc tính từ SKU thật trước khi thử bán; không dùng nó để làm anchor trong nghiên cứu.

## 3. Nilaza đang có gì để bán, còn thiếu gì

[PRD 6.8](FEATURE_PRD.md) dự kiến Free có Daily Insight, chat giới hạn, Tarot một lá/ngày và lịch sử hạn chế; Premium có thêm chat, trải ba lá, guide và journal sâu; credits cho báo cáo đắt. Mã mobile hiện ghi **3 lượt Tarot Free/ngày**, màn Premium và Restore vẫn là preview, không phải giao dịch. Astrology AI contract đã có endpoint/provider/entitlement staging; vấn đề còn lại là xác nhận active DeepSeek trên app, kiểm giới hạn/quota và hoàn tất QA thiết bị. Những tính năng chưa có SKU, RevenueCat receipt validation và restore thực tế vẫn không được mô tả như quyền lợi đã bán.

Giá trị có thể kiểm chứng sớm: chart tính trên máy và biểu diễn điều chưa chắc chắn, 12 chương cung, trải nghiệm Tarot và ghi nhận của chính người dùng. Giá trị phải chứng minh thêm: AI Astrology có bằng chứng và bản dịch tự nhiên, tính liên tục giữa phiên, quyền hạn thật, thanh toán/restore, lưu và xóa xuyên thiết bị. Không đưa Face Reading, synastry/transits, “AI nhớ mọi chuyện” hoặc thư viện chưa phát hành vào lời hứa gói đầu.

### Ma trận offer để thử, chưa phải entitlement đã cấu hình

| Trải nghiệm | Free đề xuất | Premium đề xuất | Điều kiện để quảng bá/bán |
| --- | --- | --- | --- |
| Astrology | Một chart cá nhân đầy đủ theo dữ liệu có độ chắc chắn thích hợp; thư viện 12 cung; lưu/đọc lại khi data sync an toàn | Diễn giải theo câu hỏi chọn từ chart đã tính, evidence chạm được; các chủ đề/chương chuyên sâu đã biên tập | Đồng bộ report đúng owner, AI v1 chạy thật, quota server, bản giờ không rõ không bịa Rising/nhà. |
| Tarot | Một trải một lá/ngày là **giả thuyết PRD**; nếu đang hiển thị 3 thì chỉ thay sau test, truyền thông và rule nhất quán | Trải ba lá và thêm lượt theo quota công bố; thư viện/deck Premium chỉ khi assets/nội dung đã sẵn | App, backend, thông điệp limit và credit ledger cùng một nguồn quyền. |
| Persona/Oracle | Một mẫu trò chuyện hữu ích, giới hạn ngày rõ | Thêm lượt và guide/continuity có giá trị thật | Sửa continuity/handoff; không bán “hiểu bạn lâu dài” khi chưa có memory đúng. |
| Journal | Lưu insight và ghi chú của mình, export/delete rõ | Các góc nhìn tiến triển/hồi tưởng có bằng chứng từ mục người dùng chọn chia sẻ | Không khóa lại dữ liệu đã do user tạo; retention/delete sync được thử. |
| Credits/báo cáo lẻ | Chưa bán trong pilot đầu | Chưa mặc định kèm gói | Chỉ thêm nếu có report tốn kém riêng, bảng giá/lượt và kết quả rõ, refund/retry/idempotency. |

**Quota thử nghiệm để kiểm chi phí, chưa nên in trên paywall:** 1 mẫu Astrology AI sau khi hoàn tất chart có thể dùng **trial entitlement một lần do server cấp**, không vượt qua `premium_astrology_ai` ở client; Premium thử 20 câu Astrology AI/tháng và một mức sử dụng Persona/Tarot tách riêng theo chi phí thực. 20 là điểm khởi đầu cho load test, không phải tối ưu đã chứng minh. Nếu một câu trả lời chất lượng cao cần nhiều lượt nội bộ, phải tính toàn bộ primary/fallback/moderation/validation vào giá một lượt; lỗi provider/safety không được âm thầm tiêu lượt. Quy tắc quota phải tính server-side và thống nhất khi đổi thiết bị/khôi phục/hủy. Nếu pilot cho thấy 20 câu quá chật hoặc quá rộng, sửa offer trước khi bán, không hứa “unlimited”.

## 4. Giá, thử nghiệm và kinh tế đơn vị

### Trình tự thương mại đề xuất

| Giai đoạn | Giá/offer hiện ra | Mục tiêu học | Gate đi tiếp |
| --- | --- | --- | --- |
| Nội bộ/Owner test | Không thu tiền; Free/Premium **view mode** riêng, Premium function qua QA grant staging có hạn | Kiểm quyền/UX/AI và lời hứa gói | Không P0/P1, route/entitlement/ledger được kiểm thật, iOS và Android. |
| Closed beta với người dùng thực | Chưa charge; hỏi lựa chọn giữa mô tả gói và mức 89k/99k/129k; có thể cho mẫu AI giới hạn | Chất lượng, hành trình giá trị, willingness to pay định tính; tránh coi ý định là doanh thu | Người dùng chủ động quay lại và giải thích được lý do trả tiền; thất bại/safety thấp. |
| Paid pilot nhỏ | Ứng viên 99.000đ/tháng. Thêm 799.000đ/năm khi đã có đủ bằng chứng dùng lặp lại và quy trình hoàn tiền/restore | Conversion **thật**, renewal, refund, chi phí ở phân vị cao, contribution | Hai cohort đủ tuổi; không tăng tiền marketing khi retention/quality thấp. |
| Tối ưu | Thử thay thông điệp, độ sâu gói, giá trong hành lang; promo chỉ có điều kiện và thời hạn rõ | Chọn lợi ích người dùng trả tiền lâu dài, không chỉ click paywall | Đo net revenue và chất lượng song song, so với control, có owner quyết định. |

Không mở trial tự gia hạn trong vòng kiểm chất lượng đầu. Một **mẫu Premium có giới hạn** cho người đã tạo chart giúp họ biết thứ gì đáng trả tiền. Nếu sau này dùng trial 7 ngày, phải hiện rõ ngày bắt đầu thu, tổng tiền gia hạn và cách hủy trước khi xác nhận. Đừng dùng giá năm tính theo tháng làm chữ lớn hơn số tiền năm thực thu; Apple và Google nêu rõ điều này trong nguồn ở trên.

**Công thức ra quyết định giá** (đơn vị mỗi người trả tiền mỗi kỳ):

`Contribution trước acquisition = tiền thực nhận sau thuế/phí store/refund − chi phí model mọi lần thử/fallback − hạ tầng biến đổi − support/refund vận hành − chi phí nội dung phân bổ hợp lý`.

Sau đó `CAC tối đa` phải nhỏ hơn phần contribution thận trọng trong khoảng hoàn vốn do Owner chọn, không dựa trên lifetime tưởng tượng. Tính riêng người trả tiền nhưng không dùng AI và nhóm dùng rất nhiều (p50/p95/p99), tháng đầu so với tháng gia hạn. Ví dụ **minh họa, không phải dự báo**: nếu thực nhận 80.000đ từ gói 99.000đ và các biến phí không AI là 10.000đ, thì còn 70.000đ để trả AI **và** tạo contribution. Nếu muốn giữ 40.000đ trước CAC, trần AI là 30.000đ/người/kỳ: ở 20 lượt là 1.500đ/lượt, ở 50 lượt là 600đ/lượt. Số thực nhận, chi phí/lượt, phân phối lượt và margin cần điền bằng receipt + usage thật; không dùng con số minh họa để chốt quota.

Nguồn đo phải phân biệt `generated`, `viewed`, `value_recorded`, `paid`, `renewed` và `refunded` như [khung marketing](AI_MARKETING_FRAMEWORK_PLAN_2026-09-20.vi.md); trace hiện có ghi token/latency nhưng chưa thay được receipt và chi phí hoàn chỉnh. Tách account QA khỏi funnel; xem tỷ lệ người nhận giá trị ở 2 ngày khác nhau, D7/D28, tỷ lệ thấy insight hữu ích, tự lưu/chọn một hành động, báo lỗi/opt-out, payer conversion và contribution. Đừng tối ưu số tin nhắn hoặc thời gian app mở vì chúng có thể phản ánh câu trả lời vòng vo.

## 5. “Càng nhiều thông tin cho AI càng tốt?” — Không

Nghiên cứu [Lost in the Middle](https://arxiv.org/abs/2307.03172) cho thấy trong tác vụ tìm thông tin từ ngữ cảnh dài, hiệu năng model thay đổi mạnh theo vị trí của dữ kiện liên quan; đó không phải thử nghiệm trực tiếp trên chiêm tinh nhưng bác bỏ giả định “thêm mọi thứ luôn tốt hơn”. [Một nghiên cứu long-context khác](https://arxiv.org/abs/2510.05381) quan sát suy giảm ở một số tác vụ khi đầu vào dài hơn ngay cả trong điều kiện retrieval được kiểm soát; mức suy giảm của paper **không** được suy thành số liệu Nilaza. Dữ liệu dư cũng tăng token, độ trễ và số trường nhạy cảm đi qua provider/trace. Chất lượng cần kiểm trên câu trả lời và hành vi người dùng, không đo bằng độ dài prompt.

### Gói bằng chứng nên đưa vào một lượt Astrology AI v1

1. **Ý định hiện tại:** một câu hỏi hoặc chủ đề do user chọn, đã lọc dữ liệu không cần thiết, có mức giới hạn ký tự đúng contract. Không tự diễn giải câu hỏi liên quan sức khỏe, pháp lý, tài chính hoặc khủng hoảng thành dự đoán.
2. **Sự thật tính toán:** chỉ selected placements/aspects/houses có `factId`, version chart/calculation, mức ổn định và caveat. Đánh dấu điều không biết; nếu thiếu giờ sinh thì không đưa Rising/house giả.
3. **Phương pháp diễn giải:** prompt versioned chỉ rõ cấu trúc: diễn giải ngắn có evidence IDs, điểm căng/thử nhìn khác, câu hỏi tự soi hoặc một bước nhỏ tùy chọn; tách biểu tượng khỏi sự thật khoa học. Output phải qua schema, evidence validator, safety và biên tập ngôn ngữ.
4. **Quyền sử dụng:** backend kiểm report thuộc người dùng, entitlement/quota, consent cho câu hỏi hiện tại và audit version trước khi gửi mô hình. Admin chỉ thấy metadata/chi phí redacted. Nếu lỗi, chart miễn phí vẫn đọc được.

[Contract AI Astrology v1](../packages/agent-config/astrology-ai-insight/contract.json) đã xác định các trường cho phép và cấm; [README](../packages/agent-config/astrology-ai-insight/README.md) xác nhận nó vẫn là foundation. Dữ liệu sinh gốc **có thể cần đến backend để xác minh/tính chart** trong kiến trúc tương lai, nhưng không được nhầm điều đó với quyền gửi toàn bộ dữ liệu ấy đến mô hình. Cần thông báo hai mục đích riêng, retention và xóa.

### Mở rộng về sau chỉ khi chứng minh lợi ích

Nếu thử kết nối Journal/Persona, thiết kế “thẻ ngữ cảnh” người dùng **tự chọn** (ví dụ: “Tuần trước tôi đã thử nói điều này và muốn nhìn lại”), xem/sửa/bỏ trước khi gửi, có nguồn/ngày/hạn dùng và xóa được. Không quét toàn bộ Journal hoặc lịch sử chat mặc định; không biến điều AI suy ra thành thuộc tính cá nhân được coi là sự thật. Tạo contract v2 và thử A/B trên bộ tình huống có quyền dùng: chart facts + câu hỏi so với thêm thẻ do user chọn, cùng model/version/token budget gần tương đương. Chỉ giữ trường bổ sung nếu người dùng thấy hữu ích hơn, ít lỗi hơn, và chi phí/quyền riêng tư chấp nhận được.

Rubric chất lượng phải chấm **đúng fact/caveat**, cụ thể với câu hỏi, độ mới của góc nhìn, tính hữu ích của bước tiếp theo, giọng Nilaza tiếng Việt/Anh, khả năng chỉ ra evidence, sự gọn, và an toàn. Vi phạm bịa placement hoặc dự đoán chắc chắn là fail dù văn hay. Chấm mù giữa Nilaza và một general AI được cung cấp **cùng dữ kiện hợp lệ**, có editor và người dùng mục tiêu; ghi thắng/hòa/cả hai không hữu ích, chi phí và độ trễ. So sánh prompt ngắn/gói bằng chứng chọn lọc với bản có thêm ngữ cảnh **trên dữ liệu synthetic hoặc consented**, không lấy raw private content làm benchmark mặc định. [Kế hoạch GTM](PRODUCT_DIFFERENTIATION_GTM_REVIEW_2026-09-20.vi.md) đã có thiết kế rubric/closed beta tổng quát; bổ sung golden fixtures Astrology và trường hợp giờ không rõ.

## 6. Giữ chân và lan truyền không đánh đổi niềm tin

Vòng giá trị đề xuất: **khám phá → thấy một điểm từ chart/Tarot có bằng chứng → chọn câu hỏi của mình → lưu điều mình nhận ra → vài ngày sau nhìn lại điều đã tự chọn**. Hàng tuần chỉ tạo recap từ dữ liệu được user chọn và còn hiệu lực; khi chưa có hai mốc không gọi đó là “mẫu hình”. Câu trả lời Premium sâu hơn phải giúp user hiểu hoặc hành động nhẹ nhàng, không kéo dài hội thoại để bán thêm lượt hay tạo lệ thuộc.

Vật phẩm chia sẻ nên có bản **công khai mặc định**: hình trong hệ Open Reflection, một insight mang tính biểu tượng, một câu hỏi mở, nhãn “để tự phản chiếu” và link dẫn về trải nghiệm Free. Cho người dùng chọn thêm/tắt cung hoặc chủ đề; preview đầy đủ trước share; không tự đăng. Đo `share_created → recipient_open → activation_value → return_value`, có thể thử share card A/B với nhóm nhỏ. Tránh thưởng credits cho việc mời bạn khi chưa có chống lạm dụng và đánh giá chất lượng traffic. Không dùng cảm giác sợ bỏ lỡ, “định mệnh đã định” hoặc tiết lộ chuyện riêng để tạo viral.

## 7. Kế hoạch triển khai sau khi Owner duyệt tổng thể

| Chặng | Việc phải hoàn thành | Bằng chứng quản lý có thể kiểm |
| --- | --- | --- |
| P0: Chốt product truth | Ma trận Free/Premium, thuật ngữ credits, nội dung sẵn sàng, quota và copy VI/EN; đối chiếu PRD với app; giả thuyết giá/benefit, nghiên cứu 10–15 người đúng phân khúc về lợi ích và ngưỡng giá | Một bản entitlement/offer versioned; không còn claim `Yearly -40%` chưa có SKU; Owner đóng vai hai bậc qua preview. |
| P0: Runtime và data gate | Theo [kế hoạch Astrology](ASTROLOGY_OWNER_TIER_AI_REVIEW_PLAN_2026-09-24.vi.md): reconciliation migration ledger, owned report, endpoint v1, quyền/quota server, prompt/model route/Admin publish thật, redacted usage và idempotency | Signed-in staging: Free nhận chart; grant Premium nhận insight có evidence; bị từ chối/revoke/fallback đúng; không raw birth sang model. |
| P1: Giá trị và UX | Sửa đường Chart Story/Save/Journal, message AI v1, màn quota/paywall và restore sandbox; một mẫu insight hữu ích cho Free; share card an toàn theo brand | Owner và tester hoàn thành đường đầu, lưu, mở lại, hiểu phần miễn phí/trả phí và nội dung chia sẻ; QA iOS/Android, font lớn. |
| P1: Chất lượng | Golden chart exact/approx/unknown, tình huống VI/EN và nhạy cảm, so sánh mù với general AI; đo p50/p95 chi phí/latency, điểm hữu ích và tỷ lệ fail | Báo cáo quality có fail riêng cho invented facts/safety, không chỉ điểm model tự chấm; quyết định giữ/sửa prompt theo holdout. |
| Pilot thương mại | Receipt/restore/cancel/refund, mức 99k giả thuyết, annual chỉ khi phù hợp, cohort experiment và support | Đối soát tiền thực–entitlement–usage–chi phí; paywall trung thực; hai cohort đủ tuổi; owner quyết định continue/revise/pause. |

**Phụ thuộc và ranh giới:** `docs/SUPABASE_MIGRATION_LEDGER.md` đang chặn repair/db push; cần đường forward được review và quyền database owner riêng. Không dùng việc Owner đồng ý AI v1/bản test nội bộ làm phép bật production, mua quảng cáo, thay giá thật, phát hành store hoặc gửi nội dung cho người khác. Bản kế hoạch này chỉ bổ sung quyết định và gate cho tài liệu 24/09; chi tiết UI/Admin/QA vẫn nằm ở tài liệu đó. Khi thực thi, kiểm mobile/Admin/backend/contracts/governance, sandbox billing và device path theo [Plan-QC](PLAN_QC_PROTOCOL.md), rồi owner review một build có version/hash/kết quả test rõ.

### Các quyết định vẫn cần chốt trước thay đổi runtime

- Xác nhận thị trường pilot Việt Nam và mức ngân sách chấp nhận mất; giá 99k/799k là **ứng viên** để nghiên cứu, không phải ủy quyền cấu hình SKU.
- Chốt offer/quota cuối sau chi phí và phản hồi người dùng; đặc biệt giải quyết PRD một lá Free/ngày so với mobile ba lượt/ngày và ranh giới subscription/credits.
- Chốt retention/consent của report được backend xác minh và thẻ ngữ cảnh tương lai; v1 giữ đúng allowlist hiện tại.

**Handoff lượt này:** chỉ tạo tài liệu chiến lược và cập nhật ghi nhận lựa chọn 3/4 của Owner trong kế hoạch trước. Không thay code, Admin, DB, prompt, model, entitlement, giá hay bản build.
