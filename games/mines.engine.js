import { rng, open, finish, live, pane } from './kit.js';

const SIZE = 7;
const CELLS = SIZE * SIZE;
const MINES = 12;
const FREEZE_MS = 1800;
const SAFE = CELLS - MINES;

function layMines(seed) {
  const pick = new Set();
  const rnd = rng(seed);
  while (pick.size < MINES) pick.add(rnd.int(CELLS));
  return pick;
}

function finishByScore(state) {
  const [a, b] = state.scores;
  if (a === b) return finish(state, -1, '时间到，翻开的格数相同，和棋。');
  return finish(state, a > b ? 0 : 1, '时间到，安全格多者获胜。');
}

export function create(seed, now) {
  const state = open(now, 180000, '同一片雷区，谁翻开的格子多谁赢；踩雷会扣分并短暂冻结。');
  state.simultaneous = true;
  state.turn = -1;
  state.field = Array(CELLS).fill(0);
  for (const index of layMines(seed)) state.field[index] = 1;
  state.owner = Array(CELLS).fill(-1);
  state.opened = 0;
  state.scores = [0, 0];
  state.freezeUntil = [0, 0];
  state.lastOpen = [null, null];
  state.message = '同时开翻，安全格加一分，踩雷扣一分并冻结 1.8 秒。';
  return state;
}

export function act(state, player, action, now) {
  if (!live(state) || (player !== 0 && player !== 1) || !action || action.type !== 'dig') return false;
  const index = action.index;
  if (!Number.isInteger(index) || index < 0 || index >= CELLS) return false;
  if (state.owner[index] !== -1) return false;
  if (state.freezeUntil[player] > now) return false;
  state.now = now;
  state.owner[index] = player;
  state.opened += 1;
  state.lastOpen[player] = index;
  if (state.field[index] === 1) {
    state.scores[player] = Math.max(0, state.scores[player] - 1);
    state.freezeUntil[player] = now + FREEZE_MS;
    state.message = '踩到雷了，扣一分并冻结一下。';
  } else {
    state.scores[player] += 1;
    state.message = '安全，继续翻。';
  }
  if (state.opened >= CELLS) {
    finishByScore(state);
    return true;
  }
  return true;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (now >= state.endsAt) {
    finishByScore(state);
    return true;
  }
  return false;
}

export function view(state, player) {
  const done = state.status === 'done';
  const cells = state.field.map((mine, index) => {
    const owner = state.owner[index];
    if (owner === -1) return done && mine === 1 ? { state: 'mine' } : { state: 'hidden' };
    return { state: mine === 1 ? 'mine' : 'safe', owner };
  });
  return {
    ...pane(state),
    size: SIZE,
    cells,
    scores: state.scores.slice(),
    opened: state.opened,
    total: CELLS,
    safeTotal: SAFE,
    freezeLeft: [
      Math.max(0, state.freezeUntil[0] - state.now),
      Math.max(0, state.freezeUntil[1] - state.now),
    ],
    myFreezeLeft: Math.max(0, state.freezeUntil[player] - state.now),
    enemyFreezeLeft: Math.max(0, state.freezeUntil[1 - player] - state.now),
    lastOpen: state.lastOpen.slice(),
    you: player,
    matchLeft: Math.max(0, state.endsAt - state.now),
  };
}