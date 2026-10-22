import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as rps from '../games/rps.engine.js';
import * as reaction from '../games/reaction.engine.js';
import * as typing from '../games/typing.engine.js';
import * as slingshot from '../games/slingshot.engine.js';
import * as maze from '../games/maze.engine.js';
import * as rpsView from '../games/rps.view.js';
import * as reactionView from '../games/reaction.view.js';
import * as typingView from '../games/typing.view.js';
import * as slingshotView from '../games/slingshot.view.js';
import * as mazeView from '../games/maze.view.js';

const NOW = 1700000000000;

function plain(value, path = 'view') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => plain(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      assert.ok(!key.startsWith('_'), `${path}.${key} 不得以下划线开头`);
      plain(value[key], `${path}.${key}`);
    }
  }
}

function snapshot(state) {
  return JSON.stringify(state);
}

function readGame(name) {
  return readFileSync(new URL(`../games/${name}`, import.meta.url), 'utf8');
}

function findHitShot(state, player) {
  for (let angle = 10; angle <= 60; angle += 1) {
    for (let power = 20; power <= 100; power += 1) {
      const probe = JSON.parse(JSON.stringify(state));
      if (slingshot.act(probe, player, { type: 'fire', angle, power }, state.now + 100) && probe.lastShot.hit) {
        return { angle, power };
      }
    }
  }
  return null;
}

function findWinningShot(state, player) {
  for (let angle = 10; angle <= 60; angle += 1) {
    for (let power = 20; power <= 100; power += 1) {
      const probe = JSON.parse(JSON.stringify(state));
      if (slingshot.act(probe, player, { type: 'fire', angle, power }, state.now + 100) && probe.status === 'done') {
        return { angle, power };
      }
    }
  }
  return null;
}

test('rps 同种子创建完全一致且为同时行动', () => {
  const first = rps.create(77, NOW);
  const second = rps.create(77, NOW);
  assert.deepEqual(first, second);
  assert.equal(snapshot(first), snapshot(second));
  assert.equal(first.simultaneous, true);
  assert.equal(first.turn, -1);
  assert.equal(first.status, 'live');
});

test('rps 双方暗选后由 step 揭晓并计分', () => {
  const state = rps.create(11, NOW);
  assert.equal(rps.act(state, 0, { type: 'choose', pick: 'rock' }, NOW + 100), true);
  assert.equal(rps.act(state, 1, { type: 'choose', pick: 'paper' }, NOW + 120), true);
  assert.equal(state.phase, 'choose');
  assert.equal(rps.step(state, NOW + 150), true);
  assert.equal(state.phase, 'reveal');
  assert.deepEqual(state.scores, [0, 1]);
  const seen = rps.view(state, 0);
  assert.deepEqual(seen.picks, ['rock', 'paper']);
  assert.equal(seen.roundWinner, 1);
  assertPlainSafe(seen);
  assert.equal(rps.step(state, state.revealEndsAt), true);
  assert.equal(state.phase, 'choose');
  assert.equal(state.round, 1);
  assert.equal(rps.view(state, 0).picks, null);
});

function assertPlainSafe(view) {
  plain(view);
}

test('rps 暗选阶段不泄露对手选择', () => {
  const state = rps.create(13, NOW);
  rps.act(state, 0, { type: 'choose', pick: 'rock' }, NOW + 10);
  const opp = rps.view(state, 1);
  assert.equal(opp.yourPick, null);
  assert.equal(opp.oppPicked, true);
  assert.equal(opp.picks, null);
  assert.ok(!JSON.stringify(opp).includes('rock'));
  plain(opp);
  const mine = rps.view(state, 0);
  assert.equal(mine.yourPick, 'rock');
  assert.equal(mine.yourReady, true);
  assert.ok(!JSON.stringify(mine).includes('paper'));
});

test('rps 非法操作全部拒绝且不改变状态', () => {
  const state = rps.create(12, NOW);
  const frozen = snapshot(state);
  assert.equal(rps.act(state, 2, { type: 'choose', pick: 'rock' }, NOW + 10), false);
  assert.equal(rps.act(state, -1, { type: 'choose', pick: 'rock' }, NOW + 10), false);
  assert.equal(rps.act(state, '0', { type: 'choose', pick: 'rock' }, NOW + 10), false);
  assert.equal(rps.act(state, 0, null, NOW + 10), false);
  assert.equal(rps.act(state, 0, {}, NOW + 10), false);
  assert.equal(rps.act(state, 0, { type: 'tap' }, NOW + 10), false);
  assert.equal(rps.act(state, 0, { type: 'choose' }, NOW + 10), false);
  assert.equal(rps.act(state, 0, { type: 'choose', pick: 'fire' }, NOW + 10), false);
  assert.equal(rps.act(state, 0, { type: 'choose', pick: 3 }, NOW + 10), false);
  assert.equal(snapshot(state), frozen);
  assert.equal(rps.act(state, 0, { type: 'choose', pick: 'rock' }, NOW + 20), true);
  assert.equal(rps.act(state, 0, { type: 'choose', pick: 'paper' }, NOW + 30), false);
});

