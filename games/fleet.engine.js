import { rng, open, finish, live, begin, turnLeft, pane, int } from './kit.js';

const SIZE = 7;
const CELLS = SIZE * SIZE;
const SHIPS = [3, 2, 1];

function shipCells(index, length, vertical) {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  if (vertical ? row + length > SIZE : col + length > SIZE) return null;
  const cells = [];
  for (let i = 0; i < length; i++) cells.push(vertical ? (row + i) * SIZE + col : row * SIZE + col + i);
  return cells;
}

function free(board, cells) {
  return cells.every((cell) => board[cell] === -1);
}

function put(board, cells, value) {
  for (const cell of cells) board[cell] = value;
}

function firstSpot(board, length, rnd) {
  const options = [];
  for (let index = 0; index < CELLS; index++) {
    for (const vertical of [false, true]) {
      const cells = shipCells(index, length, vertical);
      if (cells && free(board, cells)) options.push({ index, vertical, cells });
    }
  }
  if (!options.length) return null;
  return rnd ? options[rnd.int(options.length)] : options[0];
}

function sunkCount(fleet, shots) {
  return fleet.filter((ship) => ship.cells.every((cell) => shots[cell] === 1)).length;
}

function autoPlace(state) {
  const player = state.turn;
  const board = state.boards[player];
  const shipId = state.placed[player];
  const rnd = rng(state.seed + state.placed[player] * 7919 + player * 104729);
  const spot = firstSpot(board, SHIPS[shipId], rnd);
  if (!spot) {
    finish(state, -1, '布阵失败，双方和棋。');
    return false;
  }
  put(board, spot.cells, shipId);
  state.fleets[player].push({ cells: spot.cells.slice(), vertical: spot.vertical });
  state.placed[player] += 1;
  state.turn = 1 - player;
  state.now = state.now;
  return true;
}

export function create(seed, now) {
  const state = open(now, 300000, '轮流布下三艘船，然后开始炮击。');
  state.phase = 'place';
  state.boards = [Array(CELLS).fill(-1), Array(CELLS).fill(-1)];
  state.fleets = [[], []];
  state.shots = [Array(CELLS).fill(-1), Array(CELLS).fill(-1)];
  state.placed = [0, 0];
  state.sunk = [0, 0];
  state.hits = [0, 0];
  state.lastShot = [null, null];
  state.boards_ready = false;
  state.seed = seed;
  begin(state, 0, now, 35000);
  return state;
}

export function act(state, player, action, now) {
  if (!live(state) || player !== state.turn || !action) return false;
  state.now = now;
  if (state.phase === 'place') {
    if (action.type !== 'place' || !int(action.index, 0, CELLS - 1)) return false;
    const shipId = state.placed[player];
    if (shipId >= SHIPS.length) return false;
    const vertical = action.vertical === true;
    const cells = shipCells(action.index, SHIPS[shipId], vertical);
    if (!cells || !free(state.boards[player], cells)) return false;
    put(state.boards[player], cells, shipId);
    state.fleets[player].push({ cells: cells.slice(), vertical });
    state.placed[player] += 1;
    state.turn = 1 - player;
    if (state.placed[0] === SHIPS.length && state.placed[1] === SHIPS.length) {
      state.phase = 'fire';
      state.boards_ready = true;
      begin(state, 0, now, 20000);
      state.message = '布阵完成，开始炮击。命中可以继续开炮。';
    } else {
      begin(state, state.turn, now, 35000);
      state.message = `轮到 ${state.turn === 0 ? '玩家一' : '玩家二'} 布阵。`;
    }
    return true;
  }
  if (state.phase !== 'fire' || action.type !== 'fire' || !int(action.index, 0, CELLS - 1)) return false;
  const target = 1 - player;
  const shots = state.shots[target];
  if (shots[action.index] !== -1) return false;
  const board = state.boards[target];
  const hit = board[action.index] !== -1;
  shots[action.index] = hit ? 1 : 0;
  state.lastShot[player] = action.index;
  if (hit) {
    state.hits[player] += 1;
    const fleet = state.fleets[target];
    const wasSunk = sunkCount(fleet, shots);
    if (wasSunk > state.sunk[target]) {
      state.sunk[target] = wasSunk;
      state.message = wasSunk === fleet.length ? '全部击沉！' : '命中并击沉一艘船，继续开炮。';
    } else {
      state.message = '命中了，继续开炮。';
    }
    if (wasSunk === fleet.length) {
      finish(state, player, `${player === 0 ? '玩家一' : '玩家二'} 击沉对方全部舰队，获胜。`);
      return true;
    }
    begin(state, player, now, 20000);
    return true;
  }
  state.message = '打空了，换对方开炮。';
  begin(state, target, now, 20000);
  return true;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (state.phase === 'place') {
    let changed = false;
    while (state.phase === 'place' && (now >= state.endsAt || (state.turnEndsAt && now >= state.turnEndsAt))) {
      if (!autoPlace(state)) return true;
      changed = true;
      if (state.placed[0] === SHIPS.length && state.placed[1] === SHIPS.length) {
        state.phase = 'fire';
        state.boards_ready = true;
        begin(state, 0, now, 20000);
        state.message = '布阵完成，开始炮击。命中可以继续开炮。';
      } else {
        begin(state, state.turn, now, 20000);
      }
      if (state.turnEndsAt && now < state.turnEndsAt) break;
    }
    return changed;
  }
  if (now >= state.endsAt) {
    if (state.hits[0] === state.hits[1]) return finish(state, -1, '时间到，双方命数相同，和棋。');
    const winner = state.hits[0] > state.hits[1] ? 0 : 1;
    return finish(state, winner, '时间到，命数多者获胜。');
  }
  if (state.turnEndsAt && now >= state.turnEndsAt) return finish(state, 1 - state.turn, '对方超时，你获胜。');
  return false;
}

export function view(state, player) {
  const me = state.boards[player];
  const enemy = state.boards[1 - player];
  const incoming = state.shots[player];
  const outgoing = state.shots[1 - player];
  const done = state.status === 'done';
  const mySunk = state.fleets[player].map((ship) => ship.cells.every((cell) => incoming[cell] === 1));
  return {
    ...pane(state),
    phase: state.phase,
    size: SIZE,
    myBoard: me.slice(),
    incoming: incoming.slice(),
    outgoing: outgoing.slice(),
    enemyShips: done ? enemy.slice() : null,
    fleets: state.fleets[player].map((ship) => ({ cells: ship.cells.slice(), vertical: ship.vertical })),
    placed: state.placed.slice(),
    ships: SHIPS.slice(),
    mySunk,
    enemySunk: state.sunk[1 - player],
    myLosses: state.sunk[player],
    hits: state.hits.slice(),
    lastShot: state.lastShot[player],
    enemyLastShot: state.lastShot[1 - player],
    you: player,
    turnLeft: turnLeft(state, state.now),
  };
}