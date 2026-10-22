import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { Rooms } from './rooms.js';
import { DEFAULT_PORT, EVENTS, SERVICE_NAME, VERSION } from '../shared/protocol.js';
import { CATALOG } from '../shared/catalog.js';

const require = createRequire(import.meta.url);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

function openStore(dataDir) {
  try {
    mkdirSync(dataDir, { recursive: true });
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(join(dataDir, 'pinecone.sqlite'));
    db.exec('CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, game TEXT NOT NULL, players TEXT NOT NULL, winner INTEGER NOT NULL, ended INTEGER NOT NULL, record TEXT NOT NULL)');
    const insert = db.prepare('INSERT OR REPLACE INTO matches (id, game, players, winner, ended, record) VALUES (?, ?, ?, ?, ?, ?)');
    return {
      save(record) {
        insert.run(record.id, record.gameId, JSON.stringify(record.players), record.winner, record.endedAt, JSON.stringify(record));
      },
      count() {
        return db.prepare('SELECT COUNT(*) AS n FROM matches').get().n;
      },
    };
  } catch {
    return { save() {}, count() { return 0; } };
  }
}

function staticHandler(distDir) {
  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/socket.io')) return next();
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const target = normalize(join(distDir, pathname));
    if (!target.startsWith(distDir)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    try {
      const info = await stat(target);
      if (!info.isFile()) throw new Error('not file');
      const body = await readFile(target);
      res.writeHead(200, { 'content-type': MIME[extname(target)] || 'application/octet-stream', 'cache-control': pathname === '/index.html' ? 'no-cache' : 'public, max-age=3600' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      try {
        const body = await readFile(join(distDir, 'index.html'));
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
        res.end(body);
      } catch {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('PINECONE CLUB 尚未构建前端。');
      }
    }
  };
}

export function createApp({ port = DEFAULT_PORT, dataDir = join(root, 'runtime', 'data'), distDir = join(root, 'dist'), countdownMs, persist = true } = {}) {
  const store = persist ? openStore(dataDir) : { save() {}, count() { return 0; } };
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    pingInterval: 20000,
    pingTimeout: 20000,
    maxHttpBufferSize: 100000,
  });
  const rooms = new Rooms({
    io,
    countdownMs,
    onFinished: (record) => store.save(record),
  });

  httpServer.on('request', (req, res) => {
    const pathname = (req.url || '').split('?')[0];
    if (pathname.startsWith('/socket.io')) return;
    if (pathname === '/health') {
      const body = JSON.stringify({ ok: true, name: SERVICE_NAME, version: VERSION, games: CATALOG.length, rooms: rooms.rooms.size, matches: store.count(), now: Date.now() });
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(body);
      return;
    }
    staticHandler(distDir)(req, res, () => {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
    });
  });

  const wrap = (handler) => (payload, ack) => {
    try {
      const result = handler(payload || {});
      if (typeof ack === 'function') ack(result);
    } catch {
      if (typeof ack === 'function') ack({ ok: false, code: 'ERR', message: '服务开小差了，再试一次。' });
    }
  };

  io.on('connection', (socket) => {
    socket.emit('hello', { name: SERVICE_NAME, version: VERSION, serverNow: Date.now() });
    socket.on(EVENTS.CREATE, wrap((payload) => rooms.create(socket, payload)));
    socket.on(EVENTS.JOIN, wrap((payload) => rooms.join(socket, payload)));
    socket.on(EVENTS.RESUME, wrap((payload) => rooms.resume(socket, payload)));
    socket.on(EVENTS.SELECT, wrap((payload) => rooms.select(socket, payload)));
    socket.on(EVENTS.READY, wrap((payload) => rooms.ready(socket, payload)));
    socket.on(EVENTS.ACT, wrap((payload) => rooms.act(socket, payload)));
    socket.on(EVENTS.AGAIN, wrap(() => rooms.again(socket)));
    socket.on(EVENTS.CHANGE, wrap(() => rooms.change(socket)));
    socket.on(EVENTS.LEAVE, wrap(() => rooms.leave(socket)));
    socket.on(EVENTS.RESIGN, wrap(() => rooms.resign(socket)));
    socket.on(EVENTS.EMOJI, wrap((payload) => rooms.emoji(socket, payload)));
    socket.on(EVENTS.PING, wrap((payload) => ({ ok: true, t: payload.t ?? 0, now: Date.now() })));
    socket.on('disconnect', () => rooms.disconnect(socket));
  });

  return {
    root,
    httpServer,
    io,
    rooms,
    store,
    async listen(listenPort = port) {
      await new Promise((done, fail) => {
        httpServer.once('error', fail);
        httpServer.listen(listenPort, '0.0.0.0', done);
      });
      rooms.start();
      return httpServer.address().port;
    },
    async close() {
      rooms.stop();
      io.close();
      await new Promise((done) => httpServer.close(done));
    },
  };
}

const direct = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const app = createApp({ port: Number(process.env.PORT) || DEFAULT_PORT });
  app.listen().then((port) => {
    console.log(`PINECONE CLUB 服务已启动：http://127.0.0.1:${port}`);
  }).catch((error) => {
    console.error('PINECONE CLUB 服务启动失败：', error.message);
    process.exit(1);
  });
}