test('rps 先到三分获胜', () => {
  let now = NOW;
  const state = rps.create(21, now);
  for (let round = 1; round <= 3; round++) {
    assert.equal(rps.act(state, 0, { type: 'choose', pick: 'rock' }, now + 100), true);
    assert.equal(rps.act(state, 1, { type: 'choose', pick: 'scissors' }, now + 100), true);
    assert.equal(rps.step(state, now + 200), true);
    now += 200;
    if (round < 3) {
      assert.equal(state.status, 'live');
      now = state.revealEndsAt;
      assert.equal(rps.step(state, now), true);
      now += 10;
    }
  }
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  assert.deepEqual(state.scores, [3, 0]);
  assert.equal(rps.act(state, 0, { type: 'choose', pick: 'rock' }, now + 10), false);
});

test('rps 选择超时由系统代出手揭晓', () => {
  const state = rps.create(15, NOW);
  assert.equal(rps.step(state, state.chooseEndsAt + 1), true);
  assert.equal(state.phase, 'reveal');
  assert.ok(state.choices.every((pick) => typeof pick === 'string'));
});

test('rps 超时按比分结算', () => {
  const tie = rps.create(16, NOW);
  assert.equal(rps.step(tie, tie.endsAt + 1), true);
  assert.equal(tie.status, 'done');
  assert.equal(tie.winner, -1);
  const lead = rps.create(16, NOW);
  rps.act(lead, 0, { type: 'choose', pick: 'paper' }, NOW + 10);
  rps.act(lead, 1, { type: 'choose', pick: 'rock' }, NOW + 10);
  rps.step(lead, NOW + 20);
  assert.deepEqual(lead.scores, [1, 0]);
  assert.equal(rps.step(lead, lead.endsAt + 1), true);
  assert.equal(lead.winner, 0);
});

test('reaction 同种子信号时刻一致且视图隐藏信号', () => {
  const first = reaction.create(31, NOW);
  const second = reaction.create(31, NOW);
  assert.deepEqual(first, second);
  assert.equal(first.signalAt, second.signalAt);
  const seen = reaction.view(first, 0);
  assert.equal(seen.phase, 'wait');
  assert.equal(seen.rounds, 5);
  assert.equal(seen.round, 1);
  assert.ok(!('signalAt' in seen));
  assert.ok(!('delays' in seen));
  assert.ok(!JSON.stringify(seen).includes('signalAt'));
  plain(seen);
});

test('reaction 抢跑扣分并失去本轮资格', () => {
  const state = reaction.create(32, NOW);
  assert.equal(reaction.act(state, 0, { type: 'tap' }, NOW + 200), true);
  assert.deepEqual(state.scores, [-1, 0]);
  assert.equal(reaction.act(state, 0, { type: 'tap' }, NOW + 300), false);
  const seen = reaction.view(state, 0);
  assert.equal(seen.yourFalseStart, true);
  assert.equal(seen.yourTapped, false);
  plain(seen);
});

test('reaction 信号后先拍者得两分', () => {
  const state = reaction.create(33, NOW);
  assert.equal(reaction.step(state, state.signalAt), true);
  assert.equal(state.phase, 'go');
  assert.equal(reaction.act(state, 1, { type: 'tap' }, state.signalAt + 130), true);
  assert.equal(reaction.act(state, 0, { type: 'tap' }, state.signalAt + 260), true);
  assert.equal(reaction.step(state, state.signalAt + 300), true);
  assert.equal(state.phase, 'resolve');
  assert.deepEqual(state.scores, [0, 2]);
  const seen = reaction.view(state, 0);
  assert.deepEqual(seen.roundTaps, [260, 130]);
  assert.equal(seen.roundWinner, 1);
  assert.equal(seen.yourLatency, 260);
  plain(seen);
});

