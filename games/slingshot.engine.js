import { open, finish, live, pane, begin, int, rng } from './kit.js';

const G = 9.8;
const SPEED = 0.36;
const DIST = 100;
const LAUNCH_Y = 2;
const CASTLE_TOP = 18;
const CASTLE_CENTER = 9;
const HALF_HEIGHT = 9;
const DT = 0.016;
const HP = 100;
const TURN_MS = 30000;
const MATCH_MS = 180000;
const ANGLE_MIN = 10;
const ANGLE_MAX = 60;
const POWER_MIN = 20;
const POWER_MAX = 100;
const LABELS = ['玩家一', '玩家二'];

function simulate(player, angle, power, wind) {
  const direction = player === 0 ? 1 : -1;
  const rad = (angle * Math.PI) / 180;
  let sx = 0;
  let y = LAUNCH_Y;
  let vx = SPEED * power * Math.cos(rad);
  let vy = SPEED * power * Math.sin(rad);
  const ax = wind * direction;
  const path = [[0, LAUNCH_Y]];
  let impact = null;
  let hit = false;
  let damage = 0;
  let over = false;
  for (let index = 1; index <= 1200; index++) {
    const prevS = sx;
    const prevY = y;
    vx += ax * DT;
    vy -= G * DT;
    sx += vx * DT;
    y += vy * DT;
    if (sx >= DIST) {
      const ratio = prevS === sx ? 1 : (DIST - prevS) / (sx - prevS);
      const crossY = prevY + (y - prevY) * Math.max(0, Math.min(1, ratio));
      impact = { s: DIST, y: Math.round(crossY * 100) / 100 };
      if (crossY >= 0 && crossY <= CASTLE_TOP) {
        hit = true;
        const quality = 1 - Math.min(1, Math.abs(crossY - CASTLE_CENTER) / HALF_HEIGHT);
        damage = Math.round(12 + 28 * quality);
      } else if (crossY > CASTLE_TOP) {
        over = true;
      }
      break;
    }
    if (y <= 0) {
      impact = { s: Math.round(Math.max(0, sx) * 100) / 100, y: 0 };
      break;
    }
    if (index % 2 === 0) path.push([Math.round(sx * 100) / 100, Math.round(y * 100) / 100]);
  }
  if (!impact) impact = { s: Math.round(Math.max(0, sx) * 100) / 100, y: Math.round(Math.max(0, y) * 100) / 100 };
  path.push([impact.s, impact.y]);
  return { by: player, angle, power, wind, hit, over, damage, impact, path };
}

export function create(seed, now) {
  const gen = rng(seed);
  const winds = [];
  for (let i = 0; i < 64; i++) winds.push(Math.round((gen.next() * 2 - 1) * 15) / 10 + 0);
  const state = open(now, MATCH_MS, '调整角度与力度，摧毁对方城墙。');
  state.hp = [HP, HP];
  state.winds = winds;
  state.windIndex = 0;
  state.wind = winds[0];
  state.lastShot = null;
  state.shotCount = 0;
  begin(state, 0, now, TURN_MS);
  state.message = '玩家一先手，调整角度与力度后发射。';
  return state;
}

export function act(state, player, action, now) {
  if (!live(state)) return false;
  if (player !== state.turn) return false;
  if (!action || action.type !== 'fire') return false;
  if (now >= state.endsAt || now >= state.turnEndsAt) return false;
  if (!int(action.angle, ANGLE_MIN, ANGLE_MAX) || !int(action.power, POWER_MIN, POWER_MAX)) return false;
  state.now = now;
  const shot = simulate(player, action.angle, action.power, state.wind);
  state.lastShot = shot;
  state.shotCount += 1;
  const target = 1 - player;
  if (shot.hit) state.hp[target] = Math.max(0, state.hp[target] - shot.damage);
  if (state.hp[target] <= 0) {
    finish(state, player, `${LABELS[player]}击毁对方城堡，取得胜利。`);
    return true;
  }
  state.windIndex += 1;
  state.wind = state.winds[state.windIndex % state.winds.length];
  begin(state, target, now, TURN_MS);
  state.message = shot.hit
    ? `命中！${LABELS[target]}的城墙削减 ${shot.damage} 点。`
    : shot.over
      ? `越过城堡，落点 ${shot.impact.s} 米。`
      : `射程不足，落点 ${shot.impact.s} 米。`;
  return true;
}

export function step(state, now) {
  if (!live(state)) return false;
  state.now = now;
  if (now >= state.endsAt) {
    const [a, b] = state.hp;
    return finish(state, a === b ? -1 : a > b ? 0 : 1, '时间到，按城墙剩余结算。');
  }
  if (state.turnEndsAt != null && now >= state.turnEndsAt) {
    return finish(state, 1 - state.turn, '出手超时，对手获得胜利。');
  }
  return false;
}

export function view(state, player) {
  const shot = state.lastShot;
  return {
    ...pane(state),
    you: player,
    simultaneous: false,
    hp: state.hp.slice(),
    wind: state.wind,
    aim: { angleMin: ANGLE_MIN, angleMax: ANGLE_MAX, powerMin: POWER_MIN, powerMax: POWER_MAX },
    castle: { distance: DIST, top: CASTLE_TOP, center: CASTLE_CENTER },
    youTurn: state.turn === player,
    shotCount: state.shotCount,
    lastShot: shot
      ? {
          by: shot.by,
          angle: shot.angle,
          power: shot.power,
          wind: shot.wind,
          hit: shot.hit,
          over: shot.over,
          damage: shot.damage,
          impact: { s: shot.impact.s, y: shot.impact.y },
          path: shot.path.map((point) => point.slice()),
        }
      : null,
  };
}