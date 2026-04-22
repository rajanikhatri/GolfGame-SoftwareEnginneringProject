// ─── Types ────────────────────────────────────────────────────────────────────

export type Suit = 'hearts' | 'diamonds' | 'spades' | 'clubs' | 'joker';
export type PowerRank = '7' | '8' | '9' | '10';

export interface Card {
  id: string;
  suit: Suit;
  rank: string;
  value: number;
  faceUp: boolean;
}

// Each player's hand is stored as a flat array because Firestore doesn't support
// nested arrays. The initial layout is [row0col0, row0col1, row1col0, row1col1],
// and penalty cards may extend the hand with additional row pairs.
export interface PlayerHand {
  playerId: string;
  cards: (Card | null)[];
}

export type GamePhase =
  | 'peek'       // 5-second preview at game start
  | 'draw'       // current player must draw a card
  | 'power'      // current player decides to use or skip power card
  | 'swap'       // current player decides to keep drawn card (swap) or discard it
  | 'react'      // 3-second reaction window after a discard
  | 'giveaway'
  | 'game_over'; // game has ended

export interface ReactionEntry {
  playerId: string;
  targetPlayerId: string;  // whose card was clicked
  cardIndex: number;   // flat index in that player's hand
  timestamp: number;   // client-side fallback for solo mode and legacy reactions
  serverOrder?: number | null; // shared transaction-assigned order for multiplayer fairness
}

export interface GameState {
  drawPile: Card[];
  discardPile: Card[];
  hands: PlayerHand[];
  playerOrder: string[];       // player IDs in fixed turn order
  currentPlayerIndex: number;
  phase: GamePhase;
  drawnCard: Card | null;
  pendingPower: PowerRank | null;
  lastDiscardedCard: Card | null;
  lastDiscardedById: string | null;
  reactionWindowOpen: boolean;
  reactions: ReactionEntry[];
  nextReactionOrder?: number;
  finalRound: boolean;
  knockedById: string | null;
  gameOver: boolean;
  scores: Record<string, number>;
  // Power 9: tracks which two cards are being peeked before optional swap
  power9Selection: { playerId: string; cardIndex: number }[] | null;
  // UI-only: the opponent whose panel should glow on non-acting players' screens
  // while power 8/9/10 is in progress. Set by the acting player, read by everyone.
  powerFocusTargetId?: string | null;
  // UI-only: the specific card being peeked during power 7 (own card) or power 8
  // (opponent card). Set when the acting player taps the card, cleared on resolve.
  peekRevealCard?: { playerId: string; cardIndex: number } | null;
  // UI-only: the most-recently selected card during power 9/10 selection phase.
  // Updated on every pick so all clients can anchor the hand cue to the correct card.
  powerCueCard?: { playerId: string; cardIndex: number } | null;

  pendingGiveaway: {
    giverId: string;
    receiverId: string;
  } | null;
}

// ─── Deck Creation ────────────────────────────────────────────────────────────

const SUITS: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function getCardValue(rank: string, suit: Suit): number {
  if (suit === 'joker') return -1;                          // Joker = -1
  if (rank === 'K' && (suit === 'spades' || suit === 'clubs')) return -2; // Black King = -2
  if (rank === 'K') return 13;                              // Other Kings = 13
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  if (rank === 'A') return 1;
  return parseInt(rank, 10);
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({
        id: `${suit}-${rank}-${Math.random().toFixed(8)}`,
        suit,
        rank,
        value: getCardValue(rank, suit),
        faceUp: false,
      });
    });
  });
  // Add 2 jokers
  deck.push({ id: `joker-1-${Math.random().toFixed(8)}`, suit: 'joker', rank: '★', value: -1, faceUp: false });
  deck.push({ id: `joker-2-${Math.random().toFixed(8)}`, suit: 'joker', rank: '★', value: -1, faceUp: false });
  return shuffle(deck);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Game Initialization ──────────────────────────────────────────────────────

