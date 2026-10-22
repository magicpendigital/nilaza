# Nilaza: giá trị khác biệt và điều kiện đưa sản phẩm ra thị trường

Ngày đánh giá: 20/09/2026. Trạng thái: **đề xuất nội bộ, chưa phải quyết định thay PRD hoặc cho phép phát hành**.

Đọc cùng [thiết kế phòng marketing AI](AI_MARKETING_FRAMEWORK_PLAN_2026-09-20.vi.md).

## 1. Quyết định đề xuất

Nilaza có đủ thành phần để chuẩn bị nghiên cứu khách hàng và một closed beta có chọn lọc. Chưa có đủ bằng chứng để mở rộng quảng cáo trả phí hoặc khẳng định chất lượng vượt ChatGPT/Gemini/Claude. Lợi thế hiện tại nằm ở trải nghiệm chuyên biệt, nghi thức Tarot, tiếng Việt và sự liên kết các bề mặt; lợi thế về chiều sâu AI, khả năng ghi nhớ và giữ chân chưa được chứng minh.

Ưu tiên sửa tính liên tục của Persona, chất lượng nội dung và vòng quay lại trước khi mở rộng danh mục. Đưa **bản đồ sao tối thiểu nhưng tính đúng và dùng lại được** vào nhánh kiểm chứng sớm; không biến nó thành điều kiện để bắt đầu mọi hoạt động nghiên cứu thị trường. Không đưa nhân tướng học lên đầu chỉ vì có thể tạo tò mò. Không mở rộng marketing bằng lời hứa “đọc vận mệnh chính xác”.

Giả định pilot: người trưởng thành ở Việt Nam, ưu tiên tiếng Việt, nhóm quan tâm Tarot/tự phản chiếu và những quyết định đời thường. Đây là phân khúc thử nghiệm đề xuất, không phải kết luận rằng toàn bộ Gen Z hoặc phụ nữ có cùng nhu cầu. Chưa biết ngân sách, đội ngũ, thị trường phát hành cuối cùng và doanh thu; không đưa dự báo chuyển đổi giả.

## 2. Phạm vi và độ tin cậy

Đã đọc router, PRD, governance, lịch sử nghiệm thu tháng 9, seed, prompt assembler, các endpoint AI, client mobile và phần waitlist/analytics. Đây là **review tĩnh working tree** có nhiều thay đổi chưa commit. Chưa chạy lại app, chưa đọc prompt đang active trên database, chưa kiểm thử mọi model, chưa có cohort người dùng, chưa phỏng vấn khách hàng hoặc dùng thử toàn bộ đối thủ trả phí.

Thứ tự bằng chứng: mã nguồn hiện hành cho biết cơ chế; biên bản device/staging cho biết những gì đã từng được thử; tài liệu sản phẩm cho biết ý định; website đối thủ chỉ cho biết chức năng họ công bố. Không suy từ tài liệu giới thiệu ra retention, lợi nhuận hay hiệu quả thực tế.

Tài liệu MVP tháng 6 còn ghi “provider mock”, 10 guide, 3 deck; không dùng làm ảnh chụp chính xác của hiện trạng tháng 9. Đếm seed hiện tại: **17 persona** (5 lịch sử, 5 sách, 7 archetype), **78 lá**, **6 deck metadata**, trong đó 2 free và 4 premium-preview. Con số này không chứng nhận 6 bộ tranh hoàn chỉnh hay tất cả nội dung đã phát hành.

## 3. Bằng chứng nội tại và hệ quả kinh doanh

