import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as memoryEngine from '../games/memory.engine.js';
import * as quizEngine from '../games/quiz.engine.js';
import * as g2048Engine from '../games/g2048.engine.js';
import * as sudokuEngine from '../games/sudoku.engine.js';
import * as simonEngine from '../games/simon.engine.js';
import * as memoryView from '../games/memory.view.js';
import * as quizView from '../games/quiz.view.js';
import * as g2048View from '../games/g2048.view.js';
import * as sudokuView from '../games/sudoku.view.js';
import * as simonView from '../games/simon.view.js';

const GAMES = {
  memory: { engine: memoryEngine, view: memoryView },
  quiz: { engine: quizEngine, view: quizView },
  g2048: { engine: g2048Engine, view: g2048View },
  sudoku: { engine: sudokuEngine, view: sudokuView },
  simon: { engine: simonEngine, view: simonView },
};

const ORDER = ['memory', 'quiz', 'g2048', 'sudoku', 'simon'];

function collectKeys(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      out.push(key);
      collectKeys(child, out);
    }
  }
  return out;
}

function collectArrays(value, out = []) {
  if (Array.isArray(value)) {
    out.push(value);
    for (const item of value) collectArrays(item, out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) collectArrays(child, out);
  }
  return out;
}

function assertJsonState(state) {
  const text = JSON.stringify(state);
  assert.equal(typeof text, 'string');
  assert.doesNotThrow(() => JSON.parse(text));
  const scan = (value) => {
    assert.notEqual(typeof value, 'function');
    if (Array.isArray(value)) {
      value.forEach(scan);
      return;
    }
    if (value && typeof value === 'object') Object.values(value).forEach(scan);
  };
  scan(state);
}

function assertCleanView(view) {
  const text = JSON.stringify(view);
  assert.equal(typeof text, 'string');
  assert.doesNotThrow(() => JSON.parse(text));
  const keys = collectKeys(view);
  assert.equal(keys.some((key) => key.startsWith('_')), false);
  for (const key of ['spawns', 'cursors', 'solution', 'questions', 'sequence', 'deck']) {
    assert.equal(keys.includes(key), false, `视图不应泄露 ${key}`);
  }
}

function assertNoArrayLike(view, expected) {
  const arrays = collectArrays(view);
  assert.equal(arrays.some((arr) => JSON.stringify(arr) === JSON.stringify(expected)), false);
}

function findPair(deck) {
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      if (deck[i] === deck[j]) return [i, j];
    }
  }
  return [-1, -1];
}

function blankOf(state) {
  return state.givens.findIndex((value) => value === 0);
}

function moveDir(state, player) {
  for (const dir of [0, 1, 2, 3]) {
    if (GAMES.g2048.engine.act(state, player, { type: 'move', dir }, state.now + 10)) return dir;
  }
  return -1;
}

function playRound(state, player, time) {
  const engine = simonEngine;
  const pad = state.pads[player];
  const length = pad.round + 2;
  for (let pos = 0; pos < length; pos++) {
    engine.act(state, player, { type: 'tap', index: state.moves[pos] }, time + pos);
  }
}

class FakeClassList {
  constructor() {
    this.names = new Set();
  }
  add(...names) {
    for (const name of names) this.names.add(name);
  }
  remove(...names) {
    for (const name of names) this.names.delete(name);
  }
  contains(name) {
    return this.names.has(name);
  }
  toggle(name, force) {
    const next = force === undefined ? !this.names.has(name) : Boolean(force);
    if (next) this.names.add(name);
    else this.names.delete(name);
    return next;
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.dataset = {};
    this.classList = new FakeClassList();
    this.listeners = {};
    this._className = '';
    this._text = '';
    this.disabled = false;
    this.type = '';
    this.style = { setProperty: (name, value) => { this.style[name] = value; } };
  }
  set className(value) {
    this._className = String(value);
    this.classList = new FakeClassList();
    for (const name of this._className.split(/\s+/)) if (name) this.classList.add(name);
  }
  get className() {
    return this._className;
  }
  set textContent(value) {
    this._text = String(value);
  }
  get textContent() {
    return this._text;
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    return this.attributes[name];
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  append(...nodes) {
    for (const node of nodes) this.appendChild(node);
  }
  replaceChildren(...nodes) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    for (const node of nodes) this.appendChild(node);
  }
  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }
  removeEventListener(type, handler) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((item) => item !== handler);
  }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
  focus() {}
}