test('reaction 非法操作全部拒绝', () => {
  const state = reaction.create(34, NOW);
  const frozen = snapshot(state);
  assert.equal(reaction.act(state, 2, { type: 'tap' }, NOW + 10), false);
  assert.equal(reaction.act(state, 0, { type: 'jump' }, NOW + 10), false);
  assert.equal(reaction.act(state, 0, null, NOW + 10), false);
  assert.equal(reaction.act(state, 0, { type: 'tap' }, NOW + 10), true);
  reaction.step(state, state.signalAt);
  const during = snapshot(state);
  assert.equal(reaction.act(state, 1, { type: 'tap' }, state.signalAt + 10), true);
  assert.equal(snapshot(state) === during, false);
  reaction.act(state, 0, { type: 'tap' }, state.signalAt + 20);
  reaction.step(state, state.signalAt + 30);
  const resolved = snapshot(state);
  assert.equal(reaction.act(state, 0, { type: 'tap' }, state.signalAt + 40), false);
  assert.equal(reaction.act(state, 1, { type: 'roll' }, state.signalAt + 40), false);
  assert.equal(snapshot(state), resolved);
  assert.notEqual(frozen, resolved);
});

test('reaction 五轮结束按积分结算', () => {
  const state = reaction.create(36, NOW);
  let now = NOW;
  let guard = 0;
  while (state.status === 'live' && guard < 80) {
    guard += 1;
    if (state.phase === 'wait') {
      now = state.signalAt;
      reaction.step(state, now);
    } else if (state.phase === 'go') {
      reaction.act(state, 0, { type: 'tap' }, now + 100);
      reaction.act(state, 1, { type: 'tap' }, now + 150);
      reaction.step(state, now + 200);
    } else if (state.phase === 'resolve') {
      now = state.resolveUntil;
      reaction.step(state, now);
    } else {
      break;
    }
  }
  assert.ok(guard < 80);
  assert.equal(state.status, 'done');
  assert.equal(state.history.length, 5);
  const expected = state.scores[0] === state.scores[1] ? -1 : state.scores[0] > state.scores[1] ? 0 : 1;
  assert.equal(state.winner, expected);
});

test('reaction 时间到按积分结算', () => {
  const state = reaction.create(35, NOW);
  assert.equal(reaction.step(state, state.endsAt + 1), true);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, -1);
});

test('typing 同种子目标句一致且视图公开目标', () => {
  const first = typing.create(41, NOW);
  const second = typing.create(41, NOW);
  assert.deepEqual(first, second);
  assert.equal(typeof first.target, 'string');
  assert.ok(first.target.length >= 7);
  const seen = typing.view(first, 0);
  assert.equal(seen.target, first.target);
  assert.deepEqual(seen.progress, [0, 0]);
  assert.equal(seen.yourText, '');
  plain(seen);
});

test('typing 支持增量字符与整句输入并校验前缀', () => {
  const state = typing.create(43, NOW);
  const target = state.target;
  assert.equal(typing.act(state, 0, { type: 'input', value: target.slice(0, 2) }, NOW + 10), true);
  assert.equal(state.progress[0], 2);
  assert.equal(typing.act(state, 0, { type: 'char', ch: target[2] }, NOW + 20), true);
  assert.equal(state.progress[0], 3);
  const seen = typing.view(state, 0);
  assert.equal(seen.yourProgress, 3);
  assert.equal(seen.yourText, target.slice(0, 3));
  assert.equal(seen.nextChar, target[3]);
  plain(seen);
  assert.equal(typing.act(state, 0, { type: 'input', value: target.slice(0, 1) }, NOW + 30), false);
});

test('typing 拒绝错误输入与越界参数', () => {
  const state = typing.create(44, NOW);
  const target = state.target;
  const wrong = target[0] === '错' ? '误' : '错';
  const frozen = snapshot(state);
  assert.equal(typing.act(state, 0, { type: 'input', value: wrong }, NOW + 10), false);
  assert.equal(typing.act(state, 0, { type: 'input', value: target + '错' }, NOW + 10), false);
  assert.equal(typing.act(state, 0, { type: 'input', value: 3 }, NOW + 10), false);
  assert.equal(typing.act(state, 0, { type: 'input', value: target.slice(1) }, NOW + 10), false);
  assert.equal(typing.act(state, 0, { type: 'char', ch: wrong }, NOW + 10), false);
  assert.equal(typing.act(state, 0, { type: 'char', ch: '两个' }, NOW + 10), false);
  assert.equal(typing.act(state, 0, { type: 'char' }, NOW + 10), false);
  assert.equal(typing.act(state, 0, { type: 'jump' }, NOW + 10), false);
  assert.equal(typing.act(state, 0, null, NOW + 10), false);
  assert.equal(typing.act(state, 2, { type: 'input', value: '' }, NOW + 10), false);
  assert.equal(snapshot(state), frozen);
});

