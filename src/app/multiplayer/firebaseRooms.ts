import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { ensureAnonymousUser, firebaseDb } from './firebase';

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
  createdAt: number;
  updatedAt: number;
}

export interface MultiplayerProfileInput {
  name: string;
  avatar: string;
  color: string;
  glowColor: string;
}

const roomsCol = collection(firebaseDb, 'rooms');

function roomRef(code: string) {
  return doc(roomsCol, normalizeRoomCode(code));
}

export function normalizeRoomCode(code: string) {
  return String(code).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16);
}

export function generateRoomCode() {
  return `GOLF-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function createRoomWithRetries(profile: MultiplayerProfileInput, retries = 10) {
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
          createdAt: now,
          updatedAt: now,
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
        ready: false,
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
  const ref = roomRef(code);

  await runTransaction(firebaseDb, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as FirebaseRoomDoc;
    const remaining = room.players.filter((p) => p.id !== user.uid);

    if (remaining.length === 0) {
      tx.delete(ref);
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

export async function startRoom(code: string) {
  const user = await ensureAnonymousUser();
  const ref = roomRef(code);

  await runTransaction(firebaseDb, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found.');
    const room = snap.data() as FirebaseRoomDoc;
    if (room.hostId !== user.uid) throw new Error('Only the host can start the game.');
    if (room.players.length < 2) throw new Error('Need at least 2 players.');
    if (!room.players.every((p) => p.ready)) throw new Error('All players must be ready.');

    tx.update(ref, {
      status: 'playing' satisfies RoomStatus,
      updatedAt: Date.now(),
    });
  });
}

export async function getRoom(code: string) {
  const snap = await getDoc(roomRef(code));
  if (!snap.exists()) return null;
  return snap.data() as FirebaseRoomDoc;
}

export function subscribeToRoom(code: string, onRoom: (room: FirebaseRoomDoc | null) => void): Unsubscribe {
  return onSnapshot(roomRef(code), (snap) => {
    onRoom(snap.exists() ? (snap.data() as FirebaseRoomDoc) : null);
  });
}

// Optional helper if you want a dedicated game-state subdocument later.
export async function setRoomGameState<T extends Record<string, unknown>>(code: string, gameState: T) {
  const ref = doc(firebaseDb, 'rooms', normalizeRoomCode(code), 'state', 'game');
  await setDoc(ref, { ...gameState, updatedAt: Date.now() }, { merge: true });
}

export async function clearRoomGameState(code: string) {
  const ref = doc(firebaseDb, 'rooms', normalizeRoomCode(code), 'state', 'game');
  await deleteDoc(ref);
}