const dom = {
  head: new FakeElement('head'),
  listeners: {},
  activeElement: null,
  createElement(tagName) {
    return new FakeElement(tagName);
  },
  addEventListener(type, handler) {
    if (!dom.listeners[type]) dom.listeners[type] = [];
    dom.listeners[type].push(handler);
  },
  removeEventListener(type, handler) {
    if (!dom.listeners[type]) return;
    dom.listeners[type] = dom.listeners[type].filter((item) => item !== handler);
  },
};

globalThis.document = dom;

function resetDom() {
  dom.head.children = [];
  dom.listeners = {};
}

for (const id of ORDER) {
  test(`${id} 引擎同 seed 状态一致且可 JSON 序列化`, () => {
    const engine = GAMES[id].engine;
    const a = engine.create(20261022, 1000);
    const b = engine.create(20261022, 1000);
    assert.deepEqual(a, b);
    assertJsonState(a);
    const c = engine.create(20261023, 1000);
    assert.notDeepEqual(a, c);
  });

  test(`${id} 视图对双方都无下划线键且不泄露隐藏信息`, () => {
    const engine = GAMES[id].engine;
    const state = engine.create(31415, 0);
    const viewA = engine.view(state, 0);
    const viewB = engine.view(state, 1);
    assertCleanView(viewA);
    assertCleanView(viewB);
    assert.notEqual(viewA, viewB);
    assert.equal(typeof viewA.status, 'string');
    assert.equal(viewA.scores.length, 2);
    assert.equal(viewA.you, 0);
    assert.equal(viewB.you, 1);
  });

  test(`${id} 视图可随对局推进稳定输出`, () => {
    const engine = GAMES[id].engine;
    const state = engine.create(2718, 0);
    for (let tick = 100; tick <= 3000; tick += 100) engine.step(state, tick);
    assertCleanView(engine.view(state, 0));
    assertCleanView(engine.view(state, 1));
    assertJsonState(state);
  });
}

test('memory 合法翻牌、配对得分并保持回合', () => {
  const state = memoryEngine.create(101, 0);
  const [a, b] = findPair(state.deck);
  assert.notEqual(a, -1);
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: a }, 100), true);
  assert.equal(state.pending.length, 1);
  assert.equal(state.scores[0], 0);
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: b }, 200), true);
  assert.equal(state.scores[0], 1);
  assert.equal(state.turn, 0);
  assert.deepEqual(state.pending, []);
  assert.equal(state.matched[a] !== -1, true);
  assert.equal(state.matched[b] !== -1, true);
});

test('memory 不匹配后进入收牌并交换回合', () => {
  const state = memoryEngine.create(303, 0);
  const [a, b] = findPair(state.deck);
  const other = state.deck.findIndex((value, index) => index !== a && index !== b && value !== state.deck[a]);
  assert.notEqual(other, -1);
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: a }, 10), true);
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: other }, 20), true);
  assert.equal(state.resolveAt, 920);
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: b }, 30), false);
  assert.equal(memoryEngine.step(state, 919), false);
  assert.equal(memoryEngine.step(state, 920), true);
  assert.equal(state.turn, 1);
  assert.deepEqual(state.pending, []);
});

test('memory 非法操作一律拒绝且不抛异常', () => {
  const state = memoryEngine.create(404, 0);
  assert.equal(memoryEngine.act(state, 1, { type: 'flip', index: 0 }, 10), false);
  assert.equal(memoryEngine.act(state, 0, null, 10), false);
  assert.equal(memoryEngine.act(state, 0, {}, 10), false);
  assert.equal(memoryEngine.act(state, 0, { type: 'tap', index: 0 }, 10), false);
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: 16 }, 10), false);
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: -1 }, 10), false);
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: 1.5 }, 10), false);
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: '2' }, 10), false);
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: 0 }, 10), true);
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: 0 }, 20), false);
});

test('memory 已翻开的牌不能重复翻开', () => {
  const state = memoryEngine.create(505, 0);
  const [a, b] = findPair(state.deck);
  memoryEngine.act(state, 0, { type: 'flip', index: a }, 10);
  memoryEngine.act(state, 0, { type: 'flip', index: b }, 20);
  assert.equal(memoryEngine.act(state, 4, { type: 'flip', index: b }, 30), false);
  assert.equal(memoryEngine.act(state, 1, { type: 'flip', index: b }, 30), false);
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: a }, 30), false);
});

