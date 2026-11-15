# Tarot: rút bài miễn phí, AI phân tích trả phí — phân tích và đề xuất (15/11/2026)

> **Loại tài liệu:** đề xuất, **chưa sửa app**. Viết cho Owner; chi tiết kỹ thuật ở mục 9.
> **Căn cứ:** đọc mã trên `origin/main` (`e73e765`). **Chưa chạy app, chưa truy vấn Singapore, chưa thử trên máy thật.** Mỗi phát hiện ghi *đã kiểm chứng trong mã* hoặc *suy luận*.
> **Hình dung bằng thiết kế:** canvas Artifact "Nilaza — Thiết kế lại Tarot & Astrology", hàng **6 (Tarot v2)** và hàng **7 (Hội đồng, Chiêm tinh)**. Đọc xong thiết kế và chốt các quyết định ở mục 8 rồi mới viết mã.

---

## 1. Tóm tắt

1. **Lỗi gốc (đã kiểm chứng):** *rút bài* và *gọi AI* đang là **một hành động**. Vì AI tốn tiền nên hạn mức AI (1 lượt/ngày) bị đặt **trước lá bài đầu tiên**. Hệ quả: sau một lần rút, người dùng không rút được nữa, kể cả bộ bài miễn phí, kể cả khi bài đọc chỉ là bản soạn sẵn.
2. **Kiểm quyền bộ bài thì đúng hướng** (bộ Premium cần tài khoản Premium) nhưng nó đứng cùng chỗ với hạn mức, nên nút rút đổi thành "Nâng cấp" và cả hai bị trộn thành một thông báo chặn.
3. **Đề xuất:** tách hai lớp.
   - **Lớp miễn phí, chạy trên máy:** hỏi → chọn bộ bài → nghi thức rút → xem từng lá và bài đọc soạn sẵn của Nilaza. Không giới hạn, không cần mạng.
   - **Lớp AI trả phí:** một nút "Phân tích chuyên sâu" ở cuối kết quả. Bấm nút mới hỏi xác nhận, gọi máy chủ và **chỉ trừ Nil khi AI trả bài đạt**.
4. **Muốn người dùng bấm nút AI thì lớp miễn phí phải hay.** Hiện bản soạn sẵn quá mỏng (mục 3). Cần một **kho diễn giải ghép từ nhiều lớp** (lá × chủ đề × vị trí × kiểu trải × tổ hợp), khoảng **800 đơn vị nội dung**, thay vì cố viết hàng nghìn ô.
5. **Màn rút bài:** làm thành nghi thức (thở → xào → chọn → lá phóng to giữa màn hình → chạm để mở), có phát sáng, bụi sao, âm thanh, rung; luôn có "Bỏ qua nghi thức" và tắt hiệu ứng. Các giai đoạn là một máy trạng thái có lời dẫn bằng chữ, để sau này gắn giọng nói trực tiếp của LLM mà không đổi giao diện.
6. **Kiểu trải bài:** 5 kiểu hiện có đều hợp lý, không trùng, không phi thực tế. Thiếu 3 kiểu phổ biến: *Suy nghĩ/Cảm xúc/Hành động*, *Công việc 4 lá*, *Thập tự Celtic 10 lá*. **Cách đọc mỗi kiểu khác nhau nhưng prompt hiện không nói** — cần đưa "hướng dẫn đọc theo kiểu trải" làm ngữ cảnh cho LLM.

---

## 2. Luồng hiện tại (đã kiểm chứng trong mã)

