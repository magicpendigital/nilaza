# Đề xuất: nhiều nhà cung cấp LLM và cơ chế dự phòng (fallback) cho Nilaza

Ngày 03/11/2026. Căn cứ: mã `main` tại `033fb86` và tìm hiểu tài liệu chính thức/công khai (nguồn ở cuối). **Đề xuất, chưa sửa mã.** Mọi bước có đặt khóa, chạy SQL hay deploy đều cần Owner duyệt riêng.

## 1. Hiện trạng (đã kiểm trong mã)

- Mỗi tính năng có **1 model chính + 1 model dự phòng**, mặc định đều qua OpenRouter: `deepseek/deepseek-v4.1-flash` → `xiaomi/mimo-v2.6-flash`, tối đa 2.000 token (`_shared/model-router.ts:32`).
- Mã **đã có sẵn** adapter cho OpenAI, Gemini, Anthropic (`_shared/providers/*.ts`) và tên khóa `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`; theo quyết định 01/11 Admin chỉ hiện OpenRouter.
- Mỗi model thử **đúng 1 lần**, không thử lại; thời gian chờ 40 s (Chiêm tinh 60 s) tính cho cả câu trả lời. Hết 2 lần → app hiện câu dự phòng soạn sẵn ("AI chưa kết nối được").
- Lỗi mạng và hết giờ đều bị gọi chung là `provider_timeout`; OpenRouter vứt nội dung lỗi nên khó chẩn đoán.
- **Kiểm định dạng đầu ra (Tarot, Chiêm tinh) chạy sau bộ định tuyến**, nên khi model chính trả sai định dạng thì **không** thử model dự phòng mà rơi thẳng về câu soạn sẵn — đây là nguyên nhân chính của các lỗi QA 02–03/11.
- Cờ riêng tư `zdr:true`, `data_collection:"deny"` **chỉ** gắn cho Chiêm tinh; Chat persona, Tarot, Daily, Council gửi nội dung nhạy cảm (nhật ký, giờ sinh) mà không có cờ này.
- Adapter Gemini đặt khóa API trong URL (`gemini.ts:27`) — dễ lọt vào log; nên chuyển sang header.

## 2. Tham khảo các cách làm

| Cách | Điểm hay nên học | Không hợp với Nilaza |
|---|---|---|
| **9Router** | "Combo": danh sách model xếp thứ tự (rẻ/đăng ký trước → dự phòng sau), tự chuyển khi hết hạn mức hay lỗi; dịch định dạng giữa các API | Xoay vòng nhiều tài khoản và dùng gói đăng ký cá nhân cho app công khai dễ vi phạm điều khoản nhà cung cấp; không có kiểm soát quyền riêng tư |
| **LiteLLM Router** | Phân loại lỗi rõ: dự phòng khi quá ngữ cảnh, khi bị chặn nội dung; "cooldown" model hay lỗi | Viết bằng Python, phải chạy thêm một máy chủ |
| **Portkey** | Cấu hình dự phòng theo mã lỗi, thời gian chờ từng bước | Thêm một bên xử lý dữ liệu |
| **OpenRouter `models[]` + `provider`** | Một yêu cầu tự thử nhiều model/nhà cung cấp; có `zdr`, `data_collection: deny` | Vẫn là một điểm hỏng duy nhất; mặc định cũng dự phòng khi bị chặn nội dung (cần danh sách cho phép) |

## 3. Phương án đề xuất: bộ định tuyến riêng trong Edge Function

Giữ bộ định tuyến hiện có (đã có trace, hạn mức, an toàn), nâng cấp thành **chuỗi nhiều bước** cấu hình trong Admin:

1. **Adapter**: một adapter "tương thích OpenAI" dùng chung cho OpenAI, DeepSeek, Gemini (endpoint `/v1beta/openai/`), Groq, xAI, Mistral — chỉ khác địa chỉ và khóa; adapter riêng cho Anthropic (API Messages gốc, vì lớp tương thích OpenAI của Anthropic bỏ qua `response_format`). OpenRouter giữ adapter hiện có.
2. **Cấu hình** (bảng mới, publish qua Admin): danh sách nhà cung cấp (bật/tắt, **tên** biến bí mật — giá trị chỉ ở Supabase Secrets —, loại dữ liệu được phép gửi: công khai / cá nhân / nhạy cảm); mỗi tính năng một **chuỗi có thứ tự** tối đa 3–4 bước `{nhà cung cấp, model, thời gian chờ, max token, temperature, chế độ JSON}` + tổng thời gian tối đa (≤ 140 s, dưới giới hạn 150 s của Edge).
3. **Phân loại lỗi** — quyết định có chuyển bước hay không:

| Loại | Ví dụ | Xử lý |
|---|---|---|
| Tạm thời | 5xx, rớt mạng, hết giờ | Chuyển bước tiếp; tính vào "cầu dao" |
| Hết lượt/tiền | 429, 402 | Chuyển bước; khóa model đó theo `retry-after` |
| Sai cấu hình | 401/403, sai tên model | Chuyển bước; báo Admin; khóa lâu |
| Quá dài ngữ cảnh | 400 context | Chỉ chuyển nếu bước sau có ngữ cảnh lớn hơn |
| Sai định dạng | trả rỗng, bị cắt, JSON/cấu trúc sai | **Chuyển bước 1 lần** — đưa bước kiểm định dạng vào trong bộ định tuyến |
| **Bị chặn vì an toàn** | nhà cung cấp từ chối, bộ lọc khủng hoảng của Nilaza | **Không chuyển** sang model khác — trả lời an toàn/khủng hoảng soạn sẵn |

