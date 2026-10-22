export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-mines{display:flex;flex-direction:column;gap:12px;align-items:center;width:100%}
.tws-mines-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;width:min(100%,min(70vh,460px));aspect-ratio:1;padding:8px;background:#EFE6CF;border:1.5px solid var(--tw-ink);border-radius:14px;box-shadow:var(--tw-shadow)}
.tws-mines-cell{position:relative;appearance:none;border:1px solid rgba(42,38,35,.16);border-radius:6px;background:var(--tw-card);padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center}
.tws-mines-cell:disabled{cursor:default}
.tws-mines-cell[data-state="hidden"]::after{content:'';width:22%;height:22%;border-radius:50%;background:var(--tw-line)}
.tws-mines-cell[data-state="safe"]{background:#DDEBE2}
.tws-mines-cell[data-owner="0"]{background:rgba(217,98,76,.28)}
.tws-mines-cell[data-owner="1"]{background:rgba(47,107,91,.26)}
.tws-mines-cell[data-state="mine"]{background:rgba(217,98,76,.18)}
.tws-mines-cell[data-state="mine"]::after{content:'✹';color:var(--tw-coral);font-size:16px;line-height:1}
.tws-mines-cell[data-last="1"]{outline:2px solid var(--tw-mustard);outline-offset:-2px}
.tws-mines-cell[data-frozen="1"]{opacity:.55}
.tws-mines-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center}
.tws-mines-score{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:0 12px;border:1.5px solid var(--tw-line);border-radius:999px;background:var(--tw-card);font-size:13px}
.tws-mines-score[data-seat="0"]{color:var(--tw-coral);border-color:rgba(217,98,76,.4)}
.tws-mines-score[data-seat="1"]{color:var(--tw-forest);border-color:rgba(47,107,91,.4)}
.tws-mines-note{margin:0;font-size:13px;color:var(--tw-muted);text-align:center}
.tws-mines-freeze{margin:0;font-size:13px;color:var(--tw-coral);font-weight:600}
`;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.className = 'tws-mines';
  const bar = document.createElement('div');
  bar.className = 'tws-mines-bar';
  const scoreA = document.createElement('span');
  scoreA.className = 'tws-mines-score';
  scoreA.dataset.seat = '0';
  const scoreB = document.createElement('span');
  scoreB.className = 'tws-mines-score';
  scoreB.dataset.seat = '1';
  const grid = document.createElement('div');
  grid.className = 'tws-mines-grid';
  const freeze = document.createElement('p');
  freeze.className = 'tws-mines-freeze';
  const note = document.createElement('p');
  note.className = 'tws-mines-note';
  bar.append(scoreA, scoreB);
  const cells = [];
  for (let i = 0; i < 49; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'tws-mines-cell';
    cell.setAttribute('aria-label', `第 ${Math.floor(i / 7) + 1} 行第 ${(i % 7) + 1} 列`);
    cell.addEventListener('click', () => api.send({ type: 'dig', index: i }));
    grid.appendChild(cell);
    cells.push(cell);
  }
  wrap.append(bar, grid, freeze, note);
  root.appendChild(wrap);
  return {
    update(view) {
      const frozen = view.myFreezeLeft > 0;
      for (let i = 0; i < 49; i++) {
        const cell = cells[i];
        const data = view.cells[i];
        cell.dataset.state = data.state;
        cell.dataset.owner = data.owner == null ? '' : String(data.owner);
        cell.dataset.last = view.lastOpen[view.you] === i || view.lastOpen[1 - view.you] === i ? '1' : '0';
        cell.dataset.frozen = frozen ? '1' : '0';
        cell.disabled = data.state !== 'hidden' || view.status !== 'live' || frozen;
      }
      scoreA.textContent = `珊瑚 ${view.scores[0]}`;
      scoreB.textContent = `森林 ${view.scores[1]}`;
      freeze.textContent = frozen ? `冻结中，${Math.ceil(view.myFreezeLeft / 100) / 10} 秒后可以继续翻。` : '';
      note.textContent = view.status === 'done'
        ? view.message
        : `已翻开 ${view.opened} / ${view.total} 格 · 安全格多者获胜`;
    },
    unmount() {
      root.replaceChildren();
      style.remove();
    },
  };
}