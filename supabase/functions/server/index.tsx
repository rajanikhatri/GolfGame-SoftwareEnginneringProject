import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();
app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "apikey"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// ─── Game Constants ────────────────────────────────────────────────────────────
const SUITS = ['hearts', 'diamonds', 'spades', 'clubs'];
const RANKS = [
  { rank: 'A', value: 1 }, { rank: '2', value: 2 }, { rank: '3', value: 3 },
  { rank: '4', value: 4 }, { rank: '5', value: 5 }, { rank: '6', value: 6 },
  { rank: '7', value: 7 }, { rank: '8', value: 8 }, { rank: '9', value: 9 },
  { rank: '10', value: 10 }, { rank: 'J', value: 10 }, { rank: 'Q', value: 10 },
  { rank: 'K', value: -2 },
];
const SLOT_DEFAULTS = [
  { color: '#1E88E5', glowColor: 'rgba(30,136,229,0.7)', avatar: '🎮' },
  { color: '#E53935', glowColor: 'rgba(229,57,53,0.7)', avatar: '🦊' },
  { color: '#43A047', glowColor: 'rgba(67,160,71,0.7)', avatar: '🐼' },
  { color: '#AB47BC', glowColor: 'rgba(171,71,188,0.7)', avatar: '🦋' },
];

// ─── Game Helpers ──────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createDeck(): any[] {
  const deck: any[] = [];
  for (const suit of SUITS) {
    for (const { rank, value } of RANKS) {
      deck.push({ id: `${suit}-${rank}-${Math.random().toFixed(6)}`, value, suit, rank, faceUp: false });
    }
  }
  deck.push({ id: `joker-1-${Math.random()}`, value: -1, suit: 'joker', rank: '★', faceUp: false });
  deck.push({ id: `joker-2-${Math.random()}`, value: -1, suit: 'joker', rank: '★', faceUp: false });
  return shuffle(deck);
}

function calcScore(cards: any[][]): number {
  let total = 0;
  for (let col = 0; col < 2; col++) {
    const top = cards[0]?.[col];
    const bot = cards[1]?.[col];
    if (top?.faceUp && bot?.faceUp && top.value === bot.value && top.value >= 0) continue;
    if (top?.faceUp) total += top.value;
    if (bot?.faceUp) total += bot.value;
  }
  return total;
}

function generateRoomCode(): string {
  const digits = '0123456789';
  let code = 'GOLF-';
  for (let i = 0; i < 4; i++) code += digits[Math.floor(Math.random() * digits.length)];
  return code;
}

function initGameState(roomPlayers: any[]): any {
  const deck = createDeck();
  const players = roomPlayers.map((rp: any, i: number) => {
    const def = SLOT_DEFAULTS[i] || SLOT_DEFAULTS[0];
    const cards: any[][] = [[], []];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const card = deck.pop()!;
        if (i === 0 && row === 1) card.faceUp = true; // host peeks bottom 2
        cards[row].push(card);
      }
    }
    return {
      id: `p${i + 1}`,
      realPlayerId: rp.id,
      name: rp.name,
      avatar: rp.avatar || def.avatar,
      color: rp.color || def.color,
      glowColor: rp.glowColor || def.glowColor,
      cards,
      score: 0,
      isAI: false,
      isReady: true,
      hasKnocked: false,
    };
  });

  const firstDiscard = deck.pop()!;
  firstDiscard.faceUp = true;

  return {
    players,
    drawPile: deck,
    discardPile: [firstDiscard],
    currentPlayerIndex: 0,
    drawnCard: null,
    phase: 'draw',
    finalRound: false,
    knockedBy: null,
    winner: null,
    pendingPower: null,
    lastPlayedCard: null,
    lastPowerNotice: null,
    lastPowerNoticeId: null,
  };
}

function setPowerNotice(state: any, message: string) {
  state.lastPowerNotice = message;
  state.lastPowerNoticeId = Date.now() + Math.floor(Math.random() * 1000);
}

function endGame(state: any): any {
  const scored = state.players.map((p: any) => ({
    ...p,
    score: calcScore(p.cards),
    cards: p.cards.map((row: any[]) => row.map((c: any) => c ? { ...c, faceUp: true } : null)),
  }));
  const winner = scored.reduce((a: any, b: any) => a.score < b.score ? a : b);
  return { ...state, players: scored, winner, phase: 'game_over' };
}

