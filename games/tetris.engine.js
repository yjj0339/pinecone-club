import { rng, open, finish, live, pane } from './kit.js';

const COLS = 10;
const ROWS = 18;
const LIMIT = 240000;
const BASE_INTERVAL = 700;
const MIN_INTERVAL = 170;
const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const SHAPES = {
  I: { box: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]], color: 1 },
  O: { box: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: 2 },
  T: { box: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]], color: 3 },
  S: { box: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]], color: 4 },
  Z: { box: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]], color: 5 },
  J: { box: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: 6 },
  L: { box: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: 7 },
};

const SCORES = [0, 100, 300, 500, 800];

function roll(state) {
  state.rolls += 1;
  return rng((state.seed + Math.imul(state.rolls, 2654435761)) >>> 0).next();
}

function emptyBoard() {
  return new Array(COLS * ROWS).fill(0);
}

function cellsOf(piece) {
  const def = SHAPES[piece.t];
  let cells = def.cells;
  for (let i = 0; i < piece.r; i++) {
    cells = cells.map(([x, y]) => [def.box - 1 - y, x]);
  }
  return cells;
}

function collides(board, cells, x, y) {
  for (const [cx, cy] of cells) {
    const bx = x + cx;
    const by = y + cy;
    if (bx < 0 || bx >= COLS || by >= ROWS || by < 0) return true;
    if (board[by * COLS + bx]) return true;
  }
  return false;
}

function extendSeq(state) {
  const bag = TYPES.slice();
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(roll(state) * (i + 1));
    const tmp = bag[i];
    bag[i] = bag[j];
    bag[j] = tmp;
  }
  for (const type of bag) state.seq.push(type);
}

function fallInterval(player) {
  return Math.max(MIN_INTERVAL, BASE_INTERVAL - player.lines * 14);
}

function clearLines(board) {
  let cleared = 0;
  let y = ROWS - 1;
  while (y >= 0) {
    let full = true;
    for (let x = 0; x < COLS; x++) {
      if (!board[y * COLS + x]) {
        full = false;
        break;
      }
    }
    if (full) {
      board.splice(y * COLS, COLS);
      board.unshift(...new Array(COLS).fill(0));
      cleared += 1;
    } else {
      y -= 1;
    }
  }
  return cleared;
}

function spawnPiece(state, player, now) {
  const spot = state.players[player];
  if (state.seq.length < spot.pi + 8) extendSeq(state);
  const type = state.seq[spot.pi];
  spot.pi += 1;
  spot.piece = { t: type, r: 0, x: Math.floor((COLS - SHAPES[type].box) / 2), y: 0 };
  spot.dropAt = now + fallInterval(spot);
  if (collides(state.boards[player], cellsOf(spot.piece), spot.piece.x, spot.piece.y)) {
    spot.topped = true;
  }
}

function sendGarbage(state, target, count) {
  const spot = state.players[target];
  if (spot.topped) return;
  for (let i = 0; i < count; i++) {
    const board = state.boards[target];
    const top = board.slice(0, COLS);
    if (top.some((value) => value > 0)) {
      spot.topped = true;
      return;
    }
    const hole = Math.floor(roll(state) * COLS);
    const row = new Array(COLS).fill(8);
    row[hole] = 0;
    state.boards[target] = board.slice(COLS).concat(row);
    if (spot.piece) {
      spot.piece.y -= 1;
      if (spot.piece.y < 0) spot.piece.y = 0;
      if (collides(state.boards[target], cellsOf(spot.piece), spot.piece.x, spot.piece.y)) {
        spot.topped = true;
        return;
      }
    }
  }
}

function lockPiece(state, player, now) {
  const spot = state.players[player];
  const piece = spot.piece;
  const board = state.boards[player];
  for (const [cx, cy] of cellsOf(piece)) {
    const bx = piece.x + cx;
    const by = piece.y + cy;
    if (bx >= 0 && bx < COLS && by >= 0 && by < ROWS) board[by * COLS + bx] = SHAPES[piece.t].color;
  }
  const cleared = clearLines(board);
  if (cleared > 0) {
    spot.lines += cleared;
    state.scores[player] += SCORES[cleared] || 800;
    const garbage = cleared - 1;
    if (garbage > 0) sendGarbage(state, 1 - player, garbage);
  }
  spot.piece = null;
  spawnPiece(state, player, now);
}

