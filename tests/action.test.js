import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import * as hockey from '../games/hockey.engine.js';
import * as tanks from '../games/tanks.engine.js';
import * as bomber from '../games/bomber.engine.js';
import * as snake from '../games/snake.engine.js';
import * as tetris from '../games/tetris.engine.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAMES = [
  ['hockey', hockey],
  ['tanks', tanks],
  ['bomber', bomber],
  ['snake', snake],
  ['tetris', tetris],
];
const IDS = GAMES.map(([id]) => id);

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function walkValues(value, visit, keyName) {
  visit(value, keyName);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) walkValues(value[key], visit, key);
  }
}

function assertViewClean(view) {
  assert.equal(typeof view, 'object');
  assert.ok(view !== null);
  const text = JSON.stringify(view);
  assert.ok(text.length > 2);
  walkValues(view, (value, key) => {
    if (key !== undefined) assert.ok(!key.startsWith('_'), `视图出现下划线键 ${key}`);
    assert.notEqual(typeof value, 'function', '视图不得包含函数');
    assert.notEqual(typeof value, 'symbol', '视图不得包含 Symbol');
  });
  const copy = JSON.parse(text);
  assert.deepEqual(copy, view, '视图必须可 JSON 往返');
}

function assertStateSerializable(state) {
  const text = JSON.stringify(state);
  assert.ok(typeof text === 'string');
  const copy = JSON.parse(text);
  walkValues(state, (value, key) => {
    assert.notEqual(typeof value, 'function', `状态键 ${key} 含函数`);
    assert.notEqual(typeof value, 'undefined', `状态键 ${key} 为 undefined`);
  });
  assert.equal(typeof copy, 'object');
}

function runToEnd(engine, state, stepMs = 100, maxSteps = 20000) {
  let now = state.now;
  let guard = 0;
  while (state.status === 'live' && guard < maxSteps) {
    now += stepMs;
    engine.step(state, now);
    guard += 1;
  }
  return { state, steps: guard };
}

function assertCommonShape(engine, state) {
  assert.equal(state.turn, -1);
  assert.equal(state.simultaneous, true);
  assert.equal(typeof engine.view, 'function');
  assert.equal(typeof engine.create, 'function');
  assert.equal(typeof engine.act, 'function');
  assert.equal(typeof engine.step, 'function');
}

test('所有引擎：create 返回同时行动状态，视图干净可序列化', () => {
  for (const [id, engine] of GAMES) {
    const state = engine.create(20240601, 1000);
    assertCommonShape(engine, state);
    assertStateSerializable(state);
    for (const player of [0, 1]) {
      assertViewClean(engine.view(state, player));
    }
    assert.equal(typeof engine.step(state, 1030), 'boolean');
    assertViewClean(engine.view(state, 0));
    assertStateSerializable(state);
    assert.ok(state.status === 'live', `${id} 初始应为进行中`);
  }
});

test('任何非法操作都不会抛异常且返回 false', () => {
  const junk = [null, undefined, 0, 42, 'move', [], {}, { type: null }, { type: 'move' }, { type: 'nope', dir: 7, x: 'a', y: NaN }];
  for (const [id, engine] of GAMES) {
    for (const action of junk) {
      const state = engine.create(11, 1000);
      let result;
      assert.doesNotThrow(() => {
        result = engine.act(state, 0, action, 1010);
      }, `${id} act 抛异常`);
      assert.equal(result, false, `${id} 非法操作应返回 false`);
    }
    const state = engine.create(12, 1000);
    assert.equal(engine.act(state, 5, { type: 'move', dir: 'up', x: 10, y: 10 }, 1010), false);
    assert.equal(engine.act(state, -1, { type: 'dir', dir: 'up' }, 1010), false);
    assert.equal(engine.act(state, '0', { type: 'move', dir: 'up' }, 1010), false);
  }
});

