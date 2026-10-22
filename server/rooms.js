import { randomBytes, randomInt } from 'node:crypto';
import { LIMITS, PHASES, SERIES_OPTIONS, EMOJIS } from '../shared/protocol.js';
import { GAME_IDS, gameInfo } from '../shared/catalog.js';
import { engineFor } from '../games/registry.js';

const token = () => randomBytes(18).toString('hex');
const nameOf = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.name) || '新玩家';
const no = (code, message) => ({ ok: false, code, message });

function newRoom(code, player, now, gameId) {
  return {
    code,
    createdAt: now,
    hostSeat: 0,
    players: [player, null],
    gameId,
    seriesTotal: 1,
    round: 1,
    wins: [0, 0],
    phase: PHASES.WAITING,
    startsAt: null,
    gameStartAt: null,
    pausedAt: null,
    pausedTotal: 0,
    state: null,
    seed: 0,
    result: null,
    againVotes: [false, false],
    lastActivity: now,
  };
}

function newPlayer(name, now) {
  return { name, token: token(), socketId: null, connected: true, ready: false, seq: 0, protectedUntil: null, lastEmoji: 0 };
}

export class Rooms {
  constructor({ io, now = Date.now, countdownMs = LIMITS.countdownMs, tickMs = LIMITS.tickMs, seed = () => randomInt(1, 2 ** 31 - 1), onFinished = () => {} }) {
    this.io = io;
    this.now = now;
    this.countdownMs = countdownMs;
    this.tickMs = tickMs;
    this.seed = seed;
    this.onFinished = onFinished;
    this.rooms = new Map();
    this.bySocket = new Map();
    this.buckets = new Map();
    this.timer = null;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.tickMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  allowed(socketId) {
    const now = this.now();
    const bucket = this.buckets.get(socketId);
    if (!bucket || now - bucket.start > LIMITS.rateWindowMs) {
      this.buckets.set(socketId, { start: now, count: 1 });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= LIMITS.rateMax;
  }

  locate(socketId) {
    const hit = this.bySocket.get(socketId);
    if (!hit) return null;
    const room = this.rooms.get(hit.code);
    if (!room) {
      this.bySocket.delete(socketId);
      return null;
    }
    return { room, seat: hit.seat, player: room.players[hit.seat] };
  }

  code() {
    for (let i = 0; i < 60; i++) {
      const value = String(randomInt(100000, 1000000));
      if (!this.rooms.has(value)) return value;
    }
    return String(randomInt(100000, 1000000));
  }

  gameNow(room) {
    return this.now() - room.gameStartAt - room.pausedTotal;
  }

  connected(room) {
    return room.players.filter((player) => player && player.connected).length;
  }

  create(socket, payload = {}) {
    if (!this.allowed(socket.id)) return no('SLOW', '操作太频繁，稍等一下。');
    if (this.bySocket.has(socket.id)) return no('BUSY', '你已经在一个房间里了。');
    if (this.rooms.size >= LIMITS.maxRooms) return no('BUSY', '房间太多了，稍后再试。');
    const now = this.now();
    const player = newPlayer(nameOf(payload.name), now);
    player.socketId = socket.id;
    const room = newRoom(this.code(), player, now, payload.gameId && GAME_IDS.includes(payload.gameId) ? payload.gameId : 'gomoku');
    this.rooms.set(room.code, room);
    socket.join(room.code);
    this.bySocket.set(socket.id, { code: room.code, seat: 0 });
    const result = { ok: true, code: room.code, seat: 0, token: player.token, seq: 0 };
    this.push(room);
    return result;
  }

  join(socket, payload = {}) {
    if (!this.allowed(socket.id)) return no('SLOW', '操作太频繁，稍等一下。');
    if (this.bySocket.has(socket.id)) return no('BUSY', '你已经在一个房间里了。');
    const room = this.rooms.get(String(payload.code ?? '').trim());
    if (!room) return no('NOTFOUND', '房间不存在，检查一下房号。');
    if (room.phase !== PHASES.WAITING) return no('STARTED', '这局已经开始了，等下一局吧。');
    if (room.players[1]) return no('FULL', '房间已经满了。');
    const now = this.now();
    const player = newPlayer(nameOf(payload.name), now);
    player.socketId = socket.id;
    room.players[1] = player;
    room.lastActivity = now;
    socket.join(room.code);
    this.bySocket.set(socket.id, { code: room.code, seat: 1 });
    this.push(room);
    return { ok: true, code: room.code, seat: 1, token: player.token, seq: 0 };
  }

  resume(socket, payload = {}) {
    if (!this.allowed(socket.id)) return no('SLOW', '操作太频繁，稍等一下。');
    const room = this.rooms.get(String(payload.code ?? '').trim());
    if (!room) return no('NOTFOUND', '房间不存在或已关闭。');
    const seat = room.players.findIndex((player) => player && player.token === payload.token);
    if (seat < 0) return no('AUTH', '身份已失效，请重新加入。');
    const player = room.players[seat];
    const old = player.socketId ? this.io.sockets.sockets.get(player.socketId) : null;
    if (old && old.id !== socket.id) {
      old.emit('notice', { type: 'replaced', message: '这个座位在新窗口里重新连接了。' });
      old.leave(room.code);
      this.bySocket.delete(old.id);
    }
    if (this.bySocket.has(socket.id)) this.bySocket.delete(socket.id);
    player.socketId = socket.id;
    player.connected = true;
    player.protectedUntil = null;
    const now = this.now();
    if (room.pausedAt) {
      room.pausedTotal += now - room.pausedAt;
      room.pausedAt = null;
    }
    room.lastActivity = now;
    socket.join(room.code);
    this.bySocket.set(socket.id, { code: room.code, seat });
    this.push(room);
    return { ok: true, code: room.code, seat, token: player.token, seq: player.seq };
  }

  select(socket, payload = {}) {
    const hit = this.locate(socket.id);
    if (!hit) return no('AUTH', '先进入房间。');
    const { room, seat } = hit;
    if (seat !== room.hostSeat) return no('HOST', '只有房主可以选游戏。');
    if (room.phase !== PHASES.WAITING) return no('STARTED', '对局进行中，不能换游戏。');
    if (!GAME_IDS.includes(payload.gameId)) return no('GAME', '没有这款游戏。');
    room.gameId = payload.gameId;
    if (SERIES_OPTIONS.includes(payload.series)) room.seriesTotal = payload.series;
    room.lastActivity = this.now();
    this.push(room);
    return { ok: true };
  }

  ready(socket, payload = {}) {
    const hit = this.locate(socket.id);
    if (!hit) return no('AUTH', '先进入房间。');
    const { room, seat, player } = hit;
    if (room.phase !== PHASES.WAITING) return no('STARTED', '现在不能改准备状态。');
    if (!room.players[0] || !room.players[1]) return no('WAIT', '等对手进来再准备。');
    player.ready = payload.ready !== false;
    room.lastActivity = this.now();
    if (room.players[0].ready && room.players[1].ready) {
      room.phase = PHASES.STARTING;
      room.startsAt = this.now() + this.countdownMs;
      room.players.forEach((item) => { item.ready = false; });
    }
    this.push(room);
    return { ok: true };
  }

  act(socket, payload = {}) {
    const hit = this.locate(socket.id);
    if (!hit) return no('AUTH', '先进入房间。');
    const { room, seat, player } = hit;
    if (room.phase !== PHASES.LIVE) return no('PHASE', '现在还不能操作。');
    if (room.pausedAt) return no('PAUSED', '对手暂离，对局已冻结。');
    if (!Number.isInteger(payload.seq) || payload.seq <= player.seq) return no('DUPLICATE', '这次操作已处理。');
    if (!this.allowed(socket.id)) return no('SLOW', '操作太频繁，稍等一下。');
    const engine = engineFor(room.gameId);
    if (!engine) return no('GAME', '游戏不可用。');
    let accepted = false;
    try {
      accepted = engine.act(room.state, seat, payload.action, this.gameNow(room)) === true;
    } catch {
      accepted = false;
    }
    if (!accepted) return no('MOVE', '这个操作不被接受。');
    player.seq = payload.seq;
    room.state.now = this.gameNow(room);
    this.push(room);
    return { ok: true };
  }

  again(socket) {
    const hit = this.locate(socket.id);
    if (!hit) return no('AUTH', '先进入房间。');
    const { room, seat } = hit;
    if (room.phase !== PHASES.DONE) return no('PHASE', '本局还没结束。');
    room.againVotes[seat] = true;
    if (room.againVotes[0] && room.againVotes[1]) {
      room.againVotes = [false, false];
      if (room.round < room.seriesTotal) room.round += 1;
      else {
        room.round = 1;
        room.wins = [0, 0];
      }
      room.phase = PHASES.STARTING;
      room.startsAt = this.now() + this.countdownMs;
      room.result = null;
      room.state = null;
    }
    room.lastActivity = this.now();
    this.push(room);
    return { ok: true };
  }

  change(socket) {
    const hit = this.locate(socket.id);
    if (!hit) return no('AUTH', '先进入房间。');
    const { room, seat } = hit;
    if (seat !== room.hostSeat) return no('HOST', '只有房主可以换游戏。');
    if (room.phase !== PHASES.DONE && room.phase !== PHASES.WAITING) return no('PHASE', '对局进行中，不能换游戏。');
    room.phase = PHASES.WAITING;
    room.round = 1;
    room.wins = [0, 0];
    room.state = null;
    room.result = null;
    room.startsAt = null;
    room.againVotes = [false, false];
    room.players.forEach((player) => { if (player) player.ready = false; });
    room.lastActivity = this.now();
    this.push(room);
    return { ok: true };
  }

  resign(socket) {
    const hit = this.locate(socket.id);
    if (!hit) return no('AUTH', '先进入房间。');
    const { room, seat, player } = hit;
    if (room.phase !== PHASES.LIVE) return no('PHASE', '现在不能认输。');
    const other = 1 - seat;
    const name = room.players[other] ? room.players[other].name : '对手';
    this.endRound(room, other, `${name} 获胜：对手认输。`);
    player.connected = false;
    player.resigned = true;
    if (player.socketId) {
      const target = this.io.sockets.sockets.get(player.socketId);
      if (target) {
        target.emit('closed', { message: '你认输了，本局结束。' });
        target.leave(room.code);
      }
      this.bySocket.delete(player.socketId);
      player.socketId = null;
    }
    this.push(room);
    return { ok: true };
  }

  emoji(socket, payload = {}) {
    const hit = this.locate(socket.id);
    if (!hit) return no('AUTH', '先进入房间。');
    if (!EMOJIS.includes(payload.emoji)) return no('EMOJI', '只能发表情。');
    const now = this.now();
    if (now - hit.player.lastEmoji < LIMITS.emojiCooldownMs) return no('SLOW', '表情慢一点。');
    hit.player.lastEmoji = now;
    this.io.to(hit.room.code).emit('emoji', { seat: hit.seat, emoji: payload.emoji, at: now });
    return { ok: true };
  }

  leave(socket) {
    const hit = this.locate(socket.id);
    if (!hit) return { ok: true };
    this.close(hit.room, '对手离开了房间。');
    return { ok: true };
  }

  close(room, message) {
    for (const player of room.players) {
      if (!player) continue;
      if (player.socketId) {
        const target = this.io.sockets.sockets.get(player.socketId);
        if (target) {
          target.emit('closed', { message });
          target.leave(room.code);
        }
        this.bySocket.delete(player.socketId);
      }
    }
    this.rooms.delete(room.code);
  }

  disconnect(socket) {
    const hit = this.locate(socket.id);
    if (!hit) return;
    const { room, seat, player } = hit;
    this.bySocket.delete(socket.id);
    player.socketId = null;
    player.connected = false;
    player.protectedUntil = this.now() + LIMITS.graceMs;
    if (room.phase === PHASES.LIVE && !room.pausedAt) room.pausedAt = this.now();
    room.lastActivity = this.now();
    this.push(room);
  }

  startRound(room) {
    const engine = engineFor(room.gameId);
    if (!engine) return;
    room.seed = this.seed();
    room.state = engine.create(room.seed, 0);
    room.gameStartAt = this.now();
    room.pausedTotal = 0;
    room.pausedAt = this.connected(room) < 2 ? this.now() : null;
    room.phase = PHASES.LIVE;
    room.result = null;
    room.startsAt = null;
    room.lastActivity = this.now();
    if (room.state && room.state.status !== 'done') room.state.now = 0;
    this.push(room);
  }

  endRound(room, winner, message) {
    if (room.phase === PHASES.DONE) return;
    room.phase = PHASES.DONE;
    room.result = { winner: winner === 0 || winner === 1 ? winner : -1, message: message || '本局结束。' };
    if (room.result.winner === 0 || room.result.winner === 1) room.wins[room.result.winner] += 1;
    room.againVotes = [false, false];
    room.lastActivity = this.now();
    const record = {
      id: token(),
      gameId: room.gameId,
      players: room.players.filter(Boolean).map((player) => player.name),
      winner: room.result.winner,
      scores: room.state ? room.state.scores.slice() : [0, 0],
      wins: room.wins.slice(),
      round: room.round,
      seriesTotal: room.seriesTotal,
      endedAt: this.now(),
      durationMs: room.gameStartAt ? this.now() - room.gameStartAt - room.pausedTotal : 0,
    };
    try {
      this.onFinished(record);
    } catch {}
    this.push(room);
  }

  forfeit(room, seat) {
    const other = 1 - seat;
    const name = room.players[other] ? room.players[other].name : '对手';
    this.endRound(room, other, `${name} 获胜：对手超时未归。`);
  }

  tick() {
    const now = this.now();
    for (const room of [...this.rooms.values()]) {
      if (room.phase === PHASES.STARTING && room.startsAt != null && now >= room.startsAt) {
        this.startRound(room);
      }
      if (room.phase === PHASES.LIVE) {
        const missing = room.players.findIndex((player) => player && !player.connected);
        if (missing >= 0 && !room.pausedAt) room.pausedAt = now;
        if (room.pausedAt) {
          const gone = room.players.find((player) => player && !player.connected);
          if (!gone) {
            room.pausedTotal += now - room.pausedAt;
            room.pausedAt = null;
          } else if (gone.protectedUntil && now >= gone.protectedUntil) {
            this.forfeit(room, room.players.indexOf(gone));
            continue;
          }
        }
        if (!room.pausedAt && room.state) {
          let changed = false;
          try {
            changed = engineFor(room.gameId).step(room.state, this.gameNow(room)) === true;
          } catch {
            changed = false;
          }
          room.state.now = this.gameNow(room);
          if (room.state.status === 'done') {
            this.endRound(room, room.state.winner, room.state.message);
            continue;
          }
          if (changed) this.push(room);
          else if (Math.floor(now / 50) % 2 === 0) this.push(room);
        }
      }
      const idle = now - room.lastActivity;
      if (this.connected(room) === 0 && idle > LIMITS.emptyRoomMs) {
        this.rooms.delete(room.code);
      }
    }
  }

  snapshot(room, seat) {
    const player = room.players[seat];
    const engine = engineFor(room.gameId);
    let game = null;
    if (room.state && engine) {
      try {
        game = engine.view(room.state, seat);
      } catch {
        game = null;
      }
    }
    return {
      serverNow: this.now(),
      me: { seat, name: player ? player.name : '', seq: player ? player.seq : 0 },
      room: {
        code: room.code,
        gameId: room.gameId,
        gameName: gameInfo(room.gameId)?.name || room.gameId,
        phase: room.phase,
        hostSeat: room.hostSeat,
        series: { total: room.seriesTotal, round: room.round, wins: room.wins.slice() },
        players: room.players.map((item) => item ? { name: item.name, connected: item.connected, ready: item.ready } : null),
        startsAt: room.startsAt,
        countdownMs: this.countdownMs,
        paused: Boolean(room.pausedAt),
        result: room.result,
      },
      game,
    };
  }

  push(room) {
    for (let seat = 0; seat < 2; seat++) {
      const player = room.players[seat];
      if (!player || !player.socketId) continue;
      const target = this.io.sockets.sockets.get(player.socketId);
      if (target) target.emit('snap', this.snapshot(room, seat));
    }
  }
}