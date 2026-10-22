import { rng, open, finish, live, pane } from './kit.js';

const COLS = 13;
const ROWS = 11;
const LIMIT = 180000;
const FUSE = 2000;
const FIRE = 420;
const RANGE = 2;
const MOVE_COOLDOWN = 135;
const MAX_BOMBS = 2;

const DIRS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

const SPAWNS = [
  { x: 1, y: 1 },
  { x: 11, y: 9 },
];

const SAFE = [
  [1, 1],
  [2, 1],
  [1, 2],
  [11, 9],
  [10, 9],
  [11, 8],
];

function roll(state) {
  state.rolls += 1;
  return rng((state.seed + Math.imul(state.rolls, 2654435761)) >>> 0).next();
}

function buildBoard(state) {
  const board = new Array(COLS * ROWS).fill(0);
  const safe = SAFE.map(([x, y]) => y * COLS + x);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const index = y * COLS + x;
      if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) board[index] = 1;
      else if (x % 2 === 0 && y % 2 === 0) board[index] = 1;
    }
  }
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      const index = y * COLS + x;
      if (board[index] !== 0 || safe.includes(index)) continue;
      const mirror = (ROWS - 1 - y) * COLS + (COLS - 1 - x);
      if (index > mirror) continue;
      if (mirror !== index && safe.includes(mirror)) continue;
      const brick = roll(state) < 0.68 ? 2 : 0;
      board[index] = brick;
      if (mirror !== index) board[mirror] = brick;
    }
  }
  return board;
}

function freeCell(state, x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
  if (state.board[y * COLS + x] !== 0) return false;
  if (state.bombs.some((bomb) => bomb.x === x && bomb.y === y)) return false;
  return !state.players.some((player) => player.alive && player.x === x && player.y === y);
}

function blastCells(state, bomb) {
  const cells = [[bomb.x, bomb.y]];
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  for (const [dx, dy] of dirs) {
    for (let step = 1; step <= RANGE; step++) {
      const x = bomb.x + dx * step;
      const y = bomb.y + dy * step;
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) break;
      const cell = state.board[y * COLS + x];
      if (cell === 1) break;
      cells.push([x, y]);
      if (cell === 2) break;
    }
  }
  return cells;
}

function detonate(state, now, ready) {
  const pending = ready.slice();
  const blown = [];
  const cells = [];
  while (pending.length) {
    const bomb = pending.shift();
    if (blown.includes(bomb)) continue;
    blown.push(bomb);
    for (const [x, y] of blastCells(state, bomb)) {
      cells.push([x, y]);
      const cell = state.board[y * COLS + x];
      if (cell === 2) {
        state.board[y * COLS + x] = 0;
        state.scores[bomb.owner] += 1;
      }
      const chain = state.bombs.find((other) => !blown.includes(other) && !pending.includes(other) && other.x === x && other.y === y);
      if (chain) pending.push(chain);
      for (const player of state.players) {
        if (player.alive && player.x === x && player.y === y) player.alive = false;
      }
    }
  }
  state.bombs = state.bombs.filter((bomb) => !blown.includes(bomb));
  for (const [x, y] of cells) {
    const fire = state.fires.find((item) => item.x === x && item.y === y);
    if (fire) fire.until = Math.max(fire.until, now + FIRE);
    else state.fires.push({ x, y, until: now + FIRE });
  }
}

function settle(state) {
  const dead = [0, 1].filter((index) => !state.players[index].alive);
  if (dead.length === 2) return finish(state, -1, '双方同时被炸出局，本局和棋。');
  if (dead.length === 1) return finish(state, 1 - dead[0], `${dead[0] === 0 ? '玩家一' : '玩家二'}被炸出局，${dead[0] === 0 ? '玩家二' : '玩家一'}获胜。`);
  return false;
}

export function create(seed, now) {
  const state = open(now, LIMIT, '放下炸弹就跑，最后存活者获胜。');
  state.simultaneous = true;
  state.turn = -1;
  state.seed = (Number(seed) >>> 0) || 1;
  state.rolls = 0;
  state.lastStepAt = now;
  state.cols = COLS;
  state.rows = ROWS;
  state.range = RANGE;
  state.board = buildBoard(state);
  state.players = SPAWNS.map((spot, index) => ({ x: spot.x, y: spot.y, alive: true, moveAt: now, bombAt: 0, index }));
  state.bombs = [];
  state.fires = [];
  return state;
}

export function act(state, player, action, now) {
  if (!live(state) || (player !== 0 && player !== 1)) return false;
  const me = state.players[player];
  if (!me.alive || !action || typeof action !== 'object') return false;
  if (action.type === 'move') {
    if (now < me.moveAt) return false;
    const dir = DIRS[action.dir];
    if (!dir) return false;
    const nx = me.x + dir[0];
    const ny = me.y + dir[1];
    if (!freeCell(state, nx, ny)) return false;
    me.x = nx;
    me.y = ny;
    me.moveAt = now + MOVE_COOLDOWN;
    state.now = now;
    return true;
  }
  if (action.type === 'bomb') {
    if (now < me.bombAt) return false;
    if (state.bombs.some((bomb) => bomb.x === me.x && bomb.y === me.y)) return false;
    if (state.bombs.filter((bomb) => bomb.owner === player).length >= MAX_BOMBS) return false;
    state.bombs.push({ x: me.x, y: me.y, owner: player, at: now });
    me.bombAt = now + 260;
    state.now = now;
    return true;
  }
  return false;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (now >= state.endsAt) {
    if (state.scores[0] === state.scores[1]) return finish(state, -1, '时间到，双方都没被炸出局，和棋。');
    const winner = state.scores[0] > state.scores[1] ? 0 : 1;
    return finish(state, winner, `时间到，${winner === 0 ? '玩家一' : '玩家二'}炸开的砖块更多，获胜。`);
  }
  state.fires = state.fires.filter((fire) => fire.until > now);
  let changed = false;
  const ready = state.bombs.filter((bomb) => now >= bomb.at + FUSE);
  if (ready.length) {
    detonate(state, now, ready);
    changed = true;
  }
  for (const fire of state.fires) {
    for (const player of state.players) {
      if (player.alive && player.x === fire.x && player.y === fire.y) {
        player.alive = false;
        changed = true;
      }
    }
  }
  if (changed) {
    const dead = [0, 1].filter((index) => !state.players[index].alive);
    if (dead.length > 0) settle(state);
  }
  return changed;
}

export function view(state, player) {
  return {
    ...pane(state),
    you: player,
    cols: COLS,
    rows: ROWS,
    range: RANGE,
    board: state.board.slice(),
    players: state.players.map((item) => ({ x: item.x, y: item.y, alive: item.alive })),
    bombs: state.bombs.map((bomb) => ({
      x: bomb.x,
      y: bomb.y,
      owner: bomb.owner,
      fuse: Math.max(0, bomb.at + FUSE - state.now),
    })),
    fires: state.fires.filter((fire) => fire.until > state.now).map((fire) => ({ x: fire.x, y: fire.y })),
  };
}