const SYMBOLS = ['松', '果', '山', '云', '月', '花', '鸟', '舟'];

export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-memory{display:flex;flex-direction:column;gap:12px;width:100%;max-width:560px;margin:0 auto;box-sizing:border-box;color:var(--tw-ink);font-family:inherit}
.tws-memory-scoreline{display:flex;gap:8px;align-items:stretch}
.tws-memory-chip{flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--tw-card);border:1.5px solid var(--tw-ink);border-radius:14px;padding:8px 12px;box-shadow:0 2px 0 rgba(42,38,35,.10);font-size:13px;color:var(--tw-muted)}
.tws-memory-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tws-memory-chip b{flex:none;font-size:20px;line-height:1;color:var(--tw-ink);font-variant-numeric:tabular-nums}
.tws-memory-you{border-left:5px solid var(--tws-accent)}
.tws-memory-rival{border-right:5px solid var(--tws-rival)}
.tws-memory-banner{margin:0;min-height:20px;padding:10px 12px;text-align:center;font-size:14px;line-height:1.5;color:var(--tw-ink);background:var(--tw-card);border:1.5px dashed var(--tw-line);border-radius:14px}
.tws-memory-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;width:100%;box-sizing:border-box;touch-action:manipulation}
.tws-memory-card{position:relative;appearance:none;padding:0;margin:0;min-height:64px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--tw-ink);border-radius:14px;background:var(--tw-card);box-shadow:0 2px 0 rgba(42,38,35,.10);color:var(--tw-ink);font:inherit;font-size:clamp(22px,8vw,32px);font-weight:700;cursor:pointer;transition:transform .14s ease,background-color .14s ease,box-shadow .14s ease}
.tws-memory-card::before{content:'';position:absolute;inset:7px;border:1px dashed var(--tw-line);border-radius:9px;background:repeating-linear-gradient(45deg,rgba(42,38,35,.05) 0 5px,transparent 5px 11px)}
.tws-memory-card:disabled{cursor:default}
.tws-memory-card:not(:disabled):active{transform:translateY(1px);box-shadow:0 1px 0 rgba(42,38,35,.10)}
.tws-memory-card.tws-open{background:#F5EAD6}
.tws-memory-card.tws-open::before{display:none}
.tws-memory-card.tws-matched{background:var(--tw-mustard);box-shadow:0 2px 0 rgba(42,38,35,.16)}
.tws-memory-card.tws-matched::before{display:none}
.tws-memory-card[data-tone="0"]{color:var(--tw-coral)}
.tws-memory-card[data-tone="1"]{color:var(--tw-forest)}
.tws-memory-card[data-tone="2"]{color:var(--tw-sky)}
.tws-memory-card[data-tone="3"]{color:var(--tw-plum)}
.tws-memory-card:focus-visible{outline:3px solid var(--tws-accent);outline-offset:2px}
.tws-memory-note{margin:0;text-align:center;font-size:12px;line-height:1.6;color:var(--tw-muted)}
@media (prefers-reduced-motion:reduce){.tws-memory *,.tws-memory *::before{animation:none!important;transition:none!important}}
`;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.className = 'tws-memory';
  wrap.style.setProperty('--tws-accent', api.me === 0 ? 'var(--tw-coral)' : 'var(--tw-forest)');
  wrap.style.setProperty('--tws-rival', api.me === 0 ? 'var(--tw-forest)' : 'var(--tw-coral)');
  const rivalName = api.names && api.names[1 - api.me] ? api.names[1 - api.me] : '对手';
  const scoreline = document.createElement('div');
  scoreline.className = 'tws-memory-scoreline';
  const youChip = document.createElement('div');
  youChip.className = 'tws-memory-chip tws-memory-you';
  const youLabel = document.createElement('span');
  youLabel.textContent = '你';
  const youScore = document.createElement('b');
  youScore.textContent = '0';
  youChip.append(youLabel, youScore);
  const rivalChip = document.createElement('div');
  rivalChip.className = 'tws-memory-chip tws-memory-rival';
  const rivalLabel = document.createElement('span');
  rivalLabel.textContent = rivalName;
  const rivalScore = document.createElement('b');
  rivalScore.textContent = '0';
  rivalChip.append(rivalLabel, rivalScore);
  scoreline.append(youChip, rivalChip);
  const banner = document.createElement('p');
  banner.className = 'tws-memory-banner';
  banner.textContent = '等待开局';
  const grid = document.createElement('div');
  grid.className = 'tws-memory-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', '记忆翻牌牌桌');
  const cells = [];
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'tws-memory-card';
    cell.setAttribute('aria-label', `第 ${Math.floor(i / 4) + 1} 行第 ${(i % 4) + 1} 张牌`);
    cell.addEventListener('click', () => {
      if (cell.disabled) return;
      if (api.sound) api.sound('tap');
      api.send({ type: 'flip', index: i });
    });
    grid.appendChild(cell);
    cells.push(cell);
  }
  grid.addEventListener('keydown', (event) => {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 };
    if (!(event.key in moves)) return;
    const current = cells.indexOf(document.activeElement);
    if (current === -1) return;
    const next = current + moves[event.key];
    if (next < 0 || next > 15) return;
    event.preventDefault();
    cells[next].focus();
  });
  const note = document.createElement('p');
  note.className = 'tws-memory-note';
  note.textContent = '十六张牌 · 八对图案';
  wrap.append(scoreline, banner, grid, note);
  root.appendChild(wrap);
  return {
    update(view) {
      youScore.textContent = String(view.scores[api.me]);
      rivalScore.textContent = String(view.scores[1 - api.me]);
      const live = view.status === 'live';
      const myTurn = live && view.turn === api.me;
      const holding = view.pending.length === 2;
      for (let i = 0; i < 16; i++) {
        const cell = cells[i];
        const face = view.cards[i];
        const open = face !== -1;
        const matched = view.matched[i] === true;
        cell.disabled = !(myTurn && !holding && !open);
        cell.classList.toggle('tws-open', open && !matched);
        cell.classList.toggle('tws-matched', matched);
        cell.textContent = open ? SYMBOLS[face] : '';
        if (open) cell.dataset.tone = String(face % 4);
      }
      if (!live) banner.textContent = view.message;
      else if (holding) banner.textContent = '两张牌不同，正在收牌…';
      else if (myTurn) banner.textContent = `轮到你了 · 剩余 ${Math.ceil(view.turnLeft / 1000)} 秒`;
      else banner.textContent = `等待${rivalName}翻牌 · 剩余 ${Math.ceil(view.turnLeft / 1000)} 秒`;
      note.textContent = live ? `已配对 ${8 - view.pairsLeft} 对 · 每次翻两张，配对成功可继续` : '全部配对结束';
    },
    unmount() {
      root.replaceChildren();
      style.remove();
    },
  };
}