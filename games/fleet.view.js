export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-fleet{display:flex;flex-direction:column;gap:12px;align-items:center;width:100%}
.tws-fleet-boards{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;width:100%}
.tws-fleet-side{display:flex;flex-direction:column;gap:8px;align-items:center;flex:1 1 240px;min-width:0}
.tws-fleet-title{margin:0;font-size:12px;letter-spacing:.14em;color:var(--tw-muted);text-transform:uppercase}
.tws-fleet-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;width:min(100%,300px);aspect-ratio:1;padding:6px;background:#EFE3CB;border:1.5px solid var(--tw-ink);border-radius:12px;box-shadow:var(--tw-shadow)}
.tws-fleet-cell{position:relative;appearance:none;border:1px solid rgba(42,38,35,.12);border-radius:5px;background:var(--tw-card);padding:0;cursor:pointer;min-height:0}
.tws-fleet-cell:disabled{cursor:default}
.tws-fleet-cell[data-ship="1"]{background:#BFD8CC}
.tws-fleet-cell[data-shot="0"]::after{content:'';position:absolute;inset:32%;border-radius:50%;background:var(--tw-line)}
.tws-fleet-cell[data-shot="1"]::after{content:'✕';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--tw-coral);font-size:14px;font-weight:700}
.tws-fleet-cell[data-hit="1"]{background:var(--tw-coral)}
.tws-fleet-cell[data-hit="1"]::after{color:#fff}
.tws-fleet-cell[data-aim="1"]{outline:2px solid var(--tw-forest);outline-offset:-2px}
.tws-fleet-cell[data-last="1"]{outline:2px solid var(--tw-mustard);outline-offset:-2px}
.tws-fleet-note{margin:0;font-size:13px;color:var(--tw-muted);text-align:center}
.tws-fleet-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center}
.tws-fleet-chip{display:inline-flex;align-items:center;gap:5px;min-height:32px;padding:0 10px;border:1.5px solid var(--tw-line);border-radius:999px;background:var(--tw-card);font-size:12px;color:var(--tw-muted)}
`;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.className = 'tws-fleet';
  wrap.innerHTML = `
    <p class="tws-fleet-note" data-note></p>
    <div class="tws-fleet-row" data-tools>
      <span class="tws-fleet-chip" data-own>我方舰船</span>
      <span class="tws-fleet-chip" data-enemy>敌方舰船</span>
      <button type="button" class="pc-btn small" data-flip>横放 / 竖放</button>
    </div>
    <div class="tws-fleet-boards">
      <div class="tws-fleet-side">
        <p class="tws-fleet-title">我的海域</p>
        <div class="tws-fleet-grid" data-my></div>
      </div>
      <div class="tws-fleet-side">
        <p class="tws-fleet-title">敌方海域</p>
        <div class="tws-fleet-grid" data-enemy-grid></div>
      </div>
    </div>`;
  root.appendChild(wrap);
  const note = wrap.querySelector('[data-note]');
  const tools = wrap.querySelector('[data-tools]');
  const ownChip = wrap.querySelector('[data-own]');
  const enemyChip = wrap.querySelector('[data-enemy]');
  const flip = wrap.querySelector('[data-flip]');
  const myGrid = wrap.querySelector('[data-my]');
  const enemyGrid = wrap.querySelector('[data-enemy-grid]');
  const myCells = [];
  const enemyCells = [];
  let vertical = false;
  let snapshot = null;
  flip.addEventListener('click', () => {
    vertical = !vertical;
    flip.textContent = vertical ? '竖放中 · 点击切换' : '横放中 · 点击切换';
  });
  for (let i = 0; i < 49; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'tws-fleet-cell';
    cell.dataset.index = String(i);
    cell.addEventListener('click', () => {
      if (!snapshot) return;
      if (snapshot.phase === 'place') api.send({ type: 'place', index: i, vertical });
      else api.send({ type: 'fire', index: i });
    });
    myGrid.appendChild(cell);
    myCells.push(cell);
    const target = document.createElement('button');
    target.type = 'button';
    target.className = 'tws-fleet-cell';
    target.dataset.index = String(i);
    target.addEventListener('click', () => {
      if (!snapshot) return;
      if (snapshot.phase === 'place') return;
      api.send({ type: 'fire', index: i });
    });
    enemyGrid.appendChild(target);
    enemyCells.push(target);
  }
  return {
    update(view) {
      snapshot = view;
      const placing = view.phase === 'place';
      const mine = view.you;
      const turn = view.turn === mine;
      tools.style.display = placing && turn ? '' : 'none';
      if (placing) {
        note.textContent = turn
          ? `布阵：放第 ${Math.min(view.placed[mine] + 1, 3)} 艘船（长度 ${view.ships[Math.min(view.placed[mine], 2)]}），点击格子放置。`
          : '等对手布阵……';
      } else {
        note.textContent = view.status === 'done'
          ? view.message
          : turn ? '轮到你了：点敌方海域开炮，命中也继续。' : '等对方开炮……';
      }
      for (let i = 0; i < 49; i++) {
        const ship = view.myBoard[i];
        const incomingShot = view.incoming[i];
        const cell = myCells[i];
        cell.dataset.ship = ship >= 0 ? '1' : '0';
        cell.dataset.shot = incomingShot === -1 ? '' : String(incomingShot);
        cell.dataset.last = view.enemyLastShot === i ? '1' : '0';
        cell.disabled = true;
        const out = view.outgoing[i];
        const enemy = enemyCells[i];
        enemy.dataset.shot = out === -1 ? '' : String(out);
        enemy.dataset.hit = out === 1 ? '1' : '0';
        enemy.dataset.last = view.lastShot === i ? '1' : '0';
        if (view.status !== 'live' || placing || !turn) {
          enemy.disabled = true;
        } else {
          enemy.disabled = out !== -1;
          enemy.dataset.aim = out === -1 ? '1' : '0';
        }
        if (view.enemyShips && view.enemyShips[i] >= 0) enemy.dataset.ship = '1';
      }
      ownChip.textContent = `我方 ${view.fleets.length} 艘 · 被击沉 ${view.myLosses}`;
      enemyChip.textContent = `敌方 3 艘 · 已击沉 ${view.enemySunk}`;
    },
    unmount() {
      root.replaceChildren();
      style.remove();
    },
  };
}