4. **"Cầu dao" (circuit breaker)** lưu trong Postgres (vì Edge Function chạy nhiều bản song song, ngắn hạn): model lỗi liên tiếp N lần thì tạm bỏ qua 30–120 s, sau đó cho 1 yêu cầu thử. Mỗi bản cache trạng thái ~15 s để không chậm.
5. **Không gửi song song 2 model cùng lúc** (tốn gấp đôi, phá hạn mức 1 lượt). Thử lại cùng model tối đa 1 lần chỉ khi lỗi tạm thời và còn thời gian/ngân sách. Bước dự phòng nên **rẻ bằng hoặc rẻ hơn** bước chính trừ khi Owner cho phép.
6. **Ngân sách**: trước mỗi bước kiểm thời gian còn lại và chi phí tối đa của bước so với ngưỡng trong `ai-usage-policy.json`; số lần thử tối đa hiện là 2 — muốn chuỗi 3 bước cần Owner nâng lên 3.
7. **Trace**: thêm vị trí bước, loại lỗi, mã HTTP, thời gian chờ token đầu, trạng thái cầu dao, lý do bỏ qua bước, chi phí; kết quả cuối `ok / ok_dự_phòng / câu_soạn_sẵn / chặn_an_toàn`.
8. **Admin**: thẻ nhà cung cấp (đã cấu hình hay chưa, nút "Kiểm tra khóa" do Owner bấm, tỉ lệ lỗi 24h, độ trễ p95, trạng thái cầu dao); trình sửa chuỗi theo tính năng (kéo thả thứ tự), chặn chọn nhà cung cấp không được phép nhận loại dữ liệu của tính năng.

## 4. Rủi ro quyền riêng tư theo nhà cung cấp (Owner cần xác minh trên trang chính thức)

| Nhà cung cấp | Ghi nhận (một phần từ nguồn thứ cấp) | Đề xuất |
|---|---|---|
| OpenRouter | Có cờ `zdr`, `data_collection: deny` theo yêu cầu | Bật cho **mọi** tính năng; kiểm trước model DeepSeek/Xiaomi có endpoint ZDR không (nếu không, bật cờ sẽ làm mọi yêu cầu thất bại) |
| OpenAI API | Không dùng để huấn luyện; log lạm dụng tối đa 30 ngày | Được dùng cho dữ liệu cá nhân |
| Anthropic API | Không huấn luyện theo điều khoản thương mại; xóa trong 30 ngày | Được dùng cho dữ liệu cá nhân |
| Gemini (AI Studio) | **Gói miễn phí dùng dữ liệu để cải thiện**; gói trả phí thì không, log tối đa 55 ngày | Chỉ dùng khóa của project đã bật thanh toán |
| DeepSeek trực tiếp | Lưu trữ tại Trung Quốc; chưa rõ có dùng để huấn luyện | **Không** gửi nhật ký/giờ sinh qua API trực tiếp; dùng DeepSeek qua OpenRouter có ZDR |

Chính sách riêng tư và mục Data safety trên Google Play phải liệt kê mọi nhà cung cấp nhận dữ liệu.

## 5. Lộ trình

| Giai đoạn | Nội dung | Cần Owner |
|---|---|---|
| **0 — chỉ OpenRouter** (lợi nhiều, rủi ro thấp) | Gửi `models:[chính, dự phòng]` + `provider:{zdr, data_collection:"deny"}` cho mọi tính năng; giữ nội dung lỗi; tách lỗi mạng/hết giờ; đưa kiểm định dạng vào bộ định tuyến để sai định dạng thì thử model dự phòng; chuyển khóa Gemini sang header | Duyệt deploy Edge Function; xác nhận ZDR cho model đang dùng |
| 1 | Chuỗi tối đa 3 bước + phân loại lỗi + cầu dao Postgres + trace mới (vẫn chỉ OpenRouter) | SQL + deploy; nâng số lần thử lên 3 |
| 2 | Thêm **một** nhà cung cấp trực tiếp làm bước cuối khi OpenRouter sập (đề xuất OpenAI hoặc Gemini trả phí); nút Kiểm tra khóa | Owner tạo tài khoản, đặt khóa vào Supabase Secrets |
| 3 | Anthropic, Groq, xAI, Mistral, DeepSeek trực tiếp (chỉ dữ liệu công khai); streaming với giới hạn chờ token đầu ~10 s; bảng sức khỏe trong Admin | Từng khóa, từng deploy |

## 6. Quyết định cần Owner

1. Đồng ý bắt đầu **Giai đoạn 0** (chỉ OpenRouter, không thêm khóa mới)?
2. Nhà cung cấp trực tiếp đầu tiên cho Giai đoạn 2: OpenAI, Gemini (trả phí) hay Anthropic?
3. Cho phép bước dự phòng **đắt hơn** bước chính không, và trần chi phí mỗi lượt?

## Nguồn

9Router <https://github.com/decolua/9router> · LiteLLM <https://docs.litellm.ai/docs/proxy/reliability> · Portkey <https://portkey.ai/docs/product/ai-gateway/request-timeouts> · OpenRouter <https://openrouter.ai/docs/guides/routing/model-fallbacks>, <https://openrouter.ai/docs/features/provider-routing> · Gemini OpenAI-compatible <https://ai.google.dev/gemini-api/docs/openai>, log <https://ai.google.dev/gemini-api/docs/logs-policy> · Anthropic OpenAI SDK <https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk> · DeepSeek <https://api-docs.deepseek.com/quick_start/rate_limit> · OpenAI dữ liệu <https://developers.openai.com/api/docs/guides/your-data>. Chưa kiểm chứng: ZDR theo từng model trong `models[]` của OpenRouter; DeepSeek có huấn luyện từ API không; mức hỗ trợ `response_format` của endpoint Gemini tương thích OpenAI.