function advanceTurn(state: any, fromIndex: number): any {
  const n = state.players.length;
  const next = (fromIndex + 1) % n;
  if (state.finalRound && state.knockedBy) {
    const knockerIdx = state.players.findIndex((p: any) => p.id === state.knockedBy);
    if (next === knockerIdx) return endGame(state);
  }
  return { ...state, currentPlayerIndex: next, phase: 'draw', drawnCard: null };
}

function processAction(gameState: any, playerRealId: string, action: string, data: any): any {
  const state = JSON.parse(JSON.stringify(gameState));
  if (state.lastPowerNoticeId === undefined) state.lastPowerNoticeId = null;
  if (state.lastPowerNotice === undefined) state.lastPowerNotice = null;
  const slot = state.players.findIndex((p: any) => p.realPlayerId === playerRealId);
  if (slot === -1) { console.log(`Player ${playerRealId} not found`); return state; }

  // Most actions require it's this player's turn
  const isPowerResolve = action === 'use_power';
  if (!isPowerResolve && state.currentPlayerIndex !== slot) {
    console.log(`Not player's turn: expected ${state.currentPlayerIndex}, got ${slot}`);
    return state;
  }
  if (isPowerResolve && (state.phase !== 'power' || state.currentPlayerIndex !== slot)) {
    return state;
  }

  switch (action) {
    case 'draw_from_pile': {
      if (state.phase !== 'draw') break;
      let pile = [...state.drawPile];
      if (pile.length === 0) {
        const [keepTop, ...rest] = state.discardPile;
        if (rest.length === 0) break;
        pile = shuffle(rest.map((c: any) => ({ ...c, faceUp: false })));
        state.discardPile = keepTop ? [keepTop] : [];
      }
      const card = { ...pile[pile.length - 1], faceUp: true };
      state.drawPile = pile.slice(0, pile.length - 1);
      state.drawnCard = card;
      state.phase = 'swap';
      break;
    }
    case 'take_from_discard': {
      if (state.phase !== 'draw' || state.discardPile.length === 0) break;
      const [top, ...rest] = state.discardPile;
      state.discardPile = rest;
      state.drawnCard = { ...top, faceUp: true };
      state.phase = 'swap';
      break;
    }
    case 'swap_card': {
      if (state.phase !== 'swap' || !state.drawnCard) break;
      const { row, col } = data;
      const player = { ...state.players[slot] };
      const newCards = player.cards.map((r: any[]) => [...r]);
      const oldCard = newCards[row][col];
      newCards[row][col] = { ...state.drawnCard, faceUp: true };
      player.cards = newCards;
      state.players[slot] = player;
      const toDiscard = oldCard ? { ...oldCard, faceUp: true } : state.drawnCard;
      state.lastPlayedCard = toDiscard;
      state.discardPile = [toDiscard, ...state.discardPile];
      state.drawnCard = null;
      return advanceTurn(state, slot);
    }
    case 'discard_drawn': {
      if (state.phase !== 'swap' || !state.drawnCard) break;
      const toDiscard = { ...state.drawnCard, faceUp: true };
      state.lastPlayedCard = toDiscard;
      state.discardPile = [toDiscard, ...state.discardPile];
      state.drawnCard = null;
      if (toDiscard.rank === '7' || toDiscard.rank === '8' || toDiscard.rank === '9' || toDiscard.rank === '10') {
        if (toDiscard.rank === '7') {
          const selfCards = state.players[slot]?.cards || [];
          const hasFaceDownCard = selfCards.some((row: any[]) => row.some((c: any) => c && !c.faceUp));
          if (!hasFaceDownCard) {
            return advanceTurn(state, slot);
          }
        }
        if (toDiscard.rank === '10' && state.players.length < 3) {
          return advanceTurn(state, slot);
        }
        state.pendingPower = toDiscard.rank;
        state.phase = 'power';
      } else {
        return advanceTurn(state, slot);
      }
      break;
    }
    case 'use_power': {
      const actorName = state.players[slot]?.name || 'Player';
      if (state.pendingPower === '7' || state.pendingPower === '8') {
        const t = data?.target;
        const targetName = (Number.isInteger(t?.playerIndex) && state.players[t.playerIndex]?.name) || 'opponent';
        setPowerNotice(
          state,
          state.pendingPower === '7'
            ? `${actorName} peeked at their own card`
            : `${actorName} peeked at ${targetName}'s card`
        );
      }
      if (state.pendingPower === '9' || state.pendingPower === '10') {
        const targets = Array.isArray(data?.targets) ? data.targets : null;
        if (!targets || targets.length !== 2) break;
        const [a, b] = targets;
        const validIndex = (v: any) => Number.isInteger(v) && v >= 0 && v < state.players.length;
        const validPos = (v: any) => Number.isInteger(v) && v >= 0 && v < 2;
        const valid =
          validIndex(a?.playerIndex) && validIndex(b?.playerIndex) &&
          validPos(a?.row) && validPos(a?.col) &&
          validPos(b?.row) && validPos(b?.col) &&
          a.playerIndex !== b.playerIndex &&
          (state.pendingPower === '9' ? true : (a.playerIndex !== slot && b.playerIndex !== slot));

        if (!valid) break;

        const cardA = state.players[a.playerIndex]?.cards?.[a.row]?.[a.col];
        const cardB = state.players[b.playerIndex]?.cards?.[b.row]?.[b.col];
        if (!cardA || !cardB) break;

        state.players[a.playerIndex].cards[a.row][a.col] = cardB;
        state.players[b.playerIndex].cards[b.row][b.col] = cardA;
        const firstName = state.players[a.playerIndex]?.name || 'Player';
        const secondName = state.players[b.playerIndex]?.name || 'Player';
        setPowerNotice(
          state,
          state.pendingPower === '9'
            ? `${actorName} peeked and swapped cards between ${firstName} and ${secondName}`
            : `${actorName} swapped cards between ${firstName} and ${secondName}`
        );
      }
      state.pendingPower = null;
      return advanceTurn(state, slot);
    }
    case 'knock': {
      if (state.finalRound) break;
      state.finalRound = true;
      state.knockedBy = state.players[slot].id;
      return advanceTurn(state, slot);
    }
  }
  return state;
}

