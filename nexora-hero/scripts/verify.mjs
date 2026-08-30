// Headless verification for the NEXORA hero: screenshots + interaction + console/network checks.
// Run against an already-running server: node scripts/verify.mjs http://localhost:3418
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = process.argv[2] || 'http://localhost:3418';
const OUT_DIR = path.resolve(process.cwd(), 'verification');
fs.mkdirSync(OUT_DIR, { recursive: true });

const consoleErrors = [];
const networkErrors = [];
let failed = false;

function fail(msg) {
  failed = true;
  console.error(`FAIL: ${msg}`);
}
function ok(msg) {
  console.log(`OK:   ${msg}`);
}

// Each section gets its own freshly-launched browser process rather than reusing one browser
// across contexts: sequential heavy WebGL pages in a single headless Chromium process were
// observed to hang the browser (likely GPU-process resource pressure under software rendering)
// by the 4th context. A fresh process per section is slower but reliable.
async function withPage(opts, fn) {
  const browser = await chromium.launch();
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[${opts.__label}] ${msg.text()}`);
  });
  page.on('requestfailed', (req) => {
    networkErrors.push(`[${opts.__label}] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`[${opts.__label}] pageerror: ${err.message}`);
  });
  try {
    await fn(page);
  } finally {
    await browser.close();
  }
}

async function waitForCanvasSize(page, label) {
  const size = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight } : null;
  });
  if (!size || size.w <= 2 || size.h <= 2) {
    fail(`${label}: canvas did not size correctly (${JSON.stringify(size)})`);
  } else {
    ok(`${label}: canvas sized ${size.w}x${size.h} (css ${size.cw}x${size.ch})`);
  }
  return size;
}

async function getNodeScreenPositions(page) {
  // Wait a moment for DebugProjector's throttled write to land at least once.
  await page.waitForFunction(() => !!window.__NEXORA_NODE_SCREEN_POS__, { timeout: 15000 }).catch(() => {});
  return page.evaluate(() => window.__NEXORA_NODE_SCREEN_POS__ || {});
}

function isPanelVisible(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('div[role="status"]')).some((el) => getComputedStyle(el).display !== 'none'),
  );
}

function visiblePanelLabels(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('div[role="status"]'))
      .filter((el) => getComputedStyle(el).display !== 'none')
      .map((el) => el.getAttribute('aria-label')),
  );
}

async function waitForPanelVisible(page, timeout = 20000) {
  return page
    .waitForFunction(
      () => Array.from(document.querySelectorAll('div[role="status"]')).some((el) => getComputedStyle(el).display !== 'none'),
      { timeout },
    )
    .then(() => true)
    .catch(() => false);
}

async function waitForPanelHidden(page, timeout = 20000) {
  return page
    .waitForFunction(
      () => !Array.from(document.querySelectorAll('div[role="status"]')).some((el) => getComputedStyle(el).display !== 'none'),
      { timeout },
    )
    .then(() => true)
    .catch(() => false);
}

const NODE_LABELS = {
  AI_CORE: 'NEXORA AI',
  INSTAGRAM_NODE: 'Instagram',
  WHATSAPP_NODE: 'WhatsApp',
  CRM_NODE: 'AI CRM',
  FOLLOWUP_NODE: 'Follow-up',
  APPOINTMENT_NODE: 'Appointment',
  CUSTOMER_NODE: 'Customer',
};
const NODE_IDS = Object.keys(NODE_LABELS);

