const COLOR_NAMES = ['珊瑚色', '天空色', '麦黄色', '森林色'];

const COLOR_KEYS = ['1', '2', '3', '4'];

export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-simon{display:flex;flex-direction:column;gap:10px;width:100%;max-width:520px;margin:0 auto;box-sizing:border-box;color:var(--tw-ink);font-family:inherit}
.tws-simon-top{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;color:var(--tw-muted)}
.tws-simon-round{font-weight:700;color:var(--tw-ink)}
.tws-simon-target{font-variant-numeric:tabular-nums}
.tws-simon-scoreline{display:flex;gap:8px}
.tws-simon-chip{flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:var(--tw-card);border:1.5px solid var(--tw-ink);border-radius:14px;box-shadow:0 2px 0 rgba(42,38,35,.10);font-size:13px;color:var(--tw-muted)}
.tws-simon-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tws-simon-chip b{flex:none;font-size:18px;line-height:1;color:var(--tw-ink);font-variant-numeric:tabular-nums}
.tws-simon-you{border-left:5px solid var(--tws-accent)}
.tws-simon-rival{border-right:5px solid var(--tws-rival)}
.tws-simon-status{min-height:20px;margin:0;padding:9px 12px;text-align:center;font-size:14px;line-height:1.5;background:var(--tw-card);border:1.5px dashed var(--tw-line);border-radius:14px}
.tws-simon-pad{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;width:100%;box-sizing:border-box}
.tws-simon-key{position:relative;display:flex;align-items:center;justify-content:center;min-height:96px;min-width:0;margin:0;padding:0;border:1.5px solid var(--tw-ink);border-radius:18px;box-shadow:0 2px 0 rgba(42,38,35,.10);color:var(--tw-ink);font:inherit;font-weight:700;font-size:26px;cursor:pointer;touch-action:manipulation;transition:transform .12s ease,background-color .12s ease,box-shadow .12s ease,color .12s ease}
.tws-simon-key[data-c="0"]{background:#F3D6CF}
.tws-simon-key[data-c="1"]{background:#D8E5EF}
.tws-simon-key[data-c="2"]{background:#F6E6C6}
.tws-simon-key[data-c="3"]{background:#D8E6DF}
.tws-simon-key[data-c="0"].tws-lit{background:var(--tw-coral);color:#FFFDF8;transform:scale(1.03);box-shadow:0 2px 0 rgba(42,38,35,.18),inset 0 0 0 3px rgba(255,253,248,.35)}
.tws-simon-key[data-c="1"].tws-lit{background:var(--tw-sky);color:#FFFDF8;transform:scale(1.03);box-shadow:0 2px 0 rgba(42,38,35,.18),inset 0 0 0 3px rgba(255,253,248,.35)}
.tws-simon-key[data-c="2"].tws-lit{background:var(--tw-mustard);color:var(--tw-ink);transform:scale(1.03);box-shadow:0 2px 0 rgba(42,38,35,.18),inset 0 0 0 3px rgba(255,253,248,.45)}
.tws-simon-key[data-c="3"].tws-lit{background:var(--tw-forest);color:#FFFDF8;transform:scale(1.03);box-shadow:0 2px 0 rgba(42,38,35,.18),inset 0 0 0 3px rgba(255,253,248,.35)}
.tws-simon-key:disabled{cursor:default}
.tws-simon-key:not(:disabled):active{transform:translateY(1px);box-shadow:0 1px 0 rgba(42,38,35,.10)}
.tws-simon-key:focus-visible{outline:3px solid var(--tws-accent);outline-offset:2px}
.tws-simon-hint{position:absolute;top:8px;left:10px;font-size:12px;font-weight:700;color:var(--tw-muted);letter-spacing:.05em}
.tws-simon-note{margin:0;text-align:center;font-size:12px;line-height:1.6;color:var(--tw-muted)}
@media (prefers-reduced-motion:reduce){.tws-simon *{animation:none!important;transition:none!important}}
`;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.className = 'tws-simon';
  wrap.style.setProperty('--tws-accent', api.me === 0 ? 'var(--tw-coral)' : 'var(--tw-forest)');
  wrap.style.setProperty('--tws-rival', api.me === 0 ? 'var(--tw-forest)' : 'var(--tw-coral)');
  const rivalName = api.names && api.names[1 - api.me] ? api.names[1 - api.me] : '对手';
  const top = document.createElement('div');
  top.className = 'tws-simon-top';
  const roundText = document.createElement('span');
  roundText.className = 'tws-simon-round';
  roundText.textContent = '第 1 轮 · 3 个颜色';
  const targetText = document.createElement('span');
  targetText.className = 'tws-simon-target';
  targetText.textContent = '先到 10 分';
  top.append(roundText, targetText);
  const scoreline = document.createElement('div');
  scoreline.className = 'tws-simon-scoreline';
  const youChip = document.createElement('div');
  youChip.className = 'tws-simon-chip tws-simon-you';
  const youLabel = document.createElement('span');
  youLabel.textContent = '你';
  const youScore = document.createElement('b');
  youScore.textContent = '0 / 10';
  youChip.append(youLabel, youScore);
  const rivalChip = document.createElement('div');
  rivalChip.className = 'tws-simon-chip tws-simon-rival';
  const rivalLabel = document.createElement('span');
  rivalLabel.textContent = rivalName;
  const rivalScore = document.createElement('b');
  rivalScore.textContent = '0 / 10';
  rivalChip.append(rivalLabel, rivalScore);
  scoreline.append(youChip, rivalChip);
  const status = document.createElement('p');
  status.className = 'tws-simon-status';
  status.textContent = '准备播放';
  const pad = document.createElement('div');
  pad.className = 'tws-simon-pad';
  const keys = [];
  for (let color = 0; color < 4; color++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tws-simon-key';
    button.dataset.c = String(color);
    button.setAttribute('aria-label', `${COLOR_NAMES[color]}色块`);
    const hint = document.createElement('span');
    hint.className = 'tws-simon-hint';
    hint.textContent = COLOR_KEYS[color];
    const face = document.createElement('span');
    face.textContent = COLOR_KEYS[color];
    button.append(hint, face);
    button.addEventListener('click', () => tap(color));
    pad.appendChild(button);
    keys.push(button);
  }
  const note = document.createElement('p');
  note.className = 'tws-simon-note';
  note.textContent = '记住亮起的顺序 · 也可按数字键 1–4';
  wrap.append(top, scoreline, status, pad, note);
  root.appendChild(wrap);
  let current = null;
  let lastLit = -1;
  function tap(color) {
    if (!current || current.status !== 'live' || current.phase !== 'input') return;
    if (api.sound) api.sound('tap');
    api.send({ type: 'tap', index: color });
  }
  function onKey(event) {
    if (!current) return;
    const index = COLOR_KEYS.indexOf(event.key);
    if (index === -1) return;
    event.preventDefault();
    tap(index);
  }
  document.addEventListener('keydown', onKey);
  return {
    update(view) {
      current = view;
      roundText.textContent = `第 ${view.round} 轮 · ${view.length} 个颜色`;
      youScore.textContent = `${view.scores[api.me]} / ${view.target}`;
      rivalScore.textContent = `${view.scores[1 - api.me]} / ${view.target}`;
      const lit = view.phase === 'show' ? view.lit : -1;
      for (let color = 0; color < 4; color++) {
        const key = keys[color];
        key.classList.toggle('tws-lit', lit === color);
        key.disabled = view.status !== 'live' || view.phase !== 'input';
      }
      if (view.status === 'done') status.textContent = view.message;
      else if (view.phase === 'input') status.textContent = `轮到你了 · 还剩 ${view.length - view.pos} 个`;
      else status.textContent = '记住亮起的颜色…';
      note.textContent = `失误 ${view.errors} 次 · 按对整轮得一分`;
      if (lit >= 0 && lit !== lastLit && api.sound) api.sound('tick');
      lastLit = lit;
    },
    unmount() {
      document.removeEventListener('keydown', onKey);
      root.replaceChildren();
      style.remove();
    },
  };
}