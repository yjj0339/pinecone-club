import * as gomoku from './gomoku.engine.js';
import * as fleet from './fleet.engine.js';
import * as dots from './dots.engine.js';
import * as reversi from './reversi.engine.js';
import * as mines from './mines.engine.js';
import * as memory from './memory.engine.js';
import * as quiz from './quiz.engine.js';
import * as g2048 from './g2048.engine.js';
import * as sudoku from './sudoku.engine.js';
import * as simon from './simon.engine.js';
import * as hockey from './hockey.engine.js';
import * as tanks from './tanks.engine.js';
import * as bomber from './bomber.engine.js';
import * as snake from './snake.engine.js';
import * as tetris from './tetris.engine.js';
import * as slingshot from './slingshot.engine.js';
import * as maze from './maze.engine.js';
import * as rps from './rps.engine.js';
import * as reaction from './reaction.engine.js';
import * as typing from './typing.engine.js';

export const ENGINES = {
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
  bomber,
  snake,
  tetris,
  slingshot,
  maze,
  rps,
  reaction,
  typing,
};

export function engineFor(id) {
  return ENGINES[id] || null;
}