export function createInitialGameState(playerIds: string[]): GameState {
  const deck = createDeck();
  const hands: PlayerHand[] = playerIds.map(playerId => {
    const cards: Card[] = [];
    for (let i = 0; i < 4; i++) {
      cards.push(deck.pop()!);
    }
    return { playerId, cards };
  });

  return {
    drawPile: deck,
    discardPile: [],
    hands,
    playerOrder: playerIds,
    currentPlayerIndex: 0,
    phase: 'peek',
    drawnCard: null,
    pendingPower: null,
    lastDiscardedCard: null,
    lastDiscardedById: null,
    reactionWindowOpen: false,
    reactions: [],
    nextReactionOrder: 1,
    finalRound: false,
    knockedById: null,
    gameOver: false,
    scores: {},
    power9Selection: null,
    powerFocusTargetId: null,
    peekRevealCard: null,
    powerCueCard: null,
    pendingGiveaway: null,
  };
}

// ─── Score Calculation ────────────────────────────────────────────────────────

export function calcHandScore(cards: (Card | null)[]): number {
  return cards.reduce((total, card) => (
    card?.faceUp ? total + card.value : total
  ), 0);
}

export function calcFinalScores(state: GameState): Record<string, number> {
  const scores: Record<string, number> = {};
  state.hands.forEach(hand => {
    // Reveal all cards for final scoring
    const revealedCards = hand.cards.map(c => c ? { ...c, faceUp: true } : null);
    scores[hand.playerId] = calcHandScore(revealedCards);
  });

  // 50-point knock penalty if knocker doesn't have the lowest score
  if (state.knockedById) {
    const knockerScore = scores[state.knockedById];
    const lowestScore = Math.min(...Object.values(scores));
    if (knockerScore > lowestScore) {
      scores[state.knockedById] += 50;
    }
  }

  return scores;
}

// ─── Turn Helpers ─────────────────────────────────────────────────────────────

function reshuffleDiscardIntoDraw(state: GameState): GameState {
  if (state.drawPile.length > 0) return state;
  const [keepTop, ...rest] = state.discardPile;
  if (rest.length === 0) return state;
  return {
    ...state,
    drawPile: shuffle(rest.map(c => ({ ...c, faceUp: false }))),
    discardPile: keepTop ? [keepTop] : [],
  };
}

function addCardToHand(cards: (Card | null)[], card: Card): (Card | null)[] {
  const nextCards = [...cards];
  const nullIdx = nextCards.findIndex(existing => existing === null);
  if (nullIdx !== -1) {
    nextCards[nullIdx] = card;
  } else {
    nextCards.push(card);
  }
  return nextCards;
}

function removeCardFromHand(
  hands: PlayerHand[],
  playerId: string,
  cardIndex: number,
): { hands: PlayerHand[]; removedCard: Card | null } {
  let removedCard: Card | null = null;

  const nextHands = hands.map(hand => {
    if (hand.playerId !== playerId) return hand;

    const cards = [...hand.cards];
    removedCard = cards[cardIndex] ?? null;
    cards[cardIndex] = null;

    return { ...hand, cards };
  });

  return { hands: nextHands, removedCard };
}

function addCardToSpecificHand(
  hands: PlayerHand[],
  playerId: string,
  card: Card,
): PlayerHand[] {
  return hands.map(hand => {
    if (hand.playerId !== playerId) return hand;
    return {
      ...hand,
      cards: addCardToHand(hand.cards, card),
    };
  });
}

