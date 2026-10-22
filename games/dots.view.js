export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-dots{display:flex;flex-direction:column;gap:12px;align-items:center;width:100%}
.tws-dots-board{display:grid;grid-template-columns:repeat(11,1fr);gap:2px;width:min(100%,min(70vh,520px));aspect-ratio:1;padding:8px;background:#F1E5CC;border:1.5px solid var(--tw-ink);border-radius:14px;box-shadow:var(--tw-shadow)}
.tws-dots-dot{background:radial-gradient(circle,var(--tw-ink) 0 32%,transparent 35%);border-radius:50%}
.tws-dots-edge{appearance:none;border:0;padding:0;background:transparent;border-radius:6px;position:relative;cursor:pointer}
.tws-dots-edge::before{content:'';position:absolute;inset:38%;border-radius:4px;background:#D8C7A8;transition:background .12s ease}
.tws-dots-edge:hover::before{background:var(--tw-mustard)}
.tws-dots-edge[data-owner="0"]::before{background:var(--tw-coral)}
.tws-dots-edge[data-owner="1"]::before{background:var(--tw-forest)}
.tws-dots-edge[data-last="1"]::before{box-shadow:0 0 0 2px var(--tw-mustard)}
.tws-dots-edge:disabled{cursor:default}
.tws-dots-box{border-radius:6px;background:rgba(255,253,248,.5);display:flex;align-items:center;justify-content:center}
.tws-dots-box[data-owner="0"]{background:rgba(217,98,76,.3)}
.tws-dots-box[data-owner="1"]{background:rgba(47,107,91,.28)}
.tws-dots-box::after{content:'';width:26%;height:26%;border-radius:50%;background:transparent}
.tws-dots-box[data-owner="0"]::after{background:var(--tw-coral)}
.tws-dots-box[data-owner="1"]::after{background:var(--tw-forest)}
.tws-dots-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center}
.tws-dots-score{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:0 12px;border:1.5px solid var(--tw-line);border-radius:999px;background:var(--tw-card);font-size:13px}
.tws-dots-score[data-seat="0"]{color:var(--tw-coral);border-color:rgba(217,98,76,.4)}
.tws-dots-score[data-seat="1"]{color:var(--tw-forest);border-color:rgba(47,107,91,.4)}
.tws-dots-note{margin:0;font-size:13px;color:var(--tw-muted);text-align:center}
`;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.className = 'tws-dots';
  const board = document.createElement('div');
  board.className = 'tws-dots-board';
  const bar = document.createElement('div');
  bar.className = 'tws-dots-bar';
  const scoreA = document.createElement('span');
  scoreA.className = 'tws-dots-score';
  scoreA.dataset.seat = '0';
  const scoreB = document.createElement('span');
  scoreB.className = 'tws-dots-score';
  scoreB.dataset.seat = '1';
  const note = document.createElement('p');
  note.className = 'tws-dots-note';
  bar.append(scoreA, scoreB);
  wrap.append(bar, board, note);
  root.appendChild(wrap);
  const edgeNodes = new Map();
  const boxNodes = new Map();
  let snapshot = null;
  for (let i = 0; i < 11; i++) {
    for (let j = 0; j < 11; j++) {
      const evenRow = i % 2 === 0;
      const evenCol = j % 2 === 0;
      if (evenRow && evenCol) {
        const dot = document.createElement('div');
        dot.className = 'tws-dots-dot';
        board.appendChild(dot);
      } else if (evenRow && !evenCol) {
        const r = i / 2;
        const c = (j - 1) / 2;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tws-dots-edge';
        button.setAttribute('aria-label', `横边 第 ${r + 1} 行 第 ${c + 1} 列`);
        button.addEventListener('click', () => api.send({ type: 'edge', dir: 'h', r, c }));
        board.appendChild(button);
        edgeNodes.set(`h:${r}:${c}`, button);
      } else if (!evenRow && evenCol) {
        const r = (i - 1) / 2;
        const c = j / 2;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tws-dots-edge';
        button.setAttribute('aria-label', `竖边 第 ${r + 1} 行 第 ${c + 1} 列`);
        button.addEventListener('click', () => api.send({ type: 'edge', dir: 'v', r, c }));
        board.appendChild(button);
        edgeNodes.set(`v:${r}:${c}`, button);
      } else {
        const r = (i - 1) / 2;
        const c = (j - 1) / 2;
        const box = document.createElement('div');
        box.className = 'tws-dots-box';
        board.appendChild(box);
        boxNodes.set(`${r}:${c}`, box);
      }
    }
  }
  return {
    update(view) {
      snapshot = view;
      const turn = view.turn === view.you;
      for (const [key, node] of edgeNodes) {
        const [dir, r, c] = key.split(':');
        const list = dir === 'h' ? view.h : view.v;
        const index = dir === 'h' ? Number(r) * 5 + Number(c) : Number(r) * 6 + Number(c);
        const owner = list[index];
        node.dataset.owner = owner === -1 ? '' : String(owner);
        node.dataset.last = view.lastEdge && view.lastEdge.dir === dir && view.lastEdge.r === Number(r) && view.lastEdge.c === Number(c) ? '1' : '0';
        node.disabled = owner !== -1 || view.status !== 'live' || !turn;
      }
      for (const [key, node] of boxNodes) {
        const [r, c] = key.split(':').map(Number);
        const owner = view.boxes[r * 5 + c];
        node.dataset.owner = owner === -1 ? '' : String(owner);
      }
      scoreA.textContent = `珊瑚 ${view.scores[0]}`;
      scoreB.textContent = `森林 ${view.scores[1]}`;
      note.textContent = view.status === 'done'
        ? view.message
        : `${turn ? '轮到你了' : '等对方画边'} · 围住方格可以继续`;
      void snapshot;
    },
    unmount() {
      root.replaceChildren();
      style.remove();
    },
  };
}