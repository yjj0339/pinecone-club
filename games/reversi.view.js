export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-reversi{display:flex;flex-direction:column;gap:12px;align-items:center;width:100%}
.tws-reversi-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;width:min(100%,min(70vh,460px));aspect-ratio:1;padding:8px;background:var(--tw-forest);border:1.5px solid var(--tw-ink);border-radius:14px;box-shadow:var(--tw-shadow)}
.tws-reversi-cell{position:relative;appearance:none;border:1px solid rgba(42,38,35,.28);border-radius:6px;background:rgba(255,253,248,.14);padding:0;cursor:pointer}
.tws-reversi-cell:disabled{cursor:default}
.tws-reversi-cell[data-stone="0"]::after,.tws-reversi-cell[data-stone="1"]::after{content:'';position:absolute;inset:12%;border-radius:50%;box-shadow:inset -2px -3px 0 rgba(0,0,0,.16)}
.tws-reversi-cell[data-stone="0"]::after{background:var(--tw-coral)}
.tws-reversi-cell[data-stone="1"]::after{background:var(--tw-ink)}
.tws-reversi-cell[data-legal="1"]::before{content:'';position:absolute;inset:36%;border-radius:50%;background:var(--tw-mustard);opacity:.85}
.tws-reversi-cell[data-last="1"]{outline:2px solid var(--tw-mustard);outline-offset:-2px}
.tws-reversi-cell[data-flip="1"]::after{outline:2px solid var(--tw-mustard);outline-offset:1px}
.tws-reversi-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center}
.tws-reversi-score{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:0 12px;border:1.5px solid var(--tw-line);border-radius:999px;background:var(--tw-card);font-size:13px}
.tws-reversi-score[data-seat="0"]{color:var(--tw-coral);border-color:rgba(217,98,76,.4)}
.tws-reversi-score[data-seat="1"]{color:var(--tw-ink)}
.tws-reversi-note{margin:0;font-size:13px;color:var(--tw-muted);text-align:center}
`;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.className = 'tws-reversi';
  const bar = document.createElement('div');
  bar.className = 'tws-reversi-bar';
  const scoreA = document.createElement('span');
  scoreA.className = 'tws-reversi-score';
  scoreA.dataset.seat = '0';
  const scoreB = document.createElement('span');
  scoreB.className = 'tws-reversi-score';
  scoreB.dataset.seat = '1';
  bar.append(scoreA, scoreB);
  const grid = document.createElement('div');
  grid.className = 'tws-reversi-grid';
  const note = document.createElement('p');
  note.className = 'tws-reversi-note';
  const cells = [];
  for (let i = 0; i < 36; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'tws-reversi-cell';
    cell.setAttribute('aria-label', `第 ${Math.floor(i / 6) + 1} 行第 ${(i % 6) + 1} 列`);
    cell.addEventListener('click', () => api.send({ type: 'place', index: i }));
    grid.appendChild(cell);
    cells.push(cell);
  }
  wrap.append(bar, grid, note);
  root.appendChild(wrap);
  return {
    update(view) {
      const legal = new Set(view.legal);
      const flipped = new Set(view.flipped);
      for (let i = 0; i < 36; i++) {
        const cell = cells[i];
        const stone = view.board[i];
        cell.dataset.stone = stone === -1 ? '' : String(stone);
        cell.dataset.legal = legal.has(i) ? '1' : '0';
        cell.dataset.last = view.lastMove === i ? '1' : '0';
        cell.dataset.flip = flipped.has(i) ? '1' : '0';
        cell.disabled = stone !== -1 || view.status !== 'live' || !legal.has(i);
      }
      scoreA.textContent = `珊瑚 ${view.scores[0]}`;
      scoreB.textContent = `墨黑 ${view.scores[1]}`;
      note.textContent = view.status === 'done'
        ? view.message
        : `${view.turn === view.you ? '轮到你了' : '等对方落子'} · 高亮处可以翻面`;
    },
    unmount() {
      root.replaceChildren();
      style.remove();
    },
  };
}