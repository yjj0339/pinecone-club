export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-bomber{display:flex;flex-direction:column;gap:10px;width:100%;max-width:560px;margin:0 auto;color:var(--tw-ink);font-family:inherit}
.tws-bomber-hud{display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:space-between}
.tws-bomber-side{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600}
.tws-bomber-side::before{content:'';width:10px;height:10px;border-radius:50%;background:var(--tw-coral);border:1.5px solid var(--tw-ink)}
.tws-bomber-side.tws-p1::before{background:var(--tw-forest)}
.tws-bomber-count{font-variant-numeric:tabular-nums;color:var(--tw-muted);font-weight:500;font-size:12px}
.tws-bomber-clock{font-size:12px;color:var(--tw-muted);font-variant-numeric:tabular-nums}
.tws-bomber-stage{position:relative;width:100%;border:1.5px solid var(--tw-ink);border-radius:18px;overflow:hidden;background:var(--tw-paper);box-shadow:0 2px 0 rgba(42,38,35,.10)}
.tws-bomber-canvas{display:block;width:100%;height:auto}
.tws-bomber-note{margin:0;font-size:13px;line-height:1.6;color:var(--tw-muted);text-align:center;min-height:21px}
.tws-bomber-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center}
.tws-bomber-pad{display:grid;grid-template-columns:repeat(3,minmax(44px,1fr));grid-template-areas:'. up .' 'left down right';gap:6px;width:min(100%,196px)}
.tws-bomber-key{min-height:44px;min-width:44px;border:1.5px solid var(--tw-ink);border-radius:12px;background:var(--tw-card);color:var(--tw-ink);font:inherit;font-size:14px;box-shadow:0 2px 0 rgba(42,38,35,.10);cursor:pointer;touch-action:manipulation;padding:0 10px}
.tws-bomber-key.tws-drop{background:var(--tw-coral);color:var(--tw-card);font-weight:700;border-radius:14px;min-width:88px}
.tws-bomber-key:active{transform:translateY(1px);box-shadow:none}
.tws-bomber-key[disabled]{opacity:.45;cursor:default}
@media (prefers-reduced-motion: reduce){.tws-bomber *{transition:none!important;animation:none!important}}
`;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'tws-bomber';
  const hud = document.createElement('div');
  hud.className = 'tws-bomber-hud';
  const side0 = document.createElement('span');
  side0.className = 'tws-bomber-side';
  const side1 = document.createElement('span');
  side1.className = 'tws-bomber-side tws-p1';
  side0.textContent = api.names[0];
  side1.textContent = api.names[1];
  const count0 = document.createElement('em');
  count0.className = 'tws-bomber-count';
  const count1 = document.createElement('em');
  count1.className = 'tws-bomber-count';
  side0.appendChild(count0);
  side1.appendChild(count1);
  const clock = document.createElement('span');
  clock.className = 'tws-bomber-clock';
  hud.append(side0, clock, side1);

  const stage = document.createElement('div');
  stage.className = 'tws-bomber-stage';
  const canvas = document.createElement('canvas');
  canvas.className = 'tws-bomber-canvas';
  canvas.setAttribute('aria-label', '泡泡爆破棋盘，方向键移动，空格放炸弹');
  stage.appendChild(canvas);
  const note = document.createElement('p');
  note.className = 'tws-bomber-note';
  note.textContent = '方向键移动，空格放炸弹；炸开砖块，躲开火焰。';

  const controls = document.createElement('div');
  controls.className = 'tws-bomber-controls';
  const pad = document.createElement('div');
  pad.className = 'tws-bomber-pad';
  const moveKeys = [
    ['up', '↑', 'up'],
    ['left', '←', 'left'],
    ['down', '↓', 'down'],
    ['right', '→', 'right'],
  ];
  const buttons = [];
  for (const [area, text, dir] of moveKeys) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tws-bomber-key';
    button.style.gridArea = area;
    button.textContent = text;
    button.setAttribute('aria-label', `向${text}移动一格`);
    button.addEventListener('click', () => press({ type: 'move', dir }));
    pad.appendChild(button);
    buttons.push(button);
  }
  const drop = document.createElement('button');
  drop.type = 'button';
  drop.className = 'tws-bomber-key tws-drop';
  drop.textContent = '放炸弹';
  drop.setAttribute('aria-label', '放置炸弹');
  drop.addEventListener('click', () => press({ type: 'bomb' }));
  controls.append(pad, drop);

  wrap.append(hud, stage, note, controls);
  root.appendChild(wrap);

  let view = null;

  function press(action) {
    if (!view || view.status !== 'live') return;
    api.send(action);
    if (api.sound) api.sound('tap');
  }

  const onKey = (event) => {
    if (!view || view.status !== 'live') return;
    const moves = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    if (moves[event.key]) {
      event.preventDefault();
      press({ type: 'move', dir: moves[event.key] });
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      press({ type: 'bomb' });
    }
  };
  window.addEventListener('keydown', onKey);

  const COLS = 13;
  const ROWS = 11;

  function fit() {
    const width = canvas.clientWidth || stage.clientWidth || 300;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const target = Math.max(120, Math.round(width * dpr));
    const height = Math.round((target * ROWS) / COLS);
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
    const color = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
    const paper = color('--tw-paper', '#FBF3E6');
    const card = color('--tw-card', '#FFFDF8');
    const ink = color('--tw-ink', '#2A2623');
    const line = color('--tw-line', '#E4D7C3');
    const coral = color('--tw-coral', '#D9624C');
    const forest = color('--tw-forest', '#2F6B5B');
    const mustard = color('--tw-mustard', '#E8A93C');
    const olive = color('--tw-olive', '#7E8A4A');
    const cell = canvas.width / COLS;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const px = x * cell;
        const py = y * cell;
        const value = view.board[y * COLS + x];
        ctx.strokeStyle = line;
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, cell, cell);
        if (value === 1) {
          ctx.fillStyle = ink;
          roundRect(ctx, px + cell * 0.1, py + cell * 0.1, cell * 0.8, cell * 0.8, cell * 0.14);
          ctx.fill();
          ctx.fillStyle = 'rgba(251,243,230,.16)';
          roundRect(ctx, px + cell * 0.18, py + cell * 0.18, cell * 0.64, cell * 0.2, cell * 0.1);
          ctx.fill();
        } else if (value === 2) {
          ctx.fillStyle = coral;
          roundRect(ctx, px + cell * 0.1, py + cell * 0.1, cell * 0.8, cell * 0.8, cell * 0.14);
          ctx.fill();
          ctx.strokeStyle = ink;
          ctx.lineWidth = Math.max(1, cell * 0.045);
          roundRect(ctx, px + cell * 0.1, py + cell * 0.1, cell * 0.8, cell * 0.8, cell * 0.14);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(px + cell * 0.1, py + cell * 0.48);
          ctx.lineTo(px + cell * 0.9, py + cell * 0.48);
          ctx.moveTo(px + cell * 0.5, py + cell * 0.1);
          ctx.lineTo(px + cell * 0.5, py + cell * 0.48);
          ctx.strokeStyle = 'rgba(251,243,230,.55)';
          ctx.lineWidth = Math.max(1, cell * 0.035);
          ctx.stroke();
        }
      }
    }
    for (const fire of view.fires) {
      ctx.fillStyle = mustard;
      roundRect(ctx, fire.x * cell + cell * 0.08, fire.y * cell + cell * 0.08, cell * 0.84, cell * 0.84, cell * 0.2);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1, cell * 0.04);
      ctx.stroke();
      ctx.fillStyle = 'rgba(217,98,76,.55)';
      ctx.beginPath();
      ctx.arc(fire.x * cell + cell / 2, fire.y * cell + cell / 2, cell * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const bomb of view.bombs) {
      const cx = bomb.x * cell + cell / 2;
      const cy = bomb.y * cell + cell / 2;
      const total = 2000;
      const ratio = Math.max(0, Math.min(1, bomb.fuse / total));
      ctx.beginPath();
      ctx.arc(cx, cy, cell * (0.26 + 0.1 * (1 - ratio)), 0, Math.PI * 2);
      ctx.fillStyle = ink;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.strokeStyle = bomb.owner === 0 ? coral : forest;
      ctx.lineWidth = Math.max(2, cell * 0.09);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = mustard;
      ctx.fill();
    }
    for (let p = 0; p < 2; p++) {
      const player = view.players[p];
      if (!player.alive) continue;
      const cx = player.x * cell + cell / 2;
      const cy = player.y * cell + cell / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = p === 0 ? coral : forest;
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, cell * 0.055);
      ctx.strokeStyle = ink;
      ctx.stroke();
      ctx.fillStyle = card;
      ctx.beginPath();
      ctx.arc(cx - cell * 0.11, cy - cell * 0.08, cell * 0.07, 0, Math.PI * 2);
      ctx.arc(cx + cell * 0.11, cy - cell * 0.08, cell * 0.07, 0, Math.PI * 2);
      ctx.fill();
      if (p === api.me) {
        ctx.beginPath();
        ctx.arc(cx, cy, cell * 0.42, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(232,169,60,.9)';
        ctx.lineWidth = Math.max(1, cell * 0.04);
        ctx.stroke();
      }
    }
    if (view.status === 'done') {
      ctx.fillStyle = 'rgba(251,243,230,.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = 'rgba(42,38,35,.06)';
    ctx.fillRect(0, canvas.height - Math.max(2, cell * 0.12), canvas.width, Math.max(2, cell * 0.12));
  }

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => fit()) : null;
  if (observer) observer.observe(stage);
  else window.addEventListener('resize', fit);

  return {
    update(next) {
      view = next;
      count0.textContent = ` 炸砖 ${next.scores[0]}`;
      count1.textContent = ` 炸砖 ${next.scores[1]}`;
      const left = Math.ceil(next.matchLeft / 1000);
      clock.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      note.textContent = next.status === 'done' ? next.message : next.message || '方向键移动，空格放炸弹；炸开砖块，躲开火焰。';
      for (const button of buttons) button.disabled = next.status !== 'live';
      drop.disabled = next.status !== 'live' || !next.players[api.me].alive;
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