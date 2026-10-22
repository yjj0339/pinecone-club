export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-maze{--tws-me:var(--tw-coral,#D9624C);--tws-opp:var(--tw-forest,#2F6B5B);display:flex;flex-direction:column;gap:10px;width:100%;max-width:620px;min-width:0;box-sizing:border-box;padding:14px;background:var(--tw-paper,#FBF3E6);border:1.5px solid var(--tw-ink,#2A2623);border-radius:18px;box-shadow:0 2px 0 rgba(42,38,35,.10);color:var(--tw-ink,#2A2623);font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif}
.tws-maze *{box-sizing:border-box}
.tws-maze-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}
.tws-maze-name{font-family:ui-serif,"Songti SC","STSong",serif;font-size:20px;font-weight:700;letter-spacing:.06em}
.tws-maze-clock{font-size:12px;color:var(--tw-muted,#7C7268);font-variant-numeric:tabular-nums}
.tws-maze-score{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px}
.tws-maze-side{display:flex;flex-direction:column;gap:4px;padding:6px 9px;border:1.5px solid var(--tw-line,#E4D7C3);border-radius:12px;background:var(--tw-card,#FFFDF8);min-width:0}
.tws-maze-side.tws-me{border-color:var(--tws-me)}
.tws-maze-side.tws-opp{border-color:var(--tws-opp)}
.tws-maze-sidehead{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;color:var(--tw-muted,#7C7268)}
.tws-maze-sidehead b{font-weight:600;color:var(--tw-ink,#2A2623);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tws-maze-sidehead span{font-weight:700;color:var(--tw-ink,#2A2623);font-variant-numeric:tabular-nums}
.tws-maze-pips{display:flex;gap:4px}
.tws-maze-pips i{flex:1;height:6px;border-radius:99px;background:var(--tw-line,#E4D7C3)}
.tws-me .tws-maze-pips i.tws-on{background:var(--tws-me)}
.tws-opp .tws-maze-pips i.tws-on{background:var(--tws-opp)}
.tws-maze-goal{font-size:10px;color:var(--tw-muted,#7C7268);text-align:center;line-height:1.4;letter-spacing:.08em;white-space:nowrap}
.tws-maze-field{display:block;width:100%;aspect-ratio:13/9;border:1.5px solid var(--tw-ink,#2A2623);border-radius:14px;background:var(--tw-paper,#FBF3E6);box-shadow:0 3px 0 rgba(42,38,35,.09);touch-action:manipulation}
.tws-maze-banner{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:42px;padding:7px 10px;border:1.5px dashed var(--tw-line,#E4D7C3);border-radius:12px;font-size:12px;line-height:1.5;color:var(--tw-muted,#7C7268);overflow-wrap:anywhere}
.tws-maze-banner b{font-weight:600;color:var(--tw-ink,#2A2623)}
.tws-maze-carry{flex:none;padding:3px 8px;border-radius:99px;background:var(--tw-line,#E4D7C3);font-size:11px;font-weight:600;color:var(--tw-ink,#2A2623);white-space:nowrap}
.tws-maze-carry.tws-me{background:var(--tws-me);color:var(--tw-card,#FFFDF8)}
.tws-maze-carry.tws-opp{background:var(--tws-opp);color:var(--tw-card,#FFFDF8)}
.tws-maze-pad{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;width:100%;max-width:280px;margin:0 auto}
.tws-maze-pad button{appearance:none;display:flex;align-items:center;justify-content:center;min-height:56px;min-width:44px;padding:4px;border:1.5px solid var(--tw-ink,#2A2623);border-radius:14px;background:var(--tw-card,#FFFDF8);box-shadow:0 3px 0 rgba(42,38,35,.12);color:var(--tw-ink,#2A2623);font:inherit;font-size:20px;line-height:1;cursor:pointer;touch-action:none;user-select:none;transition:transform .1s ease,box-shadow .1s ease}
.tws-maze-pad button:focus-visible{outline:2px solid var(--tw-mustard,#E8A93C);outline-offset:2px}
.tws-maze-pad button.tws-pressed{transform:translateY(3px);box-shadow:0 1px 0 rgba(42,38,35,.12);background:var(--tws-me);border-color:var(--tws-me);color:var(--tw-card,#FFFDF8)}
.tws-maze-pad button[data-dir="up"]{grid-column:2;grid-row:1}
.tws-maze-pad button[data-dir="left"]{grid-column:1;grid-row:2}
.tws-maze-pad button[data-dir="down"]{grid-column:2;grid-row:2}
.tws-maze-pad button[data-dir="right"]{grid-column:3;grid-row:2}
.tws-maze-hint{margin:0;font-size:11px;line-height:1.6;color:var(--tw-muted,#7C7268);text-align:center}
@media (prefers-reduced-motion:reduce){.tws-maze *,.tws-maze *::before,.tws-maze *::after{animation:none!important;transition:none!important}}
`;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'tws-maze';
  wrap.innerHTML = `
    <div class="tws-maze-head">
      <div class="tws-maze-name">迷宫夺旗</div>
      <div class="tws-maze-clock">00:00</div>
    </div>
    <div class="tws-maze-score">
      <div class="tws-maze-side tws-me">
        <div class="tws-maze-sidehead"><b class="tws-maze-me-name">你</b><span class="tws-maze-me-score">0</span></div>
        <div class="tws-maze-pips"></div>
      </div>
      <div class="tws-maze-goal">先夺<br>三旗</div>
      <div class="tws-maze-side tws-opp">
        <div class="tws-maze-sidehead"><b class="tws-maze-opp-name">对手</b><span class="tws-maze-opp-score">0</span></div>
        <div class="tws-maze-pips"></div>
      </div>
    </div>
    <canvas class="tws-maze-field"></canvas>
    <div class="tws-maze-banner"><span class="tws-maze-message">抢到中央旗帜，带回自己的基地。</span><span class="tws-maze-carry">旗帜在中央</span></div>
    <div class="tws-maze-pad">
      <button type="button" data-dir="up" aria-label="向上移动">▲</button>
      <button type="button" data-dir="left" aria-label="向左移动">◀</button>
      <button type="button" data-dir="down" aria-label="向下移动">▼</button>
      <button type="button" data-dir="right" aria-label="向右移动">▶</button>
    </div>
    <p class="tws-maze-hint">方向键或下方按键移动，碰墙会停住。带着旗走回自己颜色的基地即得分。</p>
  `;
  root.appendChild(wrap);

  const el = {
    clock: wrap.querySelector('.tws-maze-clock'),
    meName: wrap.querySelector('.tws-maze-me-name'),
    oppName: wrap.querySelector('.tws-maze-opp-name'),
    meScore: wrap.querySelector('.tws-maze-me-score'),
    oppScore: wrap.querySelector('.tws-maze-opp-score'),
    mePips: wrap.querySelector('.tws-me .tws-maze-pips'),
    oppPips: wrap.querySelector('.tws-opp .tws-maze-pips'),
    canvas: wrap.querySelector('.tws-maze-field'),
    banner: wrap.querySelector('.tws-maze-banner'),
    message: wrap.querySelector('.tws-maze-message'),
    carry: wrap.querySelector('.tws-maze-carry'),
    hint: wrap.querySelector('.tws-maze-hint'),
    buttons: [...wrap.querySelectorAll('[data-dir]')],
  };
  const ctx = el.canvas.getContext('2d');
  const other = 1 - api.me;
  const display = (seat) => (api.names && api.names[seat] ? api.names[seat] : seat === 0 ? '玩家一' : '玩家二');
  const CORAL = '#D9624C';
  const FOREST = '#2F6B5B';
  const INK = '#2A2623';
  const PAPER = '#FBF3E6';
  const CARD = '#FFFDF8';
  const MUSTARD = '#E8A93C';
  const KEY_DIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

  wrap.style.setProperty('--tws-me', 'var(--tw-coral, #D9624C)');
  wrap.style.setProperty('--tws-opp', 'var(--tw-forest, #2F6B5B)');
  if (api.me === 1) {
    wrap.style.setProperty('--tws-me', 'var(--tw-forest, #2F6B5B)');
    wrap.style.setProperty('--tws-opp', 'var(--tw-coral, #D9624C)');
  }
  el.meName.textContent = display(api.me);
  el.oppName.textContent = display(other);
  for (const box of [el.mePips, el.oppPips]) {
    for (let i = 0; i < 3; i++) box.appendChild(document.createElement('i'));
  }

  const pressed = new Set();
  let current = null;

  function clockText(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function seatColor(seat) {
    return seat === 0 ? CORAL : FOREST;
  }

  function sendDir(dir) {
    if (!current || current.status !== 'live') return;
    api.send({ type: 'dir', dir });
    if (api.sound) api.sound('tap');
  }

  function sendStop() {
    if (!current || current.status !== 'live') return;
    api.send({ type: 'stop' });
  }

  function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = el.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || el.canvas.clientWidth || 320));
    const height = Math.max(1, Math.round(rect.height || (width * 9) / 13));
    if (el.canvas.width !== Math.round(width * dpr) || el.canvas.height !== Math.round(height * dpr)) {
      el.canvas.width = Math.round(width * dpr);
      el.canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function drawFlag(px, py, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.4, size * 0.1);
    ctx.beginPath();
    ctx.moveTo(px, py + size * 0.5);
    ctx.lineTo(px, py - size * 0.9);
    ctx.stroke();
    ctx.fillStyle = MUSTARD;
    ctx.beginPath();
    ctx.moveTo(px, py - size * 0.9);
    ctx.lineTo(px + size * 0.75, py - size * 0.62);
    ctx.lineTo(px, py - size * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    const { width, height } = setupCanvas();
    if (!current) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, width, height);
    const cols = current.width;
    const rows = current.height;
    const cell = Math.min(width / cols, height / rows);
    const ox = (width - cell * cols) / 2;
    const oy = (height - cell * rows) / 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = ox + x * cell;
        const py = oy + y * cell;
        const wall = current.grid[y][x] === '#';
        if (wall) {
          ctx.fillStyle = INK;
          ctx.globalAlpha = 0.82;
          ctx.fillRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = (x + y) % 2 === 0 ? CARD : '#F8EEDD';
          ctx.fillRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
        }
      }
    }
    for (const seat of [0, 1]) {
      const [bx, by] = current.base[seat];
      const px = ox + bx * cell;
      const py = oy + by * cell;
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = seatColor(seat);
      ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = seatColor(seat);
      ctx.lineWidth = Math.max(1.5, cell * 0.08);
      ctx.strokeRect(px + 2, py + 2, cell - 4, cell - 4);
      ctx.restore();
    }
    if (current.flag.carrier === null) {
      const px = ox + current.flag.x * cell + cell * 0.5;
      const py = oy + current.flag.y * cell + cell * 0.5;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = MUSTARD;
      ctx.beginPath();
      ctx.arc(px, py, cell * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawFlag(px - cell * 0.18, py + cell * 0.12, cell * 0.52);
    }
    for (const seat of [0, 1]) {
      const [x, y] = current.pos[seat];
      const px = ox + x * cell + cell / 2;
      const py = oy + y * cell + cell / 2;
      const radius = Math.max(5, cell * 0.33);
      ctx.beginPath();
      ctx.fillStyle = seatColor(seat);
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.4, cell * 0.075);
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = CARD;
      ctx.globalAlpha = 0.9;
      ctx.arc(px - radius * 0.24, py - radius * 0.26, Math.max(1.4, radius * 0.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (current.flag.carrier === seat) drawFlag(px + radius * 0.25, py - radius * 1.5, cell * 0.5);
      if (seat === api.me) {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = seatColor(seat);
        ctx.lineWidth = Math.max(1.2, cell * 0.06);
        ctx.beginPath();
        ctx.arc(px, py, radius + cell * 0.16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    if (!current.grid) return;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ox, oy, cell * cols, cell * rows);
  }

  function renderPips(box, score) {
    [...box.children].forEach((pip, index) => pip.classList.toggle('tws-on', index < score));
  }

  function update(view) {
    current = view;
    const done = view.status === 'done';
    el.clock.textContent = clockText(view.matchLeft);
    el.meScore.textContent = `${view.scores[api.me]} / ${view.goal}`;
    el.oppScore.textContent = `${view.scores[other]} / ${view.goal}`;
    renderPips(el.mePips, view.scores[api.me]);
    renderPips(el.oppPips, view.scores[other]);
    el.message.textContent = view.message || '抢到中央旗帜，带回自己的基地。';
    if (view.flag.carrier === api.me) {
      el.carry.textContent = '你正带着旗';
      el.carry.className = 'tws-maze-carry tws-me';
    } else if (view.flag.carrier === other) {
      el.carry.textContent = '对手正带着旗';
      el.carry.className = 'tws-maze-carry tws-opp';
    } else {
      el.carry.textContent = '旗帜在中央';
      el.carry.className = 'tws-maze-carry';
    }
    if (done) {
      el.carry.textContent = view.winner === api.me ? '你赢了' : view.winner === -1 ? '平局' : '你输了';
      el.carry.className = view.winner === api.me ? 'tws-maze-carry tws-me' : view.winner === -1 ? 'tws-maze-carry' : 'tws-maze-carry tws-opp';
      el.hint.textContent = view.message || '比赛结束。';
    } else {
      el.hint.textContent = '方向键或下方按键移动，碰墙会停住。带着旗走回自己颜色的基地即得分。';
    }
    for (const button of el.buttons) button.classList.toggle('tws-pressed', !done && view.held === button.dataset.dir);
    draw();
  }

  function onPadDown(event) {
    event.preventDefault();
    const button = event.currentTarget;
    if (button.setPointerCapture) {
      try {
        button.setPointerCapture(event.pointerId);
      } catch (error) {
        void error;
      }
    }
    sendDir(button.dataset.dir);
  }

  function onPadUp(event) {
    const button = event.currentTarget;
    if (button.hasPointerCapture && button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    sendStop();
  }

  function onKeyDown(event) {
    const dir = Object.prototype.hasOwnProperty.call(KEY_DIR, event.key) ? KEY_DIR[event.key] : null;
    if (!dir || !current || current.status !== 'live') return;
    event.preventDefault();
    if (event.repeat) return;
    pressed.add(event.key);
    sendDir(dir);
  }

  function onKeyUp(event) {
    if (!Object.prototype.hasOwnProperty.call(KEY_DIR, event.key) || !current || current.status !== 'live') return;
    pressed.delete(event.key);
    if (pressed.size === 0) sendStop();
  }

  function onBlur() {
    if (pressed.size === 0) return;
    pressed.clear();
    sendStop();
  }

  function onResize() {
    draw();
  }

  for (const button of el.buttons) {
    button.addEventListener('pointerdown', onPadDown);
    button.addEventListener('pointerup', onPadUp);
    button.addEventListener('pointercancel', onPadUp);
    button.addEventListener('contextmenu', (event) => event.preventDefault());
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('resize', onResize);

  return {
    update,
    unmount() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      for (const button of el.buttons) {
        button.removeEventListener('pointerdown', onPadDown);
        button.removeEventListener('pointerup', onPadUp);
        button.removeEventListener('pointercancel', onPadUp);
      }
      root.replaceChildren();
      style.remove();
    },
  };
}