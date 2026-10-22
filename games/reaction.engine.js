import { open, finish, live, pane, rng } from './kit.js';

const ROUNDS = 5;
const WAIT_MIN = 1200;
const WAIT_SPAN = 2600;
const GO_WINDOW = 3000;
const RESOLVE_MS = 1600;
const MATCH_MS = 120000;
const WIN_POINTS = 2;
const TIE_POINTS = 1;
const FALSE_START = -1;
const LABELS = ['玩家一', '玩家二'];

function scoreWinner(state) {
  const [a, b] = state.scores;
  return a === b ? -1 : a > b ? 0 : 1;
}

function resolveRound(state, now) {
  const taps = state.taps.slice();
  const falseStarts = state.falseStarted.slice();
  let winner = -1;
  let tie = false;
  if (taps[0] !== null && taps[1] !== null) {
    if (taps[0] === taps[1]) {
      tie = true;
      state.scores[0] += TIE_POINTS;
      state.scores[1] += TIE_POINTS;
    } else {
      winner = taps[0] < taps[1] ? 0 : 1;
      state.scores[winner] += WIN_POINTS;
    }
  } else if (taps[0] !== null) {
    winner = 0;
    state.scores[0] += WIN_POINTS;
  } else if (taps[1] !== null) {
    winner = 1;
    state.scores[1] += WIN_POINTS;
  }
  state.phase = 'resolve';
  state.resolveUntil = now + RESOLVE_MS;
  state.lastRound = { round: state.round + 1, taps, falseStarts, winner, tie };
  state.history.push({ round: state.round + 1, taps: taps.slice(), falseStarts: falseStarts.slice(), winner, tie });
  if (tie) state.message = '几乎同时拍下，双方各得一分。';
  else if (winner === -1) state.message = '本轮无人得分。';
  else state.message = `${LABELS[winner]}第 ${state.round + 1} 轮抢拍最快，得两分。`;
  return true;
}

export function create(seed, now) {
  const gen = rng(seed);
  const delays = [];
  for (let i = 0; i < ROUNDS; i++) delays.push(WAIT_MIN + Math.floor(gen.next() * WAIT_SPAN));
  const state = open(now, MATCH_MS, '信号亮起后再拍，抢跑扣一分。');
  state.simultaneous = true;
  state.turn = -1;
  state.phase = 'wait';
  state.round = 0;
  state.rounds = ROUNDS;
  state.delays = delays;
  state.signalAt = now + delays[0];
  state.goUntil = 0;
  state.resolveAt = null;
  state.resolveUntil = null;
  state.taps = [null, null];
  state.falseStarted = [false, false];
  state.lastRound = null;
  state.history = [];
  return state;
}

export function act(state, player, action, now) {
  if (!live(state)) return false;
  if (player !== 0 && player !== 1) return false;
  if (!action || action.type !== 'tap') return false;
  if (now >= state.endsAt) return false;
  if (state.phase !== 'wait' && state.phase !== 'go') return false;
  if (state.falseStarted[player] || state.taps[player] !== null) return false;
  state.now = now;
  if (state.phase === 'wait') {
    state.falseStarted[player] = true;
    state.scores[player] += FALSE_START;
    state.message = `${LABELS[player]}抢跑，扣一分，本轮失去资格。`;
    return true;
  }
  state.taps[player] = Math.max(0, now - state.signalAt);
  if (state.taps[0] === null || state.taps[1] === null) state.resolveAt = now + 1000;
  state.message = `${LABELS[player]}拍下，等待本轮结算。`;
  return true;
}

export function step(state, now) {
  if (!live(state)) return false;
  state.now = now;
  if (now >= state.endsAt) return finish(state, scoreWinner(state), '时间到，按积分结算。');
  if (state.phase === 'wait') {
    if (now >= state.signalAt) {
      state.phase = 'go';
      state.goUntil = state.signalAt + GO_WINDOW;
      state.message = '信号亮了，快拍！';
      return true;
    }
    return false;
  }
  if (state.phase === 'go') {
    const both = state.taps[0] !== null && state.taps[1] !== null;
    const waited = state.resolveAt !== null && now >= state.resolveAt;
    if (both || waited || now >= state.goUntil) return resolveRound(state, now);
    return false;
  }
  if (state.phase === 'resolve' && now >= state.resolveUntil) {
    state.round += 1;
    if (state.round >= state.rounds) return finish(state, scoreWinner(state), '五轮结束，按积分结算。');
    state.phase = 'wait';
    state.taps = [null, null];
    state.falseStarted = [false, false];
    state.resolveAt = null;
    state.resolveUntil = null;
    state.lastRound = null;
    state.goUntil = 0;
    state.signalAt = now + state.delays[state.round];
    state.message = `第 ${state.round + 1} 轮，等待信号。`;
    return true;
  }
  return false;
}

export function view(state, player) {
  const revealed = state.phase === 'resolve' || state.status === 'done';
  return {
    ...pane(state),
    you: player,
    simultaneous: true,
    phase: state.phase,
    round: Math.min(state.round + 1, state.rounds),
    rounds: state.rounds,
    tapWindowLeft: state.phase === 'go' ? Math.max(0, state.goUntil - state.now) : 0,
    resolveLeft: state.phase === 'resolve' ? Math.max(0, state.resolveUntil - state.now) : 0,
    yourTapped: state.taps[player] !== null,
    oppTapped: state.taps[1 - player] !== null,
    yourFalseStart: state.falseStarted[player],
    oppFalseStart: state.falseStarted[1 - player],
    yourLatency: revealed ? state.taps[player] : null,
    roundTaps: revealed ? state.taps.slice() : null,
    roundFalseStarts: revealed ? state.falseStarted.slice() : null,
    roundWinner: revealed && state.lastRound ? state.lastRound.winner : null,
    history: state.history.map((item) => ({
      round: item.round,
      taps: item.taps.slice(),
      falseStarts: item.falseStarts.slice(),
      winner: item.winner,
      tie: item.tie,
    })),
  };
}