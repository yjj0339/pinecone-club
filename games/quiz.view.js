const KEYS = ['A', 'B', 'C', 'D'];

const RESULT_TEXT = { right: '答对', wrong: '答错', none: '未作答' };

export function mount(root, api) {
  const style = document.createElement('style');
  style.textContent = `
.tws-quiz{display:flex;flex-direction:column;gap:10px;width:100%;max-width:560px;margin:0 auto;box-sizing:border-box;color:var(--tw-ink);font-family:inherit}
.tws-quiz-top{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;color:var(--tw-muted)}
.tws-quiz-prog{font-weight:700;color:var(--tw-ink)}
.tws-quiz-clock{font-variant-numeric:tabular-nums;font-weight:700;color:var(--tws-accent)}
.tws-quiz-track{height:8px;border:1.5px solid var(--tw-ink);border-radius:99px;background:var(--tw-card);overflow:hidden}
.tws-quiz-fill{height:100%;width:100%;border-radius:99px;background:var(--tws-accent);transition:width .18s linear}
.tws-quiz-card{background:var(--tw-card);border:1.5px solid var(--tw-ink);border-radius:18px;box-shadow:0 2px 0 rgba(42,38,35,.10);padding:14px;display:flex;flex-direction:column;gap:10px}
.tws-quiz-prompt{margin:0;font-size:17px;line-height:1.55;font-weight:700;min-height:2.9em}
.tws-quiz-options{display:flex;flex-direction:column;gap:8px}
.tws-quiz-option{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;box-sizing:border-box;margin:0;padding:8px 12px;text-align:left;border:1.5px solid var(--tw-line);border-radius:14px;background:#FBF6EC;color:var(--tw-ink);font:inherit;font-size:15px;line-height:1.4;cursor:pointer;transition:background-color .14s ease,border-color .14s ease,transform .14s ease}
.tws-quiz-option:not(:disabled):active{transform:translateY(1px)}
.tws-quiz-option:disabled{cursor:default;opacity:1}
.tws-quiz-key{flex:none;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border:1.5px solid var(--tw-ink);border-radius:8px;background:var(--tw-card);font-size:13px;font-weight:700}
.tws-quiz-text{flex:1;min-width:0;overflow-wrap:anywhere}
.tws-quiz-option.tws-pick-you{border-color:var(--tws-accent);background:#F8EAE2;box-shadow:inset 0 0 0 1px var(--tws-accent)}
.tws-quiz-option.tws-pick-you .tws-quiz-key{background:var(--tws-accent);color:#FFFDF8;border-color:var(--tws-accent)}
.tws-quiz-option.tws-pick-rival{border-color:var(--tws-rival);background:#EAF1EC}
.tws-quiz-option.tws-pick-rival .tws-quiz-key{background:var(--tws-rival);color:#FFFDF8;border-color:var(--tws-rival)}
.tws-quiz-result{min-height:20px;margin:0;text-align:center;font-size:13px;line-height:1.5;color:var(--tw-muted)}
.tws-quiz-result-right{color:var(--tw-forest);font-weight:700}
.tws-quiz-result-wrong{color:var(--tw-coral);font-weight:700}
.tws-quiz-scoreline{display:flex;gap:8px}
.tws-quiz-chip{flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:var(--tw-card);border:1.5px solid var(--tw-ink);border-radius:14px;box-shadow:0 2px 0 rgba(42,38,35,.10);font-size:13px;color:var(--tw-muted)}
.tws-quiz-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tws-quiz-chip b{flex:none;font-size:20px;line-height:1;color:var(--tw-ink);font-variant-numeric:tabular-nums}
.tws-quiz-you{border-left:5px solid var(--tws-accent)}
.tws-quiz-rival{border-right:5px solid var(--tws-rival)}
.tws-quiz-note{margin:0;text-align:center;font-size:12px;line-height:1.6;color:var(--tw-muted)}
@media (prefers-reduced-motion:reduce){.tws-quiz *{animation:none!important;transition:none!important}}
`;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.className = 'tws-quiz';
  wrap.style.setProperty('--tws-accent', api.me === 0 ? 'var(--tw-coral)' : 'var(--tw-forest)');
  wrap.style.setProperty('--tws-rival', api.me === 0 ? 'var(--tw-forest)' : 'var(--tw-coral)');
  const rivalName = api.names && api.names[1 - api.me] ? api.names[1 - api.me] : '对手';
  const top = document.createElement('div');
  top.className = 'tws-quiz-top';
  const prog = document.createElement('span');
  prog.className = 'tws-quiz-prog';
  prog.textContent = '第 1 / 8 题';
  const clock = document.createElement('span');
  clock.className = 'tws-quiz-clock';
  clock.textContent = '12 秒';
  top.append(prog, clock);
  const track = document.createElement('div');
  track.className = 'tws-quiz-track';
  const fill = document.createElement('div');
  fill.className = 'tws-quiz-fill';
  track.appendChild(fill);
  const card = document.createElement('div');
  card.className = 'tws-quiz-card';
  const prompt = document.createElement('p');
  prompt.className = 'tws-quiz-prompt';
  prompt.textContent = '准备答题';
  const options = document.createElement('div');
  options.className = 'tws-quiz-options';
  const buttons = [];
  for (let i = 0; i < 4; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tws-quiz-option';
    const key = document.createElement('span');
    key.className = 'tws-quiz-key';
    key.textContent = KEYS[i];
    const text = document.createElement('span');
    text.className = 'tws-quiz-text';
    button.append(key, text);
    button.addEventListener('click', () => sendAnswer(i));
    options.appendChild(button);
    buttons.push({ button, text });
  }
  card.append(prompt, options);
  const result = document.createElement('p');
  result.className = 'tws-quiz-result';
  result.textContent = '点击选项，或按数字键 1–4 作答';
  const scoreline = document.createElement('div');
  scoreline.className = 'tws-quiz-scoreline';
  const youChip = document.createElement('div');
  youChip.className = 'tws-quiz-chip tws-quiz-you';
  const youLabel = document.createElement('span');
  youLabel.textContent = '你';
  const youScore = document.createElement('b');
  youScore.textContent = '0';
  youChip.append(youLabel, youScore);
  const rivalChip = document.createElement('div');
  rivalChip.className = 'tws-quiz-chip tws-quiz-rival';
  const rivalLabel = document.createElement('span');
  rivalLabel.textContent = rivalName;
  const rivalScore = document.createElement('b');
  rivalScore.textContent = '0';
  rivalChip.append(rivalLabel, rivalScore);
  scoreline.append(youChip, rivalChip);
  const note = document.createElement('p');
  note.className = 'tws-quiz-note';
  note.textContent = '八题限时 · 答对得一分 · 答错扣一分';
  wrap.append(top, track, card, result, scoreline, note);
  root.appendChild(wrap);
  let current = null;
  let waiting = false;
  let lastNo = 0;
  function sendAnswer(index) {
    if (!current || waiting) return;
    if (current.status !== 'live' || current.revealed) return;
    if (current.youPicked !== -1) return;
    waiting = true;
    if (api.sound) api.sound('tap');
    api.send({ type: 'answer', index });
  }
  function onKey(event) {
    if (!current) return;
    const digit = Number(event.key);
    let index = -1;
    if (Number.isInteger(digit) && digit >= 1 && digit <= 4) index = digit - 1;
    else if (KEYS.includes(event.key.toUpperCase())) index = KEYS.indexOf(event.key.toUpperCase());
    if (index === -1) return;
    event.preventDefault();
    sendAnswer(index);
  }
  document.addEventListener('keydown', onKey);
  return {
    update(view) {
      current = view;
      if (view.questionNo !== lastNo) {
        lastNo = view.questionNo;
        waiting = false;
      }
      if (view.youPicked !== -1) waiting = false;
      youScore.textContent = String(view.scores[api.me]);
      rivalScore.textContent = String(view.scores[1 - api.me]);
      prog.textContent = `第 ${view.questionNo} / ${view.total} 题`;
      clock.textContent = view.revealed ? '揭晓中' : `${Math.ceil(view.questionLeft / 1000)} 秒`;
      const ratio = view.revealed ? 1 : Math.max(0, Math.min(1, view.questionLeft / view.questionTotal));
      fill.style.width = `${Math.round(ratio * 100)}%`;
      prompt.textContent = view.prompt;
      for (let i = 0; i < 4; i++) {
        const entry = buttons[i];
        entry.text.textContent = view.options[i] || '';
        const pickedYou = view.youPicked === i;
        const pickedRival = view.revealed && view.rivalPicked === i;
        entry.button.classList.toggle('tws-pick-you', pickedYou);
        entry.button.classList.toggle('tws-pick-rival', pickedRival);
        entry.button.disabled = view.status !== 'live' || view.revealed || view.youPicked !== -1;
        entry.button.setAttribute('aria-pressed', pickedYou || pickedRival ? 'true' : 'false');
      }
      if (view.status === 'done') {
        result.textContent = view.message;
        result.className = 'tws-quiz-result';
      } else if (view.revealed) {
        const you = view.feedback.you;
        const rival = view.feedback.rival;
        result.textContent = `你${RESULT_TEXT[you]} · ${rivalName}${RESULT_TEXT[rival]}`;
        result.className = `tws-quiz-result tws-quiz-result-${you === 'right' ? 'right' : you === 'wrong' ? 'wrong' : 'none'}`;
      } else if (view.youPicked !== -1) {
        result.textContent = '已作答，等待对手…';
        result.className = 'tws-quiz-result';
      } else {
        result.textContent = '点击选项，或按数字键 1–4 作答';
        result.className = 'tws-quiz-result';
      }
    },
    unmount() {
      document.removeEventListener('keydown', onKey);
      root.replaceChildren();
      style.remove();
    },
  };
}