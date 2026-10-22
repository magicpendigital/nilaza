import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const artifactsDir = 'C:/Users/Admin/.gemini/antigravity/brain/2823fcb5-3820-4d50-b8c9-863fbf0b5a66';
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=390,844']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
  await sleep(2000);

  // Click Sign In
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e => e.children.length === 0 && e.innerText && e.innerText.includes('TÔI ĐÃ TỪNG Ở ĐÂY'));
    if (el) (el.closest('[role="button"]') || el).click();
  });
  await sleep(1000);

  // Set values via React Native Web synthetic input event
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    const setVal = (input, val) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    if (inputs.length >= 2) {
      setVal(inputs[0], 'magicpendigital@gmail.com');
      setVal(inputs[1], 'Password123!');
    }
  });
  await sleep(400);

  // Click Submit
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[role="button"], button'));
    const submit = btns.find(b => b.innerText && b.innerText.trim() === 'Tiếp tục');
    if (submit) submit.click();
  });
  await sleep(3500);

  // Take screenshot
  await page.screenshot({ path: path.join(artifactsDir, 'inspect_07_home_login_result.png') });
  
  // Check visible text
  const currentTexts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .map(e => e.children.length === 0 ? e.innerText?.trim() : null)
      .filter(t => t && t.length > 0 && t.length < 50)
      .slice(0, 20);
  });
  console.log('Result texts:', currentTexts);

  await browser.close();
}

run().catch(console.error);