test('所有引擎：step 可在无人操作时推进到结束', () => {
  for (const [id, engine] of GAMES) {
    const state = engine.create(777, 1000);
    const result = runToEnd(engine, state);
    assert.equal(state.status, 'done', `${id} 未能靠 step 结束`);
    assert.ok(result.steps < 20000);
    assert.ok([-1, 0, 1].includes(state.winner));
    assert.equal(typeof state.message, 'string');
    assert.equal(engine.step(state, state.now + 500), false, '结束后 step 应返回 false');
    assert.equal(engine.act(state, 0, { type: 'move' }, state.now + 500), false, '结束后 act 应返回 false');
  }
});

test('hockey：同 seed 确定性', () => {
  const a = hockey.create(4242, 1000);
  const b = hockey.create(4242, 1000);
  assert.deepEqual(a, b);
  let now = 1000;
  for (let i = 0; i < 160; i++) {
    now += 50;
    if (i % 9 === 0) {
      assert.equal(hockey.act(a, 0, { type: 'move', x: 25 + (i % 50), y: 140 }, now), hockey.act(b, 0, { type: 'move', x: 25 + (i % 50), y: 140 }, now));
    }
    if (i % 13 === 0) {
      assert.equal(hockey.act(a, 1, { type: 'move', x: 80 - (i % 40), y: 20 }, now), hockey.act(b, 1, { type: 'move', x: 80 - (i % 40), y: 20 }, now));
    }
    hockey.step(a, now);
    hockey.step(b, now);
    assert.deepEqual(a, b);
  }
});

test('hockey：合法移动与非法输入', () => {
  const state = hockey.create(9, 1000);
  assert.equal(hockey.act(state, 0, { type: 'move', x: 30, y: 140 }, 1000), true);
  assert.equal(state.paddles[0].tx, 30);
  assert.equal(state.paddles[0].ty, 140);
  assert.equal(hockey.act(state, 1, { type: 'move', x: 70, y: 20 }, 1000), true);
  assert.equal(hockey.act(state, 0, { type: 'move', x: NaN, y: 140 }, 1000), false);
  assert.equal(hockey.act(state, 0, { type: 'move', x: 101, y: 140 }, 1000), false);
  assert.equal(hockey.act(state, 0, { type: 'move', x: 30, y: 161 }, 1000), false);
  assert.equal(hockey.act(state, 0, { type: 'move', x: '30', y: 140 }, 1000), false);
  assert.equal(hockey.act(state, 0, { type: 'shoot', x: 30, y: 140 }, 1000), false);
  assert.equal(hockey.act(state, 2, { type: 'move', x: 30, y: 140 }, 1000), false);
  assert.ok(state.paddles[0].ty >= 86, '玩家一球拍被限制在下半场');
  assert.equal(hockey.act(state, 0, { type: 'move', x: 50, y: 20 }, 1000), true);
  assert.ok(state.paddles[0].ty >= 86, '越区目标应被夹回本方半场');
});

test('hockey：进球计分与先得 5 分获胜', () => {
  const state = hockey.create(7, 1000);
  let now = 1000;
  for (let i = 0; i < 5; i++) {
    state.phase = 'play';
    state.puck = { x: 50, y: 5, vx: 0, vy: -90 };
    now += 50;
    hockey.step(state, now);
    assert.equal(state.scores[0], i + 1, '进球应记给玩家一');
  }
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  assert.equal(state.scores[0], 5);
  assert.equal(state.scores[1], 0);
  assert.match(state.message, /获胜/);
});

test('hockey：超时按比分判定', () => {
  const state = hockey.create(8, 1000);
  state.scores = [3, 1];
  state.endsAt = 1100;
  hockey.step(state, 2000);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  assert.match(state.message, /时间到/);
  const tie = hockey.create(8, 1000);
  tie.scores = [2, 2];
  tie.endsAt = 1100;
  hockey.step(tie, 2000);
  assert.equal(tie.winner, -1);
});

