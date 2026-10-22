import { rng, open, finish, live, pane, int } from './kit.js';

const CELLS = 16;
const SPAWN_COUNT = 512;
const MATCH_MS = 180000;

function rows() {
  const out = [];
  for (let r = 0; r < 4; r++) out.push([r * 4, r * 4 + 1, r * 4 + 2, r * 4 + 3]);
  return out;
}

function cols() {
  const out = [];
  for (let c = 0; c < 4; c++) out.push([c, c + 4, c + 8, c + 12]);
  return out;
}

function linesFor(dir) {
  const rowLines = rows();
  const colLines = cols();
  if (dir === 0) return colLines;
  if (dir === 2) return colLines.map((line) => line.slice().reverse());
  if (dir === 3) return rowLines;
  return rowLines.map((line) => line.slice().reverse());
}

function slide(board, dir) {
  const lines = linesFor(dir);
  const next = board.slice();
  let gained = 0;
  for (const line of lines) {
    const values = [];
    for (const index of line) {
      if (board[index] !== 0) values.push(board[index]);
    }
    const merged = [];
    for (let i = 0; i < values.length; i++) {
      if (i + 1 < values.length && values[i] === values[i + 1]) {
        const value = values[i] * 2;
        merged.push(value);
        gained += value;
        i += 1;
      } else {
        merged.push(values[i]);
      }
    }
    for (let k = 0; k < line.length; k++) next[line[k]] = k < merged.length ? merged[k] : 0;
  }
  let moved = false;
  for (let i = 0; i < CELLS; i++) {
    if (next[i] !== board[i]) {
      moved = true;
      break;
    }
  }
  return { board: next, gained, moved };
}

function place(state, player) {
  const spawn = state.spawns[state.cursors[player] % state.spawns.length];
  const board = state.boards[player];
  let index = spawn.at;
  while (board[index] !== 0) index = (index + 1) % CELLS;
  const value = spawn.four ? 4 : 2;
  board[index] = value;
  state.cursors[player] += 1;
  if (value > state.best[player]) state.best[player] = value;
}

function canMove(board) {
  for (let i = 0; i < CELLS; i++) {
    if (board[i] === 0) return true;
    const x = i % 4;
    const y = Math.floor(i / 4);
    if (x < 3 && board[i] === board[i + 1]) return true;
    if (y < 3 && board[i] === board[i + 4]) return true;
  }
  return false;
}

function compare(state) {
  if (state.scores[0] === state.scores[1]) return -1;
  return state.scores[0] > state.scores[1] ? 0 : 1;
}

function label(player) {
  return player === 0 ? '玩家一' : '玩家二';
}

function settle(state) {
  const winner = compare(state);
  finish(state, winner, winner === -1 ? '时间到，双方分数相同。' : `时间到，${label(winner)}分数更高。`);
}

export function create(seed, now) {
  const random = rng(seed);
  const spawns = [];
  for (let i = 0; i < SPAWN_COUNT; i++) {
    spawns.push({ at: random.int(CELLS), four: random.next() < 0.12 ? 1 : 0 });
  }
  const state = open(now, MATCH_MS, '双方同种子开局，三分钟内分数高者获胜。');
  state.simultaneous = true;
  state.turn = -1;
  state.spawns = spawns;
  state.cursors = [0, 0];
  state.boards = [Array(CELLS).fill(0), Array(CELLS).fill(0)];
  state.best = [0, 0];
  state.locked = [false, false];
  state.moves = [0, 0];
  for (let player = 0; player < 2; player++) {
    place(state, player);
    place(state, player);
  }
  return state;
}

export function act(state, player, action, now) {
  if (!live(state)) return false;
  if (player !== 0 && player !== 1) return false;
  if (state.locked[player]) return false;
  if (now >= state.endsAt) return false;
  if (!action || action.type !== 'move') return false;
  if (!int(action.dir, 0, 3)) return false;
  const result = slide(state.boards[player], action.dir);
  if (!result.moved) return false;
  state.now = now;
  state.boards[player] = result.board;
  state.scores[player] += result.gained;
  state.moves[player] += 1;
  place(state, player);
  for (let i = 0; i < CELLS; i++) {
    const value = state.boards[player][i];
    if (value > state.best[player]) state.best[player] = value;
  }
  if (!canMove(state.boards[player])) state.locked[player] = true;
  if (state.locked[0] && state.locked[1]) {
    const winner = compare(state);
    finish(state, winner, winner === -1 ? '双方都无法移动，分数相同。' : `${label(winner)}分数更高，获胜。`);
    return true;
  }
  state.message = state.locked[player] ? '你已无可用移动，等待时间结束。' : '继续合并数字。';
  return true;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (now >= state.endsAt) {
    settle(state);
    return true;
  }
  if (state.locked[0] && state.locked[1]) {
    const winner = compare(state);
    finish(state, winner, winner === -1 ? '双方都无法移动，分数相同。' : `${label(winner)}分数更高，获胜。`);
    return true;
  }
  return false;
}

export function view(state, player) {
  return {
    ...pane(state),
    board: state.boards[player].slice(),
    best: state.best[player],
    moves: state.moves[player],
    locked: state.locked[player],
    rival: {
      best: state.best[1 - player],
      moves: state.moves[1 - player],
      locked: state.locked[1 - player],
    },
    you: player,
  };
}