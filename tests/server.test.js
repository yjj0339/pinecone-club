import test from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { createApp } from '../server/index.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(check, timeout = 4000, label = 'condition') {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = check();
    if (value) return value;
    await sleep(20);
  }
  throw new Error(`等待超时：${label}`);
}

function connect(url) {
  const socket = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  const snapshots = [];
  socket.on('snap', (snap) => snapshots.push(snap));
  const closed = [];
  socket.on('closed', (payload) => closed.push(payload));
  const request = (event, payload = {}) => new Promise((resolve) => {
    socket.timeout(4000).emit(event, payload, (error, result) => {
      resolve(error ? { ok: false, code: 'TIMEOUT', message: 'timeout' } : result);
    });
  });
  const latest = () => snapshots[snapshots.length - 1];
  return {
    socket,
    snapshots,
    closed,
    request,
    latest,
    async ready() {
      if (socket.connected) return;
      await new Promise((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
      });
    },
  };
}

async function bootstrap(t) {
  const app = createApp({ port: 0, persist: false, countdownMs: 120 });
  const port = await app.listen(0);
  const url = `http://127.0.0.1:${port}`;
  t.after(async () => {
    app.rooms.stop();
    app.io.close();
    await new Promise((resolve) => app.httpServer.close(resolve));
  });
  return { app, port, url };
}

test('健康检查与房间错误状态', async (t) => {
  const { url } = await bootstrap(t);
  const response = await fetch(`${url}/health`);
  const health = await response.json();
  assert.equal(health.ok, true);
  assert.equal(health.games, 20);

  const guest = connect(url);
  await guest.ready();
  const missing = await guest.request('join', { code: '000000', name: '阿绿' });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, 'NOTFOUND');
  const badGame = await guest.request('create', { name: '阿橙', gameId: 'nope' });
  assert.equal(badGame.ok, true);
  assert.equal(badGame.seat, 0);
  const snapshot = await until(() => guest.latest(), 2000, '首帧快照');
  assert.equal(snapshot.room.phase, 'waiting');
  assert.equal(snapshot.room.gameId, 'gomoku');
  assert.equal(snapshot.me.seat, 0);

  const second = await guest.request('create', { name: '再来', gameId: 'gomoku' });
  assert.equal(second.ok, false);
  assert.equal(second.code, 'BUSY');

  const host = connect(url);
  await host.ready();
  const joined = await host.request('join', { code: snapshot.room.code, name: '客人' });
  assert.equal(joined.ok, true);
  assert.equal(joined.seat, 1);
  const full = connect(url);
  await full.ready();
  const rejected = await full.request('join', { code: snapshot.room.code, name: '第三人' });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.code, 'FULL');
  guest.socket.close();
  host.socket.close();
  full.socket.close();
});

