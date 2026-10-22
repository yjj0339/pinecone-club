export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-typing{--tws-me:var(--tw-coral,#D9624C);--tws-opp:var(--tw-forest,#2F6B5B);display:flex;flex-direction:column;gap:10px;width:100%;max-width:620px;min-width:0;box-sizing:border-box;padding:14px;background:var(--tw-paper,#FBF3E6);border:1.5px solid var(--tw-ink,#2A2623);border-radius:18px;box-shadow:0 2px 0 rgba(42,38,35,.10);color:var(--tw-ink,#2A2623);font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif}
.tws-typing *{box-sizing:border-box}
.tws-typing-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}
.tws-typing-name{font-family:ui-serif,"Songti SC","STSong",serif;font-size:20px;font-weight:700;letter-spacing:.06em}
.tws-typing-clock{font-size:12px;color:var(--tw-muted,#7C7268);font-variant-numeric:tabular-nums}
.tws-typing-rails{display:flex;flex-direction:column;gap:6px}
.tws-typing-rail{display:flex;flex-direction:column;gap:4px;padding:7px 10px;border:1.5px solid var(--tw-line,#E4D7C3);border-radius:12px;background:var(--tw-card,#FFFDF8)}
.tws-typing-rail.tws-me{border-color:var(--tws-me)}
.tws-typing-rail.tws-opp{border-color:var(--tws-opp)}
.tws-typing-railhead{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:var(--tw-muted,#7C7268);min-width:0}
.tws-typing-railhead b{font-weight:600;color:var(--tw-ink,#2A2623);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tws-typing-railhead span{font-variant-numeric:tabular-nums;white-space:nowrap}
.tws-typing-bar{height:7px;border-radius:99px;background:var(--tw-line,#E4D7C3);overflow:hidden}
.tws-typing-bar i{display:block;height:100%;width:0;border-radius:99px;background:var(--tws-me);transition:width .14s linear}
.tws-typing-rail.tws-opp .tws-typing-bar i{background:var(--tws-opp)}
.tws-typing-sheet{position:relative;padding:14px 12px;border:1.5px solid var(--tw-ink,#2A2623);border-radius:16px;background:var(--tw-card,#FFFDF8);box-shadow:0 3px 0 rgba(42,38,35,.09)}
.tws-typing-sheet::before{content:'';position:absolute;inset:8px;border:1px dashed var(--tw-line,#E4D7C3);border-radius:10px;pointer-events:none}
.tws-typing-sentence{position:relative;display:flex;flex-wrap:wrap;justify-content:center;gap:2px;font-family:ui-serif,"Songti SC","STSong",serif;font-size:clamp(20px,7.2vw,30px);font-weight:600;line-height:1.45;letter-spacing:.02em;word-break:break-all}
.tws-typing-sentence span{display:inline-block;min-width:.4em;padding:0 1px;color:var(--tw-muted,#7C7268);border-bottom:2px solid transparent}
.tws-typing-sentence span.tws-typed{color:var(--tws-me);border-bottom-color:transparent}
.tws-typing-sentence span.tws-current{color:var(--tw-ink,#2A2623);border-bottom-color:var(--tw-mustard,#E8A93C);animation:tws-typing-blink 1.1s ease-in-out infinite}
@keyframes tws-typing-blink{0%,100%{background:transparent}50%{background:color-mix(in srgb,var(--tw-mustard,#E8A93C) 22%,transparent)}}
.tws-typing-inputwrap{display:flex;align-items:center;gap:8px;min-height:44px}
.tws-typing-input{flex:1;min-width:0;width:100%;min-height:52px;padding:10px 12px;border:1.5px solid var(--tw-ink,#2A2623);border-radius:14px;background:var(--tw-card,#FFFDF8);box-shadow:inset 0 2px 0 rgba(42,38,35,.06);color:var(--tw-ink,#2A2623);font:inherit;font-size:16px;line-height:1.4;outline:none}
.tws-typing-input::placeholder{color:var(--tw-muted,#7C7268)}
.tws-typing-input:focus{border-color:var(--tws-me);box-shadow:0 0 0 3px color-mix(in srgb,var(--tws-me) 18%,transparent)}
.tws-typing-input:disabled{opacity:.6}
.tws-typing-input.tws-error{border-color:var(--tw-coral,#D9624C);animation:tws-typing-shake .24s ease}
@keyframes tws-typing-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.tws-typing-hint{margin:0;font-size:11px;line-height:1.6;color:var(--tw-muted,#7C7268);text-align:center;overflow-wrap:anywhere}
@media (prefers-reduced-motion:reduce){.tws-typing *,.tws-typing *::before,.tws-typing *::after{animation:none!important;transition:none!important}}
`;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'tws-typing';
  wrap.innerHTML = `
    <div class="tws-typing-head">
      <div class="tws-typing-name">打字竞速</div>
      <div class="tws-typing-clock">00:00</div>
    </div>
    <div class="tws-typing-rails">
      <div class="tws-typing-rail tws-me">
        <div class="tws-typing-railhead"><b class="tws-typing-me-name">你</b><span class="tws-typing-me-count">0 / 0</span></div>
        <div class="tws-typing-bar"><i></i></div>
      </div>
      <div class="tws-typing-rail tws-opp">
        <div class="tws-typing-railhead"><b class="tws-typing-opp-name">对手</b><span class="tws-typing-opp-count">0 / 0</span></div>
        <div class="tws-typing-bar"><i></i></div>
      </div>
    </div>
    <div class="tws-typing-sheet">
      <div class="tws-typing-sentence" aria-live="polite"></div>
    </div>
    <label class="tws-typing-inputwrap">
      <input class="tws-typing-input" type="text" inputmode="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="在这里逐字输入上面的句子">
    </label>
    <p class="tws-typing-hint">逐字输入，先完整打完的人获胜。错字会被退回，输入法组字完成后自动生效。</p>
  `;
  root.appendChild(wrap);

  const el = {
    clock: wrap.querySelector('.tws-typing-clock'),
    meName: wrap.querySelector('.tws-typing-me-name'),
    oppName: wrap.querySelector('.tws-typing-opp-name'),
    meCount: wrap.querySelector('.tws-typing-me-count'),
    oppCount: wrap.querySelector('.tws-typing-opp-count'),
    meBar: wrap.querySelector('.tws-me .tws-typing-bar i'),
    oppBar: wrap.querySelector('.tws-opp .tws-typing-bar i'),
    sentence: wrap.querySelector('.tws-typing-sentence'),
    input: wrap.querySelector('.tws-typing-input'),
    hint: wrap.querySelector('.tws-typing-hint'),
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

  let current = null;
  let chars = [];
  let target = '';
  let composing = false;
  let syncTimer = 0;

  function clockText(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function buildSentence(text) {
    target = text;
    chars = [];
    el.sentence.replaceChildren();
    for (const char of text) {
      const span = document.createElement('span');
      span.textContent = char;
      el.sentence.appendChild(span);
      chars.push(span);
    }
  }

  function flashError() {
    el.input.classList.remove('tws-error');
    void el.input.offsetWidth;
    el.input.classList.add('tws-error');
  }

  function accept() {
    if (!current || current.status !== 'live' || current.finished) return;
    const value = el.input.value;
    const expected = target.slice(0, current.yourProgress);
    if (!target.startsWith(value) || value.length < current.yourProgress) {
      el.input.value = expected;
      flashError();
      if (api.sound) api.sound('tick');
      return;
    }
    if (value.length > current.yourProgress) {
      api.send({ type: 'input', value });
      if (api.sound) api.sound('tap');
    }
  }

  function syncInput(view) {
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      if (!current || composing) return;
      const expected = current.target.slice(0, current.yourProgress);
      if (el.input.value.length < current.yourProgress) el.input.value = expected;
    }, 90);
  }

  function update(view) {
    current = view;
    if (view.target !== target) buildSentence(view.target);
    el.clock.textContent = clockText(view.matchLeft);
    el.meCount.textContent = `${view.yourProgress} / ${view.length} 字`;
    el.oppCount.textContent = `${view.oppProgress} / ${view.length} 字`;
    el.meBar.style.width = `${view.percent[api.me]}%`;
    el.oppBar.style.width = `${view.percent[other]}%`;
    chars.forEach((span, index) => {
      span.className = index < view.yourProgress ? 'tws-typed' : index === view.yourProgress ? 'tws-current' : '';
    });
    const done = view.status === 'done';
    el.input.disabled = done || view.finished;
    if (done) {
      el.hint.textContent = view.message || '比赛结束。';
      el.sentence.style.setProperty('--tws-me', view.winner === api.me ? 'var(--tw-coral,#D9624C)' : 'var(--tw-forest,#2F6B5B)');
    } else if (view.finished) {
      el.hint.textContent = '你已经打完，等待结算。';
    } else {
      el.hint.textContent = '逐字输入，先完整打完的人获胜。错字会被退回，输入法组字完成后自动生效。';
    }
    if (!composing && document.activeElement !== el.input) {
      const expected = view.target.slice(0, view.yourProgress);
      if (el.input.value.length < expected.length) el.input.value = expected;
    }
    syncInput(view);
  }

  function onInput(event) {
    if (event.isComposing || composing) return;
    accept();
  }

  function onCompositionStart() {
    composing = true;
  }

  function onCompositionEnd() {
    composing = false;
    window.setTimeout(accept, 0);
  }

  function onPaste(event) {
    event.preventDefault();
  }

  function onFocusTap(event) {
    if (event.target === el.input) return;
    el.input.focus();
  }

  el.input.addEventListener('input', onInput);
  el.input.addEventListener('compositionstart', onCompositionStart);
  el.input.addEventListener('compositionend', onCompositionEnd);
  el.input.addEventListener('paste', onPaste);
  wrap.addEventListener('pointerdown', onFocusTap);

  return {
    update,
    unmount() {
      window.clearTimeout(syncTimer);
      el.input.removeEventListener('input', onInput);
      el.input.removeEventListener('compositionstart', onCompositionStart);
      el.input.removeEventListener('compositionend', onCompositionEnd);
      el.input.removeEventListener('paste', onPaste);
      wrap.removeEventListener('pointerdown', onFocusTap);
      root.replaceChildren();
      style.remove();
    },
  };
}