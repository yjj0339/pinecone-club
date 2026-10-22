import { open, finish, live, pane, rng } from './kit.js';

const SENTENCES = [
  '春风又绿江南岸',
  '白日依山尽黄河入海流',
  '会当凌绝顶一览众山小',
  '大漠孤烟直长河落日圆',
  '两个黄鹂鸣翠柳',
  '日出江花红胜火',
  '竹外桃花三两枝',
  '接天莲叶无穷碧映日荷花别样红',
];
const MATCH_MS = 60000;
const LABELS = ['玩家一', '玩家二'];

export function create(seed, now) {
  const gen = rng(seed);
  const target = SENTENCES[Math.floor(gen.next() * SENTENCES.length) % SENTENCES.length];
  const state = open(now, MATCH_MS, '同一句话，谁先打完谁获胜。');
  state.simultaneous = true;
  state.turn = -1;
  state.target = target;
  state.progress = [0, 0];
  return state;
}

export function act(state, player, action, now) {
  if (!live(state)) return false;
  if (player !== 0 && player !== 1) return false;
  if (!action || typeof action.type !== 'string') return false;
  if (now >= state.endsAt) return false;
  const length = state.target.length;
  if (action.type === 'input') {
    if (typeof action.value !== 'string') return false;
    if (action.value.length > length) return false;
    if (!state.target.startsWith(action.value)) return false;
    if (action.value.length < state.progress[player]) return false;
    state.now = now;
    state.progress[player] = action.value.length;
  } else if (action.type === 'char') {
    if (typeof action.ch !== 'string' || action.ch.length !== 1) return false;
    const index = state.progress[player];
    if (index >= length || state.target[index] !== action.ch) return false;
    state.now = now;
    state.progress[player] = index + 1;
  } else {
    return false;
  }
  if (state.progress[player] >= length) {
    finish(state, player, `${LABELS[player]}先打完，赢得打字竞速。`);
    return true;
  }
  state.message = `${LABELS[player]}已输入 ${state.progress[player]} / ${length} 字。`;
  return true;
}

export function step(state, now) {
  if (!live(state)) return false;
  state.now = now;
  if (now >= state.endsAt) {
    const [a, b] = state.progress;
    const winner = a === b ? -1 : a > b ? 0 : 1;
    return finish(state, winner, '时间到，按输入进度结算。');
  }
  return false;
}

export function view(state, player) {
  const length = state.target.length;
  const other = 1 - player;
  return {
    ...pane(state),
    you: player,
    simultaneous: true,
    target: state.target,
    length,
    progress: state.progress.slice(),
    percent: [Math.round((state.progress[0] / length) * 100), Math.round((state.progress[1] / length) * 100)],
    yourProgress: state.progress[player],
    oppProgress: state.progress[other],
    yourText: state.target.slice(0, state.progress[player]),
    nextChar: state.progress[player] < length ? state.target[state.progress[player]] : '',
    finished: state.progress[player] >= length,
  };
}