// ─── Health ────────────────────────────────────────────────────────────────────
app.get("/make-server-278ab37f/health", (c) => c.json({ status: "ok" }));

// ─── CREATE ROOM ───────────────────────────────────────────────────────────────
app.post("/make-server-278ab37f/room/create", async (c) => {
  try {
    const { playerName, avatar, color, glowColor } = await c.req.json();
    const playerId = crypto.randomUUID();
    let code = '';
    for (let attempts = 0; attempts < 10; attempts++) {
      const candidate = generateRoomCode();
      if (!(await kv.get(`room:${candidate}`))) { code = candidate; break; }
    }
    if (!code) return c.json({ error: 'Could not generate room code' }, 500);

    const def = SLOT_DEFAULTS[0];
    const room = {
      code, hostId: playerId,
      players: [{ id: playerId, name: playerName || 'Player 1', avatar: avatar || def.avatar, color: color || def.color, glowColor: glowColor || def.glowColor, slotIndex: 0, ready: true }],
      status: 'waiting', createdAt: Date.now(),
    };
    await kv.set(`room:${code}`, room);
    console.log(`Room created: ${code}`);
    return c.json({ code, playerId, room });
  } catch (e) {
    console.log(`Error creating room: ${e}`);
    return c.json({ error: `Failed to create room: ${e}` }, 500);
  }
});

// ─── JOIN ROOM ─────────────────────────────────────────────────────────────────
app.post("/make-server-278ab37f/room/join", async (c) => {
  try {
    const { code, playerName, avatar, color, glowColor } = await c.req.json();
    const room: any = await kv.get(`room:${code}`);
    if (!room) return c.json({ error: 'Room not found' }, 404);
    if (room.status !== 'waiting') return c.json({ error: 'Game already started' }, 400);
    if (room.players.length >= 4) return c.json({ error: 'Room is full' }, 400);

    const playerId = crypto.randomUUID();
    const slotIndex = room.players.length;
    const def = SLOT_DEFAULTS[slotIndex] || SLOT_DEFAULTS[0];
    const newPlayer = { id: playerId, name: playerName || `Player ${slotIndex + 1}`, avatar: avatar || def.avatar, color: color || def.color, glowColor: glowColor || def.glowColor, slotIndex, ready: false };
    const updatedRoom = { ...room, players: [...room.players, newPlayer] };
    await kv.set(`room:${code}`, updatedRoom);
    console.log(`Player ${playerId} joined room ${code}`);
    return c.json({ playerId, slotIndex, room: updatedRoom });
  } catch (e) {
    console.log(`Error joining room: ${e}`);
    return c.json({ error: `Failed to join: ${e}` }, 500);
  }
});

