# Persona Cover Image Standard

Last updated: 2026-09-20

Use this standard for every persona introduction hero image in Nilaza.

## Runtime Contract

- Every active persona has two reviewed assets: a 800 x 800 thumbnail and a 1200 x 1500 cover.
- Active mappings use the `-v2` asset explicitly. A renamed or unmapped active persona fails `npm run validate:visual-assets`; it must never fall back to another guide's image.
- Book-inspired guides must depict a book, open pages, or a book-object composition. Do not use a human portrait for this persona type.
- Do not add a white frame, matte border, text, faux book cover title, or watermark. Trim source borders before export.
- Masters may be high-quality JPEG; runtime copies are separately compressed JPEG and must remain within the mobile runtime budget.

## Thumbnail Slot

- Aspect ratio: 1:1.
- Production asset size: 800 x 800 px.
- Render target: circular/list avatar using cover fit.
- Safe area: keep the focal object or face within the center 76% width and height, since small avatars crop aggressively.

## Hero Cover Slot

- Aspect ratio: 4:5 portrait.
- Production asset size: 1200 x 1500 px.
- Minimum accepted source size: 1000 x 1250 px after crop.
- Render target: full-bleed inside the persona detail hero, using cover fit.
- Safe area: keep the face and primary gesture inside the center 70% width and top 72% height.
- Bottom title safety: avoid critical details in the bottom 22% because the name/subtitle overlay sits there.
- Header safety: avoid critical details in the top 10% because browser and sticky header states can visually compress the top edge.

## Visual Direction

- Premium mystical editorial style.
- Charcoal, champagne gold, deep teal, muted rose, soft ivory, and moon gray should dominate.
- Illustrated or painterly portraits are preferred over stock-photo realism.
- Keep the subject emotionally calm, reflective, and trustworthy.
- Include contextual props only when they support the persona: books, journal, scrolls, candles, stars, moon, maps, tea, philosophical objects.

## Do Not Use

- Text, logos, watermarks, card labels, or UI embedded in the image.
- Harsh horror/occult imagery.
- Overly cropped faces, cut-off eyes, or tiny distant subjects.
- One-off palettes that clash with Nilaza's dark editorial system.
- Low-resolution upscales or images that only work as square thumbnails.

## Current Audit

The persona list/avatar thumbnails remain square where useful. Persona detail now uses dedicated 4:5 cover assets.

| Persona asset | Previous source ratio | Cover output |
| --- | ---: | ---: |
| `aristotle.png` | 1122 x 1402, 0.800 | 1200 x 1500 |
| `confucius.png` | 1254 x 1254, 1.000 | 1200 x 1500 |
| `laozi.png` | 1254 x 1254, 1.000 | 1200 x 1500 |
| `marcus-aurelius.png` | 1254 x 1254, 1.000 | 1200 x 1500 |
| `sun-tzu.png` | 1254 x 1254, 1.000 | 1200 x 1500 |
| `communication-mentor.png` | 1254 x 1254, 1.000 | 1200 x 1500 |
| `calm-living-mentor.png` | 1254 x 1254, 1.000 | 1200 x 1500 |
| `art-of-war-strategist.png` | 1254 x 1254, 1.000 | 1200 x 1500 |
| `tao-te-ching-guide.png` | 1254 x 1254, 1.000 | 1200 x 1500 |
| `meditations-stoic.png` | 1254 x 1254, 1.000 | 1200 x 1500 |