test('typing 先打完者获胜', () => {
  const state = typing.create(45, NOW);
  const target = state.target;
  assert.equal(typing.act(state, 1, { type: 'char', ch: target[0] }, NOW + 10), true);
  assert.equal(typing.act(state, 0, { type: 'input', value: target }, NOW + 20), true);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  assert.equal(typing.act(state, 1, { type: 'char', ch: target[1] }, NOW + 30), false);
  plain(typing.view(state, 1));
});

test('typing 隐藏对手输入内容', () => {
  const state = typing.create(46, NOW);
  const target = state.target;
  typing.act(state, 1, { type: 'input', value: target.slice(0, 4) }, NOW + 10);
  const seen = typing.view(state, 0);
  assert.equal(seen.oppProgress, 4);
  assert.equal(seen.yourProgress, 0);
  assert.equal(seen.yourText, '');
  assert.ok(!('oppText' in seen));
  assert.ok(!('inputs' in seen));
  assert.ok(!('typed' in seen));
  plain(seen);
});

test('typing 超时按输入进度结算', () => {
  const state = typing.create(47, NOW);
  const target = state.target;
  typing.act(state, 0, { type: 'input', value: target.slice(0, 3) }, NOW + 10);
  typing.act(state, 1, { type: 'char', ch: target[0] }, NOW + 20);
  assert.equal(typing.step(state, state.endsAt + 1), true);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  const tie = typing.create(47, NOW);
  assert.equal(typing.step(tie, tie.endsAt + 1), true);
  assert.equal(tie.winner, -1);
});

test('slingshot 同种子风序列一致且视图隐藏风表', () => {
  const first = slingshot.create(51, NOW);
  const second = slingshot.create(51, NOW);
  assert.deepEqual(first, second);
  assert.deepEqual(first.winds, second.winds);
  assert.equal(typeof first.wind, 'number');
  const seen = slingshot.view(first, 0);
  assert.equal(seen.youTurn, true);
  assert.equal(seen.turn, 0);
  assert.deepEqual(seen.hp, [100, 100]);
  assert.equal(typeof seen.wind, 'number');
  assert.ok(!('winds' in seen));
  assert.equal(seen.lastShot, null);
  plain(seen);
});

test('slingshot 合法发射命中后扣城墙并交换回合', () => {
  const state = slingshot.create(52, NOW);
  const shot = findHitShot(state, 0);
  assert.ok(shot);
  assert.equal(slingshot.act(state, 0, { type: 'fire', angle: shot.angle, power: shot.power }, NOW + 500), true);
  assert.equal(state.turn, 1);
  assert.equal(state.lastShot.hit, true);
  assert.ok(state.hp[1] < 100);
  const seen = slingshot.view(state, 1);
  assert.equal(seen.youTurn, true);
  assert.equal(seen.lastShot.by, 0);
  assert.ok(seen.lastShot.path.length > 2);
  assert.ok(!('winds' in seen));
  plain(seen);
  const reply = findHitShot(state, 1);
  assert.ok(reply);
  assert.equal(slingshot.act(state, 1, { type: 'fire', angle: reply.angle, power: reply.power }, NOW + 1000), true);
  assert.ok(state.hp[0] < 100);
  assert.equal(state.turn, 0);
});

test('slingshot 非法操作全部拒绝', () => {
  const state = slingshot.create(53, NOW);
  const frozen = snapshot(state);
  assert.equal(slingshot.act(state, 1, { type: 'fire', angle: 30, power: 90 }, NOW + 10), false);
  assert.equal(slingshot.act(state, 2, { type: 'fire', angle: 30, power: 90 }, NOW + 10), false);
  assert.equal(slingshot.act(state, 0, null, NOW + 10), false);
  assert.equal(slingshot.act(state, 0, { type: 'aim', angle: 30, power: 90 }, NOW + 10), false);
  assert.equal(slingshot.act(state, 0, { type: 'fire', angle: 9, power: 90 }, NOW + 10), false);
  assert.equal(slingshot.act(state, 0, { type: 'fire', angle: 61, power: 90 }, NOW + 10), false);
  assert.equal(slingshot.act(state, 0, { type: 'fire', angle: 30.5, power: 90 }, NOW + 10), false);
  assert.equal(slingshot.act(state, 0, { type: 'fire', angle: '30', power: 90 }, NOW + 10), false);
  assert.equal(slingshot.act(state, 0, { type: 'fire', angle: 30, power: 19 }, NOW + 10), false);
  assert.equal(slingshot.act(state, 0, { type: 'fire', angle: 30, power: 101 }, NOW + 10), false);
  assert.equal(slingshot.act(state, 0, { type: 'fire', angle: 30 }, NOW + 10), false);
  assert.equal(snapshot(state), frozen);
});

