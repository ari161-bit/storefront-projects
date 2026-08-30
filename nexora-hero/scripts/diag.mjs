import { chromium } from 'playwright';

const BASE_URL = process.argv[2] || 'http://localhost:3418';
const COPY_RIGHT_EDGE = 1440 * 0.42;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(15000);
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(BASE_URL, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page
  .waitForFunction(() => !!window.__NEXORA_NODE_SCREEN_POS__ && Object.keys(window.__NEXORA_NODE_SCREEN_POS__).length > 0, { timeout: 8000 })
  .catch((e) => console.log('waitForFunction timed out:', e.message));

async function samplePositions(label) {
  const positions = await page.evaluate(() => window.__NEXORA_NODE_SCREEN_POS__ || {});
  const offenders = Object.entries(positions).filter(([, p]) => p.x < COPY_RIGHT_EDGE);
  console.log(
    `[${label}] ` +
      Object.entries(positions)
        .map(([id, p]) => `${id}=${p.x.toFixed(0)}`)
        .join(' '),
  );
  if (offenders.length) console.log(`[${label}] OFFENDERS: ${offenders.map(([id, p]) => `${id}@${p.x.toFixed(0)}`).join(', ')}`);
  return positions;
}

// Sample across a good chunk of the idle sway cycle (period ~52s) without waiting the full thing.
for (const wait of [0, 3000, 6000, 9000, 12000]) {
  await page.waitForTimeout(wait === 0 ? 0 : 3000);
  await samplePositions(`idle t+${(await page.evaluate(() => performance.now())).toFixed(0)}ms`);
}

const positions = await page.evaluate(() => window.__NEXORA_NODE_SCREEN_POS__ || {});
if (positions.AI_CORE) {
  const { x, y } = positions.AI_CORE;
  const elInfo = await page.evaluate(
    ([ex, ey]) => {
      const el = document.elementFromPoint(ex, ey);
      return el ? { tag: el.tagName, id: el.id, cls: el.className?.toString?.() } : null;
    },
    [x, y],
  );
  console.log('elementFromPoint at AI_CORE:', elInfo);

  await page.mouse.move(x, y, { steps: 8 });
  await page.waitForTimeout(600);
  const panelAfterHover = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('div[role="status"]'));
    return els
      .map((el) => ({ display: getComputedStyle(el).display, label: el.getAttribute('aria-label') }))
      .filter((p) => p.display !== 'none');
  });
  console.log('Visible panels after hovering AI_CORE:', JSON.stringify(panelAfterHover));

  // click each node in turn, checking other nodes' composition while focused
  for (const id of Object.keys(positions)) {
    const fresh = await page.evaluate(() => window.__NEXORA_NODE_SCREEN_POS__ || {});
    const p = fresh[id];
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(1200);
    const focusedPositions = await page.evaluate(() => window.__NEXORA_NODE_SCREEN_POS__ || {});
    const offenders = Object.entries(focusedPositions).filter(([, pp]) => pp.x < COPY_RIGHT_EDGE);
    const activeVisible = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div[role="status"]')).some((el) => getComputedStyle(el).display !== 'none'),
    );
    console.log(
      `[focus ${id}] active panel visible=${activeVisible} offenders=${offenders.length ? offenders.map(([oid, op]) => `${oid}@${op.x.toFixed(0)}`).join(',') : 'none'}`,
    );
    await page.mouse.click(40, 40);
    await page.waitForTimeout(600);
  }
}

await browser.close();