async function run() {
  // ---- Desktop ----
  await withPage({ viewport: { width: 1440, height: 900 }, __label: 'desktop' }, async (page) => {
    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    await waitForCanvasSize(page, 'desktop initial');

    await page.screenshot({ path: path.join(OUT_DIR, 'desktop-hero.png') });
    ok('desktop-hero.png captured');

    // No horizontal page overflow — a common way full-bleed hero canvases break layout.
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    if (overflow.scrollWidth > overflow.clientWidth) {
      fail(`horizontal overflow: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`);
    } else {
      ok(`no horizontal overflow (scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth})`);
    }

    const bodyText = await page.textContent('body');
    for (const needle of [
      'Every conversation.',
      'One intelligent workspace.',
      'Start free',
      'See how it works',
      'UNIFIED INBOX',
      'AI CRM',
      'FOLLOW-UPS',
    ]) {
      if (!bodyText.includes(needle)) fail(`copy missing: "${needle}"`);
    }
    ok('hero + feature strip copy present');

    // Scroll to feature strip
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, 'desktop-feature-strip.png') });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    // Composition check: every node's projected x must sit right of the copy column
    // (max-w-xl + padding ≈ 40%% of a 1440 viewport) so the 3D never overlaps the hero copy.
    const positions = await getNodeScreenPositions(page);
    const ids = Object.keys(positions);
    if (ids.length === 0) {
      fail('DebugProjector produced no node screen positions');
    } else {
      const COPY_RIGHT_EDGE = 1440 * 0.42;
      const offenders = ids.filter((id) => positions[id].x < COPY_RIGHT_EDGE);
      if (offenders.length > 0) {
        fail(`nodes overlapping the copy column (x < ${COPY_RIGHT_EDGE}): ${offenders.map((id) => `${id}@${positions[id].x.toFixed(0)}`).join(', ')}`);
      } else {
        ok(`composition: all ${ids.length} nodes stay right of x=${COPY_RIGHT_EDGE.toFixed(0)}`);
      }
    }

    // ---- Hover every node in turn ---- (re-fetch position each time: idle sway keeps moving them)
    // Move the pointer far away between nodes so each check starts from a clean "unhovered" state.
    for (const nodeId of NODE_IDS) {
      await page.mouse.move(1400, 850, { steps: 3 });
      await waitForPanelHidden(page, 8000);

      const pos = await getNodeScreenPositions(page);
      const p = pos[nodeId];
      if (!p) {
        fail(`hover ${nodeId}: no screen position available`);
        continue;
      }
      await page.mouse.move(p.x, p.y, { steps: 8 });
      // Poll rather than a fixed wait: this headless/software-rendered environment can run the
      // render loop far slower than real hardware (confirmed: simple evaluate()/screenshot calls
      // here have taken up to ~13s under load), so a fixed short wait is flaky even though the
      // underlying hover state (see cursor style) updates instantly on real hardware.
      const visible = await waitForPanelVisible(page, 20000);
      if (!visible) {
        fail(`hover ${nodeId}: info panel did not appear`);
        continue;
      }
      const labels = await visiblePanelLabels(page);
      const expected = NODE_LABELS[nodeId];
      if (labels.some((l) => l?.startsWith(`${expected}:`))) {
        ok(`hover ${nodeId}: correct info panel visible (${labels.join(', ')})`);
      } else {
        fail(`hover ${nodeId}: panel visible but label mismatch — expected "${expected}:...", got ${JSON.stringify(labels)}`);
      }
      if (nodeId === 'AI_CORE') {
        await page.screenshot({ path: path.join(OUT_DIR, 'desktop-hover.png') });
      }
    }

    // ---- Click AI_CORE to activate ----
    await page.mouse.move(1400, 850, { steps: 3 });
    await waitForPanelHidden(page, 8000);
    let fresh = await getNodeScreenPositions(page);
    await page.mouse.click(fresh.AI_CORE.x, fresh.AI_CORE.y);
    const activeVisible = await waitForPanelVisible(page, 20000);
    await page.screenshot({ path: path.join(OUT_DIR, 'desktop-click-active.png') });
    if (activeVisible) ok('click AI_CORE: panel visible (active state)');
    else fail('click AI_CORE: panel did not appear after click');

    // ---- Click the SAME node again: should toggle off ----
    fresh = await getNodeScreenPositions(page);
    await page.mouse.click(fresh.AI_CORE.x, fresh.AI_CORE.y);
    const toggledOff = await waitForPanelHidden(page, 20000);
    if (toggledOff) ok('click same node again: toggled off');
    else fail('click same node again: panel still visible (toggle-off did not happen)');

    // ---- Click AI_CORE again, then click away: should clear ----
    fresh = await getNodeScreenPositions(page);
    await page.mouse.click(fresh.AI_CORE.x, fresh.AI_CORE.y);
    await waitForPanelVisible(page, 20000);
    // top-right: on the canvas background, not the interactive copy column
    await page.mouse.click(1400, 40);
    const clearedVisible = await waitForPanelHidden(page, 20000);
    await page.screenshot({ path: path.join(OUT_DIR, 'desktop-click-away.png') });
    if (clearedVisible) ok('click-away: panel cleared');
    else fail('click-away: panel still visible after clicking empty space');

    // ---- Camera returns to default after defocusing ----
    // Give the eased camera time to settle back, then re-check composition against the same
    // baseline used above — if focus/defocus left the camera stuck off-center, this would fail.
    await page.waitForTimeout(2500);
    const settledPositions = await getNodeScreenPositions(page);
    const settledIds = Object.keys(settledPositions);
    const COPY_RIGHT_EDGE_2 = 1440 * 0.42;
    const stillOffenders = settledIds.filter((id) => settledPositions[id].x < COPY_RIGHT_EDGE_2);
    if (stillOffenders.length === 0) {
      ok('camera returned to default: composition still clean after defocus');
    } else {
      fail(`camera did not return to default cleanly: ${stillOffenders.map((id) => `${id}@${settledPositions[id].x.toFixed(0)}`).join(', ')}`);
    }
  });

  // ---- Mobile ----
  await withPage(
    { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, __label: 'mobile' },
    async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'load' });
      await page.waitForTimeout(3000);
      await waitForCanvasSize(page, 'mobile initial');
      await page.screenshot({ path: path.join(OUT_DIR, 'mobile-hero.png') });
      ok('mobile-hero.png captured');

      const perf = await page.evaluate(() => window.__NEXORA_PERF_TIER__ ?? null);
      console.log(`INFO: mobile perf tier reported = ${perf}`);
      if (perf !== 'low') fail(`mobile perf tier expected 'low', got '${perf}'`);
      else ok("mobile perf tier correctly downgraded to 'low'");
    },
  );

  // ---- Resize ----
  await withPage({ viewport: { width: 1440, height: 900 }, __label: 'resize' }, async (page) => {
    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);
    await waitForCanvasSize(page, 'after resize to 1024x768');
    await page.screenshot({ path: path.join(OUT_DIR, 'resize-1024.png') });
  });

  // ---- Reduced motion ----
  await withPage(
    { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', __label: 'reduced-motion' },
    async (page) => {
      await page.goto(BASE_URL, { waitUntil: 'load' });
      await page.waitForTimeout(3000);
      await waitForCanvasSize(page, 'reduced-motion initial');
      const flag = await page.evaluate(() => window.__NEXORA_REDUCED_MOTION__ ?? null);
      if (flag === true) ok('reduced-motion flag correctly detected as true');
      else fail(`reduced-motion flag expected true, got ${flag}`);
      await page.screenshot({ path: path.join(OUT_DIR, 'reduced-motion.png') });
      ok('reduced-motion.png captured');
    },
  );

  console.log('\n--- Console errors ---');
  consoleErrors.forEach((e) => console.log(e));
  console.log(`Total console errors: ${consoleErrors.length}`);

  console.log('\n--- Network errors ---');
  networkErrors.forEach((e) => console.log(e));
  console.log(`Total network errors: ${networkErrors.length}`);

  if (consoleErrors.length > 0) fail(`${consoleErrors.length} console error(s) captured`);
  if (networkErrors.length > 0) fail(`${networkErrors.length} network error(s) captured`);

  if (failed) {
    console.error('\nVERIFICATION FAILED');
    process.exit(1);
  } else {
    console.log('\nVERIFICATION PASSED');
  }
}

const HARD_TIMEOUT_MS = 480000;
const timer = setTimeout(() => {
  console.error(`\nFAIL: verify.mjs exceeded hard timeout of ${HARD_TIMEOUT_MS}ms — killing`);
  process.exit(1);
}, HARD_TIMEOUT_MS);
timer.unref?.();

run()
  .then(() => clearTimeout(timer))
  .catch((err) => {
    clearTimeout(timer);
    console.error(err);
    process.exit(1);
  });
