export function rng(seed) {
  let a = (Number(seed) >>> 0) || 0x9e3779b9;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n) => Math.floor(next() * n),
    pick: (list) => list[Math.floor(next() * list.length)],
    shuffle: (list) => {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const t = out[i];
        out[i] = out[j];
        out[j] = t;
      }
      return out;
    },
  };
}

export function open(now, durationMs, message) {
  return {
    status: 'live',
    winner: null,
    scores: [0, 0],
    turn: 0,
    now,
    startedAt: now,
    endsAt: now + durationMs,
    message,
  };
}

export function finish(state, winner, message) {
  state.status = 'done';
  state.winner = winner;
  state.message = message;
  state.endedAt = state.now;
  return true;
}

export function live(state) {
  return state.status === 'live';
}

export function begin(state, player, now, ms) {
  state.turn = player;
  state.turnEndsAt = now + ms;
}

export function turnOver(state, now) {
  return state.turnEndsAt != null && now >= state.turnEndsAt;
}

export function turnLeft(state, now) {
  return state.turnEndsAt == null ? 0 : Math.max(0, state.turnEndsAt - now);
}

export function matchLeft(state, now) {
  return Math.max(0, state.endsAt - now);
}

export function pane(state) {
  return {
    status: state.status,
    winner: state.winner,
    scores: state.scores.slice(),
    turn: state.turn,
    message: state.message,
    now: state.now,
    startedAt: state.startedAt,
    endsAt: state.endsAt,
    matchLeft: matchLeft(state, state.now),
    turnLeft: turnLeft(state, state.now),
  };
}

export function int(value, lo, hi) {
  return Number.isInteger(value) && value >= lo && value <= hi;
}

export function oneOf(value, list) {
  return list.includes(value);
}