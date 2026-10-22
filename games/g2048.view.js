const DIR_KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };

const DIR_LABELS = ['上', '右', '下', '左'];

const DIR_GLYPHS = ['↑', '→', '↓', '←'];

export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-g2048{display:flex;flex-direction:column;gap:10px;width:100%;max-width:560px;margin:0 auto;box-sizing:border-box;color:var(--tw-ink);font-family:inherit}
.tws-g2048-scoreline{display:flex;gap:8px}
.tws-g2048-chip{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;padding:8px 12px;background:var(--tw-card);border:1.5px solid var(--tw-ink);border-radius:14px;box-shadow:0 2px 0 rgba(42,38,35,.10)}
.tws-g2048-chip-top{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:var(--tw-muted)}
.tws-g2048-chip-top span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tws-g2048-score{font-size:22px;line-height:1.1;font-weight:700;color:var(--tw-ink);font-variant-numeric:tabular-nums}
.tws-g2048-sub{font-size:11px;color:var(--tw-muted);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tws-g2048-you{border-left:5px solid var(--tws-accent)}
.tws-g2048-rival{border-right:5px solid var(--tws-rival)}
.tws-g2048-track{height:8px;border:1.5px solid var(--tw-ink);border-radius:99px;background:var(--tw-card);overflow:hidden}
.tws-g2048-fill{height:100%;width:100%;border-radius:99px;background:var(--tws-accent);transition:width .18s linear}
.tws-g2048-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;width:min(100%,360px);aspect-ratio:1;padding:8px;box-sizing:border-box;margin:0 auto;background:#EFE2CC;border:1.5px solid var(--tw-ink);border-radius:18px;box-shadow:0 2px 0 rgba(42,38,35,.12);touch-action:none;user-select:none}
.tws-g2048-tile{display:flex;align-items:center;justify-content:center;border-radius:12px;background:#F8EFDF;border:1px solid rgba(42,38,35,.10);font-weight:700;font-size:clamp(15px,5.6vw,26px);line-height:1;color:var(--tw-ink);font-variant-numeric:tabular-nums;overflow:hidden}
.tws-g2048-tile[data-v="2"]{background:#F6EBD9}
.tws-g2048-tile[data-v="4"]{background:#F0DFC2}
.tws-g2048-tile[data-v="8"]{background:#EACB99;color:#FFFDF8}
.tws-g2048-tile[data-v="16"]{background:#E4B274;color:#FFFDF8}
.tws-g2048-tile[data-v="32"]{background:#D9905A;color:#FFFDF8}
.tws-g2048-tile[data-v="64"]{background:#D9624C;color:#FFFDF8}
.tws-g2048-tile[data-v="128"]{background:#E8A93C;color:#FFFDF8}
.tws-g2048-tile[data-v="256"]{background:#C98A2E;color:#FFFDF8}
.tws-g2048-tile[data-v="512"]{background:#2F6B5B;color:#FFFDF8}
.tws-g2048-tile[data-v="1024"]{background:#4F7FA8;color:#FFFDF8;font-size:clamp(13px,4.8vw,22px)}
.tws-g2048-tile[data-v="2048"]{background:#8A5A7A;color:#FFFDF8;font-size:clamp(13px,4.8vw,22px)}
.tws-g2048-tile[data-v="big"]{background:#2A2623;color:#FFFDF8;font-size:clamp(12px,4.4vw,20px)}
.tws-g2048-pad{display:grid;grid-template-columns:repeat(3,minmax(44px,1fr));grid-template-areas:". up ." "left down right";gap:8px;width:min(100%,240px);margin:0 auto}
.tws-g2048-dir{grid-area:var(--tws-area);display:flex;align-items:center;justify-content:center;min-height:48px;min-width:44px;padding:0;border:1.5px solid var(--tw-ink);border-radius:14px;background:var(--tw-card);box-shadow:0 2px 0 rgba(42,38,35,.10);color:var(--tw-ink);font:inherit;font-size:20px;cursor:pointer;touch-action:manipulation}
.tws-g2048-dir:disabled{cursor:default;opacity:.45}
.tws-g2048-dir:not(:disabled):active{transform:translateY(1px);box-shadow:0 1px 0 rgba(42,38,35,.10)}
.tws-g2048-note{margin:0;text-align:center;font-size:12px;line-height:1.6;color:var(--tw-muted)}
@media (prefers-reduced-motion:reduce){.tws-g2048 *{animation:none!important;transition:none!important}}
`;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.className = 'tws-g2048';
  wrap.style.setProperty('--tws-accent', api.me === 0 ? 'var(--tw-coral)' : 'var(--tw-forest)');
  wrap.style.setProperty('--tws-rival', api.me === 0 ? 'var(--tw-forest)' : 'var(--tw-coral)');
  const rivalName = api.names && api.names[1 - api.me] ? api.names[1 - api.me] : '对手';
  const scoreline = document.createElement('div');
  scoreline.className = 'tws-g2048-scoreline';
  const youChip = document.createElement('div');
  youChip.className = 'tws-g2048-chip tws-g2048-you';
  const youTop = document.createElement('div');
  youTop.className = 'tws-g2048-chip-top';
  const youLabel = document.createElement('span');
  youLabel.textContent = '你';
  const youBest = document.createElement('span');
  youBest.textContent = '最高 0';
  youTop.append(youLabel, youBest);
  const youScore = document.createElement('b');
  youScore.className = 'tws-g2048-score';
  youScore.textContent = '0';
  const youSub = document.createElement('span');
  youSub.className = 'tws-g2048-sub';
  youSub.textContent = '已走 0 步';
  youChip.append(youTop, youScore, youSub);
  const rivalChip = document.createElement('div');
  rivalChip.className = 'tws-g2048-chip tws-g2048-rival';
  const rivalTop = document.createElement('div');
  rivalTop.className = 'tws-g2048-chip-top';
  const rivalLabel = document.createElement('span');
  rivalLabel.textContent = rivalName;
  const rivalBest = document.createElement('span');
  rivalBest.textContent = '最高 0';
  rivalTop.append(rivalLabel, rivalBest);
  const rivalScore = document.createElement('b');
  rivalScore.className = 'tws-g2048-score';
  rivalScore.textContent = '0';
  const rivalSub = document.createElement('span');
  rivalSub.className = 'tws-g2048-sub';
  rivalSub.textContent = '已走 0 步';
  rivalChip.append(rivalTop, rivalScore, rivalSub);
  scoreline.append(youChip, rivalChip);
  const track = document.createElement('div');
  track.className = 'tws-g2048-track';
  const fill = document.createElement('div');
  fill.className = 'tws-g2048-fill';
  track.appendChild(fill);
  const board = document.createElement('div');
  board.className = 'tws-g2048-board';
  board.setAttribute('role', 'grid');
  board.setAttribute('aria-label', '2048 棋盘');
  const tiles = [];
  for (let i = 0; i < 16; i++) {
    const tile = document.createElement('div');
    tile.className = 'tws-g2048-tile';
    tile.setAttribute('role', 'gridcell');
    board.appendChild(tile);
    tiles.push(tile);
  }
  const pad = document.createElement('div');
  pad.className = 'tws-g2048-pad';
  const areas = ['up', 'left', 'down', 'right'];
  const dirButtons = [];
  for (let dir = 0; dir < 4; dir++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tws-g2048-dir';
    button.style.setProperty('--tws-area', areas[dir]);
    button.setAttribute('aria-label', `向${DIR_LABELS[dir]}移动`);
    button.textContent = DIR_GLYPHS[dir];
    button.addEventListener('click', () => sendMove(dir));
    pad.appendChild(button);
    dirButtons.push(button);
  }
  const note = document.createElement('p');
  note.className = 'tws-g2048-note';
  note.textContent = '滑动棋盘，或按方向键移动';
  wrap.append(scoreline, track, board, pad, note);
  root.appendChild(wrap);
  let current = null;
  let touch = null;
  function sendMove(dir) {
    if (!current || current.status !== 'live' || current.locked) return;
    if (api.sound) api.sound('tap');
    api.send({ type: 'move', dir });
  }
  function onKey(event) {
    if (!current) return;
    const dir = DIR_KEYS[event.key];
    if (dir == null) return;
    event.preventDefault();
    sendMove(dir);
  }
  const onDown = (event) => {
    touch = { x: event.clientX, y: event.clientY };
  };
  const onUp = (event) => {
    if (!touch) return;
    const dx = event.clientX - touch.x;
    const dy = event.clientY - touch.y;
    touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) sendMove(dx > 0 ? 1 : 3);
    else sendMove(dy > 0 ? 2 : 0);
  };
  board.addEventListener('pointerdown', onDown);
  board.addEventListener('pointerup', onUp);
  board.addEventListener('pointercancel', () => {
    touch = null;
  });
  document.addEventListener('keydown', onKey);
  return {
    update(view) {
      current = view;
      youScore.textContent = String(view.scores[api.me]);
      rivalScore.textContent = String(view.scores[1 - api.me]);
      youBest.textContent = `最高 ${view.best}`;
      rivalBest.textContent = `最高 ${view.rival.best}`;
      youSub.textContent = view.locked ? '已无可用移动' : `已走 ${view.moves} 步`;
      rivalSub.textContent = view.rival.locked ? '已无可用移动' : `已走 ${view.rival.moves} 步`;
      const total = Math.max(1, view.endsAt - view.startedAt);
      const ratio = Math.max(0, Math.min(1, view.matchLeft / total));
      fill.style.width = `${Math.round(ratio * 100)}%`;
      for (let i = 0; i < 16; i++) {
        const value = view.board[i];
        const tile = tiles[i];
        tile.textContent = value ? String(value) : '';
        if (!value) tile.removeAttribute('data-v');
        else if (value > 2048) tile.dataset.v = 'big';
        else tile.dataset.v = String(value);
      }
      const usable = view.status === 'live' && !view.locked;
      for (const button of dirButtons) button.disabled = !usable;
      if (view.status === 'done') note.textContent = view.message;
      else if (view.locked) note.textContent = '你已无可用移动，等待时间结束。';
      else note.textContent = '滑动棋盘，或按方向键移动';
    },
    unmount() {
      document.removeEventListener('keydown', onKey);
      root.replaceChildren();
      style.remove();
    },
  };
}