test('hockey：视图不泄露内部字段且双端一致', () => {
  const state = hockey.create(10, 1000);
  const v0 = hockey.view(state, 0);
  const v1 = hockey.view(state, 1);
  assertViewClean(v0);
  assert.equal(v0.you, 0);
  assert.equal(v1.you, 1);
  assert.deepEqual(v0.paddles, v1.paddles);
  const text = JSON.stringify(v0);
  assert.ok(!text.includes('"seed"'));
  assert.ok(!text.includes('"rolls"'));
  assert.ok(!text.includes('"serveAt"'));
  assert.notEqual(v0.scores, state.scores);
  assert.notEqual(v0.paddles, state.paddles);
  assert.equal(v0.puck.x, state.puck.x);
});

test('tanks：同 seed 确定性', () => {
  const a = tanks.create(5150, 1000);
  const b = tanks.create(5150, 1000);
  assert.deepEqual(a, b);
  let now = 1000;
  for (let i = 0; i < 120; i++) {
    now += 40;
    if (i === 2) {
      tanks.act(a, 0, { type: 'move', dir: 'up' }, now);
      tanks.act(b, 0, { type: 'move', dir: 'up' }, now);
      tanks.act(a, 0, { type: 'aim', dir: 'right' }, now);
      tanks.act(b, 0, { type: 'aim', dir: 'right' }, now);
    }
    if (i === 6) {
      tanks.act(a, 0, { type: 'fire' }, now);
      tanks.act(b, 0, { type: 'fire' }, now);
    }
    if (i === 20) {
      tanks.act(a, 1, { type: 'move', dir: 'left' }, now);
      tanks.act(b, 1, { type: 'move', dir: 'left' }, now);
    }
    tanks.step(a, now);
    tanks.step(b, now);
    assert.deepEqual(a, b);
  }
});

test('tanks：移动、瞄准、开火与冷却校验', () => {
  const state = tanks.create(3, 1000);
  assert.equal(tanks.act(state, 0, { type: 'move', dir: 'up' }, 1000), true);
  assert.equal(tanks.act(state, 0, { type: 'move', dir: 'up' }, 1010), false, '冷却中不能连续移动');
  assert.equal(tanks.act(state, 0, { type: 'move', dir: 'up' }, 1200), true);
  assert.equal(tanks.act(state, 0, { type: 'aim', dir: 'left' }, 1200), true);
  assert.equal(tanks.act(state, 0, { type: 'aim', dir: 'up' }, 1200), false);
  assert.equal(tanks.act(state, 0, { type: 'fire' }, 1200), true);
  assert.equal(tanks.act(state, 0, { type: 'fire' }, 1210), false, '冷却中不能连续开火');
  assert.equal(tanks.act(state, 0, { type: 'fire' }, 2000), true);
  assert.equal(state.bullets.length, 2);
  assert.equal(tanks.act(state, 1, { type: 'move', dir: 'down' }, 2000), true);
  state.tanks[1].x = 113;
  assert.equal(tanks.act(state, 1, { type: 'move', dir: 'right' }, 2100), false, '撞墙移动应被拒绝');
  assert.equal(tanks.act(state, 0, { type: 'jump' }, 2100), false);
});

test('tanks：炮弹命中与击毁获胜', () => {
  const state = tanks.create(5, 1000);
  state.tanks[0].x = 20;
  state.tanks[0].y = 47;
  state.tanks[1].x = 100;
  state.tanks[1].y = 47;
  state.tanks[0].aim = 0;
  state.tanks[1].hp = 34;
  assert.equal(tanks.act(state, 0, { type: 'fire' }, 1000), true);
  let now = 1000;
  for (let i = 0; i < 80 && state.status === 'live'; i++) {
    now += 30;
    tanks.step(state, now);
  }
  assert.equal(state.tanks[1].hp, 0);
  assert.equal(state.scores[0], 1);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  assert.match(state.message, /击毁/);
});

test('tanks：掩体挡下炮弹', () => {
  const state = tanks.create(6, 1000);
  state.tanks[0].x = 60;
  state.tanks[0].y = 47;
  state.tanks[1].x = 60;
  state.tanks[1].y = 110;
  state.tanks[0].aim = Math.PI / 2;
  assert.equal(tanks.act(state, 0, { type: 'fire' }, 1000), true);
  let now = 1000;
  for (let i = 0; i < 40; i++) {
    now += 30;
    tanks.step(state, now);
  }
  assert.equal(state.tanks[1].hp, 100, '掩体后的坦克不应受伤');
  assert.equal(state.bullets.length, 0);
});

