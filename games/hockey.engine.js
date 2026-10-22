import { rng, open, finish, live, pane } from './kit.js';

const W = 100;
const H = 160;
const PUCK_R = 3.4;
const PADDLE_R = 6;
const GOAL = 32;
const WIN_SCORE = 5;
const LIMIT = 180000;
const PADDLE_SPEED = 175;
const PUCK_MAX = 190;

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

function roll(state) {
  state.rolls += 1;
  return rng((state.seed + Math.imul(state.rolls, 2654435761)) >>> 0).next();
}

function targetY(player, y) {
  if (player === 0) return clamp(y, H / 2 + PADDLE_R, H - PADDLE_R);
  return clamp(y, PADDLE_R, H / 2 - PADDLE_R);
}

function movePaddles(state, dt) {
  for (let p = 0; p < 2; p++) {
    const pad = state.paddles[p];
    const dx = pad.tx - pad.x;
    const dy = pad.ty - pad.y;
    const dist = Math.hypot(dx, dy);
    const step = PADDLE_SPEED * dt;
    if (dist <= step || dist === 0) {
      pad.vx = dist === 0 ? 0 : dx / dt;
      pad.vy = dist === 0 ? 0 : dy / dt;
      pad.x = pad.tx;
      pad.y = pad.ty;
    } else {
      const k = step / dist;
      pad.vx = (dx * k) / dt;
      pad.vy = (dy * k) / dt;
      pad.x += dx * k;
      pad.y += dy * k;
    }
  }
}

function hitPaddle(state, p) {
  const pad = state.paddles[p];
  const puck = state.puck;
  const dx = puck.x - pad.x;
  const dy = puck.y - pad.y;
  const dist = Math.hypot(dx, dy);
  const min = PADDLE_R + PUCK_R;
  if (dist >= min) return false;
  const nx = dist > 0.0001 ? dx / dist : 1;
  const ny = dist > 0.0001 ? dy / dist : 0;
  puck.x = pad.x + nx * min;
  puck.y = pad.y + ny * min;
  const vn = puck.vx * nx + puck.vy * ny;
  const pn = pad.vx * nx + pad.vy * ny;
  const tx = -ny;
  const ty = nx;
  const vt = puck.vx * tx + puck.vy * ty;
  const speed = clamp(Math.abs(vn) * 0.78 + 28 + Math.max(0, pn) * 0.55, 46, PUCK_MAX);
  puck.vx = nx * speed + tx * vt * 0.82;
  puck.vy = ny * speed + ty * vt * 0.82;
  pad.hitAt = state.now;
  return true;
}

function goal(state, scorer) {
  state.scores[scorer] += 1;
  if (state.scores[scorer] >= WIN_SCORE) {
    finish(state, scorer, `${scorer === 0 ? '玩家一' : '玩家二'}连入五球，获胜。`);
    return;
  }
  state.phase = 'serve';
  state.serveAt = state.now + 800;
  state.serveDir = scorer === 0 ? -1 : 1;
  state.puck = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
  state.message = `进球！当前比分 ${state.scores[0]} 比 ${state.scores[1]}。`;
}

function advancePuck(state, dt) {
  const puck = state.puck;
  const speed = Math.hypot(puck.vx, puck.vy);
  const steps = clamp(Math.ceil((speed * dt) / 2.2), 1, 6);
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    puck.x += puck.vx * h;
    puck.y += puck.vy * h;
    hitPaddle(state, 0);
    hitPaddle(state, 1);
    const inMouth = Math.abs(puck.x - W / 2) <= GOAL / 2;
    if (puck.x < PUCK_R) {
      puck.x = PUCK_R;
      puck.vx = Math.abs(puck.vx) * 0.92;
    } else if (puck.x > W - PUCK_R) {
      puck.x = W - PUCK_R;
      puck.vx = -Math.abs(puck.vx) * 0.92;
    }
    if (puck.y < PUCK_R) {
      if (inMouth) {
        goal(state, 0);
        return;
      }
      puck.y = PUCK_R;
      puck.vy = Math.abs(puck.vy) * 0.92;
    } else if (puck.y > H - PUCK_R) {
      if (inMouth) {
        goal(state, 1);
        return;
      }
      puck.y = H - PUCK_R;
      puck.vy = -Math.abs(puck.vy) * 0.92;
    }
  }
  const sp = Math.hypot(puck.vx, puck.vy);
  if (sp > PUCK_MAX) {
    puck.vx *= PUCK_MAX / sp;
    puck.vy *= PUCK_MAX / sp;
  }
}

export function create(seed, now) {
  const state = open(now, LIMIT, '拖动球拍击球，先得 5 分者获胜。');
  state.simultaneous = true;
  state.turn = -1;
  state.seed = (Number(seed) >>> 0) || 1;
  state.rolls = 0;
  state.lastStepAt = now;
  state.table = { w: W, h: H };
  state.goalWidth = GOAL;
  state.firstTo = WIN_SCORE;
  state.paddles = [
    { x: W / 2, y: 142, tx: W / 2, ty: 142, vx: 0, vy: 0 },
    { x: W / 2, y: 18, tx: W / 2, ty: 18, vx: 0, vy: 0 },
  ];
  state.puck = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
  state.phase = 'serve';
  state.serveAt = now + 700;
  state.serveDir = roll(state) < 0.5 ? -1 : 1;
  return state;
}

export function act(state, player, action, now) {
  if (!live(state) || (player !== 0 && player !== 1)) return false;
  if (!action || typeof action !== 'object' || action.type !== 'move') return false;
  const x = action.x;
  const y = action.y;
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < 0 || x > W || y < 0 || y > H) return false;
  state.now = now;
  const pad = state.paddles[player];
  pad.tx = clamp(x, PADDLE_R, W - PADDLE_R);
  pad.ty = targetY(player, y);
  return true;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (now >= state.endsAt) {
    if (state.scores[0] === state.scores[1]) return finish(state, -1, '时间到，双方战平。');
    const winner = state.scores[0] > state.scores[1] ? 0 : 1;
    return finish(state, winner, `时间到，${winner === 0 ? '玩家一' : '玩家二'}以 ${state.scores[0]} 比 ${state.scores[1]} 获胜。`);
  }
  const dt = Math.max(0, Math.min(0.12, (now - state.lastStepAt) / 1000));
  if (now > state.lastStepAt) state.lastStepAt = now;
  if (dt <= 0) return false;
  movePaddles(state, dt);
  if (state.phase === 'serve') {
    if (now >= state.serveAt) {
      state.phase = 'play';
      state.puck.vx = (roll(state) - 0.5) * 36;
      state.puck.vy = state.serveDir * 60;
      state.message = '开球，注意回防。';
    }
  } else {
    advancePuck(state, dt);
  }
  return true;
}

export function view(state, player) {
  return {
    ...pane(state),
    you: player,
    table: { w: W, h: H },
    goalWidth: GOAL,
    firstTo: WIN_SCORE,
    phase: state.phase,
    paddles: state.paddles.map((pad) => ({ x: pad.x, y: pad.y })),
    puck: { x: state.puck.x, y: state.puck.y, vx: state.puck.vx, vy: state.puck.vy },
  };
}