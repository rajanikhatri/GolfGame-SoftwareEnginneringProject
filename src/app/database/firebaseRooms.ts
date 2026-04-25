import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  type Unsubscribe,
  where,
} from 'firebase/firestore';
import { ensureAnonymousUser, firebaseDb } from './firebase';
import type { GameState } from '../backend/gameEngine';
import type { LeaderboardEntry } from './firebaseLeaderboard';

export type RoomStatus = 'waiting' | 'playing' | 'ended';

export interface FirebaseRoomPlayer {
  id: string;
  name: string;
  avatar: string;
  color: string;
  glowColor: string;
  slotIndex: number;
  ready: boolean;
  joinedAt: number;
}

export interface FirebaseRoomDoc {
  code: string;
  hostId: string;
  status: RoomStatus;
  players: FirebaseRoomPlayer[];
  matchesPlayed?: number;
  createdAt: number;
  updatedAt: number;
  roomName?: string;
  maxPlayers?: number;
  password?: string;
  isPrivate?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gameState?: any;
}

export interface MultiplayerProfileInput {
  name: string;
  avatar: string;
  color: string;
  glowColor: string;
}

const roomsCol = collection(firebaseDb, 'rooms');
const leaderboardCol = collection(firebaseDb, 'leaderboard');
const ROOM_MATCH_RETIRE_LIMIT = 1;

function roomRef(code: string) {
  return doc(roomsCol, normalizeRoomCode(code));
}

function roomGameStateRef(code: string) {
  return doc(firebaseDb, 'rooms', normalizeRoomCode(code), 'state', 'game');
}

function leaderboardRef(uid: string) {
  return doc(leaderboardCol, uid);
}

export function normalizeRoomCode(code: string) {
  return String(code).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16);
}

export function generateRoomCode() {
  return `GOLF-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function getWaitingRooms(): Promise<FirebaseRoomDoc[]> {
  const q = query(roomsCol, where('status', '==', 'waiting'));
  const snap = await getDocs(q);
  const rooms = snap.docs.map(d => d.data() as FirebaseRoomDoc);
  const activeRooms = rooms.filter(room => (room.matchesPlayed ?? 0) < ROOM_MATCH_RETIRE_LIMIT);
  const expiredRooms = rooms.filter(room => (room.matchesPlayed ?? 0) >= ROOM_MATCH_RETIRE_LIMIT);

  await Promise.all(
    expiredRooms.flatMap(room => [
      deleteDoc(roomRef(room.code)),
      deleteDoc(roomGameStateRef(room.code)),
    ]),
  );

  return activeRooms;
}

export async function createRoomWithRetries(
  profile: MultiplayerProfileInput,
  options: { roomName?: string; maxPlayers?: number; password?: string; isPrivate?: boolean } = {},
  retries = 10,
) {
  const user = await ensureAnonymousUser();

  for (let i = 0; i < retries; i++) {
    const code = generateRoomCode();
    const ref = roomRef(code);
    const now = Date.now();
    const host: FirebaseRoomPlayer = {
      id: user.uid,
      name: profile.name.trim(),
      avatar: profile.avatar,
      color: profile.color,
      glowColor: profile.glowColor,
      slotIndex: 0,
      ready: true,
      joinedAt: now,
    };

    try {
      await runTransaction(firebaseDb, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) throw new Error('ROOM_CODE_COLLISION');
        tx.set(ref, {
          code,
          hostId: user.uid,
          status: 'waiting',
          players: [host],
          matchesPlayed: 0,
          createdAt: now,
          updatedAt: now,
          roomName: options.roomName ?? `${profile.name}'s room`,
          maxPlayers: options.maxPlayers ?? 4,
          password: options.password ?? '',
          isPrivate: options.isPrivate ?? false,
        } satisfies FirebaseRoomDoc);
      });
      return { code, playerId: user.uid };
    } catch (e) {
      if (e instanceof Error && e.message === 'ROOM_CODE_COLLISION') continue;
      throw e;
    }
  }

  throw new Error('Unable to create a unique room code. Please try again.');
}

