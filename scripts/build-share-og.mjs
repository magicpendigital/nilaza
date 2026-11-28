// Builds the link preview image (Open Graph, 1200 x 630) for each share page: apps/web/public/share/og/<variant>-<locale>.png.
// Facebook and Zalo show this image when a share link is pasted, so each feature gets its own picture instead of the
// site-wide one. Brand fonts come from the local TTF masters, the logo from the generated SVG; nothing is downloaded.
// Usage: node scripts/build-share-og.mjs          (write)
//        node scripts/build-share-og.mjs --check  (fail when a file is missing, the wrong size, too big or extra)
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const target = path.join(root, "apps/web/public/share/og");
const fonts = path.join(root, "assets/brand/open-reflection/v1/source");
const serif = path.join(fonts, "EBGaramond-Regular.ttf");
const sans = path.join(fonts, "HankenGrotesk-Regular.ttf");
const W = 1200;
const H = 630;
const maxBytes = 200 * 1024;
const color = { charcoal: "#151416", ivory: "#F7F1E6", teal: "#0E5A5A", gold: "#C9A45C", moon: "#CFC8BD" };

// Same variants as apps/web/src/lib/shareLanding.ts (a test keeps the lists in step). Copy is static and never
// repeats what someone shared.
const variants = ["card", "reading", "numbers", "sky", "quote"];
const copy = {
  vi: {
    card: ["Từ một người bạn trên Nilaza", "Một lá bài để chậm lại một nhịp.", "Xem lá bạn của bạn vừa rút, rồi tự rút một lá ngay trên trình duyệt."],
    reading: ["Từ một người bạn trên Nilaza", "Một trải bài để ngồi nghĩ cùng nhau.", "Xem những lá bạn của bạn vừa trải, rồi tự rút một lá."],
    numbers: ["Bản đồ số", "Con số chủ đạo của bạn là gì?", "Nhập ngày sinh để xem, ngay trên trình duyệt. Không gửi đi, không lưu."],
    sky: ["Bầu trời hôm nay", "Trăng hôm nay ở cung nào?", "Một dòng gợi nhịp cho ngày của bạn, để tự soi chiếu."],
    quote: ["Một câu cho hôm nay", "Một câu từ sách cổ, một câu hỏi để tự ngẫm.", "Đạo Đức Kinh, Suy tưởng, Pháp Cú, Binh pháp, Kinh Dịch."],
    foot: "Để tự phản chiếu, không phải dự đoán."
  },
  en: {
    card: ["From a friend on Nilaza", "One card to slow down for a moment.", "See the card your friend drew, then draw your own right in your browser."],
    reading: ["From a friend on Nilaza", "A spread to think about together.", "See the cards your friend laid out, then draw one yourself."],
    numbers: ["Number map", "What is your life path number?", "Enter a birth date to see it, right in your browser. Never sent, never stored."],
    sky: ["Today's sky", "Which sign is the Moon in today?", "One line to suggest a pace for your day, to reflect on."],
    quote: ["A line for today", "One line from an old book, one question to sit with.", "Tao Te Ching, Meditations, Dhammapada, Art of War, I Ching."],
    foot: "For reflection, not prediction."
  }
};

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function text(value, { font, file, size, fill, width, spacing = 0, lineHeight }) {
  const span = `<span foreground="${fill}"${spacing ? ` letter_spacing="${spacing * 1024}"` : ""}>${escape(value)}</span>`;
  const input = { text: span, font: `${font} ${size}`, fontfile: file, width, rgba: true, dpi: 72, wrap: "word" };
  if (lineHeight) input.spacing = Math.round(size * (lineHeight - 1));
  const { data, info } = await sharp({ text: input }).png().toBuffer({ resolveWithObject: true });
  return { input: data, width: info.width, height: info.height };
}