// ─── GET ROOM ──────────────────────────────────────────────────────────────────
app.get("/make-server-278ab37f/room/:code", async (c) => {
  try {
    const code = c.req.param('code');
    const room = await kv.get(`room:${code}`);
    if (!room) return c.json({ error: 'Room not found' }, 404);
    const gameState = await kv.get(`room:${code}:game`);
    return c.json({ room, gameState: gameState || null });
  } catch (e) {
    console.log(`Error getting room: ${e}`);
    return c.json({ error: `Failed to get room: ${e}` }, 500);
  }
});

// ─── TOGGLE READY ──────────────────────────────────────────────────────────────
app.post("/make-server-278ab37f/room/:code/ready", async (c) => {
  try {
    const code = c.req.param('code');
    const { playerId } = await c.req.json();
    const room: any = await kv.get(`room:${code}`);
    if (!room) return c.json({ error: 'Room not found' }, 404);
    const updatedRoom = { ...room, players: room.players.map((p: any) => p.id === playerId ? { ...p, ready: !p.ready } : p) };
    await kv.set(`room:${code}`, updatedRoom);
    return c.json({ room: updatedRoom });
  } catch (e) {
    console.log(`Error toggling ready: ${e}`);
    return c.json({ error: `Failed to toggle ready: ${e}` }, 500);
  }
});

// ─── START GAME ────────────────────────────────────────────────────────────────
app.post("/make-server-278ab37f/room/:code/start", async (c) => {
  try {
    const code = c.req.param('code');
    const { playerId } = await c.req.json();
    const room: any = await kv.get(`room:${code}`);
    if (!room) return c.json({ error: 'Room not found' }, 404);
    if (room.hostId !== playerId) return c.json({ error: 'Only host can start' }, 403);
    if (room.players.length < 2) return c.json({ error: 'Need at least 2 players' }, 400);

    const gameState = initGameState(room.players);
    const updatedRoom = { ...room, status: 'playing' };
    await kv.set(`room:${code}`, updatedRoom);
    await kv.set(`room:${code}:game`, gameState);
    console.log(`Game started in room ${code} with ${room.players.length} players`);
    return c.json({ room: updatedRoom, gameState });
  } catch (e) {
    console.log(`Error starting game: ${e}`);
    return c.json({ error: `Failed to start: ${e}` }, 500);
  }
});

// ─── PLAYER ACTION ─────────────────────────────────────────────────────────────
app.post("/make-server-278ab37f/room/:code/action", async (c) => {
  try {
    const code = c.req.param('code');
    const { playerId, action, data } = await c.req.json();
    const room: any = await kv.get(`room:${code}`);
    if (!room) return c.json({ error: 'Room not found' }, 404);
    const gameState: any = await kv.get(`room:${code}:game`);
    if (!gameState) return c.json({ error: 'Game not started' }, 400);
    if (gameState.phase === 'game_over') return c.json({ error: 'Game over' }, 400);

    const newState = processAction(gameState, playerId, action, data || {});
    await kv.set(`room:${code}:game`, newState);
    if (newState.phase === 'game_over') {
      await kv.set(`room:${code}`, { ...room, status: 'ended' });
    }
    console.log(`Action '${action}' processed in room ${code}`);
    return c.json({ gameState: newState });
  } catch (e) {
    console.log(`Error processing action: ${e}`);
    return c.json({ error: `Failed to process action: ${e}` }, 500);
  }
});

// ─── LEAVE ROOM ────────────────────────────────────────────────────────────────
app.delete("/make-server-278ab37f/room/:code/leave", async (c) => {
  try {
    const code = c.req.param('code');
    const { playerId } = await c.req.json();
    const room: any = await kv.get(`room:${code}`);
    if (!room) return c.json({ error: 'Room not found' }, 404);
    const remaining = room.players.filter((p: any) => p.id !== playerId);
    if (remaining.length === 0) {
      await kv.del(`room:${code}`); await kv.del(`room:${code}:game`);
    } else {
      const newHost = room.hostId === playerId ? remaining[0].id : room.hostId;
      await kv.set(`room:${code}`, { ...room, players: remaining, hostId: newHost });
    }
    return c.json({ success: true });
  } catch (e) {
    console.log(`Error leaving room: ${e}`);
    return c.json({ error: `Failed to leave: ${e}` }, 500);
  }
});

Deno.serve(app.fetch);
