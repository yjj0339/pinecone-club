export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-reaction{--tws-me:var(--tw-coral,#D9624C);--tws-opp:var(--tw-forest,#2F6B5B);display:flex;flex-direction:column;gap:10px;width:100%;max-width:560px;min-width:0;box-sizing:border-box;padding:14px;background:var(--tw-paper,#FBF3E6);border:1.5px solid var(--tw-ink,#2A2623);border-radius:18px;box-shadow:0 2px 0 rgba(42,38,35,.10);color:var(--tw-ink,#2A2623);font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif}
.tws-reaction *{box-sizing:border-box}
.tws-reaction-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}
.tws-reaction-name{font-family:ui-serif,"Songti SC","STSong",serif;font-size:20px;font-weight:700;letter-spacing:.06em}
.tws-reaction-meta{display:flex;gap:10px;font-size:12px;color:var(--tw-muted,#7C7268);font-variant-numeric:tabular-nums}
.tws-reaction-board{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tws-reaction-seat{display:flex;flex-direction:column;gap:4px;padding:8px 10px;border:1.5px solid var(--tw-line,#E4D7C3);border-radius:14px;background:var(--tw-card,#FFFDF8);box-shadow:0 2px 0 rgba(42,38,35,.08);min-width:0}
.tws-reaction-seat.tws-me{border-color:var(--tws-me)}
.tws-reaction-seat.tws-opp{border-color:var(--tws-opp)}
.tws-reaction-who{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:12px;color:var(--tw-muted,#7C7268);min-width:0}
.tws-reaction-who b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;color:var(--tw-ink,#2A2623)}
.tws-reaction-score{font-family:ui-serif,"Songti SC","STSong",serif;font-size:26px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.tws-me .tws-reaction-score{color:var(--tws-me)}
.tws-opp .tws-reaction-score{color:var(--tws-opp)}
.tws-reaction-dots{display:flex;gap:4px}
.tws-reaction-dots i{flex:1;height:5px;border-radius:99px;background:var(--tw-line,#E4D7C3)}
.tws-reaction-dots i.tws-on0{background:var(--tw-coral,#D9624C)}
.tws-reaction-dots i.tws-on1{background:var(--tw-forest,#2F6B5B)}
.tws-reaction-dots i.tws-onx{background:var(--tw-mustard,#E8A93C)}
.tws-reaction-pad{appearance:none;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%;min-height:168px;padding:18px 12px;border:1.5px solid var(--tw-ink,#2A2623);border-radius:20px;background:var(--tw-card,#FFFDF8);box-shadow:0 4px 0 rgba(42,38,35,.12);color:var(--tw-ink,#2A2623);font:inherit;cursor:pointer;overflow:hidden;transition:transform .1s ease,box-shadow .1s ease;background-image:repeating-linear-gradient(45deg,rgba(42,38,35,.045) 0 2px,transparent 2px 10px)}
.tws-reaction-pad:active:not(:disabled){transform:translateY(3px);box-shadow:0 1px 0 rgba(42,38,35,.12)}
.tws-reaction-pad:focus-visible{outline:2px solid var(--tw-mustard,#E8A93C);outline-offset:3px}
.tws-reaction-pad[data-phase="go"]{background:var(--tw-mustard,#E8A93C);background-image:none;border-color:var(--tw-ink,#2A2623);animation:tws-reaction-pulse .9s ease-in-out infinite}
.tws-reaction-pad[data-phase="go"] .tws-reaction-face{color:#2A2623;font-size:clamp(34px,13vw,60px)}
.tws-reaction-pad[data-phase="go"] .tws-reaction-sub{color:#2A2623;opacity:.72}
.tws-reaction-pad[data-phase="resolve"]{background:var(--tw-card,#FFFDF8);background-image:none}
.tws-reaction-pad:disabled{cursor:default;opacity:.78}
@keyframes tws-reaction-pulse{0%,100%{box-shadow:0 4px 0 rgba(42,38,35,.12),inset 0 0 0 0 rgba(217,98,76,.0)}50%{box-shadow:0 4px 0 rgba(42,38,35,.12),inset 0 0 0 6px rgba(42,38,35,.09)}}
.tws-reaction-face{font-family:ui-serif,"Songti SC","STSong",serif;font-size:clamp(26px,9vw,42px);font-weight:700;line-height:1.15;letter-spacing:.08em}
.tws-reaction-sub{font-size:12px;line-height:1.5;color:var(--tw-muted,#7C7268);text-align:center;max-width:280px}
.tws-reaction-banner{min-height:40px;display:flex;align-items:center;justify-content:center;text-align:center;padding:8px;border-radius:12px;border:1.5px dashed var(--tw-line,#E4D7C3);font-size:12px;line-height:1.55;color:var(--tw-muted,#7C7268);overflow-wrap:anywhere}
.tws-reaction-banner[data-tone="win"]{border-style:solid;border-color:var(--tws-me);color:var(--tws-me)}
.tws-reaction-banner[data-tone="lose"]{border-style:solid;border-color:var(--tws-opp);color:var(--tws-opp)}
.tws-reaction-banner[data-tone="draw"]{border-style:solid;border-color:var(--tw-mustard,#E8A93C);color:#A9781C}
.tws-reaction-log{display:flex;flex-wrap:wrap;gap:6px}
.tws-reaction-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border:1.5px solid var(--tw-line,#E4D7C3);border-radius:99px;background:var(--tw-card,#FFFDF8);font-size:11px;color:var(--tw-muted,#7C7268);font-variant-numeric:tabular-nums}
.tws-reaction-chip b{color:var(--tw-ink,#2A2623);font-weight:600}
.tws-reaction-chip.tws-win{border-color:var(--tws-me)}
.tws-reaction-chip.tws-lose{border-color:var(--tws-opp)}
.tws-reaction-hint{margin:0;font-size:11px;line-height:1.6;color:var(--tw-muted,#7C7268);text-align:center}
@media (prefers-reduced-motion:reduce){.tws-reaction *,.tws-reaction *::before,.tws-reaction *::after{animation:none!important;transition:none!important}}
`;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'tws-reaction';
  wrap.innerHTML = `
    <div class="tws-reaction-head">
      <div class="tws-reaction-name">抢拍反应</div>
      <div class="tws-reaction-meta"><span class="tws-reaction-round">第 1 / 5 轮</span><span class="tws-reaction-clock">00:00</span></div>
    </div>
    <div class="tws-reaction-board">
      <div class="tws-reaction-seat tws-me">
        <div class="tws-reaction-who"><b class="tws-reaction-me-name">你</b><span class="tws-reaction-me-flag"></span></div>
        <div class="tws-reaction-score tws-reaction-me-score">0</div>
        <div class="tws-reaction-dots"></div>
      </div>
      <div class="tws-reaction-seat tws-opp">
        <div class="tws-reaction-who"><b class="tws-reaction-opp-name">对手</b><span class="tws-reaction-opp-flag"></span></div>
        <div class="tws-reaction-score tws-reaction-opp-score">0</div>
        <div class="tws-reaction-dots"></div>
      </div>
    </div>
    <button class="tws-reaction-pad" type="button" data-phase="wait">
      <span class="tws-reaction-face">等待信号</span>
      <span class="tws-reaction-sub">灯亮再拍，抢跑扣分</span>
    </button>
    <div class="tws-reaction-banner">信号出现后再点击，别抢跑。</div>
    <div class="tws-reaction-log"></div>
    <p class="tws-reaction-hint">点击上方区域或按空格抢拍。共五轮，积分高者胜。</p>
  `;
  root.appendChild(wrap);

  const el = {
    round: wrap.querySelector('.tws-reaction-round'),
    clock: wrap.querySelector('.tws-reaction-clock'),
    meName: wrap.querySelector('.tws-reaction-me-name'),
    oppName: wrap.querySelector('.tws-reaction-opp-name'),
    meScore: wrap.querySelector('.tws-reaction-me-score'),
    oppScore: wrap.querySelector('.tws-reaction-opp-score'),
    meFlag: wrap.querySelector('.tws-reaction-me-flag'),
    oppFlag: wrap.querySelector('.tws-reaction-opp-flag'),
    meDots: wrap.querySelector('.tws-me .tws-reaction-dots'),
    oppDots: wrap.querySelector('.tws-opp .tws-reaction-dots'),
    pad: wrap.querySelector('.tws-reaction-pad'),
    face: wrap.querySelector('.tws-reaction-face'),
    sub: wrap.querySelector('.tws-reaction-sub'),
    banner: wrap.querySelector('.tws-reaction-banner'),
    log: wrap.querySelector('.tws-reaction-log'),
    hint: wrap.querySelector('.tws-reaction-hint'),
  };
  const other = 1 - api.me;
  const display = (seat) => (api.names && api.names[seat] ? api.names[seat] : seat === 0 ? '玩家一' : '玩家二');

  wrap.style.setProperty('--tws-me', 'var(--tw-coral, #D9624C)');
  wrap.style.setProperty('--tws-opp', 'var(--tw-forest, #2F6B5B)');
  if (api.me === 1) {
    wrap.style.setProperty('--tws-me', 'var(--tw-forest, #2F6B5B)');
    wrap.style.setProperty('--tws-opp', 'var(--tw-coral, #D9624C)');
  }
  el.meName.textContent = display(api.me);
  el.oppName.textContent = display(other);
  for (const box of [el.meDots, el.oppDots]) {
    for (let i = 0; i < 5; i++) box.appendChild(document.createElement('i'));
  }

  let current = null;
  let lastPhase = '';
  let logKey = '';

  function clockText(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function sound(name) {
    if (api.sound) api.sound(name);
  }

  function tap() {
    if (!current || current.status !== 'live') return;
    if (current.phase !== 'wait' && current.phase !== 'go') return;
    if (current.yourTapped || current.yourFalseStart) return;
    api.send({ type: 'tap' });
    if (api.sound) api.sound('tap');
  }

  function renderLog(history) {
    const key = history.map((item) => `${item.round}:${item.winner}:${item.tie}`).join('|');
    if (key === logKey) return;
    logKey = key;
    el.log.replaceChildren();
    for (const item of history.slice(-5)) {
      const chip = document.createElement('span');
      chip.className = 'tws-reaction-chip';
      if (item.winner === api.me) chip.classList.add('tws-win');
      if (item.winner === other) chip.classList.add('tws-lose');
      const mine = item.taps[api.me];
      const theirs = item.taps[other];
      const label = item.tie ? '同拍' : item.winner === -1 ? '空轮' : item.winner === api.me ? '胜' : '负';
      chip.innerHTML = `<b>第 ${item.round} 轮</b>${mine == null ? '抢跑/未拍' : `${mine}ms`} / ${theirs == null ? '抢跑/未拍' : `${theirs}ms`} ${label}`;
      el.log.appendChild(chip);
    }
  }

  function renderDots(history) {
    const boxes = [[el.meDots, api.me], [el.oppDots, other]];
    for (const [box, seat] of boxes) {
      [...box.children].forEach((dot, index) => {
        dot.className = '';
        const item = history[index];
        if (!item) return;
        if (item.winner === seat) dot.className = `tws-on${seat}`;
        else if (item.winner === -1 || item.tie) dot.className = 'tws-onx';
      });
    }
  }

  function update(view) {
    current = view;
    const done = view.status === 'done';
    el.round.textContent = done ? '比赛结束' : `第 ${view.round} / ${view.rounds} 轮`;
    el.clock.textContent = clockText(view.matchLeft);
    el.meScore.textContent = view.scores[api.me];
    el.oppScore.textContent = view.scores[other];
    el.meFlag.textContent = view.yourFalseStart ? '抢跑' : view.yourTapped ? '已拍' : '';
    el.oppFlag.textContent = view.oppFalseStart ? '抢跑' : view.oppTapped ? '已拍' : '';
    renderDots(view.history);
    renderLog(view.history);
    el.banner.dataset.tone = 'wait';
    if (done) {
      el.face.textContent = view.winner === api.me ? '你赢了' : view.winner === -1 ? '平局' : '你输了';
      el.sub.textContent = '比赛结束，积分已结算。';
      el.banner.textContent = view.message || '比赛结束。';
      el.banner.dataset.tone = view.winner === api.me ? 'win' : view.winner === -1 ? 'draw' : 'lose';
      el.pad.dataset.phase = 'done';
      el.pad.disabled = true;
    } else if (view.phase === 'wait') {
      el.face.textContent = view.yourFalseStart ? '本轮已抢跑' : '等待信号';
      el.sub.textContent = view.yourFalseStart ? '本轮失去资格，等下一轮。' : view.oppFalseStart ? '对手抢跑，本轮你仍可正常抢拍。' : '灯亮再拍，抢跑扣分';
      el.banner.textContent = view.message || '信号出现后再点击，别抢跑。';
      el.pad.dataset.phase = 'wait';
      el.pad.disabled = view.yourFalseStart;
    } else if (view.phase === 'go') {
      el.face.textContent = view.yourTapped ? '已拍下' : '拍！';
      el.sub.textContent = view.yourTapped ? '等对手，或等本轮结算。' : '信号亮了，立刻点击！';
      el.banner.textContent = view.message || '信号亮了，快拍！';
      el.pad.dataset.phase = 'go';
      el.pad.disabled = view.yourTapped;
      if (lastPhase !== 'go') sound('tick');
    } else if (view.phase === 'resolve') {
      el.face.textContent = view.roundWinner === api.me ? '本轮拿下' : view.roundWinner === -1 ? '本轮平手' : '本轮落后';
      el.sub.textContent = `你 ${view.roundTaps && view.roundTaps[api.me] != null ? `${view.roundTaps[api.me]} 毫秒` : '未拍'} · 对手 ${view.roundTaps && view.roundTaps[other] != null ? `${view.roundTaps[other]} 毫秒` : '未拍'}`;
      el.banner.textContent = view.message || '本轮结算。';
      el.banner.dataset.tone = view.roundWinner === api.me ? 'win' : view.roundWinner === -1 ? 'draw' : 'lose';
      el.pad.dataset.phase = 'resolve';
      el.pad.disabled = true;
      if (lastPhase !== 'resolve') sound(view.roundWinner === api.me ? 'win' : view.roundWinner === -1 ? 'tick' : 'lose');
    }
    lastPhase = done ? 'done' : view.phase;
  }

  function onClick() {
    tap();
  }

  function onKey(event) {
    if (event.defaultPrevented || event.repeat) return;
    if (event.code !== 'Space' && event.code !== 'Enter') return;
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    event.preventDefault();
    tap();
  }

  el.pad.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);

  return {
    update,
    unmount() {
      window.removeEventListener('keydown', onKey);
      el.pad.removeEventListener('click', onClick);
      root.replaceChildren();
      style.remove();
    },
  };
}