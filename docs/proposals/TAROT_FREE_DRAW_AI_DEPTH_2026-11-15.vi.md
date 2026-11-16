# Tarot: rút bài miễn phí, AI phân tích trả phí — phân tích và đề xuất (bản 2, 16/11/2026)

> **Loại tài liệu:** đề xuất, **chưa sửa app**. Viết cho Owner; chi tiết kỹ thuật ở mục 9.
> **Bản 2 (16/11):** viết lại sau khi đọc dữ liệu mới trên `origin/main` (`eca5669`): [chiến lược Nil](../NIL_PRICING_STRATEGY_2026-11-15.vi.md) và Nil P0+P1 (PR #48, [bàn giao khóa Tarot](../release/nil-p1-tarot-lock-2026-11-15/HANDOFF.vi.md)). Bản 1 (15/11) giả định **sai** rằng quy luật "cùng một câu hỏi" và đơn vị Nil chưa có trong repo; mục 8 liệt kê những gì đã sửa.
> **Căn cứ:** đọc mã trên `origin/main`. **Chưa chạy app, chưa truy vấn Singapore, chưa thử trên máy thật.** Mỗi phát hiện ghi *đã kiểm chứng trong mã* hoặc *suy luận*.
> **Hình dung bằng thiết kế:** canvas Artifact "Nilaza — Thiết kế lại Tarot & Astrology", hàng **6 (Tarot v2)** và hàng **7 (Hội đồng, Chiêm tinh)**.

---

## 1. Tóm tắt

1. **Quy luật và Nil đã có trong repo, nên thiết kế giữ nguyên chúng:**
   - **Khóa Tarot (Owner chốt 15/11):** một trải bài được khóa theo *tài khoản + kiểu trải + chủ đề + ngày giờ Việt Nam*. Rút lại cùng kiểu trải và chủ đề trong ngày thì thấy đúng các lá và lời diễn giải cũ, **0 Nil, không gọi AI**. Chủ đề khác là trải bài mới. Có **1 lá làm rõ** mỗi trải bài. **Không bán rút lại.**
   - **Nil (Owner chốt 15/11):** năng lượng cấp theo gói, **không bán lẻ ở v1**. Người dùng thấy **thanh năng lượng** và mức **nhẹ / vừa / sâu**, **không có bảng giá, không có số Nil cụ thể**. Ví Nil thật (P2) và Admin Nil Studio (P3) **chưa được duyệt**; bản hiện tại thực thi bằng hạn mức lượt AI mỗi ngày.
2. **Lỗi gốc còn trên `main`:** máy chủ đã rút lá và diễn giải bằng **hai hành động riêng** (`draw`, `interpret`), nhưng app gọi cả hai trong một lần bấm, và **số trải bài tối đa mỗi ngày = min(3, hạn mức AI giao đạt)**. Gói Free có 1 lượt AI nên chỉ được **1 trải bài mỗi ngày**: hết lượt AI là hết luôn việc rút, kể cả bộ miễn phí (`handler.ts:78–87`). Rút lá không tốn model, nên chi phí không phải lý do để chặn.
3. **Đề xuất:** giữ nguyên khóa, tách hai lớp.
   - **Lớp miễn phí (0 Nil):** hỏi → chọn bộ bài → nghi thức → lá do máy chủ rút (khóa theo ngày) → **bài đọc Nilaza soạn sẵn** hiện ngay.
   - **Lớp AI:** nút "Phân tích chuyên sâu" ở cuối kết quả = hành động `interpret` đã có. Bấm, xác nhận mới gọi AI. Chỉ tính năng lượng khi bài đạt; lỗi thì không mất và thử lại được.
   - **Thay đổi nhỏ nhất ở máy chủ:** trần số trải bài mỗi ngày không còn bị kẹp bởi hạn mức AI (giữ trần mềm 3). Cần Owner xác nhận (mục 8, Q1).
4. **Muốn người dùng bấm nút AI thì lớp miễn phí phải hay.** Bản soạn sẵn hiện rất mỏng (mục 3). Cần **kho diễn giải ghép 5 lớp**, khoảng **800 đơn vị** nội dung.
5. **Nghi thức rút bài** (thở → xào → chọn → lá phóng to giữa màn hình → chạm để mở, có viền sáng, bụi sao, âm thanh) vẫn làm được với lá do máy chủ rút: lá được cấp khi bắt đầu, nghi thức là cách lật ra, và app nói rõ lá do hệ thống rút ngẫu nhiên (đúng nguyên tắc "trung thực về ngẫu nhiên" của chiến lược Nil).
6. **Kiểu trải bài:** 5 kiểu hiện có hợp lý, không trùng, không phi thực tế. Nên thêm 3 kiểu; mỗi kiểu có **cách đọc khác nhau** mà prompt hiện chưa nói, cần đưa vào ngữ cảnh cho LLM.

---

## 2. Hiện trạng trên `main` (đã kiểm chứng trong mã)

**Đã có sau Nil P1-A (đã vào `main`, chưa áp SQL, chưa deploy):** máy chủ rút lá bằng CSPRNG; khóa `(tài khoản, kiểu trải, chủ đề, ngày UTC+7)` với phát lại không gọi model; lời diễn giải bất biến; lá làm rõ; lá hôm nay seed theo tài khoản + ngày; khách vẫn rút lá trên máy; client không ghi trực tiếp `tarot_readings`.

| # | Phát hiện | Bằng chứng |
|---|---|---|
| C1 | Trần số trải bài/ngày bị **kẹp bởi hạn mức AI**: `drawCap = min(dailySpreadSoftCap=3, delivered)`. Free `delivered = 1` ⇒ 1 trải bài/ngày; trải thứ hai nhận `429 daily_limit_reached` dù không tốn model. | `supabase/functions/ai-tarot-reading/handler.ts:78–87, 138–140`; `_shared/daily-attempts.ts:21` |
| C2 | Server đã tách `draw` và `interpret`, nhưng app vẫn nối chúng trong một lần bấm: `requestServerTarotDraw` rồi `drawCards`→`generateTarotReading`. Người dùng không có bước "xem bài đọc miễn phí trước". | `apps/mobile/App.tsx:5266–5290, 5330–5345`; `src/backendClient.ts:698–728` |
| C3 | Chế độ khách/ngoại tuyến vẫn dùng số "lượt còn lại" = giới hạn − số lần ghi `tarot_reading_drawn`, và chặn **trước lá đầu tiên** (kể cả bộ miễn phí). | `App.tsx:7506, 7523, 5338`; `src/features/…` đếm ở `App.tsx:3167–3171` |
| C4 | Kiểm bậc bộ bài **chỉ ở client** (`canViewContentTier`); máy chủ nhận mã bộ mà không kiểm bậc. Cần thêm khi bán Premium. | `src/features/owner/tierPreview.ts:27`; `ai-tarot-reading/*.ts` không có `accessTier` |
| C5 | Bản soạn sẵn mỏng (mục 3); lá làm rõ đã có nghĩa từ thư viện (không AI) — dùng lại làm "van xả". | `App.tsx` `buildLocalTarotInterpretation`; HANDOFF P1-A |
| C6 | Nhãn vị trí app và máy chủ lệch ("Lời nhắc"/"Gợi mở"; en "Future"/"Potential"). | `App.tsx` `spreads`, `_shared/tarot-prompt.ts:77–86` |
| C7 | Chưa có ví Nil, bảng giá theo tính năng, thanh năng lượng (P2–P4 chưa duyệt). Hiện chỉ có hạn mức lượt/ngày, và `PaywallPanel.test.tsx` còn cấm chữ "Nil" trong màn mua. | `docs/NIL_PRICING_STRATEGY_2026-11-15.vi.md` mục 0, 12, 13 |

**Rủi ro đã ghi trong bàn giao P1-A:** gói Free chỉ có tác dụng "khác chủ đề thì rút mới" khi Admin nâng hạn mức AI — đây chính là C1.

## 3. Bản soạn sẵn hiện tại mỏng thế nào

- `buildLocalTarotInterpretation` chỉ ghép: câu hỏi + tên kiểu trải + **tên các lá** + một câu chung + câu hỏi suy ngẫm của **lá đầu tiên**. Không có nội dung theo lá, vị trí hay chủ đề. (`App.tsx:2448–2478`)
- Mỗi lá chỉ có nghĩa chung xuôi/ngược, **giống nhau ở mọi vị trí và mọi câu hỏi**; màn kết quả còn ghi thẳng "Nghĩa chung của lá · chưa có diễn giải riêng cho câu hỏi này". (`TarotResultView.tsx:107–110`)
- Có sẵn để dùng lại: 78 lá × (giới thiệu, chân dung, nghĩa xuôi, nghĩa ngược, câu hỏi) ≈ 520 ký tự/lá; **hướng dẫn lá theo 3 chủ đề** (tình yêu, công việc, bản thân — chỉ nghĩa *xuôi*), hiểu lầm thường gặp, nguyên tố, chiêm tinh (`packages/content/data/tarot-card-guide.json`); 8 bộ bài, 4 miễn phí (Moon Garden, Rose Mirror, Classic Arcana, Tinh Quang) và 4 Premium.
- **Chưa có:** nghĩa ngược theo chủ đề; chủ đề "Quyết định"; giọng theo **vị trí**; cách các lá **tác động qua lại**; hướng dẫn **cách đọc theo kiểu trải**.

---

## 4. Luồng đề xuất

```
Hỏi → Chọn bộ bài → Nghi thức → [máy chủ rút lá, khóa theo ngày] → Bài đọc Nilaza (miễn phí)
                                                        └─ [Phân tích chuyên sâu] → xác nhận → interpret → tính năng lượng khi bài đạt
```

### 4.1 Ai làm được gì

| Hành động | Khách | Free đã đăng nhập | Premium |
|---|---|---|---|
| Xem thư viện, học từng lá | ✓ | ✓ | ✓ |
| Rút bài bộ **miễn phí** (0 năng lượng) | ✓ rút trên máy, không khóa | ✓ máy chủ rút, khóa theo ngày, tối đa 3 trải/ngày (Q1) | ✓ |
| Xem bộ Premium (tranh, câu chuyện) | ✓ | ✓ | ✓ |
| Rút bài bộ **Premium** | ✗ | ✗ khi đã bán Premium | ✓ |
| Rút lại cùng kiểu trải + chủ đề trong ngày | thấy lại đúng bài (đăng nhập) | thấy lại đúng bài, 0 năng lượng | như Free |
| Bài đọc Nilaza soạn sẵn, lá làm rõ (1 lá) | ✓ / không có lá làm rõ | ✓ | ✓ |
| Phân tích chuyên sâu AI, Hỏi tiếp | cần đăng nhập | theo hạn mức gói | theo hạn mức gói |

*Closed test:* mọi tài khoản đăng nhập là Premium (`all_premium`); khóa bộ Premium chỉ hiện khi `premiumOnSale = true`, trước đó bộ Premium ghi "Sắp có".

### 4.2 Quy tắc năng lượng (đúng quyết định Owner 15/11)
- **Chỉ "Phân tích chuyên sâu" mới tốn năng lượng.** Rút bài, xem lại bài đã khóa, đọc bài Nilaza, lá làm rõ, lưu: miễn phí.
- **Hiển thị:** chip mức **Sâu** và thanh năng lượng tại điểm dùng; cảnh báo 50% / 20% / 0% và ngày nhả tiếp theo. **Không in số Nil.** Thiết kế bản 1 có chữ "1 Nil" và "Còn 1 Nil hôm nay" — đã bỏ.
- **Tính khi bài đạt**; lỗi, hết giờ, bị chặn an toàn thì không tính, giữ bài, cho thử lại (tối đa 3 lần/ngày như P1-A).
- **Mở lại bài đã phân tích: miễn phí** (diễn giải bất biến, phát lại không gọi model).
- **Hết năng lượng:** nút AI nói rõ khi nào nhả tiếp; mọi thứ miễn phí vẫn dùng. Chưa bán Premium thì không có nút Premium.
- **Trước khi có ví (P2):** "năng lượng" hiển thị dựa trên hạn mức lượt AI/ngày hiện có; giao diện dựng sẵn để đổi nguồn số liệu sang ví khi P2 được duyệt.
- **Khách bấm nút AI:** giữ nguyên bài đọc, đăng nhập xong quay lại đúng chỗ.

### 4.3 Cho AI giá trị gì mà bản miễn phí không có
| Bản miễn phí (Nilaza soạn sẵn) | Phân tích chuyên sâu (AI) |
|---|---|
| Nghĩa từng lá đúng chủ đề, đúng vị trí | Đọc **chính câu chữ của bạn**, trả lời thẳng câu hỏi |
| Các lá tác động qua lại (theo quy tắc) | Một câu chuyện liền mạch nối các lá với tình huống của bạn |
| Một bước nhỏ + một câu hỏi viết | 2–3 hướng cân nhắc, một thử nghiệm cụ thể trong tuần |
| Giống nhau với mọi người rút cùng bộ lá | Giọng người dẫn, **Hỏi tiếp**, lưu vào dòng thời gian Nhật ký |

Ranh giới an toàn không đổi: không khẳng định tương lai, không nói người khác nghĩ gì, không chẩn đoán.

## 5. Kho diễn giải (ghép lớp)

**Vì sao ghép:** viết từng ô `78 lá × 2 chiều × 14 vị trí × 4 chủ đề` là **8.736 đoạn** chưa kể tổ hợp; không ai viết và duyệt nổi. Ghép lớp cho cùng chất lượng với ~800 đơn vị.

| Lớp | Nội dung | Số đơn vị | Hiện có |
|---|---|---|---|
| L1 Lá × chủ đề × chiều | nghĩa một lá cho Tình yêu / Công việc / Bản thân / Quyết định, xuôi và ngược | 624 (có 234 xuôi ×3 chủ đề) → **thiếu ~390** | một phần |
| L2 Giọng theo vị trí | "Ở vị trí *Người ấy*…", theo loại vị trí (quá khứ, thử thách, lời nhắc, bản thân, người kia, mối quan hệ, lựa chọn, bước tiếp…) × chủ đề × chiều | ~100 | chưa |
| L3 Tổ hợp | luật theo nguyên tố (15 cặp hài hòa/căng), số Ẩn chính, tỷ lệ lá ngược, số lặp, lá Cung đình liền nhau, một bộ chiếm đa số, cộng ~100 cặp chọn lọc | ~150 | chưa |
| L4 Hướng dẫn đọc theo kiểu trải | cách đọc, khung tóm tắt mở/kết theo chủ đề | ~40 | chưa |
| L5 Bước nhỏ và câu hỏi viết | theo chủ đề × kiểu trải × chủ đề nổi bật | ~120 | một phần (câu hỏi của lá) |

**Cách làm:** viết bằng tiếng Việt gốc, AI hỗ trợ soạn nháp, qua skill `nilaza-tarot-content-qc` và `docs/CONTENT_SAFETY_STYLE_GUIDE.md`, Owner duyệt mẫu từng lớp; xuất bản qua luồng nội dung Admin đã có (A3/A6, `readPublishedTarotContent`) để sửa không cần phát hành app. Bản gốc cũng đóng gói trong app để chạy ngoại tuyến. Dung lượng ước tính ≈ 250 KB tiếng Việt (chưa tính tiếng Anh).
**Một nguồn sự thật:** cùng bộ "dữ kiện tổ hợp" do máy tính ra (số Ẩn chính, nguyên tố, cặp…) vừa dựng bài đọc miễn phí vừa gửi cho AI — AI không phải tự đếm.

---

## 6. Nghi thức rút bài

**Các giai đoạn (một máy trạng thái):** `chuẩn bị → xào → chọn → phóng to → chạm mở → lộ diện → lá tiếp / gom bài → bài đọc`.

| Giai đoạn | Người dùng thấy | Hiệu ứng |
|---|---|---|
| Chuẩn bị | câu hỏi hiện rõ; "Hít vào 4 · giữ 2 · thở ra 6"; nút "Tôi sẵn sàng" và "Bỏ qua nghi thức" | vòng thở co giãn; rung rất nhẹ theo nhịp |
| Xào | giữ ngón tay lên bộ bài khoảng 3 giây (hoặc chạm "Xào giúp tôi") | các lá xáo; âm giấy |
| Chọn | quạt bài úp, vuốt để xoay, chạm một lá. Lá thật do máy chủ rút ngẫu nhiên khi bắt đầu; chạm chọn là nghi thức và app nói rõ điều này | lá được chọn nhấc lên |
| Phóng to | lá úp ở **giữa màn hình**, nền tối dần, mọi nút khác ẩn; "Hít một hơi. Nhắm mắt nếu bạn muốn. Chạm vào lá bài khi sẵn sàng." | quầng sáng vàng thở chậm |
| Lộ diện | lật 3D; lá ngược xoay 180°; hiện vị trí, tên gốc + tên Việt, từ khóa, **một câu nghĩa soạn sẵn** | viền phát sáng, bụi sao bay lên; chuông nhẹ + tiếng giấy; rung vừa |
| Lá tiếp | lá bay vào khay trải bài phía trên; nhắc vị trí kế | — |
| Gom bài | các lá hiện thành hàng: "Đã đủ 3 lá. Hít một hơi rồi xem chúng nói gì với nhau." | chuyển sang bài đọc |

**Nguyên tắc:** (1) luôn có *Bỏ qua nghi thức* và mặc định "Nghi thức nhanh" trong Cài đặt; (2) tôn trọng tắt chuyển động của hệ điều hành: lật thành chuyển mờ, không hạt; (3) âm thanh hỏi một lần "Bật âm thanh nghi thức?", có nút tắt trên màn hình; (4) mọi cử chỉ có nút thay thế, TalkBack đọc tên lá khi lật; (5) mục tiêu 60 fps trên máy tầm trung — hạt dùng `react-native-reanimated` (đã có) với ≤ 24 phần tử, không thêm thư viện đồ họa nặng.
**Lá hôm nay:** cùng nghi thức bản ngắn (thở 5 giây). Lá hôm nay đã cố định theo tài khoản + ngày Việt Nam (P1-A), nên nghi thức chỉ là cách lật; không giả vờ cho chọn (Q5).
**Giọng nói trực tiếp (sau này):** mỗi giai đoạn có dòng lời dẫn bằng chữ và sự kiện (`ritual.stage`, `card.revealed`) để phiên giọng nói đọc theo; luôn có phụ đề. Cần đồng ý micro, riêng tư và chi phí: thuộc lớp AI trả phí; chưa làm trong đợt này.
**Âm thanh cần module native mới** (`expo-audio`; app chưa có) nên phải dựng bản dev-client/AAB mới; tệp âm thanh ≤ 150 KB, nguồn bản quyền sạch. Rung đã có (`expo-haptics`).

---

## 7. Kiểu trải bài

### 7.1 So với thị trường
Phổ biến: 1 lá, 3 lá (nhiều biến thể), Thập tự Celtic, Tình yêu/quan hệ, Ngã rẽ, Công việc, Có/Không, Móng ngựa 7, tuần/năm.

| Kiểu | Số lá | Đánh giá | Đề xuất |
|---|---|---|---|
| Một lá (`daily-one`) | 1 | Có nhưng trùng ý với "Lá hôm nay" | Giữ, đổi tên "Một lá nhanh"; Lá hôm nay là nghi thức riêng |
| Quá khứ / Hiện tại / Tiềm năng | 3 | Cổ điển, khác mục đích với kiểu dưới | Giữ; en thống nhất *Potential*; lá cuối là hướng mở, không phải kết luận |
| Tình huống / Thử thách / Lời nhắc | 3 | Chẩn đoán, khác kiểu theo thời gian | Giữ; **sửa lệch nhãn** (C8) |
| Tình yêu: Bạn / Người ấy / Mối quan hệ | 3 | Phổ biến; rủi ro "đọc suy nghĩ người kia" | Giữ; khung "cách bạn cảm nhận", luôn kèm câu để hỏi họ |
| Ngã rẽ | 4 | Thực tế, đủ cho hai hướng | Giữ |
| **Suy nghĩ / Cảm xúc / Hành động** | 3 | Thiếu — dành cho "Bản thân/Chữa lành"; thay "Tâm–Thân–Linh" để khỏi dính y tế | **Thêm** |
| **Công việc** | 4 | Thiếu kiểu riêng cho một chủ đề phổ biến: Hiện tại / Điểm mạnh / Điều đang cản / Bước tiếp | **Thêm** |
| **Thập tự Celtic** | 10 | Kiểu "kinh điển" người dùng rành tìm; hợp nhất với AI | **Thêm** — mục "Đào sâu"; rút miễn phí, AI ở mức “sâu” *(Q3)* |
| Có/Không | 1 | Rất phổ biến nhưng ép thành đoán định, trái nguyên tắc không khẳng định | **Không thêm**; Ngã rẽ đã trả lời nhu cầu "nên hay không" |
| Móng ngựa 7, Tuần 7 lá | 7 | Trùng Celtic / dễ thành dự đoán | **Không thêm** lúc này |

**Không thấy kiểu nào phi thực tế hay thừa.** Trùng ý duy nhất là "Một lá" so với "Lá hôm nay". Khi lên 8 kiểu, danh sách phải **chọn theo mục đích** ("Hiểu bản thân / Giải một tình huống / Một mối quan hệ / Một quyết định / Công việc / Đào sâu") thay vì xếp ô.

### 7.2 Cách đọc có khác nhau không? **Có — và prompt hiện chưa nói.**
Mã truyền cho AI mã kiểu trải và nhãn vị trí, **không có hướng dẫn cách đọc theo kiểu** (đã đọc `assembleTarotSystem`; prompt lưu trong cơ sở dữ liệu **chưa kiểm**).

| Kiểu | Cách đọc khác biệt |
|---|---|
| Theo thời gian | đọc trái→phải như một câu chuyện nhân quả; lá cuối là *tiềm năng*; lá ngược ở "quá khứ" = chưa khép |
| Chẩn đoán (Tình huống/Thử thách/Lời nhắc) | lá 2 là *ma sát*, không phải kẻ thù; lá 3 thành **một** hành động cụ thể |
| Ba phía quan hệ | so lá 1 và 2 theo cùng các trục; lá 3 đọc *khoảng giữa*, không đọc một người |
| Ngã rẽ | so lá 2 và 3 theo cùng trục (được/mất/cảm giác), **không xếp hạng**; lá 4 là lăng kính |
| Suy nghĩ/Cảm xúc/Hành động | điểm mấu chốt là **độ lệch** giữa ba lá |
| Celtic | đọc 2 lượt: lõi (1–2) → trục (3–6) → cột (7–10) |

**Đề xuất ngữ cảnh gửi AI** (thêm hai khối, máy chủ tự dựng từ mã lá, không tin điện thoại):
```
spreadGuide: { id, purpose, readOrder, relations:[{between:[2,3], how}], positionRoles:[{key, role, ask, caution}], cautions }
cardFacts:   { majors, reversed, elements:{…}, repeatedNumbers, courtCards, pairs:[{cards, note}] }
```
Khớp với cấu hình "Dữ liệu gửi cho AI" (14/11) — hai khối này là hai "khối dữ liệu" mới trong sơ đồ; không cần đổi thiết kế Admin.

---

## 8. Quyết định cần Owner (mỗi câu có khuyến nghị)

**Đã trả lời trong repo (không cần hỏi lại):** quy luật cùng chủ đề = cùng bài trong ngày; không bán rút lại; Nil chỉ từ gói, không bán lẻ ở v1; không số Nil cụ thể; Premium bán từ bản Play đầu (`NIL_PRICING_STRATEGY` mục 13).

| # | Câu hỏi | Khuyến nghị |
|---|---|---|
| Q1 | **Trần số trải bài/ngày không còn bị kẹp bởi hạn mức AI** (giữ trần mềm 3, theo kiểu trải + chủ đề)? Hiện Free chỉ có 1 trải/ngày dù rút không tốn model. Khóa theo chủ đề vẫn chặn rút lại để "đổi vận". | **Có.** Đổi `drawCap` thành trần mềm riêng; cần deploy lại `ai-tarot-reading` |
| Q2 | Bài đọc soạn sẵn cho khách chưa đăng nhập: vẫn rút trên máy, không khóa (như P1-A)? | Giữ như P1-A |
| Q3 | Celtic 10 lá: mức "sâu" hay mức riêng? Rút miễn phí? | Rút miễn phí; mức AI "sâu"; quyết bảng giá ở P2 |
| Q4 | Khóa bộ Premium chỉ bật khi `premiumOnSale=true`; thêm kiểm bậc bộ ở máy chủ? | Có |
| Q5 | Lá hôm nay: người dùng tự chọn một lá trong quạt rồi cố định cả ngày, hay giữ lá seed theo tài khoản + ngày (P1-A)? Nếu seed cố định, nghi thức chỉ là cách lật. | Giữ seed P1-A và nói thật "lá của bạn đã sẵn sàng" (không giả vờ chọn) |
| Q6 | Âm thanh nghi thức: hỏi một lần rồi nhớ? | Có |
| Q7 | Thêm 3 kiểu trải (Suy nghĩ/Cảm xúc/Hành động, Công việc 4 lá, Celtic)? | Có; Celtic đợt sau |
| Q8 | Ai duyệt nội dung kho diễn giải (Owner hay biên tập)? | Owner duyệt mẫu từng lớp rồi giao biên tập |
| Q9 | Thứ tự phát hành: Gói 0 dựa trên mã P1-A **chưa áp SQL, chưa deploy**. Duyệt áp migration `20261115100000` và deploy `ai-tarot-reading` trước, hay gộp Gói 0 vào cùng đợt? | Gộp: Q1 chỉ đổi một dòng ở hàm sắp deploy |

**Đã sửa so với bản 1:** bỏ giả định "Nil = tên hạn mức" (Owner đã chốt Nil là năng lượng theo gói); bỏ "rút không giới hạn, chạy ngoại tuyến" cho tài khoản đăng nhập (lá do máy chủ rút, cần mạng); bỏ số "1 Nil" khỏi giao diện; quy luật "cùng một câu hỏi" lấy từ khóa P1-A.

---

## 9. Lộ trình và phạm vi mã (khi Owner duyệt)

| Gói | Việc | Chạm vào | Cần Owner duyệt riêng |
|---|---|---|---|
| **0 Tách rút khỏi AI** | App: sau khi máy chủ rút lá, hiện bài đọc soạn sẵn rồi mới có nút AI (gọi `interpret` khi bấm + xác nhận); bỏ chặn "hết lượt" trước lá đầu cho chế độ máy chủ; thông báo hết lượt chỉ ở nút AI. Máy chủ: `drawCap` thành trần mềm riêng (Q1); kiểm bậc bộ bài (Q4). Sửa lệch nhãn C6. | `apps/mobile/App.tsx`, `src/features/tarot/*`, `handler.ts`, `tarot-prompt.ts` | **deploy Edge Function** (cùng đợt P1-A); không SQL mới |
| **1 Bài đọc soạn sẵn v1** | L1 thiếu + L2 + khung L4 cho 5 kiểu; trình dựng bài đọc; tiếng Việt trước | `packages/content`, `src/features/tarot/readingComposer.ts` | duyệt mẫu nội dung |
| **2 Nghi thức** | máy trạng thái, phóng to, lật 3D, quầng sáng, hạt, khay; bản nhanh; lá hôm nay | `TarotDrawStep`, `TarotCardFlight`, Home | không; âm thanh cần AAB mới |
| **3 Ngữ cảnh AI** | `spreadGuide` + `cardFacts` phía máy chủ; thêm vào cấu hình dữ liệu Admin | `_shared/tarot-prompt.ts` | **deploy Edge Function** |
| **4 Kiểu trải mới** | thêm 3 kiểu, chọn theo mục đích; kho L2–L4 cho kiểu mới | App, hàm, migration nới ràng buộc `spread` | **SQL + deploy** |
| **5 Kiểm tra** | thử máy thật Android, TalkBack, chữ lớn, giảm chuyển động | — | Owner thử |
| *Sau này (P2–P4 Nil)* | thanh năng lượng lấy số từ ví, chip nhẹ/vừa/sâu theo bảng giá Admin | theo chiến lược Nil | **chưa duyệt** |

Mỗi gói: hồ sơ `docs/feature-plans/*.json` + `npm run feature:preflight` trước khi sửa, cập nhật `PLAN.md` cuối PR. Merge vào `main` tự deploy Admin staging.

*Chưa kiểm chứng:* hiệu năng hạt và lật 3D trên máy yếu; cách đếm lượt của khách; prompt Tarot trong cơ sở dữ liệu; hành vi thật của P1-A trên Supabase (chưa áp, chưa deploy); mọi giả thuyết chuyển đổi (nội dung miễn phí tốt làm tăng bấm nút AI).
