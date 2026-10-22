export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-tetris{display:flex;flex-direction:column;gap:10px;width:100%;max-width:560px;margin:0 auto;color:var(--tw-ink);font-family:inherit}
.tws-tetris-hud{display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:space-between}
.tws-tetris-side{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600}
.tws-tetris-side::before{content:'';width:10px;height:10px;border-radius:3px;background:var(--tw-coral);border:1.5px solid var(--tw-ink)}
.tws-tetris-side.tws-p1::before{background:var(--tw-forest)}
.tws-tetris-count{font-variant-numeric:tabular-nums;color:var(--tw-muted);font-weight:500;font-size:12px}
.tws-tetris-clock{font-size:12px;color:var(--tw-muted);font-variant-numeric:tabular-nums}
.tws-tetris-stage{position:relative;width:100%;border:1.5px solid var(--tw-ink);border-radius:18px;overflow:hidden;background:var(--tw-paper);box-shadow:0 2px 0 rgba(42,38,35,.10)}
.tws-tetris-canvas{display:block;width:100%;height:auto}
.tws-tetris-note{margin:0;font-size:13px;line-height:1.6;color:var(--tw-muted);text-align:center;min-height:21px}
.tws-tetris-pad{display:grid;grid-template-columns:repeat(5,minmax(44px,1fr));gap:6px;width:100%;max-width:360px;margin:0 auto}
.tws-tetris-key{min-height:44px;min-width:44px;border:1.5px solid var(--tw-ink);border-radius:12px;background:var(--tw-card);color:var(--tw-ink);font:inherit;font-size:14px;box-shadow:0 2px 0 rgba(42,38,35,.10);cursor:pointer;touch-action:manipulation;padding:0 4px}
.tws-tetris-key.tws-hard{background:var(--tw-coral);color:var(--tw-card);font-weight:700}
.tws-tetris-key:active{transform:translateY(1px);box-shadow:none}
.tws-tetris-key[disabled]{opacity:.45;cursor:default}
@media (prefers-reduced-motion: reduce){.tws-tetris *{transition:none!important;animation:none!important}}
@media (max-width:359px){.tws-tetris-pad{gap:4px}.tws-tetris-key{font-size:13px}}
`;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'tws-tetris';
  const hud = document.createElement('div');
  hud.className = 'tws-tetris-hud';
  const side0 = document.createElement('span');
  side0.className = 'tws-tetris-side';
  const side1 = document.createElement('span');
  side1.className = 'tws-tetris-side tws-p1';
  side0.textContent = api.names[0];
  side1.textContent = api.names[1];
  const count0 = document.createElement('em');
  count0.className = 'tws-tetris-count';
  const count1 = document.createElement('em');
  count1.className = 'tws-tetris-count';
  side0.appendChild(count0);
  side1.appendChild(count1);
  const clock = document.createElement('span');
  clock.className = 'tws-tetris-clock';
  hud.append(side0, clock, side1);

  const stage = document.createElement('div');
  stage.className = 'tws-tetris-stage';
  const canvas = document.createElement('canvas');
  canvas.className = 'tws-tetris-canvas';
  canvas.setAttribute('aria-label', '落块对战棋盘，左右移动，上旋转，空格落下');
  stage.appendChild(canvas);
  const note = document.createElement('p');
  note.className = 'tws-tetris-note';
  note.textContent = '← → 移动，↑ 旋转，↓ 加速，空格直接落下。消行会给对方添垃圾行。';

  const pad = document.createElement('div');
  pad.className = 'tws-tetris-pad';
  const actions = [
    ['left', '←', '向左移动'],
    ['rotate', '↻', '旋转方块'],
    ['right', '→', '向右移动'],
    ['down', '↓', '加速下落'],
    ['drop', '⤓', '直接落底'],
  ];
  const buttons = [];
  for (const [type, text, label] of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tws-tetris-key${type === 'drop' ? ' tws-hard' : ''}`;
    button.textContent = text;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', () => press(type));
    pad.appendChild(button);
    buttons.push(button);
  }

  wrap.append(hud, stage, note, pad);
  root.appendChild(wrap);

  const COLS = 10;
  const ROWS = 18;
  const SHAPES = {
    I: { box: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
    O: { box: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    T: { box: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
    S: { box: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
    Z: { box: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
    J: { box: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
    L: { box: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
  };
  const COLORS = {
    I: '--tw-coral',
    O: '--tw-mustard',
    T: '--tw-plum',
    S: '--tw-forest',
    Z: '--tw-olive',
    J: '--tw-sky',
    L: '--tw-ink',
  };
  const FALLBACK = {
    '--tw-coral': '#D9624C',
    '--tw-mustard': '#E8A93C',
    '--tw-plum': '#8A5A7A',
    '--tw-forest': '#2F6B5B',
    '--tw-olive': '#7E8A4A',
    '--tw-sky': '#4F7FA8',
    '--tw-ink': '#2A2623',
    '--tw-line': '#E4D7C3',
    '--tw-paper': '#FBF3E6',
    '--tw-card': '#FFFDF8',
  };

  let view = null;

  function press(type) {
    if (!view || view.status !== 'live') return;
    api.send({ type });
    if (api.sound) api.sound('tap');
  }

  const onKey = (event) => {
    if (!view || view.status !== 'live') return;
    const map = {
      ArrowLeft: 'left',
      a: 'left',
      A: 'left',
      ArrowRight: 'right',
      d: 'right',
      D: 'right',
      ArrowUp: 'rotate',
      w: 'rotate',
      W: 'rotate',
      ArrowDown: 'down',
      s: 'down',
      S: 'down',
      ' ': 'drop',
      Spacebar: 'drop',
    };
    const type = map[event.key];
    if (!type) return;
    event.preventDefault();
    press(type);
  };
  window.addEventListener('keydown', onKey);

  function cellsOf(piece) {
    const def = SHAPES[piece.t];
    let cells = def.cells;
    for (let i = 0; i < piece.r; i++) {
      cells = cells.map(([x, y]) => [def.box - 1 - y, x]);
    }
    return cells;
  }

  function collides(board, cells, x, y) {
    for (const [cx, cy] of cells) {
      const bx = x + cx;
      const by = y + cy;
      if (bx < 0 || bx >= COLS || by >= ROWS || by < 0) return true;
      if (board[by * COLS + bx]) return true;
    }
    return false;
  }

  function fit() {
    const width = canvas.clientWidth || stage.clientWidth || 300;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const target = Math.max(120, Math.round(width * dpr));
    const height = Math.round((target * ROWS) / (COLS * 2 + 4));
    if (canvas.width !== target || canvas.height !== height) {
      canvas.width = target;
      canvas.height = height;
    }
    draw();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function draw() {
    if (!view) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const style = getComputedStyle(canvas);
    const color = (name) => style.getPropertyValue(name).trim() || FALLBACK[name] || '#2A2623';
    const paper = color('--tw-paper');
    const card = color('--tw-card');
    const ink = color('--tw-ink');
    const line = color('--tw-line');
    const mustard = color('--tw-mustard');
    const scale = canvas.width / (COLS * 2 + 4);
    const unit = scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const boardX = [0, COLS * unit + 4 * unit];
    for (let p = 0; p < 2; p++) {
      const ox = boardX[p];
      ctx.fillStyle = card;
      roundRect(ctx, ox + unit * 0.08, unit * 0.08, (COLS - 0.16) * unit, (ROWS - 0.16) * unit, unit * 0.35);
      ctx.fill();
      ctx.strokeStyle = p === api.me ? mustard : ink;
      ctx.lineWidth = Math.max(1.5, unit * 0.13);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(228,215,195,.75)';
      ctx.lineWidth = 1;
      for (let x = 1; x < COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(ox + x * unit, 0);
        ctx.lineTo(ox + x * unit, ROWS * unit);
        ctx.stroke();
      }
      for (let y = 1; y < ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(ox, y * unit);
        ctx.lineTo(ox + COLS * unit, y * unit);
        ctx.stroke();
      }
    }
    function block(px, py, size, fill, outline, alpha, ghost) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const inset = size * 0.07;
      ctx.fillStyle = fill;
      roundRect(ctx, px + inset, py + inset, size - inset * 2, size - inset * 2, size * 0.18);
      ctx.fill();
      ctx.lineWidth = Math.max(1, size * 0.055);
      ctx.strokeStyle = outline;
      ctx.stroke();
      if (!ghost) {
        ctx.fillStyle = 'rgba(255,253,248,.28)';
        roundRect(ctx, px + size * 0.17, py + size * 0.17, size * 0.4, size * 0.14, size * 0.06);
        ctx.fill();
      }
      ctx.restore();
    }
    for (let p = 0; p < 2; p++) {
      const ox = boardX[p];
      const board = view.boards[p];
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const value = board[y * COLS + x];
          if (!value) continue;
          if (value === 8) block(ox + x * unit, y * unit, unit, line, ink, 1, false);
          else {
            const name = 'IOTSZJL'[value - 1] || 'I';
            block(ox + x * unit, y * unit, unit, color(COLORS[name]), ink, 1, false);
          }
        }
      }
      const piece = view.pieces[p];
      if (piece && !view.topped[p]) {
        const cells = cellsOf(piece);
        let ghostY = piece.y;
        while (!collides(board, cells, piece.x, ghostY + 1)) ghostY += 1;
        const fill = color(COLORS[piece.t]);
        for (const [cx, cy] of cells) {
          if (ghostY + cy >= 0) block(ox + (piece.x + cx) * unit, (ghostY + cy) * unit, unit, fill, ink, 0.28, true);
        }
        for (const [cx, cy] of cells) {
          if (piece.y + cy >= 0) block(ox + (piece.x + cx) * unit, (piece.y + cy) * unit, unit, fill, ink, 1, false);
        }
      }
    }
    const mx = boardX[1] - 4 * unit;
    ctx.fillStyle = ink;
    ctx.font = `600 ${Math.max(8, unit * 0.5)}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('下一个', mx + 2 * unit, unit * 1.7);
    const slots = [3.2, 7.2, 11.2];
    for (let i = 0; i < Math.min(3, view.next.length); i++) {
      const type = view.next[i];
      const def = SHAPES[type];
      if (!def) continue;
      const cells = cellsOf({ t: type, r: 0 });
      const mini = unit * 0.5;
      const width = def.box * mini;
      const height = def.box * mini;
      const top = unit * slots[i];
      for (const [cx, cy] of cells) {
        block(mx + 2 * unit - width / 2 + cx * mini, top + (unit * 1.6 - height) / 2 + cy * mini, mini, color(COLORS[type]), ink, 1, false);
      }
    }
    if (view.status === 'done') {
      ctx.fillStyle = 'rgba(251,243,230,.68)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = ink;
      ctx.font = `700 ${Math.max(12, unit * 0.9)}px "PingFang SC","Microsoft YaHei",sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(view.winner === api.me ? '你赢了' : view.winner === -1 ? '双方战平' : '你输了', canvas.width / 2, canvas.height / 2);
    }
  }

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => fit()) : null;
  if (observer) observer.observe(stage);
  else window.addEventListener('resize', fit);

  return {
    update(next) {
      view = next;
      count0.textContent = ` 消行 ${next.lines[0]}`;
      count1.textContent = ` 消行 ${next.lines[1]}`;
      const left = Math.ceil(next.matchLeft / 1000);
      clock.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      note.textContent = next.status === 'done' ? next.message : next.message || '← → 移动，↑ 旋转，↓ 加速，空格直接落下。';
      for (const button of buttons) button.disabled = next.status !== 'live';
      fit();
    },
    unmount() {
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', fit);
      window.removeEventListener('keydown', onKey);
      root.replaceChildren();
      style.remove();
    },
  };
}