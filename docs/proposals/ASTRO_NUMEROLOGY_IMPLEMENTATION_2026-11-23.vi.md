# Kế hoạch triển khai: Bầu trời hôm nay, Bản đồ số, Tôi là ai và nâng cấp UI/UX

> **Trạng thái:** soạn 23/11/2026, cập nhật 24/11/2026 (Owner chốt D1–D3). Lô 1 đã gộp `main`; Lô 2 (Bầu trời hôm nay) code xong 24/11, chờ Owner duyệt gộp; lô 3–6 chưa có mã. Đây là đặc tả chi tiết để chuyển sang Claude Code làm theo từng lô. Tóm tắt và tiến độ nằm ở [`PLAN.md`](../../PLAN.md) mục 7.
> **Thiết kế:** canvas <https://claude.ai/artifact/UyhXpoqEUT3RMFJzgPUJ8y> (hàng 9: Bầu trời hôm nay, Bản đồ số ×2, Tôi là ai; Chiêm tinh và Đăng nhập đã sửa theo quyết định bên dưới).
> **Căn cứ:** [rà soát từng màn hình](https://claude.ai/artifact/R3fnJ82TurGTSyhAHynv6t), [đề xuất Cung hoàng đạo và Thần số học](https://claude.ai/artifact/AM84QrqAEWitWuEuKunEhh), [báo cáo giá trị Tarot và Bản đồ sao](TAROT_ASTRO_VALUE_REPORT_2026-11-21.vi.md).
> **Dữ liệu thử:** [`data/numerology-golden-2026-11-23.json`](data/numerology-golden-2026-11-23.json) (bộ ca thử vàng cho Bản đồ số, đã chạy bằng script độc lập).

## 1. Quyết định của Owner (23/11/2026)

| # | Quyết định | Hệ quả khi làm |
|---|---|---|
| 1 | Đổi nhãn NÊN / NÊN TRÁNH | Thành **“Nghiêng về” / “Nhẹ tay với”** ở mọi nơi (Chiêm tinh, Bầu trời hôm nay, thẻ chia sẻ). Không dùng câu mệnh lệnh |
| 2 | Khách **không** thấy từ khóa ngắn của lá bài trước cổng đăng nhập | Giữ như thiết kế “Khách · Rút bài”: thấy hình và tên lá, ý nghĩa khóa |
| 3 | Ẩn nút Apple trên Android, ẩn nút Google trên iOS | Chọn nút theo `Platform.OS`; Android chỉ Google, iOS chỉ Apple |
| 4 | Ngưỡng “Nilaza đã ghi lại” là 5 mục nhật ký | Dưới 5 mục chỉ hiện gợi ý “Viết thêm vài mục…” |
| 5 | Tách “rút lá” khỏi “AI diễn giải” **trong đợt này** | Thay đổi backend, cần Owner duyệt riêng (mục 8, lô 5) |
| 6 | Dùng agent chuyên trách rà soát nội dung Thần số và Bầu trời hôm nay | Kết quả ở mục 3 và mục 4; còn việc cần Owner chốt ở mục 2 |
| 7 | Vẽ 3 màn mới vào canvas trước khi giao dev | ✅ đã vẽ (kèm màn “Nhập ngày sinh và tên”) |

## 2. Ba điều Owner đã chốt cho Bản đồ số (24/11/2026)

Báo cáo thẩm định phát hiện đặc tả cũ còn mơ hồ ở ba chỗ. **Owner đồng ý cả ba đề xuất ngày 24/11/2026** (cột giữa là quyết định). Lô 1 và lô 2 không phụ thuộc ba điều này.

| Mã | Câu hỏi | Quyết định (24/11) | Vì sao |
|---|---|---|---|
| D1 | Có giữ số bậc thầy **33** không? | Giữ **11 và 22**, bỏ 33 (33 → 6), áp dụng nhất quán mọi lớp | Khớp đặc tả cũ chỉ có 11/2 và 22/4; nguồn phổ biến vẫn giữ 33, bỏ 33 chấp nhận được nếu nhất quán |
| D2 | Khi tính số chủ đạo, có giữ 11/22 **bên trong** từng phần ngày, tháng, năm không? | **Có** (cách Decoz): rút từng phần, giữ 11/22, cộng lại rồi rút | Là cách được nguồn chính coi là đúng; cách cộng hết chữ số cho cùng số gốc, chỉ khác nhãn bậc thầy |
| D3 | Chữ Y là nguyên âm hay phụ âm trong tên tiếng Việt? | Y là nguyên âm **chỉ khi từ đó không có A, E, I, O, U khác** (Ý, Y, Vy, Thy, Kỳ, Mỹ, Lý); còn lại là phụ âm (Yến, Duy, Thúy, Quỳnh) | Quy tắc lập trình được, kiểm thử được; **không có nguồn riêng cho tiếng Việt**, đây là quy ước đề xuất |

Hệ quả cần biết: số chủ đạo gốc (1–9) **luôn giống nhau** giữa các cách tính; chỉ nhãn bậc thầy khác (2.994/22.280 ngày sinh, 13,4%). Vì vậy dòng “cách tính khác cho ra …” trong thiết kế cũ **đã bị bỏ**: màn Bản đồ số giờ ghi “11 giữ lại vì là số bậc thầy, số gốc đi kèm là 2 (11/2)”. Nếu hai trường phái ra nhãn bậc thầy khác nhau thì chỉ nói điều đó, không để người dùng tưởng ra hai tính cách khác nhau. Thay đổi này **đã được Owner xác nhận 24/11** (trước đó Owner từng duyệt “luôn hiện dòng cách tính khác”).

Bộ số chủ đạo hợp lệ là **1–9 cộng 11/2 và 22/4** (số 1 chiếm khoảng 11,1% người dùng, không được bỏ). Vì D1 bỏ 33 nên không có 33/6; nếu sau này Owner đổi ý thì thêm 33/6 và dùng bản ca thử giữ 33.

## 3. Bản đồ số: quy tắc tính (đã thẩm định)

Mọi tính toán chạy trên máy, chỉ dương lịch, không cần mạng. Tên khai sinh chỉ lưu trên máy.

**Đã kiểm chứng bằng script độc lập, 27 ca thử, 9 ca khớp ví dụ công khai** (nguồn: numerologist.com, worldnumerology.com, viettelstore.vn, astrosight.ai, dev.to). Ba điều trong mục 2 là quy ước, không phải sự thật có nguồn.

1. **Bảng chữ cái:** A=1 … I=9, J=1 … R=9, S=1 … Z=8 (Y=7, W=5).
2. **Chuẩn hóa tên (bẫy lập trình):** chuyển NFC; đổi `đ/Đ` thành `d/D` **trước** (chuẩn hóa Unicode không tách được đ); rồi bỏ dấu kết hợp; gạch nối đổi thành khoảng trắng (nếu không “Nguyễn-Thị” thành một âm tiết và quy tắc Y sai); bỏ chữ số và ký tự lạ; in hoa. Hai cách gõ dấu (“Thúy” / “Thuý”) và dạng NFD/NFC phải ra cùng một kết quả.
3. **Số chủ đạo:** theo D2. Hiển thị dạng `11/2`, `22/4`; số thường chỉ hiển thị một chữ số.
4. **Số ngày sinh:** ngày trong tháng, rút về gốc; ngày 11, 22, 29 gắn nhãn bậc thầy (29 → 11/2). Đây là quy ước, nguồn chỉ nói “ngày sinh”.
5. **Số từ tên:** cộng **cả họ tên một lần** (mọi từ, kể cả đệm). Số **biểu đạt** = mọi chữ; số **linh hồn** = nguyên âm; số **nhân cách** = phụ âm. Số biểu đạt không phụ thuộc quy tắc Y.
6. **Chu kỳ cá nhân:** năm cá nhân = ngày + tháng sinh + năm hiện tại, rút về một chữ số (không giữ bậc thầy); tháng cá nhân = năm cá nhân + tháng dương lịch; ngày cá nhân = tháng cá nhân + ngày dương lịch. **Năm cá nhân đổi vào 1/1**, không nhắc cách đổi theo sinh nhật. Ngày cá nhân để mức nhẹ hoặc bỏ (nguồn tự nhận ít giá trị).
7. **Đỉnh cao (pinnacle):** P1 = tháng + ngày; P2 = ngày + năm; P3 = P1 + P2; P4 = tháng + năm; mỗi cái rút gọn, giữ bậc thầy theo D1. Mốc tuổi tính từ số chủ đạo **gốc**: P1 từ 0 đến (36 − gốc), P2 và P3 mỗi giai đoạn 9 năm, P4 đến hết đời; tuổi bao gồm. Hiển thị là **khoảng tuổi gần đúng**, không phải ngày.
8. **Thử thách (challenge):** rút tháng, ngày, năm về **một chữ số** (11 → 2, 22 → 4); C1 = |tháng − ngày|, C2 = |ngày − năm|, C3 = |C1 − C2|, C4 = |tháng − năm|. Số 0 hợp lệ và hay gặp (29/02/2000 ra 0,0,0,0), nội dung phải có đoạn cho số 0, **không** dùng cách giải thích “kiếp trước”. Thử thách có thể để sau bản đầu.
9. **Biểu đồ ngày sinh 3×3:** hàng trên 3-6-9, giữa 2-5-8, dưới 1-4-7; chỉ dùng chữ số của DDMMYYYY, **bỏ số 0**, số lặp tính nhiều lần, **không** đưa số chủ đạo vào ô. Mũi tên “đủ” = cả 3 ô có số; “trống” = cả 3 ô không có. **Tên mũi tên không có chuẩn thống nhất** (nguồn tiếng Việt và nguồn khác nhau), gọi là nhãn gợi ý (1-2-3 “Kế hoạch”, 4-5-6 “Ý chí”, 7-8-9 “Hành động”, 1-4-7 “Thực tế”, 2-5-8 “Cân bằng cảm xúc”, 3-6-9 “Trí tuệ”, 1-5-9 “Quyết tâm”, 3-5-7 “Nhạy bén”). Chỉ viết đoạn riêng cho mũi tên **đủ** (8 đoạn); mũi tên trống hiển thị trung tính.
10. **Hợp số:** so số chủ đạo, số linh hồn, số biểu đạt, có thể thêm khung chẵn-lẻ (nguồn đơn). **Không điểm, không %, không “hợp/khắc”**, chỉ mô tả “điểm chung” và “còn căng”. Ngày sinh người kia chỉ để tính trên máy, **không lưu, không gửi đi**, và phải ghi trong Data safety của Google Play.
11. **Kiểm tra ngày hợp lệ:** từ chối 29/02 năm không nhuận (1900, 2001), 31/04, ngày 0; chấp nhận 29/02/2000 và 29/02/2004.

**Không đưa vào bản đầu:** số thái độ, số trưởng thành (nguồn đã mở không có công thức), số nợ nghiệp 13/14/16/19, biến thể psychomatrix (chưa kiểm chứng được nguồn).

### Bộ ca thử vàng

`docs/proposals/data/numerology-golden-2026-11-23.json` chứa hai bản: giữ 11/22/33 và chỉ 11/22. Sáu ca đổi khi bỏ 33: G10, G11, G12, G19, G23, G25. Theo D1 (bỏ 33), test tự động dùng bản `masters11_22_only`; bản giữ 33 chỉ để dự phòng nếu Owner đổi ý. Một số ca cần có trong test:

- **G01** 15/03/2000: số chủ đạo 11/2 ở mọi cách, số ngày sinh 6, đỉnh cao 9,8,8,5 (0–34, 35–43, 44–52, 53+), thử thách 3,4,1,1, ô 1,2,3,5, mũi tên đủ 1-2-3, trống 7-8-9.
- **G28** “Phạm Gia Linh” (tên trong mockup): biểu đạt 8, linh hồn 2, nhân cách 6. Chu kỳ ngày 23/11/2026: năm 1, tháng 3, ngày 8; 01/01/2027: năm 2, tháng 3, ngày 4.
- **G02, G04, G05** (29/02): hợp lệ; G05 đúng bậc thầy ở hai cách trong ba.
- **G03, G22, G27:** cùng kết quả với G02, G21, G01 dù khác dấu kiểu cũ, chữ thường và thừa dấu cách, dạng NFD.
- **G06, G07, G10, G15, G23:** kiểm quy tắc Y (Y một mình, Y cuối sau phụ âm, Kỳ nguyên âm và Duyên phụ âm).
- **G15** 01/01/2000: chỉ còn ô 1,1,2 (số 0 bỏ). **G17, G18, G19, G20, G21:** khớp ví dụ công khai của nguồn.
- **Ca phải bị từ chối:** 29/02/1900, 29/02/2001, 31/04/2000, ngày 0.

## 4. Nội dung: khối, quy trình duyệt, điều cấm

**Nguyên tắc đã duyệt:** máy tính, người viết, AI chỉ ghép; câu nào cũng nêu được nguồn dữ liệu; hai mặt; giọng “có thể/nghiêng về”, không mệnh lệnh, không dự đoán; không sức khỏe, tiền bạc, hôn nhân.

**Khối nội dung tối thiểu:** `id`, `lớp`, `số` (hoặc cặp số), `tiêu đề ngắn`, `nghiêng về` (2–3 câu), `mặt sáng` (1 câu), `mặt dễ vấp` (1 câu), 1 câu hỏi tự phản chiếu, `người duyệt`, `ngày duyệt`, `phiên bản`.

**Khối lượng ước tính Bản đồ số (khoảng 136 khối, 8.000–10.000 chữ):**

| Lớp | Nội dung | Khối |
|---|---|---|
| 1 Nhận diện | số chủ đạo 11, số ngày sinh 11, biểu đạt/linh hồn/nhân cách mỗi loại 11 (viết 9 khối gốc + 2 đoạn “sắc thái” cho 11 và 22) | 55 |
| 2 Biểu đồ | 9 chữ số (chỉ phần “có mặt”) + 8 mũi tên đủ | 17 |
| 3 Nhịp thời gian | năm 9, tháng 9, ngày 9 (rất ngắn hoặc bỏ), đỉnh cao 11 + 4 câu khung giai đoạn, thử thách 0–8 (9) | 51 |
| 4 Quan hệ | 9 khối “trong quan hệ, bạn thường…” + 3–4 mẫu cặp (cùng số, cùng chẵn-lẻ, khác nhau). Không làm ma trận 45 cặp | 13 |
| 5 AI | không viết khối mới; AI chọn và nối khối theo mã | 0 |

**Quy trình duyệt:** (1) người viết có chuyên môn soạn theo mẫu; (2) người duyệt thứ hai chạy danh sách kiểm: hai mặt, giọng nói, không chạm từ cấm, không xếp hạng số, đúng với **một số cụ thể**; (3) **phép thử “đổi số”**: thay số khác vào câu mà vẫn đúng với phần lớn mọi người thì bỏ hoặc viết lại; (4) **phép thử “thế hệ”**: người sinh 2000–2009 luôn có chữ số 2 trong biểu đồ, người sinh 1999 luôn có 1 và 9, nên đoạn “có số 2” không được viết như điều riêng của người dùng; (5) Owner duyệt cuối, khóa phiên bản, mỗi lần sửa duyệt lại, chạy lại bộ ca vàng trong CI. Hiện chưa có người duyệt chuyên môn là người thật: **việc này Owner phải chọn**.

**Từ và ý bị cấm trong nội dung:** tiền, giàu/nghèo, lương, đầu tư, hôn nhân, ly hôn, chia tay, mang thai, con cái, sức khỏe, bệnh, tuổi thọ, nghiệp, kiếp trước, số xấu/tốt, hợp/khắc, định mệnh, “sẽ” (chỉ dùng “có thể”, “thường nghiêng về”). Không chép câu nặng của các nguồn như “ranh giới giữa vinh quang và tự hủy hoại”. Gọi 11/22 là “sắc thái” của số 2/4, không phải “đặc biệt hơn”. Không viết “do Pythagoras phát minh”, viết “hệ chữ-số kiểu Pythagoras”. Đỉnh cao viết là “giai đoạn có thể nghiêng về…”, không “đến 35 tuổi bạn sẽ…”.

## 5. Quyền riêng tư và AI

- **Họ tên khai sinh** chỉ lưu trên máy; thẻ chia sẻ không có họ tên.
- **AI Premium (“Báo cáo tổng hợp”, “Lời nhắn riêng”, “Hai hệ cùng nhìn bạn”) chỉ nhận các con số đã tính và mã khối nội dung**, không nhận họ tên hay ngày sinh thô. Nếu không chặn thì mâu thuẫn với lời “họ tên chỉ lưu trên máy”.
- Có hộp xác nhận trước khi AI chạy (như hộp Tarot AI), nói rõ trừ Nil và gửi những gì.
- Ngày sinh người thứ hai là dữ liệu của người khác: không lưu, không gửi, ghi trong chính sách dữ liệu và Data safety.
- Mọi chỗ dùng AI cần `feature:preflight` và Owner duyệt riêng cho Edge Function, hạn mức, prompt (mục 8).

## 6. Bầu trời hôm nay: đặc tả

Đã thẩm định bằng cách chạy thật `packages/astrology-core/calculator.mjs` (astronomy-engine 2.1.19) rồi đối chiếu độc lập với JPL DE421 và Swiss Ephemeris. Các phép tính chạy trên máy, không cần mạng.

**Đã kiểm chứng (tính thật, nhiều nguồn):**
- Giờ Trăng chuyển cung: 63 lần chuyển cung, lệch tối đa 3,8 giây so với DE421 (trung vị 1 giây); khớp Cafe Astrology và Authority Astrology tới phút. Hiển thị làm tròn phút, ca thử cho phép ±1 phút.
- Trăng ở mỗi cung 1,97–2,54 ngày, nên **một ngày lịch có tối đa một lần chuyển cung**.
- Tính theo tâm Trái Đất (chuẩn chiêm tinh), không theo nơi đứng; ghi trong mục “Về cách tính”.
- Cung mọc trong repo khớp Swiss Ephemeris (400 mẫu, lệch tối đa 0,0001°).
- **Ngày theo UTC và ngày theo Việt Nam khác nhau:** tháng 12/2026 có 6/13 lần chuyển cung rơi vào ngày khác nhau. Không dùng lịch quốc tế làm đáp án khi chưa đổi múi giờ.
- Cung Mặt Trời không có “ngày cố định”: theo giờ Việt Nam, Bạch Dương vào ngày 20 hoặc 21, Song Ngư vào 18/2 hoặc 19/2; mỗi năm có 12 ngày ranh giới (khoảng 3,3% ngày sinh). Repo đã xử lý đúng qua `sampledRanges`.

**Lỗi nhất quán phải sửa trước (nghiêm trọng):** `apps/mobile/src/features/home/moonPhase.ts` tính pha trăng bằng chu kỳ trung bình, sai tới **14,9 giờ** ở Trăng mới, lệch tên pha ở 11/100 ngày, lệch phần trăm chiếu sáng tới 8,5 điểm so với engine. Màn mới dùng engine mà ô trên Hôm nay dùng bản trung bình thì hai màn mâu thuẫn. **Dùng một nguồn duy nhất là engine** cho cung Trăng, pha, phần trăm sáng.

### 6.1 Quy tắc hiển thị

1. **“Hôm nay”** là ngày lịch theo **múi giờ của thiết bị**, không phải UTC. Dùng giờ trưa theo đồng hồ treo tường (không cộng 12 giờ), vì ngày chuyển giờ mùa hè dài 23 giờ.
2. **Dòng đầu và dòng nguồn dùng “bây giờ”** (Trăng ở cung nào ngay lúc mở). Hôm nay còn chuyển cung thì thêm “Trăng chuyển sang X lúc HH:mm”; làm mới khi qua giờ chuyển cung. Nếu dòng đầu dùng “cung lúc trưa” thì sau giờ chuyển cung màn sẽ nói sai.
3. **Dải 7 ngày:** mỗi ô dùng cung lúc 12:00; ô “hôm nay” dùng “bây giờ”. Ô có chuyển cung hiện mũi tên và giờ (chạm để xem).
4. Phần trăm chiếu sáng lấy từ engine (`Illumination`), hiển thị số nguyên.
5. **Pha trăng:** bốn pha chính (mới, thượng huyền, tròn, hạ huyền) là **một khoảnh khắc**, gắn vào ngày có khoảnh khắc đó (“Trăng tròn lúc 21:54”); các ngày còn lại gọi trăng lưỡi liềm hoặc trăng gần tròn (tăng/giảm). Không chia 8 khoảng đều như hiện nay (gọi “Trăng tròn” suốt 3,7 ngày). Dùng “Trăng mới”, không dùng “Trăng non” (dễ hiểu là lưỡi liềm). **Không dán nhãn “rằm”/“mùng 1”**: tháng 11/2026 Trăng tròn rơi vào ngày 16 âm.
6. Hệ nhà là **nhà theo cung nguyên** (giữ như `calculateChart`), ghi tên hệ nhà trong phần giải thích. Nhà của Trăng đổi đúng lúc Trăng đổi cung nên khớp nội dung theo cung và dải 7 ngày. Placidus khác nhiều (nhà của Trăng khác nhà theo cung nguyên trung bình 52% thời gian), vì vậy không đổi hệ nhà trong đợt này.
7. **Rủi ro giờ sinh** (mô phỏng 4000 ca ở Hà Nội và TP.HCM): giờ sinh lệch ±15 phút đổi cung mọc ở khoảng 6% người; ±1 giờ (giờ Thìn) khoảng 25%. Cung Trăng lúc sinh gần như không đổi. Nhà theo giờ sinh vì vậy có thể sai với khoảng một phần tư người; nói rõ ở “Về cách tính”.
8. **Mặt Trăng nhìn ngược ở bán cầu Nam** (hình trăng `moonLitPath` vẽ cho bán cầu Bắc): mức thấp, ghi nhận.

### 6.2 Nội dung: mô hình, khối lượng, chống lặp

**Đổi nhãn.** “NÊN / NÊN TRÁNH” là mệnh lệnh nhị phân, gần giọng xem ngày tốt xấu. “Nghiêng về / Nhẹ tay với” mô tả khuynh hướng, để người dùng là người hành động. Mỗi ý viết như cụm danh từ hoặc cụm động từ nối được sau nhãn (“Nghiêng về: viết ra một cảm giác chưa có tên”).

**Cụm cần tránh:** hãy, đừng, phải, nên / không nên, “sẽ” chỉ sự kiện, chắc chắn, may mắn / xui, ngày xấu / tốt, hợp / kỵ, năng lượng xấu, vận, tránh ký hợp đồng / đầu tư, định mệnh, “Trăng khiến bạn…”. Dùng: có thể, gợi, hướng nghiêng, mặt còn lại. Quét tự động trong CI cả JSON và test.

**Khóa chọn nội dung (chống lặp).** Mô phỏng 360 cửa sổ 30 ngày:

| Khóa | Ngày lặp nguyên văn / 30 ngày | Ngày giống hôm qua / 30 ngày |
|---|---|---|
| Cung Trăng (12) | 18,0 | 16,3 |
| Cung Trăng × thập độ (36) | 1,9 | **0** |
| Cung Trăng × thập độ × pha (8) | 0,7 | 0 |

“Thập độ” là Trăng đang ở 0–10°, 10–20° hay 20–30° của cung. **Bắt buộc khóa (cung, thập độ) trở lên.** Phần lặp còn lại (≈ 2 ngày/30) do chu kỳ 27,3 ngày; luân phiên cột và câu hỏi theo pha để giảm.

**Cá nhân hóa theo Mặt Trời: ghép từ mảnh** (12×12×3 chủ đề×2 cột×2 ý = 1.728 ý, không khả thi):
- **Không có giờ sinh:** dùng **quan hệ giữa cung Trăng và cung Mặt Trời** (7 loại: cùng cung, 60°, 90°, 120°, 180°, 30°/150°), không dùng chữ “nhà”. **Dòng nguồn phải nêu đúng dữ liệu đã dùng:** “Từ: Trăng ở Kim Ngưu, hợp góc thuận (60°) với Mặt Trời của bạn (Song Ngư)”. Câu chỉ dựa vào loại quan hệ thì không được nói như dựa vào cung Mặt Trời cụ thể.
- **Có giờ sinh:** dùng 12 nhà (cung nguyên) từ `astrology-moon-houses.json` (sau khi sửa nhãn), nhãn “Theo lá số của bạn” thay “Ước theo cung Mặt Trời”, kèm một dòng giải thích một lần khi nội dung đổi.
- **Ngày ranh giới của Mặt Trời** (không biết giờ sinh): **nội dung chỉ theo Trăng**, hiện thông báo một lần có nêu giờ chuyển cung (“Bạn sinh đúng ngày Mặt Trời chuyển từ Bảo Bình sang Song Ngư, 19/2/2000 lúc 15:33 giờ Việt Nam. Thêm giờ sinh để biết chắc, hoặc chọn tạm cung bạn quen dùng.”); khi người dùng chọn thì dòng nguồn ghi “(bạn chọn)”. Mock có trạng thái này.

**Khối lượng tối thiểu (khoảng 190–250 đoạn ngắn, 3.500–4.500 từ):** nhịp theo cung × thập độ 36; ba chủ đề × 12 cung Trăng 36; cột “Nghiêng về / Nhẹ tay với” 12 cung × (4+4) = 96 cụm (tốt hơn 6+6 = 144), chọn 2 ý theo thập độ; câu hỏi nhật ký theo cung 12 (dự phòng 30 câu có sẵn); quan hệ Trăng–Mặt Trời 7; ghi chú pha chính 4; có giờ sinh: viết lại 12 đoạn nhà và 48 ý hai cột có sẵn.

**Cấu trúc JSON đề xuất** (`packages/content/data/astrology-daily-sky.json`): `version`, `status` (`draft|approved`), `reviewedBy`; `moonSign.<cung>` có `tone` (`early|mid|late` theo thập độ), `lean[]`, `ease[]` (mỗi mục có `id` và `vi`), `topics` (`love|work|self`), `journal`; `relation.<loại>`; `houseArea.<1–12>`; `phaseNote` (`new|full|…`); `templates.source` và `templates.ingress`. Mỗi mục gắn `sourceKeys` để dẫn dữ liệu nguồn; `validate:data` kiểm khóa, bản và từ cấm.

**Thống nhất nhãn chủ đề toàn app:** hiện có “Tình cảm / Tình yêu”, “Công việc / Sự nghiệp”. Chốt một bộ (đề xuất theo thiết kế: **Tình cảm / Công việc / Bản thân**) và sửa ở Lá bài hôm nay và `astrology-topic-placements.json` trong cùng lô.

### 6.3 Việc cần sửa trong repo khi làm lô 2

- `moonPhase.ts`: bỏ chu kỳ trung bình, dùng engine; đổi gợi ý bắt đầu bằng “Hợp để…” (giọng “ngày tốt để…”).
- `astrology-moon-houses.json`: nhãn “Nên thử / Nên tránh” → “Nghiêng về / Nhẹ tay với”; nhà 2 đang đặt “nhà tiền bạc và giá trị” → viết lại không nói tiền bạc.
- `sky.test.ts` đang khẳng định hai nhãn cũ: sửa cùng lúc.
- Rà thủ công “phải”, “sẽ” trong `topic-placements` (7 chỗ “phải”), `zodiac-guides` (6), `synastry` (3) trước khi tái dùng; chưa thấy “hôn nhân”, “sức khỏe”.

### 6.4 Chỉ để sau (không có trong bản đầu)

| Hạng mục | Lý do |
|---|---|
| Trăng mới / Trăng tròn kèm diễn giải theo cung | đợt đầu chỉ nhãn pha + giờ chính xác; 24 câu theo cung để sau |
| Sao Thủy nghịch hành | rủi ro cao (134 ngày trong 2026–27, ≈18% số ngày, dễ thành lời tiên tri tự ứng nghiệm); làm nhẹ sau, một dòng trung tính |
| Nhật / nguyệt thực | rủi ro cao và thường không thấy ở Việt Nam (nhật thực toàn phần 13/8/2026 không thấy); chỉ ghi chú thiên văn trung tính sau |
| Trăng “void of course” | định nghĩa không thống nhất; Trăng “void” khoảng 20% thời gian, có lúc gần 2 ngày “đừng bắt đầu gì”; **không** làm |
| Góc hợp hằng ngày của Trăng | chi phí nội dung rất cao (trung bình 1,13 góc chính xác/ngày với Mặt Trời–Sao Hỏa) |

### 6.5 Ca thử cho lập trình viên (đã chạy thật bằng engine của repo)

| # | Thời điểm (múi giờ) | Kỳ vọng |
|---|---|---|
| 1 | 23/11/2026 12:00 (UTC+7) | Trăng ở Kim Ngưu 11,4°, gần tròn 97%; Trăng tròn ngày mai 21:54 |
| 2 | 24/11/2026 12:00 (UTC+7) | Kim Ngưu 26,2°, 100%; ngày có chuyển cung 18:09 sang Song Tử và Trăng tròn 21:54 |
| 3 | 24/11/2026 18:08 và 18:10 | ranh giới Kim Ngưu → Song Tử, giờ chính xác 18:09:38 |
| 4 | 29/01/2027 00:20 và 00:22 (UTC+7) | **nửa đêm**: chuyển cung 00:21:15 (Thiên Bình → Bọ Cạp); ngày 28/1 Thiên Bình, ngày 29/1 cung lúc trưa là Bọ Cạp |
| 5 | 03/12/2026 02:59 và 03:05 (UTC+7) | UTC ghi 2/12, giờ Việt Nam là 3/12 (Xử Nữ → Thiên Bình) |
| 6 | 12/12/2026 23:00 và 23:10 (UTC+7) | chuyển cung 23:05:38 ngay trước nửa đêm (Ma Kết → Bảo Bình) |
| 7 | 31/12/2026 23:59:59 và 01/01/2027 00:00:00 (UTC+7) | qua năm: dải 7 ngày ra đúng ngày |
| 8 | 29/02/2024 10:00 và 10:15 (UTC+7) | **năm nhuận**, chuyển cung giữa ngày 10:09:10 (Thiên Bình → Bọ Cạp) |
| 9 | 29/02/2028 12:00 và 01/03/2028 04:40–04:43 (UTC+7) | năm nhuận: ngày 29/2 không chuyển cung; Kim Ngưu bắt đầu 01/03 04:41:44 giờ Việt Nam |
| 10 | 14/03/2027 12:00 (America/New_York) | ngày chuyển giờ mùa hè dài 23 giờ; Song Tử 10,6°, thượng huyền 39% |
| 11 | 24/11/2026 12:00 (Australia/Sydney) | cùng khoảnh khắc nhưng khác “ngày”; chuyển cung 22:09 cùng ngày |
| 12 | Trăng mới 06/02/2027 22:56 và Trăng tròn 24/11/2026 21:54 (UTC+7) | gắn đúng ngày; **không** dán nhãn “rằm” |
| 13 | Sinh 29/02/2000; 29/02/2001 | 2000 hợp lệ, Mặt Trời vào Song Ngư 19/02/2000 15:33 (UTC+7); 2001 phải báo lỗi |

**Chưa kiểm chứng (từ báo cáo thẩm định):** tên tiếng Việt chuẩn cho từng pha (chỉ mở được một trang công cụ); ngày Tết 2026–2028 trùng Trăng mới là đối chiếu theo trí nhớ, chưa mở lịch âm chính thức; thời gian tính một vị trí Trăng (~0,03 ms) đo trên Node, chưa đo trên điện thoại; số 52% của Placidus là mô phỏng 60 lá số; “nhà tính từ quan hệ cung” là lựa chọn thiết kế, không phải chuẩn chung.


## 7. Tôi là ai: đặc tả

- Thẻ nhận diện: tên gọi, ngày/giờ/nơi sinh (nếu có), chip ☉ ☽ ↑ và số chủ đạo `11/2`. Chip nào chưa có dữ liệu thì ẩn, không hiện số giả.
- “Bạn trong một câu”: **máy ghép từ các mẫu đã duyệt** (một nét từ Mặt Trời, một từ Mặt Trăng, một từ số chủ đạo), mỗi mệnh đề ghi rõ lấy từ đâu; AI không tự viết. Chỉ hiện khi đủ dữ liệu.
- “Nilaza đã ghi lại”: chỉ **con số đếm được** (mục nhật ký, lá đã rút, tuần liên tục), không nhận xét tính cách. Chỉ hiện khi có **từ 5 mục nhật ký**; dưới đó hiện gợi ý “Viết thêm vài mục…” (quyết định 4).
- Báo cáo đã lưu (lá số, bản đồ số, tướng mặt): Xem và Xóa, lưu trên máy.
- “Dữ liệu của tôi”: sửa ngày/giờ/nơi sinh và họ tên, xuất dữ liệu, xóa ngày sinh/họ tên/báo cáo (hỏi lại trước khi xóa). Ghi rõ dữ liệu ở trên máy; chỉ khi bấm dùng AI mới gửi phần con số hoặc vị trí sao, không kèm họ tên.
- “Hai hệ cùng nhìn bạn”: Premium, nhãn **“Sắp có”** trong closed test, chưa làm.
- Từ màn Hồ sơ: thẻ tên bấm vào mở “Tôi là ai”; dòng “Ngày sinh” đổi thành “Ngày sinh, tên & bản đồ”.

## 8. Lô triển khai

Mỗi lô: lập `docs/feature-plans/<tên>.json` rồi chạy `npm run feature:preflight` **trước khi sửa mã**; làm trên nhánh ngắn hạn cắt từ `origin/main` mới nhất; cuối lô cập nhật `PLAN.md`; báo cáo Owner bằng tiếng Việt (đã kiểm chứng / chưa kiểm chứng) và xin duyệt **một lần** cho commit → merge → push vào `main` (mỗi push lên `main` tự deploy Admin staging). Không làm lô sau khi lô trước chưa được duyệt.

| Lô | Nội dung | Đụng tới | Cổng Owner riêng |
|---|---|---|---|
| 0 | Hoàn tất canvas (✅); D1–D3 đã chốt 24/11 (✅); còn chọn người duyệt chuyên môn và viết nội dung mẫu cho 3 số để Owner đọc thử | tài liệu | chọn người duyệt |
| 1 | Thành phần chọn ngày sinh dùng chung (3 ô ngày/tháng/năm, báo lỗi theo từng ô, thay nhãn “Ngày sinh YYYY-MM-DD” ở `App.tsx` dòng 1259); dòng Hồ sơ mới (“Gói của bạn”, “Năng lượng hôm nay”); đổi nhãn bộ lọc Nhật ký; Đăng nhập chọn nút theo hệ điều hành | `App.tsx`, `features/profile`, `features/journal`, màn Đăng nhập | không |
| 2 | Bầu trời hôm nay (màn + thẻ trên Hôm nay + khối trên Khám phá v2); nhãn “Nghiêng về / Nhẹ tay với”; kho nội dung đã duyệt | `features/astrology`, `features/home`, `features/explore`, `packages/content/data`, `sky.ts` | không (chạy trên máy) |
| 3 | Bản đồ số lớp 1–2 (nhận diện, biểu đồ): module tính thuần (không phụ thuộc giao diện), test bộ ca vàng, màn nhập, màn kết quả, thẻ chia sẻ không có họ tên | mô-đun mới `features/numerology`, `packages/content` | người duyệt nội dung |
| 4 | Tôi là ai: thẻ nhận diện, “Nilaza đã ghi lại” (≥5 mục), báo cáo đã lưu, Dữ liệu của tôi | `features/profile`, kho lưu trên máy | không |
| 5 | Nhịp thời gian (năm/tháng/ngày cá nhân, đỉnh cao), Hợp số, AI “Lời nhắn riêng”/“Báo cáo tổng hợp” chỉ nhận số và mã khối; **tách “rút lá” khỏi “AI diễn giải”** (quyết định 5) | app + Edge Function + prompt + hạn mức | **duyệt riêng** từng việc: SQL/migration, deploy Edge Function, hạn mức, prompt |
| 6 | Viết lại phần lợi ích Premium cho khớp thực tế; nhãn “Sắp có” trong closed test | `PaywallPanel.tsx` | giá thật theo Play Console (chưa khớp: bản thiết kế dùng 799.000đ/năm, 99.000đ/tháng) |

**Tiêu chí nghiệm thu chung:** `npm run mobile:check` và `npm run validate:data` đạt; test Bản đồ số khớp 100% bộ ca vàng (hai bản D1); mọi màn chạy được khi **mất mạng** và khi **khách chưa đăng nhập** đúng chính sách; không có từ cấm trong kho nội dung (kiểm bằng test); chữ lớn 150–200% không vỡ bố cục; nút chạm ≥ 44px; **chưa kiểm** trên máy thật cho tới khi Owner thử APK.

**Việc cấm tự làm (cần Owner duyệt từng lần):** chạy SQL/migration, deploy Edge Function, đặt hoặc đọc bí mật, đổi cài đặt Supabase/Vercel/GitHub/EAS/Play, tạo hoặc xóa tài khoản, phát hành. Không nhập mật khẩu hay khóa thay Owner, không đọc `.env`.

## 9. Rủi ro và chưa kiểm chứng

- Mockup chưa kiểm bố cục và độ tương phản trên màn hình thật; mọi số, tên, ngày trong mockup là minh họa (số trong mockup Bản đồ số khớp bộ ca vàng G01 và G28).
- Quy tắc Y cho tiếng Việt, cách bỏ 33, tên mũi tên, khung chẵn-lẻ cho hợp số, và “đa số đổi năm cá nhân vào 1/1” là **quy ước hoặc nguồn đơn**, chưa có nguồn riêng.
- Chưa có người duyệt chuyên môn là người thật; nội dung do AI soạn phải qua người duyệt trước khi phát hành.
- Chưa có ca thử cho biên “đổi năm cá nhân vào sinh nhật” (cách thiểu số, khác trong khoảng hai tháng rưỡi đầu năm); thêm nếu Owner đổi ý.
- Chưa đo chi phí AI cho lớp 5; chưa có chính sách giá bán lẻ báo cáo (đã quyết chưa bán lẻ ở v1).
