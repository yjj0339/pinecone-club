export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-hockey{display:flex;flex-direction:column;gap:10px;width:100%;max-width:560px;margin:0 auto;color:var(--tw-ink);font-family:inherit}
.tws-hockey-hud{display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:space-between}
.tws-hockey-name{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600}
.tws-hockey-name::before{content:'';width:10px;height:10px;border-radius:50%;background:var(--tw-coral);border:1.5px solid var(--tw-ink)}
.tws-hockey-name.tws-p1::before{background:var(--tw-forest)}
.tws-hockey-score{font-variant-numeric:tabular-nums;font-weight:700;font-size:20px;letter-spacing:.04em}
.tws-hockey-clock{font-size:12px;color:var(--tw-muted);font-variant-numeric:tabular-nums}
.tws-hockey-stage{position:relative;width:100%;border:1.5px solid var(--tw-ink);border-radius:18px;overflow:hidden;background:var(--tw-paper);box-shadow:0 2px 0 rgba(42,38,35,.10);touch-action:none}
.tws-hockey-canvas{display:block;width:100%;height:auto}
.tws-hockey-note{margin:0;font-size:13px;line-height:1.6;color:var(--tw-muted);text-align:center;min-height:21px}
.tws-hockey-pad{display:grid;grid-template-columns:repeat(3,minmax(44px,1fr));grid-template-areas:'. up .' 'left down right';gap:6px;max-width:260px;margin:0 auto;width:100%}
.tws-hockey-key{min-height:44px;min-width:44px;border:1.5px solid var(--tw-ink);border-radius:12px;background:var(--tw-card);color:var(--tw-ink);font:inherit;font-size:14px;box-shadow:0 2px 0 rgba(42,38,35,.10);cursor:pointer;touch-action:manipulation}
.tws-hockey-key:active{transform:translateY(1px);box-shadow:none}
.tws-hockey-key[disabled]{opacity:.45;cursor:default}
.tws-hockey-tip{grid-column:1 / -1;text-align:center;font-size:12px;color:var(--tw-muted);padding:2px 0}
@media (prefers-reduced-motion: reduce){.tws-hockey *{transition:none!important;animation:none!important}}
`;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'tws-hockey';
  const hud = document.createElement('div');
  hud.className = 'tws-hockey-hud';
  const name0 = document.createElement('span');
  name0.className = 'tws-hockey-name';
  const score = document.createElement('span');
  score.className = 'tws-hockey-score';
  score.textContent = '0 : 0';
  const clock = document.createElement('span');
  clock.className = 'tws-hockey-clock';
  const name1 = document.createElement('span');
  name1.className = 'tws-hockey-name tws-p1';
  hud.append(name0, score, clock, name1);
  name0.textContent = api.names[0];
  name1.textContent = api.names[1];

  const stage = document.createElement('div');
  stage.className = 'tws-hockey-stage';
  const canvas = document.createElement('canvas');
  canvas.className = 'tws-hockey-canvas';
  canvas.setAttribute('aria-label', '桌面冰球场地，拖动球拍击球');
  stage.appendChild(canvas);
  const note = document.createElement('p');
  note.className = 'tws-hockey-note';
  note.textContent = '拖动球拍或按方向键移动，把球打进对方球门。';

  const pad = document.createElement('div');
  pad.className = 'tws-hockey-pad';
  const keys = [
    ['up', '↑', 'ArrowUp'],
    ['left', '←', 'ArrowLeft'],
    ['down', '↓', 'ArrowDown'],
    ['right', '→', 'ArrowRight'],
  ];
  const buttons = [];
  for (const [area, text, key] of keys) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tws-hockey-key';
    button.style.gridArea = area;
    button.textContent = text;
    button.setAttribute('aria-label', `球拍向${text}移动`);
    button.addEventListener('click', () => nudge(key, 14));
    pad.appendChild(button);
    buttons.push(button);
  }
  const tip = document.createElement('span');
  tip.className = 'tws-hockey-tip';
  tip.textContent = '方向键微调球拍 · 拖动更顺手';
  pad.appendChild(tip);

  wrap.append(hud, stage, note, pad);
  root.appendChild(wrap);

  const W = 100;
  const H = 160;
  let view = null;

  function send(x, y) {
    api.send({ type: 'move', x, y });
  }

  function nudge(key, amount) {
    if (!view || view.status !== 'live') return;
    const own = view.paddles[api.me];
    const base = { x: own.x, y: own.y };
    if (key === 'ArrowLeft') send(Math.max(6, base.x - amount), base.y);
    if (key === 'ArrowRight') send(Math.min(94, base.x + amount), base.y);
    if (key === 'ArrowUp') send(base.x, Math.max(6, base.y - amount));
    if (key === 'ArrowDown') send(base.x, Math.min(154, base.y + amount));
    if (api.sound) api.sound('tap');
  }

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * W,
      y: ((event.clientY - rect.top) / rect.height) * H,
    };
  }

  function onPointer(event) {
    event.preventDefault();
    const spot = point(event);
    if (!spot || !view || view.status !== 'live') return;
    send(spot.x, spot.y);
  }

  let dragging = false;
  const down = (event) => {
    dragging = true;
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
    onPointer(event);
  };
  const move = (event) => {
    if (dragging) onPointer(event);
  };
  const up = () => {
    dragging = false;
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', up);

  const onKey = (event) => {
    if (!view || view.status !== 'live') return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    nudge(event.key, 14);
  };
  window.addEventListener('keydown', onKey);

  function fit() {
    const width = canvas.clientWidth || stage.clientWidth || 300;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const target = Math.max(120, Math.round(width * dpr));
    if (canvas.width !== target) {
      canvas.width = target;
      canvas.height = Math.round((target * H) / W);
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

  function drawPaddle(ctx, scale, pad, color) {
    ctx.save();
    ctx.translate(pad.x * scale, pad.y * scale);
    ctx.beginPath();
    ctx.arc(0, 0, 6 * scale, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = Math.max(1, scale * 0.9);
    ctx.strokeStyle = '#2A2623';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-2 * scale, -2 * scale, 1.8 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,253,248,.7)';
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    if (!view) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scale = canvas.width / W;
    const style = getComputedStyle(canvas);
    const color = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
    const paper = color('--tw-paper', '#FBF3E6');
    const card = color('--tw-card', '#FFFDF8');
    const ink = color('--tw-ink', '#2A2623');
    const line = color('--tw-line', '#E4D7C3');
    const coral = color('--tw-coral', '#D9624C');
    const forest = color('--tw-forest', '#2F6B5B');
    const mustard = color('--tw-mustard', '#E8A93C');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = card;
    roundRect(ctx, 0, 0, canvas.width, canvas.height, 0);
    ctx.fill();
    ctx.save();
    ctx.lineWidth = Math.max(1.5, scale * 0.6);
    ctx.strokeStyle = ink;
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, canvas.width - ctx.lineWidth, canvas.height - ctx.lineWidth);
    ctx.restore();
    const goal = (view.goalWidth || 32) / 2;
    ctx.fillStyle = coral;
    ctx.fillRect((W / 2 - goal) * scale, 0, goal * 2 * scale, 2.2 * scale);
    ctx.fillStyle = forest;
    ctx.fillRect((W / 2 - goal) * scale, (H - 2.2) * scale, goal * 2 * scale, 2.2 * scale);
    ctx.strokeStyle = line;
    ctx.lineWidth = Math.max(1, scale * 0.5);
    ctx.beginPath();
    ctx.setLineDash([scale * 2.5, scale * 2]);
    ctx.moveTo(0, (H / 2) * scale);
    ctx.lineTo(canvas.width, (H / 2) * scale);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc((W / 2) * scale, (H / 2) * scale, 14 * scale, 0, Math.PI * 2);
    ctx.stroke();
    drawPaddle(ctx, scale, view.paddles[0], coral);
    drawPaddle(ctx, scale, view.paddles[1], forest);
    ctx.save();
    const ownPad = view.paddles[api.me];
    ctx.beginPath();
    ctx.arc(ownPad.x * scale, ownPad.y * scale, 8.6 * scale, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1.2, scale * 0.55);
    ctx.strokeStyle = mustard;
    ctx.stroke();
    ctx.restore();
    const puck = view.puck;
    ctx.save();
    ctx.translate(puck.x * scale, puck.y * scale);
    ctx.beginPath();
    ctx.arc(0, 0, 3.4 * scale, 0, Math.PI * 2);
    ctx.fillStyle = ink;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-1.1 * scale, -1.1 * scale, 1.1 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(251,243,230,.6)';
    ctx.fill();
    ctx.restore();
    if (view.phase === 'serve') {
      ctx.fillStyle = mustard;
      ctx.beginPath();
      ctx.arc((W / 2) * scale, (H / 2) * scale, (4 + ((view.now / 90) % 3)) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => fit()) : null;
  if (observer) observer.observe(stage);
  else window.addEventListener('resize', fit);

  return {
    update(next) {
      view = next;
      const left = Math.ceil(next.matchLeft / 1000);
      const clockText = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      score.textContent = `${next.scores[0]} : ${next.scores[1]}`;
      clock.textContent = clockText;
      note.textContent = next.status === 'done' ? next.message : next.message || '拖动球拍或按方向键移动，把球打进对方球门。';
      for (const button of buttons) button.disabled = next.status !== 'live';
      fit();
    },
    unmount() {
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', fit);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('pointerleave', up);
      root.replaceChildren();
      style.remove();
    },
  };
}