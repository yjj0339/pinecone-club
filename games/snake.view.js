export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-snake{display:flex;flex-direction:column;gap:10px;width:100%;max-width:560px;margin:0 auto;color:var(--tw-ink);font-family:inherit}
.tws-snake-hud{display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:space-between}
.tws-snake-side{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600}
.tws-snake-side::before{content:'';width:10px;height:10px;border-radius:3px;background:var(--tw-coral);border:1.5px solid var(--tw-ink)}
.tws-snake-side.tws-p1::before{background:var(--tw-forest)}
.tws-snake-count{font-variant-numeric:tabular-nums;color:var(--tw-muted);font-weight:500;font-size:12px}
.tws-snake-clock{font-size:12px;color:var(--tw-muted);font-variant-numeric:tabular-nums}
.tws-snake-stage{position:relative;width:100%;border:1.5px solid var(--tw-ink);border-radius:18px;overflow:hidden;background:var(--tw-paper);box-shadow:0 2px 0 rgba(42,38,35,.10)}
.tws-snake-canvas{display:block;width:100%;height:auto}
.tws-snake-note{margin:0;font-size:13px;line-height:1.6;color:var(--tw-muted);text-align:center;min-height:21px}
.tws-snake-pad{display:grid;grid-template-columns:repeat(3,minmax(44px,1fr));grid-template-areas:'. up .' 'left down right';gap:6px;width:min(100%,220px);margin:0 auto}
.tws-snake-key{min-height:44px;min-width:44px;border:1.5px solid var(--tw-ink);border-radius:12px;background:var(--tw-card);color:var(--tw-ink);font:inherit;font-size:14px;box-shadow:0 2px 0 rgba(42,38,35,.10);cursor:pointer;touch-action:manipulation}
.tws-snake-key:active{transform:translateY(1px);box-shadow:none}
.tws-snake-key[disabled]{opacity:.45;cursor:default}
@media (prefers-reduced-motion: reduce){.tws-snake *{transition:none!important;animation:none!important}}
`;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'tws-snake';
  const hud = document.createElement('div');
  hud.className = 'tws-snake-hud';
  const side0 = document.createElement('span');
  side0.className = 'tws-snake-side';
  const side1 = document.createElement('span');
  side1.className = 'tws-snake-side tws-p1';
  side0.textContent = api.names[0];
  side1.textContent = api.names[1];
  const count0 = document.createElement('em');
  count0.className = 'tws-snake-count';
  const count1 = document.createElement('em');
  count1.className = 'tws-snake-count';
  side0.appendChild(count0);
  side1.appendChild(count1);
  const clock = document.createElement('span');
  clock.className = 'tws-snake-clock';
  hud.append(side0, clock, side1);

  const stage = document.createElement('div');
  stage.className = 'tws-snake-stage';
  const canvas = document.createElement('canvas');
  canvas.className = 'tws-snake-canvas';
  canvas.setAttribute('aria-label', '长蛇竞技棋盘，方向键改变方向');
  stage.appendChild(canvas);
  const note = document.createElement('p');
  note.className = 'tws-snake-note';
  note.textContent = '方向键或滑动转向，吃果实变长，别撞上。';

  const pad = document.createElement('div');
  pad.className = 'tws-snake-pad';
  const keys = [
    ['up', '↑', 'up'],
    ['left', '←', 'left'],
    ['down', '↓', 'down'],
    ['right', '→', 'right'],
  ];
  const buttons = [];
  for (const [area, text, dir] of keys) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tws-snake-key';
    button.style.gridArea = area;
    button.textContent = text;
    button.setAttribute('aria-label', `蛇向${text}转`);
    button.addEventListener('click', () => press(dir));
    pad.appendChild(button);
    buttons.push(button);
  }

  wrap.append(hud, stage, note, pad);
  root.appendChild(wrap);

  let view = null;

  function press(dir) {
    if (!view || view.status !== 'live') return;
    api.send({ type: 'dir', dir });
    if (api.sound) api.sound('tap');
  }

  const onKey = (event) => {
    if (!view || view.status !== 'live') return;
    const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    const dir = dirs[event.key];
    if (!dir) return;
    event.preventDefault();
    press(dir);
  };
  window.addEventListener('keydown', onKey);

  let start = null;
  const down = (event) => {
    const touch = event.touches ? event.touches[0] : event;
    start = { x: touch.clientX, y: touch.clientY };
  };
  const up = (event) => {
    if (!start) return;
    const touch = event.changedTouches ? event.changedTouches[0] : event;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) press(dx > 0 ? 'right' : 'left');
    else press(dy > 0 ? 'down' : 'up');
  };
  stage.addEventListener('touchstart', down, { passive: true });
  stage.addEventListener('touchend', up, { passive: true });

  const COLS = 21;
  const ROWS = 21;

  function fit() {
    const width = canvas.clientWidth || stage.clientWidth || 300;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const target = Math.max(120, Math.round(width * dpr));
    if (canvas.width !== target) {
      canvas.width = target;
      canvas.height = target;
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
    const color = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
    const paper = color('--tw-paper', '#FBF3E6');
    const card = color('--tw-card', '#FFFDF8');
    const ink = color('--tw-ink', '#2A2623');
    const line = color('--tw-line', '#E4D7C3');
    const coral = color('--tw-coral', '#D9624C');
    const forest = color('--tw-forest', '#2F6B5B');
    const mustard = color('--tw-mustard', '#E8A93C');
    const cell = canvas.width / COLS;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(canvas.width, i * cell);
      ctx.stroke();
    }
    if (view.food) {
      const fx = view.food.x * cell + cell / 2;
      const fy = view.food.y * cell + cell / 2;
      ctx.beginPath();
      ctx.arc(fx, fy, cell * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = mustard;
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1, cell * 0.05);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(fx + cell * 0.12, fy - cell * 0.28, cell * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = forest;
      ctx.fill();
    }
    for (let p = 0; p < 2; p++) {
      const snake = view.snakes[p];
      if (!snake) continue;
      const base = p === 0 ? coral : forest;
      for (let i = snake.body.length - 1; i >= 0; i--) {
        const cellPos = snake.body[i];
        const px = cellPos.x * cell;
        const py = cellPos.y * cell;
        const isHead = i === 0;
        const inset = isHead ? cell * 0.06 : cell * 0.12;
        ctx.fillStyle = snake.alive ? base : 'rgba(42,38,35,.22)';
        roundRect(ctx, px + inset, py + inset, cell - inset * 2, cell - inset * 2, isHead ? cell * 0.26 : cell * 0.18);
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = Math.max(1, cell * 0.05);
        ctx.stroke();
        if (isHead && snake.alive) {
          ctx.fillStyle = card;
          ctx.beginPath();
          ctx.arc(px + cell * 0.36, py + cell * 0.38, Math.max(1, cell * 0.09), 0, Math.PI * 2);
          ctx.arc(px + cell * 0.64, py + cell * 0.38, Math.max(1, cell * 0.09), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = ink;
          ctx.beginPath();
          ctx.arc(px + cell * 0.36, py + cell * 0.38, Math.max(0.8, cell * 0.045), 0, Math.PI * 2);
          ctx.arc(px + cell * 0.64, py + cell * 0.38, Math.max(0.8, cell * 0.045), 0, Math.PI * 2);
          ctx.fill();
        }
        if (isHead && snake.alive && p === api.me) {
          ctx.strokeStyle = mustard;
          ctx.lineWidth = Math.max(1.2, cell * 0.07);
          roundRect(ctx, px + cell * 0.02, py + cell * 0.02, cell * 0.96, cell * 0.96, cell * 0.3);
          ctx.stroke();
        }
      }
      if (!snake.alive) {
        const head = snake.body[0];
        ctx.strokeStyle = 'rgba(42,38,35,.4)';
        ctx.lineWidth = Math.max(1.4, cell * 0.08);
        ctx.beginPath();
        ctx.moveTo(head.x * cell + cell * 0.3, head.y * cell + cell * 0.3);
        ctx.lineTo(head.x * cell + cell * 0.7, head.y * cell + cell * 0.7);
        ctx.moveTo(head.x * cell + cell * 0.7, head.y * cell + cell * 0.3);
        ctx.lineTo(head.x * cell + cell * 0.3, head.y * cell + cell * 0.7);
        ctx.stroke();
      }
    }
    if (view.status === 'live' && view.nextTickIn > 0 && view.nextTickIn <= 1500) {
      ctx.fillStyle = 'rgba(232,169,60,.9)';
      ctx.beginPath();
      ctx.arc(canvas.width - cell * 0.7, cell * 0.7, cell * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => fit()) : null;
  if (observer) observer.observe(stage);
  else window.addEventListener('resize', fit);

  return {
    update(next) {
      view = next;
      count0.textContent = ` 果实 ${next.scores[0]}`;
      count1.textContent = ` 果实 ${next.scores[1]}`;
      const left = Math.ceil(next.matchLeft / 1000);
      clock.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      note.textContent = next.status === 'done' ? next.message : next.message || '方向键或滑动转向，吃果实变长，别撞上。';
      for (const button of buttons) button.disabled = next.status !== 'live';
      fit();
    },
    unmount() {
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', fit);
      window.removeEventListener('keydown', onKey);
      stage.removeEventListener('touchstart', down);
      stage.removeEventListener('touchend', up);
      root.replaceChildren();
      style.remove();
    },
  };
}