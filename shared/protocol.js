export const VERSION = '1.0.0';
export const SERVICE_NAME = 'PINECONE CLUB';
export const DEFAULT_PORT = 4460;
export const PHASES = { WAITING: 'waiting', STARTING: 'starting', LIVE: 'live', DONE: 'done' };
export const SERIES_OPTIONS = [1, 3, 5];
export const EMOJIS = ['👏', '💪', '🤔', '😂', '❤️', '✨'];
export const LIMITS = {
  name: 12,
  countdownMs: 3000,
  tickMs: 40,
  graceMs: 60000,
  emptyRoomMs: 3600000,
  rateWindowMs: 10000,
  rateMax: 180,
  emojiCooldownMs: 800,
  maxRooms: 800,
};
export const EVENTS = {
  CREATE: 'create',
  JOIN: 'join',
  RESUME: 'resume',
  SELECT: 'select',
  READY: 'ready',
  ACT: 'act',
  AGAIN: 'again',
  CHANGE: 'change',
  LEAVE: 'leave',
  RESIGN: 'resign',
  EMOJI: 'emoji',
  SNAP: 'snap',
  PING: 'ping',
};