test('slingshot 摧毁城堡即获胜', () => {
  const state = slingshot.create(54, NOW);
  state.hp[1] = 12;
  const shot = findWinningShot(state, 0);
  assert.ok(shot);
  assert.equal(slingshot.act(state, 0, { type: 'fire', angle: shot.angle, power: shot.power }, NOW + 100), true);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  assert.equal(state.hp[1], 0);
  assert.equal(slingshot.act(state, 1, { type: 'fire', angle: 30, power: 90 }, NOW + 200), false);
});

test('slingshot 回合超时与全局超时', () => {
  const turnState = slingshot.create(55, NOW);
  assert.equal(slingshot.step(turnState, turnState.turnEndsAt + 1), true);
  assert.equal(turnState.status, 'done');
  assert.equal(turnState.winner, 1);
  const matchState = slingshot.create(55, NOW);
  matchState.hp = [80, 60];
  assert.equal(slingshot.step(matchState, matchState.endsAt + 1), true);
  assert.equal(matchState.winner, 0);
  const tieState = slingshot.create(55, NOW);
  assert.equal(slingshot.step(tieState, tieState.endsAt + 1), true);
  assert.equal(tieState.winner, -1);
});

test('maze 同种子一致且迷宫左右对称', () => {
  const first = maze.create(61, NOW);
  const second = maze.create(61, NOW);
  assert.deepEqual(first, second);
  assert.equal(snapshot(first), snapshot(second));
  assert.equal(first.grid.length, 9);
  for (const row of first.grid) {
    assert.equal(row.length, 13);
    assert.equal(row, [...row].reverse().join(''));
  }
  const seen = maze.view(first, 0);
  assert.equal(seen.simultaneous, true);
  assert.equal(seen.turn, -1);
  assert.equal(seen.you, 0);
  assert.deepEqual(seen.pos, [[1, 4], [11, 4]]);
  assert.deepEqual(seen.flag, { x: 6, y: 4, carrier: null });
  assert.equal(seen.held, '');
  assert.equal(seen.goal, 3);
  plain(seen);
});

test('maze 方向键移动、停止与节奏推进', () => {
  const state = maze.create(62, NOW);
  assert.equal(maze.act(state, 0, { type: 'dir', dir: 'right' }, NOW + 1), true);
  assert.deepEqual(state.pos[0], [2, 4]);
  assert.equal(state.held[0], 'right');
  assert.equal(maze.act(state, 0, { type: 'stop' }, NOW + 20), true);
  assert.equal(state.held[0], '');
  const paused = snapshot(state);
  assert.equal(maze.step(state, NOW + 20), false);
  assert.equal(snapshot(state), paused);
  assert.equal(maze.step(state, NOW + 260), false);
  assert.deepEqual(state.pos[0], [2, 4]);
  const moving = maze.create(62, NOW);
  maze.act(moving, 0, { type: 'dir', dir: 'right' }, NOW + 1);
  const due = moving.nextMoveAt[0];
  assert.equal(maze.step(moving, due - 1), false);
  assert.equal(maze.step(moving, due), true);
  assert.deepEqual(moving.pos[0], [3, 4]);
  assert.equal(maze.step(moving, due), false);
});

test('maze 非法操作全部拒绝且撞墙不移动', () => {
  const state = maze.create(63, NOW);
  const frozen = snapshot(state);
  assert.equal(maze.act(state, 2, { type: 'dir', dir: 'up' }, NOW + 10), false);
  assert.equal(maze.act(state, 0, { type: 'dir', dir: 'jump' }, NOW + 10), false);
  assert.equal(maze.act(state, 0, { type: 'dir', dir: '__proto__' }, NOW + 10), false);
  assert.equal(maze.act(state, 0, { type: 'dir', dir: 'toString' }, NOW + 10), false);
  assert.equal(maze.act(state, 0, { type: 'dir' }, NOW + 10), false);
  assert.equal(maze.act(state, 0, { type: 'jump' }, NOW + 10), false);
  assert.equal(maze.act(state, 0, null, NOW + 10), false);
  assert.equal(snapshot(state), frozen);
  assert.equal(maze.act(state, 0, { type: 'dir', dir: 'left' }, NOW + 20), true);
  assert.deepEqual(state.pos[0], [1, 4]);
});

