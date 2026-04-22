import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';
import { firebaseDb, ensureAnonymousUser } from './firebase';
import {
  drawFromPile,
  takeFromDiscard,
  skipPower,
  usePower7,
  usePower8,
  selectPower9Card,
  confirmPower9,
  usePower10,
  swapCard,
  discardDrawnCard,
  submitReaction,
  resolveReactionWindow,
  knock,
  endPeekPhase,
  removePlayer,
  giveAwayCard,
  type GameState,
} from '../backend/gameEngine';

// ─── Firestore Reference ──────────────────────────────────────────────────────

function gameStateRef(roomCode: string) {
  return doc(firebaseDb, 'rooms', roomCode.toUpperCase(), 'state', 'game');
}

// ─── Read / Subscribe ─────────────────────────────────────────────────────────

export async function getGameState(roomCode: string): Promise<GameState | null> {
  const snap = await getDoc(gameStateRef(roomCode));
  return snap.exists() ? (snap.data() as GameState) : null;
}

export function subscribeToGameState(
  roomCode: string,
  onState: (state: GameState | null) => void,
): Unsubscribe {
  return onSnapshot(gameStateRef(roomCode), snap => {
    onState(snap.exists() ? (snap.data() as GameState) : null);
  });
}

// ─── Write Helpers ────────────────────────────────────────────────────────────

// All game actions go through this: read → validate → apply engine function → write
async function applyAction(
  roomCode: string,
  updater: (current: GameState) => GameState,
): Promise<void> {
  const ref = gameStateRef(roomCode);
  await runTransaction(firebaseDb, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Game state not found.');
    const current = snap.data() as GameState;
    const next = updater(current);
    tx.set(ref, next);
  });
}

// Save the initial game state when the host starts the game
export async function saveInitialGameState(
  roomCode: string,
  state: GameState,
): Promise<void> {
  const ref = gameStateRef(roomCode);
  await runTransaction(firebaseDb, async tx => {
    tx.set(ref, state);
  });
}

// ─── Game Actions ─────────────────────────────────────────────────────────────

export async function syncEndPeek(roomCode: string): Promise<void> {
  await applyAction(roomCode, state => endPeekPhase(state));
}

export async function syncDrawFromPile(roomCode: string): Promise<void> {
  const user = await ensureAnonymousUser();
  await applyAction(roomCode, state => drawFromPile(state, user.uid));
}

export async function syncTakeFromDiscard(roomCode: string): Promise<void> {
  const user = await ensureAnonymousUser();
  await applyAction(roomCode, state => takeFromDiscard(state, user.uid));
}

export async function syncSkipPower(roomCode: string): Promise<void> {
  const user = await ensureAnonymousUser();
  await applyAction(roomCode, state => skipPower(state, user.uid));
}

export async function syncUsePower7(
  roomCode: string,
  cardIndex: number,
): Promise<void> {
  const user = await ensureAnonymousUser();
  await applyAction(roomCode, state => usePower7(state, user.uid, cardIndex));
}

export async function syncUsePower8(
  roomCode: string,
  targetPlayerId: string,
  cardIndex: number,
): Promise<void> {
  const user = await ensureAnonymousUser();
  await applyAction(roomCode, state => usePower8(state, user.uid, targetPlayerId, cardIndex));
}

export async function syncSelectPower9Card(
  roomCode: string,
  targetPlayerId: string,
  cardIndex: number,
): Promise<void> {
  const user = await ensureAnonymousUser();
  await applyAction(roomCode, state => selectPower9Card(state, user.uid, targetPlayerId, cardIndex));
}

export async function syncConfirmPower9(
  roomCode: string,
  doSwap: boolean,
): Promise<void> {
  const user = await ensureAnonymousUser();
  await applyAction(roomCode, state => confirmPower9(state, user.uid, doSwap));
}

export async function syncUsePower10(
  roomCode: string,
  card1: { playerId: string; cardIndex: number },
  card2: { playerId: string; cardIndex: number },
): Promise<void> {
  const user = await ensureAnonymousUser();
  await applyAction(roomCode, state => usePower10(state, user.uid, card1, card2));
}

export async function syncSwapCard(
  roomCode: string,
  cardIndex: number,
): Promise<void> {
  const user = await ensureAnonymousUser();
  await applyAction(roomCode, state => swapCard(state, user.uid, cardIndex));
}

export async function syncDiscardDrawn(roomCode: string): Promise<void> {
  const user = await ensureAnonymousUser();
  await applyAction(roomCode, state => discardDrawnCard(state, user.uid));
}

// Reaction ordering is assigned inside the shared transaction so every client
// resolves the window using the same server-mediated submission order.
export async function syncReaction(
  roomCode: string,
  targetPlayerId: string,
  cardIndex: number,
): Promise<void> {
  const user = await ensureAnonymousUser();
  const timestamp = Date.now();

  await applyAction(roomCode, state => {
    const nextServerOrder = Math.max(state.nextReactionOrder ?? 1, 1);
    const nextState = submitReaction(
      state,
      user.uid,
      targetPlayerId,
      cardIndex,
      timestamp,
      nextServerOrder,
    );

    if (nextState === state) return state;

    return {
      ...nextState,
      nextReactionOrder: nextServerOrder + 1,
    };
  });
}

export async function syncGiveAwayCard(
  roomCode: string,
  giverCardIndex: number,
): Promise<void> {
  const user = await ensureAnonymousUser();
  await applyAction(roomCode, state => giveAwayCard(state, user.uid, giverCardIndex));
}

export async function syncResolveReactionWindow(roomCode: string): Promise<void> {
  await applyAction(roomCode, state => resolveReactionWindow(state));
}

export async function syncKnock(roomCode: string): Promise<void> {
  const user = await ensureAnonymousUser();
  await applyAction(roomCode, state => knock(state, user.uid));
}

export async function syncRemovePlayer(roomCode: string, playerId: string): Promise<void> {
  await applyAction(roomCode, state => removePlayer(state, playerId));
}

// Sets or clears the UI-only powerFocusTargetId field so all connected clients
// can highlight the targeted opponent's panel in real time during power cards 8/9/10.
export async function syncSetPowerFocusTarget(
  roomCode: string,
  targetPlayerId: string | null,
): Promise<void> {
  await applyAction(roomCode, state => ({ ...state, powerFocusTargetId: targetPlayerId }));
}

// Sets or clears the most-recently selected card during power 9/10 selection so all
// connected clients can anchor the hand cue to the correct card position.
export async function syncSetPowerCueCard(
  roomCode: string,
  card: { playerId: string; cardIndex: number } | null,
): Promise<void> {
  await applyAction(roomCode, state => ({ ...state, powerCueCard: card }));
}

// Sets or clears which specific card is being peeked (power 7 = own card,
// power 8 = opponent card) so all connected clients can show the reveal.
export async function syncSetPeekRevealCard(
  roomCode: string,
  card: { playerId: string; cardIndex: number } | null,
): Promise<void> {
  await applyAction(roomCode, state => ({ ...state, peekRevealCard: card }));
}