function drawOnePenaltyCard(
  drawPile: Card[],
  discardPile: Card[],
): { drawPile: Card[]; discardPile: Card[]; card: Card | null } {
  let workingDraw = drawPile;
  let workingDiscard = discardPile;

  if (workingDraw.length === 0) {
    const reshuffled = reshuffleDiscardIntoDraw({
      drawPile: workingDraw,
      discardPile: workingDiscard,
      hands: [],
      playerOrder: [],
      currentPlayerIndex: 0,
      phase: 'draw',
      drawnCard: null,
      pendingPower: null,
      lastDiscardedCard: null,
      lastDiscardedById: null,
      reactionWindowOpen: false,
      reactions: [],
      finalRound: false,
      knockedById: null,
      gameOver: false,
      scores: {},
      power9Selection: null,
      powerFocusTargetId: null,
      peekRevealCard: null,
      powerCueCard: null,
      pendingGiveaway: null,
    } as GameState);

    workingDraw = reshuffled.drawPile;
    workingDiscard = reshuffled.discardPile;
  }

  if (workingDraw.length === 0) {
    return { drawPile: workingDraw, discardPile: workingDiscard, card: null };
  }

  const card = { ...workingDraw[workingDraw.length - 1], faceUp: false };
  workingDraw = workingDraw.slice(0, workingDraw.length - 1);

  return { drawPile: workingDraw, discardPile: workingDiscard, card };
}

export function advanceTurn(state: GameState): GameState {
  const next = (state.currentPlayerIndex + 1) % state.playerOrder.length;

  // Final round: if we've come back to the knocker, game ends
  if (state.finalRound && state.knockedById) {
    const knockerIdx = state.playerOrder.indexOf(state.knockedById);
    if (next === knockerIdx) {
      return endGame(state);
    }
  }

  return {
    ...state,
    currentPlayerIndex: next,
    phase: 'draw',
    drawnCard: null,
    pendingPower: null,
    lastDiscardedCard: null,
    lastDiscardedById: null,
    reactionWindowOpen: false,
    reactions: [],
    power9Selection: null,
    powerFocusTargetId: null,
    peekRevealCard: null,
    powerCueCard: null,
    pendingGiveaway: null,
  };
}

function endGame(state: GameState): GameState {
  const scores = calcFinalScores(state);
  // Reveal all cards
  const hands = state.hands.map(hand => ({
    ...hand,
    cards: hand.cards.map(c => c ? { ...c, faceUp: true } : null),
  }));
  return { ...state, hands, scores, phase: 'game_over', gameOver: true };
}

// ─── Player Disconnect ────────────────────────────────────────────────────────

