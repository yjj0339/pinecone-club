import { open, finish, live, pane, rng } from './kit.js';

const MAZES = [
  [
    '#############',
    '#.....#.....#',
    '#.###.#.###.#',
    '#.#.......#.#',
    '#...#...#...#',
    '#.#.......#.#',
    '#.###.#.###.#',
    '#.....#.....#',
    '#############',
  ],
  [
    '#############',
    '#.....#.....#',
    '#...........#',
    '#.###.#.###.#',
    '#...#...#...#',
    '#.###.#.###.#',
    '#...........#',
    '#.....#.....#',
    '#############',
  ],
];
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const MOVE_MS = 140;
const GOAL = 3;
const MATCH_MS = 180000;
const START = [[1, 4], [11, 4]];
const FLAG_HOME = { x: 6, y: 4 };
const LABELS = ['玩家一', '玩家二'];

function isWall(state, x, y) {
  if (y < 0 || y >= state.height || x < 0 || x >= state.width) return true;
  return state.grid[y][x] === '#';
}

function resetField(state, now) {
  state.pos = [state.base[0].slice(), state.base[1].slice()];
  state.flag = { x: FLAG_HOME.x, y: FLAG_HOME.y, carrier: null };
  state.held = ['', ''];
  state.nextMoveAt = [now + MOVE_MS, now + MOVE_MS];
}

function moveOne(state, player, now) {
  const dir = state.held[player];
  if (!dir) return false;
  const [dx, dy] = DIRS[dir];
  const x = state.pos[player][0] + dx;
  const y = state.pos[player][1] + dy;
  state.nextMoveAt[player] = now + MOVE_MS;
  if (isWall(state, x, y)) return false;
  state.pos[player] = [x, y];
  if (state.flag.carrier === null && x === state.flag.x && y === state.flag.y) {
    state.flag.carrier = player;
    state.message = `${LABELS[player]}拔起旗帜，带回自己的基地！`;
  }
  if (state.flag.carrier === player && x === state.base[player][0] && y === state.base[player][1]) {
    state.scores[player] += 1;
    state.flag.carrier = null;
    if (state.scores[player] >= state.goal) {
      finish(state, player, `${LABELS[player]}先夺三旗，赢得比赛。`);
      return true;
    }
    resetField(state, now);
    state.message = `${LABELS[player]}夺旗得分，比分 ${state.scores[0]} 比 ${state.scores[1]}。`;
  }
  return true;
}

export function create(seed, now) {
  const gen = rng(seed);
  const grid = MAZES[Math.floor(gen.next() * MAZES.length) % MAZES.length].slice();
  const state = open(now, MATCH_MS, '抢到中央旗帜，带回自己的基地得分，先到三旗获胜。');
  state.simultaneous = true;
  state.turn = -1;
  state.width = 13;
  state.height = 9;
  state.grid = grid;
  state.base = [START[0].slice(), START[1].slice()];
  state.pos = [START[0].slice(), START[1].slice()];
  state.flag = { x: FLAG_HOME.x, y: FLAG_HOME.y, carrier: null };
  state.held = ['', ''];
  state.nextMoveAt = [now, now];
  state.goal = GOAL;
  return state;
}

export function act(state, player, action, now) {
  if (!live(state)) return false;
  if (player !== 0 && player !== 1) return false;
  if (!action || typeof action.type !== 'string') return false;
  if (now >= state.endsAt) return false;
  if (action.type === 'stop') {
    state.now = Math.max(state.now, now);
    state.held[player] = '';
    return true;
  }
  if (action.type !== 'dir') return false;
  if (action.dir !== 'up' && action.dir !== 'down' && action.dir !== 'left' && action.dir !== 'right') return false;
  state.now = Math.max(state.now, now);
  state.held[player] = action.dir;
  if (now >= state.nextMoveAt[player]) moveOne(state, player, now);
  return true;
}

export function step(state, now) {
  if (!live(state)) return false;
  const advanced = now > state.now;
  if (advanced) state.now = now;
  if (state.now >= state.endsAt) {
    const [a, b] = state.scores;
    return finish(state, a === b ? -1 : a > b ? 0 : 1, '时间到，按夺旗得分结算。');
  }
  if (!advanced) return false;
  let changed = false;
  for (const player of [0, 1]) {
    if (live(state) && state.held[player] && state.now >= state.nextMoveAt[player]) {
      moveOne(state, player, state.now);
      changed = true;
    }
  }
  return changed;
}

export function view(state, player) {
  return {
    ...pane(state),
    you: player,
    simultaneous: true,
    grid: state.grid.slice(),
    width: state.width,
    height: state.height,
    base: [state.base[0].slice(), state.base[1].slice()],
    pos: [state.pos[0].slice(), state.pos[1].slice()],
    flag: { x: state.flag.x, y: state.flag.y, carrier: state.flag.carrier },
    held: state.held[player],
    yourFlag: state.flag.carrier === player,
    oppFlag: state.flag.carrier === 1 - player,
    goal: state.goal,
  };
}