| Mảng | Có gì thực sự | Khoảng trống có ý nghĩa | Quyết định |
| --- | --- | --- | --- |
| Welcome/onboarding/Home | Auth-first, một bước mục tiêu có Skip, Today Pulse có nghi thức mở lá; có bằng chứng Android tháng 9 | Chưa có tỷ lệ hoàn tất, thời gian đến giá trị đầu và iOS RC đầy đủ | Có thể tuyển tester phù hợp nền tảng đã nghiệm thu; đo từng chặng trước mua traffic |
| Oracle | Router, context có consent, provider boundary; biên bản có phản hồi online không fallback | Đã từng chọn nhầm model phân loại qua route tự động; hai lượt tốt không chứng minh chất lượng ổn định | Kiểm định model/route và thông báo dự phòng trước khi tăng tải |
| Persona | Prompt chung + skill riêng active trong DB hoặc fallback; seed có tone/themes/description | Endpoint gửi một user message, không lịch sử; tạo session mới mỗi request; context handoff chưa được prompt assembler dùng | P0: sửa tính liên tục và handoff trước khi quảng bá “người bạn hiểu bạn” |
| AI Council | Template, roster, lịch sử được truyền, output có opening/response/replyTo, canonical contract | Một generation sinh nhiều vai; không nạp persona skill stack như endpoint Persona; chưa có bằng chứng các góc nhìn khác nhau giúp quyết định tốt hơn | Thử như trải nghiệm nhiều lăng kính, không tuyên bố hội đồng chuyên gia độc lập |
| Tarot | App chọn lá, có ý nghĩa xuôi/ngược, vị trí trải, ritual và lưu insight | Prompt runtime ngắn; chưa có rubric kiểm tra tổng hợp giữa các lá, độ cụ thể và trùng lặp | Ứng viên trải nghiệm đầu mạnh nhất, cần nâng nội dung và đánh giá mù |
| Journal | Lưu insight, user note, mood, thống kê 7 ngày | “Memory” hiện đếm mục/mood/nguồn; chưa phải hiểu diễn biến và theo dõi hành động dài hạn; chưa có ghi chú độc lập trong đợt hiện hành | Biến thành vòng theo dõi việc người dùng đã chọn, có quyền sửa/xóa memory |
| Astrology | astronomy-engine, 10 thiên thể, aspects, Rising/whole-sign house ở mức MVP, caveat | Thiếu offset thì tạm UTC; Rising/house được ghi là xấp xỉ; flow geocoding/timezone/native chưa chứng nhận đầy đủ | Hoàn thiện một vertical slice, chưa quảng cáo “bản đồ sao chuyên sâu chính xác” |
| Face reading | PRD deferred, định hướng symbolic/consent | Chưa có bằng chứng nhu cầu giữ chân; ảnh mặt làm tăng chi phí và nghĩa vụ dữ liệu | Chưa làm ở wave đầu |
| Premium | UI và giới hạn/lượt dùng preview | Upgrade/restore còn preview; chưa đủ bằng chứng thanh toán/entitlement thực | Không lấy bấm upgrade làm paid conversion; sandbox payment trước paid launch |
| Growth/operations | Waitlist lưu consent/UTM; public events; usage backend; Trace Explorer | Chưa chứng minh nối campaign → activation → D7/D28 → tiền thực; local events chỉ giữ 80 mục | Xây nền đo lường trước tối ưu ads |

Bằng chứng chính:

- [Persona endpoint](../supabase/functions/ai-persona-chat/index.ts): `messages: [{role:"user",content:text}]`, tạo `chat_sessions` mới. [Client](../apps/mobile/src/backendClient.ts) không có history/session trong `PersonaReplyInput`; [App](../apps/mobile/App.tsx) gửi handoff nhưng [assembler](../supabase/functions/_shared/persona-prompt-assembler.ts) chỉ dùng language/persona/goals/tone.
- [Seed skill generator](../scripts/generate-supabase-seed.mjs): `personaSkillPrompt` chủ yếu ghép mô tả, tone, themes và câu gợi ý. DB có thể đã chỉnh tốt hơn; cần audit riêng prompt active trước kết luận về mọi output production.
- [Council endpoint](../supabase/functions/ai-council/index.ts): một `generateWithModelRoute` cho cả vòng; roster truyền ID, tên, vai trò và template. Các guide chưa tương đương nhiều chuyên gia độc lập kiểm chứng lẫn nhau.
- [Tarot endpoint](../supabase/functions/ai-tarot-reading/index.ts): system hardcoded ngắn. Mobile thực tế gửi card objects có meanings qua `selectedCards`; dù type backend khai báo hẹp, JSON không tự loại fields. Vì vậy **không kết luận Tarot hoàn toàn thiếu dữ liệu lá bài**. Thiếu chính là hệ tri thức biên tập sâu, kiểm chứng và chuẩn tổng hợp.
- [Journal và local analytics](../apps/mobile/App.tsx): `buildJournalMemory`, `recordEvent`, `previewUpgrade`, `previewRestore`. [Public analytics](../apps/web/src/lib/analytics.ts) phát CustomEvent và gọi Zaraz khi có; chưa chứng minh sink đang được cấu hình hay nối identity với app.
- [Astrology endpoint](../supabase/functions/ai-astrology-report/index.ts), [review Android](UX_REVIEW_ANDROID_2026-09-14.md), [trace](AI_TRACE_OBSERVABILITY.md), [migration ledger](SUPABASE_MIGRATION_LEDGER.md).

Trong đường tạo Persona/Council đã đọc chưa thấy retrieval từ `persona_sources/source_chunks/source_embeddings`. Có schema hoặc thư mục content không có nghĩa tri thức đó đi vào model. Đây là khoảng trống tích hợp cần xác minh, không phải tuyên bố cả repo không có dữ liệu.

## 4. Thị trường đang đặt mức kỳ vọng nào?

Nguồn công khai được kiểm tra ngày 20/09/2026; không sử dụng tuyên bố marketing của đối thủ như chứng cứ khoa học.

