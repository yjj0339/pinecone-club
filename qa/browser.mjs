import { chromium } from 'file:///D:/codexAI/.runtime/browser-tools/node_modules/pwcore/index.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] || 'http://127.0.0.1:4460';
const serverHint = process.argv[3] || base;
const outDir = join(process.cwd(), 'artifacts');
mkdirSync(outDir, { recursive: true });

const executablePath = 'D:/codexAI/.runtime/browsers/chromium-1234/chrome-win64/chrome.exe';
const results = [];
let failures = 0;

function log(name, ok, detail = '') {
  results.push({ name, ok });
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
}

function watch(page, label, bucket) {
  page.on('pageerror', (error) => bucket.push(`${label} pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (!text.includes('favicon') && !text.includes('404 (File not found)')) bucket.push(`${label} console: ${text}`);
    }
  });
}

async function joinUrl(hash = '') {
  const url = new URL(base);
  url.searchParams.set('s', serverHint);
  if (hash) url.hash = hash;
  return url.toString();
}

async function main() {
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const errors = [];

  const contextA = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const pageA = await contextA.newPage();
  watch(pageA, '房主', errors);
  await pageA.goto(await joinUrl(), { waitUntil: 'networkidle' });
  await pageA.waitForSelector('#pc-name', { timeout: 15000 });
  log('大厅加载出昵称与游戏卡片', await pageA.locator('[data-game]').count() === 20);
  await pageA.screenshot({ path: join(outDir, 'laptop-lobby.png'), fullPage: true });

  const status = await pageA.textContent('#pc-conn-text');
  log('连接状态为已连接', status.includes('已连接'), `状态=${status}`);

  await pageA.fill('#pc-name', '松果甲');
  await pageA.click('[data-game="gomoku"]');
  await pageA.waitForSelector('#pc-room-code', { timeout: 15000 });
  const code = (await pageA.textContent('#pc-room-code')).trim();
  log('创建房间拿到六位房号', /^\d{6}$/.test(code), code);
  await pageA.screenshot({ path: join(outDir, 'laptop-room.png'), fullPage: true });

  const contextB = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const pageB = await contextB.newPage();
  watch(pageB, '客人', errors);
  await pageB.goto(await joinUrl(), { waitUntil: 'networkidle' });
  await pageB.waitForSelector('#pc-name', { timeout: 15000 });
  await pageB.fill('#pc-name', '松果乙');
  await pageB.fill('#pc-code', code);
  await pageB.click('#pc-join');
  await pageB.waitForSelector('#pc-ready', { timeout: 15000 });
  const seats = await pageB.locator('.pc-ticket:not(.pc-empty-seat)').count();
  log('第二人用房号进入房间', seats === 2, `座位票=${seats}`);

  await pageA.click('#pc-ready');
  await pageB.click('#pc-ready');
  await pageA.waitForSelector('.pc-stage', { timeout: 15000 });
  await pageB.waitForSelector('.pc-stage', { timeout: 15000 });
  log('双方准备后进入对局舞台', true);

  await pageA.waitForSelector('.tws-gomoku-cell', { timeout: 10000 });
  log('五子棋棋盘渲染', await pageA.locator('.tws-gomoku-cell').count() === 225);

  const first = pageA.locator('.tws-gomoku-cell').nth(112);
  await first.click();
  await pageB.waitForFunction(() => {
    const cell = document.querySelectorAll('.tws-gomoku-cell')[112];
    return cell && cell.dataset.stone;
  }, { timeout: 8000 });
  log('房主落子同步到客人画面', true);

  const second = pageB.locator('.tws-gomoku-cell').nth(111);
  await second.click();
  await pageA.waitForFunction(() => {
    const cell = document.querySelectorAll('.tws-gomoku-cell')[111];
    return cell && cell.dataset.stone;
  }, { timeout: 8000 });
  log('客人落子同步到房主画面', true);
  await pageA.screenshot({ path: join(outDir, 'laptop-match.png'), fullPage: true });

  await pageA.screenshot({ path: join(outDir, 'laptop-match.png'), fullPage: true });
  await pageA.click('#pc-resign');
  await pageA.waitForSelector('.pc-modal[open]', { timeout: 5000 });
  await pageA.click('.pc-modal [data-ok]');
  await pageB.waitForSelector('.pc-overlay-title', { timeout: 10000 });
  log('认输后客人看到结算覆盖层', true);
  await pageB.screenshot({ path: join(outDir, 'laptop-result.png'), fullPage: true });

  const mobile = await browser.newContext({ viewport: { width: 320, height: 720 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pageM = await mobile.newPage();
  watch(pageM, '手机', errors);
  await pageM.goto(await joinUrl(), { waitUntil: 'networkidle' });
  await pageM.waitForSelector('#pc-name', { timeout: 15000 });
  const overflow = await pageM.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  log('320px 视口无横向滚动', overflow <= 1, `溢出=${overflow}px`);
  await pageM.screenshot({ path: join(outDir, 'mobile-lobby.png'), fullPage: true });

  const touchMin = await pageM.evaluate(() => {
    const nodes = [...document.querySelectorAll('button')].slice(0, 40);
    return nodes.reduce((min, node) => {
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return min;
      return Math.min(min, Math.min(rect.width, rect.height));
    }, 999);
  });
  log('主要按钮触摸目标 ≥ 44px', touchMin >= 43.5, `最小=${Math.round(touchMin)}px`);

  log('浏览器无未捕获错误', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log('');
  console.log(`通过 ${results.length - failures} / ${results.length}`);
  console.log(`截图：${outDir}`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error('浏览器验收失败：', error.message);
  process.exit(1);
});