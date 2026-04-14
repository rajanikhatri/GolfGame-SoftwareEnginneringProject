import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { registerPresence, subscribeToRoomPresence } from '../database/firebase';
import {
  subscribeToGameState,
  syncEndPeek,
  syncDrawFromPile,
  syncTakeFromDiscard,
  syncSkipPower,
  syncUsePower7,
  syncUsePower8,
  syncSelectPower9Card,
  syncConfirmPower9,
  syncUsePower10,
  syncSwapCard,
  syncDiscardDrawn,
  syncReaction,
  syncKnock,
  syncResolveReactionWindow,
  saveInitialGameState,
  syncRemovePlayer,
  syncGiveAwayCard,
} from '../database/firebaseGameSync';
import {
  createInitialGameState,
  getCardValue,
  type GameState,
  type GamePhase as EnginePhase,
} from './gameEngine';

type PerfGlobal = typeof globalThis & {
  __GOLF_DEBUG_PERF__?: boolean;
};

function isPerfDebugEnabled() {
  if (!import.meta.env.DEV) return false;

  const perfGlobal = globalThis as PerfGlobal;
  const globalFlag = perfGlobal.__GOLF_DEBUG_PERF__ === true;
  const storageFlag =
    typeof window !== 'undefined' &&
    window.localStorage.getItem('golf:debug-perf') === '1';

  return globalFlag || storageFlag;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Suit = 'hearts' | 'diamonds' | 'spades' | 'clubs' | 'joker';
export type GamePhase = 'peek' | 'draw' | 'swap' | 'match_window' | 'power' | 'giveaway' | 'game_over';

export interface Card {
  id: string;
  value: number;
  suit: Suit;
  rank: string;
  faceUp: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
  glowColor: string;
  cards: (Card | null)[][];
  score: number;
  isAI: boolean;
  isReady: boolean;
  hasKnocked: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  color: string;
  glowColor: string;
}

// Still used by Lobby for the initial deal flow
export interface SerializedGameState {
  drawPile: Card[];
  discardPile: Card[];
  playerHands: { id: string; name: string; cards: (Card | null)[] }[];
}

export interface PowerCardSelection {
  playerId: string;
  cardFlatIndex: number;
}

interface GameContextType {
  gameMode: 'multiplayer' | 'solo' | null;
  setGameMode: (mode: 'multiplayer' | 'solo') => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  roomCode: string;
  setRoomCode: (code: string) => void;
  myPlayerId: string;
  isMyTurn: boolean;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  drawPile: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  drawnCard: Card | null;
  phase: GamePhase;
  finalRound: boolean;
  knockedBy: string | null;
  matchWindowActive: boolean;
  matchCountdown: number;
  aiThinking: boolean;
  winner: Player | null;
  chatMessages: ChatMessage[];
  lastPlayedCard: Card | null;
  pendingPower: '7' | '8' | '9' | '10' | null;
  giveawayGiverId: string | null;
  // Called from Lobby when game is about to start (multiplayer).
  // Host passes roomPlayerIds to create the deck in Firestore; joiners omit it.
  initMultiplayer: (
    myId: string,
    profiles: PlayerProfile[],
    roomPlayerIds?: string[],
  ) => Promise<void>;
  initGame: (roomPlayers?: Array<{ id: string; name: string }>) => void;
  initGameFromState: (state: SerializedGameState, roomPlayers: Array<{ id: string; name: string }>) => void;
  drawFromPile: () => void;
  takeFromDiscard: () => void;
  swapCard: (row: number, col: number) => void;
  discardDrawn: () => void;
  reactToDiscard: (targetPlayerId: string, row: number, col: number) => void;
  giveAwayCardAction: (row: number, col: number) => void;
  knock: () => void;
  skipPower: () => void;
  swapCountdown: number | null;
  disconnectedPlayerName: string | null;
  sendChat: (message: string) => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  endPeek: () => void;
  resetGame: () => void;
  resolvePower: (targetPlayerId?: string, cardFlatIndex?: number) => void;
  selectPower9Card: (targetPlayerId: string, cardFlatIndex: number) => void;
  confirmPower9: (doSwap: boolean, selections: PowerCardSelection[]) => void;
  usePower10: (card1: PowerCardSelection, card2: PowerCardSelection) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUITS: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs'];
const RANKS = [
  { rank: 'A', value: 1 }, { rank: '2', value: 2 }, { rank: '3', value: 3 },
  { rank: '4', value: 4 }, { rank: '5', value: 5 }, { rank: '6', value: 6 },
  { rank: '7', value: 7 }, { rank: '8', value: 8 }, { rank: '9', value: 9 },
  { rank: '10', value: 10 }, { rank: 'J', value: 10 }, { rank: 'Q', value: 10 },
  { rank: 'K', value: -2 },
];

const PLAYER_CONFIGS = [
  { id: 'p1', name: 'YOU',   avatar: '🎮', color: '#1E88E5', glowColor: 'rgba(30,136,229,0.7)' },
  { id: 'p2', name: 'ALEX',  avatar: '🦊', color: '#E53935', glowColor: 'rgba(229,57,53,0.7)' },
  { id: 'p3', name: 'JAMIE', avatar: '🐼', color: '#43A047', glowColor: 'rgba(67,160,71,0.7)' },
  { id: 'p4', name: 'RILEY', avatar: '🦋', color: '#AB47BC', glowColor: 'rgba(171,71,188,0.7)' },
];

const PLAYER_COLORS  = ['#1E88E5', '#E53935', '#43A047', '#AB47BC'];
const PLAYER_AVATARS = ['🎮', '🦊', '🐼', '🦋'];
const GLOW_COLORS    = ['rgba(30,136,229,0.7)', 'rgba(229,57,53,0.7)', 'rgba(67,160,71,0.7)', 'rgba(171,71,188,0.7)'];

const LOBBY_MESSAGES: ChatMessage[] = [
  { id: 'l1', playerId: 'p2', playerName: 'ALEX',  message: "Let's go! 🔥",               timestamp: new Date(Date.now() - 60000) },
  { id: 'l2', playerId: 'p3', playerName: 'JAMIE', message: "I'm gonna destroy you all 😈", timestamp: new Date(Date.now() - 40000) },
  { id: 'l3', playerId: 'p4', playerName: 'RILEY', message: "Bring it on! Low score wins 🏌️", timestamp: new Date(Date.now() - 20000) },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createDeck(): Card[] {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(({ rank }) => {
      deck.push({
        id: `${suit}-${rank}-${Math.random().toFixed(6)}`,
        value: getCardValue(rank, suit),
        suit,
        rank,
        faceUp: false,
      });
    });
  });
  deck.push({ id: `joker-1-${Math.random()}`, value: -1, suit: 'joker', rank: '★', faceUp: false });
  deck.push({ id: `joker-2-${Math.random()}`, value: -1, suit: 'joker', rank: '★', faceUp: false });
  return shuffleArr(deck);
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function calcScore(cards: (Card | null)[][]): number {
  let total = 0;
  for (let col = 0; col < 2; col++) {
    const top = cards[0]?.[col];
    const bot = cards[1]?.[col];
    if (top?.faceUp && bot?.faceUp && top.value === bot.value) continue;
    if (top?.faceUp) total += top.value;
    if (bot?.faceUp) total += bot.value;
  }
  for (let row = 2; row < cards.length; row++) {
    for (let col = 0; col < 2; col++) {
      if (cards[row]?.[col]?.faceUp) total += cards[row][col]!.value;
    }
  }
  return total;
}

function flatCardsToRows(flat: (Card | null)[]): (Card | null)[][] {
  const rows: (Card | null)[][] = [];
  for (let i = 0; i < flat.length; i += 2) {
    rows.push([flat[i] ?? null, flat[i + 1] ?? null]);
  }
  return rows.length > 0 ? rows : [[null, null]];
}

function addCardToGrid(cards: (Card | null)[][], card: Card): (Card | null)[][] {
  const nextCards = cards.map(row => [...row]);
  for (let row = 0; row < nextCards.length; row++) {
    for (let col = 0; col < 2; col++) {
      if (nextCards[row]?.[col] === null) {
        nextCards[row][col] = card;
        return nextCards;
      }
    }
  }
  nextCards.push([card, null]);
  return nextCards;
}

function clonePenaltyCard(card: Card, ownerId: string): Card {
  return {
    ...card,
    id: `${card.id}-penalty-${ownerId}-${Math.random().toFixed(6)}`,
    faceUp: false,
  };
}

function flatIndexToRowCol(flatIndex: number): { row: number; col: number } {
  return { row: Math.floor(flatIndex / 2), col: flatIndex % 2 };
}

function cardsMatchForRender(
  previousCards: (Card | null)[][],
  nextCards: (Card | null)[][],
): boolean {
  if (previousCards.length !== nextCards.length) return false;

  for (let row = 0; row < previousCards.length; row++) {
    const previousRow = previousCards[row] ?? [];
    const nextRow = nextCards[row] ?? [];
    if (previousRow.length !== nextRow.length) return false;

    for (let col = 0; col < previousRow.length; col++) {
      const previousCard = previousRow[col];
      const nextCard = nextRow[col];

      if (previousCard === nextCard) continue;
      if (!previousCard || !nextCard) {
        if (previousCard !== nextCard) return false;
        continue;
      }

      if (
        previousCard.id !== nextCard.id ||
        previousCard.faceUp !== nextCard.faceUp ||
        previousCard.rank !== nextCard.rank ||
        previousCard.suit !== nextCard.suit ||
        previousCard.value !== nextCard.value
      ) {
        return false;
      }
    }
  }

  return true;
}

function reuseStablePlayers(previousPlayers: Player[], nextPlayers: Player[]): Player[] {
  if (previousPlayers.length === 0) return nextPlayers;

  return nextPlayers.map(nextPlayer => {
    const previousPlayer = previousPlayers.find(player => player.id === nextPlayer.id);
    if (!previousPlayer) return nextPlayer;

    const samePlayer =
      previousPlayer.name === nextPlayer.name &&
      previousPlayer.avatar === nextPlayer.avatar &&
      previousPlayer.color === nextPlayer.color &&
      previousPlayer.glowColor === nextPlayer.glowColor &&
      previousPlayer.score === nextPlayer.score &&
      previousPlayer.isAI === nextPlayer.isAI &&
      previousPlayer.isReady === nextPlayer.isReady &&
      previousPlayer.hasKnocked === nextPlayer.hasKnocked &&
      cardsMatchForRender(previousPlayer.cards, nextPlayer.cards);

    return samePlayer ? previousPlayer : nextPlayer;
  });
}

// Convert engine GameState → local Player[] (reordered so myPlayerId is first)
function engineStateToPlayers(
  state: GameState,
  profiles: PlayerProfile[],
  myPlayerId: string,
): { players: Player[]; localCurrentIndex: number } {
  const myIdx = state.hands.findIndex(h => h.playerId === myPlayerId);
  const reordered = myIdx > 0
    ? [...state.hands.slice(myIdx), ...state.hands.slice(0, myIdx)]
    : state.hands;

  const actualCurrentId = state.playerOrder[state.currentPlayerIndex];
  const localCurrentIndex = Math.max(0, reordered.findIndex(h => h.playerId === actualCurrentId));

  const players: Player[] = reordered.map((hand, i) => {
    const profile = profiles.find(p => p.id === hand.playerId);
    const flat = hand.cards as (Card | null)[];
    const cards = flatCardsToRows(flat);
    return {
      id: hand.playerId,
      name:      profile?.name      ?? `Player ${i + 1}`,
      avatar:    profile?.avatar    ?? PLAYER_AVATARS[i] ?? '🎮',
      color:     profile?.color     ?? PLAYER_COLORS[i]  ?? '#1E88E5',
      glowColor: profile?.glowColor ?? GLOW_COLORS[i]    ?? 'rgba(30,136,229,0.7)',
      cards,
      score: state.scores[hand.playerId] ?? 0,
      isAI: false,
      isReady: true,
      hasKnocked: state.knockedById === hand.playerId,
    };
  });

  return { players, localCurrentIndex };
}

// Map engine phase to context phase
function mapPhase(enginePhase: EnginePhase): GamePhase {
  if (enginePhase === 'react') return 'match_window';
  if (enginePhase === 'peek') return 'peek';
  if (enginePhase === 'giveaway') return 'giveaway';
  return enginePhase as GamePhase;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

// Keep buildInitialGameState exported for Lobby backward compat (now delegates to engine)
export function buildInitialGameState(
  roomPlayers: Array<{ id: string; name: string }>,
): SerializedGameState {
  const deck = createDeck();
  const playerHands = roomPlayers.map(p => {
    const cards: (Card | null)[] = [];
    for (let i = 0; i < 4; i++) cards.push(deck.pop()!);
    return { id: p.id, name: p.name, cards };
  });
  const firstDiscard = deck.pop()!;
  firstDiscard.faceUp = true;
  return { drawPile: deck, discardPile: [firstDiscard], playerHands };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameMode,   setGameMode]   = useState<'multiplayer' | 'solo' | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [roomCode,   setRoomCode]   = useState('');
  const [myPlayerId, setMyPlayerId] = useState('');
  const [playerProfiles, setPlayerProfiles] = useState<PlayerProfile[]>([]);

  const [players,            setPlayers]            = useState<Player[]>([]);
  const [drawPile,           setDrawPile]           = useState<Card[]>([]);
  const [discardPile,        setDiscardPile]        = useState<Card[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [drawnCard,          setDrawnCard]          = useState<Card | null>(null);
  const [phase,              setPhase]              = useState<GamePhase>('draw');
  const [finalRound,         setFinalRound]         = useState(false);
  const [knockedBy,          setKnockedBy]          = useState<string | null>(null);
  const [matchWindowActive,  setMatchWindowActive]  = useState(false);
  const [matchCountdown,     setMatchCountdown]     = useState(3);
  const [aiThinking,         setAiThinking]         = useState(false);
  const [winner,             setWinner]             = useState<Player | null>(null);
  const [chatMessages,       setChatMessages]       = useState<ChatMessage[]>(LOBBY_MESSAGES);
  const [lastPlayedCard,     setLastPlayedCard]     = useState<Card | null>(null);
  const [pendingPower,          setPendingPower]          = useState<'7' | '8' | '9' | '10' | null>(null);
  const [giveawayGiverId,       setGiveawayGiverId]       = useState<string | null>(null);
  const [disconnectedPlayerName, setDisconnectedPlayerName] = useState<string | null>(null);
  const [swapCountdown,         setSwapCountdown]         = useState<number | null>(null);

  const drawPileRef    = useRef<Card[]>([]);
  const discardPileRef = useRef<Card[]>([]);
  const playersRef     = useRef<Player[]>([]);
  const finalRoundRef  = useRef(false);
  const knockedByRef   = useRef<string | null>(null);
  const currentPlayerIndexRef = useRef(0);
  const lastPlayedCardRef = useRef<Card | null>(null);
  const gameActiveRef  = useRef(false);
  const matchTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const swapTimerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomCodeRef        = useRef('');
  const playerProfilesRef  = useRef<PlayerProfile[]>([]);
  const myPlayerIdRef      = useRef('');
  const lastGameStateRef   = useRef<GameState | null>(null);
  const soloPendingGiveawayRef = useRef<{ giverId: string; receiverId: string } | null>(null);

  // These four are updated in effects (only used in async callbacks, fine to be one render late)
  useEffect(() => { drawPileRef.current    = drawPile;    }, [drawPile]);
  useEffect(() => { discardPileRef.current = discardPile; }, [discardPile]);
  useEffect(() => { playersRef.current     = players;     }, [players]);
  useEffect(() => { finalRoundRef.current  = finalRound;  }, [finalRound]);
  useEffect(() => { knockedByRef.current   = knockedBy;   }, [knockedBy]);
  useEffect(() => { roomCodeRef.current    = roomCode;    }, [roomCode]);
  useEffect(() => { currentPlayerIndexRef.current = currentPlayerIndex; }, [currentPlayerIndex]);
  useEffect(() => { lastPlayedCardRef.current = lastPlayedCard; }, [lastPlayedCard]);

  // These two must be in sync during render so applyEngineState always reads the latest value
  playerProfilesRef.current = playerProfiles;
  myPlayerIdRef.current     = myPlayerId;

  // Derived: is it the current user's turn?
  const isMyTurn = gameMode === 'solo'
    ? currentPlayerIndex === 0
    : currentTurnPlayerId === myPlayerId;

  // ── Multiplayer: Subscribe to Firestore game state ──────────────────────────
  useEffect(() => {
    if (gameMode !== 'multiplayer' || !roomCode) return;

    const unsub = subscribeToGameState(roomCode, (state: GameState | null) => {
      if (!state) return;
      lastGameStateRef.current = state;
      applyEngineState(state);
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, roomCode]);

  // ── Re-apply cached game state when profiles arrive (non-host race condition) ─
  // The Firestore snapshot can fire before initMultiplayer sets playerProfiles,
  // leaving player names as "Player 1", "Player 2" fallbacks. Once profiles load,
  // re-run applyEngineState so names are resolved correctly.
  useEffect(() => {
    if (gameMode !== 'multiplayer' || playerProfiles.length === 0) return;
    if (lastGameStateRef.current) {
      applyEngineState(lastGameStateRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerProfiles, gameMode]);

  useEffect(() => {
    if (gameMode !== 'multiplayer' || !myPlayerId) return;
    if (lastGameStateRef.current) {
      applyEngineState(lastGameStateRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPlayerId, gameMode]);

  // ── Multiplayer: Presence (disconnect detection) ───────────────────────────
  const prevOnlineIdsRef = useRef<string[]>([]);
  useEffect(() => {
    if (gameMode !== 'multiplayer' || !roomCode) return;

    const unsub = subscribeToRoomPresence(roomCode, (onlineIds: string[]) => {
      const prev = prevOnlineIdsRef.current;
      // Find players who just went offline
      const disconnected = prev.filter(id => !onlineIds.includes(id));
      disconnected.forEach(id => {
        const profile = playerProfilesRef.current.find(p => p.id === id);
        const name = profile?.name ?? 'A player';
        setDisconnectedPlayerName(name);
        // Remove them from the game engine state in Firestore
        syncRemovePlayer(roomCodeRef.current, id).catch(console.error);
        // Clear the notification after 4 seconds
        setTimeout(() => setDisconnectedPlayerName(null), 4000);
      });
      prevOnlineIdsRef.current = onlineIds;
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, roomCode]);

  // ── Multiplayer: Reaction window timer ─────────────────────────────────────
  // Each client independently runs the 3-second countdown.
  // The first one to call syncResolveReactionWindow wins the Firestore transaction.
  useEffect(() => {
    if (gameMode !== 'multiplayer' || !matchWindowActive) return;
    let count = 3;
    setMatchCountdown(3);
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    matchTimerRef.current = setInterval(() => {
      count--;
      setMatchCountdown(count);
      if (count <= 0) {
        if (matchTimerRef.current) clearInterval(matchTimerRef.current);
        syncResolveReactionWindow(roomCodeRef.current).catch(console.error);
      }
    }, 1000);
    return () => { if (matchTimerRef.current) clearInterval(matchTimerRef.current); };
  }, [gameMode, matchWindowActive]);

  // ── 10-second swap decision timer ───────────────────────────────────────────
  // Starts when it's the local player's turn and the phase is 'swap' or 'power'.
  // Auto-discards the drawn card if the player doesn't act in time.
  useEffect(() => {
    const isMySwapTurn = isMyTurn && (phase === 'swap' || phase === 'power');
    if (!isMySwapTurn) {
      if (swapTimerRef.current) clearInterval(swapTimerRef.current);
      setSwapCountdown(null);
      return;
    }
    let count = 10;
    setSwapCountdown(10);
    if (swapTimerRef.current) clearInterval(swapTimerRef.current);
    swapTimerRef.current = setInterval(() => {
      count--;
      setSwapCountdown(count);
      if (count <= 0) {
        if (swapTimerRef.current) clearInterval(swapTimerRef.current);
        setSwapCountdown(null);
        if (gameMode === 'multiplayer') {
          syncDiscardDrawn(roomCodeRef.current).catch(console.error);
        }
      }
    }, 1000);
    return () => { if (swapTimerRef.current) clearInterval(swapTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isMyTurn, gameMode]);

  function applyEngineState(state: GameState) {
    const { players: newPlayers, localCurrentIndex } =
      engineStateToPlayers(state, playerProfilesRef.current, myPlayerIdRef.current);

    setPlayers(previousPlayers => {
      const nextPlayers = reuseStablePlayers(previousPlayers, newPlayers);

      if (isPerfDebugEnabled()) {
        const reusedPlayers = nextPlayers.filter((player, index) => player === previousPlayers[index]).length;
        console.debug('[perf] applyEngineState', {
          phase: state.phase,
          drawPile: state.drawPile.length,
          discardPile: state.discardPile.length,
          drawnCard: state.drawnCard?.id ?? null,
          reusedPlayers,
          totalPlayers: nextPlayers.length,
        });
      }

      return nextPlayers;
    });
    setDrawPile(state.drawPile as Card[]);
    setDiscardPile(state.discardPile as Card[]);
    setCurrentPlayerIndex(localCurrentIndex);
    setCurrentTurnPlayerId(state.playerOrder[state.currentPlayerIndex] ?? null);
    // Drawn card is stored face-down in Firestore to hide it from opponents.
    // Flip it face-up only for the player who actually drew it.
    const isMyDrawnCard = state.drawnCard !== null &&
      state.playerOrder[state.currentPlayerIndex] === myPlayerIdRef.current;
    setDrawnCard(state.drawnCard
      ? { ...(state.drawnCard as Card), faceUp: isMyDrawnCard }
      : null);
    setPhase(mapPhase(state.phase));
    setFinalRound(state.finalRound);
    setKnockedBy(state.knockedById);
    setMatchWindowActive(state.reactionWindowOpen);
    setPendingPower(state.pendingPower as '7' | '8' | '9' | '10' | null);
    setGiveawayGiverId(state.pendingGiveaway?.giverId ?? null);
    setLastPlayedCard(state.lastDiscardedCard as Card | null);

    if (state.phase === 'game_over') {
      const scores = state.scores;
      const winnerId = Object.entries(scores).reduce(
        (best, [id, score]) => score < best.score ? { id, score } : best,
        { id: '', score: Infinity },
      ).id;
      setWinner(newPlayers.find(p => p.id === winnerId) ?? null);
    } else {
      setWinner(null);
    }
  }

  // ── Multiplayer init ────────────────────────────────────────────────────────
  // Called by the host in Lobby before navigating to /game.
  // Creates the authoritative game state in Firestore.
  const initMultiplayer = useCallback(async (
    myId: string,
    profiles: PlayerProfile[],
    roomPlayerIds?: string[],
  ) => {
    setMyPlayerId(myId);
    setPlayerProfiles(profiles);
    // Update refs immediately so the Firestore snapshot callback reads the correct
    // profiles/playerId before React re-renders and syncs them at render time.
    myPlayerIdRef.current = myId;
    playerProfilesRef.current = profiles;
    gameActiveRef.current = true;

    // Register this player as online (RTDB onDisconnect handles cleanup automatically)
    await registerPresence(roomCodeRef.current, myId);

    // Only the host passes roomPlayerIds — creates the authoritative deck in Firestore
    if (roomPlayerIds && roomPlayerIds.length > 0) {
      const engineState = createInitialGameState(roomPlayerIds);
      await saveInitialGameState(roomCodeRef.current, engineState);
    }
  }, []);

  // ── Solo helpers ────────────────────────────────────────────────────────────

  const soloEndGame = useCallback((finalPlayers: Player[]) => {
    gameActiveRef.current = false;
    const scored = finalPlayers.map(p => ({
      ...p,
      score: calcScore(p.cards),
      cards: p.cards.map(row => row.map(c => c ? { ...c, faceUp: true } : null)),
    }));
    const winnerP = scored.reduce((a, b) => a.score < b.score ? a : b);
    setPlayers(scored);
    setWinner(winnerP);
    setPhase('game_over');
  }, []);

  const soloReactionsRef = useRef<Array<{
    playerId: string;
    targetPlayerId: string;
    cardIndex: number;
    timestamp: number;
  }>>([]);

  const soloShowMatchWindow = useCallback(() => {
    soloReactionsRef.current = [];
    setMatchWindowActive(true);
    setMatchCountdown(3);
  }, []);

  const soloAdvanceTurn = useCallback((
    fromIndex: number,
    currentPlayers: Player[],
    currentFinalRound: boolean,
    currentKnockedBy: string | null,
  ) => {
    const nextIndex = (fromIndex + 1) % currentPlayers.length;
    if (currentFinalRound && currentKnockedBy) {
      const knockerIdx = currentPlayers.findIndex(p => p.id === currentKnockedBy);
      if (nextIndex === knockerIdx) { soloEndGame(currentPlayers); return; }
    }
    setCurrentPlayerIndex(nextIndex);
    setPhase('draw');
  }, [soloEndGame]);

    const resolveSoloReactionWindow = useCallback(() => {
    const currentPlayers = playersRef.current.map(player => ({
      ...player,
      cards: player.cards.map(row => [...row]),
    }));

    const lastDiscard = lastPlayedCardRef.current;
    if (!lastDiscard) {
      setMatchWindowActive(false);
      soloReactionsRef.current = [];
      soloAdvanceTurn(currentPlayerIndexRef.current, currentPlayers, finalRoundRef.current, knockedByRef.current);
      return;
    }

    const reactions = [...soloReactionsRef.current].sort((a, b) => a.timestamp - b.timestamp);
    const discardedValue = lastDiscard.value;

    const getPlayer = (playerId: string) => currentPlayers.find(p => p.id === playerId);

    const getCardAt = (playerId: string, flatIndex: number) => {
      const player = getPlayer(playerId);
      if (!player) return null;
      const row = Math.floor(flatIndex / 2);
      const col = flatIndex % 2;
      return player.cards[row]?.[col] ?? null;
    };

    const removeCardAt = (playerId: string, flatIndex: number) => {
      const player = getPlayer(playerId);
      if (!player) return null;
      const row = Math.floor(flatIndex / 2);
      const col = flatIndex % 2;
      const removed = player.cards[row]?.[col] ?? null;
      if (player.cards[row]) player.cards[row][col] = null;
      return removed;
    };

    const addCardToHand = (playerId: string, card: Card) => {
      const player = getPlayer(playerId);
      if (!player) return;

      for (let r = 0; r < player.cards.length; r++) {
        for (let c = 0; c < 2; c++) {
          if (player.cards[r]?.[c] === null) {
            player.cards[r][c] = { ...card, faceUp: false };
            return;
          }
        }
      }

      player.cards.push([{ ...card, faceUp: false }, null]);
    };

    const drawPenalty = (): Card | null => {
      const pile = drawPileRef.current;
      if (pile.length === 0) return null;
      const card = { ...pile[pile.length - 1], faceUp: false };
      setDrawPile(prev => prev.slice(0, prev.length - 1));
      drawPileRef.current = pile.slice(0, pile.length - 1);
      return card;
    };

    const winningReaction =
      reactions.find(reaction => {
        const selected = getCardAt(reaction.targetPlayerId, reaction.cardIndex);
        return selected && selected.value === discardedValue;
      }) ?? null;

    let enterGiveaway = false;
    let giveawayGiverId: string | null = null;
    let giveawayReceiverId: string | null = null;

    for (const reaction of reactions) {
      const selected = getCardAt(reaction.targetPlayerId, reaction.cardIndex);

      if (!selected) {
        const penalty = drawPenalty();
        if (penalty) addCardToHand(reaction.playerId, penalty);
        continue;
      }

      const isCorrect = selected.value === discardedValue;
      const isOwnCard = reaction.playerId === reaction.targetPlayerId;
      const isWinner =
        winningReaction &&
        reaction.playerId === winningReaction.playerId &&
        reaction.targetPlayerId === winningReaction.targetPlayerId &&
        reaction.cardIndex === winningReaction.cardIndex &&
        reaction.timestamp === winningReaction.timestamp;

      if (isWinner && isCorrect && isOwnCard) {
        const removed = removeCardAt(reaction.playerId, reaction.cardIndex);
        if (removed) {
          setDiscardPile(prev => [{ ...removed, faceUp: true }, ...prev]);
        }
        continue;
      }

      if (isWinner && isCorrect && !isOwnCard) {
        const removed = removeCardAt(reaction.targetPlayerId, reaction.cardIndex);
        if (removed) {
          setDiscardPile(prev => [{ ...removed, faceUp: true }, ...prev]);
        }
        enterGiveaway = true;
        giveawayGiverId = reaction.playerId;
        giveawayReceiverId = reaction.targetPlayerId;
        break;
      }

      if (isOwnCard) {
        const penalty = drawPenalty();
        if (penalty) addCardToHand(reaction.playerId, penalty);
      } else {
        const removed = removeCardAt(reaction.targetPlayerId, reaction.cardIndex);
        if (removed) addCardToHand(reaction.playerId, removed);

        const penalty = drawPenalty();
        if (penalty) addCardToHand(reaction.playerId, penalty);
      }
    }

    setPlayers(currentPlayers);
    setMatchWindowActive(false);
    soloReactionsRef.current = [];

    if (enterGiveaway && giveawayGiverId && giveawayReceiverId) {
      setGiveawayGiverId(giveawayGiverId);
      setPhase('giveaway');
      soloPendingGiveawayRef.current = {
        giverId: giveawayGiverId,
        receiverId: giveawayReceiverId,
      };
      return;
    }

    soloAdvanceTurn(currentPlayerIndexRef.current, currentPlayers, finalRoundRef.current, knockedByRef.current);
  }, []);

  // ── AI Turn (solo only) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (gameMode !== 'solo') return;
    if (players.length === 0 || !gameActiveRef.current) return;
    if (phase !== 'draw' || matchWindowActive) return;
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer?.isAI) return;

    setAiThinking(true);
    const thinkTime = 1200 + Math.random() * 1000;

  const timer = setTimeout(() => {
  setAiThinking(false);
  let pile = [...drawPileRef.current];
  if (pile.length === 0) {
    const [keepTop, ...rest] = discardPileRef.current;
    if (rest.length === 0) {
      soloAdvanceTurn(currentPlayerIndex, playersRef.current, finalRoundRef.current, knockedByRef.current);
      return;
    }
    pile = shuffleArr(rest.map(c => ({ ...c, faceUp: false })));
    setDiscardPile(keepTop ? [keepTop] : []);
  }

  const drawn = { ...pile[pile.length - 1], faceUp: true };
  const newPile = pile.slice(0, pile.length - 1);
  setDrawPile(newPile);

  const currentPlayers = [...playersRef.current];
  const player = { ...currentPlayers[currentPlayerIndex] };
  const newCards = player.cards.map(r => r.map(c => (c ? { ...c } : null)));

  let swapRow = -1, swapCol = -1, worstVal = drawn.value;
  outer: for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const c = newCards[row][col];
      if (c && !c.faceUp) {
        swapRow = row;
        swapCol = col;
        break outer;
      }
    }
  }

  if (swapRow === -1) {
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const c = newCards[row][col];
        if (c?.faceUp && c.value > worstVal) {
          worstVal = c.value;
          swapRow = row;
          swapCol = col;
        }
      }
    }
  }

  let toDiscard: Card;
  if (swapRow !== -1) {
    const old = newCards[swapRow][swapCol];
    newCards[swapRow][swapCol] = { ...drawn, faceUp: false };
    toDiscard = old ? { ...old, faceUp: true } : drawn;
  } else {
    toDiscard = drawn;
  }

  player.cards = newCards;
  currentPlayers[currentPlayerIndex] = player;
  setPlayers(currentPlayers);
  setLastPlayedCard(toDiscard);
  setDiscardPile(prev => [toDiscard, ...prev]);

  soloShowMatchWindow();
}, thinkTime);

return () => clearTimeout(timer);
}, [gameMode, players, currentPlayerIndex, phase, matchWindowActive, soloShowMatchWindow, soloAdvanceTurn]);


  useEffect(() => {
    if (gameMode !== 'solo' || !matchWindowActive) return;

    let count = 3;
    setMatchCountdown(3);

    if (matchTimerRef.current) clearInterval(matchTimerRef.current);

    matchTimerRef.current = setInterval(() => {
      count--;
      setMatchCountdown(count);

      if (count <= 0) {
        if (matchTimerRef.current) clearInterval(matchTimerRef.current);
        resolveSoloReactionWindow();
      }
    }, 1000);

    return () => {
      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    };
  }, [gameMode, matchWindowActive, resolveSoloReactionWindow]);

  useEffect(() => {
    if (gameMode !== 'solo' || !matchWindowActive) return;

    const discard = lastPlayedCardRef.current;
    if (!discard) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    playersRef.current.forEach((player, playerIndex) => {
      if (!player.isAI) return;

      const delay = 300 + Math.random() * 1200;

      const t = setTimeout(() => {
        const alreadySent = soloReactionsRef.current.some(r => r.playerId === player.id);
        if (alreadySent) return;

        const allChoices: Array<{ targetPlayerId: string; flatIndex: number; correct: boolean }> = [];

        playersRef.current.forEach(target => {
          target.cards.forEach((row, ri) => {
            row.forEach((card, ci) => {
              if (!card) return;
              const flatIndex = ri * 2 + ci;
              allChoices.push({
                targetPlayerId: target.id,
                flatIndex,
                correct: card.value === discard.value,
              });
            });
          });
        });

        const pickCorrect = Math.random() < 0.65;
        const pool = pickCorrect
          ? allChoices.filter(x => x.correct)
          : allChoices;

        if (pool.length === 0) return;

        const pick = pool[Math.floor(Math.random() * pool.length)];

        soloReactionsRef.current.push({
          playerId: player.id,
          targetPlayerId: pick.targetPlayerId,
          cardIndex: pick.flatIndex,
          timestamp: Date.now(),
        });
      }, delay);

      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [gameMode, matchWindowActive]);

  // ── Public Actions ──────────────────────────────────────────────────────────

  const initGame = useCallback((roomPlayers?: Array<{ id: string; name: string }>) => {
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    gameActiveRef.current = true;
    setPendingPower(null);
    const deck = createDeck();
    const configs = roomPlayers
      ? roomPlayers.map((p, i) => ({ ...(PLAYER_CONFIGS[i] ?? PLAYER_CONFIGS[0]), id: p.id, name: p.name }))
      : PLAYER_CONFIGS;
    const newPlayers: Player[] = configs.map((cfg, i) => {
      const cards: (Card | null)[][] = [[], []];
      for (let row = 0; row < 2; row++)
        for (let col = 0; col < 2; col++)
          cards[row].push(deck.pop()!);
      return { ...cfg, cards, score: 0, isAI: roomPlayers ? false : i !== 0, isReady: true, hasKnocked: false };
    });
    setPlayers(newPlayers); setDrawPile([...deck]); setDiscardPile([]);
    setCurrentPlayerIndex(0); setCurrentTurnPlayerId(configs[0]?.id ?? null); setDrawnCard(null); setPhase('draw');
    setFinalRound(false); setKnockedBy(null); setMatchWindowActive(false);
    setMatchCountdown(3); setAiThinking(false); setWinner(null); setLastPlayedCard(null); setGiveawayGiverId(null);
  }, []);

  const initGameFromState = useCallback((
    state: SerializedGameState,
    roomPlayers: Array<{ id: string; name: string }>,
  ) => {
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    gameActiveRef.current = true;
    setPendingPower(null);
    const configs = roomPlayers.map((p, i) => ({ ...(PLAYER_CONFIGS[i] ?? PLAYER_CONFIGS[0]), id: p.id, name: p.name }));
    const newPlayers: Player[] = configs.map((cfg, i) => {
      const flat = state.playerHands[i]?.cards ?? [];
      const cards = flatCardsToRows(flat);
      return { ...cfg, cards, score: 0, isAI: false, isReady: true, hasKnocked: false };
    });
    setPlayers(newPlayers); setDrawPile(state.drawPile); setDiscardPile(state.discardPile);
    setCurrentPlayerIndex(0); setCurrentTurnPlayerId(configs[0]?.id ?? null); setDrawnCard(null); setPhase('draw');
    setFinalRound(false); setKnockedBy(null); setMatchWindowActive(false);
    setMatchCountdown(3); setAiThinking(false); setWinner(null); setLastPlayedCard(null); setGiveawayGiverId(null);
  }, []);

  const drawFromPile = useCallback(() => {
    if (gameMode === 'multiplayer') {
      syncDrawFromPile(roomCodeRef.current).catch(console.error);
      return;
    }
    if (phase !== 'draw' || currentPlayerIndex !== 0) return;
    let pile = [...drawPile];
    if (pile.length === 0) {
      const [keepTop, ...rest] = discardPile;
      if (rest.length === 0) return;
      pile = shuffleArr(rest.map(c => ({ ...c, faceUp: false })));
      setDiscardPile(keepTop ? [keepTop] : []);
    }
    const card = { ...pile.pop()!, faceUp: true };
    setDrawPile(pile);
    setDrawnCard(card);
    const isPower = ['7', '8', '9', '10'].includes(card.rank);
    if (isPower) { setPendingPower(card.rank as '7' | '8' | '9' | '10'); setPhase('power'); }
    else setPhase('swap');
  }, [gameMode, phase, currentPlayerIndex, drawPile, discardPile]);

  const takeFromDiscard = useCallback(() => {
    if (gameMode === 'multiplayer') {
      syncTakeFromDiscard(roomCodeRef.current).catch(console.error);
      return;
    }
    if (phase !== 'draw' || currentPlayerIndex !== 0) return;
    if (discardPile.length === 0) return;
    const [top, ...rest] = discardPile;
    setDiscardPile(rest);
    setDrawnCard({ ...top, faceUp: true });
    setPhase('swap');
  }, [gameMode, phase, currentPlayerIndex, discardPile]);

  const skipPowerAction = useCallback(() => {
    if (gameMode === 'multiplayer') {
      syncSkipPower(roomCodeRef.current).catch(console.error);
      return;
    }
    setPendingPower(null);
    setPhase('swap');
  }, [gameMode]);

  const swapCard = useCallback((row: number, col: number) => {
    if (gameMode === 'multiplayer') {
      const flatIndex = row * 2 + col;
      syncSwapCard(roomCodeRef.current, flatIndex).catch(console.error);
      return;
    }
    if (phase !== 'swap' || !drawnCard || currentPlayerIndex !== 0) return;
    const updated = [...players];
    const player = { ...updated[0] };
    const newCards = player.cards.map(r => [...r]);
    const oldCard = newCards[row][col];
    newCards[row][col] = { ...drawnCard, faceUp: false };
    player.cards = newCards;
    updated[0] = player;
    const toDiscard = oldCard ? { ...oldCard, faceUp: true } : drawnCard;
    setPlayers(updated); setLastPlayedCard(toDiscard);
    setDiscardPile(prev => [toDiscard, ...prev]); setDrawnCard(null);
    soloShowMatchWindow();
  }, [gameMode, phase, drawnCard, currentPlayerIndex, players, soloShowMatchWindow, soloAdvanceTurn]);

  const discardDrawn = useCallback(() => {
    if (gameMode === 'multiplayer') {
      syncDiscardDrawn(roomCodeRef.current).catch(console.error);
      return;
    }
    if (phase !== 'swap' || !drawnCard || currentPlayerIndex !== 0) return;
    const toDiscard = { ...drawnCard, faceUp: true };
    setLastPlayedCard(toDiscard);
    setDiscardPile(prev => [toDiscard, ...prev]);
    setDrawnCard(null);
    // Power for ranks 7/8 is handled in the 'power' phase (before reaching swap).
    // Once in swap phase, just discard normally — no power re-trigger.
    const currentPlayers = playersRef.current;
    soloShowMatchWindow();
  }, [gameMode, phase, drawnCard, currentPlayerIndex, soloShowMatchWindow, soloAdvanceTurn]);

  const reactToDiscard = useCallback((targetPlayerId: string, row: number, col: number) => {
    const flatIndex = row * 2 + col;

    if (gameMode === 'multiplayer') {
      if (!matchWindowActive) return;
      syncReaction(roomCodeRef.current, targetPlayerId, flatIndex).catch(console.error);
      return;
    }

    if (!matchWindowActive) return;

    const me = playersRef.current[0];
    if (!me) return;

    const alreadySent = soloReactionsRef.current.some(r => r.playerId === me.id);
    if (alreadySent) return;

    soloReactionsRef.current.push({
      playerId: me.id,
      targetPlayerId,
      cardIndex: flatIndex,
      timestamp: Date.now(),
    });
  }, [gameMode, matchWindowActive]);

  const completeSoloGiveaway = useCallback((row: number, col: number) => {
    const pending = soloPendingGiveawayRef.current;
    if (!pending) return;

    const currentPlayers = playersRef.current.map(player => ({
      ...player,
      cards: player.cards.map(r => [...r]),
    }));

    const giver = currentPlayers.find(p => p.id === pending.giverId);
    const receiver = currentPlayers.find(p => p.id === pending.receiverId);
    if (!giver || !receiver) return;

    const selected = giver.cards[row]?.[col] ?? null;
    if (!selected) return;

    giver.cards[row][col] = null;

    let placed = false;
    for (let r = 0; r < receiver.cards.length && !placed; r++) {
      for (let c = 0; c < 2; c++) {
        if (receiver.cards[r]?.[c] === null) {
          receiver.cards[r][c] = { ...selected, faceUp: false };
          placed = true;
          break;
        }
      }
    }
    if (!placed) {
      receiver.cards.push([{ ...selected, faceUp: false }, null]);
    }

    soloPendingGiveawayRef.current = null;
    setGiveawayGiverId(null);
    setPlayers(currentPlayers);
    soloAdvanceTurn(currentPlayerIndexRef.current, currentPlayers, finalRoundRef.current, knockedByRef.current);
  }, [soloAdvanceTurn]);

  const giveAwayCardAction = useCallback((row: number, col: number) => {
  if (gameMode === 'multiplayer') {
    const flatIndex = row * 2 + col;
    syncGiveAwayCard(roomCodeRef.current, flatIndex).catch(console.error);
    return;
  }

    completeSoloGiveaway(row, col);
  }, [gameMode, completeSoloGiveaway]);

  useEffect(() => {
    if (gameMode !== 'solo' || phase !== 'giveaway') return;

    const pending = soloPendingGiveawayRef.current;
    if (!pending) return;

    const giver = players.find(player => player.id === pending.giverId);
    if (!giver || !giver.isAI) return;

    const timer = setTimeout(() => {
      const latestPending = soloPendingGiveawayRef.current;
      const latestGiver = playersRef.current.find(player => player.id === latestPending?.giverId);
      if (!latestPending || !latestGiver || !latestGiver.isAI) return;

      for (let row = 0; row < latestGiver.cards.length; row++) {
        for (let col = 0; col < 2; col++) {
          if (latestGiver.cards[row]?.[col]) {
            completeSoloGiveaway(row, col);
            return;
          }
        }
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [gameMode, phase, players, currentPlayerIndex, completeSoloGiveaway]);

  const finishSoloPower = useCallback((updatedPlayers?: Player[]) => {
    if (!drawnCard) {
      setPendingPower(null);
      setPhase('swap');
      return;
    }

    const playersAfterPower = updatedPlayers ?? playersRef.current;
    const discarded = { ...drawnCard, faceUp: true };
    setPendingPower(null);
    setLastPlayedCard(discarded);
    setDiscardPile(prev => [discarded, ...prev]);
    setDrawnCard(null);
    setPhase('match_window');
    soloShowMatchWindow();
  }, [drawnCard, soloShowMatchWindow, soloAdvanceTurn]);

  const resolvePower = useCallback((targetPlayerId?: string, cardFlatIndex?: number) => {
    if (gameMode === 'multiplayer') {
      // Sync the power action to Firestore so the engine applies the correct state change.
      if (pendingPower === '7' && cardFlatIndex !== undefined) {
        syncUsePower7(roomCodeRef.current, cardFlatIndex).catch(console.error);
      } else if (pendingPower === '8' && targetPlayerId && cardFlatIndex !== undefined) {
        syncUsePower8(roomCodeRef.current, targetPlayerId, cardFlatIndex).catch(console.error);
      } else {
        // Powers 9/10 or missing info — skip the power so the game isn't stuck.
        syncSkipPower(roomCodeRef.current).catch(console.error);
      }
      return;
    }
    if (!drawnCard) {
      setPendingPower(null);
      setPhase('swap');
      return;
    }
    finishSoloPower();
  }, [gameMode, pendingPower, drawnCard, finishSoloPower]);

  const selectPower9Card = useCallback((targetPlayerId: string, cardFlatIndex: number) => {
    if (gameMode === 'multiplayer') {
      syncSelectPower9Card(roomCodeRef.current, targetPlayerId, cardFlatIndex).catch(console.error);
    }
  }, [gameMode]);

  const confirmPower9Action = useCallback((doSwap: boolean, selections: PowerCardSelection[]) => {
    if (gameMode === 'multiplayer') {
      syncConfirmPower9(roomCodeRef.current, doSwap).catch(console.error);
      return;
    }

    if (selections.length < 2) return;

    const currentPlayers = [...playersRef.current];
    if (doSwap) {
      const [sel1, sel2] = selections;
      const { row: row1, col: col1 } = flatIndexToRowCol(sel1.cardFlatIndex);
      const { row: row2, col: col2 } = flatIndexToRowCol(sel2.cardFlatIndex);
      const idx1 = currentPlayers.findIndex(player => player.id === sel1.playerId);
      const idx2 = currentPlayers.findIndex(player => player.id === sel2.playerId);

      if (idx1 !== -1 && idx2 !== -1) {
        const player1 = { ...currentPlayers[idx1], cards: currentPlayers[idx1].cards.map(row => [...row]) };
        const player2 = { ...currentPlayers[idx2], cards: currentPlayers[idx2].cards.map(row => [...row]) };
        const card1 = player1.cards[row1]?.[col1] ?? null;
        const card2 = player2.cards[row2]?.[col2] ?? null;

        player1.cards[row1][col1] = card2 ? { ...card2, faceUp: false } : null;
        player2.cards[row2][col2] = card1 ? { ...card1, faceUp: false } : null;
        currentPlayers[idx1] = player1;
        currentPlayers[idx2] = player2;
        setPlayers(currentPlayers);
      }
    }

    finishSoloPower(currentPlayers);
  }, [gameMode, finishSoloPower]);

  const usePower10Action = useCallback((card1: PowerCardSelection, card2: PowerCardSelection) => {
    if (gameMode === 'multiplayer') {
      syncUsePower10(
        roomCodeRef.current,
        { playerId: card1.playerId, cardIndex: card1.cardFlatIndex },
        { playerId: card2.playerId, cardIndex: card2.cardFlatIndex },
      ).catch(console.error);
      return;
    }

    const currentPlayers = [...playersRef.current];
    const { row: row1, col: col1 } = flatIndexToRowCol(card1.cardFlatIndex);
    const { row: row2, col: col2 } = flatIndexToRowCol(card2.cardFlatIndex);
    const idx1 = currentPlayers.findIndex(player => player.id === card1.playerId);
    const idx2 = currentPlayers.findIndex(player => player.id === card2.playerId);
    if (idx1 === -1 || idx2 === -1 || idx1 === idx2) return;

    const player1 = { ...currentPlayers[idx1], cards: currentPlayers[idx1].cards.map(row => [...row]) };
    const player2 = { ...currentPlayers[idx2], cards: currentPlayers[idx2].cards.map(row => [...row]) };
    const source1 = player1.cards[row1]?.[col1] ?? null;
    const source2 = player2.cards[row2]?.[col2] ?? null;
    if (!source1 || !source2) return;

    player1.cards[row1][col1] = { ...source2, faceUp: false };
    player2.cards[row2][col2] = { ...source1, faceUp: false };
    currentPlayers[idx1] = player1;
    currentPlayers[idx2] = player2;
    setPlayers(currentPlayers);
    finishSoloPower(currentPlayers);
  }, [gameMode, finishSoloPower]);

  const knockAction = useCallback(() => {
    if (gameMode === 'multiplayer') {
      syncKnock(roomCodeRef.current).catch(console.error);
      return;
    }
    if (currentPlayerIndex !== 0 || finalRound) return;
    setFinalRound(true);
    setKnockedBy('p1');
    setPhase('match_window');
    finalRoundRef.current = true;
    knockedByRef.current = 'p1';
    const currentPlayers = playersRef.current;
    setTimeout(() => soloAdvanceTurn(0, currentPlayers, true, 'p1'), 2200);
  }, [gameMode, currentPlayerIndex, finalRound, soloAdvanceTurn]);

  const sendChat = useCallback((message: string) => {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      playerId: myPlayerId || 'p1',
      playerName: playerName || 'YOU',
      message, timestamp: new Date(),
    }]);
  }, [myPlayerId, playerName]);

  const addChatMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setChatMessages(prev => [...prev, { ...msg, id: Date.now().toString(), timestamp: new Date() }]);
  }, []);

  const endPeek = useCallback(() => {
    if (gameMode === 'multiplayer') {
      syncEndPeek(roomCodeRef.current).catch(console.error);
    } else {
      setPhase('draw');
    }
  }, [gameMode]);

  const resetGame = useCallback(() => {
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    if (swapTimerRef.current) clearInterval(swapTimerRef.current);
    setSwapCountdown(null);
    gameActiveRef.current = false;
    setPendingPower(null);
    setGiveawayGiverId(null);
    setGameMode(null);
    setMyPlayerId('');
    setPlayerProfiles([]);
    setPlayers([]);
    setDrawPile([]); setDiscardPile([]);
    setCurrentPlayerIndex(0); setCurrentTurnPlayerId(null); setDrawnCard(null); setPhase('draw');
    setFinalRound(false); setKnockedBy(null); setMatchWindowActive(false);
    setAiThinking(false); setWinner(null);
    setChatMessages(LOBBY_MESSAGES);
  }, []);

  return (
    <GameContext.Provider value={{
      gameMode, setGameMode,
      playerName, setPlayerName,
      roomCode, setRoomCode,
      myPlayerId, isMyTurn,
      players, setPlayers,
      drawPile, discardPile,
      currentPlayerIndex, drawnCard, phase,
      finalRound, knockedBy,
      matchWindowActive, matchCountdown,
      aiThinking, winner, chatMessages, lastPlayedCard,
      pendingPower, giveawayGiverId,
      swapCountdown,
      disconnectedPlayerName,
      initMultiplayer,
      initGame, initGameFromState,
      drawFromPile, takeFromDiscard,
      swapCard, discardDrawn, reactToDiscard,
      giveAwayCardAction,
      knock: knockAction,
      skipPower: skipPowerAction,
      endPeek,
      sendChat, addChatMessage, resetGame, resolvePower,
      selectPower9Card,
      confirmPower9: confirmPower9Action,
      usePower10: usePower10Action,
    }}>
      {children}
    </GameContext.Provider>
  );
}