export function removePlayer(state: GameState, playerId: string): GameState {
  if (!state.playerOrder.includes(playerId)) return state;
  if (state.phase === 'game_over') return state;

  const idx = state.playerOrder.indexOf(playerId);
  const newPlayerOrder = state.playerOrder.filter(id => id !== playerId);
  const newHands = state.hands.filter(h => h.playerId !== playerId);
  const isActivePlayer = (id: string) => newPlayerOrder.includes(id);

  // Only 1 player left — end game immediately
  if (newPlayerOrder.length <= 1) {
    return endGame({ ...state, playerOrder: newPlayerOrder, hands: newHands });
  }

  // Adjust currentPlayerIndex after removal
  let newIndex = state.currentPlayerIndex;
  if (idx < state.currentPlayerIndex) {
    newIndex = state.currentPlayerIndex - 1;
  } else if (idx === state.currentPlayerIndex) {
    newIndex = state.currentPlayerIndex % newPlayerOrder.length;
  }

  // If it was the disconnected player's turn, reset to draw phase for next player
  const wasTheirTurn = idx === state.currentPlayerIndex;

  const nextKnockedById = state.knockedById && isActivePlayer(state.knockedById)
    ? state.knockedById
    : null;
  const nextFinalRound = nextKnockedById ? state.finalRound : false;

  const nextReactions = state.reactions.filter(reaction => (
    isActivePlayer(reaction.playerId) && isActivePlayer(reaction.targetPlayerId)
  ));

  const nextPower9Selection = (state.power9Selection ?? []).filter(selection => (
    isActivePlayer(selection.playerId)
  ));

  const nextPendingGiveaway = state.pendingGiveaway &&
    isActivePlayer(state.pendingGiveaway.giverId) &&
    isActivePlayer(state.pendingGiveaway.receiverId)
      ? state.pendingGiveaway
      : null;

  const shouldAbortReactionWindow = state.reactionWindowOpen || state.phase === 'react';
  const shouldAbortGiveaway = state.phase === 'giveaway' || nextPendingGiveaway === null && state.pendingGiveaway !== null;
  const shouldResumeToSafeDraw = shouldAbortReactionWindow || shouldAbortGiveaway;
  const safeDrawIndex = wasTheirTurn ? newIndex : (newIndex + 1) % newPlayerOrder.length;

  const nextScores = Object.fromEntries(
    Object.entries(state.scores).filter(([id]) => isActivePlayer(id)),
  );

  if (shouldResumeToSafeDraw) {
    return {
      ...state,
      playerOrder: newPlayerOrder,
      hands: newHands,
      scores: nextScores,
      currentPlayerIndex: safeDrawIndex,
      phase: 'draw',
      drawnCard: null,
      pendingPower: null,
      lastDiscardedCard: null,
      lastDiscardedById: null,
      reactionWindowOpen: false,
      reactions: [],
      finalRound: nextFinalRound,
      knockedById: nextKnockedById,
      power9Selection: null,
      powerFocusTargetId: null,
      peekRevealCard: null,
      powerCueCard: null,
      pendingGiveaway: null,
    };
  }

  return {
    ...state,
    playerOrder: newPlayerOrder,
    hands: newHands,
    scores: nextScores,
    currentPlayerIndex: newIndex,
    finalRound: nextFinalRound,
    knockedById: nextKnockedById,
    phase: wasTheirTurn ? 'draw' : state.phase,
    drawnCard: wasTheirTurn ? null : state.drawnCard,
    pendingPower: wasTheirTurn ? null : state.pendingPower,
    lastDiscardedById: state.lastDiscardedById === playerId ? null : state.lastDiscardedById,
    reactionWindowOpen: false,
    reactions: nextReactions,
    power9Selection: wasTheirTurn ? null : (nextPower9Selection.length > 0 ? nextPower9Selection : null),
    powerFocusTargetId: wasTheirTurn || state.powerFocusTargetId === playerId ? null : state.powerFocusTargetId,
    peekRevealCard: wasTheirTurn || state.peekRevealCard?.playerId === playerId ? null : state.peekRevealCard,
    powerCueCard: wasTheirTurn || state.powerCueCard?.playerId === playerId ? null : state.powerCueCard,
    pendingGiveaway: nextPendingGiveaway,
  };
}

// ─── Phase: Peek ──────────────────────────────────────────────────────────────

// Called after the 5-second peek timer ends on all clients.
// Ignore stale timer completions once the game has already advanced.
export function endPeekPhase(state: GameState): GameState {
  if (state.phase !== 'peek') return state;
  return { ...state, phase: 'draw' };
}

// ─── Phase: Draw ──────────────────────────────────────────────────────────────

export function drawFromPile(state: GameState, playerId: string): GameState {
  if (state.phase !== 'draw') return state;
  if (state.playerOrder[state.currentPlayerIndex] !== playerId) return state;

  let s = reshuffleDiscardIntoDraw(state);
  if (s.drawPile.length === 0) return s; // no cards to draw

  // Keep face-down in shared Firestore state — only the drawing player's client
  // will flip it face-up locally so opponents cannot see the card value.
  const drawn = { ...s.drawPile[s.drawPile.length - 1], faceUp: false };
  const newDrawPile = s.drawPile.slice(0, s.drawPile.length - 1);

  const isPower = ['7', '8', '9', '10'].includes(drawn.rank);

  return {
    ...s,
    drawPile: newDrawPile,
    drawnCard: drawn,
    pendingPower: isPower ? (drawn.rank as PowerRank) : null,
    phase: isPower ? 'power' : 'swap',
  };
}

export function takeFromDiscard(state: GameState, playerId: string): GameState {
  if (state.phase !== 'draw') return state;
  if (state.playerOrder[state.currentPlayerIndex] !== playerId) return state;
  if (state.discardPile.length === 0) return state;

  const [top, ...rest] = state.discardPile;
  return {
    ...state,
    discardPile: rest,
    drawnCard: { ...top, faceUp: true },
    pendingPower: null,  // Power only activates when drawn from deck
    phase: 'swap',
  };
}

