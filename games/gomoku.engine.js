import { rng, open, finish, live, begin, turnLeft, pane, int } from './kit.js';

function outcome(board, index, player) {
  const x = index % 15;
  const y = Math.floor(index / 15);
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const line = [index];
    for (const sign of [-1, 1]) {
      let nx = x + dx * sign;
      let ny = y + dy * sign;
      while (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && board[ny * 15 + nx] === player) {
        if (sign < 0) line.unshift(ny * 15 + nx);
        else line.push(ny * 15 + nx);
        nx += dx * sign;
        ny += dy * sign;
      }
    }
    if (line.length >= 5) return line;
  }
  return null;
}

export function create(seed, now) {
  const state = open(now, 600000, '黑方先行，连成五子即获胜。');
  state.board = Array(225).fill(-1);
  state.lastMove = null;
  state.winningLine = [];
  state._rng = rng(seed).next();
  begin(state, 0, now, 30000);
  return state;
}

export function act(state, player, action, now) {
  if (!live(state) || player !== state.turn || !action || action.type !== 'place') return false;
  if (!int(action.index, 0, 224) || state.board[action.index] !== -1) return false;
  state.now = now;
  state.board[action.index] = player;
  state.lastMove = action.index;
  const line = outcome(state.board, action.index, player);
  if (line) {
    state.winningLine = line;
    finish(state, player, `${player === 0 ? '黑方' : '白方'}连成五子，获胜。`);
    return true;
  }
  if (!state.board.includes(-1)) {
    finish(state, -1, '棋盘下满，双方和棋。');
    return true;
  }
  begin(state, 1 - player, now, 30000);
  state.message = `轮到${1 - player === 0 ? '黑方' : '白方'}落子。`;
  return true;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (now >= state.endsAt) return finish(state, -1, '时间到，本局和棋。');
  if (state.turnEndsAt && now >= state.turnEndsAt) return finish(state, 1 - state.turn, '对方超时，你获胜。');
  return false;
}

export function view(state, player) {
  return {
    ...pane(state),
    board: state.board.slice(),
    lastMove: state.lastMove,
    winningLine: state.winningLine.slice(),
    you: player,
  };
}