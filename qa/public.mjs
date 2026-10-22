import { chromium } from 'file:///D:/codexAI/.runtime/browser-tools/node_modules/pwcore/index.mjs';

const pages = 'https://yjj0339.github.io/pinecone-club/';
const executablePath = 'D:/codexAI/.runtime/browsers/chromium-1234/chrome-win64/chrome.exe';
let failures = 0;

function log(name, ok, detail = '') {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
}

async function main() {
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--no-proxy-server', '--disable-dev-shm-usage'] });
  const contextA = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const pageA = await contextA.newPage();
  await pageA.goto(pages, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pageA.waitForSelector('#pc-name', { timeout: 20000 });
  await pageA.waitForFunction(() => document.querySelector('#pc-conn-text')?.textContent === '已连接', { timeout: 45000 });
  log('打开线上页面后自动发现服务器并连接', true);

  await pageA.fill('#pc-name', '线上甲');
  await pageA.click('[data-game="gomoku"]');
  await pageA.waitForSelector('#pc-room-code', { timeout: 15000 });
  const code = (await pageA.textContent('#pc-room-code')).trim();
  log('线上页面创建房间', /^\d{6}$/.test(code), code);

  await pageA.click('#pc-copy-link');
  await pageA.waitForTimeout(400);
  const invited = await pageA.evaluate(() => navigator.clipboard.readText().catch(() => '')).catch(() => '');
  const expected = `${pages}?room=${code}`;
  log('邀请链接只带房号（服务器地址自动发现）', invited === expected, invited || '(剪贴板不可读)');

  const contextB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageB = await contextB.newPage();
  const target = invited || expected;
  await pageB.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pageB.waitForSelector('#pc-name', { timeout: 20000 });
  await pageB.waitForFunction(() => document.querySelector('#pc-conn-text')?.textContent === '已连接', { timeout: 45000 });
  await pageB.waitForFunction((want) => document.querySelector('#pc-code')?.value === want, code, { timeout: 10000 }).catch(() => {});
  const prefilled = await pageB.inputValue('#pc-code');
  log('邀请链接打开后房号已预填', prefilled === code, `预填=${prefilled}`);
  await pageB.fill('#pc-name', '线上乙');
  await pageB.click('#pc-join');
  await pageB.waitForSelector('#pc-ready', { timeout: 15000 });
  const seats = await pageB.locator('.pc-ticket:not(.pc-empty-seat)').count();
  log('邀请链接直接进入房间', seats === 2, `座位=${seats}`);

  const roomTitle = await pageB.locator('.pc-room-code').textContent();
  log('双方看到同一房号', roomTitle.trim() === code);

  await browser.close();
  console.log('');
  console.log(`通过 ${5 - failures + 1} / ${6}`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error('公网自动发现与邀请链接验收失败：', error.message);
  process.exit(1);
});