test('tanks：超时按血量与命中数判定', () => {
  const state = tanks.create(7, 1000);
  state.tanks[1].hp = 66;
  state.endsAt = 1100;
  tanks.step(state, 2000);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  assert.match(state.message, /时间到/);
  const tie = tanks.create(7, 1000);
  tie.endsAt = 1100;
  tanks.step(tie, 2000);
  assert.equal(tie.winner, -1);
});

test('tanks：视图隐藏对方瞄准与冷却', () => {
  const state = tanks.create(8, 1000);
  const v0 = tanks.view(state, 0);
  assertViewClean(v0);
  assert.ok('aim' in v0.tanks[0], '自己可见炮口');
  assert.ok('fireIn' in v0.tanks[0], '自己可见冷却');
  assert.ok(!('aim' in v0.tanks[1]), '不得泄露对方瞄准');
  assert.ok(!('fireIn' in v0.tanks[1]), '不得泄露对方冷却');
  assert.ok(!('moveIn' in v0.tanks[1]));
  assert.ok('lastAim' in v0.tanks[1], '对方上次开火方向是公开信息');
  const text = JSON.stringify(v0);
  assert.ok(!text.includes('fireAt'));
  assert.ok(!text.includes('moveAt'));
  assert.ok(!text.includes('"seed"'));
  assert.deepEqual(v0.obstacles, tanks.view(state, 1).obstacles);
});

test('bomber：同 seed 确定性且棋盘对称', () => {
  const a = bomber.create(909, 1000);
  const b = bomber.create(909, 1000);
  assert.deepEqual(a, b);
  assert.equal(a.board.length, 13 * 11);
  assert.ok(a.board.includes(2), '应生成可破坏砖块');
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < 13; x++) {
      assert.equal(a.board[y * 13 + x], a.board[(10 - y) * 13 + (12 - x)], '棋盘应中心对称');
    }
  }
  assert.equal(a.board[1 * 13 + 1], 0);
  assert.equal(a.board[9 * 13 + 11], 0);
  let now = 1000;
  for (let i = 0; i < 120; i++) {
    now += 40;
    if (i === 3) {
      bomber.act(a, 0, { type: 'bomb' }, now);
      bomber.act(b, 0, { type: 'bomb' }, now);
      bomber.act(a, 1, { type: 'bomb' }, now);
      bomber.act(b, 1, { type: 'bomb' }, now);
    }
    bomber.step(a, now);
    bomber.step(b, now);
    assert.deepEqual(a, b);
  }
});

test('bomber：移动、放炸弹与非法输入', () => {
  const state = bomber.create(11, 1000);
  assert.equal(bomber.act(state, 0, { type: 'move', dir: 'right' }, 1000), true);
  assert.equal(state.players[0].x, 2);
  assert.equal(bomber.act(state, 0, { type: 'move', dir: 'up' }, 1200), false, '墙外不可移动');
  assert.equal(bomber.act(state, 0, { type: 'bomb' }, 1200), true);
  assert.equal(state.bombs.length, 1);
  assert.equal(bomber.act(state, 0, { type: 'bomb' }, 2000), false, '同一格不能重叠炸弹');
  assert.equal(bomber.act(state, 1, { type: 'move', dir: 'down' }, 2000), false, '边界墙不可移动');
  assert.equal(bomber.act(state, 0, { type: 'move', dir: 'diag' }, 2000), false);
  assert.equal(bomber.act(state, 1, { type: 'bomb' }, 2000), true);
});

test('bomber：炸弹倒计时、连锁与出局胜负', () => {
  const state = bomber.create(31, 1000);
  assert.equal(bomber.act(state, 0, { type: 'bomb' }, 1000), true);
  let now = 1000;
  for (let i = 0; i < 60 && state.status === 'live'; i++) {
    now += 50;
    bomber.step(state, now);
  }
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 1);
  assert.equal(state.players[0].alive, false);
  assert.equal(state.players[1].alive, true);
  assert.match(state.message, /出局/);
});

