export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-rps{--tws-me:var(--tw-coral,#D9624C);--tws-opp:var(--tw-forest,#2F6B5B);display:flex;flex-direction:column;gap:10px;width:100%;max-width:560px;min-width:0;box-sizing:border-box;padding:14px;background:var(--tw-paper,#FBF3E6);border:1.5px solid var(--tw-ink,#2A2623);border-radius:18px;box-shadow:0 2px 0 rgba(42,38,35,.10);color:var(--tw-ink,#2A2623);font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif}
.tws-rps *{box-sizing:border-box}
.tws-rps-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}
.tws-rps-name{font-family:ui-serif,"Songti SC","STSong",serif;font-size:20px;font-weight:700;letter-spacing:.06em}
.tws-rps-meta{display:flex;gap:10px;font-size:12px;color:var(--tw-muted,#7C7268);font-variant-numeric:tabular-nums}
.tws-rps-board{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;background:var(--tw-card,#FFFDF8);border:1.5px solid var(--tw-ink,#2A2623);border-radius:14px;box-shadow:0 2px 0 rgba(42,38,35,.08)}
.tws-rps-seat{display:flex;align-items:center;gap:8px;min-width:0;font-size:13px}
.tws-rps-seat b{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:96px}
.tws-rps-me b{color:var(--tws-me)}
.tws-rps-opp b{color:var(--tws-opp)}
.tws-rps-pips{display:flex;gap:4px}
.tws-rps-pips i{width:9px;height:9px;border-radius:50%;border:1.5px solid var(--tw-line,#E4D7C3);background:transparent}
.tws-rps-me .tws-rps-pips i.tws-on{background:var(--tws-me);border-color:var(--tws-me)}
.tws-rps-opp .tws-rps-pips i.tws-on{background:var(--tws-opp);border-color:var(--tws-opp)}
.tws-rps-stage{display:grid;grid-template-columns:1fr minmax(96px,1.1fr) 1fr;gap:8px;align-items:center}
.tws-rps-hand{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;aspect-ratio:1;min-height:88px;border:1.5px solid var(--tw-ink,#2A2623);border-radius:16px;background:var(--tw-card,#FFFDF8);box-shadow:0 3px 0 rgba(42,38,35,.10);overflow:hidden}
.tws-rps-hand span{font-family:ui-serif,"Songti SC","STSong",serif;font-size:clamp(30px,12vw,52px);font-weight:700;line-height:1}
.tws-rps-hand small{font-size:11px;color:var(--tw-muted,#7C7268)}
.tws-rps-hand-me{border-color:var(--tws-me);background:color-mix(in srgb,var(--tws-me) 10%,var(--tw-card,#FFFDF8))}
.tws-rps-hand-me span{color:var(--tws-me)}
.tws-rps-hand-opp{border-color:var(--tws-opp);background:color-mix(in srgb,var(--tws-opp) 8%,var(--tw-card,#FFFDF8))}
.tws-rps-hand-opp span{color:var(--tws-opp)}
.tws-rps-hand.tws-ready small{color:var(--tw-ink,#2A2623)}
.tws-rps-hand.tws-flip span{animation:tws-rps-pop .42s cubic-bezier(.2,.8,.3,1.2)}
@keyframes tws-rps-pop{0%{transform:scale(.5) rotate(-8deg);opacity:.2}100%{transform:scale(1) rotate(0);opacity:1}}
.tws-rps-verdict{min-height:52px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:13px;line-height:1.5;font-weight:600;padding:6px 4px;border-radius:12px;border:1.5px dashed var(--tw-line,#E4D7C3);color:var(--tw-muted,#7C7268)}
.tws-rps-verdict[data-tone="win"]{color:var(--tws-me);border-color:var(--tws-me);border-style:solid}
.tws-rps-verdict[data-tone="lose"]{color:var(--tws-opp);border-color:var(--tws-opp);border-style:solid}
.tws-rps-verdict[data-tone="draw"]{color:#A9781C;border-color:var(--tw-mustard,#E8A93C);border-style:solid}
.tws-rps-clockbar{height:6px;border-radius:99px;background:var(--tw-line,#E4D7C3);overflow:hidden}
.tws-rps-clockbar i{display:block;height:100%;width:0;background:var(--tws-me);border-radius:99px;transition:width .18s linear}
.tws-rps-choices{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.tws-rps-choices button{appearance:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:76px;min-width:44px;padding:6px 4px;border:1.5px solid var(--tw-ink,#2A2623);border-radius:14px;background:var(--tw-card,#FFFDF8);box-shadow:0 3px 0 rgba(42,38,35,.12);color:var(--tw-ink,#2A2623);font:inherit;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease}
.tws-rps-choices button b{font-family:ui-serif,"Songti SC","STSong",serif;font-size:24px;line-height:1.1}
.tws-rps-choices button span{font-size:11px;color:var(--tw-muted,#7C7268)}
.tws-rps-choices button kbd{position:absolute;opacity:0;pointer-events:none}
.tws-rps-choices button:active:not(:disabled){transform:translateY(2px);box-shadow:0 1px 0 rgba(42,38,35,.12)}
.tws-rps-choices button.tws-picked{border-color:var(--tws-me);background:color-mix(in srgb,var(--tws-me) 14%,var(--tw-card,#FFFDF8));box-shadow:0 3px 0 var(--tws-me)}
.tws-rps-choices button.tws-picked span{color:var(--tws-me)}
.tws-rps-choices button:disabled{cursor:default;opacity:.62}
.tws-rps-choices button:focus-visible{outline:2px solid var(--tw-mustard,#E8A93C);outline-offset:2px}
.tws-rps-hint{margin:0;font-size:11px;line-height:1.6;color:var(--tw-muted,#7C7268);text-align:center}
.tws-rps-history{display:flex;flex-wrap:wrap;gap:6px;min-height:0}
.tws-rps-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border:1.5px solid var(--tw-line,#E4D7C3);border-radius:99px;background:var(--tw-card,#FFFDF8);font-size:11px;color:var(--tw-muted,#7C7268);font-variant-numeric:tabular-nums}
.tws-rps-chip b{color:var(--tw-ink,#2A2623);font-weight:600}
.tws-rps-chip.tws-win{border-color:var(--tws-me)}
.tws-rps-chip.tws-lose{border-color:var(--tws-opp)}
@media (prefers-reduced-motion:reduce){.tws-rps *,.tws-rps *::before,.tws-rps *::after{animation:none!important;transition:none!important}}
`;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'tws-rps';
  wrap.innerHTML = `
    <div class="tws-rps-head">
      <div class="tws-rps-name">石头剪刀布</div>
      <div class="tws-rps-meta"><span class="tws-rps-round">第 1 局</span><span class="tws-rps-clock">00:00</span></div>
    </div>
    <div class="tws-rps-board">
      <div class="tws-rps-seat tws-rps-me"><b class="tws-rps-who">你</b><div class="tws-rps-pips"></div></div>
      <div class="tws-rps-seat tws-rps-opp"><b class="tws-rps-who">对手</b><div class="tws-rps-pips"></div></div>
    </div>
    <div class="tws-rps-stage">
      <div class="tws-rps-hand tws-rps-hand-me"><span>？</span><small>你</small></div>
      <div class="tws-rps-verdict">选择你的手势</div>
      <div class="tws-rps-hand tws-rps-hand-opp"><span>？</span><small>对手</small></div>
    </div>
    <div class="tws-rps-clockbar"><i></i></div>
    <div class="tws-rps-choices">
      <button type="button" data-pick="rock"><b>石</b><span>石头</span><kbd>1</kbd></button>
      <button type="button" data-pick="paper"><b>布</b><span>布</span><kbd>2</kbd></button>
      <button type="button" data-pick="scissors"><b>剪</b><span>剪刀</span><kbd>3</kbd></button>
    </div>
    <p class="tws-rps-hint">按 1 / 2 / 3 或点击出拳，双方同时揭晓。先得三分者获胜。</p>
    <div class="tws-rps-history"></div>
  `;
  root.appendChild(wrap);

  const el = {
    round: wrap.querySelector('.tws-rps-round'),
    clock: wrap.querySelector('.tws-rps-clock'),
    meWho: wrap.querySelector('.tws-rps-me .tws-rps-who'),
    oppWho: wrap.querySelector('.tws-rps-opp .tws-rps-who'),
    mePips: wrap.querySelector('.tws-rps-me .tws-rps-pips'),
    oppPips: wrap.querySelector('.tws-rps-opp .tws-rps-pips'),
    meHand: wrap.querySelector('.tws-rps-hand-me'),
    oppHand: wrap.querySelector('.tws-rps-hand-opp'),
    meGlyph: wrap.querySelector('.tws-rps-hand-me span'),
    oppGlyph: wrap.querySelector('.tws-rps-hand-opp span'),
    meSmall: wrap.querySelector('.tws-rps-hand-me small'),
    oppSmall: wrap.querySelector('.tws-rps-hand-opp small'),
    verdict: wrap.querySelector('.tws-rps-verdict'),
    bar: wrap.querySelector('.tws-rps-clockbar i'),
    buttons: [...wrap.querySelectorAll('[data-pick]')],
    hint: wrap.querySelector('.tws-rps-hint'),
    history: wrap.querySelector('.tws-rps-history'),
  };
  const GLYPH = { rock: '石', paper: '布', scissors: '剪' };
  const other = 1 - api.me;
  const display = (seat) => (api.names && api.names[seat] ? api.names[seat] : seat === 0 ? '玩家一' : '玩家二');

  wrap.style.setProperty('--tws-me', 'var(--tw-coral, #D9624C)');
  wrap.style.setProperty('--tws-opp', 'var(--tw-forest, #2F6B5B)');
  if (api.me === 1) {
    wrap.style.setProperty('--tws-me', 'var(--tw-forest, #2F6B5B)');
    wrap.style.setProperty('--tws-opp', 'var(--tw-coral, #D9624C)');
  }
  el.meWho.textContent = display(api.me);
  el.oppWho.textContent = display(other);
  el.meSmall.textContent = display(api.me);
  el.oppSmall.textContent = display(other);
  for (const box of [el.mePips, el.oppPips]) {
    for (let i = 0; i < 3; i++) box.appendChild(document.createElement('i'));
  }

  let current = null;
  let historyKey = '';
  let lastPhase = '';

  function clockText(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function choose(pick) {
    if (!current || current.status !== 'live' || current.phase !== 'choose' || current.yourReady || !pick) return;
    api.send({ type: 'choose', pick });
    if (api.sound) api.sound('tap');
  }

  function sound(name) {
    if (api.sound) api.sound(name);
  }

  function pips(box, score) {
    [...box.children].forEach((dot, index) => dot.classList.toggle('tws-on', index < score));
  }

  function renderHistory(history) {
    const key = history.map((item) => `${item.round}:${item.winner}`).join('|');
    if (key === historyKey) return;
    historyKey = key;
    el.history.replaceChildren();
    for (const item of history.slice(-6)) {
      const chip = document.createElement('span');
      chip.className = 'tws-rps-chip';
      const mine = item.picks[api.me];
      const theirs = item.picks[other];
      if (item.winner === api.me) chip.classList.add('tws-win');
      if (item.winner === other) chip.classList.add('tws-lose');
      const label = item.winner === -1 ? '平' : item.winner === api.me ? '胜' : '负';
      chip.innerHTML = `<b>${GLYPH[mine] || '？'}</b>对<b>${GLYPH[theirs] || '？'}</b>${label}`;
      el.history.appendChild(chip);
    }
  }

  function update(view) {
    current = view;
    const revealed = view.phase === 'reveal' || view.status === 'done';
    el.round.textContent = view.status === 'done' ? '比赛结束' : `第 ${view.round} 局`;
    el.clock.textContent = clockText(view.matchLeft);
    pips(el.mePips, view.scores[api.me]);
    pips(el.oppPips, view.scores[other]);
    el.meGlyph.textContent = view.yourPick ? GLYPH[view.yourPick] : '？';
    el.oppGlyph.textContent = revealed && view.picks ? GLYPH[view.picks[other]] : '？';
    el.oppHand.classList.toggle('tws-ready', !revealed && view.oppPicked);
    el.meHand.classList.toggle('tws-ready', !revealed && view.yourReady);
    el.verdict.dataset.tone = 'wait';
    if (view.status === 'done') {
      el.verdict.textContent = view.winner === api.me ? '你赢了' : view.winner === -1 ? '平局' : '你输了';
      el.verdict.dataset.tone = view.winner === api.me ? 'win' : view.winner === -1 ? 'draw' : 'lose';
    } else if (view.phase === 'reveal') {
      el.verdict.textContent = view.roundWinner === api.me ? '你赢下这一局' : view.roundWinner === -1 ? '平手，重来' : '对手赢下这一局';
      el.verdict.dataset.tone = view.roundWinner === api.me ? 'win' : view.roundWinner === -1 ? 'draw' : 'lose';
    } else {
      el.verdict.textContent = view.yourReady ? (view.oppPicked ? '双方已出手，揭晓中…' : '已出手，等对手') : '选择你的手势';
    }
    const total = view.phase === 'choose' ? 8000 : 2200;
    const left = view.phase === 'choose' ? view.chooseLeft : view.revealLeft;
    el.bar.style.width = `${Math.max(0, Math.min(100, (left / total) * 100))}%`;
    el.bar.style.background = view.phase === 'reveal' ? 'var(--tw-mustard,#E8A93C)' : 'var(--tws-me)';
    for (const button of el.buttons) {
      button.disabled = view.status !== 'live' || view.phase !== 'choose' || view.yourReady;
      button.classList.toggle('tws-picked', view.phase === 'choose' && view.yourPick === button.dataset.pick);
    }
    if (view.status === 'done') {
      el.hint.textContent = view.message || '比赛结束。';
    } else if (view.phase === 'reveal') {
      el.hint.textContent = view.message || '揭晓本局结果。';
    } else {
      el.hint.textContent = '按 1 / 2 / 3 或点击出拳，双方同时揭晓。先得三分者获胜。';
    }
    renderHistory(view.history.filter((item) => item.round < view.round || revealed));
    if (view.phase === 'reveal' && lastPhase !== 'reveal') {
      el.meHand.classList.remove('tws-flip');
      el.oppHand.classList.remove('tws-flip');
      void el.meHand.offsetWidth;
      el.meHand.classList.add('tws-flip');
      el.oppHand.classList.add('tws-flip');
      sound(view.roundWinner === api.me ? 'win' : view.roundWinner === -1 ? 'tick' : 'lose');
    }
    if (view.status === 'done' && lastPhase !== 'done') sound(view.winner === api.me ? 'win' : 'lose');
    lastPhase = view.status === 'done' ? 'done' : view.phase;
  }

  function onChoice(event) {
    const button = event.target.closest('[data-pick]');
    if (!button || button.disabled) return;
    choose(button.dataset.pick);
  }

  function onKey(event) {
    if (event.defaultPrevented || event.repeat) return;
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const map = { 1: 'rock', 2: 'paper', 3: 'scissors' };
    const pick = map[event.key];
    if (!pick) return;
    event.preventDefault();
    choose(pick);
  }

  el.buttons.forEach((button) => button.addEventListener('click', onChoice));
  window.addEventListener('keydown', onKey);

  return {
    update,
    unmount() {
      window.removeEventListener('keydown', onKey);
      el.buttons.forEach((button) => button.removeEventListener('click', onChoice));
      root.replaceChildren();
      style.remove();
    },
  };
}