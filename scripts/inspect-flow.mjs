import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const artifactsDir = 'C:/Users/Admin/.gemini/antigravity/brain/2823fcb5-3820-4d50-b8c9-863fbf0b5a66';
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=390,844']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Sign In screen
  const signInBtn = await page.waitForSelector('text=TÔI ĐÃ TỪNG Ở ĐÂY');
  if (signInBtn) {
    await signInBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(artifactsDir, 'inspect_04_signin.png') });
    console.log('Captured inspect_04_signin.png');

    // Go back to welcome
    const backBtn = await page.$('[aria-label="Quay lại"], [aria-label="Back"]');
    if (backBtn) await backBtn.click();
    await new Promise(r => setTimeout(r, 400));
  }

  // 2. Sign Up screen
  const signUpBtn = await page.waitForSelector('text=BẮT ĐẦU HÀNH TRÌNH');
  if (signUpBtn) {
    await signUpBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(artifactsDir, 'inspect_05_signup.png') });
    console.log('Captured inspect_05_signup.png');
  }

  await browser.close();
  console.log('Auth flow inspection complete!');
}

run().catch(e => { console.error(e); process.exit(1); });
