import { open, finish, live, begin, turnLeft, pane } from './kit.js';

const DOTS = 6;
const BOXES = DOTS - 1;
const H_EDGES = DOTS * BOXES;
const V_EDGES = BOXES * DOTS;
const ALL_EDGES = H_EDGES + V_EDGES;

function hIndex(r, c) {
  return r * BOXES + c;
}

function vIndex(r, c) {
  return r * DOTS + c;
}

function boxClosed(state, r, c) {
  return state.h[r * BOXES + c] !== -1
    && state.h[(r + 1) * BOXES + c] !== -1
    && state.v[r * DOTS + c] !== -1
    && state.v[r * DOTS + c + 1] !== -1;
}

function tally(state) {
  state.scores = [0, 0];
  for (const owner of state.boxes) if (owner >= 0) state.scores[owner] += 1;
}

export function create(seed, now) {
  const state = open(now, 300000, '轮流画边，围住方格的人得分并继续画。');
  state.h = Array(H_EDGES).fill(-1);
  state.v = Array(V_EDGES).fill(-1);
  state.boxes = Array(BOXES * BOXES).fill(-1);
  state.lastEdge = null;
  state.edges = 0;
  begin(state, 0, now, 25000);
  return state;
}

export function act(state, player, action, now) {
  if (!live(state) || player !== state.turn || !action || action.type !== 'edge') return false;
  const dir = action.dir;
  const r = action.r;
  const c = action.c;
  if (!Number.isInteger(r) || !Number.isInteger(c)) return false;
  let list;
  let index;
  if (dir === 'h') {
    if (r < 0 || r >= DOTS || c < 0 || c >= BOXES) return false;
    list = state.h;
    index = hIndex(r, c);
  } else if (dir === 'v') {
    if (r < 0 || r >= BOXES || c < 0 || c >= DOTS) return false;
    list = state.v;
    index = vIndex(r, c);
  } else {
    return false;
  }
  if (list[index] !== -1) return false;
  state.now = now;
  list[index] = player;
  state.edges += 1;
  state.lastEdge = { dir, r, c };
  const won = [];
  if (dir === 'h') {
    if (r > 0 && boxClosed(state, r - 1, c)) won.push([r - 1, c]);
    if (r < BOXES && boxClosed(state, r, c)) won.push([r, c]);
  } else {
    if (c > 0 && boxClosed(state, r, c - 1)) won.push([r, c - 1]);
    if (c < BOXES && boxClosed(state, r, c)) won.push([r, c]);
  }
  for (const [br, bc] of won) {
    state.boxes[br * BOXES + bc] = player;
    state.scores[player] += 1;
  }
  if (state.edges >= ALL_EDGES) {
    const [a, b] = state.scores;
    finish(state, a === b ? -1 : a > b ? 0 : 1, a === b ? '所有方格画完，双方和棋。' : '所有方格画完，领地多者获胜。');
    return true;
  }
  if (won.length > 0) {
    begin(state, player, now, 25000);
    state.message = `围住 ${won.length} 格，继续画边。`;
  } else {
    begin(state, 1 - player, now, 25000);
    state.message = '轮到对方画边。';
  }
  tally(state);
  return true;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (now >= state.endsAt) {
    const [a, b] = state.scores;
    return finish(state, a === b ? -1 : a > b ? 0 : 1, a === b ? '时间到，领地相同，和棋。' : '时间到，领地多者获胜。');
  }
  if (state.turnEndsAt && now >= state.turnEndsAt) return finish(state, 1 - state.turn, '对方超时，你获胜。');
  return false;
}

export function view(state, player) {
  tally(state);
  return {
    ...pane(state),
    dots: DOTS,
    h: state.h.slice(),
    v: state.v.slice(),
    boxes: state.boxes.slice(),
    scores: state.scores.slice(),
    lastEdge: state.lastEdge,
    you: player,
    turnLeft: turnLeft(state, state.now),
  };
}