// ─── Phase: Power ─────────────────────────────────────────────────────────────

// Skip power — treat drawn card as a normal card (go to swap phase)
export function skipPower(state: GameState, playerId: string): GameState {
  if (state.phase !== 'power') return state;
  if (state.playerOrder[state.currentPlayerIndex] !== playerId) return state;
  return { ...state, phase: 'swap', pendingPower: null, powerFocusTargetId: null, peekRevealCard: null, powerCueCard: null };
}

function discardActivePowerCard(state: GameState, playerId: string, hands = state.hands): GameState {
  if (!state.drawnCard) return state;

  const discarded = { ...state.drawnCard, faceUp: true };
  return {
    ...state,
    hands,
    drawnCard: null,
    discardPile: [discarded, ...state.discardPile],
    lastDiscardedCard: discarded,
    lastDiscardedById: playerId,
    phase: 'react',
    pendingPower: null,
    reactionWindowOpen: true,
    reactions: [],
    power9Selection: null,
    powerFocusTargetId: null,
    peekRevealCard: null,
    powerCueCard: null,
  };
}

// Power 7: peek at one of your own hidden cards (just reveals it temporarily — UI handles display)
export function usePower7(state: GameState, playerId: string, cardIndex: number): GameState {
  if (state.phase !== 'power' || state.pendingPower !== '7') return state;
  if (state.playerOrder[state.currentPlayerIndex] !== playerId) return state;
  const targetCard = state.hands.find(entry => entry.playerId === playerId)?.cards[cardIndex];
  if (!targetCard || targetCard.faceUp) return state;
  return discardActivePowerCard(state, playerId);
}

// Power 8: peek at one hidden card of an opponent (reveals it temporarily)
export function usePower8(
  state: GameState,
  actingPlayerId: string,
  targetPlayerId: string,
  cardIndex: number,
): GameState {
  if (state.phase !== 'power' || state.pendingPower !== '8') return state;
  if (state.playerOrder[state.currentPlayerIndex] !== actingPlayerId) return state;
  if (targetPlayerId === actingPlayerId) return state;
  const targetCard = state.hands.find(entry => entry.playerId === targetPlayerId)?.cards[cardIndex];
  if (!targetCard || targetCard.faceUp) return state;
  return discardActivePowerCard(state, actingPlayerId);
}

// Power 9: peek any 2 cards. Call this twice (once per card selection), then call confirmPower9.
export function selectPower9Card(
  state: GameState,
  actingPlayerId: string,
  targetPlayerId: string,
  cardIndex: number,
): GameState {
  if (state.phase !== 'power' || state.pendingPower !== '9') return state;
  if (state.playerOrder[state.currentPlayerIndex] !== actingPlayerId) return state;
  const targetHand = state.hands.find(hand => hand.playerId === targetPlayerId);
  if (!targetHand?.cards[cardIndex]) return state;

  const current = state.power9Selection ?? [];
  if (current.length >= 2) return state;
  if (current.some(selection => selection.playerId === targetPlayerId)) {
    return state;
  }
  if (current.some(selection => selection.playerId === targetPlayerId && selection.cardIndex === cardIndex)) {
    return state;
  }

  const selection = [...current, { playerId: targetPlayerId, cardIndex }];
  return { ...state, power9Selection: selection };
}

