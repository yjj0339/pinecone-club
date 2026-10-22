import { io } from 'socket.io-client';
import { createApp } from '../server/index.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
let failures = 0;

function log(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
}

async function until(check, timeout = 5000, label = 'condition') {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = check();
    if (value) return value;
    await sleep(25);
  }
  throw new Error(`等待超时：${label}`);
}

function connect(url) {
  const socket = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  const snapshots = [];
  const closed = [];
  socket.on('snap', (snap) => snapshots.push(snap));
  socket.on('closed', (payload) => closed.push(payload));
  const request = (event, payload = {}) => new Promise((resolve) => {
    socket.timeout(5000).emit(event, payload, (error, result) => resolve(error ? { ok: false, code: 'TIMEOUT' } : result));
  });
  return {
    socket,
    snapshots,
    closed,
    request,
    latest: () => snapshots[snapshots.length - 1],
    async ready() {
      if (socket.connected) return;
      await new Promise((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
      });
    },
  };
}

async function main() {
  const app = createApp({ port: 0, persist: false, countdownMs: 200 });
  const port = await app.listen(0);
  const url = `http://127.0.0.1:${port}`;
  console.log(`服务端：${url}`);

  const health = await (await fetch(`${url}/health`)).json();
  log('健康检查返回 20 款游戏', health.ok === true && health.games === 20, `games=${health.games}`);

  const host = connect(url);
  const guest = connect(url);
  await host.ready();
  await guest.ready();
  log('两个客户端建立 Socket.IO 连接', host.socket.connected && guest.socket.connected);

  const created = await host.request('create', { name: '云端甲', gameId: 'gomoku' });
  log('创建房间并拿到六位房号', created.ok && /^\d{6}$/.test(created.code), `code=${created.code}`);

  const joined = await guest.request('join', { code: created.code, name: '云端乙' });
  log('第二人用房号加入', joined.ok === true && joined.seat === 1);

  const waiting = await until(() => guest.snapshots.find((snap) => snap.room.players[1]), 3000, '两人同房');
  log('双方看到同一房间与对方昵称', waiting.room.players[0].name === '云端甲' && waiting.room.players[1].name === '云端乙');

  const switched = await host.request('select', { gameId: 'gomoku', series: 3 });
  log('房主设置三局系列赛', switched.ok === true);

  await host.request('ready', { ready: true });
  await guest.request('ready', { ready: true });
  const live = await until(() => guest.snapshots.find((snap) => snap.room.phase === 'live'), 4000, '同步开局');
  log('双方准备后同步进入 live', live.room.phase === 'live');
  log('开局时两边看到的同一帧', live.room.series.total === 3);

  const wrongTurn = await guest.request('act', { seq: 1, action: { type: 'place', index: 0 } });
  log('非当前回合操作被拒绝', wrongTurn.ok === false && wrongTurn.code === 'MOVE');

  const moved = await host.request('act', { seq: 1, action: { type: 'place', index: 112 } });
  log('合法落子被接受', moved.ok === true);

  const synced = await until(() => {
    const snap = guest.latest();
    return snap && snap.game.board && snap.game.board[112] === 0 ? snap : null;
  }, 3000, '落子同步');
  log('对手端同步看到落子', synced.game.board[112] === 0);

  guest.socket.close();
  const paused = await until(() => host.snapshots.find((snap) => snap.room.paused), 3000, '掉线冻结');
  log('对手掉线后对局冻结', paused.room.paused === true);

  const revived = connect(url);
  await revived.ready();
  const resumed = await revived.request('resume', { code: created.code, token: joined.token });
  log('用身份牌恢复座位', resumed.ok === true && resumed.seat === 1);
  const unpaused = await until(() => host.snapshots.find((snap) => snap.room.phase === 'live' && !snap.room.paused), 3000, '解除冻结');
  log('恢复后解除冻结并继续', unpaused.room.paused === false);

  const resigned = await host.request('resign');
  log('认输结束本局', resigned.ok === true);
  const done = await until(() => revived.snapshots.find((snap) => snap.room.phase === 'done'), 3000, '结算');
  log('结算结果与系列比分正确', done.room.result.winner === 1 && done.room.series.wins[1] === 1);
  const hostAgain = await host.request('again');
  log('认输离场后无法独自重开', hostAgain.ok === false && hostAgain.code === 'AUTH');
  revived.socket.close();

  const host2 = connect(url);
  const guest2 = connect(url);
  await host2.ready();
  await guest2.ready();
  const created2 = await host2.request('create', { name: '松果丙', gameId: 'typing' });
  const joined2 = await guest2.request('join', { code: created2.code, name: '松果丁' });
  log('新房间换打字竞速并双人加入', created2.ok === true && joined2.ok === true && joined2.seat === 1);
  await host2.request('select', { gameId: 'typing', series: 3 });
  await host2.request('ready', { ready: true });
  await guest2.request('ready', { ready: true });
  const typingLive = await until(() => host2.snapshots.find((snap) => snap.room.phase === 'live'), 4000, '打字竞速开局');
  const sentence = typingLive.game.target;
  log('打字竞速双方拿到同一句', typeof sentence === 'string' && sentence.length > 0, `句子=${sentence}`);
  const typed = await host2.request('act', { seq: 1, action: { type: 'input', value: sentence } });
  log('先打完的一方获胜', typed.ok === true);
  const done2 = await until(() => guest2.snapshots.find((snap) => snap.room.phase === 'done'), 3000, '打字竞速结算');
  log('打字竞速记分正确', done2.room.result.winner === 0 && done2.room.series.wins[0] === 1);

  await host2.request('again');
  await guest2.request('again');
  const next = await until(() => guest2.snapshots.find((snap) => snap.room.phase === 'starting' && snap.room.series.round === 2), 3000, '第二局倒计时');
  log('双方再来一局进入第二局', next.room.series.round === 2);
  const liveTwo = await until(() => guest2.snapshots.find((snap) => snap.room.phase === 'live' && snap.room.series.round === 2), 4000, '第二局开局');
  const sentenceTwo = liveTwo.game.target;
  const typedTwo = await guest2.request('act', { seq: 1, action: { type: 'input', value: sentenceTwo } });
  log('第二局换对手获胜', typedTwo.ok === true);
  const done3 = await until(() => host2.snapshots.find((snap) => snap.room.phase === 'done' && snap.room.series.round === 2), 3000, '第二局结算');
  log('第二局比分更新', done3.room.result.winner === 1 && done3.room.series.wins[1] === 1);

  const changed = await host2.request('change');
  log('房主换游戏回到准备状态', changed.ok === true);
  const waitingRoom = await until(() => guest2.snapshots.find((snap) => snap.room.phase === 'waiting'), 3000, '回到等待');
  log('换游戏后系列比分清零', waitingRoom.room.series.wins[0] === 0 && waitingRoom.room.series.wins[1] === 0);

  const left = await guest2.request('leave');
  const closed = await until(() => host2.closed.length > 0, 3000, '关闭通知');
  log('离开房间关闭房间并通知对方', left.ok === true && closed);

  const late = connect(url);
  await late.ready();
  const rejoined = await late.request('join', { code: created2.code, name: '迟到者' });
  log('关闭后的房号不再可用', rejoined.ok === false && rejoined.code === 'NOTFOUND');

  for (const client of [host, guest, revived, host2, guest2, late]) client.socket.close();
  app.rooms.stop();
  app.io.close();
  await new Promise((resolve) => app.httpServer.close(resolve));

  console.log('');
  console.log(`通过 ${results.length - failures} / ${results.length}`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error('冒烟失败：', error.message);
  process.exit(1);
});