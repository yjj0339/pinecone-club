import { rng, open, finish, live, begin, turnOver, pane, int } from './kit.js';

const PAIRS = 8;
const CARDS = PAIRS * 2;
const TURN_MS = 20000;
const HOLD_MS = 900;
const MATCH_MS = 180000;

function compare(state) {
  if (state.scores[0] === state.scores[1]) return -1;
  return state.scores[0] > state.scores[1] ? 0 : 1;
}

function label(player) {
  return player === 0 ? '玩家一' : '玩家二';
}

export function create(seed, now) {
  const random = rng(seed);
  const deck = [];
  for (let i = 0; i < PAIRS; i++) deck.push(i, i);
  const state = open(now, MATCH_MS, '玩家一先翻牌，配对的图案会留在桌面上。');
  state.simultaneous = false;
  state.deck = random.shuffle(deck);
  state.matched = Array(CARDS).fill(-1);
  state.pending = [];
  state.resolveAt = null;
  state.moves = [0, 0];
  begin(state, 0, now, TURN_MS);
  return state;
}

export function act(state, player, action, now) {
  if (!live(state)) return false;
  if (player !== 0 && player !== 1) return false;
  if (state.turn !== player) return false;
  if (state.resolveAt != null) return false;
  if (!action || action.type !== 'flip') return false;
  if (!int(action.index, 0, CARDS - 1)) return false;
  const index = action.index;
  if (state.matched[index] !== -1 || state.pending.includes(index)) return false;
  state.now = now;
  state.moves[player] += 1;
  state.pending.push(index);
  if (state.pending.length === 1) {
    begin(state, player, now, TURN_MS);
    state.message = '再翻一张，凑成一对就能继续。';
    return true;
  }
  const first = state.pending[0];
  if (state.deck[first] === state.deck[index]) {
    state.matched[first] = state.deck[first];
    state.matched[index] = state.deck[index];
    state.pending = [];
    state.scores[player] += 1;
    if (state.matched.every((value) => value !== -1)) {
      const winner = compare(state);
      finish(state, winner, winner === -1 ? '全部配对完成，双方和棋。' : `${label(winner)}配对更多，获胜。`);
      return true;
    }
    begin(state, player, now, TURN_MS);
    state.message = '配对成功，继续翻牌。';
    return true;
  }
  state.resolveAt = now + HOLD_MS;
  state.message = '图案不同，收牌后交换回合。';
  return true;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (now >= state.endsAt) {
    const winner = compare(state);
    finish(state, winner, winner === -1 ? '时间到，双方得分相同。' : `时间到，${label(winner)}得分更高。`);
    return true;
  }
  if (state.resolveAt != null && now >= state.resolveAt) {
    state.pending = [];
    state.resolveAt = null;
    begin(state, 1 - state.turn, now, TURN_MS);
    state.message = `轮到${label(state.turn)}翻牌。`;
    return true;
  }
  if (state.resolveAt != null) return false;
  if (turnOver(state, now)) {
    finish(state, 1 - state.turn, '对方超时，你获胜。');
    return true;
  }
  return false;
}

export function view(state, player) {
  const cards = [];
  for (let i = 0; i < CARDS; i++) {
    const visible = state.matched[i] !== -1 || state.pending.includes(i);
    cards.push(visible ? state.deck[i] : -1);
  }
  return {
    ...pane(state),
    cards,
    pending: state.pending.slice(),
    matched: state.matched.map((value) => value !== -1),
    moves: state.moves.slice(),
    pairsLeft: state.matched.filter((value) => value === -1).length / 2,
    you: player,
  };
}