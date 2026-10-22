const ARROWS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };

export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-sudoku{display:flex;flex-direction:column;gap:10px;width:100%;max-width:560px;margin:0 auto;box-sizing:border-box;color:var(--tw-ink);font-family:inherit}
.tws-sudoku-top{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;color:var(--tw-muted)}
.tws-sudoku-title{font-weight:700;color:var(--tw-ink)}
.tws-sudoku-clock{font-variant-numeric:tabular-nums;font-weight:700;color:var(--tws-accent)}
.tws-sudoku-scoreline{display:flex;gap:8px}
.tws-sudoku-chip{flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:7px 10px;background:var(--tw-card);border:1.5px solid var(--tw-ink);border-radius:14px;box-shadow:0 2px 0 rgba(42,38,35,.10);font-size:12px;color:var(--tw-muted)}
.tws-sudoku-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tws-sudoku-chip b{flex:none;font-size:16px;line-height:1;color:var(--tw-ink);font-variant-numeric:tabular-nums}
.tws-sudoku-you{border-left:5px solid var(--tws-accent)}
.tws-sudoku-rival{border-right:5px solid var(--tws-rival)}
.tws-sudoku-board{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));width:min(100%,420px);aspect-ratio:1;margin:0 auto;box-sizing:border-box;background:var(--tw-card);border:1.5px solid var(--tw-ink);border-radius:14px;overflow:hidden;box-shadow:0 2px 0 rgba(42,38,35,.10)}
.tws-sudoku-cell{appearance:none;margin:0;padding:0;min-width:0;min-height:0;display:flex;align-items:center;justify-content:center;background:transparent;border:0;border-right:1px solid var(--tw-line);border-bottom:1px solid var(--tw-line);color:var(--tw-sky);font:inherit;font-size:clamp(14px,4.6vw,21px);line-height:1;cursor:pointer;touch-action:manipulation}
.tws-sudoku-cell[data-br="3"]{border-right:1.5px solid var(--tw-ink)}
.tws-sudoku-cell[data-bb="3"]{border-bottom:1.5px solid var(--tw-ink)}
.tws-sudoku-cell[data-br="0"]{border-right:0}
.tws-sudoku-cell[data-bb="0"]{border-bottom:0}
.tws-sudoku-cell.tws-given{font-weight:700;color:var(--tw-ink);background:#F8F0E2}
.tws-sudoku-cell.tws-peer{background:#F6EDDD}
.tws-sudoku-cell.tws-sel{background:#F7DCD2;box-shadow:inset 0 0 0 2px var(--tws-accent);color:var(--tw-ink)}
.tws-sudoku-cell.tws-given.tws-sel{background:#F2E4CE}
.tws-sudoku-cell:focus-visible{outline:2px solid var(--tws-accent);outline-offset:-2px}
.tws-sudoku-pad{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;width:100%;box-sizing:border-box}
.tws-sudoku-key{display:flex;align-items:center;justify-content:center;min-height:44px;min-width:0;margin:0;padding:0;border:1.5px solid var(--tw-ink);border-radius:12px;background:var(--tw-card);box-shadow:0 2px 0 rgba(42,38,35,.10);color:var(--tw-ink);font:inherit;font-size:17px;font-weight:700;cursor:pointer;touch-action:manipulation}
.tws-sudoku-key.tws-clear{font-size:13px;color:var(--tw-muted)}
.tws-sudoku-key.tws-active{background:var(--tws-accent);color:#FFFDF8;border-color:var(--tws-accent)}
.tws-sudoku-key:disabled{cursor:default;opacity:.45}
.tws-sudoku-key:not(:disabled):active{transform:translateY(1px);box-shadow:0 1px 0 rgba(42,38,35,.10)}
.tws-sudoku-note{margin:0;text-align:center;font-size:12px;line-height:1.6;color:var(--tw-muted)}
@media (prefers-reduced-motion:reduce){.tws-sudoku *{animation:none!important;transition:none!important}}
`;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.className = 'tws-sudoku';
  wrap.style.setProperty('--tws-accent', api.me === 0 ? 'var(--tw-coral)' : 'var(--tw-forest)');
  wrap.style.setProperty('--tws-rival', api.me === 0 ? 'var(--tw-forest)' : 'var(--tw-coral)');
  const rivalName = api.names && api.names[1 - api.me] ? api.names[1 - api.me] : '对手';
  const top = document.createElement('div');
  top.className = 'tws-sudoku-top';
  const title = document.createElement('span');
  title.className = 'tws-sudoku-title';
  title.textContent = '数独竞速';
  const clock = document.createElement('span');
  clock.className = 'tws-sudoku-clock';
  clock.textContent = '05:00';
  top.append(title, clock);
  const scoreline = document.createElement('div');
  scoreline.className = 'tws-sudoku-scoreline';
  const youChip = document.createElement('div');
  youChip.className = 'tws-sudoku-chip tws-sudoku-you';
  const youLabel = document.createElement('span');
  youLabel.textContent = '你';
  const youText = document.createElement('b');
  youText.textContent = '34';
  youChip.append(youLabel, youText);
  const rivalChip = document.createElement('div');
  rivalChip.className = 'tws-sudoku-chip tws-sudoku-rival';
  const rivalLabel = document.createElement('span');
  rivalLabel.textContent = rivalName;
  const rivalText = document.createElement('b');
  rivalText.textContent = '34';
  rivalChip.append(rivalLabel, rivalText);
  scoreline.append(youChip, rivalChip);
  const board = document.createElement('div');
  board.className = 'tws-sudoku-board';
  board.setAttribute('role', 'grid');
  board.setAttribute('aria-label', '数独棋盘');
  const cells = [];
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'tws-sudoku-cell';
    cell.dataset.br = col === 8 ? '0' : col % 3 === 2 ? '3' : '1';
    cell.dataset.bb = row === 8 ? '0' : row % 3 === 2 ? '3' : '1';
    cell.setAttribute('aria-label', `第 ${row + 1} 行第 ${col + 1} 列`);
    cell.addEventListener('click', () => {
      sel = i;
      refreshSelection();
      if (api.sound) api.sound('tap');
    });
    board.appendChild(cell);
    cells.push(cell);
  }
  const pad = document.createElement('div');
  pad.className = 'tws-sudoku-pad';
  const keyButtons = [];
  for (let value = 1; value <= 9; value++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tws-sudoku-key';
    button.textContent = String(value);
    button.setAttribute('aria-label', `填入 ${value}`);
    button.addEventListener('click', () => place(value));
    pad.appendChild(button);
    keyButtons.push(button);
  }
  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'tws-sudoku-key tws-clear';
  clearButton.textContent = '清除';
  clearButton.setAttribute('aria-label', '清除当前格');
  clearButton.addEventListener('click', () => place(0));
  pad.appendChild(clearButton);
  const note = document.createElement('p');
  note.className = 'tws-sudoku-note';
  note.textContent = '点击格子选中，再按数字键填入';
  wrap.append(top, scoreline, board, pad, note);
  root.appendChild(wrap);
  let current = null;
  let sel = -1;
  function place(value) {
    if (!current || current.status !== 'live') return;
    if (sel < 0 || sel > 80) return;
    if (current.givens[sel] !== 0) return;
    if (current.board[sel] === value) return;
    if (api.sound) api.sound('tap');
    api.send({ type: 'fill', index: sel, value });
  }
  function refreshSelection() {
    if (!current) return;
    const row = sel >= 0 ? Math.floor(sel / 9) : -1;
    const col = sel >= 0 ? sel % 9 : -1;
    const boxRow = row >= 0 ? Math.floor(row / 3) * 3 : -1;
    const boxCol = col >= 0 ? Math.floor(col / 3) * 3 : -1;
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      const peer = sel >= 0 && i !== sel && (r === row || c === col || (r >= boxRow && r < boxRow + 3 && c >= boxCol && c < boxCol + 3));
      cells[i].classList.toggle('tws-peer', peer);
      cells[i].classList.toggle('tws-sel', i === sel);
    }
    for (let value = 0; value < 9; value++) {
      keyButtons[value].classList.toggle('tws-active', sel >= 0 && current.board[sel] === value + 1);
    }
  }
  function moveSelection(index) {
    if (index < 0 || index > 80) return;
    sel = index;
    refreshSelection();
  }
  function onKey(event) {
    if (!current) return;
    const digit = Number(event.key);
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      place(digit);
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      place(0);
      return;
    }
    const step = ARROWS[event.key];
    if (step == null || sel < 0) return;
    event.preventDefault();
    const row = Math.floor(sel / 9);
    const col = sel % 9;
    if (event.key === 'ArrowLeft' && col > 0) moveSelection(sel - 1);
    else if (event.key === 'ArrowRight' && col < 8) moveSelection(sel + 1);
    else if (event.key === 'ArrowUp' && row > 0) moveSelection(sel - 9);
    else if (event.key === 'ArrowDown' && row < 8) moveSelection(sel + 9);
  }
  document.addEventListener('keydown', onKey);
  return {
    update(view) {
      current = view;
      if (sel < 0) {
        const first = view.givens.findIndex((value) => value === 0);
        sel = first === -1 ? 0 : first;
      }
      clock.textContent = `${String(Math.floor(view.matchLeft / 60000)).padStart(2, '0')}:${String(Math.floor((view.matchLeft % 60000) / 1000)).padStart(2, '0')}`;
      youText.textContent = `${view.correct} 格 · 失误 ${view.errors}`;
      rivalText.textContent = `${view.rival.correct} 格 · 失误 ${view.rival.errors}`;
      for (let i = 0; i < 81; i++) {
        const value = view.board[i];
        const cell = cells[i];
        cell.textContent = value ? String(value) : '';
        cell.classList.toggle('tws-given', view.givens[i] !== 0);
        cell.disabled = view.status !== 'live';
      }
      const usable = view.status === 'live';
      for (const button of keyButtons) button.disabled = !usable;
      clearButton.disabled = !usable;
      refreshSelection();
      if (view.status === 'done') note.textContent = view.message;
      else note.textContent = '点击格子选中，再按数字键填入 · 填错会扣分';
    },
    unmount() {
      document.removeEventListener('keydown', onKey);
      root.replaceChildren();
      style.remove();
    },
  };
}