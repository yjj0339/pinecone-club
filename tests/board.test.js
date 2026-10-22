import test from 'node:test';
import assert from 'node:assert/strict';
import * as gomoku from '../games/gomoku.engine.js';
import * as fleet from '../games/fleet.engine.js';
import * as dots from '../games/dots.engine.js';
import * as reversi from '../games/reversi.engine.js';
import * as mines from '../games/mines.engine.js';

function noUnderscoreKeys(value, path = 'view') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => noUnderscoreKeys(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    assert.ok(!key.startsWith('_'), `${path}.${key} 不应出现`);
    noUnderscoreKeys(value[key], `${path}.${key}`);
  }
}

function jsonCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function placeFleet(state, time = 0) {
  let now = time;
  for (let step = 0; step < 6; step++) {
    const player = state.turn;
    let done = false;
    for (let index = 0; index < 49 && !done; index++) {
      for (const vertical of [false, true]) {
        now += 1;
        if (fleet.act(state, player, { type: 'place', index, vertical }, now)) {
          done = true;
          break;
        }
      }
    }
    assert.equal(done, true, '布阵必须能落下一艘船');
  }
  return now;
}

test('五子棋基础流程与视图裁剪', () => {
  const state = gomoku.create(7, 0);
  assert.equal(state.status, 'live');
  assert.equal(state.turn, 0);
  assert.equal(gomoku.act(state, 1, { type: 'place', index: 0 }, 1), false);
  assert.equal(gomoku.act(state, 0, { type: 'place', index: 225 }, 1), false);
  assert.equal(gomoku.act(state, 0, { type: 'place', index: 112 }, 1), true);
  assert.equal(state.turn, 1);
  const seen = gomoku.view(state, 0);
  noUnderscoreKeys(seen);
  assert.equal(seen.board[112], 0);
  assert.ok(seen.winningLine.length === 0);
});

test('雾中舰队：布阵、炮击、击沉与隐藏信息', () => {
  const a = fleet.create(11, 0);
  const b = fleet.create(11, 0);
  assert.deepEqual(jsonCopy(a.boards), jsonCopy(b.boards));
  const firstView = fleet.view(a, 0);
  noUnderscoreKeys(firstView);
  assert.equal(firstView.enemyShips, null);
  assert.ok(firstView.myBoard.every((cell) => cell === -1));

  assert.equal(fleet.act(a, 0, { type: 'fire', index: 0 }, 1), false, '布阵阶段不能开炮');
  assert.equal(fleet.act(a, 1, { type: 'place', index: 0, vertical: false }, 1), false, '不是自己的回合');

  const now = placeFleet(a, 2);
  assert.equal(a.phase, 'fire');
  assert.equal(a.turn, 0);
  assert.equal(fleet.act(a, 1, { type: 'fire', index: 0 }, now), false);

  const target = a.boards[1].map((cell, index) => (cell !== -1 ? index : -1)).filter((index) => index >= 0);
  for (const index of target) {
    assert.equal(fleet.act(a, 0, { type: 'fire', index }, now + 1), true);
  }
  assert.equal(a.status, 'done');
  assert.equal(a.winner, 0);
  const done = fleet.view(a, 0);
  assert.ok(Array.isArray(done.enemyShips));
});

test('雾中舰队：炮击回合切换与超时', () => {
  const state = fleet.create(21, 0);
  const now = placeFleet(state, 2);
  const missIndex = state.boards[1].findIndex((cell) => cell === -1);
  assert.ok(missIndex >= 0);
  assert.equal(fleet.act(state, 0, { type: 'fire', index: missIndex }, now + 1), true);
  assert.equal(state.turn, 1);
  const afterMiss = fleet.view(state, 1);
  assert.equal(afterMiss.incoming[missIndex], 0);
  const timeout = fleet.step(state, state.turnEndsAt + 1);
  assert.equal(timeout, true);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
});

test('点格领地：画边、占格与继续行动', () => {
  const state = dots.create(3, 0);
  assert.equal(dots.act(state, 1, { type: 'edge', dir: 'h', r: 0, c: 0 }, 1), false);
  assert.equal(dots.act(state, 0, { type: 'edge', dir: 'h', r: 9, c: 0 }, 1), false);
  assert.equal(dots.act(state, 0, { type: 'edge', dir: 'h', r: 0, c: 0 }, 1), true);
  assert.equal(dots.act(state, 1, { type: 'edge', dir: 'h', r: 1, c: 0 }, 2), true);
  assert.equal(dots.act(state, 0, { type: 'edge', dir: 'v', r: 0, c: 0 }, 3), true);
  assert.equal(dots.act(state, 1, { type: 'edge', dir: 'v', r: 0, c: 1 }, 4), true);
  assert.equal(dots.view(state, 0).boxes[0], 1);
  assert.equal(state.turn, 1);
  assert.equal(dots.act(state, 1, { type: 'edge', dir: 'h', r: 0, c: 0 }, 5), false, '重复的边必须拒绝');
  const seen = dots.view(state, 0);
  noUnderscoreKeys(seen);
  assert.equal(seen.scores[1], 1);
});