// Power 9: after seeing both cards, optionally swap them
export function confirmPower9(
  state: GameState,
  actingPlayerId: string,
  doSwap: boolean,
): GameState {
  if (state.phase !== 'power' || state.pendingPower !== '9') return state;
  if (state.playerOrder[state.currentPlayerIndex] !== actingPlayerId) return state;
  if (!state.power9Selection || state.power9Selection.length < 2) return state;

  const [sel1, sel2] = state.power9Selection;
  let hands = state.hands;

  if (doSwap) {
    const hand1 = hands.find(h => h.playerId === sel1.playerId);
    const hand2 = hands.find(h => h.playerId === sel2.playerId);
    if (hand1 && hand2) {
      const card1 = hand1.cards[sel1.cardIndex];
      const card2 = hand2.cards[sel2.cardIndex];
      hands = hands.map(hand => {
        if (hand.playerId === sel1.playerId) {
          const cards = [...hand.cards];
          cards[sel1.cardIndex] = card2 ? { ...card2, faceUp: false } : null;
          return { ...hand, cards };
        }
        if (hand.playerId === sel2.playerId) {
          const cards = [...hand.cards];
          cards[sel2.cardIndex] = card1 ? { ...card1, faceUp: false } : null;
          return { ...hand, cards };
        }
        return hand;
      });
    }
  } else {
    // Re-hide the peeked cards
    hands = hands.map(hand => {
      const sels = state.power9Selection!.filter(s => s.playerId === hand.playerId);
      if (sels.length === 0) return hand;
      return {
        ...hand,
        cards: hand.cards.map((c, i) => {
          const wasPeeked = sels.some(s => s.cardIndex === i);
          return wasPeeked && c ? { ...c, faceUp: false } : c;
        }),
      };
    });
  }

  return discardActivePowerCard(state, actingPlayerId, hands);
}

// Power 10: blindly swap 2 players' cards (no peeking)
export function usePower10(
  state: GameState,
  actingPlayerId: string,
  card1: { playerId: string; cardIndex: number },
  card2: { playerId: string; cardIndex: number },
): GameState {
  if (state.phase !== 'power' || state.pendingPower !== '10') return state;
  if (state.playerOrder[state.currentPlayerIndex] !== actingPlayerId) return state;
  if (card1.playerId === card2.playerId) {
    return state;
  }

  const hand1 = state.hands.find(h => h.playerId === card1.playerId);
  const hand2 = state.hands.find(h => h.playerId === card2.playerId);
  if (!hand1 || !hand2) return state;

  const c1 = hand1.cards[card1.cardIndex];
  const c2 = hand2.cards[card2.cardIndex];
  if (!c1 || !c2) return state;

  const hands = state.hands.map(hand => {
    if (hand.playerId === card1.playerId) {
      const cards = [...hand.cards];
      cards[card1.cardIndex] = c2 ? { ...c2, faceUp: false } : null;
      return { ...hand, cards };
    }
    if (hand.playerId === card2.playerId) {
      const cards = [...hand.cards];
      cards[card2.cardIndex] = c1 ? { ...c1, faceUp: false } : null;
      return { ...hand, cards };
    }
    return hand;
  });

  return discardActivePowerCard(state, actingPlayerId, hands);
}

// ─── Phase: Swap ──────────────────────────────────────────────────────────────

// Keep drawn card: swap it into the hand at cardIndex, discard the old card
export function swapCard(state: GameState, playerId: string, cardIndex: number): GameState {
  if (state.phase !== 'swap' || !state.drawnCard) return state;
  if (state.playerOrder[state.currentPlayerIndex] !== playerId) return state;

  const oldCard = state.hands.find(h => h.playerId === playerId)?.cards[cardIndex] ?? null;
  const discarded = oldCard ? { ...oldCard, faceUp: true } : state.drawnCard;

  const hands = state.hands.map(hand => {
    if (hand.playerId !== playerId) return hand;
    const cards = [...hand.cards];
    cards[cardIndex] = { ...state.drawnCard!, faceUp: false };
    return { ...hand, cards };
  });

  return {
    ...state,
    hands,
    drawnCard: null,
    discardPile: [discarded, ...state.discardPile],
    lastDiscardedCard: discarded,
    lastDiscardedById: playerId,
    phase: 'react',
    reactionWindowOpen: true,
    reactions: [],
  };
}

// Discard the drawn card without swapping
export function discardDrawnCard(state: GameState, playerId: string): GameState {
  if (state.phase !== 'swap' || !state.drawnCard) return state;
  if (state.playerOrder[state.currentPlayerIndex] !== playerId) return state;

  const discarded = { ...state.drawnCard, faceUp: true };

  return {
    ...state,
    drawnCard: null,
    discardPile: [discarded, ...state.discardPile],
    lastDiscardedCard: discarded,
    lastDiscardedById: playerId,
    phase: 'react',
    reactionWindowOpen: true,
    reactions: [],
  };
}

