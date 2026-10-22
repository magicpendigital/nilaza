# Kế hoạch A — Hoàn thiện sản phẩm Nilaza

Phiên bản đề xuất 1.0 · 20/09/2026 · **Khung A1 đã hoàn tất; A2 slice đang triển khai, vendor/license Astrology chờ báo giá và phân tích tài chính.**

Tài liệu điều phối: [lộ trình và phiếu duyệt](DELIVERY_ROADMAP_APPROVAL_2026-09-20.vi.md). Nhánh độc lập: [kế hoạch B — Marketing AI](MARKETING_AI_PHASED_DELIVERY_PLAN_2026-09-20.vi.md). Cơ sở: [review sản phẩm](PRODUCT_DIFFERENTIATION_GTM_REVIEW_2026-09-20.vi.md).

## 1. Đích đến và quyết định đề xuất

Nilaza phải cung cấp một chuỗi giá trị hoàn chỉnh: hiểu tình huống → phản chiếu có phương pháp → kết quả người dùng tự chọn → lưu và tiếp tục → nhìn lại tiến triển. Astrology là tính năng chủ lực bổ sung, phải có bản đồ cá nhân đúng dữ liệu và trải nghiệm thần thoại tương tác trước ra mắt công khai. Có thể thử riêng Persona/Tarot với nhóm kín sớm hơn, không quảng cáo Astrology chưa hoàn tất.

Phạm vi phát hành đầu: auth/onboarding/Home; Oracle; 3 guide chủ lực chất lượng cao; Tarot; Council có phân vai rõ; Astrology natal chart tương tác; Journal/follow-up; privacy; đo lường; thanh toán thực nếu bán Premium. Các guide còn lại phải đạt mức chất lượng tối thiểu hoặc hiển thị đúng trạng thái; không xóa dữ liệu/lịch sử guide cũ.

Chưa đưa vào wave này: nhân tướng học, marketplace, community, voice, toàn bộ trường phái chiêm tinh, synastry, transit/calendar và mô phỏng bầu trời 3D thiên văn thời gian thực. Các mục này có thể là phase sau, không thay thế chất lượng phần đã cam kết.

Kế hoạch dùng vai trò phụ trách, không mặc định tạo hoặc chạy sub-agent. Mỗi việc có một owner và phạm vi ghi; khi giao agent thực hiện áp dụng [Runbook](AGENT_RUNBOOK.md). Chưa mua license, gọi provider trả phí hoặc triển khai production trong lượt lập kế hoạch.

## 2. Astrology: thuật ngữ, phạm vi và chuẩn trải nghiệm

### 2.1 Tên gọi trong sản phẩm

- **Bản đồ sao cá nhân lúc sinh / natal chart / birth chart:** sơ đồ các vị trí chiêm tinh được tính từ thời điểm và địa điểm sinh. Đây là đối tượng cá nhân hóa chính, có phiên bản khi dữ liệu hoặc hệ tính đổi.
- **Cung hoàng đạo / zodiac sign:** trong lựa chọn tropical đề xuất, 12 phần 30° của vòng hoàng đạo. Một bản đồ có nhiều vị trí thuộc các cung khác nhau, không chỉ một “cung của tôi”.
- **Chòm sao / constellation:** vùng bầu trời trong thiên văn, không đồng nhất 1:1 với 12 phần bằng nhau trong chart tropical. Nếu đưa hình nối sao vào thư viện phải ghi rõ là minh họa hay dữ liệu thiên văn.

Tên menu đề xuất: **Chiêm tinh**; hai lối vào **Bản đồ sao của bạn** và **Khám phá 12 cung**. Không tạo một chart khác cho mỗi cung. Mỗi cung có chương minh họa riêng; chart cá nhân dùng các chương liên quan theo dữ liệu thật.

