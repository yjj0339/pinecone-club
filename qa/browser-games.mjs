import { chromium } from 'file:///D:/codexAI/.runtime/browser-tools/node_modules/pwcore/index.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] || 'http://127.0.0.1:4460';
const outDir = join(process.cwd(), 'artifacts', 'games');
mkdirSync(outDir, { recursive: true });

const games = [
  ['gomoku', '五子棋'], ['fleet', '雾中舰队'], ['dots', '点格领地'], ['reversi', '黑白棋'], ['mines', '雷区漫步'],
  ['memory', '记忆翻牌'], ['quiz', '灵光问答'], ['g2048', '2048 对决'], ['sudoku', '数独竞速'], ['simon', '回声序列'],
  ['hockey', '桌面冰球'], ['tanks', '铁皮坦克'], ['bomber', '泡泡爆破'], ['snake', '长蛇竞技'], ['tetris', '落块对战'],
  ['slingshot', '弹弓攻城'], ['maze', '迷宫夺旗'], ['rps', '石头剪刀布'], ['reaction', '抢拍反应'], ['typing', '打字竞速'],
];

const executablePath = 'D:/codexAI/.runtime/browsers/chromium-1234/chrome-win64/chrome.exe';
let failures = 0;
const errors = [];

function log(name, ok, detail = '') {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
}

function watch(page, label) {
  page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (!text.includes('favicon')) errors.push(`${label}: ${text}`);
    }
  });
}

async function url() {
  const target = new URL(base);
  target.searchParams.set('s', base);
  return target.toString();
}

async function openLobby(browser, label) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  watch(page, label);
  await page.goto(await url(), { waitUntil: 'networkidle' });
  await page.waitForSelector('#pc-name', { timeout: 15000 });
  return { context, page };
}

async function main() {
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const [id, name] of games) {
    const a = await openLobby(browser, `${name}甲`);
    const b = await openLobby(browser, `${name}乙`);
    try {
      await a.page.fill('#pc-name', '松果甲');
      await a.page.click(`[data-game="${id}"]`);
      await a.page.waitForSelector('#pc-room-code', { timeout: 10000 });
      const code = (await a.page.textContent('#pc-room-code')).trim();
      await b.page.fill('#pc-name', '松果乙');
      await b.page.fill('#pc-code', code);
      await b.page.click('#pc-join');
      await b.page.waitForSelector('#pc-ready', { timeout: 10000 });
      await a.page.click('#pc-ready');
      await b.page.click('#pc-ready');
      await a.page.waitForSelector('#pc-game-root > *', { timeout: 15000 });
      await b.page.waitForSelector('#pc-game-root > *', { timeout: 15000 });
      await a.page.waitForTimeout(350);
      const mounted = await a.page.evaluate(() => {
        const root = document.querySelector('#pc-game-root');
        const nodes = [...root.querySelectorAll('*')];
        return {
          children: root.children.length,
          tws: nodes.some((node) => [...node.classList].some((token) => token.startsWith('tws-'))),
          controls: root.querySelectorAll('button, canvas, input').length,
          height: Math.round(document.querySelector('.pc-stage').getBoundingClientRect().height),
        };
      });
      log(`${name}（${id}）视图挂载`, mounted.children > 0 && mounted.tws && mounted.controls > 0, JSON.stringify(mounted));
      await a.page.screenshot({ path: join(outDir, `${id}.png`), fullPage: true });
    } finally {
      await a.context.close();
      await b.context.close();
    }
  }
  log('20 款视图全部无未捕获错误', errors.length === 0, errors.slice(0, 5).join(' | '));
  await browser.close();
  console.log('');
  console.log(`通过 ${games.length + 1 - failures} / ${games.length + 1}`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error('20 款视图浏览器验收失败：', error.message);
  process.exit(1);
});