| # | Phát hiện | Bằng chứng |
|---|---|---|
| C1 | Một nút làm cả rút lẫn gọi AI: `drawCards` chọn lá rồi gọi `generateTarotReading`; lỗi hoặc ngoại tuyến thì dùng bản soạn sẵn. | `apps/mobile/App.tsx:5239–5330`, `src/backendClient.ts:609–627` |
| C2 | Số "lượt còn lại" = giới hạn − số lần ghi `tarot_reading_drawn` hôm nay. Mọi tài khoản giới hạn 1/ngày. Khi bằng 0, cả `handleDraw` và `handleQuickDraw` dừng **trước lá đầu tiên**, `drawCards` hiện "đã dùng hết lượt". | `App.tsx:2069–2070`, `3152–3156`, `7354`, `7384`, `5256–5261`; `packages/agent-config/ai-usage-policy.json` |
| C3 | Sự kiện `tarot_reading_drawn` cũng được ghi khi bài đọc là bản **soạn sẵn** (AI lỗi/ngoại tuyến). Nghĩa là bản miễn phí cũng "ăn" lượt. | `App.tsx:5290–5300` |
| C4 | Kiểm bộ bài dùng `canViewContentTier`: bộ `free` luôn qua, bộ `premium-preview` cần tài khoản Premium. Màn chọn bộ đã chặn bộ Premium trên tài khoản Free. Đây là logic đúng, chỉ bị trộn với C2. | `src/features/owner/tierPreview.ts:27`, `App.tsx:7748–7752` |
| C5 | Nút chính đổi thành "Nâng cấp" (biểu tượng khóa) khi bộ bị khóa. | `App.tsx:7433–7460` |
| C6 | Máy chủ đã đếm đúng theo **bài AI giao đạt** (`moderationStatus = passed`) và cho thử lại tối đa 3 lần/ngày khi AI lỗi. Cơ sở trừ Nil có sẵn phía máy chủ. | `supabase/functions/ai-tarot-reading/index.ts:84–101` |
| C7 | Máy chủ **không kiểm bậc của bộ bài** (chỉ nhận mã bộ). Khi bán Premium cần thêm. | `ai-tarot-reading/index.ts`, `_shared/tarot-prompt.ts:87–120` |
| C8 | Nhãn vị trí app và máy chủ lệch: vị trí 3 của "Tình huống/Thử thách/Lời nhắc" là *Lời nhắc / Advice* ở app nhưng *Gợi mở / Reflection* ở máy chủ; "Tiềm năng" en là *Future* ở app, *Potential* ở máy chủ. | `App.tsx:1511–1530` so với `_shared/tarot-prompt.ts:77–86` |
| C9 | Khách (chưa đăng nhập): máy chủ bắt đăng nhập nên khách rơi vào bản soạn sẵn. **Chưa kiểm** cách app đếm lượt cho khách. | suy luận |

**Không tìm thấy trong repo:** quy luật "rút và hỏi cùng một câu hỏi" mà Owner nhắc, và đơn vị **Nil**. Hiện chỉ có bộ đếm "lượt/ngày"; `PaywallPanel.test.tsx` còn cấm chữ "credit/Nil" trong màn mua. → Owner nhắc lại quy luật (mục 8, Q1–Q2). Thiết kế giữ nguyên mọi quy luật hiện có và chỉ đổi *chỗ tính*.

---

## 3. Bản soạn sẵn hiện tại mỏng thế nào

- `buildLocalTarotInterpretation` chỉ ghép: câu hỏi + tên kiểu trải + **tên các lá** + một câu chung + câu hỏi suy ngẫm của **lá đầu tiên**. Không có nội dung theo lá, vị trí hay chủ đề. (`App.tsx:2448–2478`)
- Mỗi lá chỉ có nghĩa chung xuôi/ngược, **giống nhau ở mọi vị trí và mọi câu hỏi**; màn kết quả còn ghi thẳng "Nghĩa chung của lá · chưa có diễn giải riêng cho câu hỏi này". (`TarotResultView.tsx:107–110`)
- Có sẵn để dùng lại: 78 lá × (giới thiệu, chân dung, nghĩa xuôi, nghĩa ngược, câu hỏi) ≈ 520 ký tự/lá; **hướng dẫn lá theo 3 chủ đề** (tình yêu, công việc, bản thân — chỉ nghĩa *xuôi*), hiểu lầm thường gặp, nguyên tố, chiêm tinh (`packages/content/data/tarot-card-guide.json`); 8 bộ bài, 4 miễn phí (Moon Garden, Rose Mirror, Classic Arcana, Tinh Quang) và 4 Premium.
- **Chưa có:** nghĩa ngược theo chủ đề; chủ đề "Quyết định"; giọng theo **vị trí**; cách các lá **tác động qua lại**; hướng dẫn **cách đọc theo kiểu trải**.

---

## 4. Luồng đề xuất

```
Hỏi → Chọn bộ bài → Nghi thức rút → Bài đọc Nilaza (miễn phí, máy)
                                         └─ [Phân tích chuyên sâu AI] → xác nhận → máy chủ → trừ Nil khi đạt
```

### 4.1 Ai làm được gì

| Hành động | Khách | Free đã đăng nhập | Premium |
|---|---|---|---|
| Xem thư viện, học từng lá | ✓ | ✓ | ✓ |
| Rút bài **bộ miễn phí** | ✓ không giới hạn | ✓ không giới hạn | ✓ |
| Xem bộ Premium (tranh, câu chuyện) | ✓ | ✓ | ✓ |
| Rút bài **bộ Premium** | ✗ (nút "Mở Premium") | ✗ (nút "Mở Premium") | ✓ |
| Bài đọc Nilaza (soạn sẵn) | ✓ | ✓ | ✓ |
| Phân tích chuyên sâu AI, Hỏi tiếp | Đăng nhập | 1 Nil/ngày | 1 Nil/ngày (Owner chốt 04/11; đổi sau khi bán Premium) |

