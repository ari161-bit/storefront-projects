import { chromium } from 'playwright';
const BASE_URL = process.argv[2] || 'http://localhost:3418';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => console.log('CONSOLE', m.type(), m.text()));
await page.goto(BASE_URL, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.waitForFunction(() => !!window.__NEXORA_NODE_SCREEN_POS__ && Object.keys(window.__NEXORA_NODE_SCREEN_POS__).length > 0);
const pos = await page.evaluate(() => window.__NEXORA_NODE_SCREEN_POS__);
console.log('AI_CORE pos:', pos.AI_CORE);
await page.mouse.move(pos.AI_CORE.x, pos.AI_CORE.y, { steps: 8 });
await page.waitForTimeout(400);
const cursor = await page.evaluate(() => document.body.style.cursor);
console.log('cursor after hover:', cursor);
const panelDisplay = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('div[role="status"]'));
  return els.map(el => ({ label: el.getAttribute('aria-label'), display: getComputedStyle(el).display, opacity: getComputedStyle(el).opacity }));
});
console.log('all panels:', JSON.stringify(panelDisplay));
// move again slightly to force a fresh pointermove
await page.mouse.move(pos.AI_CORE.x + 3, pos.AI_CORE.y + 3, { steps: 3 });
await page.waitForTimeout(400);
const cursor2 = await page.evaluate(() => document.body.style.cursor);
console.log('cursor after 2nd hover nudge:', cursor2);
const panelDisplay2 = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('div[role="status"]'));
  return els.map(el => ({ label: el.getAttribute('aria-label'), display: getComputedStyle(el).display }));
});
console.log('panels after 2nd nudge:', JSON.stringify(panelDisplay2));
await browser.close();
