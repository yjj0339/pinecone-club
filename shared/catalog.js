export const CATALOG = [
  { id: 'gomoku', name: '五子棋', en: 'Five in Line', group: 'board', tint: 'coral', minutes: '3–10 分钟', tagline: '横竖斜，先连五个', rules: '15×15 棋盘，黑方先行。轮流在交叉点落子，横、竖、斜任意方向连成五子即获胜；棋盘下满则为和棋。', controls: '点击棋盘落子' },
  { id: 'fleet', name: '雾中舰队', en: 'Fog Fleet', group: 'board', tint: 'sky', minutes: '4–8 分钟', tagline: '看不见的舰队', rules: '先在自家海域布置三艘船，随后轮流炮击对方海域。击沉全部船只的一方获胜。', controls: '点击或拖动布阵，点击对方海域开炮' },
  { id: 'dots', name: '点格领地', en: 'Dot Grid', group: 'board', tint: 'forest', minutes: '3–6 分钟', tagline: '每条边都算数', rules: '轮流连接相邻圆点，围成一个方格的最后一条边即可占领它并继续行动。终局格子多者获胜。', controls: '点击两点之间的边' },
  { id: 'reversi', name: '黑白棋', en: 'Othello Flip', group: 'board', tint: 'plum', minutes: '4–8 分钟', tagline: '落子，翻面', rules: '落子必须夹住至少一枚对方棋子并全部翻转。无合法落点时自动跳过，终局棋子多者获胜。', controls: '点击高亮落点' },
  { id: 'mines', name: '雷区漫步', en: 'Mine Walk', group: 'board', tint: 'olive', minutes: '3 分钟', tagline: '同一张图，比谁更稳', rules: '双方在同一雷区竞速，翻开安全格累积进度。踩雷扣分并短暂冻结，限时内安全格多者获胜。', controls: '点击翻开，长按或右键插旗' },
  { id: 'memory', name: '记忆翻牌', en: 'Pair Memory', group: 'puzzle', tint: 'mustard', minutes: '2–4 分钟', tagline: '记得住就赢', rules: '轮流翻开两张牌，图案相同即可得分并继续翻牌。全部配对后，得分高者获胜。', controls: '点击两张暗牌' },
  { id: 'quiz', name: '灵光问答', en: 'Quick Quiz', group: 'puzzle', tint: 'sky', minutes: '2–3 分钟', tagline: '同题同秒，各答各的', rules: '同一道题限时作答，答对得分、答错扣分，共八题。总分高者获胜。', controls: '点击选项，或按数字键' },
  { id: 'g2048', name: '2048 对决', en: '2048 Duel', group: 'puzzle', tint: 'mustard', minutes: '3 分钟', tagline: '同种子，各自合大', rules: '双方同种子开局，滑动合并相同数字。三分钟内分数更高者获胜。', controls: '方向键或滑动棋盘' },
  { id: 'sudoku', name: '数独竞速', en: 'Sudoku Race', group: 'puzzle', tint: 'forest', minutes: '5 分钟', tagline: '同一题，比手稳', rules: '双方挑战同一道数独，填入数字。先正确填完者获胜；限时结束则比较正确格数，错填会扣分。', controls: '点击格子，再用数字键盘' },
  { id: 'simon', name: '回声序列', en: 'Echo Simon', group: 'puzzle', tint: 'plum', minutes: '2–4 分钟', tagline: '记住这段颜色', rules: '记住依次亮起的颜色序列并按顺序复现，每轮序列增长。按对得分，先到 10 分者获胜。', controls: '点击色块，或按数字键 1–4' },
  { id: 'hockey', name: '桌面冰球', en: 'Pocket Hockey', group: 'action', tint: 'sky', minutes: '1–3 分钟', tagline: '守门，然后反击', rules: '拖动球拍击球，把球打进对方球门得分，先得 5 分者获胜。', controls: '拖动球拍或使用方向键' },
  { id: 'tanks', name: '铁皮坦克', en: 'Tin Tanks', group: 'action', tint: 'olive', minutes: '2–4 分钟', tagline: '掩体后面见', rules: '控制坦克移动、瞄准并开炮，掩体可以挡住炮弹。击毁对方坦克者获胜。', controls: '方向键移动，动作键开火' },
  { id: 'bomber', name: '泡泡爆破', en: 'Bubble Blast', group: 'action', tint: 'coral', minutes: '2–4 分钟', tagline: '放完就跑', rules: '放置倒计时炸弹，十字爆炸可以炸开砖块并连锁。最后存活者获胜，同时出局为和棋。', controls: '方向键移动，动作键放炸弹' },
  { id: 'snake', name: '长蛇竞技', en: 'Twin Snakes', group: 'action', tint: 'forest', minutes: '1–3 分钟', tagline: '吃长一点，别撞上', rules: '吃果实变长，撞墙或撞到蛇身判负；双方同时相撞为和棋。不能直接反向。', controls: '方向键、滑动或屏幕方向键' },
  { id: 'tetris', name: '落块对战', en: 'Falling Blocks', group: 'action', tint: 'plum', minutes: '3–6 分钟', tagline: '消行，给对方添堵', rules: '双方获得相同顺序的方块，移动、旋转并落下。消行会向对方发送垃圾行，先封顶者输。', controls: '方向键移动旋转，空格落下' },
  { id: 'slingshot', name: '弹弓攻城', en: 'Castle Fling', group: 'duel', tint: 'mustard', minutes: '3–5 分钟', tagline: '算好这条弧线', rules: '轮流调整角度与力度发射，风会影响弹道。命中会削减对方城墙，先摧毁对方城堡者获胜。', controls: '调整角度和力度，按发射' },
  { id: 'maze', name: '迷宫夺旗', en: 'Maze Flags', group: 'duel', tint: 'coral', minutes: '2–4 分钟', tagline: '抢旗，送回家', rules: '在对称迷宫中争夺旗帜，把旗带回自己的基地得分，先到 3 分者获胜。', controls: '方向键或屏幕方向键' },
  { id: 'rps', name: '石头剪刀布', en: 'Rock Paper Scissors', group: 'duel', tint: 'forest', minutes: '1 分钟', tagline: '三局两胜的小心思', rules: '双方同时出手，胜一局得一分，先到 3 分者获胜，平局重来。', controls: '选择石头、剪刀或布' },
  { id: 'reaction', name: '抢拍反应', en: 'Reflex Tap', group: 'duel', tint: 'coral', minutes: '1 分钟', tagline: '灯亮再拍', rules: '随机信号亮起后立刻点击，抢跑会被罚分。五轮之后积分高者获胜，网络延迟会影响结果。', controls: '看到信号后点击或按空格' },
  { id: 'typing', name: '打字竞速', en: 'Type Race', group: 'duel', tint: 'sky', minutes: '1 分钟', tagline: '同一句话，谁先打完', rules: '双方输入同一句中文，服务器校验输入进度。先完整正确输入的人获胜。', controls: '点击输入框开始输入' },
];

export const GAME_IDS = CATALOG.map((game) => game.id);

export function gameInfo(id) {
  return CATALOG.find((game) => game.id === id) || null;
}

export const GROUPS = {
  board: CATALOG.filter((game) => game.group === 'board').map((game) => game.id),
  puzzle: CATALOG.filter((game) => game.group === 'puzzle').map((game) => game.id),
  action: CATALOG.filter((game) => game.group === 'action').map((game) => game.id),
  duel: CATALOG.filter((game) => game.group === 'duel').map((game) => game.id),
};