test('bomber：双方同时出局为和棋', () => {
  const state = bomber.create(32, 1000);
  assert.equal(bomber.act(state, 0, { type: 'bomb' }, 1000), true);
  assert.equal(bomber.act(state, 1, { type: 'bomb' }, 1000), true);
  let now = 1000;
  for (let i = 0; i < 60 && state.status === 'live'; i++) {
    now += 50;
    bomber.step(state, now);
  }
  assert.equal(state.status, 'done');
  assert.equal(state.winner, -1);
  assert.equal(state.players[0].alive, false);
  assert.equal(state.players[1].alive, false);
});

test('bomber：超时按炸砖数判定', () => {
  const state = bomber.create(33, 1000);
  state.scores = [2, 1];
  state.endsAt = 1100;
  bomber.step(state, 2000);
  assert.equal(state.winner, 0);
  assert.match(state.message, /时间到/);
  const tie = bomber.create(33, 1000);
  tie.endsAt = 1100;
  bomber.step(tie, 2000);
  assert.equal(tie.winner, -1);
});

test('bomber：视图不泄露引信内部字段', () => {
  const state = bomber.create(34, 1000);
  bomber.act(state, 0, { type: 'bomb' }, 1000);
  const view = bomber.view(state, 0);
  assertViewClean(view);
  assert.equal(view.bombs.length, 1);
  assert.deepEqual(Object.keys(view.bombs[0]).sort(), ['fuse', 'owner', 'x', 'y']);
  assert.ok(view.bombs[0].fuse > 0);
  assert.deepEqual(Object.keys(view.players[0]).sort(), ['alive', 'x', 'y']);
  const text = JSON.stringify(view);
  assert.ok(!text.includes('"at"'));
  assert.ok(!text.includes('"moveAt"'));
  assert.ok(!text.includes('"bombAt"'));
});

test('snake：同 seed 确定性', () => {
  const a = snake.create(606, 1000);
  const b = snake.create(606, 1000);
  assert.deepEqual(a, b);
  assert.equal(snake.act(a, 0, { type: 'dir', dir: 'up' }, 1000), true);
  assert.equal(snake.act(b, 0, { type: 'dir', dir: 'up' }, 1000), true);
  let now = 1000;
  for (let i = 0; i < 60; i++) {
    now += 50;
    snake.step(a, now);
    snake.step(b, now);
    assert.deepEqual(a, b);
  }
});

test('snake：方向校验与防反向', () => {
  const state = snake.create(41, 1000);
  assert.equal(snake.act(state, 0, { type: 'dir', dir: 'right' }, 1000), false, '同方向重复无效');
  assert.equal(snake.act(state, 0, { type: 'dir', dir: 'left' }, 1000), false, '不能直接反向');
  assert.equal(snake.act(state, 0, { type: 'dir', dir: 'up' }, 1000), true);
  assert.equal(snake.act(state, 0, { type: 'dir', dir: 'left' }, 1000), true);
  assert.equal(snake.act(state, 0, { type: 'dir', dir: 'down' }, 1000), false, '队列已满');
  assert.equal(snake.act(state, 1, { type: 'dir', dir: 'right' }, 1000), false, '玩家二初始朝左，不能直接向右');
  assert.equal(snake.act(state, 1, { type: 'dir', dir: 'diagonal' }, 1000), false);
});

test('snake：撞墙出局与胜负', () => {
  const state = snake.create(42, 1000);
  assert.equal(snake.act(state, 0, { type: 'dir', dir: 'up' }, 1000), true);
  let now = 1000;
  for (let i = 0; i < 120 && state.status === 'live'; i++) {
    now += 50;
    snake.step(state, now);
  }
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 1);
  assert.equal(state.snakes[0].alive, false);
  assert.equal(state.snakes[1].alive, true);
  assert.match(state.message, /获胜/);
});