*Closed test:* mọi tài khoản đăng nhập là Premium (`all_premium`), nên cột "Free đã đăng nhập" chỉ có hiệu lực sau khi bán Premium. Khóa bộ Premium chỉ hiện khi `premiumOnSale = true`; trước đó vẫn là "Sắp có" như hiện nay.

### 4.2 Quy tắc tính Nil
- **Chỉ tính khi bấm "Phân tích chuyên sâu" và xác nhận.** Rút bài, xem lá, đọc bài đọc Nilaza, lưu: miễn phí.
- **Chỉ trừ khi AI trả bài đạt** (đúng cách máy chủ đang đếm). Lỗi, hết giờ, bị chặn an toàn: không trừ, giữ bài đọc, cho thử lại.
- **Mở lại bài đã phân tích: miễn phí** (kết quả lưu cùng bài đọc trong Nhật ký). Phân tích lại *cùng câu hỏi, cùng các lá* không trừ lần hai — *giả định của tôi, chờ Owner xác nhận ở Q2*.
- Hết Nil: nút AI chuyển thành "Hết lượt hôm nay · lượt mới lúc 00:00"; mọi thứ miễn phí vẫn dùng được.
- Khách bấm nút AI: giữ nguyên bài đọc, đăng nhập xong quay lại đúng chỗ.

### 4.3 "Nil" nên là gì
| Phương án | Nội dung | Khuyến nghị |
|---|---|---|
| **A. Nil = tên gọi của hạn mức AI hằng ngày** | Không có ví. 1 phân tích Tarot = 1 Nil, mỗi ngày làm mới. Dùng lại bộ đếm hiện có. | **Chọn cho closed test và bản Play đầu.** Làm được ngay, đúng "luật đã chốt". |
| **B. Nil = ví tiền tệ thật** | Số dư, gói nạp, sổ cái, RevenueCat consumable, hoàn tiền, đối soát. | Làm sau, khi đã có dữ liệu dùng thật. Thiết kế màn hình đã chừa chỗ (chip "Còn N Nil"). |

### 4.4 Cho AI giá trị gì mà bản miễn phí không có
| Bản miễn phí (Nilaza soạn sẵn) | Phân tích chuyên sâu (AI) |
|---|---|
| Nghĩa từng lá đúng chủ đề, đúng vị trí | Đọc **chính câu chữ của bạn**, trả lời thẳng câu hỏi |
| Các lá tác động qua lại (theo quy tắc) | Một câu chuyện liền mạch nối các lá với tình huống của bạn |
| Một bước nhỏ + một câu hỏi viết | 2–3 hướng cân nhắc, một thử nghiệm cụ thể trong tuần |
| Giống nhau với mọi người rút cùng bộ lá | Giọng người dẫn, **Hỏi tiếp**, lưu vào dòng thời gian Nhật ký |

Ranh giới an toàn không đổi: không khẳng định tương lai, không nói người khác nghĩ gì, không chẩn đoán.

---

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
| Chọn | quạt bài úp, vuốt để xoay, chạm một lá | lá được chọn nhấc lên |
| Phóng to | lá úp ở **giữa màn hình**, nền tối dần, mọi nút khác ẩn; "Hít một hơi. Nhắm mắt nếu bạn muốn. Chạm vào lá bài khi sẵn sàng." | quầng sáng vàng thở chậm |
| Lộ diện | lật 3D; lá ngược xoay 180°; hiện vị trí, tên gốc + tên Việt, từ khóa, **một câu nghĩa soạn sẵn** | viền phát sáng, bụi sao bay lên; chuông nhẹ + tiếng giấy; rung vừa |
| Lá tiếp | lá bay vào khay trải bài phía trên; nhắc vị trí kế | — |
| Gom bài | các lá hiện thành hàng: "Đã đủ 3 lá. Hít một hơi rồi xem chúng nói gì với nhau." | chuyển sang bài đọc |