test('完整对局流程：准备、同步开局、操作校验、结算、再来一局', async (t) => {
  const { url } = await bootstrap(t);
  const host = connect(url);
  const guest = connect(url);
  await host.ready();
  await guest.ready();
  const created = await host.request('create', { name: '阿橙', gameId: 'gomoku' });
  assert.equal(created.ok, true);
  const joined = await guest.request('join', { code: created.code, name: '阿绿' });
  assert.equal(joined.ok, true);

  const hostSnap = await until(() => host.latest(), 2000, '房主快照');
  assert.equal(hostSnap.room.players[1].name, '阿绿');

  const guestSelect = await guest.request('select', { gameId: 'reversi', series: 3 });
  assert.equal(guestSelect.ok, false);
  assert.equal(guestSelect.code, 'HOST');

  const selected = await host.request('select', { gameId: 'gomoku', series: 3 });
  assert.equal(selected.ok, true);

  const invalidJoin = await guest.request('act', { seq: 1, action: { type: 'place', index: 0 } });
  assert.equal(invalidJoin.ok, false);

  await host.request('ready', { ready: true });
  await guest.request('ready', { ready: true });

  const liveHost = await until(() => host.snapshots.find((snap) => snap.room.phase === 'live'), 3000, '进入对局');
  const liveGuest = await until(() => guest.snapshots.find((snap) => snap.room.phase === 'live'), 3000, '进入对局');
  assert.equal(liveHost.room.series.total, 3);
  assert.equal(liveHost.game.turn, 0);
  assert.equal(liveGuest.game.turn, 0);
  assert.ok(liveGuest.game.turnLeft > 0);

  const wrongTurn = await guest.request('act', { seq: 1, action: { type: 'place', index: 0 } });
  assert.equal(wrongTurn.ok, false);
  assert.equal(wrongTurn.code, 'MOVE');

  const good = await host.request('act', { seq: 1, action: { type: 'place', index: 112 } });
  assert.equal(good.ok, true);
  const duplicate = await host.request('act', { seq: 1, action: { type: 'place', index: 113 } });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.code, 'DUPLICATE');

  const moved = await until(() => {
    const snap = guest.latest();
    return snap && snap.game.board[112] === 0 ? snap : null;
  }, 2000, '落子同步');
  assert.equal(moved.game.turn, 1);
  assert.equal(moved.game.board[112], 0);

  const guestsTurn = await guest.request('act', { seq: 1, action: { type: 'place', index: 111 } });
  assert.equal(guestsTurn.ok, true);

  const resigned = await host.request('resign');
  assert.equal(resigned.ok, true);
  const done = await until(() => guest.snapshots.find((snap) => snap.room.phase === 'done'), 3000, '结算');
  assert.equal(done.room.result.winner, 1);
  assert.equal(done.room.series.wins[1], 1);
  assert.equal(done.room.series.wins[0], 0);
  assert.ok(done.room.result.message.includes('认输'));

  const mark = guest.snapshots.length;
  const guestAgain = await guest.request('again');
  assert.equal(guestAgain.ok, true);
  await sleep(400);
  assert.equal(guest.snapshots.slice(mark).some((snap) => snap.room.phase === 'starting'), false);
  guest.socket.close();
  host.socket.close();
});

test('系列赛推进：双方再来一局、打满重置比分', async (t) => {
  const { url } = await bootstrap(t);
  const host = connect(url);
  const guest = connect(url);
  await host.ready();
  await guest.ready();
  const created = await host.request('create', { name: '甲', gameId: 'typing' });
  const joined = await guest.request('join', { code: created.code, name: '乙' });
  assert.equal(joined.ok, true);
  await host.request('select', { gameId: 'typing', series: 3 });
  await host.request('ready', { ready: true });
  await guest.request('ready', { ready: true });
  const firstLive = await until(() => host.snapshots.find((snap) => snap.room.phase === 'live'), 3000, '第一局开局');
  const firstTarget = firstLive.game.target;

  const first = await host.request('act', { seq: 1, action: { type: 'input', value: firstTarget } });
  assert.equal(first.ok, true);
  const doneOne = await until(() => guest.snapshots.find((snap) => snap.room.phase === 'done'), 3000, '第一局结算');
  assert.equal(doneOne.room.result.winner, 0);
  assert.equal(doneOne.room.series.wins[0], 1);

  assert.equal((await host.request('again')).ok, true);
  assert.equal((await guest.request('again')).ok, true);
  const startingTwo = await until(() => guest.snapshots.find((snap) => snap.room.phase === 'starting' && snap.room.series.round === 2), 3000, '第二局倒计时');
  assert.equal(startingTwo.room.series.wins[0], 1);

  const secondLive = await until(() => host.snapshots.find((snap) => snap.room.phase === 'live' && snap.room.series.round === 2), 4000, '第二局开局');
  const secondTarget = secondLive.game.target;
  assert.equal((await host.request('act', { seq: 2, action: { type: 'input', value: secondTarget } })).ok, true);
  const doneTwo = await until(() => guest.snapshots.find((snap) => snap.room.phase === 'done' && snap.room.series.round === 2), 3000, '第二局结算');
  assert.equal(doneTwo.room.series.wins[0], 2);

  assert.equal((await host.request('again')).ok, true);
  assert.equal((await guest.request('again')).ok, true);
  const startingThree = await until(() => guest.snapshots.find((snap) => snap.room.phase === 'starting' && snap.room.series.round === 3), 3000, '第三局倒计时');
  assert.equal(startingThree.room.series.wins[1], 0);

  const thirdLive = await until(() => guest.snapshots.find((snap) => snap.room.phase === 'live' && snap.room.series.round === 3), 4000, '第三局开局');
  const thirdTarget = thirdLive.game.target;
  assert.equal((await guest.request('act', { seq: 1, action: { type: 'input', value: thirdTarget } })).ok, true);
  const doneThree = await until(() => host.snapshots.find((snap) => snap.room.phase === 'done' && snap.room.series.round === 3), 3000, '第三局结算');
  assert.equal(doneThree.room.result.winner, 1);
  assert.equal(doneThree.room.series.wins[1], 1);

  assert.equal((await host.request('again')).ok, true);
  assert.equal((await guest.request('again')).ok, true);
  const fresh = await until(() => guest.snapshots.find((snap) => snap.room.phase === 'starting' && snap.room.series.round === 1), 3000, '打满后重新开始');
  assert.deepEqual(fresh.room.series.wins, [0, 0]);
  host.socket.close();
  guest.socket.close();
});

