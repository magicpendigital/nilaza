import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const artifactDir = 'C:/Users/Admin/.gemini/antigravity/brain/2823fcb5-3820-4d50-b8c9-863fbf0b5a66';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function clickByExactText(page, text) {
  const clicked = await page.evaluate((target) => {
    const candidates = Array.from(document.querySelectorAll('*')).filter(e => {
      const t = e.innerText ? e.innerText.trim() : '';
      return t === target;
    });
    if (candidates.length === 0) return false;
    // pick smallest area
    candidates.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return (ra.width * ra.height) - (rb.width * rb.height);
    });
    const el = candidates[0];
    el.click();
    return true;
  }, text);
  return clicked;
}

async function runTarotAndChatFlow() {
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    defaultViewport: { width: 390, height: 844 },
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  await sleep(2000);

  // 1. Tarot Flow: Click Explore tab, then click "Bắt đầu trải bài"
  console.log('Navigating to Explore...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('*')).filter(e => e.innerText && e.innerText.trim() === 'Khám phá' && e.getBoundingClientRect().top > 700);
    if (tabs.length > 0) tabs[0].click();
  });
  await sleep(1500);

  console.log('Clicking "Bắt đầu trải bài"...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('*')).find(e => e.innerText && e.innerText.trim() === 'Bắt đầu trải bài');
    if (btn) btn.click();
  });
  await sleep(2000);
  await page.screenshot({ path: path.join(artifactDir, 'flow_01_tarot_screen.png') });
  console.log('Captured flow_01_tarot_screen.png');

  // Check if tarot has draw card button or deck selection
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('*')).find(e => e.innerText && (e.innerText.includes('Rút') || e.innerText.includes('Xáo bài') || e.innerText.includes('Chọn bài')));
    if (btn) btn.click();
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(artifactDir, 'flow_02_tarot_drawn.png') });
  console.log('Captured flow_02_tarot_drawn.png');

  // 2. Chat Flow: Click Chat tab
  console.log('Navigating to Chat tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('*')).filter(e => e.innerText && e.innerText.trim() === 'Trò chuyện' && e.getBoundingClientRect().top > 700);
    if (tabs.length > 0) tabs[0].click();
  });
  await sleep(1500);

  // Click Nilaza Oracle or first guide
  console.log('Clicking first persona guide...');
  await page.evaluate(() => {
    const guide = Array.from(document.querySelectorAll('*')).find(e => e.innerText && (e.innerText.includes('Hypatia') || e.innerText.includes('Laozi') || e.innerText.includes('Marcus') || e.innerText.includes('Oracle')));
    if (guide) guide.click();
  });
  await sleep(2000);
  await page.screenshot({ path: path.join(artifactDir, 'flow_03_chat_room.png') });
  console.log('Captured flow_03_chat_room.png');

  // 3. Profile scroll: Click Profile tab, then scroll down to see danger zone and settings
  console.log('Navigating to Profile tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('*')).filter(e => e.innerText && e.innerText.trim() === 'Hồ sơ' && e.getBoundingClientRect().top > 700);
    if (tabs.length > 0) tabs[0].click();
  });
  await sleep(1500);

  // Scroll down profile
  await page.evaluate(() => {
    const scrollContainers = Array.from(document.querySelectorAll('div')).filter(d => d.scrollHeight > d.clientHeight && d.clientHeight > 400);
    for (const c of scrollContainers) {
      c.scrollTop = c.scrollHeight;
    }
  });
  await sleep(1000);
  await page.screenshot({ path: path.join(artifactDir, 'flow_04_profile_bottom.png') });
  console.log('Captured flow_04_profile_bottom.png');

  await browser.close();
  console.log('Completed deep flow audit!');
}

runTarotAndChatFlow().catch(console.error);