Nguồn phân biệt thiên văn: [IAU — Constellations](https://iauarchive.eso.org/public/themes/constellations/), [NASA — Skywatching FAQ](https://science.nasa.gov/skywatching/faq/). “Chính xác cao” trong kế hoạch là chính xác tính toán và trình bày; diễn giải chiêm tinh là nội dung biểu tượng/tự phản chiếu, không phải chứng minh dự đoán hoặc tính cách bằng khoa học.

### 2.2 Bộ quy ước cần chốt tại A1

Đề xuất ban đầu: Western tropical; vị trí địa tâm, kinh độ hoàng đạo với convention/flags được ghi rõ; Sun, Moon và Mercury đến Pluto (10 thiên thể theo cách gọi sản phẩm); ASC/MC; Whole Sign houses; 5 góc chính conjunction/sextile/square/trine/opposition; orb table có version. Whole Sign được đề xuất để scope rõ và liên tục với hướng hiện có, không phải tuyên bố nó “đúng” hơn các trường phái khác. ASC là điểm góc riêng, không đánh đồng ASC với ranh giới đầu nhà 1 trong Whole Sign; MC không mặc định bằng ranh giới nhà 10.

Nhóm kỹ thuật so sánh engine đang có với phương án Swiss Ephemeris hoặc dịch vụ đã cấp quyền thương mại. Quyết định bằng fixture accuracy, chi phí, quyền sử dụng, vận hành, dữ liệu ra ngoài và khả năng rollback. Không chốt giá hoặc vendor khi chưa có báo giá. Swiss Ephemeris có mô hình AGPL/Professional License; lựa chọn sử dụng phải được rà soát trước phát hành. [Tài liệu chính thức](https://www.astro.com/swisseph/swephprg.htm), [LICENSE](https://github.com/aloistr/swisseph/blob/master/LICENSE).

### 2.3 Trải nghiệm đồ họa mong muốn

Hướng đề xuất: **đài quan sát thần thoại**, trưởng thành, giàu minh họa, đúng Open Reflection. Dùng nền charcoal/teal, đường vàng tiết chế, chữ ivory rõ, EB Garamond/Hanken Grotesk. Không dùng hiệu ứng hào nhoáng che dữ liệu hoặc thay logo chuẩn.

Ba lớp cùng một trải nghiệm:

1. **Bản đồ dữ liệu:** vòng 360°, 12 cung, 12 nhà khi đủ dữ kiện, markers thiên thể, ASC/MC và đường góc chiếu. Tất cả tọa độ được renderer tính từ chart contract, không từ ảnh AI.
2. **Không gian tương tác:** chuyển từ tổng quan tới từng yếu tố; chạm, phóng to, lọc góc chiếu, chọn theo danh sách; camera/ánh sáng thay đổi mà dữ liệu không đổi.
3. **Thư viện thần thoại:** 12 chương cung hoàng đạo với tranh riêng, biểu tượng, truyền thuyết có nguồn, giải thích phổ thông, câu hỏi phản chiếu; các thiên thể có motif/glyph và trang kiến thức tương ứng.

Tranh AI nếu dùng chỉ phục vụ artwork. Không để ảnh sinh tự do vẽ chart, vị trí hành tinh, nhãn độ hoặc đường góc chiếu. Sao nền trang trí được gọi là không gian minh họa, không mô tả như bầu trời thật lúc sinh. Thần thoại dùng một hướng biên tập nhất quán với phạm vi Western, ghi biến thể/nguồn; không bịa rằng mọi nền văn hóa đều kể cùng một câu chuyện.

### 2.4 Hành trình màn hình

| Màn | Người dùng làm gì | Hành vi cần có |
| --- | --- | --- |
| Astrology entry | Chọn chart cá nhân hoặc thư viện | Có preview trung thực, quay lại report đã lưu |
| Birth profile | Nhập ngày, giờ hoặc không biết giờ; chọn nơi sinh | Place search có lựa chọn xác nhận, không tự dùng vị trí GPS hiện tại làm nơi sinh |
| Xác nhận thông tin | Kiểm ngày/giờ/nơi, độ chắc chắn | Không hiện technical flags; giải thích timezone/giờ thiếu khi ảnh hưởng kết quả |
| Tạo chart | Chờ calculator | Có tiến độ thật theo bước; timeout/retry, không quay vô hạn |
| Chart reveal | Nhìn thấy bản đồ cá nhân | Reveal ngắn, có bỏ qua; chart xuất hiện trước phần AI nếu AI chậm |
| Chart explorer | Chạm Sun/Moon/ASC, cung, nhà, aspect | Highlight đúng đối tượng + panel giải thích; không cần gesture khó để đọc |
| Mythology chapter | Khám phá cung/thiên thể | Tranh có chiều sâu, nội dung ngắn; phân biệt kiến thức chung và vị trí của người dùng |
| Focus reflection | Chọn một chủ đề, hỏi guide | AI chỉ dùng chart fact IDs được phép; quay về đúng điểm trong chart |
| Save/share/revisit | Lưu report, chia sẻ, sửa birth profile | Mặc định ẩn ngày/giờ/nơi sinh; lưu snapshot có version; sửa sinh tạo revision mới |

Ví dụ: chạm Mặt Trăng → marker và cung thực tế sáng lên → panel “Mặt Trăng của bạn ở …” → mở chương cung tương ứng với tranh thần thoại → đọc ý nghĩa biểu tượng → chọn câu hỏi → chuyển tới guide với đúng placement và quyền ngữ cảnh.

### 2.5 Chuẩn đồ họa, hiệu năng và khả năng tiếp cận

Đề xuất bản đầu dùng vector 2D + artwork nhiều lớp + motion tạo chiều sâu (2.5D). A1/A4 thử renderer SVG trước, chỉ cân nhắc canvas/Skia nếu profiling chứng minh cần. `react-native-svg` chưa nằm trong dependencies hiện tại; cài phiên bản phù hợp Expo sau spike và duyệt kỹ thuật, không tự chọn phiên bản latest. [Expo SVG](https://docs.expo.dev/versions/latest/sdk/svg/).

- Tọa độ anchor hành tinh luôn đúng longitude; khi labels va nhau chỉ dời nhãn và nối leader line về anchor. Zoom/highlight không sửa dữ liệu. Chưa cần xoay chart tùy ý ở v1.
- Bật/tắt nhóm aspect, chọn từ danh sách tương đương thao tác chạm; phân biệt bằng nét/nhãn ngoài màu. Tap vùng dày phải có danh sách chọn, không chọn ngẫu nhiên.
- Motion không làm hành tinh chạy quanh chart natal cố định. Parallax tiết chế, dừng khi màn không active. Haptic tùy chọn; âm thanh tắt mặc định nếu sau này bổ sung.
- Reduce Motion có bản tĩnh đầy đủ; screen reader đọc Sun/Moon/cung/nhà/độ; font lớn và viewport 360/390/430 px không làm mất CTA. Vùng chạm ≥48 px theo brand.
- Mục tiêu hiệu năng đề xuất để A1 chốt theo thiết bị: chart cache mở ≤1 giây; tương tác phản hồi ≤100 ms; animation hướng tới 60 fps, bản giảm hiệu ứng giữ ≥30 fps trên máy Android chuẩn thấp đã chọn; không crash/rò bộ nhớ sau 20 lần mở/đóng. Đo native release-like, không lấy browser làm bằng chứng.
- Asset tải theo chương, cache có giới hạn, không tải 12 tranh gốc ngay lúc mở. Artwork lỗi có nền/glyph thay thế; chart và text vẫn dùng được. Định ngân sách kích thước từng asset sau prototype; không hy sinh khả năng đọc để giữ hiệu ứng.

## 3. Tổng quan các giai đoạn

Ngày công dưới đây là khoảng lập kế hoạch cho người phụ trách kỹ thuật, có AI hỗ trợ; chưa gồm lịch chờ license/provider/store hoặc công biên tập/đồ họa riêng. A1 sẽ hiệu chỉnh bằng backlog thực.

| Giai đoạn | Kết quả | Ước lượng | Phụ thuộc |
| --- | --- | --- | --- |
| A1 — Chốt nền tảng, contract và thiết kế | Baseline, gap register, scope và brief Astrology duyệt được | 5 ngày công | Duyệt bắt đầu A1 |
| A2 — Giá trị cốt lõi và đo lường | Persona liên tục, 3 guide sâu, Tarot/Council tốt hơn, events thật | 10–15 | A1; slice continuity/method packs đang triển khai |
| A3 — Astrology tính toán tin cậy | Calculator, input chuẩn, chart contract, đối chiếu fixture | 10–15 | A1; dùng nền A2 trước tích hợp beta |
| A4 — Astrology đồ họa tương tác | Chart renderer, 12 chương cung, motion, mobile QA | 15–20 | Contract A3 ổn định; art concept có thể chuẩn bị sau A1 |
| A5 — Diễn giải và vòng quay lại | Chart→guide→Journal, memory có consent, follow-up/recap | 10–15 | A2, A3, A4 |
| A6 — Release candidate và thương mại | Persistence/privacy/payment/native/store package đã kiểm | 10–15 | A2–A5 |
| A7 — Beta đủ dữ liệu, quyết định launch | Cohort report, sửa điểm rơi, go/iterate/no-go | 4–6 tuần quan sát + 5–10 ngày công sửa dự phòng | A6 cho full beta; beta lõi nhỏ sau A2 |

## 4. A1 — Chốt nền tảng trước xây dựng

**Mục tiêu:** biến bản kế hoạch thành backlog và quyết định kỹ thuật có bằng chứng. Không tự chuyển toàn bộ ước lượng thành deadline cam kết.

**Công việc:**

1. Ghi source state/build/environments, baseline mobile/admin/data/contract checks; phân loại lỗi cũ và lỗi mới. Kiểm prompt/model active qua read-only có quyền, không đọc raw chat thật.
2. Xác minh các finding Persona/history/handoff, Council, payments và analytics từ review; lập incident/gap register có mức ưu tiên.
3. Rà ledger; chuẩn bị đề xuất forward path nếu cần schema mới. Không repair/push. Block DB chỉ chặn phần phụ thuộc DB, không chặn content/fixture/design.
4. Chốt scope phát hành, 3 guide chủ lực, value event, target device matrix và bộ tình huống eval.
5. Chốt thuật ngữ, trường phái, phạm vi ngày sinh được hỗ trợ, output/error/uncertainty contract cho Astrology; ADR calculator/geocoding/timezone/license/cost.
6. Chuẩn bị 2 hướng moodboard/storyboard Astrology và wireflow đủ trạng thái; chọn 1 trước sản xuất hàng loạt. Đây là bước thiết kế sẽ làm sau khi A1 được duyệt, chưa có artwork thật trong tài liệu này.
7. Lập backlog theo thứ tự A2–A6 với owner, estimate và acceptance. Mỗi item có điều kiện dừng nếu phát sinh quyền/chi phí/schema.

**Đầu ra:** [baseline và sổ quyết định A1](A1_BASELINE_AND_DECISION_REGISTER_2026-09-20.vi.md), [chart contract nháp](A1_ASTROLOGY_CHART_CONTRACT_2026-09-20.json), [event dictionary nháp](A1_EVENT_DICTIONARY_2026-09-20.json), [backlog máy đọc được](A1_BACKLOG_2026-09-20.json), [bảng vendor/license/cost](A1_VENDOR_COST_DECISION_2026-09-20.vi.md), scope v1 và visual brief. Các tệp này chỉ là draft review; chưa thay runtime ngoài việc được giao cụ thể trong A1.

**Owner:** product/tech lead; tham gia editor, designer và QA. **Manager thử:** nhìn flow từ nhập sinh đến chart, chỉ ra chỗ dữ liệu tính toán/chỗ nghệ thuật; xem 3 guide khác nhau tạo kết quả gì; đọc danh sách blocker và phương án.

**Gate G-A1:** quyết định phạm vi và design direction được duyệt; uncertainty không còn bị giấu trong API; có phương án khả thi về license/provider. Chưa đủ thì trả lại decision cụ thể, không tự chọn công cụ trả phí. Rollback: giữ baseline và draft; không tác động dữ liệu sản xuất.

## 5. A2 — Hoàn thiện giá trị Persona, Tarot, Council và events

**Tasks:** A2.1 thêm session/history giới hạn có quyền, tóm tắt khi dài và idempotency để retry không nhân đôi; A2.2 dùng handoff đã consent, phân biệt conversation history và long-term memory; A2.3 xây 3 method packs với nguồn/ví dụ/rubric; A2.4 Tarot synthesis dùng canonical selected cards; A2.5 Council output có đồng thuận/bất đồng/giả định/bước thử, giữ canonical contract; A2.6 model allowlist, version/trace/fallback và feedback hữu ích; A2.7 instrument các event từ entry đến result/value/save, không raw content. Slice đầu tiên theo dõi tại [A2 implementation handoff](A2_IMPLEMENTATION_HANDOFF_2026-09-20.vi.md): Persona continuity và method pack routing; database-level idempotency vẫn chờ migration ledger.

Dữ liệu nội dung đề xuất: 60 tình huống nền (20 Persona, 20 Tarot, 20 Council), chia development/holdout trước chỉnh prompt; test hội thoại nhiều lượt và safety riêng. Không dùng số case pass để thay thế đánh giá người dùng. Các guide chưa nâng không được ngầm mang claim tương đương 3 guide đã benchmark.

**Đầu ra:** build nội bộ cho trải nghiệm lõi, content packs VI/EN, eval report, event QA report. **Đường sửa:** `apps/mobile/src/backendClient.ts`, Persona/Council feature folders, phần orchestration `App.tsx`, endpoint/assembler tương ứng, content/prompt configs, tests. Session schema nếu cần phải đi theo forward path được duyệt.

**Gate G-A2 / manager test:** một câu chuyện 5 lượt, đóng/mở vẫn tiếp nối; chuyển Tarot→guide giữ đúng lá/câu hỏi được cho phép; đổi tài khoản không lẫn; retry không thêm hai kết quả/charge; các guide cho phương pháp khác nhau; event backend/client đối soát được. Không lỗi nghiêm trọng trong eval; báo win/tie/loss trước General AI được cấu hình công bằng, chưa tuyên bố vượt trội nếu chưa đủ mẫu.

**Validation:** mobile check và behavioral tests; `validate:data`, `validate:backend`, `supabase:check`, `council:contract:check` nếu đổi Council, authenticated staging E2E. **Rollback:** feature/version flag, route đã kiểm chứng, giữ session/history mới tương thích; không xóa chat. Cho phép beta lõi nhỏ nếu các cổng vận hành đạt.

## 6. A3 — Astrology tính đúng, lưu đúng, giải thích giới hạn đúng

**Tasks:**

- A3.1 Place resolution: xác nhận locality/coordinates, IANA timezone và historical offset theo ngày sinh; không tin offset client tùy ý; xử lý DST giờ không tồn tại/giờ lặp bằng yêu cầu xác nhận, không đoán.
- A3.2 Input validation: ngày lịch thật, leap day, supported date range, precision exact/approximate/unknown; nơi trùng tên; thiếu địa điểm; timezone bất định. Không fallback lặng lẽ sang UTC.
- A3.3 Calculator adapter: kết quả bất biến theo input+conventions+engine/data version; có timeout/cache, kiểm license. Engine chạy backend/service thích hợp; không ép native library vào Edge runtime không tương thích.
- A3.4 Typed canonical chart contract thay dần `Record<string, unknown>`: input revision, UTC/precision, coordinates/source, engine flags, zodiac/house system, positions, speed/retrograde, angles, houses, aspects/orbs, uncertainties, calculation version. Tách chart khỏi AI interpretation và visual theme.
- A3.5 Unknown/approximate birth time: tính miền biến thiên ở mức phù hợp; không show ASC/houses khi không đủ tin cậy; Moon/cung gần ranh giới hiển thị khả năng hoặc hỏi bổ sung, không chọn một kết quả “chắc chắn”. Chart date-only vẫn có phần dùng được nhưng nhãn hạn chế rõ.
- A3.6 Versioned persistence và cache: user ownership; sửa birth profile tạo revision mới, chart cũ vẫn có provenance; delete/export bao gồm report/memory/cache liên quan. Không đưa ngày/giờ/nơi sinh vào trace/analytics.

**Đầu ra:** calculator usable, typed contract/consumers, fixture suite, sai số report, staging E2E và input UX cơ bản. **Đường sửa:** Astrology endpoint, adapter mới theo ADR, mobile types/client/birth form, fixtures/tests, migrations theo gate. Chưa cần full artwork ở bước này.

**Độ chính xác và QC:** tối thiểu 50 fixtures đa địa lý trong phạm vi ngày hỗ trợ, thêm DST, ranh giới cung/nhà/aspect, 0°/360°, nghịch hành/gần station, không biết giờ và vĩ độ cao. Reference phải lưu engine/version/conventions/input; đối chiếu một nguồn tính độc lập khi khả thi. Golden cùng engine chỉ kiểm regression, không được gọi là xác nhận độc lập.

Ngưỡng đề xuất để chốt ở A1: sai khác longitude thiên thể ≤0,01° và ASC/MC ≤0,1° so reference cùng convention cho input chính xác; sign/house/aspect classification đúng theo quy tắc đã công bố, trường hợp sát ranh giới kiểm full precision và uncertainty riêng. Đây là acceptance engineering dự kiến, không phải sai số đã đo hoặc độ chính xác của giờ người dùng khai. Đo circular difference để không coi 359,999° và 0,001° cách nhau gần 360°.

**Gate G-A3:** tất cả fixture bắt buộc đạt hoặc bị từ chối có lý do rõ; không false precision; report tái tạo được; dependency failure không sinh chart giả. **Manager thử:** thay giờ/nơi sinh, so chart chuẩn, chọn “không biết giờ”, nhập nơi không xác định, mất mạng rồi retry. **Rollback:** giữ adapter trước cho report cũ hoặc tắt tạo report mới với thông báo; không thay chart tính đúng bằng mock mà không báo.

## 7. A4 — Bản đồ tương tác và thư viện thần thoại

**Tasks theo thứ tự:**

1. A4.1 Dùng 1 chart fixture + 1 chương cung làm prototype native: wheel, label collision, panel, zoom, Reduce Motion. Chốt renderer từ profiling.
2. A4.2 Chủ sản phẩm duyệt art direction từ prototype trước khi làm cả bộ; yêu cầu review là nghiệm thu thiết kế theo kế hoạch, không cần hỏi lại cho mỗi asset trong bộ đã chốt.
3. A4.3 Làm renderer đủ cung/nhà/thiên thể/góc; anchor chính xác, hit-testing và list alternative; date-only chart không vẽ nhà giả.
4. A4.4 Sản xuất 12 hero artworks cung hoàng đạo theo master direction; 10 glyph/motif thiên thể; thành phần hướng dẫn nhà và 5 loại aspect; 1 bộ background/motion dùng chung. Cung có tranh riêng, không yêu cầu sinh ảnh riêng cho từng khách hàng.
5. A4.5 Biên tập 12 chương VI/EN + 10 mục thiên thể + giải thích nhà/aspect, dẫn nguồn thần thoại và bảng mapping content IDs↔chart IDs. Không làm sẵn mọi tổ hợp placement bằng văn bản khổng lồ.
6. A4.6 Implement progressive loading, cache budget, static fallback; save/share chart snapshot có lựa chọn ẩn thông tin nhạy cảm; ảnh share và wheel cùng chart revision.
7. A4.7 QC mọi asset, icon/glyph, quyền sử dụng; kiểm hiệu năng và accessibility native Android/iOS.

**Đầu ra:** toàn bộ flow Astrology đồ họa v1, asset/source/license manifest và bằng chứng thiết bị. **Tệp dự kiến:** mới `apps/mobile/src/features/astrology/`; mới `assets/features/astrology/`; manifest feature visuals hiện hữu; content/contract sources mới được khai báo tại A1; tích hợp App/navigation có phạm vi. Đây là đường dẫn dự kiến, không tuyên bố đã tồn tại.

**Gate G-A4:** một chart cụ thể có đúng anchors/labels trước và sau zoom; 12 chương đều truy cập được; không hide CTA vì animation; không dùng nhãn ảnh AI; tất cả ca trạng thái loading/empty/error/offline/date-only có UI; profiling đạt ngân sách chốt A1. **Manager thử:** tạo chart, chạm Moon→đúng chương cung, chọn aspect→đúng 2 thiên thể, zoom/reset, font lớn, Reduce Motion, mở offline report đã lưu, share không lộ sinh nhật mặc định.

**Validation:** geometry unit tests, fixture-to-render tests, touch/list selection, screenshot review nhiều chart dày, memory/performance device, brand/visual/data validators và mobile build. Không chỉ snapshot một ảnh đẹp. **Rollback:** tắt cinematic layer vẫn giữ chart vector/text; nếu renderer lỗi quay về bảng placement có dữ liệu thật; không dùng tranh tĩnh giả làm chart cá nhân.

## 8. A5 — Chiều sâu diễn giải, memory và hành trình quay lại

**Tasks:** A5.1 report tập trung 1 chủ đề/lần từ chart fact IDs, kiểm không bịa placement; A5.2 guide “đọc tiếp chart” nhận context có scope, hiển thị nguồn placement khi cần; A5.3 memory chỉ từ điều người dùng xác nhận, có view/edit/delete/disable; A5.4 lưu một lựa chọn hoặc hành động nhỏ và lần hỏi lại; A5.5 weekly reflection bám dữ liệu, không tạo pattern khi chưa đủ; A5.6 Council sâu hơn qua evaluation, không mặc định tăng số model; A5.7 opt-in reminders, generic lock-screen và quiet hours.

**Đầu ra:** chart→insight→guide→Journal→follow-up end-to-end, rubric và eval report; bổ sung sự kiện cho loop. **Đường sửa:** Astrology/Persona/Council/Journal orchestration, memory/notification contracts, content packs, Admin prompt/quality visibility. Không mở raw private content cho marketing.

**Gate G-A5:** report cite đúng fact IDs và diễn giải phù hợp quy ước; sửa memory có hiệu lực; không biết giờ không bị AI bịa ASC; recap nêu đúng hành động/kết quả người dùng tự cung cấp; opt-out dừng reminder. **Manager thử:** lưu điều muốn thử, cập nhật sau 2 ngày, đọc recap, sửa/xóa memory rồi hỏi lại. **Rollback:** dừng tạo summary/reminder mới, vẫn giữ Journal và chart gốc; không tiếp tục gửi job đã thu hồi consent.

**Checks:** hallucinated placement/source validators, multi-turn and deletion tests, event/consent tests, native notifications, staging E2E; rubric chấm mù VI/EN. Chuyên môn ở đây là chất lượng phương pháp/biên tập, không tự nhận tư vấn y khoa/tâm lý/tài chính.

## 9. A6 — Sẵn sàng phát hành và thu phí

**Tasks:** auth/confirmation/recovery/deep link; account switching và data sync; delete/export cả dữ liệu dẫn xuất; credit/entitlement không charge trùng; payment sandbox→restore/cancel/refund/server reconciliation nếu chọn bán; loading/retry/cost limits; crash/performance/rate-limit/load checks; iOS/Android release evidence; Help/privacy/terms/store assets đúng tính năng và build; support & incident runbook.

**Đầu ra:** RC manifest (version, source state, checksum, CI, thiết bị), checklist platform, pricing/entitlements đã được chủ sản phẩm chốt nếu thương mại, public claims register và rollback runbook. Editor cập nhật Help VI/EN từ hành vi đã chứng minh, không copy tài liệu owner/prompt ra public.

**Gate G-A6:** không lỗi chặn trong supported scope; hai protected Admin workspaces hoạt động; restore/refund/permissions được thử nếu bán; offline không báo sync thành công giả; xác minh migration history trước thay đổi DB; chủ sản phẩm nghiệm thu binary thực. Nếu payment chưa đạt có thể chọn beta miễn phí riêng, không ra paid release giả. Nếu iOS chưa đạt, chỉ mời Android trong phạm vi công bố, không gọi đã phát hành cả hai.

**Manager thử:** tạo tài khoản mới đến chart/save/reopen; login máy khác trong supported sync; refund/restore sandbox; xóa dữ liệu rồi kiểm endpoint/cache không phục hồi; mạng lỗi; quay về build trước theo runbook. **Rollback:** feature flags/deployment/binary path cụ thể, schema additive/backward compatible; không bật OTA chưa kiểm chứng.

## 10. A7 — Quan sát khách hàng và quyết định launch

Beta đầy đủ 4–6 tuần để có cohort đủ tuổi. Nghiên cứu lõi nhỏ sau A2 có thể giúp sớm, nhưng không thay cohort dùng Astrology hoàn chỉnh. Mục tiêu tuyển 30–50 người cho diary study ban đầu; sample định lượng tính theo baseline/MDE, không tự coi 50 người là đủ chứng minh uplift.

Đo activation, time-to-value, useful rating, repeat value days, D7 và tuần 4 tách biệt, fallback/error/cost, Astro explore→insight→return, payment/refund khi có. Phỏng vấn người bỏ cuộc; không thưởng theo số lần mở hoặc lời khen. Tách tác động reminder và novelty của artwork khỏi chất lượng quay lại.

Gate chất lượng: không lỗi nghiêm trọng; cổng tính toán/đồ họa A3/A4 vẫn đạt trên phiên bản phát hành. Gate business tham khảo: activation ≥50%, D7 value return ≥20%, tuần đầu 2 ngày có value ≥30%, D28 ≥10%, kèm confidence intervals/cohort/source và cost. Các số này là giả thuyết từ review trước, chốt trước test và hiệu chỉnh có giải thích; không tuyên bố kết quả đã đạt, không dùng để bỏ qua payment/CAC.

**Quyết định:** Go = phát hành trong phạm vi đủ bằng chứng; Iterate = sửa bottleneck cụ thể và cohort mới; No-go paid scale = dừng tăng traffic, giữ nghiên cứu hạn chế. Đầu ra là launch recommendation và backlog sau launch, không tự phát hành. Transit/synastry/3D chỉ xét sau kết quả dùng lại, chi phí và feedback.

## 11. Whole-App Impact Brief và bộ kiểm chung

| Mặt tác động | Quyết định xuyên giai đoạn |
| --- | --- |
| Entry/navigation | Giữ auth-first và 5 tab; Astrology là subflow Explore/Profile/Chat handoff; chart/library có đường back rõ |
| Storage/data | Birth revision, chart snapshot, report, memory, actions/events; local caches account-scoped; export/delete xuyên dữ liệu dẫn xuất |
| Backend/contract | Calculator server-side; một canonical chart schema mới sau A1; chart/interpretation/theme versions độc lập; Council giữ contract hiện hành |
| Admin | Content Ops thêm nội dung/asset Astrology; AI Studio prompt/eval/route; chỉ metadata đã giảm nhạy cảm |
| Privacy/safety | Consent birth/memory/notifications riêng mục đích; không raw birth/chart/chat đưa marketing; unknown birth time không bịa dữ kiện |
| Analytics | Events không chứa nội dung riêng; phân biệt generated/viewed/value; marketing nhận aggregate/cohort được phép |
| Assets/locales | Open Reflection v1; dedicated Astrology assets có provenance; VI/EN biên tập; UI labels theo các locale đang hỗ trợ |
| Monetization | Hạn mức/giá chốt riêng; calculator và report retries không charge hai lần; giới hạn được giải thích |
| Rollback | Backward-compatible data, feature flags, static data fallback, dừng reminders; không dùng old inaccurate chart làm fallback kín |
| Ngoài phạm vi | Face reading, community, full 3D sky, tái thiết kế toàn app, tự thay giá/publish production |

Kiểm theo phần sửa: mobile `check`/tests + Metro web export/Android embedded bundle; `validate:data`, `validate:brand`, `validate:visual-assets`; backend `validate:backend`, `supabase:check`, ledger check và staging E2E; Council contract check khi đổi; Admin check/tests + cả hai workspace; web/public-content nếu đổi Help; governance/skills validators nếu đổi agent config. Không chạy mọi bộ kiểm cho một thay đổi chỉ có tài liệu.

Mỗi phase bàn giao: đã làm, build/files, pass/fail, dữ liệu còn chưa biết, manager test, rollback, actual effort và đề nghị phase tiếp. Hoàn tất kỹ thuật không tự trở thành quyền triển khai phase sau; chủ sản phẩm duyệt tiếp theo cơ chế đã yêu cầu.