const background = (variant) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><radialGradient id="g" cx="${variant === "numbers" ? "80%" : "78%"}" cy="40%" r="62%">
    <stop offset="0" stop-color="${color.teal}" stop-opacity="${variant === "numbers" ? 0.75 : 0.5}"/><stop offset="1" stop-color="${color.teal}" stop-opacity="0"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="${color.charcoal}"/><rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="64" y="${H - 6}" width="${W - 128}" height="1" fill="${color.gold}" opacity=".35"/>
</svg>`;

// Right-hand picture for each variant: the feature itself, drawn simply in brand colours.
async function art(variant) {
  const layers = [];
  if (variant === "card" || variant === "reading") {
    const ids = variant === "card" ? ["major-17-star"] : ["major-02-high-priestess", "major-17-star", "major-19-sun"];
    const cardW = variant === "card" ? 230 : 180;
    const cardH = Math.round(cardW * 518 / 300);
    const step = variant === "card" ? 0 : 130;
    const startX = variant === "card" ? 870 : 735;
    for (const [index, id] of ids.entries()) {
      const image = await sharp(path.join(root, "apps/web/public/share/cards", `${id}.webp`)).resize(cardW, cardH, { fit: "cover" })
        .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${cardH}"><rect x="1" y="1" width="${cardW - 2}" height="${cardH - 2}" rx="12" fill="none" stroke="${color.gold}" stroke-opacity=".6" stroke-width="2"/></svg>`) }])
        .png().toBuffer();
      const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${cardH}"><rect width="${cardW}" height="${cardH}" rx="12"/></svg>`);
      const rounded = await sharp(image).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
      const top = Math.round((H - cardH) / 2) + (variant === "reading" && index === 1 ? -24 : 0);
      layers.push({ input: rounded, left: startX + index * step, top });
    }
  } else if (variant === "numbers") {
    const cell = 92;
    const x0 = 790;
    const y0 = 150;
    let cells = "";
    for (let n = 1; n <= 9; n += 1) {
      const x = x0 + ((n - 1) % 3) * (cell + 12);
      const y = y0 + Math.floor((n - 1) / 3) * (cell + 12);
      const lit = n === 7;
      cells += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="14" fill="${lit ? color.gold : "none"}" fill-opacity="${lit ? 0.18 : 0}" stroke="${lit ? color.gold : color.ivory}" stroke-opacity="${lit ? 1 : 0.25}" stroke-width="2"/>`;
    }
    layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${cells}</svg>`), left: 0, top: 0 });
    for (let n = 1; n <= 9; n += 1) {
      const digit = await text(String(n), { font: "EB Garamond", file: serif, size: 54, fill: n === 7 ? color.gold : color.moon });
      layers.push({ input: digit.input, left: x0 + ((n - 1) % 3) * (cell + 12) + Math.round((cell - digit.width) / 2), top: y0 + Math.floor((n - 1) / 3) * (cell + 12) + Math.round((cell - digit.height) / 2) });
    }
  } else if (variant === "sky") {
    // A crescent (an ivory disc with an offset disc masked out, so the background shows through) inside a thin gold orbit.
    layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <circle cx="930" cy="315" r="190" fill="none" stroke="${color.gold}" stroke-opacity=".35" stroke-width="1.5"/>
      <defs><mask id="m"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="878" cy="292" r="112" fill="#000"/></mask></defs>
      <circle cx="930" cy="315" r="120" fill="${color.ivory}" mask="url(#m)"/>
      <circle cx="1112" cy="250" r="5" fill="${color.gold}"/><circle cx="760" cy="430" r="3" fill="${color.ivory}" fill-opacity=".7"/><circle cx="1050" cy="490" r="3" fill="${color.ivory}" fill-opacity=".6"/>
    </svg>`), left: 0, top: 0 });
  } else if (variant === "quote") {
    const mark = await text("“", { font: "EB Garamond", file: serif, size: 420, fill: color.gold });
    layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="790" y="140" width="300" height="360" rx="18" fill="${color.ivory}" fill-opacity=".06" stroke="${color.gold}" stroke-opacity=".45" stroke-width="2"/></svg>`), left: 0, top: 0 });
    layers.push({ input: mark.input, left: 940 - Math.round(mark.width / 2), top: 160 });
    // Three quiet lines under the mark stand for the quote itself; no real text is shown.
    layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${[[360, 210], [392, 190], [424, 130]].map(([y, w]) => `<rect x="${940 - w / 2}" y="${y}" width="${w}" height="3" rx="1.5" fill="${color.ivory}" fill-opacity=".35"/>`).join("")}<rect x="910" y="456" width="60" height="2" fill="${color.gold}"/></svg>`), left: 0, top: 0 });
  }
  return layers;
}

async function render(variant, locale) {
  const [eyebrow, title, body] = copy[locale][variant];
  const logo = await sharp(path.join(root, "apps/web/public/brand/v1/logo/horizontal-ivory.svg"), { density: 144 }).resize({ width: 230 }).png().toBuffer();
  const logoMeta = await sharp(logo).metadata();
  const layers = [{ input: logo, left: 40, top: 26 }];
  let y = 26 + logoMeta.height + 18;
  const brow = await text(eyebrow.toUpperCase(), { font: "Hanken Grotesk", file: sans, size: 19, fill: color.gold, width: 640, spacing: 3 });
  layers.push({ input: brow.input, left: 64, top: y });
  y += brow.height + 22;
  const head = await text(title, { font: "EB Garamond", file: serif, size: 62, fill: color.ivory, width: 680 });
  layers.push({ input: head.input, left: 64, top: y });
  y += head.height + 22;
  const lead = await text(body, { font: "Hanken Grotesk", file: sans, size: 23, fill: color.moon, width: 600, lineHeight: 1.15 });
  layers.push({ input: lead.input, left: 64, top: y });
  y += lead.height;
  const foot = await text(`${copy[locale].foot}   nilaza.magicpendigital.com`, { font: "Hanken Grotesk", file: sans, size: 17, fill: color.ivory, width: 700 });
  const footTop = H - 40 - foot.height;
  if (y + 20 > footTop) throw new Error(`${variant}-${locale}: text runs into the footer`);
  layers.push({ input: foot.input, left: 64, top: footTop });
  const picture = await art(variant);
  const flat = await sharp(Buffer.from(background(variant))).composite([...picture, ...layers]).png().toBuffer();
  // Full colour keeps the gradient smooth; a 256-colour palette is the fallback only when a file would pass the limit.
  const full = await sharp(flat).png({ compressionLevel: 9 }).toBuffer();
  return full.length < maxBytes ? full : sharp(flat).png({ compressionLevel: 9, palette: true, colours: 256, dither: 0.6 }).toBuffer();
}

const check = process.argv.includes("--check");
const errors = [];
const expected = variants.flatMap((variant) => ["vi", "en"].map((locale) => `${variant}-${locale}.png`));
if (!check) {
  fs.mkdirSync(target, { recursive: true });
  for (const variant of variants) for (const locale of ["vi", "en"]) fs.writeFileSync(path.join(target, `${variant}-${locale}.png`), await render(variant, locale));
}
for (const name of expected) {
  const file = path.join(target, name);
  if (!fs.existsSync(file)) { errors.push(`missing apps/web/public/share/og/${name}`); continue; }
  const meta = await sharp(file).metadata();
  if (meta.width !== W || meta.height !== H) errors.push(`${name} is ${meta.width}x${meta.height}, expected ${W}x${H}`);
  const size = fs.statSync(file).size;
  if (size >= maxBytes) errors.push(`${name} is ${size} bytes (limit ${maxBytes})`);
}
if (fs.existsSync(target)) for (const name of fs.readdirSync(target)) if (!expected.includes(name)) errors.push(`unexpected file ${name}`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
const total = expected.reduce((sum, name) => sum + fs.statSync(path.join(target, name)).size, 0);
console.log(`Share preview images ${check ? "valid" : "written"}: ${expected.length} files, ${Math.round(total / 1024)} KB total, each ${W}x${H} under ${maxBytes / 1024} KB.`);