test('memory 全部配对后按配对数判定胜负', () => {
  const state = memoryEngine.create(606, 0);
  state.deck[0] = 5;
  state.deck[1] = 5;
  state.matched = state.matched.map(() => 0);
  state.matched[0] = -1;
  state.matched[1] = -1;
  state.scores = [5, 4];
  state.turn = 0;
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: 0 }, 100), true);
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: 1 }, 200), true);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  assert.equal(state.scores[0], 6);
  assert.equal(memoryEngine.act(state, 0, { type: 'flip', index: 2 }, 300), false);
});

test('memory 回合超时与整局超时判定', () => {
  const state = memoryEngine.create(707, 0);
  assert.equal(memoryEngine.step(state, 20000), true);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 1);
  const drawn = memoryEngine.create(708, 0);
  assert.equal(memoryEngine.step(drawn, 180000), true);
  assert.equal(drawn.status, 'done');
  assert.equal(drawn.winner, -1);
});

test('memory 视图隐藏未翻开的牌面并拷贝数组', () => {
  const state = memoryEngine.create(808, 0);
  const view = memoryEngine.view(state, 0);
  assert.equal(view.cards.length, 16);
  assert.equal(view.cards.every((value) => value === -1), true);
  memoryEngine.act(state, 0, { type: 'flip', index: 0 }, 100);
  const opened = memoryEngine.view(state, 0);
  assert.equal(opened.cards[0], state.deck[0]);
  assert.equal(opened.cards.filter((value) => value !== -1).length, 1);
  opened.cards[0] = 99;
  opened.pending.push(9);
  assert.notEqual(state.deck[0], 99);
  assert.equal(state.pending.includes(9), false);
  assert.notEqual(memoryEngine.view(state, 0).cards[0], 99);
});

test('memory 同 seed 相同操作结果一致', () => {
  const actions = [
    { type: 'flip', index: 0 },
    { type: 'flip', index: 3 },
    { type: 'flip', index: 1 },
    { type: 'flip', index: 2 },
  ];
  const a = memoryEngine.create(909, 0);
  const b = memoryEngine.create(909, 0);
  for (let i = 0; i < actions.length; i++) {
    memoryEngine.act(a, a.turn, actions[i], 100 + i * 10);
    memoryEngine.act(b, b.turn, actions[i], 100 + i * 10);
  }
  assert.deepEqual(a, b);
});

test('quiz 合法作答、扣分与揭晓', () => {
  const state = quizEngine.create(11, 0);
  const question = state.questions[0];
  const wrong = question.correct === 0 ? 1 : 0;
  assert.equal(quizEngine.act(state, 0, { type: 'answer', index: question.correct }, 100), true);
  assert.equal(state.scores[0], 1);
  assert.equal(quizEngine.act(state, 0, { type: 'answer', index: 1 }, 200), false);
  assert.equal(state.revealAt, null);
  const waiting = quizEngine.view(state, 0);
  assert.equal(waiting.youPicked, question.correct);
  assert.equal(waiting.rivalPicked, -1);
  assert.equal(waiting.feedback.rival, null);
  assert.equal(quizEngine.act(state, 1, { type: 'answer', index: wrong }, 300), true);
  assert.equal(state.scores[1], -1);
  assert.equal(state.revealAt, 1700);
  const revealed = quizEngine.view(state, 0);
  assert.equal(revealed.revealed, true);
  assert.equal(revealed.feedback.rival, 'wrong');
  assert.equal(quizEngine.act(state, 0, { type: 'answer', index: 2 }, 400), false);
  assert.equal(quizEngine.step(state, 1700), true);
  assert.equal(state.qi, 1);
  assert.deepEqual(state.answers, [-1, -1]);
});

test('quiz 本题超时与下一题推进', () => {
  const state = quizEngine.create(12, 0);
  assert.equal(quizEngine.step(state, 12000), true);
  assert.equal(state.revealAt, 13400);
  assert.equal(quizEngine.step(state, 13400), true);
  assert.equal(state.qi, 1);
  assert.equal(quizEngine.step(state, 13400), false);
  assert.equal(quizEngine.act(state, 0, { type: 'answer', index: 0 }, 16000), true);
});

