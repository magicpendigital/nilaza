# R00 — Đề xuất quota và ngân sách AI cho G1

Đề xuất ngày 01/10/2026; **chủ sản phẩm đồng ý ngày 02/10/2026**: Tarot 1 lá/ngày, Chat/Oracle dùng chung 5 lượt/ngày, QA 5 USD/ngày và 50 USD/14 ngày cùng phạm vi bên dưới. [Policy đã version](../../../packages/agent-config/ai-usage-policy.json). Chưa bật trên backend hoặc publish Admin. Phê duyệt chính sách này không đồng nghĩa phê duyệt tạo project, apply SQL, deploy hay nạp tiền provider; ngày bắt đầu chiến dịch cần activation riêng sau nghiệm thu runtime.

## Chính sách đã được duyệt

| Hạng mục | Đề xuất | Ý nghĩa nghiệm thu |
|---|---|---|
| Tarot | 1 trải bài 1 lá miễn phí/tài khoản/ngày — đã chốt | Một kết quả mới thành công; mở lại kết quả đã lưu không trừ thêm |
| Chat/Oracle | **5 lượt dùng chung/tài khoản/ngày** | Mỗi tin nhắn của người dùng nhận được một kết quả mới thành công tính một lượt, kể cả câu hỏi tiếp nối; không phải 5 lượt cho từng tính năng |
| Ngày sử dụng trong beta | Ngày do server tính theo UTC+7, reset lúc 00:00 | Thiết bị đổi giờ/múi giờ không được cấp thêm lượt; UI hiện thời điểm reset |
| QA toàn hệ thống | **5 USD/ngày; 50 USD cho đợt QA 14 ngày** | Gộp mọi tài khoản, Admin Test Run, cron, retry và fallback trên target QA; chạm một trong hai trần phải chặn gọi mới |
| Cảnh báo | 2 USD và 4 USD/ngày; 40 USD/đợt | Hiện trong Admin với số đã chi và số đang giữ chỗ; không chỉ theo hóa đơn đến muộn |
| Nhóm thử | 8–12 khách hàng thật được mời | Tăng nhóm hoặc mở thêm AI Council cần tính lại dự toán |

Năm lượt đủ cho một chuỗi ngắn: chia sẻ tình huống → làm rõ cảm xúc → xem một góc nhìn → chọn hành động → phản hồi. Đây là **giả thuyết sản phẩm cần UAT**, chưa có dữ liệu retention chứng minh. Hai lượt dễ cắt ngang hội thoại; 10 lượt tạo thêm chi phí trước khi biết giá trị của chuỗi. Theo dõi tỷ lệ hết lượt, số chuỗi hoàn thành và người dùng quay lại trong pilot, rồi đề xuất thay đổi bằng một version chính sách mới.

Không tính lượt khi xem Today Pulse có sẵn, đọc lại, viết/xuất Journal hoặc xem hướng dẫn. Lỗi trước khi có kết quả hợp lệ không tiêu thụ lượt miễn phí; request id cũ trả lại cùng kết quả. Thông tin hỗ trợ khẩn cấp dạng tĩnh luôn truy cập được khi hết lượt. Chi phí provider đã phát sinh khi timeout/lỗi vẫn ghi nhận trong ngân sách; hoàn lượt cho khách hàng không xóa khoản chi đó.

## Dự toán có thể kiểm tra lại

Nguồn giá chính thức được kiểm ngày 01/10/2026: [OpenAI GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini) và [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing). Giá standard text, USD/1 triệu token: GPT-5.4 mini đầu vào **0,75**, đầu ra **4,50**; Claude Sonnet 4.6 đầu vào **3**, đầu ra **15**. Không giả định cache, batch discount hay giá mua qua nền tảng khác.

