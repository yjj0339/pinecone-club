import { rng, open, finish, live, pane, int } from './kit.js';

const QUESTION_MS = 12000;
const REVEAL_MS = 1400;
const MATCH_MS = 140000;
const ROUNDS = 8;

const BANK = [
  { q: '太阳系中体积最大的行星是哪一颗？', o: ['木星', '土星', '地球', '海王星'], a: 0 },
  { q: '色光的三原色不包括下面哪一种？', o: ['红色', '绿色', '黄色', '蓝色'], a: 2 },
  { q: '下面哪个数是质数？', o: ['21', '27', '29', '33'], a: 2 },
  { q: '一年中天数最少的月份是？', o: ['2月', '4月', '9月', '11月'], a: 0 },
  { q: '标准大气压下水沸腾的温度约为？', o: ['80℃', '90℃', '100℃', '120℃'], a: 2 },
  { q: '农历平年通常有几个月？', o: ['10 个月', '11 个月', '12 个月', '13 个月'], a: 2 },
  { q: '下面哪种动物是哺乳动物？', o: ['鲨鱼', '鲸', '企鹅', '鳄鱼'], a: 1 },
  { q: '二进制数 1010 表示十进制的几？', o: ['8', '10', '12', '14'], a: 1 },
  { q: '“床前明月光”的作者是谁？', o: ['杜甫', '李白', '白居易', '王维'], a: 1 },
  { q: '光在真空中的速度约为每秒多少？', o: ['3 万公里', '30 万公里', '300 万公里', '3000 公里'], a: 1 },
  { q: '下面哪个不是编程语言？', o: ['Python', 'Java', 'HTML', 'Go'], a: 2 },
  { q: '一个正方形有几条对称轴？', o: ['2 条', '3 条', '4 条', '6 条'], a: 2 },
  { q: '下面哪种水果的种子长在果实外面？', o: ['苹果', '葡萄', '草莓', '桃子'], a: 2 },
  { q: '地球上面积最大的海洋是？', o: ['太平洋', '大西洋', '印度洋', '北冰洋'], a: 0 },
  { q: '一打（dozen）等于多少个？', o: ['10', '12', '16', '24'], a: 1 },
  { q: '下面哪一个不属于四季？', o: ['春', '夏', '秋', '雨'], a: 3 },
  { q: '钟表的时针从 3 点走到 6 点，转过了多少度？', o: ['60 度', '90 度', '120 度', '180 度'], a: 1 },
  { q: '下面哪种动物属于脊椎动物？', o: ['蜗牛', '章鱼', '青蛙', '蚯蚓'], a: 2 },
  { q: '汉字“休”由哪两个部件组成？', o: ['亻和木', '人和本', '亻和林', '木和口'], a: 0 },
  { q: '彩虹中通常不会出现下面哪一种颜色？', o: ['橙色', '青色', '紫色', '粉色'], a: 3 },
  { q: '从周一开始算，一周的第四天是？', o: ['周三', '周四', '周五', '周六'], a: 1 },
  { q: '三角形三个内角之和是多少度？', o: ['90 度', '180 度', '270 度', '360 度'], a: 1 },
  { q: '下面哪座城市是中国的直辖市？', o: ['杭州', '成都', '重庆', '西安'], a: 2 },
  { q: '冰吸收热量变成水，这个过程叫？', o: ['凝固', '蒸发', '融化', '凝结'], a: 2 },
];

function compare(state) {
  if (state.scores[0] === state.scores[1]) return -1;
  return state.scores[0] > state.scores[1] ? 0 : 1;
}

function label(player) {
  return player === 0 ? '玩家一' : '玩家二';
}

function resultOf(state, player) {
  const picked = state.answers[player];
  if (picked === -1) return 'none';
  return picked === state.questions[state.qi].correct ? 'right' : 'wrong';
}

export function create(seed, now) {
  const random = rng(seed);
  const order = random.shuffle(BANK.map((item, index) => index)).slice(0, ROUNDS);
  const questions = order.map((index) => {
    const item = BANK[index];
    const packed = item.o.map((text, option) => ({ text, correct: option === item.a }));
    const options = random.shuffle(packed);
    return {
      prompt: item.q,
      options: options.map((entry) => entry.text),
      correct: options.findIndex((entry) => entry.correct),
    };
  });
  const state = open(now, MATCH_MS, '共八题，答对得一分，答错扣一分。');
  state.simultaneous = true;
  state.turn = -1;
  state.questions = questions;
  state.qi = 0;
  state.answers = [-1, -1];
  state.revealAt = null;
  state.qEndsAt = now + QUESTION_MS;
  return state;
}

export function act(state, player, action, now) {
  if (!live(state)) return false;
  if (player !== 0 && player !== 1) return false;
  if (state.revealAt != null) return false;
  if (state.answers[player] !== -1) return false;
  if (now >= state.qEndsAt) return false;
  if (!action || action.type !== 'answer') return false;
  if (!int(action.index, 0, 3)) return false;
  state.now = now;
  state.answers[player] = action.index;
  if (action.index === state.questions[state.qi].correct) state.scores[player] += 1;
  else state.scores[player] -= 1;
  if (state.answers[0] !== -1 && state.answers[1] !== -1) {
    state.revealAt = now + REVEAL_MS;
    state.message = '双方都已作答，稍后进入下一题。';
  } else {
    state.message = '已作答，等待对手。';
  }
  return true;
}

export function step(state, now) {
  state.now = now;
  if (!live(state)) return false;
  if (now >= state.endsAt) {
    const winner = compare(state);
    finish(state, winner, winner === -1 ? '时间到，双方总分相同。' : `时间到，${label(winner)}总分更高。`);
    return true;
  }
  if (state.revealAt != null && now >= state.revealAt) {
    state.qi += 1;
    state.answers = [-1, -1];
    state.revealAt = null;
    if (state.qi >= state.questions.length) {
      const winner = compare(state);
      finish(state, winner, winner === -1 ? '八题答完，双方总分相同。' : `八题答完，${label(winner)}总分更高。`);
      return true;
    }
    state.qEndsAt = now + QUESTION_MS;
    state.message = `第 ${state.qi + 1} 题，限时十二秒。`;
    return true;
  }
  if (state.revealAt == null && now >= state.qEndsAt) {
    state.revealAt = now + REVEAL_MS;
    state.message = '本题时间到，稍后进入下一题。';
    return true;
  }
  return false;
}

export function view(state, player) {
  const index = Math.min(state.qi, state.questions.length - 1);
  const question = state.questions[index];
  const revealed = state.revealAt != null || state.status === 'done';
  const rivalResult = revealed ? resultOf(state, 1 - player) : null;
  const lastQuestion = state.qi >= state.questions.length - 1;
  return {
    ...pane(state),
    questionNo: Math.min(state.qi + 1, state.questions.length),
    total: state.questions.length,
    prompt: question.prompt,
    options: question.options.slice(),
    youPicked: state.answers[player],
    rivalPicked: revealed ? state.answers[1 - player] : -1,
    answered: [state.answers[0] !== -1, state.answers[1] !== -1],
    revealed,
    feedback: { you: resultOf(state, player), rival: rivalResult },
    questionLeft: Math.max(0, Math.min(state.qEndsAt, state.endsAt) - state.now),
    questionTotal: QUESTION_MS,
    lastQuestion,
    you: player,
  };
}