| Lựa chọn thay thế | Năng lực công bố | Hàm ý cho Nilaza |
| --- | --- | --- |
| [CHANI](https://www.chani.com/app) | Birth chart, nội dung hàng ngày/hằng tuần, transit, meditation, journal; nhấn mạnh nội dung do astrologer viết | Thêm chart đơn thuần không đủ; phải có chất lượng biên tập và lý do quay lại |
| [The Pattern](https://www.thepattern.com/) | Personal insights, Bonds, timing/transits, Time Travel, audio | Người dùng có trải nghiệm cá nhân hóa và quan hệ khá sâu để so sánh |
| [Co–Star](https://www.costarastrology.com/) | Chart, friend connections và cập nhật theo chuyển động thiên thể | Giao diện đẹp + horoscope là một thị trường đã có nhiều sản phẩm |
| [Labyrinthos](https://labyrinthos.co/pages/app), [web app](https://app.labyrinthos.co/) | Hệ sinh thái học Tarot, ý nghĩa lá, công cụ trải và journal | 78 lá và giải nghĩa cơ bản là nền tảng, chưa tạo lợi thế bền vững |
| [Astrodienst](https://www.astro.com/free/) | Nhiều công cụ và nội dung chiêm tinh miễn phí | “Tạo chart” tự nó chịu áp lực miễn phí; giá trị cần ở cách dùng chart và theo dõi |
| [Finch](https://finchcare.com/about-finch) | Self-care pet và những hành động nhỏ | Nilaza cạnh tranh cả với thói quen dễ duy trì, không chỉ app huyền học |
| [Lịch Ngày Tốt](https://lichngaytot.com/boi-bai-tarot-c801-p0.html) | Nội dung Tarot tiếng Việt theo chủ đề | Tiếng Việt và nội dung tò mò đã có nguồn thay thế miễn phí |
| General AI | ChatGPT Projects có chats/files/instructions; Gemini Gems có instructions/files; Claude Projects có instructions/knowledge | Người dùng có thể tự dựng nhiều trải nghiệm nhập vai; chỉ thêm RAG hay memory không còn là khác biệt đủ lớn |

Nguồn General AI: [OpenAI Projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt), [Google Gems](https://support.google.com/gemini/answer/15146780?hl=en), [Claude Projects](https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects).

Claude chat là đối thủ trực tiếp về câu trả lời; Claude Code là đối thủ về khả năng tự xây trải nghiệm cho nhóm có kỹ năng. Không nên giả định người dùng đại chúng sẽ tự viết app, nhưng họ hoàn toàn có thể copy một prompt nhập vai.

Chưa có dữ liệu cho thấy phân khúc Việt Nam sẵn sàng trả mức giá nào, dùng feature nào dài hạn hoặc chọn Nilaza hơn reader con người. Cần phỏng vấn và diary study; không suy quy mô cơ hội từ lượt tải toàn cầu hoặc độ phổ biến chủ đề.

## 5. Nhận định về “system prompt đang quá chung chung”

Nhận định có cơ sở, nhưng nguyên nhân sâu hơn là **hệ thống chưa buộc model tạo ra một phương pháp và kết quả riêng của từng trải nghiệm**.

Prompt dài hơn không bảo đảm chuyên môn. Persona có thể khác giọng nhưng cùng khuyên “lắng nghe bản thân, đi một bước nhỏ”. Council có thể nhiều đoạn nhưng không nhiều thông tin. Tarot có thể ghép nghĩa đúng nhưng không giải thích mâu thuẫn giữa lá/vị trí/ngữ cảnh. Memory có thể đếm ngày mà không giúp tiếp tục một vấn đề.

Mặt tích cực là nền tảng đã có version, provider routing, trace, moderation, content seed, Admin và contract. Đây là tài sản kỹ thuật để nâng chất lượng nhanh hơn viết lại từ đầu. Tuy nhiên, “có hạ tầng đánh giá” và “đã chứng minh output tốt” phải được ghi thành hai trạng thái khác nhau.

Model cần được đánh giá theo tác vụ và phiên bản thật, không tối ưu chỉ theo token rẻ. Route seed Persona còn `openrouter/free`; không đồng nghĩa model đang active trên DB cũng vậy. Biên bản Oracle đã ghi nhận router chọn model phân loại sai mục đích. P0 cần allowlist model hội thoại, benchmark VI, tỷ lệ fallback, latency và chi phí trên phiên hữu ích.

## 6. Giá trị khác biệt nên xây

Lời hứa thử nghiệm: **“Trong vài phút, nhìn rõ một điều đang vướng; sau một tuần, nhìn lại điều gì đã thay đổi.”** Đây là mục tiêu thiết kế cần chứng minh, chưa dùng như cam kết hiệu quả quảng cáo.

Vòng trải nghiệm: tình huống → phản chiếu có cấu trúc → một lựa chọn nhỏ → lưu điều người dùng chọn → hỏi lại sau thời gian phù hợp → tổng kết có bằng chứng do chính người dùng cung cấp.

### Persona: phương pháp trước, nhân vật sau

Chọn 3 guide chủ lực thay vì làm 17 guide đồng loạt. Mỗi guide có gói kiến thức được biên tập gồm: mục đích, phạm vi, nguồn và quyền sử dụng, các nguyên lý, cách chọn bài tập, ví dụ tốt/xấu, câu hỏi chẩn định nhu cầu phi lâm sàng, output contract và bộ eval.

Ví dụ cùng tình huống “Mình luôn đồng ý nhận việc rồi thấy kiệt sức”:

- Guide Stoic-inspired: tách sự kiện/diễn giải/điều kiểm soát được; giúp người dùng chọn một hành động phù hợp giá trị.
- Guide giao tiếp: xác định điều muốn nói, đề nghị cụ thể, ranh giới; tạo một câu nhắn có thể tự sửa và diễn tập tình huống.
- Guide Aristotle-inspired: làm rõ mục tiêu, tiêu chí lựa chọn và thói quen lặp; so sánh hai cách ứng xử theo tiêu chí người dùng đặt.

Không tạo chẩn đoán, không dùng persona nổi tiếng làm chứng thực chuyên môn. Biên tập các nguyên lý lịch sử bằng nguồn phù hợp; bản dịch hiện đại vẫn cần kiểm tra quyền sử dụng. Không gán câu viết mới thành trích dẫn thật.

Người dùng cần nhận một sản phẩm nhỏ: bản phân biệt sự kiện/giả định, câu nói đã luyện, tiêu chí quyết định hoặc kế hoạch tự chọn; không chỉ một đoạn văn hay. Guide phải nhớ trong phiên, hỏi đúng phần còn thiếu và không bắt người dùng kể lại.

### Tarot: từ giải nghĩa sang một phiên có cấu trúc

Giữ card draw bằng app/backend. Pipeline đề xuất: chuẩn hóa câu hỏi → khóa card ID/orientation/position → lấy nội dung canonical → giải từng lá trong đúng vị trí → xét quan hệ/mâu thuẫn → tổng hợp bám tình huống → một hành động tự chọn → hẹn nhìn lại nếu opt-in.

Ví dụ editorial mới do đội ngũ viết: Two of Swords / Eight of Pentacles / Queen of Swords ở các vị trí nút thắt / nguồn lực / bước tiếp theo có thể trở thành câu hỏi về quyết định đang trì hoãn, việc nhỏ có thể kiểm chứng và một ranh giới cần diễn đạt. Không diễn giải thành biết người khác nghĩ gì hoặc dự đoán chắc chắn.

Mỗi insight cần chỉ ra nó dựa vào lá/vị trí nào và chi tiết nào do người dùng nói. Thiếu dữ kiện thì hỏi, không bịa để tạo cảm giác “đọc vị”. Khởi đầu bằng 10–15 tình huống có chất lượng và kiểm định; không cần viết trước mọi tổ hợp 78 lá.

### Council: khác biệt phải nằm trong kết quả quyết định

Mỗi vai chịu trách nhiệm khác: làm rõ giá trị, kiểm tra giả định, tìm phản ví dụ, thiết kế bước thử. Kết quả cuối: điểm đồng thuận, điểm bất đồng, giả định chưa kiểm chứng, lựa chọn và đánh đổi, thông tin nào làm thay đổi kết luận, bước thử ít rủi ro.

Bản nhẹ có thể dùng một model với cấu trúc tốt. Bản sâu mới thử nhiều lượt: phân tích độc lập → phản biện có dẫn chiếu → tổng hợp. Chỉ giữ nhiều lượt nếu eval và hành vi người dùng cho thấy lợi ích vượt chi phí/độ trễ. Nhiều model cũng không bảo đảm độc lập hay đúng; không bán “nhiều agent” như bằng chứng chuyên gia.

### Memory và tiến triển

Memory có cấu trúc: điều người dùng tự xác nhận, nguồn, ngày, mức chắc chắn, thời hạn, quyền dùng. Phân biệt lời người dùng và suy luận AI. Người dùng xem/sửa/xóa/tắt; sửa phải có hiệu lực trong phản hồi tiếp theo. Không suy diễn kiểu gắn bó, bệnh lý hoặc tính cách nhạy cảm.

Weekly reflection chỉ nói những gì có dữ kiện: “Bạn đã chọn thử X; lần sau bạn ghi Y”, cho phép sửa. Khi chỉ có một phiên, không tạo “pattern” giả. Mỗi tuần phải tạo giá trị mới từ quá trình sử dụng, không lặp lời khuyên.

Đây vẫn là lợi thế có thể bị sao chép. Khó sao chép hơn nằm ở tổ hợp: phương pháp biên tập + dữ liệu đánh giá được đồng ý sử dụng + trải nghiệm thấp công sức + vận hành tin cậy + hiểu ngữ cảnh Việt Nam + vòng học từ kết quả. Không coi việc khóa dữ liệu người dùng là lợi thế; cần export/delete rõ ràng.

## 7. Có cần Astrology và nhân tướng học ngay không?

| Phương án | Lợi ích giả định | Rủi ro/chi phí cơ hội | Khuyến nghị |
| --- | --- | --- | --- |
| Tarot + 3 guide + follow-up tuần | Gần năng lực hiện tại, có kết quả sớm, thuận lợi thử chất lượng | Có thể chưa hấp dẫn nhóm chỉ muốn birth chart | Làm thành trải nghiệm đầu chính |
| Astrology tối thiểu có kiểm chứng | Dữ liệu cấu trúc, visual có thể chia sẻ, cá nhân hóa bền hơn một câu prompt | Calculator/giờ sinh/geocoding/biên tập; chart miễn phí đã phổ biến | Khảo sát nhu cầu song song; làm sớm nếu nhóm mục tiêu đánh giá cao và engineering đạt gate |
| Astrology đầy đủ + synastry/transits | Nhiều lý do quay lại | Phạm vi lớn, dễ trì hoãn học từ khách hàng | Chia lát; không hoàn thiện tất cả trước closed beta |
| Nhân tướng học | Có thể tạo tò mò ban đầu | Upload ảnh, niềm tin, dữ liệu nhạy cảm; tò mò không chứng minh retention | Chưa ưu tiên |

Astrology MVP phải có: chọn nơi sinh có tọa độ, timezone lịch sử/DST, kiểm tra ngày/giờ, xử lý không biết giờ sinh, chart fixtures đối chiếu calculator tin cậy, nêu house system, kiểm tra quyền thương mại thư viện/dữ liệu, một focus report và lưu lại. Không biết giờ thì không hiển thị Rising/houses như kết quả chắc chắn; Moon gần ranh giới phải biểu diễn bất định. Không dùng caveat nhỏ để che kết quả UTC sai cho người dùng tưởng đã nhập đúng nơi sinh.

Giá trị hấp dẫn đề xuất là “chart của mình → một chủ đề muốn khám phá → thực hành → nhìn lại”, không phải trang báo cáo thật dài. Mô tả chính xác thiên thể là bài toán tính toán; diễn giải chiêm tinh vẫn là biểu tượng, không chứng minh tính cách hoặc tương lai.

Nhân tướng học truyền thống dự đoán tính cách/vận mệnh từ mặt không phù hợp định vị đáng tin cậy của Nilaza. Nếu thử tương lai, ưu tiên chọn archetype bằng sở thích/tự mô tả, ảnh chỉ phục vụ hình thức khi có consent; không suy nội tâm, sức khỏe, độ đáng tin hay vận số từ ảnh. Không thể bán mạnh một lời hứa rồi giải thích trong disclaimer rằng chức năng không làm điều đó.

## 8. Chứng minh “wow” thay vì tự chấm điểm

### Đánh giá chất lượng

Tạo 60 tình huống tổng hợp hoặc được đồng ý sử dụng: 20 Persona, 20 Tarot, 20 Council; có tiếng Việt đời thường, câu hỏi mơ hồ, mâu thuẫn, context qua 3–5 lượt và ranh giới an toàn. Chia development/holdout theo nhóm tình huống; không sửa prompt theo toàn bộ holdout. Astrology có bộ golden fixtures riêng; an toàn không chỉ kiểm vài tình huống trong bộ nội dung.

So sánh Nilaza hiện tại, Nilaza cải tiến và General AI được cấu hình **tốt**, với cùng dữ kiện/lá bài/nguồn được phép. Ghi model/version/ngày/cấu hình/cost. Chạy hai phép thử: cùng model để biết pipeline đóng góp bao nhiêu; sản phẩm thực tốt nhất mỗi bên để phản ánh lựa chọn khách hàng. Xáo trộn thứ tự, che brand; đánh giá cả nội dung và trải nghiệm hoàn thành công việc.

Rubric 0–4: cụ thể theo tình huống, fidelity với phương pháp/lá/nguồn, hữu ích của hành động, phân biệt persona, liên tục qua lượt, rõ ràng, trung thực về bất định. Vi phạm an toàn/nguồn/tri thức bắt buộc bị fail riêng, không được điểm văn phong bù. LLM judge hỗ trợ sàng lọc; người dùng mục tiêu và biên tập viên kiểm tra mẫu, bất đồng và toàn bộ lỗi nghiêm trọng. Cần xem judge có thiên vị câu trả lời dài hơn hay model cùng họ không.

Mục tiêu giả định để pilot: Nilaza được ưu tiên rõ ràng trong khoảng 65% lựa chọn không hòa, đồng thời báo cáo tỷ lệ hòa và “cả hai không hữu ích”. Không coi mức này đã đạt. Tính khoảng tin cậy theo người/tình huống; nhiều lượt của cùng người không phải mẫu độc lập. Mẫu nhỏ dùng để tìm lỗi, không tuyên bố thắng thị trường.

### Đánh giá hành vi

Phỏng vấn 15–20 người đúng phân khúc; tuyển cả người đang dùng chatbot và app Tarot/astrology. Closed beta 30–50 người trong 14 ngày: quan sát first session, hỏi điều họ mang đi, xem có tự quay lại không. Quà tham gia cố định, không thưởng theo số lần mở app hoặc phản hồi tích cực. Phỏng vấn người bỏ dở, không chỉ người thích sản phẩm.

Sau khi sửa lỗi, chạy cohort lớn hơn có đủ người mới và đủ tuổi dữ liệu. Đo người quay lại để tiếp tục công việc và kết quả tự báo cáo; không dùng số tin nhắn/giờ sử dụng đơn độc làm mục tiêu. Không gửi lời nhắc gây sợ hãi để làm đẹp retention.

### Các gate đề xuất, không phải benchmark thị trường

| Gate | Bằng chứng tối thiểu để quyết định |
| --- | --- |
| Chuẩn bị GTM ngay | Phỏng vấn, prototype, landing/creative draft trung thực, kế hoạch event; chưa cần đủ mọi tính năng |
| Closed beta có giới hạn | Happy path online trên nền tảng được mời; session liên tục; lưu/xóa đúng; fallback rõ; model và safety đã thử; support/feedback có người phụ trách |
| Paid pilot nhỏ | Attribution/event đối soát được; value event đáng tin; không lỗi nghiêm trọng; ngân sách trần và stop rule được duyệt |
| Mở rộng | Ít nhất hai cohort đủ tuổi cho thấy giữ chân lặp lại, không chỉ do reminder; payment thực nếu bán; contribution/CAC đạt giới hạn đã đặt; vận hành chịu tải |

Các ngưỡng khởi đầu để thảo luận trước test: activation ≥50% người mới đủ điều kiện trong 24h; D7 quay lại thực hiện value event ≥20%; 2 phiên có giá trị ở 2 ngày khác nhau trong tuần đầu ≥30%; D28 ≥10%. Đây là giả thuyết nội bộ, phải hiệu chỉnh theo nhịp sử dụng và unit economics. Với sản phẩm dùng hằng tuần, xem thêm quay lại ngày 7–13 và tuần 4, không đánh trượt chỉ vì không mở đúng ngày 7. Không tuyên bố thắng khi mới 30–50 người hoặc confidence interval quá rộng.

## 9. Backlog quyết định và nghiệm thu

| Ưu tiên | Việc | Owner đề xuất | Cách manager thử |
| --- | --- | --- | --- |
| P0 | Persona session/history/handoff; xác minh prompt active | Product + backend/mobile | Nói 3 dữ kiện, hỏi tiếp 5 lượt, đóng/mở; AI không hỏi lại dữ kiện đã có; Tarot→guide giữ đúng ngữ cảnh; đổi tài khoản không lẫn dữ liệu |
| P0 | 3 persona method packs + Tarot synthesis pack | Content lead + product AI | Cùng một tình huống cho các guide; thấy phương pháp khác và nhận artifact dùng được; đối chiếu với General AI |
| P0 | Golden set, route ổn định, version/trace, quality feedback | AI quality owner | Biết output dùng version nào; model lỗi có fallback rõ; kết quả đánh giá tái lập được |
| P0 | Value-event/retention/attribution spine | Analytics + engineering | Theo một người thử từ link tới value event; reload/retry không đếm trùng; không chứa raw chat |
| P0 | Scope release, persistence/privacy, thiết bị và ledger | Release owner | Hoàn thành flow ở cấu hình đã phát hành, thử lỗi/lưu/xóa; có bằng chứng môi trường và rollback |
| P1 | Follow-up opt-in + weekly reflection có nguồn | Product + lifecycle | Lưu một hành động, xác nhận kết quả, tuần sau thấy đúng diễn biến; xóa memory có hiệu lực |
| P1 | Astrology MVP qua gate tính toán | Calculator + content/mobile | Thử nơi sinh/giờ khác nhau, không biết giờ, gần đổi cung; có kết quả đối chiếu và giới hạn đúng |
| P1 | Payment/restore/entitlement thật; share image privacy-safe | Commerce/mobile | Mua sandbox, restore, hủy, refund theo sự kiện; share không lộ câu hỏi riêng tư |
| Sau bằng chứng | Deep Council, nhiều persona, transit, spin-out | Product owner | Chứng minh lợi ích tăng thêm so với phiên đơn giản |

Kiểm tra triển khai tương lai: mobile check/tests liên quan; `validate:data`; `validate:backend`, `supabase:check`, staging E2E cho endpoint; `council:contract:check` khi đổi Council; Admin check/test cả hai workspace; web/public-content khi đổi landing; native iOS/Android theo phạm vi phát hành. Ledger đang blocked là cổng thay đổi database; không tự repair/push. Không coi ledger blocked tự nó là bằng chứng app hiện không hoạt động.

## 10. Whole-App Impact Brief cho kế hoạch tiếp theo

- Entry: landing/waitlist → auth-first → mục tiêu → Today Pulse → Tarot/guide → Journal → follow-up. Duy trì 5 tab và đường quay lại. Không tự thay auth-first bằng guest; nếu thử guest/demo trước auth, cần proposal riêng.
- Data: session/history, approved memory, action check-in, event/experiment IDs; consent, export/delete bao gồm dữ liệu dẫn xuất. Content công khai VI/EN; label UI theo locale hiện hành.
- Backend: server lấy ngữ cảnh được phép, prompt/knowledge/model version riêng; một canonical schema cho từng contract. Council tiếp tục dùng `council-contract.json`.
- Admin: quality và funnel dạng tổng hợp; raw journal/birth/chat không xuất sang marketing. Marketing bổ sung workspace/module riêng theo quyền, giữ Content Operations và AI Studio.
- Safety: phản chiếu, minh bạch persona, tránh định mệnh, crisis route; không tối ưu sự phụ thuộc hoặc suy thuộc tính từ ảnh.
- Analytics: tách generated/viewed/valued/retained/paid; cost và fallback theo version; không nhầm log kỹ thuật thành customer analytics.
- Rollback: feature flags, version trước đã đạt QC, dừng lifecycle/ads khi lỗi; cache/fallback hiển thị thật; không xóa dữ liệu khi rollback.
- Lần này chỉ tạo hai tài liệu; không sửa app/config/prompt/schema, không đăng nội dung, không gửi tin hoặc đặt ngân sách. Owner tài liệu: agent phân tích hiện tại; dữ liệu sử dụng: repo và nguồn công khai. Hoàn tất khi khuyến nghị có bằng chứng, các giả thuyết được gắn nhãn và người quản lý có thể giao backlog.