test('点格领地：画满结束与比分', () => {
  const state = dots.create(5, 0);
  let time = 0;
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 5; c++) {
      assert.equal(dots.act(state, state.turn, { type: 'edge', dir: 'h', r, c }, (time += 1)), true);
    }
  }
  outer: for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      if (state.status === 'done') break outer;
      assert.equal(dots.act(state, state.turn, { type: 'edge', dir: 'v', r, c }, (time += 1)), true);
    }
  }
  assert.equal(state.status, 'done');
  assert.equal(state.scores[0] + state.scores[1], 25);
  assert.equal([0, 1, -1].includes(state.winner), true);
});

test('黑白棋：合法落子、翻面与非法输入', () => {
  const state = reversi.create(9, 0);
  assert.equal(reversi.act(state, 1, { type: 'place', index: 0 }, 1), false);
  assert.equal(reversi.act(state, 0, { type: 'place', index: 0 }, 1), false, '没有夹住棋子不能落');
  const legal = reversi.view(state, 0).legal;
  assert.ok(legal.length > 0);
  assert.equal(reversi.act(state, 0, { type: 'place', index: legal[0] }, 2), true);
  assert.equal(reversi.view(state, 0).board[legal[0]], 0);
  const seen = reversi.view(state, 0);
  noUnderscoreKeys(seen);
  assert.equal(seen.scores[0] + seen.scores[1] > 4, true);
});

test('黑白棋：自动跳过与终局', () => {
  const state = reversi.create(31, 0);
  let time = 0;
  for (let step = 0; step < 400 && state.status === 'live'; step++) {
    const player = state.turn;
    const legal = reversi.view(state, player).legal;
    if (legal.length === 0) break;
    time += 1;
    assert.equal(reversi.act(state, player, { type: 'place', index: legal[0] }, time), true);
  }
  if (state.status === 'live') {
    const passed = reversi.step(state, state.endsAt + 1);
    assert.equal(passed, true);
  }
  assert.equal(state.status, 'done');
  const final = reversi.view(state, 0);
  const total = final.scores[0] + final.scores[1];
  assert.ok(total >= 4 && total <= 36);
  assert.equal([0, 1, -1].includes(state.winner), true);
});

test('雷区漫步：同种子同雷区、踩雷冻结与时间结束', () => {
  const a = mines.create(77, 0);
  const b = mines.create(77, 0);
  assert.deepEqual(a.field, b.field);
  assert.equal(a.simultaneous, true);
  assert.equal(a.turn, -1);
  const safeIndex = a.field.findIndex((value, index) => value === 0 && a.owner[index] === -1);
  const mineIndex = a.field.findIndex((value, index) => value === 1 && a.owner[index] === -1);
  assert.equal(mines.act(a, 0, { type: 'dig', index: mineIndex }, 1), true);
  assert.equal(mines.act(a, 1, { type: 'dig', index: mineIndex }, 2), false, '同一格不能翻两次');
  const seen = mines.view(a, 0);
  noUnderscoreKeys(seen);
  assert.equal(seen.cells[mineIndex].state, 'mine');
  assert.equal(seen.opened, 1);

  assert.equal(mines.act(a, 1, { type: 'dig', index: safeIndex }, 3), true);
  assert.ok(a.freezeUntil[0] > 1);
  const otherSafe = a.owner.findIndex((owner, index) => owner === -1 && a.field[index] === 0);
  assert.equal(mines.act(a, 0, { type: 'dig', index: otherSafe }, 4), false, '冻结期间不能再翻');
  assert.equal(mines.act(a, 0, { type: 'dig', index: otherSafe }, a.freezeUntil[0] + 1), true);

  assert.equal(mines.step(a, a.endsAt + 1), true);
  assert.equal(a.status, 'done');
  const final = mines.view(a, 1);
  noUnderscoreKeys(final);
  assert.equal([0, 1, -1].includes(a.winner), true);
});