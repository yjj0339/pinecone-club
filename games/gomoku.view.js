export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-gomoku{display:flex;flex-direction:column;gap:12px;align-items:center;width:100%}
.tws-gomoku-grid{display:grid;grid-template-columns:repeat(15,1fr);width:min(100%,min(72vh,560px));aspect-ratio:1;background:#F3E6CE;border:1.5px solid var(--tw-ink);border-radius:14px;overflow:hidden;box-shadow:0 2px 0 rgba(42,38,35,.12)}
.tws-gomoku-cell{position:relative;appearance:none;border:0;padding:0;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center}
.tws-gomoku-cell::before{content:'';position:absolute;inset:0;background:linear-gradient(var(--tw-line),var(--tw-line)) center/100% 1px no-repeat,linear-gradient(var(--tw-line),var(--tw-line)) center/1px 100% no-repeat;opacity:.9}
.tws-gomoku-cell:disabled{cursor:default}
.tws-gomoku-cell[data-stone="p0"]::after{content:'';position:absolute;inset:12%;border-radius:50%;background:var(--tw-ink);box-shadow:inset -3px -4px 0 rgba(255,255,255,.18)}
.tws-gomoku-cell[data-stone="p1"]::after{content:'';position:absolute;inset:12%;border-radius:50%;background:var(--tw-coral);box-shadow:inset -3px -4px 0 rgba(255,255,255,.28)}
.tws-gomoku-cell.tws-last::after{outline:2px solid var(--tw-mustard);outline-offset:1px}
.tws-gomoku-cell.tws-win::after{outline:3px solid var(--tw-forest);outline-offset:2px}
.tws-gomoku-note{margin:0;font-size:13px;color:var(--tw-muted);text-align:center}
`;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.className = 'tws-gomoku';
  const grid = document.createElement('div');
  grid.className = 'tws-gomoku-grid';
  grid.setAttribute('role', 'grid');
  const cells = [];
  for (let i = 0; i < 225; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'tws-gomoku-cell';
    cell.setAttribute('aria-label', `第 ${Math.floor(i / 15) + 1} 行第 ${(i % 15) + 1} 列`);
    cell.addEventListener('click', () => api.send({ type: 'place', index: i }));
    grid.appendChild(cell);
    cells.push(cell);
  }
  const note = document.createElement('p');
  note.className = 'tws-gomoku-note';
  wrap.append(grid, note);
  root.appendChild(wrap);
  return {
    update(view) {
      for (let i = 0; i < 225; i++) {
        const cell = cells[i];
        const stone = view.board[i];
        cell.dataset.stone = stone === -1 ? '' : `p${stone}`;
        cell.disabled = view.status !== 'live' || stone !== -1;
        cell.classList.toggle('tws-last', view.lastMove === i);
        cell.classList.toggle('tws-win', view.winningLine.includes(i));
      }
      note.textContent = view.status === 'done' ? view.message : `轮到 ${api.names[view.turn]} · 剩余 ${Math.ceil(view.turnLeft / 1000)} 秒`;
    },
    unmount() {
      root.replaceChildren();
      style.remove();
    },
  };
}