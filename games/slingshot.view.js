export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-slingshot{--tws-me:var(--tw-coral,#D9624C);--tws-opp:var(--tw-forest,#2F6B5B);display:flex;flex-direction:column;gap:10px;width:100%;max-width:620px;min-width:0;box-sizing:border-box;padding:14px;background:var(--tw-paper,#FBF3E6);border:1.5px solid var(--tw-ink,#2A2623);border-radius:18px;box-shadow:0 2px 0 rgba(42,38,35,.10);color:var(--tw-ink,#2A2623);font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif}
.tws-slingshot *{box-sizing:border-box}
.tws-slingshot-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}
.tws-slingshot-name{font-family:ui-serif,"Songti SC","STSong",serif;font-size:20px;font-weight:700;letter-spacing:.06em}
.tws-slingshot-meta{display:flex;gap:10px;font-size:12px;color:var(--tw-muted,#7C7268);font-variant-numeric:tabular-nums}
.tws-slingshot-hud{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px}
.tws-slingshot-side{display:flex;flex-direction:column;gap:4px;padding:7px 9px;border:1.5px solid var(--tw-line,#E4D7C3);border-radius:12px;background:var(--tw-card,#FFFDF8);min-width:0}
.tws-slingshot-side.tws-me{border-color:var(--tws-me)}
.tws-slingshot-side.tws-opp{border-color:var(--tws-opp)}
.tws-slingshot-sidehead{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;color:var(--tw-muted,#7C7268);min-width:0}
.tws-slingshot-sidehead b{font-weight:600;color:var(--tw-ink,#2A2623);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tws-slingshot-sidehead span{font-variant-numeric:tabular-nums;color:var(--tw-ink,#2A2623);font-weight:700}
.tws-slingshot-hpbar{height:7px;background:var(--tw-line,#E4D7C3);border-radius:99px;overflow:hidden}
.tws-slingshot-hpbar i{display:block;height:100%;width:100%;border-radius:99px;background:var(--tws-me);transition:width .2s linear}
.tws-slingshot-side.tws-opp .tws-slingshot-hpbar i{background:var(--tws-opp)}
.tws-slingshot-wind{display:flex;flex-direction:column;align-items:center;gap:0;padding:4px 8px;border:1.5px dashed var(--tw-line,#E4D7C3);border-radius:12px;background:var(--tw-card,#FFFDF8);min-width:56px}
.tws-slingshot-wind b{font-family:ui-serif,"Songti SC","STSong",serif;font-size:15px;line-height:1.1;font-variant-numeric:tabular-nums}
.tws-slingshot-wind small{font-size:10px;color:var(--tw-muted,#7C7268);letter-spacing:.1em}
.tws-slingshot-windarrow{font-size:15px;line-height:1}
.tws-slingshot-field{display:block;width:100%;aspect-ratio:100/48;border:1.5px solid var(--tw-ink,#2A2623);border-radius:14px;background:var(--tw-paper,#FBF3E6);box-shadow:0 3px 0 rgba(42,38,35,.09);touch-action:manipulation}
.tws-slingshot-banner{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:42px;padding:7px 10px;border:1.5px dashed var(--tw-line,#E4D7C3);border-radius:12px;font-size:12px;line-height:1.5;color:var(--tw-muted,#7C7268);overflow-wrap:anywhere}
.tws-slingshot-banner b{font-weight:600;color:var(--tw-ink,#2A2623)}
.tws-slingshot-banner.tws-hit{border-style:solid;border-color:var(--tw-mustard,#E8A93C)}
.tws-slingshot-result{flex:none;padding:3px 8px;border-radius:99px;background:var(--tw-line,#E4D7C3);color:var(--tw-ink,#2A2623);font-size:11px;font-weight:600;white-space:nowrap}
.tws-slingshot-result.tws-hit{background:var(--tw-mustard,#E8A93C)}
.tws-slingshot-controls{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tws-slingshot-slider{display:flex;flex-direction:column;gap:2px;padding:6px 10px;border:1.5px solid var(--tw-ink,#2A2623);border-radius:12px;background:var(--tw-card,#FFFDF8);box-shadow:0 2px 0 rgba(42,38,35,.08);font-size:11px;color:var(--tw-muted,#7C7268);min-width:0}
.tws-slingshot-slider span{display:flex;align-items:center;justify-content:space-between;gap:6px}
.tws-slingshot-slider output{font-weight:700;color:var(--tw-ink,#2A2623);font-variant-numeric:tabular-nums}
.tws-slingshot-slider input{width:100%;min-height:44px;margin:0;accent-color:var(--tws-me);cursor:pointer}
.tws-slingshot-slider:disabled,.tws-slingshot-slider input:disabled{cursor:default}
.tws-slingshot-slider:has(input:disabled){opacity:.6}
.tws-slingshot-fire{grid-column:1/-1;appearance:none;min-height:52px;padding:10px;border:1.5px solid var(--tw-ink,#2A2623);border-radius:14px;background:var(--tws-me);color:var(--tw-card,#FFFDF8);font:inherit;font-size:16px;font-weight:700;letter-spacing:.16em;cursor:pointer;box-shadow:0 4px 0 rgba(42,38,35,.16);transition:transform .1s ease,box-shadow .1s ease}
.tws-slingshot-fire:active:not(:disabled){transform:translateY(3px);box-shadow:0 1px 0 rgba(42,38,35,.16)}
.tws-slingshot-fire:focus-visible{outline:2px solid var(--tw-mustard,#E8A93C);outline-offset:3px}
.tws-slingshot-fire:disabled{opacity:.55;cursor:default}
.tws-slingshot-hint{margin:0;font-size:11px;line-height:1.6;color:var(--tw-muted,#7C7268);text-align:center}
@media (prefers-reduced-motion:reduce){.tws-slingshot *,.tws-slingshot *::before,.tws-slingshot *::after{animation:none!important;transition:none!important}}
`;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'tws-slingshot';
  wrap.innerHTML = `
    <div class="tws-slingshot-head">
      <div class="tws-slingshot-name">弹弓攻城</div>
      <div class="tws-slingshot-meta"><span class="tws-slingshot-round">你的回合</span><span class="tws-slingshot-clock">00:00</span></div>
    </div>
    <div class="tws-slingshot-hud">
      <div class="tws-slingshot-side tws-me">
        <div class="tws-slingshot-sidehead"><b class="tws-slingshot-me-name">你</b><span class="tws-slingshot-me-hp">100</span></div>
        <div class="tws-slingshot-hpbar"><i></i></div>
      </div>
      <div class="tws-slingshot-wind"><span class="tws-slingshot-windarrow">→</span><b class="tws-slingshot-windval">0.0</b><small>风</small></div>
      <div class="tws-slingshot-side tws-opp">
        <div class="tws-slingshot-sidehead"><b class="tws-slingshot-opp-name">对手</b><span class="tws-slingshot-opp-hp">100</span></div>
        <div class="tws-slingshot-hpbar"><i></i></div>
      </div>
    </div>
    <canvas class="tws-slingshot-field"></canvas>
    <div class="tws-slingshot-banner"><span class="tws-slingshot-message">调整角度与力度，摧毁对方城墙。</span><span class="tws-slingshot-result">准备</span></div>
    <div class="tws-slingshot-controls">
      <label class="tws-slingshot-slider"><span>角度 <output class="tws-slingshot-angleval">35°</output></span><input class="tws-slingshot-angle" type="range" min="10" max="60" step="1" value="35"></label>
      <label class="tws-slingshot-slider"><span>力度 <output class="tws-slingshot-powerval">95</output></span><input class="tws-slingshot-power" type="range" min="20" max="100" step="1" value="95"></label>
      <button class="tws-slingshot-fire" type="button">发射</button>
    </div>
    <p class="tws-slingshot-hint">拖动滑杆或按方向键调整，空格发射。风会把弹道吹偏，城墙先被摧毁的一方落败。</p>
  `;
  root.appendChild(wrap);

  const el = {
    round: wrap.querySelector('.tws-slingshot-round'),
    clock: wrap.querySelector('.tws-slingshot-clock'),
    meName: wrap.querySelector('.tws-slingshot-me-name'),
    oppName: wrap.querySelector('.tws-slingshot-opp-name'),
    meHp: wrap.querySelector('.tws-slingshot-me-hp'),
    oppHp: wrap.querySelector('.tws-slingshot-opp-hp'),
    meBar: wrap.querySelector('.tws-me .tws-slingshot-hpbar i'),
    oppBar: wrap.querySelector('.tws-opp .tws-slingshot-hpbar i'),
    windArrow: wrap.querySelector('.tws-slingshot-windarrow'),
    windVal: wrap.querySelector('.tws-slingshot-windval'),
    canvas: wrap.querySelector('.tws-slingshot-field'),
    banner: wrap.querySelector('.tws-slingshot-banner'),
    message: wrap.querySelector('.tws-slingshot-message'),
    result: wrap.querySelector('.tws-slingshot-result'),
    angle: wrap.querySelector('.tws-slingshot-angle'),
    power: wrap.querySelector('.tws-slingshot-power'),
    angleVal: wrap.querySelector('.tws-slingshot-angleval'),
    powerVal: wrap.querySelector('.tws-slingshot-powerval'),
    fire: wrap.querySelector('.tws-slingshot-fire'),
    hint: wrap.querySelector('.tws-slingshot-hint'),
  };
  const ctx = el.canvas.getContext('2d');
  const other = 1 - api.me;
  const display = (seat) => (api.names && api.names[seat] ? api.names[seat] : seat === 0 ? '玩家一' : '玩家二');
  const CORAL = '#D9624C';
  const FOREST = '#2F6B5B';
  const INK = '#2A2623';
  const PAPER = '#FBF3E6';
  const CARD = '#FFFDF8';
  const LINE = '#E4D7C3';
  const MUSTARD = '#E8A93C';

  wrap.style.setProperty('--tws-me', 'var(--tw-coral, #D9624C)');
  wrap.style.setProperty('--tws-opp', 'var(--tw-forest, #2F6B5B)');
  if (api.me === 1) {
    wrap.style.setProperty('--tws-me', 'var(--tw-forest, #2F6B5B)');
    wrap.style.setProperty('--tws-opp', 'var(--tw-coral, #D9624C)');
  }
  el.meName.textContent = display(api.me);
  el.oppName.textContent = display(other);

  const WORLD = { left: -12, right: 112, bottom: -4, top: 50 };
  let current = null;
  let lastShotKey = '';
  let primed = false;
  let anim = null;
  let rafId = 0;
  const reduce = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function clockText(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function seatColor(seat) {
    return seat === 0 ? CORAL : FOREST;
  }

  function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = el.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || el.canvas.clientWidth || 320));
    const height = Math.max(1, Math.round(rect.height || (width * 44) / 100));
    if (el.canvas.width !== Math.round(width * dpr) || el.canvas.height !== Math.round(height * dpr)) {
      el.canvas.width = Math.round(width * dpr);
      el.canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function toX(x, width) {
    return ((x - WORLD.left) / (WORLD.right - WORLD.left)) * width;
  }

  function toY(y, height) {
    return height - ((y - WORLD.bottom) / (WORLD.top - WORLD.bottom)) * height;
  }

  function drawCastle(seat, hp, width, height) {
    const color = seatColor(seat);
    const inner = seat === 0 ? -10 : 100;
    const outer = seat === 0 ? 0 : 90;
    const leftPx = toX(Math.min(inner, outer), width);
    const rightPx = toX(Math.max(inner, outer), width);
    const baseY = toY(0, height);
    const topY = toY(18, height);
    const wallH = baseY - topY;
    const unit = (rightPx - leftPx) / 6;
    const merlon = Math.max(4, wallH * 0.22);
    ctx.beginPath();
    ctx.moveTo(leftPx, baseY);
    ctx.lineTo(leftPx, topY + merlon);
    ctx.lineTo(leftPx + unit * 0.9, topY + merlon);
    ctx.lineTo(leftPx + unit * 0.9, topY);
    ctx.lineTo(leftPx + unit * 2.1, topY);
    ctx.lineTo(leftPx + unit * 2.1, topY + merlon);
    ctx.lineTo(leftPx + unit * 3.9, topY + merlon);
    ctx.lineTo(leftPx + unit * 3.9, topY);
    ctx.lineTo(leftPx + unit * 5.1, topY);
    ctx.lineTo(leftPx + unit * 5.1, topY + merlon);
    ctx.lineTo(rightPx, topY + merlon);
    ctx.lineTo(rightPx, baseY);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(leftPx + unit * 0.9, topY, unit * 1.2, Math.max(2, merlon * 0.34));
    ctx.fillRect(leftPx + unit * 3.9, topY, unit * 1.2, Math.max(2, merlon * 0.34));
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = INK;
    const gateW = unit * 1.7;
    const gateH = Math.max(6, wallH * 0.42);
    const gateX = leftPx + (rightPx - leftPx) / 2 - gateW / 2;
    ctx.beginPath();
    ctx.moveTo(gateX, baseY);
    ctx.lineTo(gateX, baseY - gateH + gateW / 3);
    ctx.quadraticCurveTo(gateX, baseY - gateH, gateX + gateW / 2, baseY - gateH);
    ctx.quadraticCurveTo(gateX + gateW, baseY - gateH, gateX + gateW, baseY - gateH + gateW / 3);
    ctx.lineTo(gateX + gateW, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(42,38,35,.5)';
    ctx.lineWidth = 1.6;
    if (hp < 66) {
      ctx.beginPath();
      ctx.moveTo(leftPx + unit * 1.4, topY + merlon);
      ctx.lineTo(leftPx + unit * 1.9, baseY - wallH * 0.45);
      ctx.lineTo(leftPx + unit * 1.6, baseY);
      ctx.stroke();
    }
    if (hp < 33) {
      ctx.beginPath();
      ctx.moveTo(leftPx + unit * 4.1, topY + merlon);
      ctx.lineTo(leftPx + unit * 3.6, baseY - wallH * 0.5);
      ctx.lineTo(leftPx + unit * 4.3, baseY);
      ctx.stroke();
    }
  }

  function drawSling(seat, width, height) {
    const x = seat === 0 ? 0 : 100;
    const baseY = toY(0, height);
    const px = toX(x, width);
    const h = baseY - toY(7, height);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px - h * 0.3, baseY - h);
    ctx.lineTo(px, baseY - h * 0.32);
    ctx.lineTo(px + h * 0.3, baseY - h);
    ctx.stroke();
    ctx.strokeStyle = seatColor(seat);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(px - h * 0.32, baseY - h);
    ctx.lineTo(px, baseY - h * 0.38);
    ctx.lineTo(px + h * 0.32, baseY - h);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(px, baseY - h * 0.34, Math.max(2, h * 0.055), 0, Math.PI * 2);
    ctx.fill();
  }

  function draw(progress) {
    const { width, height } = setupCanvas();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = MUSTARD;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(toX(24, width), toY(42, height), Math.max(8, width * 0.035), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = 'rgba(42,38,35,.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const y = toY(28 + i * 5, height);
      ctx.moveTo(toX(-8 + i * 28, width), y);
      ctx.quadraticCurveTo(toX(2 + i * 26, width), y - 9, toX(12 + i * 26, width), y + 2);
      ctx.stroke();
    }
    const groundY = toY(0, height);
    ctx.fillStyle = '#F3E6CE';
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const y = groundY + ((height - groundY) / 4) * (i + 0.5);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    drawCastle(0, current ? current.hp[0] : 100, width, height);
    drawCastle(1, current ? current.hp[1] : 100, width, height);
    drawSling(0, width, height);
    drawSling(1, width, height);
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.55;
    ctx.font = `600 ${Math.max(9, Math.min(12, width * 0.028))}px ui-serif, "Songti SC", serif`;
    ctx.textAlign = 'left';
    ctx.fillText(api.me === 0 ? '我方' : '对方', toX(-10, width) + 4, height - 8);
    ctx.textAlign = 'right';
    ctx.fillText(api.me === 1 ? '我方' : '对方', toX(110, width) - 4, height - 8);
    ctx.globalAlpha = 1;
    const shot = current && current.lastShot;
    if (shot) {
      const points = shot.path;
      const globalX = (s) => (shot.by === 0 ? s : 100 - s);
      if (points.length > 1) {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(42,38,35,.4)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        const limit = progress == null ? points.length - 1 : Math.max(1, Math.floor(progress * (points.length - 1)));
        for (let i = 0; i <= limit; i++) {
          const px = toX(globalX(points[i][0]), width);
          const py = toY(points[i][1], height);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }
      const last = points[points.length - 1];
      const ix = toX(globalX(last[0]), width);
      const iy = toY(last[1], height);
      if (shot.hit) {
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI / 4) * i;
          ctx.beginPath();
          ctx.moveTo(ix + Math.cos(angle) * 3, iy + Math.sin(angle) * 3);
          ctx.lineTo(ix + Math.cos(angle) * 9, iy + Math.sin(angle) * 9);
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = 'rgba(42,38,35,.55)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(ix - 4, iy - 4);
        ctx.lineTo(ix + 4, iy + 4);
        ctx.moveTo(ix + 4, iy - 4);
        ctx.lineTo(ix - 4, iy + 4);
        ctx.stroke();
      }
      if (progress != null && progress < 1) {
        const idx = progress * (points.length - 1);
        const base = Math.min(points.length - 2, Math.floor(idx));
        const f = idx - base;
        const sx = points[base][0] + (points[base + 1][0] - points[base][0]) * f;
        const sy = points[base][1] + (points[base + 1][1] - points[base][1]) * f;
        const px = toX(globalX(sx), width);
        const py = toY(sy, height);
        ctx.beginPath();
        ctx.fillStyle = seatColor(shot.by);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.8;
        ctx.arc(px, py, Math.max(4, width * 0.012), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (current && current.status === 'live' && current.youTurn) {
      const angle = (Number(el.angle.value) * Math.PI) / 180;
      const dir = api.me === 0 ? 1 : -1;
      const startX = api.me === 0 ? 0 : 100;
      const len = 12 + (Number(el.power.value) / 100) * 10;
      const x1 = startX + dir * Math.cos(angle) * len;
      const y1 = 2 + Math.sin(angle) * len;
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = seatColor(api.me);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toX(startX, width), toY(2, height));
      ctx.lineTo(toX(x1, width), toY(Math.min(y1, 36), height));
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = seatColor(api.me);
      ctx.beginPath();
      ctx.arc(toX(startX, width), toY(2, height), Math.max(4, width * 0.011), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function animateShot(shot) {
    if (anim) cancelAnimationFrame(anim.raf);
    anim = { raf: 0, start: 0 };
    if (reduce()) {
      anim = null;
      draw();
      return;
    }
    anim.start = performance.now();
    const tick = () => {
      if (!anim) return;
      const t = Math.min(1, (performance.now() - anim.start) / 720);
      draw(t);
      if (t < 1) anim.raf = requestAnimationFrame(tick);
      else {
        anim = null;
        draw();
      }
    };
    anim.raf = requestAnimationFrame(tick);
  }

  function update(view) {
    current = view;
    const done = view.status === 'done';
    el.round.textContent = done ? '比赛结束' : view.youTurn ? '你的回合' : '对方回合';
    el.clock.textContent = clockText(view.matchLeft);
    el.meHp.textContent = view.hp[api.me];
    el.oppHp.textContent = view.hp[other];
    el.meBar.style.width = `${Math.max(0, view.hp[api.me])}%`;
    el.oppBar.style.width = `${Math.max(0, view.hp[other])}%`;
    const wind = view.wind;
    el.windArrow.textContent = wind > 0.05 ? '→' : wind < -0.05 ? '←' : '·';
    el.windVal.textContent = Math.abs(wind).toFixed(1);
    el.message.textContent = view.message || '调整角度与力度，摧毁对方城墙。';
    el.banner.classList.toggle('tws-hit', !!view.lastShot && view.lastShot.hit);
    if (done) {
      el.result.textContent = view.winner === api.me ? '你赢了' : view.winner === -1 ? '平局' : '你输了';
      el.result.classList.toggle('tws-hit', view.winner === api.me);
      el.hint.textContent = view.message || '比赛结束。';
    } else {
      const shot = view.lastShot;
      el.result.textContent = shot ? (shot.hit ? `命中 ×${shot.damage}` : shot.over ? '越过城墙' : '未命中') : '准备';
      el.result.classList.toggle('tws-hit', !!shot && shot.hit);
      el.hint.textContent = view.youTurn ? '拖动滑杆或按方向键调整，空格发射。' : '等待对方出手。';
    }
    const active = !done && view.youTurn;
    el.angle.disabled = !active;
    el.power.disabled = !active;
    el.fire.disabled = !active;
    el.angleVal.textContent = `${el.angle.value}°`;
    el.powerVal.textContent = el.power.value;
    const shot = view.lastShot;
    if (shot) {
      const key = `${shot.by}:${shot.angle}:${shot.power}:${shot.wind}:${shot.impact.s}:${shot.impact.y}`;
      if (!primed) {
        primed = true;
        lastShotKey = key;
      } else if (key !== lastShotKey) {
        lastShotKey = key;
        animateShot(shot);
      }
    }
    draw();
  }

  function fire() {
    if (!current || current.status !== 'live' || !current.youTurn) return;
    api.send({ type: 'fire', angle: Number(el.angle.value), power: Number(el.power.value) });
    if (api.sound) api.sound('tap');
  }

  function onAngle() {
    el.angleVal.textContent = `${el.angle.value}°`;
    if (current && current.status === 'live' && current.youTurn) draw();
  }

  function onPower() {
    el.powerVal.textContent = el.power.value;
    if (current && current.status === 'live' && current.youTurn) draw();
  }

  function onKey(event) {
    if (event.defaultPrevented || !current || current.status !== 'live' || !current.youTurn) return;
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.code === 'Space') {
      event.preventDefault();
      fire();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      el.angle.value = String(Math.max(10, Math.min(60, Number(el.angle.value) + delta)));
      onAngle();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const delta = event.key === 'ArrowUp' ? 5 : -5;
      el.power.value = String(Math.max(20, Math.min(100, Number(el.power.value) + delta)));
      onPower();
    }
  }

  function onResize() {
    draw();
  }

  el.angle.addEventListener('input', onAngle);
  el.power.addEventListener('input', onPower);
  el.fire.addEventListener('click', fire);
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  return {
    update,
    unmount() {
      if (anim) cancelAnimationFrame(anim.raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      el.angle.removeEventListener('input', onAngle);
      el.power.removeEventListener('input', onPower);
      el.fire.removeEventListener('click', fire);
      root.replaceChildren();
      style.remove();
    },
  };
}