// ─── Phase: React ─────────────────────────────────────────────────────────────

function isReactionBlockedByKnock(
  state: GameState,
  reactingPlayerId: string,
  targetPlayerId: string,
): boolean {
  if (!state.knockedById) return false;
  return reactingPlayerId === state.knockedById || targetPlayerId === state.knockedById;
}

// A player submits a reaction (they claim to have a matching card)
export function submitReaction(
  state: GameState,
  reactingPlayerId: string,
  targetPlayerId: string,
  cardIndex: number,
  timestamp: number,
  serverOrder?: number | null,
): GameState {
  if (!state.reactionWindowOpen) return state;
  if (!state.playerOrder.includes(reactingPlayerId)) return state;
  if (!state.playerOrder.includes(targetPlayerId)) return state;
  if (state.reactions.some(r => r.playerId === reactingPlayerId)) return state;
  if (isReactionBlockedByKnock(state, reactingPlayerId, targetPlayerId)) return state;

  return {
    ...state,
    reactions: [
      ...state.reactions,
      { playerId: reactingPlayerId, targetPlayerId, cardIndex, timestamp, serverOrder: serverOrder ?? null },
    ],
  };
}

export function compareReactionEntries(a: ReactionEntry, b: ReactionEntry): number {
  const aHasServerOrder = typeof a.serverOrder === 'number';
  const bHasServerOrder = typeof b.serverOrder === 'number';

  if (aHasServerOrder && bHasServerOrder && a.serverOrder !== b.serverOrder) {
    return a.serverOrder - b.serverOrder;
  }

  if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
  if (aHasServerOrder !== bHasServerOrder) return aHasServerOrder ? -1 : 1;
  if (a.playerId !== b.playerId) return a.playerId.localeCompare(b.playerId);
  if (a.targetPlayerId !== b.targetPlayerId) return a.targetPlayerId.localeCompare(b.targetPlayerId);
  return a.cardIndex - b.cardIndex;
}