test('quiz 全部答完按总分判定胜负', () => {
  const state = quizEngine.create(13, 0);
  state.qi = 7;
  state.answers = [-1, -1];
  state.revealAt = null;
  state.qEndsAt = 5000;
  state.scores = [2, 1];
  const question = state.questions[7];
  const wrong = question.correct === 0 ? 1 : 0;
  quizEngine.act(state, 0, { type: 'answer', index: question.correct }, 10);
  quizEngine.act(state, 1, { type: 'answer', index: wrong }, 20);
  assert.equal(quizEngine.step(state, state.revealAt), true);
  assert.equal(state.status, 'done');
  assert.equal(state.qi, 8);
  assert.equal(state.winner, 0);
  assert.equal(quizEngine.act(state, 0, { type: 'answer', index: 0 }, 5000), false);
});

test('quiz 整局超时按总分判定胜负', () => {
  const state = quizEngine.create(14, 0);
  state.scores = [3, 1];
  assert.equal(quizEngine.step(state, 140000), true);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  const drawn = quizEngine.create(15, 0);
  assert.equal(quizEngine.step(drawn, 140000), true);
  assert.equal(drawn.winner, -1);
});

test('quiz 非法操作一律拒绝', () => {
  const state = quizEngine.create(16, 0);
  assert.equal(quizEngine.act(state, 2, { type: 'answer', index: 0 }, 10), false);
  assert.equal(quizEngine.act(state, '0', { type: 'answer', index: 0 }, 10), false);
  assert.equal(quizEngine.act(state, 0, null, 10), false);
  assert.equal(quizEngine.act(state, 0, { type: 'flip' }, 10), false);
  assert.equal(quizEngine.act(state, 0, { type: 'answer', index: 4 }, 10), false);
  assert.equal(quizEngine.act(state, 0, { type: 'answer', index: -1 }, 10), false);
  assert.equal(quizEngine.act(state, 0, { type: 'answer', index: 1.5 }, 10), false);
  assert.equal(quizEngine.act(state, 0, { type: 'answer', index: '1' }, 10), false);
  assert.equal(quizEngine.act(state, 0, { type: 'answer', index: 0 }, 12000), false);
});

test('quiz 视图不泄露正确答案与对手选择', () => {
  const state = quizEngine.create(17, 0);
  const view = quizEngine.view(state, 0);
  const text = JSON.stringify(view);
  assert.equal(text.includes('"correct"'), false);
  view.options[0] = '被篡改';
  assert.notEqual(state.questions[0].options[0], '被篡改');
  assert.equal(view.rivalPicked, -1);
  assert.equal(view.feedback.rival, null);
  assert.equal(view.revealed, false);
});

test('g2048 合法移动会合并计分并生成新牌', () => {
  const state = g2048Engine.create(21, 0);
  const before = state.boards[1].slice();
  const dir = moveDir(state, 0);
  assert.notEqual(dir, -1);
  assert.equal(state.moves[0], 1);
  assert.equal(state.cursors[0], 3);
  assert.equal(state.boards[0].filter((value) => value !== 0).length >= 2, true);
  assert.deepEqual(state.boards[1], before);
  assert.equal(state.scores[0] >= 0, true);
});

test('g2048 非法操作与无变化方向一律拒绝', () => {
  const state = g2048Engine.create(22, 0);
  assert.equal(g2048Engine.act(state, 2, { type: 'move', dir: 0 }, 10), false);
  assert.equal(g2048Engine.act(state, 0, null, 10), false);
  assert.equal(g2048Engine.act(state, 0, { type: 'flip', dir: 0 }, 10), false);
  assert.equal(g2048Engine.act(state, 0, { type: 'move', dir: 4 }, 10), false);
  assert.equal(g2048Engine.act(state, 0, { type: 'move', dir: -1 }, 10), false);
  assert.equal(g2048Engine.act(state, 0, { type: 'move', dir: 1.5 }, 10), false);
  assert.equal(g2048Engine.act(state, 0, { type: 'move', dir: '1' }, 10), false);
  state.boards[0] = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  state.locked[0] = false;
  for (const dir of [0, 1, 2, 3]) {
    assert.equal(g2048Engine.act(state, 0, { type: 'move', dir }, 20), false);
  }
});