Repo hiện đặt Persona `openrouter/free` → Sonnet 4.6; Tarot Sonnet 4.6 → GPT-5.4 mini; Oracle router `nex-agi/nex-n2.5-mini:free`. Đây là **default trong source**, chưa đối chiếu route active trên môi trường mới. [OpenRouter FAQ](https://openrouter.ai/docs/faq) mô tả giới hạn riêng của model free và việc lựa chọn provider/privacy; do đó không dùng chữ “free” để kết luận chi phí, chất lượng hoặc khả năng phục vụ sẽ ổn định.

Giả định cho dự toán: 12 người dùng × (5 Chat/Oracle + 1 Tarot) = 72 kết quả/ngày; **2.000 token đầu vào tổng cộng mỗi lần gọi**, bao gồm system, lịch sử và nguồn truy xuất; đầu ra Chat tối đa 420 token, Tarot 650 token như default hiện hành. Trần đầu vào 2.000 token là điều kiện kỹ thuật **đề xuất chưa triển khai**, không phải độ dài lịch sử đang được backend bảo đảm. Oracle định tuyến miễn phí nếu có nằm ngoài số tiền trong bảng; handoff trả một câu trả lời được tính vào 60 lượt Chat. Council, astrology, daily generation và vòng agent bổ sung chưa nằm trong mẫu tính này, nhưng phải nằm trong trần ngân sách toàn QA khi được bật.

Công thức mỗi lần gọi: `(token_input × giá_input + token_output × giá_output) / 1.000.000`.

| Kịch bản | Chi phí một lần | Chi phí 12 người/ngày |
|---|---:|---:|
| 60 Chat phải dùng Sonnet dự phòng; 2.000 vào + 420 ra | 0,01230 USD | 0,73800 USD |
| 12 Tarot dùng Sonnet; 2.000 vào + 650 ra | 0,01575 USD | 0,18900 USD |
| Tổng hai dòng trên | — | **0,92700 USD** |
| Cả 12 Tarot còn phát sinh một lần GPT-5.4 mini dự phòng | 0,004425 USD bổ sung/lượt | **0,98010 USD tổng** |

Trong kịch bản cuối, 14 ngày khoảng **13,72 USD**. Dự phòng 2 lần chi phí đưa mức tham chiếu lên **27,44 USD**; trần 50 USD/đợt dành khoảng trống cho đánh giá, lỗi và tác vụ phụ. Đề xuất giữ riêng tối đa **10 USD trong 50 USD** cho các lượt đánh giá của đội triển khai; chúng vẫn chịu trần 5 USD/ngày và phải được ghi ledger. Đây là dự toán, không phải giới hạn tối đa có hiệu lực: lịch sử dài, nhiều vòng agent, các model khác, token reasoning, retry, tool, thuế và phí nạp tiền có thể làm chi phí khác đi. Trần 50 USD đề xuất quản lý chi phí inference; phí hạ tầng và phí thanh toán cần phê duyệt riêng nếu phát sinh.

Nếu tạm tính mọi Chat có thể tốn tiền thay vì kỳ vọng router free, quyết định về ngân sách sẽ ít phụ thuộc vào trạng thái miễn phí của bên ngoài. Không thay model chỉ vì rẻ hơn trước khi R21 đánh giá chất lượng VI/EN và an toàn.

## Cơ chế bắt buộc trước khi bật

1. Xác thực user thật; chặn anonymous theo policy beta, request quá lớn và feature không được phép trước provider. Giới hạn byte, system/history/retrieval và token phải áp dụng ở server; cắt lịch sử có thứ tự, giữ các ràng buộc an toàn.
2. Một transaction giữ chỗ quota người dùng và ngân sách toàn QA bằng request id, account, feature, policy/route version và server day. Dùng tiền dạng số nguyên nhỏ nhất; có check constraint, khóa/cập nhật nguyên tử, chống 2 thiết bị và 20 request đồng thời.
3. Giữ chỗ chi phí tối đa cho từng attempt và fallback được cho phép trước khi gọi. Không nhận route giá không biết hoặc auto-router không có trần giá. Chặn fallback nếu phần giữ chỗ không đủ. Lượt request lặp không gọi thêm provider.
4. Ghi usage thực tế và kết quả lưu thành công, rồi settle. Lỗi trả quota khách hàng theo trạng thái; chi phí không biết khi timeout giữ trạng thái cần đối soát, không tự hoàn thành 0 USD. Không tuyên bố exactly-once provider khi API ngoài không bảo đảm điều đó.
5. Admin hiển thị policy, ngày reset, used/reserved/remaining, model thực gọi và cảnh báo; từ chối cập nhật số âm hoặc trần thấp hơn used+reserved. Pause/cap không phụ thuộc mobile UI. Provider key riêng cho QA, kiểm tra giới hạn provider thực tế như lớp bảo vệ bổ sung.
6. Kiểm thử fake provider trước; tiếp đó test A/B, concurrency/replay, midnight, malformed/oversize, 429/timeout/5xx/fallback và process crash trên QA sạch đã được duyệt. Khi chạm cap, provider calls mới phải bằng 0; Journal và kết quả đã lưu vẫn dùng được.

[R10 đọc credit và đóng đường trừ credit thiếu an toàn](R10-credits-read-guard.vi.md); thêm [guard chung Tarot/Persona](R10-ai-request-guard.vi.md) với verified auth trước parse, 32 KiB body cap và deadline 5 giây đã kiểm local. [Nền tảng atomic reservation/settlement](../2026-10-02/R10-quota-reservation.vi.md) nay có 13 nhóm SQL PostgreSQL local và 15 Deno test pass, seed disabled. **Chưa wiring endpoints, enforce trần token hoặc global cost gate toàn đường chạy.** [R02](R02-clean-qa-inventory.vi.md) chưa full replay 25 migration và chưa có target mới được xác nhận. Không bật trả lời AI có phí chỉ từ việc chốt số trong tài liệu này.

## Quyết định đã ghi nhận và người triển khai

Đã ghi nhận đồng ý của chủ sản phẩm với **5 lượt Chat/Oracle dùng chung/ngày; 5 USD/ngày và 50 USD/14 ngày**, cùng giới hạn đầu vào và phạm vi QA nói trên. Không hỏi lại quota đã duyệt. Evaluation do backend xác thực quyền và chọn audience; không nhận từ client. Chiến dịch chưa active và không tự lấy ngày duyệt làm ngày bắt đầu.

Tiếp tục dùng các vai trò hiện có: `product_manager_agent` giữ policy/UAT; `workflow_orchestration_agent` triển khai transaction và provider boundary; `security_privacy_agent` review quyền, concurrency và fail-closed; `qa_review_agent` test độc lập. Không cần tạo Agent mới. Hồ sơ `mvp-R00-quota-board-2026-10-01.json` chỉ cho phép cập nhật tài liệu; mỗi lát cắt code/SQL sau đó phải có preflight riêng. Rollback chính sách là đóng gọi mới và giữ kết quả/ledger đã có, không khôi phục đường debit thiếu bảo vệ.