export async function joinRoomByCode(code: string, profile: MultiplayerProfileInput) {
  const user = await ensureAnonymousUser();
  const normalized = normalizeRoomCode(code);
  const ref = roomRef(normalized);

  await runTransaction(firebaseDb, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found.');

    const room = snap.data() as FirebaseRoomDoc;
    if ((room.matchesPlayed ?? 0) >= ROOM_MATCH_RETIRE_LIMIT) throw new Error('Room is inactive.');
    if (room.status !== 'waiting') throw new Error('Game already started.');

    const existing = room.players.find((p) => p.id === user.uid);
    if (existing) {
      return;
    }

    if (room.players.length >= 4) throw new Error('Room is full.');

    const usedSlots = new Set(room.players.map((p) => p.slotIndex));
    const nextSlot = [0, 1, 2, 3].find((slot) => !usedSlots.has(slot));
    if (nextSlot === undefined) throw new Error('No slot available.');

    const nextPlayers: FirebaseRoomPlayer[] = [
      ...room.players,
      {
        id: user.uid,
        name: profile.name.trim(),
        avatar: profile.avatar,
        color: profile.color,
        glowColor: profile.glowColor,
        slotIndex: nextSlot,
        ready: true,
        joinedAt: Date.now(),
      },
    ];

    tx.update(ref, {
      players: nextPlayers,
      updatedAt: Date.now(),
    });
  });

  return { code: normalized, playerId: user.uid };
}

export async function leaveRoomByCode(code: string) {
  const user = await ensureAnonymousUser();
  await removePlayerFromRoom(code, user.uid);
}

export async function removePlayerFromRoom(code: string, playerId: string): Promise<void> {
  const normalized = normalizeRoomCode(code);
  const ref = roomRef(normalized);
  const stateRef = roomGameStateRef(normalized);

  await runTransaction(firebaseDb, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as FirebaseRoomDoc;
    const remaining = room.players.filter((p) => p.id !== playerId);

    if (remaining.length === room.players.length) return;

    if (remaining.length === 0) {
      tx.delete(ref);
      tx.delete(stateRef);
      return;
    }

    const hostStillPresent = remaining.some((p) => p.id === room.hostId);
    tx.update(ref, {
      players: remaining,
      hostId: hostStillPresent ? room.hostId : remaining[0].id,
      updatedAt: Date.now(),
    });
  });
}

export async function toggleReadyState(code: string) {
  const user = await ensureAnonymousUser();
  const ref = roomRef(code);

  await runTransaction(firebaseDb, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found.');
    const room = snap.data() as FirebaseRoomDoc;
    if (room.status !== 'waiting') throw new Error('Game already started.');

    const nextPlayers = room.players.map((p) =>
      p.id === user.uid ? { ...p, ready: !p.ready } : p,
    );

    tx.update(ref, {
      players: nextPlayers,
      updatedAt: Date.now(),
    });
  });
}

export async function startRoom(code: string, gameState?: unknown) {
  const user = await ensureAnonymousUser();
  const ref = roomRef(code);

  await runTransaction(firebaseDb, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found.');
    const room = snap.data() as FirebaseRoomDoc;
    if (room.hostId !== user.uid) throw new Error('Only the host can start the game.');
    if ((room.matchesPlayed ?? 0) >= ROOM_MATCH_RETIRE_LIMIT) throw new Error('Room is inactive.');

    tx.update(ref, {
      status: 'playing' satisfies RoomStatus,
      updatedAt: Date.now(),
      ...(gameState ? { gameState } : {}),
    });
  });
}

export async function getRoom(code: string) {
  const snap = await getDoc(roomRef(code));
  if (!snap.exists()) return null;
  return snap.data() as FirebaseRoomDoc;
}