test('g2048 整局超时与双方锁定判定胜负', () => {
  const state = g2048Engine.create(23, 0);
  state.scores = [120, 80];
  assert.equal(g2048Engine.step(state, 180000), true);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  const drawn = g2048Engine.create(24, 0);
  assert.equal(g2048Engine.step(drawn, 180000), true);
  assert.equal(drawn.winner, -1);
  const locked = g2048Engine.create(25, 0);
  locked.locked = [true, true];
  locked.scores = [30, 40];
  assert.equal(g2048Engine.step(locked, 100), true);
  assert.equal(locked.winner, 1);
});

test('g2048 视图不泄露发牌序列且棋盘为拷贝', () => {
  const state = g2048Engine.create(26, 0);
  const view = g2048Engine.view(state, 0);
  assert.equal(view.board.length, 16);
  assert.deepEqual(view.board, state.boards[0]);
  view.board[0] = 4096;
  assert.notEqual(state.boards[0][0], 4096);
  assert.equal(view.rival.locked, false);
  assert.equal(typeof view.rival.moves, 'number');
  assertNoArrayLike(view, state.spawns);
});

test('g2048 最高数字随合并更新', () => {
  const state = g2048Engine.create(28, 0);
  state.boards[0] = [2, 2, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  state.best[0] = 4;
  assert.equal(g2048Engine.act(state, 0, { type: 'move', dir: 3 }, 100), true);
  assert.equal(state.best[0] >= 8, true);
  assert.equal(state.boards[0][0], 4);
  assert.equal(state.boards[0][1], 8);
});

test('g2048 同 seed 相同移动结果一致', () => {
  const a = g2048Engine.create(27, 0);
  const b = g2048Engine.create(27, 0);
  for (let index = 0; index < 6; index++) {
    const dir = (index * 3 + 1) % 4;
    g2048Engine.act(a, index % 2, { type: 'move', dir }, 100 + index);
    g2048Engine.act(b, index % 2, { type: 'move', dir }, 100 + index);
  }
  assert.deepEqual(a, b);
});

test('sudoku 合法填数与失误扣分', () => {
  const state = sudokuEngine.create(31, 0);
  const blank = blankOf(state);
  assert.notEqual(blank, -1);
  const correctValue = state.solution[blank];
  const wrongValue = correctValue === 9 ? 1 : correctValue + 1;
  assert.equal(state.correct[0], 34);
  assert.equal(sudokuEngine.act(state, 0, { type: 'fill', index: blank, value: correctValue }, 100), true);
  assert.equal(state.correct[0], 35);
  assert.equal(state.errors[0], 0);
  assert.equal(state.scores[0], 35);
  assert.equal(sudokuEngine.act(state, 0, { type: 'fill', index: blank, value: wrongValue }, 200), true);
  assert.equal(state.correct[0], 34);
  assert.equal(state.errors[0], 1);
  assert.equal(state.scores[0], 33);
  assert.equal(sudokuEngine.act(state, 0, { type: 'fill', index: blank, value: wrongValue }, 300), false);
  assert.equal(sudokuEngine.act(state, 0, { type: 'fill', index: blank, value: 0 }, 400), true);
  assert.equal(state.correct[0], 34);
  assert.equal(state.scores[0], 33);
});

test('sudoku 非法操作一律拒绝', () => {
  const state = sudokuEngine.create(32, 0);
  const given = state.givens.findIndex((value) => value !== 0);
  const blank = blankOf(state);
  assert.equal(sudokuEngine.act(state, 2, { type: 'fill', index: blank, value: 1 }, 10), false);
  assert.equal(sudokuEngine.act(state, 0, null, 10), false);
  assert.equal(sudokuEngine.act(state, 0, { type: 'flip', index: blank, value: 1 }, 10), false);
  assert.equal(sudokuEngine.act(state, 0, { type: 'fill', index: 81, value: 1 }, 10), false);
  assert.equal(sudokuEngine.act(state, 0, { type: 'fill', index: -1, value: 1 }, 10), false);
  assert.equal(sudokuEngine.act(state, 0, { type: 'fill', index: 1.5, value: 1 }, 10), false);
  assert.equal(sudokuEngine.act(state, 0, { type: 'fill', index: blank, value: 10 }, 10), false);
  assert.equal(sudokuEngine.act(state, 0, { type: 'fill', index: blank, value: -1 }, 10), false);
  assert.equal(sudokuEngine.act(state, 0, { type: 'fill', index: blank, value: 1.5 }, 10), false);
  assert.equal(sudokuEngine.act(state, 0, { type: 'fill', index: blank, value: '3' }, 10), false);
  assert.equal(sudokuEngine.act(state, 0, { type: 'fill', index: given, value: state.solution[given] }, 10), false);
});

test('sudoku 先全部填对者获胜', () => {
  const state = sudokuEngine.create(33, 0);
  const blank = blankOf(state);
  state.boards[0] = state.solution.slice();
  state.boards[0][blank] = 0;
  state.correct[0] = 80;
  state.errors[0] = 0;
  state.scores[0] = 80;
  assert.equal(sudokuEngine.act(state, 0, { type: 'fill', index: blank, value: state.solution[blank] }, 100), true);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  assert.equal(sudokuEngine.act(state, 1, { type: 'fill', index: blank, value: 1 }, 200), false);
});

test('sudoku 整局超时按得分判定胜负', () => {
  const state = sudokuEngine.create(34, 0);
  state.correct = [42, 38];
  state.errors = [0, 0];
  state.scores = [42, 38];
  assert.equal(sudokuEngine.step(state, 300000), true);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  const drawn = sudokuEngine.create(35, 0);
  assert.equal(sudokuEngine.step(drawn, 300000), true);
  assert.equal(drawn.winner, -1);
});

test('sudoku 视图不泄露答案且棋盘为拷贝', () => {
  const state = sudokuEngine.create(36, 0);
  const view = sudokuEngine.view(state, 0);
  const text = JSON.stringify(view);
  assert.equal(text.includes('"solution"'), false);
  assertNoArrayLike(view, state.solution);
  assert.equal(view.givens.filter((value) => value === 0).length, 47);
  assert.equal(view.givens.every((value, index) => value === 0 || value === state.solution[index]), true);
  assert.deepEqual(Object.keys(view.rival).sort(), ['correct', 'errors']);
  const blank = blankOf(state);
  view.board[blank] = 9;
  assert.notEqual(state.boards[0][blank], 9);
  assert.equal(sudokuEngine.view(state, 0).board[blank], 0);
});

test('sudoku 同 seed 相同填数结果一致', () => {
  const a = sudokuEngine.create(37, 0);
  const b = sudokuEngine.create(37, 0);
  const blank = blankOf(a);
  sudokuEngine.act(a, 0, { type: 'fill', index: blank, value: a.solution[blank] }, 100);
  sudokuEngine.act(b, 0, { type: 'fill', index: blank, value: b.solution[blank] }, 100);
  sudokuEngine.act(a, 1, { type: 'fill', index: blank, value: 1 }, 200);
  sudokuEngine.act(b, 1, { type: 'fill', index: blank, value: 1 }, 200);
  assert.deepEqual(a, b);
});

test('simon 记住并复现一轮后得分', () => {
  const state = simonEngine.create(41, 0);
  assert.equal(simonEngine.act(state, 0, { type: 'tap', index: 0 }, 100), false);
  assert.equal(simonEngine.step(state, 5120), true);
  assert.equal(state.pads[0].phase, 'input');
  assert.equal(state.pads[1].phase, 'input');
  playRound(state, 0, 5200);
  assert.equal(state.scores[0], 1);
  assert.equal(state.pads[0].round, 2);
  assert.equal(state.pads[0].phase, 'show');
  assert.equal(simonEngine.act(state, 1, { type: 'tap', index: (state.moves[0] + 1) % 4 }, 5300), true);
  assert.equal(state.pads[1].errors, 1);
  assert.equal(simonEngine.step(state, 5120), false);
});

test('simon 按错会重播当前轮', () => {
  const state = simonEngine.create(42, 0);
  simonEngine.step(state, 5120);
  const first = state.moves[0];
  const wrong = (first + 1) % 4;
  assert.equal(simonEngine.act(state, 0, { type: 'tap', index: wrong }, 5200), true);
  assert.equal(state.pads[0].errors, 1);
  assert.equal(state.pads[0].phase, 'show');
  assert.equal(state.pads[0].pos, 0);
  assert.equal(state.scores[0], 0);
  assert.equal(simonEngine.act(state, 0, { type: 'tap', index: first }, 5300), false);
});

test('simon 先到十分获胜', () => {
  const state = simonEngine.create(43, 0);
  state.pads[0].phase = 'input';
  state.pads[0].round = 3;
  state.pads[0].pos = 4;
  state.scores[0] = 9;
  assert.equal(simonEngine.act(state, 0, { type: 'tap', index: state.moves[4] }, 100), true);
  assert.equal(state.scores[0], 10);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  assert.equal(simonEngine.act(state, 0, { type: 'tap', index: 0 }, 200), false);
});

test('simon 整局超时按轮数判定胜负', () => {
  const state = simonEngine.create(44, 0);
  state.scores = [4, 3];
  assert.equal(simonEngine.step(state, 240000), true);
  assert.equal(state.status, 'done');
  assert.equal(state.winner, 0);
  const drawn = simonEngine.create(45, 0);
  assert.equal(simonEngine.step(drawn, 240000), true);
  assert.equal(drawn.winner, -1);
});

test('simon 非法操作一律拒绝', () => {
  const state = simonEngine.create(46, 0);
  simonEngine.step(state, 5120);
  assert.equal(simonEngine.act(state, 2, { type: 'tap', index: 0 }, 5200), false);
  assert.equal(simonEngine.act(state, 0, null, 5200), false);
  assert.equal(simonEngine.act(state, 0, { type: 'flip', index: 0 }, 5200), false);
  assert.equal(simonEngine.act(state, 0, { type: 'tap', index: 4 }, 5200), false);
  assert.equal(simonEngine.act(state, 0, { type: 'tap', index: -1 }, 5200), false);
  assert.equal(simonEngine.act(state, 0, { type: 'tap', index: 1.5 }, 5200), false);
  assert.equal(simonEngine.act(state, 0, { type: 'tap', index: '0' }, 5200), false);
  const fresh = simonEngine.create(47, 0);
  assert.equal(simonEngine.act(fresh, 0, { type: 'tap', index: 0 }, 100), false);
});

test('simon 视图不泄露完整序列且只暴露当前灯', () => {
  const state = simonEngine.create(48, 0);
  const view = simonEngine.view(state, 0);
  const text = JSON.stringify(state.moves);
  assert.notEqual(text, '');
  assert.equal(JSON.stringify(view).includes(text), false);
  assert.equal(view.lit >= -1 && view.lit <= 3, true);
  simonEngine.step(state, 5120);
  const input = simonEngine.view(state, 0);
  assert.equal(input.phase, 'input');
  assert.equal(input.lit, -1);
  assert.equal(input.length, 3);
  assert.deepEqual(Object.keys(input.rival).sort(), ['errors', 'round', 'score']);
});

test('simon 同 seed 相同操作结果一致', () => {
  const a = simonEngine.create(49, 0);
  const b = simonEngine.create(49, 0);
  simonEngine.step(a, 5120);
  simonEngine.step(b, 5120);
  playRound(a, 0, 5200);
  playRound(b, 0, 5200);
  assert.deepEqual(a, b);
});

for (const id of ORDER) {
  test(`${id} 视图可挂载、更新、卸载并注入 tws- 样式`, () => {
    resetDom();
    const { engine, view } = GAMES[id];
    const root = new FakeElement('div');
    const sent = [];
    const sounds = [];
    const api = {
      me: 0,
      names: ['阿松', '阿果'],
      send: (action) => sent.push(action),
      sound: (name) => sounds.push(name),
    };
    const handle = view.mount(root, api);
    try {
      assert.equal(root.children.length, 1);
      assert.equal(dom.head.children.length, 1);
      const css = dom.head.children[0].textContent;
      assert.match(css, /\.tws-/);
      assert.match(css, /--tw-/);
      assert.match(css, /prefers-reduced-motion/);
      assert.equal(css.includes('100vw'), false);
      const state = engine.create(909, 0);
      handle.update(engine.view(state, 0));
      handle.update(engine.view(state, 1));
      state.status = 'done';
      state.winner = 1;
      state.message = '对局结束';
      handle.update(engine.view(state, 0));
    } finally {
      handle.unmount();
    }
    assert.equal(root.children.length, 0);
    assert.equal(dom.head.children.length, 0);
    assert.deepEqual(dom.listeners.keydown || [], []);
  });
}