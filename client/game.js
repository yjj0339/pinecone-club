import * as gomoku from '../games/gomoku.view.js';
import * as fleet from '../games/fleet.view.js';
import * as dots from '../games/dots.view.js';
import * as reversi from '../games/reversi.view.js';
import * as mines from '../games/mines.view.js';
import * as memory from '../games/memory.view.js';
import * as quiz from '../games/quiz.view.js';
import * as g2048 from '../games/g2048.view.js';
import * as sudoku from '../games/sudoku.view.js';
import * as simon from '../games/simon.view.js';
import * as hockey from '../games/hockey.view.js';
import * as tanks from '../games/tanks.view.js';
import * as bombs from '../games/bomber.view.js';
import * as snake from '../games/snake.view.js';
import * as tetris from '../games/tetris.view.js';
import * as slingshot from '../games/slingshot.view.js';
import * as maze from '../games/maze.view.js';
import * as rps from '../games/rps.view.js';
import * as reaction from '../games/reaction.view.js';
import * as typing from '../games/typing.view.js';

export const VIEWS = {
  gomoku,
  fleet,
  dots,
  reversi,
  mines,
  memory,
  quiz,
  g2048,
  sudoku,
  simon,
  hockey,
  tanks,
  bomber: bombs,
  snake,
  tetris,
  slingshot,
  maze,
  rps,
  reaction,
  typing,
};

export function mountView(gameId, root, api) {
  const view = VIEWS[gameId];
  if (!view || typeof view.mount !== 'function') {
    root.innerHTML = '<p class="pc-status-line">这款游戏的画面加载失败，试试换一款。</p>';
    return null;
  }
  try {
    return view.mount(root, api);
  } catch (error) {
    root.innerHTML = `<p class="pc-status-line">这款游戏的画面出错了：${String(error.message || error).slice(0, 80)}</p>`;
    return null;
  }
}