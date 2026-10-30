# Nilaza Content Safety Style Guide

Last updated: 2026-07-06

Use this guide when writing or reviewing user-facing Nilaza content, prompt text, seed data, store copy, and admin-review content.

## Positioning

Nilaza is a mystical AI companion for self-reflection, journaling, symbolic tarot, astrology-inspired reflection, and emotionally intelligent conversation. It is not a fortune-telling service, a professional advice service, a therapy product, or a source of guaranteed predictions.

Every spiritual or symbolic feature should be framed as:

- entertainment and self-reflection
- a way to name feelings, patterns, needs, choices, and questions
- an invitation to journal, pause, or take one small grounded step

Avoid framing Nilaza as:

- able to know or control the future
- able to change fate, destiny, luck, love, money, health, or another person's feelings
- a substitute for medical, legal, financial, mental-health, or crisis support

## Safer Vocabulary

Prefer these terms:

- "khoảnh khắc phản chiếu", "nhịp phản chiếu", "thực hành", "bài phản chiếu", "khoảng dừng"
- "biểu tượng", "góc nhìn", "ẩn dụ", "lăng kính", "câu hỏi mở"
- "tự chăm sóc", "xoa dịu", "lắng nghe cảm xúc", "chăm sóc cảm xúc"
- "tâm trạng", "nhịp sao", "bản đồ biểu tượng", "gợi ý"
- "khả năng", "lựa chọn", "bước nhỏ", "ranh giới", "nhu cầu"

Use with care only when clearly framed as metaphor:

- "trực giác"
- "huyền học"
- "chiêm nghiệm"
- "spiritual"
- "tarot reading"

Avoid in user-facing claims:

- "nghi lễ", "bùa", "phép", "giải hạn", "khai vận"
- "định mệnh", "vận mệnh", "số mệnh" unless negated as in "không phải định mệnh cố định"
- "tiên tri", "dự báo chắc chắn", "điều này chắc chắn sẽ xảy ra"
- "chữa lành", "trị liệu", "chữa khỏi" unless explicitly saying Nilaza does not provide therapy or treatment
- "thu hút tình yêu", "thu hút tiền bạc", "manifest kết quả"
- "năng lượng vũ trụ" as a causal claim

## Tarot Names

Owner decision 2026-10-30: each card has one approved Vietnamese name, listed in `docs/content-review/tarot-card-names-vi.md` and stored in `name.vi` of `packages/content/data/tarot-cards.json`. The original English name stays in `name.en` as the canonical name.

- Vietnamese screens show the Vietnamese name as the card title, with the English name beside it (for example "Kẻ Khờ" with "The Fool"), so readers can match it with other books and decks.
- Use only the approved names: `Kẻ Khờ`, `Bánh Xe Số Phận`, `Át Cốc`, `Tiểu Đồng Tiền`, and so on. Do not invent another translation in a single piece of copy.
- Vietnamese prose may use the Vietnamese name, the English name, or "lá này". New copy should prefer the Vietnamese name or "lá này"; older copy that uses the English name is still acceptable.
- Card ids, image files, deck visual-prompt titles and AI context keep the English name.

Good example:

> Kẻ Khờ mở ra chủ đề khởi đầu, niềm tin và tự do. Hãy xem lá này như một câu hỏi về bước nhỏ tiếp theo, không phải lời dự báo.

## Required Safety Framing

Tarot and astrology copy should regularly reinforce:

- "diễn giải biểu tượng"
- "tự phản chiếu"
- "không phải dự đoán chắc chắn"
- "không thay thế lời khuyên chuyên môn"

For medical, legal, financial, or mental-health requests, Nilaza should redirect gently and avoid giving instructions or diagnoses.

For self-harm or crisis signals, Nilaza should respond supportively and direct users to immediate local emergency or crisis support.

## Review Checklist

Before publishing content:

- Card names use the approved Vietnamese name in `vi` and the original name in `en`.
- No deterministic future claims.
- No claims that Nilaza can diagnose, heal, treat, guarantee, or alter real-world outcomes.
- No impersonation of real people, authors, publishers, estates, brands, or official representatives.
- Sensitive features include consent, deletion, privacy, and professional-help boundaries where relevant.
- Vietnamese text uses standard accented UTF-8.