test('掉线冻结、身份恢复与超时判负', async (t) => {
  const { url } = await bootstrap(t);
  const host = connect(url);
  const guest = connect(url);
  await host.ready();
  await guest.ready();
  const created = await host.request('create', { name: '阿橙', gameId: 'gomoku' });
  const joined = await guest.request('join', { code: created.code, name: '阿绿' });
  assert.equal(joined.ok, true);
  await host.request('ready', { ready: true });
  await guest.request('ready', { ready: true });
  await until(() => host.snapshots.find((snap) => snap.room.phase === 'live'), 3000, '开局');

  guest.socket.close();
  const paused = await until(() => host.snapshots.find((snap) => snap.room.paused), 3000, '暂停');
  assert.equal(paused.room.paused, true);
  const before = paused.game.turnLeft;

  const revived = connect(url);
  await revived.ready();
  const resumed = await revived.request('resume', { code: created.code, token: joined.token });
  assert.equal(resumed.ok, true);
  assert.equal(resumed.seat, 1);
  const unpaused = await until(() => host.snapshots.find((snap) => snap.room.phase === 'live' && !snap.room.paused), 3000, '解除暂停');
  assert.ok(unpaused.game.turnLeft > 0);
  assert.ok(unpaused.game.turnLeft >= before - 3000);

  const wrongToken = await revived.request('resume', { code: created.code, token: 'badtoken' });
  assert.equal(wrongToken.ok, false);
  assert.equal(wrongToken.code, 'AUTH');
  guest.socket.close();
  host.socket.close();
  revived.socket.close();
});

test('同机双窗：房号加入、离开关闭房间、房号失效', async (t) => {
  const { url } = await bootstrap(t);
  const host = connect(url);
  const guest = connect(url);
  await host.ready();
  await guest.ready();
  const created = await host.request('create', { name: '同桌甲', gameId: 'typing' });
  const joined = await guest.request('join', { code: created.code, name: '同桌乙' });
  assert.equal(joined.ok, true);
  const hostSnap = await until(() => host.latest(), 2000, '快照');
  assert.equal(hostSnap.room.gameId, 'typing');

  const left = await guest.request('leave');
  assert.equal(left.ok, true);
  const closed = await until(() => host.closed.length > 0, 3000, '房间关闭通知');
  assert.ok(closed);
  const gone = connect(url);
  await gone.ready();
  const rejoined = await gone.request('join', { code: created.code, name: '迟到' });
  assert.equal(rejoined.ok, false);
  assert.equal(rejoined.code, 'NOTFOUND');
  guest.socket.close();
  host.socket.close();
  gone.socket.close();
});