**Nguyên tắc:** (1) luôn có *Bỏ qua nghi thức* và mặc định "Nghi thức nhanh" trong Cài đặt; (2) tôn trọng tắt chuyển động của hệ điều hành: lật thành chuyển mờ, không hạt; (3) âm thanh hỏi một lần "Bật âm thanh nghi thức?", có nút tắt trên màn hình; (4) mọi cử chỉ có nút thay thế, TalkBack đọc tên lá khi lật; (5) mục tiêu 60 fps trên máy tầm trung — hạt dùng `react-native-reanimated` (đã có) với ≤ 24 phần tử, không thêm thư viện đồ họa nặng.
**Lá hôm nay:** cùng nghi thức bản ngắn (thở 5 giây). Hiện lá hôm nay chọn theo ngày, người dùng chỉ "mở" nên cảm giác bị an bài. Đề xuất: **tự chọn một lá trong quạt 7 lá, chọn rồi cố định cả ngày** (lưu cùng khóa `today-card:<ngày>`). Quyết định Q6.
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
| **Thập tự Celtic** | 10 | Kiểu "kinh điển" người dùng rành tìm; hợp nhất với AI | **Thêm** — mục "Đào sâu"; rút miễn phí, AI tốn 2 Nil *(Q5)* |
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

| # | Câu hỏi | Khuyến nghị |
|---|---|---|
| Q1 | Quy luật "rút và hỏi cùng một câu hỏi" cụ thể là gì? (không tìm thấy trong repo) | Owner nhắc lại một đoạn ngắn; tôi giữ nguyên |
| Q2 | Phân tích AI lại cùng câu hỏi + cùng các lá: trừ lần hai không? | Không trừ; mở lại bài đã phân tích miễn phí |
| Q3 | Nil: phương án A (tên hạn mức) hay B (ví)? | **A** trước |
| Q4 | Khóa bộ Premium chỉ bật khi `premiumOnSale=true`? | Có |
| Q5 | Celtic: AI tốn 1 hay 2 Nil? Có để rút miễn phí? | Rút miễn phí, AI 2 Nil |
| Q6 | Lá hôm nay: tự chọn 1 trong 7 lá rồi cố định cả ngày? | Có |
| Q7 | Âm thanh nghi thức: hỏi một lần rồi nhớ? | Có |
| Q8 | Thêm 3 kiểu trải (Suy nghĩ/Cảm xúc/Hành động, Công việc 4 lá, Celtic)? | Có; Celtic làm ở đợt sau |
| Q9 | Kho diễn giải: ai duyệt nội dung (Owner hay người biên tập)? | Owner duyệt mẫu từng lớp rồi giao biên tập |

---

## 9. Lộ trình và phạm vi mã (khi Owner duyệt)

| Gói | Việc | Chạm vào | Cần Owner duyệt riêng |
|---|---|---|---|
| **0 Sửa luồng** | Tách rút khỏi AI; bộ đếm chỉ tính bài AI giao đạt; nút "Phân tích chuyên sâu" + tờ xác nhận; khóa bộ Premium chỉ ở nút rút; sửa lệch nhãn C8 | `App.tsx`, `src/features/tarot/*`, `tarot-prompt.ts` (nhãn), test | không (không đổi máy chủ nếu chưa thêm kiểm bậc bộ bài) |
| **1 Bài đọc soạn sẵn v1** | L1 thiếu + L2 + khung L4 cho 5 kiểu; trình dựng bài đọc; tiếng Việt trước | `packages/content`, `src/features/tarot/readingComposer.ts` | duyệt mẫu nội dung |
| **2 Nghi thức** | máy trạng thái, phóng to, lật 3D, quầng sáng, hạt, khay; bản "nhanh"; Lá hôm nay | `TarotDrawStep`, `TarotCardFlight`, Home | không; âm thanh cần AAB mới |
| **3 Ngữ cảnh AI** | `spreadGuide` + `cardFacts` phía máy chủ; thêm vào cấu hình dữ liệu Admin | `supabase/functions/_shared/tarot-prompt.ts` | **deploy Edge Function** |
| **4 Kiểu trải mới** | thêm 3 kiểu, chọn theo mục đích; kho L2–L4 cho kiểu mới | App, hàm, migration nới ràng buộc `spread` | **SQL + deploy** |
| **5 Kiểm tra** | thử trên máy thật Android, TalkBack, chữ lớn, giảm chuyển động | — | Owner thử |

Mỗi gói: hồ sơ `docs/feature-plans/*.json` + `npm run feature:preflight` trước khi sửa, cập nhật `PLAN.md` cuối PR. Khi gộp vào `main`, **mỗi push `main` tự deploy Admin staging**.

*Chưa kiểm chứng:* hiệu năng hạt và lật 3D trên máy yếu; cách đếm lượt của khách (C9); prompt Tarot trong cơ sở dữ liệu; mọi giả thuyết chuyển đổi (nội dung miễn phí tốt làm tăng bấm nút AI) — cần đo sau khi ra.
