import { open, finish, live, begin, turnLeft, pane, int } from './kit.js';

const SIZE = 6;
const CELLS = SIZE * SIZE;
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

function flipsFor(board, player, index) {
  if (board[index] !== -1) return [];
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  const all = [];
  for (const [dr, dc] of DIRS) {
    const line = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
      const cell = r * SIZE + c;
      if (board[cell] === 1 - player) {
        line.push(cell);
      } else if (board[cell] === player) {
        if (line.length) all.push(...line);
        break;
      } else {
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return all;
}

function legalMoves(board, player) {
  const moves = [];
  for (let index = 0; index < CELLS; index++) {
    if (flipsFor(board, player, index).length > 0) moves.push(index);
  }
  return moves;
}

function counts(board) {
  let a = 0;
  let b = 0;
  for (const cell of board) {
    if (cell === 0) a += 1;
    else if (cell === 1) b += 1;
  }
  return [a, b];
}

function settle(state, winner, message) {
  const [a, b] = counts(state.board);
  state.scores = [a, b];
  if (winner == null) {
    if (a === b) finish(state, -1, '终局棋子相同，和棋。');
    else finish(state, a > b ? 0 : 1, message || '终局棋子多者获胜。');
  } else {
    finish(state, winner, message);
  }
}

export function create(seed, now) {
  const state = open(now, 360000, '落子夹住对方棋子即可翻面，没有合法落点会自动跳过。');
  state.board = Array(CELLS).fill(-1);
  state.board[2 * SIZE + 2] = 1;
  state.board[3 * SIZE + 3] = 1;
  state.board[2 * SIZE + 3] = 0;
  state.board[3 * SIZE + 2] = 0;
  state.lastMove = null;
  state.flipped = [];
  state.passes = 0;
  state.scores = counts(state.board);
  begin(state, 0, now, 25000);
  return state;
}

export function act(state, player, action, now) {
  if (!live(state) || player !== state.turn || !action || action.type !== 'place' || !int(action.index, 0, CELLS - 1)) return false;
  const flips = flipsFor(state.board, player, action.index);
  if (flips.length === 0) return false;
  state.now = now;
  state.board[action.index] = player;
  for (const cell of flips) state.board[cell] = player;
  state.lastMove = action.index;
  state.flipped = flips;
  state.scores = counts(state.board);
  const next = 1 - player;
  const nextMoves = legalMoves(state.board, next);
  const myMoves = legalMoves(state.board, player);
  if (nextMoves.length === 0) {
    if (myMoves.length === 0) {
      settle(state, null);
      return true;
    }
    state.passes += 1;
    begin(state, player, now, 25000);
    state.message = '对方没有合法落点，跳过一轮，你继续。';
    return true;
  }
  state.passes = 0;
  begin(state, next, now, 25000);
  state.message = `轮到 ${next === 0 ? '玩家一' : '玩家二'} 落子。`;
  return true;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (now >= state.endsAt) {
    settle(state, null, '时间到，棋子多者获胜。');
    return true;
  }
  if (state.turnEndsAt && now >= state.turnEndsAt) {
    const winner = 1 - state.turn;
    settle(state, winner, `对方超时，${winner === 0 ? '玩家一' : '玩家二'} 获胜。`);
    return true;
  }
  return false;
}

export function view(state, player) {
  return {
    ...pane(state),
    size: SIZE,
    board: state.board.slice(),
    legal: state.status === 'live' && state.turn === player ? legalMoves(state.board, player) : [],
    scores: counts(state.board),
    lastMove: state.lastMove,
    flipped: state.flipped.slice(),
    passes: state.passes,
    you: player,
    turnLeft: turnLeft(state, state.now),
  };
}