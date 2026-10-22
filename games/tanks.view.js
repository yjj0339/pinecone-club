export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-tanks{display:flex;flex-direction:column;gap:10px;width:100%;max-width:560px;margin:0 auto;color:var(--tw-ink);font-family:inherit}
.tws-tanks-hud{display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:space-between}
.tws-tanks-side{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600}
.tws-tanks-side::before{content:'';width:10px;height:10px;border-radius:50%;background:var(--tw-coral);border:1.5px solid var(--tw-ink)}
.tws-tanks-side.tws-p1::before{background:var(--tw-forest)}
.tws-tanks-hp{font-variant-numeric:tabular-nums;color:var(--tw-muted);font-weight:500;font-size:12px}
.tws-tanks-clock{font-size:12px;color:var(--tw-muted);font-variant-numeric:tabular-nums}
.tws-tanks-stage{position:relative;width:100%;border:1.5px solid var(--tw-ink);border-radius:18px;overflow:hidden;background:var(--tw-paper);box-shadow:0 2px 0 rgba(42,38,35,.10)}
.tws-tanks-canvas{display:block;width:100%;height:auto}
.tws-tanks-note{margin:0;font-size:13px;line-height:1.6;color:var(--tw-muted);text-align:center;min-height:21px}
.tws-tanks-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center}
.tws-tanks-pad{display:grid;grid-template-columns:repeat(3,minmax(44px,1fr));grid-template-areas:'. up .' 'left down right';gap:6px;width:min(100%,196px)}
.tws-tanks-aim{display:flex;gap:8px}
.tws-tanks-fire{min-width:64px}
.tws-tanks-key{min-height:44px;min-width:44px;border:1.5px solid var(--tw-ink);border-radius:12px;background:var(--tw-card);color:var(--tw-ink);font:inherit;font-size:14px;box-shadow:0 2px 0 rgba(42,38,35,.10);cursor:pointer;touch-action:manipulation;padding:0 10px}
.tws-tanks-key.tws-fire{background:var(--tw-coral);color:var(--tw-card);font-weight:700;border-radius:14px}
.tws-tanks-key.tws-aim{background:var(--tw-card)}
.tws-tanks-key:active{transform:translateY(1px);box-shadow:none}
.tws-tanks-key[disabled]{opacity:.45;cursor:default}
.tws-tanks-status{width:100%;text-align:center;font-size:12px;color:var(--tw-muted);font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion: reduce){.tws-tanks *{transition:none!important;animation:none!important}}
`;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'tws-tanks';
  const hud = document.createElement('div');
  hud.className = 'tws-tanks-hud';
  const side0 = document.createElement('span');
  side0.className = 'tws-tanks-side';
  const side1 = document.createElement('span');
  side1.className = 'tws-tanks-side tws-p1';
  const hp0 = document.createElement('em');
  hp0.className = 'tws-tanks-hp';
  const hp1 = document.createElement('em');
  hp1.className = 'tws-tanks-hp';
  side0.textContent = api.names[0];
  side1.textContent = api.names[1];
  side0.appendChild(hp0);
  side1.appendChild(hp1);
  const clock = document.createElement('span');
  clock.className = 'tws-tanks-clock';
  hud.append(side0, clock, side1);

  const stage = document.createElement('div');
  stage.className = 'tws-tanks-stage';
  const canvas = document.createElement('canvas');
  canvas.className = 'tws-tanks-canvas';
  canvas.setAttribute('aria-label', '铁皮坦克战场，方向键移动，Q E 瞄准，空格开火');
  stage.appendChild(canvas);
  const note = document.createElement('p');
  note.className = 'tws-tanks-note';
  note.textContent = '方向键移动，Q / E 转动炮口，空格开火。';

  const controls = document.createElement('div');
  controls.className = 'tws-tanks-controls';
  const pad = document.createElement('div');
  pad.className = 'tws-tanks-pad';
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
    button.className = 'tws-tanks-key';
    button.style.gridArea = area;
    button.textContent = text;
    button.setAttribute('aria-label', `坦克向${text}移动`);
    button.addEventListener('click', () => press({ type: 'move', dir }));
    pad.appendChild(button);
    buttons.push(button);
  }
  const aim = document.createElement('div');
  aim.className = 'tws-tanks-aim';
  const aimLeft = document.createElement('button');
  aimLeft.type = 'button';
  aimLeft.className = 'tws-tanks-key tws-aim';
  aimLeft.textContent = '左瞄';
  aimLeft.setAttribute('aria-label', '炮口向左转');
  aimLeft.addEventListener('click', () => press({ type: 'aim', dir: 'left' }));
  const aimRight = document.createElement('button');
  aimRight.type = 'button';
  aimRight.className = 'tws-tanks-key tws-aim';
  aimRight.textContent = '右瞄';
  aimRight.setAttribute('aria-label', '炮口向右转');
  aimRight.addEventListener('click', () => press({ type: 'aim', dir: 'right' }));
  aim.append(aimLeft, aimRight);
  const fire = document.createElement('button');
  fire.type = 'button';
  fire.className = 'tws-tanks-key tws-fire';
  fire.textContent = '开火';
  fire.setAttribute('aria-label', '开火');
  fire.addEventListener('click', () => press({ type: 'fire' }));
  controls.append(pad, aim, fire);
  const status = document.createElement('div');
  status.className = 'tws-tanks-status';
  status.textContent = '炮口已就绪';
  controls.appendChild(status);

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
    if (event.key === 'q' || event.key === 'Q') {
      event.preventDefault();
      press({ type: 'aim', dir: 'left' });
      return;
    }
    if (event.key === 'e' || event.key === 'E') {
      event.preventDefault();
      press({ type: 'aim', dir: 'right' });
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      press({ type: 'fire' });
    }
  };
  window.addEventListener('keydown', onKey);

  const W = 120;
  const H = 120;

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

  function drawTank(ctx, scale, tank, color, me) {
    ctx.save();
    ctx.translate(tank.x * scale, tank.y * scale);
    if (me) {
      ctx.beginPath();
      ctx.arc(0, 0, 6.4 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = '#E8A93C';
      ctx.lineWidth = Math.max(1, scale * 0.5);
      ctx.setLineDash([scale * 1.2, scale * 1.2]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.arc(0, 0, 4.8 * scale, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = Math.max(1, scale * 0.45);
    ctx.strokeStyle = '#2A2623';
    ctx.stroke();
    const angle = tank.angle;
    const known = tank.known;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.rect(-1.1 * scale, -1.3 * scale, 7 * scale, 2.6 * scale);
    ctx.fillStyle = known ? '#7C7268' : '#2A2623';
    ctx.fill();
    ctx.strokeStyle = '#FFFDF8';
    ctx.lineWidth = Math.max(1, scale * 0.28);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, 0, 1.9 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFDF8';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 1.1 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#2A2623';
    ctx.fill();
    if (known) {
      ctx.beginPath();
      ctx.arc(0, 0, 7.2 * scale, -0.5, 0.5);
      ctx.lineWidth = Math.max(1, scale * 0.35);
      ctx.strokeStyle = 'rgba(42,38,35,.28)';
      ctx.stroke();
    }
    ctx.restore();
  }

  function blockedAt(obstacles, x, y) {
    for (const rect of obstacles) {
      const nx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
      const ny = Math.max(rect.y, Math.min(y, rect.y + rect.h));
      if (Math.hypot(x - nx, y - ny) < 1.4) return true;
    }
    return false;
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
    const olive = color('--tw-olive', '#7E8A4A');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = line;
    for (let x = 10; x < W; x += 10) {
      for (let y = 10; y < H; y += 10) {
        ctx.beginPath();
        ctx.arc(x * scale, y * scale, Math.max(0.7, scale * 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const rect of view.obstacles) {
      ctx.fillStyle = ink;
      ctx.fillRect((rect.x + 1.1) * scale, (rect.y + 1.2) * scale, rect.w * scale, rect.h * scale);
      ctx.fillStyle = card;
      roundRect(ctx, rect.x * scale, rect.y * scale, rect.w * scale, rect.h * scale, 2 * scale);
      ctx.fill();
      ctx.lineWidth = Math.max(1, scale * 0.5);
      ctx.strokeStyle = olive;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((rect.x + 1.6) * scale, (rect.y + 1.6) * scale);
      ctx.lineTo((rect.x + rect.w - 1.6) * scale, (rect.y + 1.6) * scale);
      ctx.strokeStyle = 'rgba(126,138,74,.35)';
      ctx.lineWidth = Math.max(1, scale * 0.3);
      ctx.stroke();
    }
    const me = api.me;
    const own = view.tanks[me];
    const guideAngle = own.aim;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([scale * 1.6, scale * 1.6]);
    ctx.strokeStyle = 'rgba(232,169,60,.85)';
    ctx.lineWidth = Math.max(1, scale * 0.35);
    ctx.moveTo((own.x + Math.cos(guideAngle) * 7) * scale, (own.y + Math.sin(guideAngle) * 7) * scale);
    for (let d = 7; d < 90; d += 1) {
      const gx = own.x + Math.cos(guideAngle) * d;
      const gy = own.y + Math.sin(guideAngle) * d;
      if (gx < 1 || gy < 1 || gx > W - 1 || gy > H - 1 || blockedAt(view.obstacles, gx, gy)) break;
      ctx.lineTo(gx * scale, gy * scale);
    }
    ctx.stroke();
    ctx.restore();
    for (const bullet of view.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x * scale, bullet.y * scale, 1.5 * scale, 0, Math.PI * 2);
      ctx.fillStyle = bullet.owner === 0 ? coral : forest;
      ctx.fill();
      ctx.lineWidth = Math.max(1, scale * 0.3);
      ctx.strokeStyle = ink;
      ctx.stroke();
    }
    for (let p = 0; p < 2; p++) {
      const tank = view.tanks[p];
      const color0 = p === 0 ? coral : forest;
      if (p === me) {
        drawTank(ctx, scale, { x: tank.x, y: tank.y, angle: tank.aim, known: false }, color0, true);
      } else {
        drawTank(ctx, scale, { x: tank.x, y: tank.y, angle: tank.lastAim, known: true }, color0, false);
      }
    }
    for (let p = 0; p < 2; p++) {
      const tank = view.tanks[p];
      const w = 10 * scale;
      const h = 2.1 * scale;
      const x = tank.x * scale - w / 2;
      const y = (tank.y - 8.6) * scale;
      ctx.fillStyle = 'rgba(42,38,35,.12)';
      roundRect(ctx, x, y, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = p === 0 ? coral : forest;
      roundRect(ctx, x, y, Math.max(0, (w * tank.hp) / 100), h, h / 2);
      ctx.fill();
    }
    if (view.status === 'live' && own.fireIn > 0) {
      ctx.fillStyle = mustard;
      ctx.beginPath();
      ctx.arc((W - 7) * scale, 7 * scale, 2.6 * scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - own.fireIn / 700));
      ctx.fill();
    }
  }

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => fit()) : null;
  if (observer) observer.observe(stage);
  else window.addEventListener('resize', fit);

  return {
    update(next) {
      view = next;
      hp0.textContent = ` ${next.tanks[0].hp}`;
      hp1.textContent = ` ${next.tanks[1].hp}`;
      const left = Math.ceil(next.matchLeft / 1000);
      clock.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      note.textContent = next.status === 'done' ? next.message : next.message || '方向键移动，Q / E 转动炮口，空格开火。';
      const own = next.tanks[api.me];
      status.textContent =
        next.status !== 'live'
          ? next.message
          : own.fireIn > 0
            ? `炮口冷却 ${(own.fireIn / 1000).toFixed(1)} 秒`
            : '炮口已就绪，可开火';
      for (const button of buttons) button.disabled = next.status !== 'live';
      aimLeft.disabled = next.status !== 'live';
      aimRight.disabled = next.status !== 'live';
      fire.disabled = next.status !== 'live';
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