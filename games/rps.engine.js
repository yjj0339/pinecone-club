import { open, finish, live, pane, rng } from './kit.js';

const PICKS = ['rock', 'paper', 'scissors'];
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const CHOOSE_MS = 8000;
const REVEAL_MS = 2200;
const TARGET = 3;
const MATCH_MS = 120000;
const LABELS = ['玩家一', '玩家二'];

function autoPick(state, player) {
  const value = state.auto[(state.round * 2 + player) % state.auto.length];
  return PICKS[Math.floor(value * PICKS.length) % PICKS.length];
}

function outcome(state, now) {
  state.now = now;
  const picks = state.choices.slice();
  const roundWinner = picks[0] === picks[1] ? -1 : BEATS[picks[0]] === picks[1] ? 0 : 1;
  state.phase = 'reveal';
  state.revealEndsAt = now + REVEAL_MS;
  state.lastRound = { round: state.round + 1, picks, winner: roundWinner };
  state.record.push({ round: state.round + 1, picks: picks.slice(), winner: roundWinner });
  if (roundWinner === -1) {
    state.message = `第 ${state.round + 1} 局平手，随后重来。`;
    return true;
  }
  state.scores[roundWinner] += 1;
  if (state.scores[roundWinner] >= TARGET) {
    finish(state, roundWinner, `${LABELS[roundWinner]}赢下决胜局，取得比赛胜利。`);
    return true;
  }
  state.message = `${LABELS[roundWinner]}赢下第 ${state.round + 1} 局，比分 ${state.scores[0]} 比 ${state.scores[1]}。`;
  return true;
}

export function create(seed, now) {
  const gen = rng(seed);
  const state = open(now, MATCH_MS, '双方暗选出拳，先到三分者获胜。');
  state.simultaneous = true;
  state.turn = -1;
  state.phase = 'choose';
  state.round = 0;
  state.choices = [null, null];
  state.chooseEndsAt = now + CHOOSE_MS;
  state.revealEndsAt = null;
  state.lastRound = null;
  state.record = [];
  state.auto = Array.from({ length: 40 }, () => gen.next());
  return state;
}

export function act(state, player, action, now) {
  if (!live(state)) return false;
  if (player !== 0 && player !== 1) return false;
  if (!action || action.type !== 'choose') return false;
  if (now >= state.endsAt) return false;
  if (state.phase !== 'choose') return false;
  if (typeof action.pick !== 'string' || !PICKS.includes(action.pick)) return false;
  if (state.choices[player] !== null) return false;
  state.now = now;
  state.choices[player] = action.pick;
  state.message = state.choices[1 - player] === null ? `${LABELS[player]}已出手，等待对手。` : '双方都已出手，马上揭晓。';
  return true;
}

export function step(state, now) {
  if (!live(state)) return false;
  state.now = now;
  if (now >= state.endsAt) {
    const winner = state.scores[0] === state.scores[1] ? -1 : state.scores[0] > state.scores[1] ? 0 : 1;
    return finish(state, winner, '时间到，按当前比分结算。');
  }
  if (state.phase === 'choose') {
    if (state.choices[0] !== null && state.choices[1] !== null) return outcome(state, now);
    if (now >= state.chooseEndsAt) {
      if (state.choices[0] === null) state.choices[0] = autoPick(state, 0);
      if (state.choices[1] === null) state.choices[1] = autoPick(state, 1);
      state.message = '有人迟疑未出手，由系统代为出拳。';
      return outcome(state, now);
    }
    return false;
  }
  if (state.phase === 'reveal' && now >= state.revealEndsAt) {
    state.phase = 'choose';
    state.round += 1;
    state.choices = [null, null];
    state.revealEndsAt = null;
    state.lastRound = null;
    state.chooseEndsAt = now + CHOOSE_MS;
    state.message = '下一局，继续暗选。';
    return true;
  }
  return false;
}

export function view(state, player) {
  const revealed = state.phase === 'reveal' || state.status === 'done';
  return {
    ...pane(state),
    you: player,
    simultaneous: true,
    phase: state.phase,
    round: state.round + 1,
    targetScore: TARGET,
    chooseLeft: state.phase === 'choose' ? Math.max(0, state.chooseEndsAt - state.now) : 0,
    revealLeft: state.phase === 'reveal' ? Math.max(0, state.revealEndsAt - state.now) : 0,
    yourPick: state.choices[player],
    yourReady: state.choices[player] !== null,
    oppPicked: state.choices[1 - player] !== null,
    picks: revealed ? state.choices.slice() : null,
    roundWinner: revealed && state.lastRound ? state.lastRound.winner : null,
    history: state.record.map((item) => ({ round: item.round, picks: item.picks.slice(), winner: item.winner })),
  };
}