test('maze 视图不暴露对手按键', () => {
  const state = maze.create(64, NOW);
  maze.act(state, 1, { type: 'dir', dir: 'up' }, NOW + 10);
  const seen = maze.view(state, 0);
  assert.equal(seen.held, '');
  assert.ok(!JSON.stringify(seen).includes('up'));
  plain(seen);
});

test('maze 拔旗带回基地得分，先到三旗获胜', () => {
  const state = maze.create(65, NOW);
  let now = NOW;
  state.pos = [[5, 4], [11, 4]];
  state.flag = { x: 6, y: 4, carrier: null };
  state.nextMoveAt = [now, now];
  assert.equal(maze.act(state, 0, { type: 'dir', dir: 'right' }, now + 10), true);
  assert.equal(state.flag.carrier, 0);
  assert.equal(maze.view(state, 0).yourFlag, true);
  for (let score = 1; score <= 3; score++) {
    now += 300;
    state.pos = [[2, 4], [11, 4]];
    state.flag = { x: 6, y: 4, carrier: 0 };
    state.nextMoveAt = [now, now];
    assert.equal(maze.act(state, 0, { type: 'dir', dir: 'left' }, now), true);
    if (score < 3) {
      assert.equal(state.scores[0], score);
      assert.deepEqual(state.pos[0], [1, 4]);
      assert.deepEqual(state.flag, { x: 6, y: 4, carrier: null });
    }
  }
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  assert.deepEqual(state.scores, [3, 0]);
  plain(maze.view(state, 0));
});

test('maze 超时按得分结算且 step 幂等', () => {
  const state = maze.create(66, NOW);
  state.scores = [2, 1];
  assert.equal(maze.step(state, state.endsAt + 1), true);
  assert.equal(state.winner, 0);
  assert.equal(maze.step(state, state.endsAt + 1), false);
  const tie = maze.create(66, NOW);
  assert.equal(maze.step(tie, tie.endsAt + 1), true);
  assert.equal(tie.winner, -1);
});

test('五款引擎状态均可 JSON 序列化', () => {
  const states = [
    rps.create(1, NOW),
    reaction.create(2, NOW),
    typing.create(3, NOW),
    slingshot.create(4, NOW),
    maze.create(5, NOW),
  ];
  for (const state of states) assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
});

test('视图模块导出 mount 且满足纸面样式约束', () => {
  const views = {
    'rps.view.js': rpsView,
    'reaction.view.js': reactionView,
    'typing.view.js': typingView,
    'slingshot.view.js': slingshotView,
    'maze.view.js': mazeView,
  };
  for (const [name, module] of Object.entries(views)) {
    assert.equal(typeof module.mount, 'function', `${name} 缺少 mount`);
    const source = readGame(name);
    assert.ok(source.includes('export function mount'), `${name} 需导出 mount`);
    assert.ok(source.includes('tws-'), `${name} 类名需使用 tws- 前缀`);
    assert.ok(source.includes('document.head'), `${name} 需注入自管样式`);
    assert.ok(source.includes('prefers-reduced-motion'), `${name} 需处理 reduced-motion`);
    assert.ok(source.includes('--tw-coral'), `${name} 需使用玩家一配色`);
    assert.ok(source.includes('--tw-forest'), `${name} 需使用玩家二配色`);
    assert.match(source, /(?:min-height|min-width|height|width):\s*(?:4[4-9]|[5-9]\d|\d{3,})px/, `${name} 触摸目标需至少 44px`);
    assert.ok(!source.includes('Date.now'), `${name} 不应依赖本机时间`);
  }
});

test('引擎不使用 Date.now 与 Math.random', () => {
  const engines = ['rps.engine.js', 'reaction.engine.js', 'typing.engine.js', 'slingshot.engine.js', 'maze.engine.js'];
  for (const name of engines) {
    const source = readGame(name);
    assert.ok(!source.includes('Date.now'), `${name} 不得调用 Date.now`);
    assert.ok(!source.includes('Math.random'), `${name} 不得调用 Math.random`);
    assert.ok(source.includes('kit.js'), `${name} 需复用 kit`);
  }
});