test('snake：同时相撞为和棋', () => {
  const state = snake.create(43, 1000);
  const { state: ended } = runToEnd(snake, state, 50);
  assert.equal(ended.status, 'done');
  assert.equal(ended.winner, -1);
  assert.equal(ended.snakes[0].alive, false);
  assert.equal(ended.snakes[1].alive, false);
});

test('snake：超时按果实与长度判定', () => {
  const state = snake.create(44, 1000);
  state.scores = [2, 1];
  state.endsAt = 1050;
  snake.step(state, 1200);
  assert.equal(state.winner, 0);
  assert.match(state.message, /时间到/);
  const tie = snake.create(44, 1000);
  tie.endsAt = 1050;
  snake.step(tie, 1200);
  assert.equal(tie.winner, -1);
});

test('snake：视图隐藏输入队列', () => {
  const state = snake.create(45, 1000);
  assert.equal(snake.act(state, 0, { type: 'dir', dir: 'up' }, 1000), true);
  const view = snake.view(state, 0);
  assertViewClean(view);
  assert.deepEqual(Object.keys(view.snakes[0]).sort(), ['alive', 'body', 'length']);
  assert.ok(Array.isArray(view.snakes[0].body));
  assert.deepEqual(Object.keys(view.snakes[0].body[0]).sort(), ['x', 'y']);
  const text = JSON.stringify(view);
  assert.ok(!text.includes('"queue"'));
  assert.ok(!text.includes('"dir"'));
  assert.ok(!text.includes('"tickAt"'));
  assert.equal(view.food === null || typeof view.food.x === 'number', true);
});

test('tetris：同 seed 确定性', () => {
  const a = tetris.create(8080, 1000);
  const b = tetris.create(8080, 1000);
  assert.deepEqual(a, b);
  let now = 1000;
  for (let i = 0; i < 90; i++) {
    now += 40;
    if (i % 5 === 0) {
      tetris.act(a, 0, { type: 'left' }, now);
      tetris.act(b, 0, { type: 'left' }, now);
    }
    if (i % 7 === 0) {
      tetris.act(a, 0, { type: 'rotate' }, now);
      tetris.act(b, 0, { type: 'rotate' }, now);
    }
    if (i % 9 === 0) {
      tetris.act(a, 1, { type: 'right' }, now);
      tetris.act(b, 1, { type: 'right' }, now);
    }
    tetris.step(a, now);
    tetris.step(b, now);
    assert.deepEqual(a, b);
  }
});

test('tetris：移动、旋转、软降、硬降合法与非法', () => {
  const state = tetris.create(52, 1000);
  const first = state.players[0].piece.t;
  assert.equal(tetris.act(state, 0, { type: 'left' }, 1000), true);
  assert.equal(tetris.act(state, 0, { type: 'rotate' }, 1000), true);
  assert.equal(tetris.act(state, 0, { type: 'down' }, 1000), true);
  assert.equal(tetris.act(state, 0, { type: 'drop' }, 1000), true);
  assert.equal(state.boards[0].some((value) => value > 0), true, '硬降后应落块');
  assert.ok(['I', 'O', 'T', 'S', 'Z', 'J', 'L'].includes(first));
  assert.notEqual(state.players[0].pi, 0);
  assert.equal(tetris.act(state, 0, { type: 'spin' }, 1100), false);
  assert.equal(tetris.act(state, 0, { type: 'drop' }, 1100), true);
});

test('tetris：先封顶者落败', () => {
  const state = tetris.create(53, 1000);
  let now = 1000;
  let guard = 0;
  while (state.status === 'live' && guard < 160) {
    now += 40;
    tetris.act(state, 0, { type: 'drop' }, now);
    guard += 1;
  }
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 1);
  assert.equal(state.players[0].topped, true);
  assert.equal(state.players[1].topped, false);
  assert.match(state.message, /封顶/);
});

