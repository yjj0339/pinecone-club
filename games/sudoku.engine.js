import { rng, open, finish, live, pane, int } from './kit.js';

const MATCH_MS = 300000;
const GIVEN_MASK = [
  0, 9, 12, 15, 16, 17, 19, 21, 22, 23, 26, 28, 30, 32, 33, 34, 35,
  39, 40, 41, 46, 51, 53, 61, 63, 64, 68, 69, 70, 74, 75, 77, 78, 80,
];

function baseGrid() {
  const grid = [];
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    grid.push(((row * 3 + Math.floor(row / 3) + col) % 9) + 1);
  }
  return grid;
}

function compare(state) {
  if (state.scores[0] === state.scores[1]) return -1;
  return state.scores[0] > state.scores[1] ? 0 : 1;
}

function label(player) {
  return player === 0 ? '玩家一' : '玩家二';
}

export function create(seed, now) {
  const random = rng(seed);
  const grid = baseGrid();
  const digitMap = random.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const bands = random.shuffle([0, 1, 2]);
  const slots = [random.shuffle([0, 1, 2]), random.shuffle([0, 1, 2]), random.shuffle([0, 1, 2])];
  const stacks = random.shuffle([0, 1, 2]);
  const stacksSlots = [random.shuffle([0, 1, 2]), random.shuffle([0, 1, 2]), random.shuffle([0, 1, 2])];
  const rows = [];
  for (const band of bands) for (const slot of slots[band]) rows.push(band * 3 + slot);
  const cols = [];
  for (const stack of stacks) for (const slot of stacksSlots[stack]) cols.push(stack * 3 + slot);
  const flip = random.next() < 0.5;
  const mask = new Set(GIVEN_MASK);
  const solution = Array(81).fill(0);
  const givens = Array(81).fill(0);
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const oldRow = flip ? rows[col] : rows[row];
      const oldCol = flip ? cols[row] : cols[col];
      const baseIndex = oldRow * 9 + oldCol;
      const value = digitMap[grid[baseIndex] - 1];
      solution[row * 9 + col] = value;
      if (mask.has(baseIndex)) givens[row * 9 + col] = value;
    }
  }
  const state = open(now, MATCH_MS, '双方挑战同一道数独，先全部填对者获胜。');
  state.simultaneous = true;
  state.turn = -1;
  state.solution = solution;
  state.givens = givens;
  state.boards = [givens.slice(), givens.slice()];
  state.correct = [GIVEN_MASK.length, GIVEN_MASK.length];
  state.errors = [0, 0];
  state.scores = [GIVEN_MASK.length, GIVEN_MASK.length];
  return state;
}

export function act(state, player, action, now) {
  if (!live(state)) return false;
  if (player !== 0 && player !== 1) return false;
  if (!action || action.type !== 'fill') return false;
  if (!int(action.index, 0, 80)) return false;
  if (!int(action.value, 0, 9)) return false;
  if (state.givens[action.index] !== 0) return false;
  const board = state.boards[player];
  if (board[action.index] === action.value) return false;
  state.now = now;
  board[action.index] = action.value;
  if (action.value !== 0 && action.value !== state.solution[action.index]) {
    state.errors[player] += 1;
  }
  let correct = 0;
  for (let i = 0; i < 81; i++) {
    if (board[i] !== 0 && board[i] === state.solution[i]) correct += 1;
  }
  state.correct[player] = correct;
  state.scores[player] = correct - state.errors[player];
  if (correct === 81) {
    finish(state, player, `${label(player)}先填完数独，获胜。`);
    return true;
  }
  if (action.value === 0) state.message = '已清除这一格。';
  else if (action.value === state.solution[action.index]) state.message = '填对了，继续。';
  else state.message = '这个数字不对，失误加一。';
  return true;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (now >= state.endsAt) {
    const winner = compare(state);
    finish(state, winner, winner === -1 ? '时间到，双方得分相同。' : `时间到，${label(winner)}得分更高。`);
    return true;
  }
  return false;
}

export function view(state, player) {
  return {
    ...pane(state),
    givens: state.givens.slice(),
    board: state.boards[player].slice(),
    correct: state.correct[player],
    errors: state.errors[player],
    total: 81,
    rival: { correct: state.correct[1 - player], errors: state.errors[1 - player] },
    you: player,
  };
}