function settle(state) {
  const topped = [0, 1].filter((index) => state.players[index].topped);
  if (topped.length === 2) return finish(state, -1, '双方同时封顶，本局和棋。');
  if (topped.length === 1) {
    const loser = topped[0];
    return finish(state, 1 - loser, `${loser === 0 ? '玩家一' : '玩家二'}的场地先被封顶，${loser === 0 ? '玩家二' : '玩家一'}获胜。`);
  }
  return false;
}

function timeout(state) {
  const a = state.players[0].lines;
  const b = state.players[1].lines;
  let winner = a === b ? -1 : a > b ? 0 : 1;
  if (winner === -1 && state.scores[0] !== state.scores[1]) winner = state.scores[0] > state.scores[1] ? 0 : 1;
  if (winner === -1) return finish(state, -1, '时间到，双方消行数相同，和棋。');
  return finish(state, winner, `时间到，${winner === 0 ? '玩家一' : '玩家二'}消行更多，获胜。`);
}

export function create(seed, now) {
  const state = open(now, LIMIT, '同序方块，消行给对方添堵，先被封顶者落败。');
  state.simultaneous = true;
  state.turn = -1;
  state.seed = (Number(seed) >>> 0) || 1;
  state.rolls = 0;
  state.lastStepAt = now;
  state.cols = COLS;
  state.rows = ROWS;
  state.seq = [];
  state.boards = [emptyBoard(), emptyBoard()];
  state.players = [0, 1].map(() => ({ pi: 0, lines: 0, topped: false, piece: null, dropAt: now }));
  for (let p = 0; p < 2; p++) spawnPiece(state, p, now);
  return state;
}

export function act(state, player, action, now) {
  if (!live(state) || (player !== 0 && player !== 1)) return false;
  const spot = state.players[player];
  if (spot.topped || !spot.piece) return false;
  if (!action || typeof action !== 'object') return false;
  const board = state.boards[player];
  const piece = spot.piece;
  const type = action.type;
  if (type === 'left' || type === 'right') {
    const dx = type === 'left' ? -1 : 1;
    if (collides(board, cellsOf(piece), piece.x + dx, piece.y)) return false;
    piece.x += dx;
    state.now = now;
    return true;
  }
  if (type === 'rotate') {
    const next = (piece.r + 1) % 4;
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collides(board, cellsOf({ t: piece.t, r: next }), piece.x + kick, piece.y)) {
        piece.r = next;
        piece.x += kick;
        state.now = now;
        return true;
      }
    }
    return false;
  }
  if (type === 'down') {
    if (!collides(board, cellsOf(piece), piece.x, piece.y + 1)) {
      piece.y += 1;
      spot.dropAt = now + fallInterval(spot);
    } else {
      lockPiece(state, player, now);
      settle(state);
    }
    state.now = now;
    return true;
  }
  if (type === 'drop') {
    let guard = 0;
    while (!collides(board, cellsOf(piece), piece.x, piece.y + 1) && guard < ROWS + 2) {
      piece.y += 1;
      guard += 1;
    }
    lockPiece(state, player, now);
    settle(state);
    state.now = now;
    return true;
  }
  return false;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (now >= state.endsAt) return timeout(state);
  if (now > state.lastStepAt) state.lastStepAt = now;
  let changed = false;
  let guard = 0;
  while (live(state) && guard < 600) {
    let due = false;
    for (let p = 0; p < 2; p++) {
      const spot = state.players[p];
      if (spot.topped || !spot.piece) continue;
      if (now < spot.dropAt) continue;
      due = true;
      changed = true;
      if (!collides(state.boards[p], cellsOf(spot.piece), spot.piece.x, spot.piece.y + 1)) {
        spot.piece.y += 1;
        spot.dropAt += fallInterval(spot);
      } else {
        lockPiece(state, p, now);
        settle(state);
      }
    }
    if (!due) break;
    guard += 1;
  }
  return changed;
}

export function view(state, player) {
  const spot = state.players[player];
  const upcoming = [];
  for (let i = 0; i < 3; i++) upcoming.push(state.seq[spot.pi + i] || 'I');
  return {
    ...pane(state),
    you: player,
    cols: COLS,
    rows: ROWS,
    boards: [state.boards[0].slice(), state.boards[1].slice()],
    pieces: state.players.map((item) => (item.piece ? { t: item.piece.t, r: item.piece.r, x: item.piece.x, y: item.piece.y } : null)),
    lines: [state.players[0].lines, state.players[1].lines],
    topped: [state.players[0].topped, state.players[1].topped],
    next: upcoming,
  };
}