export async function completeRoomMatch(code: string): Promise<void> {
  const normalized = normalizeRoomCode(code);
  const ref = roomRef(normalized);
  const stateRef = roomGameStateRef(normalized);

  await runTransaction(firebaseDb, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as FirebaseRoomDoc;
    if (room.status !== 'playing') return;

    const stateSnap = await tx.get(stateRef);
    const state = stateSnap.exists() ? (stateSnap.data() as GameState) : null;

    if (state?.scores && Object.keys(state.scores).length > 0) {
      const winnerId = Object.entries(state.scores).reduce(
        (best, [id, score]) => (score < best.score ? { id, score } : best),
        { id: '', score: Infinity },
      ).id;

      if (winnerId) {
        const winnerRoomPlayer = room.players.find(player => player.id === winnerId);
        const leaderboardSnap = await tx.get(leaderboardRef(winnerId));
        const existing = leaderboardSnap.exists()
          ? (leaderboardSnap.data() as LeaderboardEntry)
          : null;

        tx.set(leaderboardRef(winnerId), {
          uid: winnerId,
          displayName: winnerRoomPlayer?.name ?? existing?.displayName ?? 'Player',
          wins: (existing?.wins ?? 0) + 1,
          avatar: winnerRoomPlayer?.avatar ?? existing?.avatar ?? '🎮',
          color: winnerRoomPlayer?.color ?? existing?.color ?? '#1E88E5',
          updatedAt: Date.now(),
        } satisfies LeaderboardEntry);
      }
    }

    const matchesPlayed = (room.matchesPlayed ?? 0) + 1;

    if (matchesPlayed >= ROOM_MATCH_RETIRE_LIMIT) {
      tx.delete(ref);
      tx.delete(stateRef);
      return;
    }

    tx.update(ref, {
      status: 'waiting' satisfies RoomStatus,
      matchesPlayed,
      updatedAt: Date.now(),
    });
    tx.delete(stateRef);
  });
}

export function subscribeToRoom(code: string, onRoom: (room: FirebaseRoomDoc | null) => void): Unsubscribe {
  return onSnapshot(roomRef(code), (snap) => {
    onRoom(snap.exists() ? (snap.data() as FirebaseRoomDoc) : null);
  });
}

// Optional helper if you want a dedicated game-state subdocument later.
export async function setRoomGameState<T extends Record<string, unknown>>(code: string, gameState: T) {
  const ref = roomGameStateRef(code);
  await setDoc(ref, { ...gameState, updatedAt: Date.now() }, { merge: true });
}

export async function clearRoomGameState(code: string) {
  const ref = roomGameStateRef(code);
  await deleteDoc(ref);
}

// ─── Public room browser ─────────────────────────────────────────────────────

export async function isPublicRoomNameTaken(name: string): Promise<boolean> {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const q = query(roomsCol, where('roomName', '==', trimmed));
  const snap = await getDocs(q);
  return snap.docs.some(d => {
    const room = d.data() as FirebaseRoomDoc;
    return (
      room.isPrivate !== true &&
      room.status !== 'ended' &&
      (room.matchesPlayed ?? 0) < ROOM_MATCH_RETIRE_LIMIT
    );
  });
}

export function subscribeToPublicRooms(
  onRooms: (rooms: FirebaseRoomDoc[]) => void,
): Unsubscribe {
  const q = query(roomsCol, where('status', '==', 'waiting'));
  return onSnapshot(q, snap => {
    const rooms = snap.docs
      .map(d => d.data() as FirebaseRoomDoc)
      .filter(r => r.isPrivate !== true && (r.matchesPlayed ?? 0) < ROOM_MATCH_RETIRE_LIMIT)
      .sort((a, b) => b.createdAt - a.createdAt); // newest first
    onRooms(rooms);
  });
}

// ─── Room Chat ────────────────────────────────────────────────────────────────

export interface FirebaseRoomChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

function roomChatCol(code: string) {
  return collection(firebaseDb, 'rooms', normalizeRoomCode(code), 'chat');
}

export async function sendRoomChatMessage(
  code: string,
  msg: Omit<FirebaseRoomChatMessage, 'id' | 'timestamp'>,
): Promise<void> {
  const msgRef = doc(roomChatCol(code));
  await setDoc(msgRef, {
    ...msg,
    id: msgRef.id,
    timestamp: Date.now(),
  } satisfies FirebaseRoomChatMessage);
}

export function subscribeToRoomChat(
  code: string,
  onMessages: (messages: FirebaseRoomChatMessage[]) => void,
): Unsubscribe {
  const q = query(roomChatCol(code), orderBy('timestamp', 'asc'));
  return onSnapshot(q, snap => {
    onMessages(snap.docs.map(d => d.data() as FirebaseRoomChatMessage));
  });
}
