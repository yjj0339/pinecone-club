import { rng, open, finish, live, pane, int } from './kit.js';

const COLORS = 4;
const TARGET = 10;
const MATCH_MS = 240000;
const FLASH_MS = 520;
const GAP_MS = 200;
const SLOT_MS = FLASH_MS + GAP_MS;
const LEAD_MS = 800;
const MOVE_COUNT = 128;

function lengthOf(round) {
  return round + 2;
}

function makePad(start) {
  return { round: 1, pos: 0, phase: 'show', lit: -1, start, errors: 0 };
}

function compare(state) {
  if (state.scores[0] === state.scores[1]) return -1;
  return state.scores[0] > state.scores[1] ? 0 : 1;
}

function label(player) {
  return player === 0 ? '玩家一' : '玩家二';
}

export function create(seed, now) {
  const random = rng(seed);
  const moves = [];
  for (let i = 0; i < MOVE_COUNT; i++) moves.push(random.int(COLORS));
  const state = open(now, MATCH_MS, '记住亮起的颜色，按顺序复现，先到十分者获胜。');
  state.simultaneous = true;
  state.turn = -1;
  state.moves = moves;
  state.pads = [makePad(now + LEAD_MS), makePad(now + LEAD_MS)];
  return state;
}

export function act(state, player, action, now) {
  if (!live(state)) return false;
  if (player !== 0 && player !== 1) return false;
  if (now >= state.endsAt) return false;
  if (!action || action.type !== 'tap') return false;
  if (!int(action.index, 0, COLORS - 1)) return false;
  const pad = state.pads[player];
  if (pad.phase !== 'input') return false;
  state.now = now;
  const length = lengthOf(pad.round);
  if (action.index === state.moves[pad.pos]) {
    pad.pos += 1;
    if (pad.pos >= length) {
      state.scores[player] += 1;
      pad.pos = 0;
      if (state.scores[player] >= TARGET) {
        finish(state, player, `${label(player)}率先完成十轮，获胜。`);
        return true;
      }
      pad.round += 1;
      pad.phase = 'show';
      pad.lit = -1;
      pad.start = now + LEAD_MS;
      state.message = `第 ${pad.round} 轮即将播放。`;
    } else {
      state.message = `正确，还剩 ${length - pad.pos} 个。`;
    }
    return true;
  }
  pad.pos = 0;
  pad.errors += 1;
  pad.phase = 'show';
  pad.lit = -1;
  pad.start = now + LEAD_MS;
  state.message = '按错了，这一轮重新播放。';
  return true;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (now >= state.endsAt) {
    const winner = compare(state);
    finish(state, winner, winner === -1 ? '时间到，双方轮数相同。' : `时间到，${label(winner)}完成轮数更多。`);
    return true;
  }
  let changed = false;
  let entered = false;
  for (let player = 0; player < 2; player++) {
    const pad = state.pads[player];
    if (pad.phase !== 'show') continue;
    const length = lengthOf(pad.round);
    const elapsed = now - pad.start;
    let lit = -1;
    if (elapsed >= 0) {
      const slot = Math.floor(elapsed / SLOT_MS);
      if (slot < length * 2) {
        if (elapsed - slot * SLOT_MS < FLASH_MS) lit = state.moves[slot >> 1];
      } else {
        pad.phase = 'input';
        pad.pos = 0;
        entered = true;
        changed = true;
      }
    }
    if (pad.lit !== lit) {
      pad.lit = lit;
      changed = true;
    }
  }
  if (entered) state.message = '按顺序复现亮起的颜色。';
  return changed;
}

export function view(state, player) {
  const pad = state.pads[player];
  const rival = state.pads[1 - player];
  return {
    ...pane(state),
    round: pad.round,
    length: lengthOf(pad.round),
    phase: pad.phase,
    pos: pad.pos,
    lit: pad.lit,
    errors: pad.errors,
    target: TARGET,
    rival: {
      score: state.scores[1 - player],
      round: rival.round,
      errors: rival.errors,
    },
    you: player,
  };
}