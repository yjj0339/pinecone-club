import { rng, open, finish, live, pane } from './kit.js';

const COLS = 21;
const ROWS = 21;
const LIMIT = 120000;
const TICK = 140;
const START_DELAY = 720;

const DIRS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

function roll(state) {
  state.rolls += 1;
  return rng((state.seed + Math.imul(state.rolls, 2654435761)) >>> 0).next();
}

function spawnFood(state) {
  const taken = [];
  for (const snake of state.snakes) {
    for (const cell of snake.body) taken.push(cell[1] * COLS + cell[0]);
  }
  const free = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!taken.includes(y * COLS + x)) free.push([x, y]);
    }
  }
  if (!free.length) return null;
  const spot = free[Math.floor(roll(state) * free.length)];
  return { x: spot[0], y: spot[1] };
}

function hasCell(body, head) {
  return body.some((cell) => cell[0] === head[0] && cell[1] === head[1]);
}

function finishDraw(state) {
  return finish(state, -1, '时间到，双方得分相同，和棋。');
}

function tick(state) {
  state.tick += 1;
  const alive = state.snakes.map((snake) => snake.alive);
  const heads = [null, null];
  for (let p = 0; p < 2; p++) {
    const snake = state.snakes[p];
    if (!alive[p]) continue;
    const dir = snake.queue.length ? snake.queue.shift() : snake.dir;
    snake.dir = dir;
    heads[p] = [snake.body[0][0] + dir[0], snake.body[0][1] + dir[1]];
  }
  const eat = [false, false];
  for (let p = 0; p < 2; p++) {
    if (!heads[p] || !state.food) continue;
    eat[p] = heads[p][0] === state.food.x && heads[p][1] === state.food.y;
  }
  const bodies = [null, null];
  for (let p = 0; p < 2; p++) {
    if (!heads[p]) continue;
    const body = state.snakes[p].body;
    bodies[p] = eat[p] ? [heads[p], ...body] : [heads[p], ...body.slice(0, body.length - 1)];
  }
  const dead = [false, false];
  for (let p = 0; p < 2; p++) {
    if (!heads[p]) continue;
    const head = heads[p];
    if (head[0] < 0 || head[1] < 0 || head[0] >= COLS || head[1] >= ROWS) {
      dead[p] = true;
      continue;
    }
    if (hasCell(bodies[p].slice(1), head)) {
      dead[p] = true;
      continue;
    }
    for (let q = 0; q < 2; q++) {
      if (q === p || !alive[q]) continue;
      if (hasCell(bodies[q], head)) {
        dead[p] = true;
        break;
      }
    }
  }
  for (let p = 0; p < 2; p++) {
    if (!alive[p]) continue;
    state.snakes[p].body = bodies[p];
    if (dead[p]) state.snakes[p].alive = false;
  }
  for (let p = 0; p < 2; p++) {
    if (!alive[p] || dead[p] || !eat[p]) continue;
    state.scores[p] += 1;
    state.food = spawnFood(state);
  }
  const lost = [];
  for (let p = 0; p < 2; p++) {
    if (alive[p] && dead[p]) lost.push(p);
  }
  if (lost.length === 2) {
    finish(state, -1, '双方同时撞上障碍，本局和棋。');
    return;
  }
  if (lost.length === 1) {
    const loser = lost[0];
    finish(state, 1 - loser, `${loser === 0 ? '玩家一' : '玩家二'}撞上障碍出局，${loser === 0 ? '玩家二' : '玩家一'}获胜。`);
    return;
  }
  if (!state.food) state.food = spawnFood(state);
}

export function create(seed, now) {
  const state = open(now, LIMIT, '吃果实变长，撞墙或撞到蛇身即出局。');
  state.simultaneous = true;
  state.turn = -1;
  state.seed = (Number(seed) >>> 0) || 1;
  state.rolls = 0;
  state.lastStepAt = now;
  state.cols = COLS;
  state.rows = ROWS;
  state.tickMs = TICK;
  state.tickAt = now + START_DELAY;
  state.tick = 0;
  state.snakes = [
    { body: [[3, 10], [2, 10], [1, 10]], dir: [1, 0], queue: [], alive: true },
    { body: [[17, 10], [18, 10], [19, 10]], dir: [-1, 0], queue: [], alive: true },
  ];
  state.food = spawnFood(state);
  return state;
}

export function act(state, player, action, now) {
  if (!live(state) || (player !== 0 && player !== 1)) return false;
  const snake = state.snakes[player];
  if (!snake.alive || !action || typeof action !== 'object' || action.type !== 'dir') return false;
  const dir = DIRS[action.dir];
  if (!dir) return false;
  const last = snake.queue.length ? snake.queue[snake.queue.length - 1] : snake.dir;
  if (dir[0] === -last[0] && dir[1] === -last[1]) return false;
  if (dir[0] === last[0] && dir[1] === last[1]) return false;
  if (snake.queue.length >= 2) return false;
  snake.queue.push([dir[0], dir[1]]);
  state.now = now;
  return true;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (now >= state.endsAt) {
    const a = state.scores[0];
    const b = state.scores[1];
    if (a !== b) {
      const winner = a > b ? 0 : 1;
      return finish(state, winner, `时间到，${winner === 0 ? '玩家一' : '玩家二'}吃到的果实更多，获胜。`);
    }
    const la = state.snakes[0].body.length;
    const lb = state.snakes[1].body.length;
    if (la !== lb) {
      const winner = la > lb ? 0 : 1;
      return finish(state, winner, `时间到，${winner === 0 ? '玩家一' : '玩家二'}的蛇更长，获胜。`);
    }
    return finishDraw(state);
  }
  let changed = false;
  let guard = 0;
  while (live(state) && now >= state.tickAt && guard < 2000) {
    tick(state);
    state.tickAt += TICK;
    changed = true;
    guard += 1;
  }
  return changed;
}

export function view(state, player) {
  return {
    ...pane(state),
    you: player,
    cols: COLS,
    rows: ROWS,
    tickMs: TICK,
    nextTickIn: Math.max(0, state.tickAt - state.now),
    food: state.food ? { x: state.food.x, y: state.food.y } : null,
    snakes: state.snakes.map((snake) => ({
      alive: snake.alive,
      length: snake.body.length,
      body: snake.body.map((cell) => ({ x: cell[0], y: cell[1] })),
    })),
  };
}