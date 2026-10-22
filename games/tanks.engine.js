import { rng, open, finish, live, pane } from './kit.js';

const W = 120;
const H = 120;
const TANK_R = 4.4;
const BULLET_R = 1.2;
const BULLET_SPEED = 105;
const DAMAGE = 34;
const LIMIT = 180000;
const MOVE_STEP = 6;
const MOVE_COOLDOWN = 150;
const FIRE_COOLDOWN = 700;
const AIM_STEP = 0.2;

const MOVE_VEC = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

const OBSTACLES = [
  { x: 54, y: 54, w: 12, h: 12 },
  { x: 24, y: 30, w: 10, h: 12 },
  { x: 86, y: 30, w: 10, h: 12 },
  { x: 24, y: 78, w: 10, h: 12 },
  { x: 86, y: 78, w: 10, h: 12 },
  { x: 30, y: 56, w: 12, h: 8 },
  { x: 78, y: 56, w: 12, h: 8 },
];

function roll(state) {
  state.rolls += 1;
  return rng((state.seed + Math.imul(state.rolls, 2654435761)) >>> 0).next();
}

function circleRect(cx, cy, radius, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  return Math.hypot(cx - nx, cy - ny) < radius;
}

function freeSpot(state, player, x, y) {
  if (x < TANK_R || y < TANK_R || x > W - TANK_R || y > H - TANK_R) return false;
  for (const rect of state.obstacles) {
    if (circleRect(x, y, TANK_R + 0.4, rect)) return false;
  }
  const other = state.tanks[1 - player];
  return Math.hypot(x - other.x, y - other.y) >= TANK_R * 2 + 0.5;
}

function makeTank(x, y, aim) {
  return { x, y, hp: 100, aim, lastAim: aim, fireAt: 0, moveAt: 0 };
}

function timeout(state) {
  const a = state.tanks[0].hp;
  const b = state.tanks[1].hp;
  let winner = a === b ? -1 : a > b ? 0 : 1;
  if (winner === -1 && state.scores[0] !== state.scores[1]) winner = state.scores[0] > state.scores[1] ? 0 : 1;
  if (winner === -1) return finish(state, -1, '时间到，两辆坦克都没能击毁对手，双方战平。');
  return finish(state, winner, `时间到，${winner === 0 ? '玩家一' : '玩家二'}的坦克更完整，获胜。`);
}

export function create(seed, now) {
  const state = open(now, LIMIT, '转动炮口、开火，先击毁对方坦克者获胜。');
  state.simultaneous = true;
  state.turn = -1;
  state.seed = (Number(seed) >>> 0) || 1;
  state.rolls = 0;
  state.lastStepAt = now;
  state.arena = { w: W, h: H };
  state.obstacles = OBSTACLES.map((rect) => ({ ...rect }));
  state.tanks = [makeTank(18, 102, -Math.PI / 4), makeTank(102, 18, (Math.PI * 3) / 4)];
  state.bullets = [];
  return state;
}

export function act(state, player, action, now) {
  if (!live(state) || (player !== 0 && player !== 1)) return false;
  if (!action || typeof action !== 'object') return false;
  const tank = state.tanks[player];
  if (action.type === 'move') {
    if (now < tank.moveAt) return false;
    const dir = MOVE_VEC[action.dir];
    if (!dir) return false;
    const nx = tank.x + dir[0] * MOVE_STEP;
    const ny = tank.y + dir[1] * MOVE_STEP;
    if (!freeSpot(state, player, nx, ny)) return false;
    tank.x = nx;
    tank.y = ny;
    tank.moveAt = now + MOVE_COOLDOWN;
    state.now = now;
    return true;
  }
  if (action.type === 'aim') {
    if (action.dir !== 'left' && action.dir !== 'right') return false;
    tank.aim += action.dir === 'left' ? -AIM_STEP : AIM_STEP;
    state.now = now;
    return true;
  }
  if (action.type === 'fire') {
    if (now < tank.fireAt) return false;
    const bx = tank.x + Math.cos(tank.aim) * 6;
    const by = tank.y + Math.sin(tank.aim) * 6;
    state.bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(tank.aim) * BULLET_SPEED,
      vy: Math.sin(tank.aim) * BULLET_SPEED,
      owner: player,
      bornAt: now,
    });
    tank.lastAim = tank.aim;
    tank.fireAt = now + FIRE_COOLDOWN;
    state.now = now;
    return true;
  }
  return false;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (now >= state.endsAt) return timeout(state);
  const dt = Math.max(0, Math.min(0.12, (now - state.lastStepAt) / 1000));
  if (now > state.lastStepAt) state.lastStepAt = now;
  if (dt <= 0) return state.bullets.length > 0;
  const rest = [];
  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (now - bullet.bornAt > 2600) continue;
    if (bullet.x < BULLET_R || bullet.x > W - BULLET_R || bullet.y < BULLET_R || bullet.y > H - BULLET_R) continue;
    let blocked = false;
    for (const rect of state.obstacles) {
      if (circleRect(bullet.x, bullet.y, BULLET_R, rect)) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    const target = 1 - bullet.owner;
    const tank = state.tanks[target];
    if (Math.hypot(bullet.x - tank.x, bullet.y - tank.y) < TANK_R + BULLET_R) {
      tank.hp = Math.max(0, tank.hp - DAMAGE);
      state.scores[bullet.owner] += 1;
      if (tank.hp <= 0) {
        finish(state, bullet.owner, `${bullet.owner === 0 ? '玩家一' : '玩家二'}击毁对方坦克，获胜。`);
        return true;
      }
      continue;
    }
    rest.push(bullet);
  }
  state.bullets = rest;
  return true;
}

export function view(state, player) {
  return {
    ...pane(state),
    you: player,
    arena: { w: W, h: H },
    obstacles: state.obstacles.map((rect) => ({ ...rect })),
    tanks: state.tanks.map((tank, index) =>
      index === player
        ? {
            x: tank.x,
            y: tank.y,
            hp: tank.hp,
            aim: tank.aim,
            fireIn: Math.max(0, tank.fireAt - state.now),
            moveIn: Math.max(0, tank.moveAt - state.now),
          }
        : { x: tank.x, y: tank.y, hp: tank.hp, lastAim: tank.lastAim },
    ),
    bullets: state.bullets.map((bullet) => ({
      x: bullet.x,
      y: bullet.y,
      vx: bullet.vx,
      vy: bullet.vy,
      owner: bullet.owner,
    })),
  };
}