test('tetris：消行向对方发送垃圾行', () => {
  const state = tetris.create(54, 1000);
  const board = new Array(10 * 18).fill(0);
  for (let x = 0; x < 9; x++) {
    board[17 * 10 + x] = 1;
    board[16 * 10 + x] = 1;
  }
  state.boards[0] = board;
  state.players[0].piece = { t: 'I', r: 1, x: 7, y: 0 };
  assert.equal(tetris.act(state, 0, { type: 'drop' }, 1000), true);
  assert.equal(state.players[0].lines, 2);
  assert.equal(state.scores[0], 300);
  assert.equal(state.boards[1].filter((value) => value === 8).length, 9, '应向对方发送一行垃圾');
  assert.equal(state.boards[1].filter((value) => value === 0).length > 0, true);
});

test('tetris：超时按消行数与分数判定', () => {
  const state = tetris.create(55, 1000);
  state.players[0].lines = 3;
  state.players[1].lines = 1;
  state.endsAt = 1100;
  tetris.step(state, 2000);
  assert.equal(state.winner, 0);
  assert.match(state.message, /时间到/);
  const tie = tetris.create(55, 1000);
  tie.endsAt = 1100;
  tetris.step(tie, 2000);
  assert.equal(tie.winner, -1);
});

test('tetris：视图只暴露自己的下一个方块', () => {
  const state = tetris.create(56, 1000);
  const v0 = tetris.view(state, 0);
  const v1 = tetris.view(state, 1);
  assertViewClean(v0);
  assert.equal(v0.you, 0);
  assert.equal(v1.you, 1);
  assert.equal(v0.next.length, 3);
  assert.equal(v1.next.length, 3);
  assert.deepEqual(v0.next, state.seq.slice(state.players[0].pi, state.players[0].pi + 3));
  assert.deepEqual(v1.next, state.seq.slice(state.players[1].pi, state.players[1].pi + 3));
  assert.equal(v0.boards[0].length, 180);
  assert.ok(Array.isArray(v0.pieces));
  assert.equal(v0.pieces.length, 2);
  const text = JSON.stringify(v0);
  assert.ok(!text.includes('"seq"'));
  assert.ok(!text.includes('"queue"'));
  assert.ok(!text.includes('"pi"'));
  assert.ok(!text.includes('"dropAt"'));
});

test('所有引擎源码不含 Date.now、Math.random 与 DOM 依赖', () => {
  for (const id of IDS) {
    const source = readFileSync(path.join(root, 'games', `${id}.engine.js`), 'utf8');
    assert.ok(!/Date\.now\s*\(/.test(source), `${id} 引擎使用了 Date.now`);
    assert.ok(!/Math\.random/.test(source), `${id} 引擎使用了 Math.random`);
    assert.ok(!/\bdocument\b/.test(source), `${id} 引擎依赖 DOM`);
    assert.ok(!/\bwindow\b/.test(source), `${id} 引擎依赖 window`);
    assert.match(source, /export function create\(/);
    assert.match(source, /export function act\(/);
    assert.match(source, /export function step\(/);
    assert.match(source, /export function view\(/);
  }
});

test('所有视图导出 mount 且满足样式与动效约束', async () => {
  for (const id of IDS) {
    const source = readFileSync(path.join(root, 'games', `${id}.view.js`), 'utf8');
    assert.match(source, /export function mount\(root, api\)/);
    assert.match(source, /tws-/);
    assert.match(source, /prefers-reduced-motion/);
    assert.match(source, /44px/);
    assert.match(source, /--tw-coral/);
    assert.match(source, /--tw-forest/);
    assert.ok(!/Math\.random/.test(source), `${id} 视图使用了 Math.random`);
    assert.ok(!/Date\.now/.test(source), `${id} 视图使用了 Date.now`);
    const module = await import(`../games/${id}.view.js`);
    assert.equal(typeof module.mount, 'function');
  }
});

test('动作游戏性能预算：200 次 step 与 view 在合理耗时内', () => {
  for (const [id, engine] of GAMES) {
    const state = engine.create(1357, 1000);
    let now = 1000;
    const started = process.hrtime.bigint();
    for (let i = 0; i < 200; i++) {
      now += 50;
      engine.step(state, now);
      engine.view(state, i % 2);
    }
    const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
    assert.ok(elapsed < 500, `${id} 200 帧耗时 ${elapsed.toFixed(1)}ms 超出预算`);
  }
});