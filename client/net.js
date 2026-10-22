import { io } from 'socket.io-client';

const cacheKey = 'pc.server';

export function normalizeServer(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (!/^https?:\/\//i.test(text)) return '';
  return text.replace(/\/+$/, '');
}

function cache(server) {
  try {
    if (server) localStorage.setItem(cacheKey, server);
  } catch {}
}

export async function resolveServer() {
  const params = new URLSearchParams(location.search);
  const fromQuery = normalizeServer(params.get('s'));
  if (fromQuery) {
    cache(fromQuery);
    return { server: fromQuery, source: 'query' };
  }
  try {
    const stored = normalizeServer(localStorage.getItem(cacheKey));
    if (stored) return { server: stored, source: 'storage' };
  } catch {}
  const candidates = ['./server-url.json', 'https://raw.githubusercontent.com/yjj0339/pinecone-club/main/server-url.json'];
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { cache: 'no-store' });
      if (!response.ok) continue;
      const data = await response.json();
      const found = normalizeServer(data.server || data.url);
      if (found) return { server: found, source: 'file' };
    } catch {}
  }
  return { server: '', source: '' };
}

export function rememberServer(server) {
  const value = normalizeServer(server);
  if (value) cache(value);
  return value;
}

export class Connection {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.socket = null;
    this.server = '';
    this.seq = 0;
    this.latency = 0;
    this.pingTimer = null;
    this.connected = false;
  }

  open(server) {
    this.close();
    this.server = server;
    this.connected = false;
    this.handlers.onStatus?.('connecting', server);
    const socket = io(server, {
      transports: ['websocket', 'polling'],
      timeout: 8000,
      reconnection: true,
      reconnectionDelay: 600,
      reconnectionDelayMax: 4000,
    });
    this.socket = socket;
    socket.on('connect', () => {
      this.connected = true;
      this.handlers.onStatus?.('online', server);
      this.startPing();
      this.handlers.onConnect?.();
    });
    socket.on('disconnect', (reason) => {
      this.connected = false;
      this.handlers.onStatus?.('offline', reason);
    });
    socket.on('connect_error', () => {
      this.handlers.onStatus?.('offline', 'connect_error');
    });
    socket.on('hello', (data) => this.handlers.onHello?.(data));
    socket.on('snap', (data) => this.handlers.onSnapshot?.(data));
    socket.on('emoji', (data) => this.handlers.onEmoji?.(data));
    socket.on('closed', (data) => this.handlers.onClosed?.(data));
    socket.on('notice', (data) => this.handlers.onNotice?.(data));
  }

  close() {
    this.stopPing();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.close();
    }
    this.socket = null;
    this.connected = false;
  }

  startPing() {
    this.stopPing();
    const tick = () => {
      if (!this.socket) return;
      const started = Date.now();
      this.socket.timeout(4000).emit('ping', { t: started }, (error) => {
        if (!error) {
          this.latency = Date.now() - started;
          this.handlers.onLatency?.(this.latency);
        }
      });
    };
    tick();
    this.pingTimer = setInterval(tick, 5000);
  }

  stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  request(event, payload = {}, timeout = 8000) {
    return new Promise((resolve) => {
      if (!this.socket || !this.connected) {
        resolve({ ok: false, code: 'OFFLINE', message: '还没有连上服务器。' });
        return;
      }
      this.socket.timeout(timeout).emit(event, payload, (error, result) => {
        if (error) resolve({ ok: false, code: 'TIMEOUT', message: '服务器没有回应，检查一下网络。' });
        else resolve(result || { ok: false, code: 'EMPTY', message: '服务器没有返回结果。' });
      });
    });
  }

  act(action) {
    this.seq += 1;
    return this.request('act', { seq: this.seq, action });
  }

  setSeq(value) {
    const seq = Number(value);
    if (Number.isInteger(seq) && seq >= 0) this.seq = seq;
  }
}