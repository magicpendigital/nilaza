import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Inspect shipped artifacts, since the CSS optimizer can rewrite valid source
// breakpoints into range syntax which Safari on iOS 15 cannot parse.
const root = fileURLToPath(new URL('../apps/web/dist/', import.meta.url));
const files = [];
const walk = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(css|html)$/.test(entry.name)) files.push(file);
  }
};
if (!fs.existsSync(root)) throw new Error('Build apps/web before checking browser compatibility.');
walk(root);
const failures = [];
let css = '';
let pages = 0;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const styles = file.endsWith('.css') ? [source] : [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]);
  for (const style of styles) {
    css += style;
    for (const match of style.matchAll(/@media\s*([^{}]+)\{/gi)) {
      if (/[<>]/.test(match[1])) failures.push(`${path.relative(root, file)}: unsupported media range ${match[1].trim()}`);
    }
  }
  if (file.endsWith('.html') && /<header\b[^>]*class="[^"]*\bsite-header\b/.test(source)) {
    pages++;
    if (!/<meta\b(?=[^>]*name="viewport")(?=[^>]*content="[^"]*width=device-width)[^>]*>/i.test(source)) failures.push(`${path.relative(root, file)}: missing device-width viewport`);
  }
}
for (const breakpoint of [800, 850]) {
  if (!new RegExp(`max-width\\s*:\\s*${breakpoint}px`).test(css)) failures.push(`Missing classic ${breakpoint}px responsive breakpoint`);
}
if (!pages) failures.push('No public site pages checked');
if (failures.length) {
  console.error(`Web compatibility failed (Safari/iOS 15):\n${failures.join('\n')}`);
  process.exitCode = 1;
} else console.log(`Web compatibility passed: ${pages} pages; classic responsive queries for Safari/iOS 15.`);
