import './styles.css';
import { CATALOG, gameInfo } from '../shared/catalog.js';
import { EMOJIS, PHASES, SERIES_OPTIONS } from '../shared/protocol.js';
import { coverFor, heroArt, logoMark, pausedStamp } from './art.js';
import { sound } from './audio.js';
import { Connection, rememberServer, resolveServer } from './net.js';
import { mountView } from './game.js';

const appRoot = document.querySelector('#app');

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(`pc.${key}`);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`pc.${key}`, JSON.stringify(value));
    } catch {}
  },
  del(key) {
    try {
      localStorage.removeItem(`pc.${key}`);
    } catch {}
  },
};

const app = {
  conn: null,
  server: '',
  serverSource: '',
  status: 'connecting',
  latency: 0,
  snapshot: null,
  identity: store.get('identity', null),
  nickname: store.get('nickname', ''),
  soundOn: store.get('sound', true) !== false,
  history: store.get('history', []),
  clockOffset: 0,
  mode: 'lobby',
  match: null,
  busy: false,
  voted: false,
  lastResultKey: '',
  lastPhase: '',
  pendingCode: new URLSearchParams(location.search).get('room') || '',
  toastTimer: null,
  destroyed: false,
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function el(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function initials(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase() || '?';
}

function mmss(ms) {
  if (ms == null || !Number.isFinite(ms)) return '--:--';
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function toast(message, ms = 2400) {
  const node = document.querySelector('#pc-toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(app.toastTimer);
  app.toastTimer = setTimeout(() => node.classList.remove('show'), ms);
}

function currentSnapshot() {
  return app.snapshot;
}

function isHost() {
  const snap = currentSnapshot();
  return Boolean(snap && snap.me.seat === snap.room.hostSeat);
}

function roomUrl(code) {
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('room', code);
  if (app.serverSource === 'query' || app.serverSource === 'manual') url.searchParams.set('s', app.server);
  return url.toString();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('已复制');
  } catch {
    const input = document.createElement('textarea');
    input.value = text;
    document.body.append(input);
    input.select();
    try {
      document.execCommand('copy');
      toast('已复制');
    } catch {
      toast('复制失败，手动选中复制吧。');
    }
    input.remove();
  }
}

const modalEl = () => document.querySelector('#pc-modal');

function modalBase(html) {
  const dialog = modalEl();
  dialog.innerHTML = html;
  if (!dialog.open) dialog.showModal();
  return dialog;
}

function ask({ title, text, ok = '确定', cancel = '取消' }) {
  return new Promise((resolve) => {
    const dialog = modalBase(`
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      <div class="pc-modal-actions">
        <button class="pc-btn ghost" data-cancel>${esc(cancel)}</button>
        <button class="pc-btn primary" data-ok>${esc(ok)}</button>
      </div>`);
    const finish = (value) => {
      dialog.close();
      resolve(value);
    };
    dialog.querySelector('[data-ok]').onclick = () => finish(true);
    dialog.querySelector('[data-cancel]').onclick = () => finish(false);
    dialog.oncancel = (event) => {
      event.preventDefault();
      finish(false);
    };
  });
}

function pickGame(currentId) {
  return new Promise((resolve) => {
    const dialog = modalBase(`
      <h3>换一款游戏</h3>
      <p>选好后回到准备状态，双方再一起准备开局。</p>
      <div class="pc-history" id="pc-pick-list" style="max-height:52vh;overflow:auto"></div>
      <div class="pc-modal-actions" style="margin-top:14px">
        <button class="pc-btn ghost" data-cancel>取消</button>
      </div>`);
    const list = dialog.querySelector('#pc-pick-list');
    for (const game of CATALOG) {
      const row = el(`<button class="pc-history-row" style="width:100%;text-align:left;cursor:pointer">
        <strong>${esc(game.name)}</strong>
        <span style="color:var(--tw-muted);font-size:11px;letter-spacing:.08em">${esc(game.en)}</span>
        <span class="pc-history-time">${currentId === game.id ? '当前' : esc(game.minutes + ' 分钟')}</span>
      </button>`);
      row.onclick = () => {
        dialog.close();
        resolve(game.id);
      };
      list.append(row);
    }
    dialog.querySelector('[data-cancel]').onclick = () => {
      dialog.close();
      resolve(null);
    };
    dialog.oncancel = (event) => {
      event.preventDefault();
      dialog.close();
      resolve(null);
    };
  });
}

function openHelp() {
  const dialog = modalBase(`
    <h3>怎么玩</h3>
    <p>一个人开房拿到 6 位房号，另一个人输入房号进来；也可以直接发邀请链接。双方都点准备后同步开局。系列赛可选 1 / 3 / 5 局，单局结束后可以再来一局或换游戏。</p>
    <p>对局中掉线会冻结计时，60 秒内回来可以继续；超时判负。每局结束都会落在本机战绩里。</p>
    <p>当前服务器：<span style="font-family:var(--tw-mono);font-size:12px">${esc(app.server || '未连接')}</span></p>
    <div class="pc-modal-actions">
      <button class="pc-btn ghost" data-settings>修改服务器</button>
      <button class="pc-btn primary" data-close>知道了</button>
    </div>`);
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.querySelector('[data-settings]').onclick = () => {
    dialog.close();
    openServerSettings();
  };
  dialog.oncancel = () => {};
}

function openServerSettings() {
  const dialog = modalBase(`
    <h3>服务器地址</h3>
    <p>填公网隧道地址或局域网地址，例如 https://xxx.trycloudflare.com 。留空表示自动发现。</p>
    <div class="pc-field"><input id="pc-server-input" placeholder="https://..." value="${esc(app.server)}" /></div>
    <div class="pc-modal-actions" style="margin-top:14px">
      <button class="pc-btn ghost" data-cancel>取消</button>
      <button class="pc-btn primary" data-save>保存并重连</button>
    </div>`);
  const input = dialog.querySelector('#pc-server-input');
  dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
  dialog.querySelector('[data-save]').onclick = () => {
    const value = input.value.trim();
    dialog.close();
    if (!value) {
      toast('地址不能为空；自动发现请看页面右下角说明。');
      return;
    }
    const known = rememberServer(value);
    if (!known) {
      toast('地址要以 http:// 或 https:// 开头。');
      return;
    }
    app.serverSource = 'manual';
    app.server = known;
    connect();
  };
}

function ensureNickname() {
  if (app.nickname.trim()) return true;
  const field = document.querySelector('#pc-name');
  if (field) field.focus();
  toast('先给自己起个名字。');
  return false;
}

function bindShell() {
  appRoot.innerHTML = `
    <header class="pc-header">
      <a class="pc-brand" href="./" id="pc-brand" aria-label="松果游戏社首页">
        ${logoMark()}
        <span class="pc-brand-text">
          <span class="pc-brand-en">PINECONE CLUB</span>
          <span class="pc-brand-cn">松果游戏社</span>
        </span>
      </a>
      <div class="pc-nav">
        <span class="pc-chip" id="pc-conn" data-state="connecting"><i class="pc-dot"></i><span id="pc-conn-text">连接中</span></span>
        <span class="pc-chip" id="pc-latency">-- ms</span>
        <button class="pc-icon-btn" id="pc-sound" aria-pressed="${app.soundOn}" title="音效">♪</button>
        <button class="pc-icon-btn" id="pc-help" title="玩法与设置">?</button>
      </div>
    </header>
    <main class="pc-main" id="pc-main"></main>
    <div class="pc-toast" id="pc-toast"></div>
    <dialog class="pc-modal" id="pc-modal"></dialog>`;
  document.querySelector('#pc-sound').onclick = () => {
    app.soundOn = !app.soundOn;
    store.set('sound', app.soundOn);
    sound.setMuted(!app.soundOn);
    document.querySelector('#pc-sound').setAttribute('aria-pressed', String(app.soundOn));
    if (app.soundOn) sound.play('tap');
  };
  document.querySelector('#pc-help').onclick = () => openHelp();
  document.querySelector('#pc-brand').onclick = async (event) => {
    event.preventDefault();
    if (!app.snapshot) return;
    const okay = await ask({ title: '回大厅', text: '回到大厅会关闭当前房间，确定吗？', ok: '回大厅' });
    if (okay) leaveRoom();
  };
  updateHeader();
}

function updateHeader() {
  const chip = document.querySelector('#pc-conn');
  const text = document.querySelector('#pc-conn-text');
  const latency = document.querySelector('#pc-latency');
  if (!chip || !text) return;
  const labels = { online: '已连接', connecting: '连接中', offline: '连接断开' };
  chip.dataset.state = app.status;
  text.textContent = labels[app.status] || '连接中';
  if (latency) {
    latency.textContent = app.status === 'online' ? `${app.latency} ms` : '-- ms';
    latency.style.opacity = app.status === 'online' ? '1' : '.5';
  }
}

function render() {
  updateHeader();
  const main = document.querySelector('#pc-main');
  if (!main) return;
  const snap = app.snapshot;
  let mode = 'lobby';
  if (snap) mode = snap.room.phase === PHASES.WAITING || snap.room.phase === PHASES.STARTING ? 'room' : 'match';
  if (mode !== 'match' && app.match) destroyMatch();
  const previous = app.mode;
  app.mode = mode;
  if (mode === 'lobby') renderLobby(main);
  else if (mode === 'room') renderRoom(main);
  else renderMatch(main);
  if (previous !== mode && mode !== 'match') app.voted = false;
}

function renderLobby(main) {
  const offline = app.status !== 'online';
  const cards = CATALOG.map((game) => `
    <button class="pc-card" data-game="${game.id}">
      <span class="pc-card-art">${coverFor(game.id)}</span>
      <span class="pc-card-body">
        <span class="pc-card-top"><span class="pc-card-name">${esc(game.name)}</span><span class="pc-card-en">${esc(game.en)}</span></span>
        <span class="pc-card-tag">${esc(game.tagline)}</span>
        <span class="pc-card-meta"><span class="pc-pill tint-${game.tint}">${esc(game.group)}</span><span class="pc-pill">${game.minutes} 分钟</span></span>
      </span>
    </button>`).join('');
  const history = app.history.length ? `
    <section>
      <div class="pc-section-head"><h2 class="pc-section-title">本机战绩</h2><p class="pc-section-note">只存在这台电脑的浏览器里</p></div>
      <div class="pc-history">${app.history.slice(0, 6).map((item) => `
        <div class="pc-history-row">
          <strong>${item.outcome === 'win' ? '胜' : item.outcome === 'draw' ? '平' : '负'}</strong>
          <span>${esc(item.name)}</span>
          <span style="color:var(--tw-muted)">对 ${esc(item.opponent)} · 系列 ${item.wins[0]}:${item.wins[1]}</span>
          <span class="pc-history-time">${new Date(item.at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
        </div>`).join('')}</div>
    </section>` : '';
  main.innerHTML = `
    <section class="pc-hero">
      <div>
        <p class="pc-kicker">PINECONE CLUB</p>
        <h1 class="pc-title">两个人，<em>二十款</em><br />小游戏。</h1>
        <p class="pc-lede">开一间房，把六位房号发给朋友；或者选中一款直接开。纸片一样的棋盘、糖果色的冰球、会跳的坦克，全部从零画出来。</p>
        ${offline ? `<div class="pc-banner" style="margin-bottom:14px">现在连不上联机服务器，可以稍后自动重试，或到右上角「?」里手动填写服务器地址。</div>` : ''}
        <div class="pc-toolbar" style="margin-bottom:12px">
          <div class="pc-field" style="min-width:210px">
            <input id="pc-name" maxlength="12" placeholder="给自己起个名字" value="${esc(app.nickname)}" autocomplete="nickname" />
          </div>
          <button class="pc-btn primary" id="pc-random">随机开一间房</button>
        </div>
        <div class="pc-toolbar">
          <div class="pc-field" style="min-width:190px">
            <input id="pc-code" maxlength="6" inputmode="numeric" placeholder="输入六位房号" value="${esc(app.pendingCode)}" />
          </div>
          <button class="pc-btn forest" id="pc-join">用房间号加入</button>
        </div>
        <p class="pc-status-line" style="margin-top:12px">同一台电脑想双人练习：开两个浏览器窗口，用房号互相加入即可。</p>
      </div>
      <div class="pc-hero-art">${heroArt()}</div>
    </section>
    <section>
      <div class="pc-section-head">
        <h2 class="pc-section-title">游戏架</h2>
        <p class="pc-section-note">点任意一款直接开房 · 20 款</p>
      </div>
      <div class="pc-grid">${cards}</div>
    </section>
    ${history}
    <footer class="pc-footer">
      <span>PINECONE CLUB · 松果游戏社 · 从零手写的双人小游戏合集</span>
      <span>房间与对局均在服务端结算 · 断线 60 秒内可恢复</span>
    </footer>`;
  const nameInput = main.querySelector('#pc-name');
  nameInput.oninput = () => {
    app.nickname = nameInput.value;
    store.set('nickname', app.nickname);
  };
  main.querySelector('#pc-random').onclick = () => {
    const game = CATALOG[Math.floor(Math.random() * CATALOG.length)];
    createRoom(game.id);
  };
  main.querySelector('#pc-join').onclick = () => joinRoom(main.querySelector('#pc-code').value);
  main.querySelectorAll('[data-game]').forEach((button) => {
    button.onclick = () => createRoom(button.dataset.game);
  });
}

function renderRoom(main) {
  const snap = currentSnapshot();
  if (!snap) {
    render();
    return;
  }
  const { room, me } = snap;
  const mine = room.players[me.seat];
  const other = room.players[1 - me.seat];
  const host = me.seat === room.hostSeat;
  const starting = room.phase === PHASES.STARTING;
  const game = gameInfo(room.gameId);
  const canReady = Boolean(mine && other);
  const readyLabel = !other ? '等对手进来' : mine && mine.ready ? '取消准备' : '我准备好了';
  const seriesButtons = SERIES_OPTIONS.map((value) => `<button data-series="${value}" aria-pressed="${room.series.total === value}">${value} 局</button>`).join('');
  const invite = roomUrl(room.code);
  main.innerHTML = `
    <section style="position:relative">
      <div class="pc-room">
        <div class="pc-panel pc-room-main">
          <div class="pc-room-code-row">
            <div>
              <p class="pc-kicker">房间号</p>
              <div class="pc-room-code" id="pc-room-code">${esc(room.code)}</div>
              <p class="pc-room-sub">系列赛 ${room.series.total} 局 · 当前第 ${room.series.round} 局</p>
            </div>
            <div class="pc-toolbar">
              <button class="pc-btn small" id="pc-copy-code">复制房号</button>
              <button class="pc-btn small" id="pc-copy-link">复制邀请链接</button>
            </div>
          </div>
          <div class="pc-tickets">
            ${room.players.map((player, seat) => player ? `
              <div class="pc-ticket ${player.ready && room.phase === PHASES.WAITING ? 'ready' : ''} ${player.connected ? '' : 'offline'}" data-seat="${seat}">
                <span class="pc-avatar">${esc(initials(player.name))}</span>
                <span class="pc-ticket-body">
                  <span class="pc-ticket-name">${esc(player.name)}${seat === room.hostSeat ? ' · 房主' : ''}${seat === me.seat ? ' · 你' : ''}</span>
                  <span class="pc-ticket-state">${player.connected ? (player.ready ? '已准备' : '在线') : '掉线中，等待回来'}</span>
                </span>
              </div>` : `
              <div class="pc-ticket pc-empty-seat" data-seat="${seat}">
                <span class="pc-ticket-state">等一位朋友进来</span>
              </div>`).join('')}
          </div>
          <div class="pc-banner ${room.paused ? '' : 'pc-hidden'}" id="pc-room-pause">${pausedStamp()} 对手暂时掉线，计时已冻结；60 秒内回来可以继续，超时判负。</div>
          <div class="pc-toolbar">
            <button class="pc-btn primary" id="pc-ready" ${canReady && !starting ? '' : 'disabled'}>${readyLabel}</button>
            <button class="pc-btn ghost" id="pc-leave">离开房间</button>
            ${host ? '<button class="pc-btn small" id="pc-change-game">换一款</button>' : ''}
          </div>
          <p class="pc-status-line">${starting ? '都准备好了，倒计时结束后同步开局。' : other ? '两边都点准备后自动开局。' : '把房号或邀请链接发给朋友。'}</p>
        </div>
        <aside class="pc-panel pc-room-side">
          <h3>本局游戏</h3>
          <div class="pc-mini-game">
            <span class="pc-mini-art">${coverFor(room.gameId)}</span>
            <span>
              <div class="pc-mini-name">${esc(game.name)}</div>
              <div class="pc-mini-sub">${esc(game.tagline)}</div>
            </span>
          </div>
          <div>
            <h3 style="margin-bottom:8px">系列赛长度</h3>
            <div class="pc-segment" id="pc-series">${seriesButtons}</div>
            ${host ? '' : '<p class="pc-status-line" style="margin-top:6px">只有房主可以调整。</p>'}
          </div>
          <div>
            <h3 style="margin-bottom:8px">邀请链接</h3>
            <div class="pc-invite">
              <input readonly value="${esc(invite)}" id="pc-invite-input" />
              <button class="pc-btn small" id="pc-copy-invite">复制</button>
            </div>
          </div>
          <p class="pc-status-line">${host ? '你是房主：可以换游戏、改系列赛长度。' : '房主可以换游戏、改系列赛长度。'}</p>
        </aside>
      </div>
      ${starting ? `<div class="pc-overlay" style="position:absolute;inset:0"><p class="pc-kicker">马上开局</p><div class="pc-overlay-number" id="pc-countdown">3</div><p class="pc-overlay-sub">${esc(game.name)} · 第 ${room.series.round} / ${room.series.total} 局</p></div>` : ''}
    </section>`;
  main.querySelector('#pc-copy-code').onclick = () => copyText(room.code);
  main.querySelector('#pc-copy-link').onclick = () => copyText(invite);
  main.querySelector('#pc-copy-invite').onclick = () => copyText(invite);
  main.querySelector('#pc-ready').onclick = () => toggleReady();
  main.querySelector('#pc-leave').onclick = () => leaveRoom();
  const change = main.querySelector('#pc-change-game');
  if (change) change.onclick = () => changeGameFlow();
  main.querySelectorAll('#pc-series button').forEach((button) => {
    button.onclick = () => {
      if (!host) {
        toast('只有房主可以调整系列赛长度。');
        return;
      }
      selectGame(room.gameId, Number(button.dataset.series));
    };
  });
  tickCountdown();
}

function matchKey(snap) {
  return `${snap.room.code}:${snap.room.gameId}:${snap.me.seat}`;
}

function renderMatch(main) {
  const snap = currentSnapshot();
  if (!snap) return;
  const key = matchKey(snap);
  if (app.match && app.match.key === key) {
    updateMatch();
    return;
  }
  if (app.match) destroyMatch();
  const { room, me } = snap;
  const game = gameInfo(room.gameId);
  const names = room.players.map((player) => (player ? player.name : '对手'));
  main.innerHTML = `
    <section class="pc-match">
      <div class="pc-scoreboard">
        <div class="pc-side-ticket" data-seat="0" id="pc-ticket-0">
          <span class="pc-avatar" style="background:var(--tw-coral)">${esc(initials(names[0]))}</span>
          <div style="min-width:0">
            <div class="pc-side-name">${esc(names[0])}${me.seat === 0 ? ' · 你' : ''}</div>
            <div class="pc-side-sub">系列赛胜场</div>
          </div>
          <div class="pc-side-score" id="pc-wins-0">0</div>
        </div>
        <div class="pc-versus">
          <div class="pc-versus-name">${esc(game.name)}</div>
          <div class="pc-versus-timer" id="pc-timer">--:--</div>
          <div class="pc-versus-timer" id="pc-round">第 ${room.series.round} / ${room.series.total} 局</div>
        </div>
        <div class="pc-side-ticket" data-seat="1" id="pc-ticket-1">
          <span class="pc-avatar" style="background:var(--tw-forest)">${esc(initials(names[1]))}</span>
          <div style="min-width:0">
            <div class="pc-side-name">${esc(names[1])}${me.seat === 1 ? ' · 你' : ''}</div>
            <div class="pc-side-sub">系列赛胜场</div>
          </div>
          <div class="pc-side-score" id="pc-wins-1">0</div>
        </div>
      </div>
      <div class="pc-banner pc-hidden" id="pc-pause">${pausedStamp()} 对手暂时掉线，计时已冻结；60 秒内回来可以继续，超时判负。</div>
      <div class="pc-stage">
        <div id="pc-game-root"></div>
        <div id="pc-overlay"></div>
      </div>
      <div class="pc-tools">
        <div class="pc-emoji-row">
          ${EMOJIS.map((emoji) => `<button class="pc-emoji-btn" data-emoji="${emoji}" aria-label="发表情 ${emoji}">${emoji}</button>`).join('')}
        </div>
        <div class="pc-toolbar">
          <button class="pc-btn ghost small" id="pc-resign">认输</button>
          <button class="pc-btn ghost small" id="pc-leave-match">离开</button>
        </div>
      </div>
      <p class="pc-status-line" id="pc-match-note"></p>
    </section>`;
  const gameRoot = main.querySelector('#pc-game-root');
  const api = {
    me: snap.me.seat,
    names,
    send: (action) => sendAction(action),
    sound: (name) => sound.play(name),
  };
  app.match = {
    key,
    root: gameRoot,
    view: mountView(room.gameId, gameRoot, api),
    els: {
      names: [main.querySelector('#pc-ticket-0 .pc-side-name'), main.querySelector('#pc-ticket-1 .pc-side-name')],
      wins: [main.querySelector('#pc-wins-0'), main.querySelector('#pc-wins-1')],
      tickets: [main.querySelector('#pc-ticket-0'), main.querySelector('#pc-ticket-1')],
      timer: main.querySelector('#pc-timer'),
      round: main.querySelector('#pc-round'),
      pause: main.querySelector('#pc-pause'),
      overlay: main.querySelector('#pc-overlay'),
      note: main.querySelector('#pc-match-note'),
      stage: main.querySelector('.pc-stage'),
    },
    resultKey: '',
  };
  main.querySelectorAll('[data-emoji]').forEach((button) => {
    button.onclick = () => sendEmoji(button.dataset.emoji);
  });
  main.querySelector('#pc-resign').onclick = () => resign();
  main.querySelector('#pc-leave-match').onclick = () => leaveRoom();
  updateMatch();
}

function destroyMatch() {
  if (!app.match) return;
  try {
    app.match.view?.unmount?.();
  } catch {}
  app.match = null;
}

function updateMatch() {
  const snap = currentSnapshot();
  if (!snap || !app.match) return;
  const { room, me, game } = snap;
  const data = app.match;
  const els = data.els;
  if (game && data.view) {
    try {
      data.view.update(game);
    } catch {}
  }
  els.names[0].textContent = `${room.players[0] ? room.players[0].name : '对手'}${me.seat === 0 ? ' · 你' : ''}`;
  els.names[1].textContent = `${room.players[1] ? room.players[1].name : '对手'}${me.seat === 1 ? ' · 你' : ''}`;
  els.wins[0].textContent = room.series.wins[0];
  els.wins[1].textContent = room.series.wins[1];
  els.round.textContent = `第 ${room.series.round} / ${room.series.total} 局`;
  const turn = game && Number.isInteger(game.turn) ? game.turn : -2;
  els.tickets[0].style.outline = turn === 0 ? '2px solid var(--tw-ink)' : '';
  els.tickets[1].style.outline = turn === 1 ? '2px solid var(--tw-ink)' : '';
  els.pause.classList.toggle('pc-hidden', !room.paused);
  const left = game ? game.matchLeft ?? game.turnLeft ?? null : null;
  els.timer.textContent = room.paused ? '暂停' : mmss(left);
  if (room.phase === PHASES.DONE) {
    const resultKey = `${room.code}:${room.series.round}:${room.gameId}:${room.series.wins.join('-')}`;
    if (app.match.resultKey !== resultKey) {
      app.match.resultKey = resultKey;
      buildResult(els.overlay, snap);
    }
  } else {
    els.overlay.innerHTML = '';
    app.match.resultKey = '';
    app.voted = false;
  }
  els.note.textContent = room.paused ? '对局冻结中，等对手回来。' : '操作会即时同步给对手；卡顿时先看右上角延迟。';
  if (room.players[me.seat] && !room.players[me.seat].connected) els.note.textContent = '你掉线了，正在重连……';
}

function buildResult(overlay, snap) {
  const { room, me } = snap;
  const result = room.result || { winner: -1, message: '本局结束。' };
  const winnerName = result.winner === 0 || result.winner === 1 ? room.players[result.winner]?.name || '对手' : '';
  const title = result.winner === -1 ? '平局' : `${winnerName} 获胜`;
  const mine = result.winner === me.seat ? 'win' : result.winner === -1 ? 'draw' : 'lose';
  sound.play(mine === 'win' ? 'win' : mine === 'lose' ? 'lose' : 'tap');
  const scores = snap.game && Array.isArray(snap.game.scores) ? snap.game.scores : null;
  overlay.innerHTML = `
    <div class="pc-overlay">
      <p class="pc-kicker">第 ${room.series.round} / ${room.series.total} 局结束</p>
      <h2 class="pc-overlay-title">${esc(title)}</h2>
      <p class="pc-overlay-sub">${esc(result.message)}</p>
      <div class="pc-result-wins">
        <span>系列赛 <strong>${room.series.wins[0]}</strong> : <strong>${room.series.wins[1]}</strong></span>
        ${scores ? `<span>本局 ${scores[0]} : ${scores[1]}</span>` : ''}
      </div>
      <div class="pc-toolbar" style="justify-content:center">
        <button class="pc-btn primary" id="pc-again">再来一局</button>
        ${me.seat === room.hostSeat ? '<button class="pc-btn" id="pc-change">换游戏</button>' : ''}
        <button class="pc-btn ghost" id="pc-back">回大厅</button>
      </div>
      <p class="pc-status-line" id="pc-again-note">双方都点「再来一局」就进入下一局；系列赛打满后自动开新一轮。</p>
    </div>`;
  overlay.querySelector('#pc-again').onclick = () => sendAgain();
  const change = overlay.querySelector('#pc-change');
  if (change) change.onclick = () => changeGameFlow();
  overlay.querySelector('#pc-back').onclick = () => leaveRoom();
  rememberResult(snap);
}

function rememberResult(snap) {
  const { room, me } = snap;
  if (!room.result) return;
  const key = `${room.code}:${room.gameId}:${room.series.round}:${room.series.wins.join('-')}`;
  if (app.lastResultKey === key) return;
  app.lastResultKey = key;
  const info = gameInfo(room.gameId);
  const outcome = room.result.winner === -1 ? 'draw' : room.result.winner === me.seat ? 'win' : 'lose';
  const entry = {
    gameId: room.gameId,
    name: info.name,
    at: Date.now(),
    outcome,
    wins: room.series.wins.slice(),
    round: room.series.round,
    total: room.series.total,
    opponent: room.players[1 - me.seat]?.name || '对手',
  };
  app.history = [entry, ...app.history].slice(0, 12);
  store.set('history', app.history);
}

function tickCountdown() {
  const node = document.querySelector('#pc-countdown');
  if (!node) return;
  const snap = currentSnapshot();
  if (!snap || !snap.room.startsAt) return;
  const left = Math.max(0, snap.room.startsAt - (Date.now() + app.clockOffset));
  node.textContent = String(Math.ceil(left / 1000));
}

async function createRoom(gameId) {
  if (app.busy) return;
  if (!ensureNickname()) return;
  if (!app.conn || app.status !== 'online') {
    toast('还没连上服务器，先检查网络或手动填服务器地址。');
    return;
  }
  app.busy = true;
  const result = await app.conn.request('create', { name: app.nickname.trim(), gameId });
  app.busy = false;
  if (!result || !result.ok) {
    toast(result?.message || '开房失败，再试一次。');
    return;
  }
  app.identity = { code: result.code, token: result.token, seat: result.seat };
  store.set('identity', app.identity);
  app.conn.setSeq(result.seq);
  app.voted = false;
  sound.play('join');
  if (location.search) history.replaceState(null, '', location.pathname);
}

async function joinRoom(rawCode) {
  if (app.busy) return;
  if (!ensureNickname()) return;
  const code = String(rawCode || '').trim();
  if (!/^\d{6}$/.test(code)) {
    toast('房号是六位数字。');
    return;
  }
  if (!app.conn || app.status !== 'online') {
    toast('还没连上服务器，先检查网络。');
    return;
  }
  app.busy = true;
  const result = await app.conn.request('join', { code, name: app.nickname.trim() });
  app.busy = false;
  if (!result || !result.ok) {
    toast(result?.message || '加入失败，检查一下房号。');
    return;
  }
  app.identity = { code: result.code, token: result.token, seat: result.seat };
  store.set('identity', app.identity);
  app.conn.setSeq(result.seq);
  sound.play('join');
  if (location.search) history.replaceState(null, '', location.pathname);
}

async function tryResume() {
  if (!app.identity || !app.conn || app.status !== 'online') return false;
  const result = await app.conn.request('resume', { code: app.identity.code, token: app.identity.token });
  if (result && result.ok) {
    app.identity = { code: result.code, token: result.token, seat: result.seat };
    app.conn.setSeq(result.seq);
    return true;
  }
  if (result && (result.code === 'NOTFOUND' || result.code === 'AUTH')) {
    app.identity = null;
    store.del('identity');
    app.snapshot = null;
  }
  return false;
}

async function toggleReady() {
  const snap = currentSnapshot();
  if (!snap || snap.room.phase !== PHASES.WAITING) return;
  const mine = snap.room.players[snap.me.seat];
  if (!mine || !snap.room.players[1 - snap.me.seat]) {
    toast('等对手进来再准备。');
    return;
  }
  const result = await app.conn.request('ready', { ready: !mine.ready });
  if (!result.ok) toast(result.message);
  else sound.play('ready');
}

async function selectGame(gameId, series) {
  const snap = currentSnapshot();
  if (!snap) return;
  const total = series || snap.room.series.total;
  const result = await app.conn.request('select', { gameId, series: total });
  if (!result.ok) toast(result.message);
}

async function changeGameFlow() {
  const snap = currentSnapshot();
  if (!snap) return;
  if (snap.me.seat !== snap.room.hostSeat) {
    toast('只有房主能换游戏。');
    return;
  }
  if (snap.room.phase === PHASES.DONE) {
    const result = await app.conn.request('change');
    if (!result.ok) {
      toast(result.message);
      return;
    }
  }
  const picked = await pickGame(snap.room.gameId);
  if (picked) await selectGame(picked, snap.room.series.total);
}

async function sendAgain() {
  if (app.voted) return;
  const result = await app.conn.request('again');
  if (!result.ok) {
    toast(result.message);
    return;
  }
  app.voted = true;
  const button = document.querySelector('#pc-again');
  if (button) button.disabled = true;
  const note = document.querySelector('#pc-again-note');
  if (note) note.textContent = '已申请，等对手也点「再来一局」。';
}

async function sendAction(action) {
  const snap = currentSnapshot();
  if (!snap || snap.room.phase !== PHASES.LIVE) return;
  const result = await app.conn.act(action);
  if (result && !result.ok && result.code !== 'DUPLICATE' && result.code !== 'SLOW') {
    toast(result.message);
  }
}

async function sendEmoji(emoji) {
  const result = await app.conn.request('emoji', { emoji });
  if (!result.ok && result.code !== 'SLOW') toast(result.message);
}

async function resign() {
  const snap = currentSnapshot();
  if (!snap) return;
  if (snap.room.phase !== PHASES.LIVE) {
    toast('现在不能认输。');
    return;
  }
  const okay = await ask({ title: '认输', text: '认输会立刻结束本局，本局判对手获胜。确定吗？', ok: '认输' });
  if (!okay) return;
  const result = await app.conn.request('resign');
  if (!result.ok) toast(result.message);
}

async function leaveRoom() {
  const snap = currentSnapshot();
  if (!snap) return;
  const live = snap.room.phase === PHASES.LIVE;
  const okay = await ask({
    title: live ? '离开对局' : '离开房间',
    text: live ? '对局还没结束，离开会把本局判给对手，并关闭房间。' : '离开会关闭房间。',
    ok: '离开',
  });
  if (!okay) return;
  await app.conn.request('leave');
  cleanupLocal();
  toast('已回到大厅。');
}

function cleanupLocal() {
  destroyMatch();
  app.snapshot = null;
  app.identity = null;
  store.del('identity');
  app.voted = false;
  app.lastPhase = '';
  if (location.search) history.replaceState(null, '', location.pathname);
  render();
}

function floatEmoji(seat, emoji) {
  const node = document.createElement('div');
  node.className = 'pc-float';
  node.textContent = emoji;
  node.style.left = seat === 0 ? '12%' : '72%';
  document.body.append(node);
  setTimeout(() => node.remove(), 2600);
}

function handleSnapshot(snap) {
  if (!snap || !snap.room) return;
  const previousPhase = app.snapshot ? app.snapshot.room.phase : '';
  app.snapshot = snap;
  app.clockOffset = snap.serverNow - Date.now();
  const phase = snap.room.phase;
  if (phase === PHASES.DONE && previousPhase !== PHASES.DONE) app.voted = false;
  if (phase === PHASES.STARTING && previousPhase !== PHASES.STARTING) sound.play('tick');
  if (snap.me && Number.isInteger(snap.me.seq) && app.conn) {
    const next = snap.me.seq + 1;
    if (next > app.conn.seq) app.conn.seq = next;
  }
  render();
}

function handleClosed(payload) {
  const message = payload?.message || '房间已关闭。';
  cleanupLocal();
  toast(message, 3200);
}

function connect() {
  if (app.conn) app.conn.close();
  const connection = new Connection({
    onStatus: (status) => {
      app.status = status;
      updateHeader();
      if (status === 'online') {
        if (app.identity) {
          tryResume().then((resumed) => {
            if (!resumed) render();
          });
        } else {
          render();
        }
      } else if (status === 'offline' && app.snapshot) {
        toast('连接断开，正在重连……', 3000);
      } else if (status === 'offline' && app.mode === 'lobby') {
        render();
      }
    },
    onSnapshot: (snap) => handleSnapshot(snap),
    onEmoji: (data) => {
      if (data && EMOJIS.includes(data.emoji)) floatEmoji(data.seat, data.emoji);
    },
    onClosed: (payload) => handleClosed(payload),
    onNotice: (payload) => toast(payload?.message || '服务器通知。'),
    onLatency: (value) => {
      app.latency = value;
      updateHeader();
    },
    onHello: (data) => {
      if (data && data.version && data.version !== '1.0.0') toast('服务器版本不一致，刷新一下页面。');
    },
  });
  app.conn = connection;
  app.status = 'connecting';
  updateHeader();
  connection.open(app.server);
}

async function boot() {
  bindShell();
  sound.setMuted(!app.soundOn);
  const found = await resolveServer();
  app.server = found.server;
  app.serverSource = found.source;
  if (!app.server) {
    app.status = 'offline';
    updateHeader();
    render();
    toast('没有找到联机服务器地址，可以点右上角「?」手动填写。', 5000);
    return;
  }
  connect();
  render();
  setInterval(() => {
    if (app.mode === 'room') tickCountdown();
  }, 200);
}

boot();