// Called when the 3-second reaction window closes
export function resolveReactionWindow(state: GameState): GameState {
  if (!state.reactionWindowOpen) return state;

  if (!state.lastDiscardedCard) {
    return advanceTurn({ ...state, reactionWindowOpen: false, reactions: [] });
  }

  const discardedValue = state.lastDiscardedCard.value;
  const activePlayerIds = new Set(state.playerOrder);
  const sorted = [...state.reactions]
    .filter(reaction => activePlayerIds.has(reaction.playerId) && activePlayerIds.has(reaction.targetPlayerId))
    .filter(reaction => !isReactionBlockedByKnock(state, reaction.playerId, reaction.targetPlayerId))
    .sort(compareReactionEntries);

  const winningReaction =
    sorted.find(reaction => {
      const targetHand = state.hands.find(h => h.playerId === reaction.targetPlayerId);
      const selectedCard = targetHand?.cards[reaction.cardIndex];
      return selectedCard !== null && selectedCard?.value === discardedValue;
    }) ?? null;

  let hands = state.hands;
  let drawPile = state.drawPile;
  let discardPile = state.discardPile;

  const applyOnePenalty = (playerId: string) => {
    const drawn = drawOnePenaltyCard(drawPile, discardPile);
    drawPile = drawn.drawPile;
    discardPile = drawn.discardPile;

    if (drawn.card) {
      hands = addCardToSpecificHand(hands, playerId, drawn.card);
    }
  };

  for (const reaction of sorted) {
    const isWinner =
      winningReaction &&
      reaction.playerId === winningReaction.playerId &&
      reaction.targetPlayerId === winningReaction.targetPlayerId &&
      reaction.cardIndex === winningReaction.cardIndex &&
      reaction.timestamp === winningReaction.timestamp &&
      (reaction.serverOrder ?? null) === (winningReaction.serverOrder ?? null);

    const targetHand = hands.find(h => h.playerId === reaction.targetPlayerId);
    const selectedCard = targetHand?.cards[reaction.cardIndex] ?? null;

    if (!selectedCard) {
      applyOnePenalty(reaction.playerId);
      continue;
    }

    const isCorrect = selectedCard.value === discardedValue;
    const isOwnCard = reaction.playerId === reaction.targetPlayerId;

    if (isWinner && isCorrect && isOwnCard) {
      const removed = removeCardFromHand(hands, reaction.playerId, reaction.cardIndex);
      hands = removed.hands;

      if (removed.removedCard) {
        discardPile = [{ ...removed.removedCard, faceUp: true }, ...discardPile];
      }
      continue;
    }

    if (isWinner && isCorrect && !isOwnCard) {
      const removed = removeCardFromHand(hands, reaction.targetPlayerId, reaction.cardIndex);
      hands = removed.hands;

      if (removed.removedCard) {
        discardPile = [{ ...removed.removedCard, faceUp: true }, ...discardPile];
      }

      return {
        ...state,
        hands,
        drawPile,
        discardPile,
        reactionWindowOpen: false,
        reactions: [],
        phase: 'giveaway',
        pendingGiveaway: {
          giverId: reaction.playerId,
          receiverId: reaction.targetPlayerId,
        },
      };
    }

    if (isOwnCard) {
      applyOnePenalty(reaction.playerId);
    } else {
      const removed = removeCardFromHand(hands, reaction.targetPlayerId, reaction.cardIndex);
      hands = removed.hands;

      if (removed.removedCard) {
        hands = addCardToSpecificHand(hands, reaction.playerId, {
          ...removed.removedCard,
          faceUp: false,
        });
      }

      applyOnePenalty(reaction.playerId);
    }
  }

  return advanceTurn({
    ...state,
    hands,
    drawPile,
    discardPile,
    reactionWindowOpen: false,
    reactions: [],
    pendingGiveaway: null,
  });
}

export function giveAwayCard(
  state: GameState,
  giverId: string,
  giverCardIndex: number,
): GameState {
  if (state.phase !== 'giveaway' || !state.pendingGiveaway) return state;
  if (state.pendingGiveaway.giverId !== giverId) return state;
  if (!state.hands.some(hand => hand.playerId === state.pendingGiveaway.receiverId)) {
    return advanceTurn({
      ...state,
      pendingGiveaway: null,
      reactionWindowOpen: false,
      reactions: [],
    });
  }

  const giverHand = state.hands.find(h => h.playerId === giverId);
  const selectedCard = giverHand?.cards[giverCardIndex] ?? null;
  if (!selectedCard) return state;

  const removed = removeCardFromHand(state.hands, giverId, giverCardIndex);
  let hands = removed.hands;

  if (removed.removedCard) {
    hands = addCardToSpecificHand(
      hands,
      state.pendingGiveaway.receiverId,
      { ...removed.removedCard, faceUp: false },
    );
  }

  return advanceTurn({
    ...state,
    hands,
    phase: 'giveaway',
    pendingGiveaway: null,
    reactionWindowOpen: false,
    reactions: [],
  });
}

// ─── Knock ────────────────────────────────────────────────────────────────────

export function knock(state: GameState, playerId: string): GameState {
  if (state.finalRound) return state; // can't knock twice
  if (state.playerOrder[state.currentPlayerIndex] !== playerId) return state;
  if (state.phase === 'game_over' || state.phase === 'react') return state;

  const knockedState: GameState = {
    ...state,
    finalRound: true,
    knockedById: playerId,
    drawnCard: null,
    pendingPower: null,
    reactionWindowOpen: false,
    reactions: [],
    power9Selection: null,
    powerFocusTargetId: null,
    peekRevealCard: null,
    powerCueCard: null,
  };

  // Knocking uses up the current player's turn immediately.
  // advanceTurn() already knows to end the game once the turn
  // cycles back to the knocker.
  return advanceTurn(knockedState);
}
