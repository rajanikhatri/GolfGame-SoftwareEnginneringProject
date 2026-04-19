import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { registerPresence, subscribeToRoomPresence } from '../database/firebase';
import { completeRoomMatch } from '../database/firebaseRooms';
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
  syncSetPowerFocusTarget,
  syncSetPeekRevealCard,
  syncSetPowerCueCard,
} from '../database/firebaseGameSync';
import {
  createInitialGameState,
  drawFromPile as engineDrawFromPile,
  takeFromDiscard as engineTakeFromDiscard,
  skipPower as engineSkipPower,
  usePower7 as engineUsePower7,
  usePower8 as engineUsePower8,
  selectPower9Card as engineSelectPower9Card,
  confirmPower9 as engineConfirmPower9,
  usePower10 as engineUsePower10,
  swapCard as engineSwapCard,
  discardDrawnCard as engineDiscardDrawnCard,
  submitReaction as engineSubmitReaction,
  resolveReactionWindow as engineResolveReactionWindow,
  giveAwayCard as engineGiveAwayCard,
  knock as engineKnock,
  getCardValue,
  type GameState,
  type GamePhase as EnginePhase,
  type ReactionEntry,
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

interface AICardMemory {
  cardId: string;
  value: number;
  confidence: number;
  seenAt: number;
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
  reactionEntries: ReactionEntry[];
  pendingPower: '7' | '8' | '9' | '10' | null;
  power9Selection: { playerId: string; cardIndex: number }[] | null;
  powerFocusTargetId: string | null;
  peekRevealCard: { playerId: string; cardIndex: number } | null;
  powerCueCard: { playerId: string; cardIndex: number } | null;
  giveawayGiverId: string | null;
  setFocusTarget: (targetPlayerId: string | null) => void;
  setPeekRevealCard: (card: { playerId: string; cardIndex: number } | null) => void;
  setPowerCueCard: (card: { playerId: string; cardIndex: number } | null) => void;
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

function rowsToFlatCards(rows: (Card | null)[][]): (Card | null)[] {
  return rows.flatMap(row => [row[0] ?? null, row[1] ?? null]);
}

function mapContextPhaseToEngine(phase: GamePhase): EnginePhase {
  if (phase === 'match_window') return 'react';
  return phase as EnginePhase;
}

function createMemoryKey(playerId: string, cardIndex: number): string {
  return `${playerId}:${cardIndex}`;
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
  const [reactionEntries,    setReactionEntries]    = useState<ReactionEntry[]>([]);
  const [pendingPower,          setPendingPower]          = useState<'7' | '8' | '9' | '10' | null>(null);
  const [power9Selection,       setPower9Selection]       = useState<{ playerId: string; cardIndex: number }[] | null>(null);
  const [powerFocusTargetId,    setPowerFocusTargetId]    = useState<string | null>(null);
  const [peekRevealCard,        setPeekRevealCardState]    = useState<{ playerId: string; cardIndex: number } | null>(null);
  const [powerCueCard,          setPowerCueCardState]       = useState<{ playerId: string; cardIndex: number } | null>(null);
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
  const drawnCardRef = useRef<Card | null>(null);
  const phaseRef = useRef<GamePhase>('draw');
  const pendingPowerRef = useRef<'7' | '8' | '9' | '10' | null>(null);
  const matchWindowActiveRef = useRef(false);
  const aiMemoryRef = useRef<Record<string, Record<string, AICardMemory>>>({});
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
  useEffect(() => { drawnCardRef.current = drawnCard; }, [drawnCard]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { pendingPowerRef.current = pendingPower; }, [pendingPower]);
  useEffect(() => { matchWindowActiveRef.current = matchWindowActive; }, [matchWindowActive]);

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

  useEffect(() => {
    if (gameMode !== 'multiplayer' || !roomCode) return;
    if (phase !== 'game_over') return;

    completeRoomMatch(roomCode).catch(console.error);
  }, [gameMode, roomCode, phase]);

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
    setReactionEntries((state.reactions as ReactionEntry[]) ?? []);
    setPendingPower(state.pendingPower as '7' | '8' | '9' | '10' | null);
    setPower9Selection((state.power9Selection as { playerId: string; cardIndex: number }[] | null) ?? null);
    setPowerFocusTargetId((state.powerFocusTargetId as string | null) ?? null);
    setPeekRevealCardState((state.peekRevealCard as { playerId: string; cardIndex: number } | null) ?? null);
    setPowerCueCardState((state.powerCueCard as { playerId: string; cardIndex: number } | null) ?? null);
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

  const soloReactionsRef = useRef<Array<{
    playerId: string;
    targetPlayerId: string;
    cardIndex: number;
    timestamp: number;
  }>>([]);
  const resolveSoloReactionWindow = useCallback(() => {
    let state = buildSoloEngineState({
      phase: 'react',
      reactionWindowOpen: true,
      reactions: soloReactionsRef.current,
    });
    state = engineResolveReactionWindow(state);
    soloReactionsRef.current = [];
    applySoloEngineState(state);
  }, [applySoloEngineState, buildSoloEngineState]);

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

      const actingPlayerId = playersRef.current[currentPlayerIndexRef.current]?.id;
      if (!actingPlayerId) return;

      let state = engineDrawFromPile(buildSoloEngineState(), actingPlayerId);
      if (state.phase === 'power' && state.pendingPower) {
        const actingHand = state.hands.find(hand => hand.playerId === actingPlayerId);
        const aiMemory = aiMemoryRef.current[actingPlayerId] ?? {};

        if (state.pendingPower === '7') {
          const ownIndex = actingHand?.cards.findIndex((card, index) => {
            if (!card || card.faceUp) return false;
            const memory = aiMemory[createMemoryKey(actingPlayerId, index)];
            return Boolean(memory && memory.cardId === card.id && memory.confidence >= 0.8);
          }) ?? -1;
          if (ownIndex >= 0 && actingHand?.cards[ownIndex]) {
            rememberCardForAI(actingPlayerId, actingPlayerId, ownIndex, actingHand.cards[ownIndex] as Card, 1);
          }
          state = ownIndex >= 0 ? engineUsePower7(state, actingPlayerId, ownIndex) : engineSkipPower(state, actingPlayerId);
        } else if (state.pendingPower === '8') {
          const target = state.hands
            .filter(hand => hand.playerId !== actingPlayerId)
            .flatMap(hand => hand.cards.map((card, index) => ({ playerId: hand.playerId, index, card })))
            .find(entry => {
              if (!entry.card || entry.card.faceUp) return false;
              const memory = aiMemory[createMemoryKey(entry.playerId, entry.index)];
              return Boolean(memory && memory.cardId === entry.card.id && memory.confidence >= 0.8);
            });
          if (target?.card) {
            rememberCardForAI(actingPlayerId, target.playerId, target.index, target.card as Card, 1);
          }
          state = target
            ? engineUsePower8(state, actingPlayerId, target.playerId, target.index)
            : engineSkipPower(state, actingPlayerId);
        } else if (state.pendingPower === '9') {
          const selections = state.hands
            .flatMap(hand =>
              hand.cards.map((card, index) => ({
                playerId: hand.playerId,
                cardIndex: index,
                card,
              })),
            )
            .filter(selection => selection.card !== null)
            .slice(0, 2);

          if (selections.length === 2 && selections[0].playerId !== selections[1].playerId) {
            state = engineSelectPower9Card(state, actingPlayerId, selections[0].playerId, selections[0].cardIndex);
            state = engineSelectPower9Card(state, actingPlayerId, selections[1].playerId, selections[1].cardIndex);
            rememberCardForAI(actingPlayerId, selections[0].playerId, selections[0].cardIndex, selections[0].card as Card, 1);
            rememberCardForAI(actingPlayerId, selections[1].playerId, selections[1].cardIndex, selections[1].card as Card, 1);
            state = engineConfirmPower9(state, actingPlayerId, Math.random() < 0.5);
          } else {
            state = engineSkipPower(state, actingPlayerId);
          }
        } else if (state.pendingPower === '10') {
          const selections = state.hands
            .flatMap(hand => hand.cards.map((card, index) => ({ playerId: hand.playerId, cardIndex: index, card })))
            .filter(entry => entry.card !== null)
            .slice(0, 6);
          const first = selections[0];
          const second = selections.find(entry => entry.playerId !== first?.playerId);
          state = first && second
            ? engineUsePower10(
                state,
                actingPlayerId,
                { playerId: first.playerId, cardIndex: first.cardIndex },
                { playerId: second.playerId, cardIndex: second.cardIndex },
              )
            : engineSkipPower(state, actingPlayerId);
        }
      }

      if (state.phase === 'swap' && state.drawnCard) {
        const actingHand = state.hands.find(hand => hand.playerId === actingPlayerId);
        const cards = actingHand?.cards ?? [];
        const aiMemory = aiMemoryRef.current[actingPlayerId] ?? {};
        let swapIndex = -1;
        let worstVal = state.drawnCard.value;

        cards.forEach((card, index) => {
          if (index >= 4 || !card) return;
          const memory = aiMemory[createMemoryKey(actingPlayerId, index)];
          const knownValue =
            card.faceUp ? card.value :
            memory && memory.cardId === card.id && memory.confidence >= 0.8 ? memory.value :
            null;
          if (knownValue !== null && knownValue > worstVal) {
            worstVal = knownValue;
            swapIndex = index;
          }
        });

        if (swapIndex === -1) {
          cards.forEach((card, index) => {
            if (index < 4 && card && !card.faceUp) {
              const memory = aiMemory[createMemoryKey(actingPlayerId, index)];
              if (!memory || memory.cardId !== card.id || memory.confidence < 0.8) {
                swapIndex = index;
              }
            }
          });
        }

        state = swapIndex >= 0
          ? engineSwapCard(state, actingPlayerId, swapIndex)
          : engineDiscardDrawnCard(state, actingPlayerId);

        if (swapIndex >= 0) {
          const nextHand = state.hands.find(hand => hand.playerId === actingPlayerId);
          const swappedCard = nextHand?.cards[swapIndex];
          if (swappedCard) {
            rememberCardForAI(actingPlayerId, actingPlayerId, swapIndex, swappedCard as Card, 1);
          }
        }
      }

      applySoloEngineState(state);
    }, thinkTime);

    return () => clearTimeout(timer);
  }, [applySoloEngineState, buildSoloEngineState, currentPlayerIndex, gameMode, matchWindowActive, phase, players]);


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
  }, [gameMode, matchWindowActive]);

  useEffect(() => {
    if (gameMode !== 'solo' || !matchWindowActive) return;

    const discard = lastPlayedCardRef.current;
    if (!discard) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    playersRef.current.forEach((player) => {
      if (!player.isAI || player.hasKnocked) return;

      const delay = 300 + Math.random() * 1200;

      const t = setTimeout(() => {
        const alreadySent = soloReactionsRef.current.some(r => r.playerId === player.id);
        if (alreadySent) return;
        const aiMemory = aiMemoryRef.current[player.id] ?? {};
        const confidentMatches: Array<{ targetPlayerId: string; flatIndex: number; confidence: number }> = [];

        playersRef.current.forEach(target => {
          if (target.hasKnocked) return;
          target.cards.forEach((row, ri) => {
            row.forEach((card, ci) => {
              if (!card) return;
              const flatIndex = ri * 2 + ci;
              const memory = aiMemory[createMemoryKey(target.id, flatIndex)];
              const visibleMatch = card.faceUp && card.value === discard.value;
              const rememberedMatch = Boolean(
                memory &&
                memory.cardId === card.id &&
                memory.value === discard.value &&
                memory.confidence >= 0.8,
              );

              if (visibleMatch) {
                confidentMatches.push({ targetPlayerId: target.id, flatIndex, confidence: 1 });
                return;
              }
              if (rememberedMatch) {
                confidentMatches.push({
                  targetPlayerId: target.id,
                  flatIndex,
                  confidence: memory!.confidence,
                });
              }
            });
          });
        });

        if (confidentMatches.length === 0) return;

        confidentMatches.sort((a, b) => b.confidence - a.confidence);
      const pick = confidentMatches[0];

      soloReactionsRef.current.push({
        playerId: player.id,
        targetPlayerId: pick.targetPlayerId,
        cardIndex: pick.flatIndex,
        timestamp: Date.now(),
      });
      setReactionEntries([...soloReactionsRef.current]);
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
    const configs = roomPlayers
      ? roomPlayers.map((p, i) => ({ ...(PLAYER_CONFIGS[i] ?? PLAYER_CONFIGS[0]), id: p.id, name: p.name }))
      : PLAYER_CONFIGS;
    const profiles = configs.map(cfg => ({
      id: cfg.id,
      name: cfg.name,
      avatar: cfg.avatar,
      color: cfg.color,
      glowColor: cfg.glowColor,
    }));
    const state = createInitialGameState(configs.map(cfg => cfg.id));
    aiMemoryRef.current = {};
    setReactionEntries([]);
    seedSoloAIMemory(state);
    applySoloEngineState(state, profiles);
    setAiThinking(false);
    setMatchCountdown(3);
  }, [applySoloEngineState]);

  const initGameFromState = useCallback((
    state: SerializedGameState,
    roomPlayers: Array<{ id: string; name: string }>,
  ) => {
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    gameActiveRef.current = true;
    setPendingPower(null);
    aiMemoryRef.current = {};
    const configs = roomPlayers.map((p, i) => ({ ...(PLAYER_CONFIGS[i] ?? PLAYER_CONFIGS[0]), id: p.id, name: p.name }));
    const newPlayers: Player[] = configs.map((cfg, i) => {
      const flat = state.playerHands[i]?.cards ?? [];
      const cards = flatCardsToRows(flat);
      return { ...cfg, cards, score: 0, isAI: false, isReady: true, hasKnocked: false };
    });
    setPlayers(newPlayers); setDrawPile(state.drawPile); setDiscardPile(state.discardPile);
    setCurrentPlayerIndex(0); setCurrentTurnPlayerId(configs[0]?.id ?? null); setDrawnCard(null); setPhase('draw');
    setFinalRound(false); setKnockedBy(null); setMatchWindowActive(false); setReactionEntries([]);
    setMatchCountdown(3); setAiThinking(false); setWinner(null); setLastPlayedCard(null); setGiveawayGiverId(null);
  }, []);

  const drawFromPile = useCallback(() => {
    if (gameMode === 'multiplayer') {
      syncDrawFromPile(roomCodeRef.current).catch(console.error);
      return;
    }
    if (phase !== 'draw' || currentPlayerIndex !== 0) return;
    const nextState = engineDrawFromPile(buildSoloEngineState(), 'p1');
    applySoloEngineState(nextState);
  }, [applySoloEngineState, buildSoloEngineState, gameMode, phase, currentPlayerIndex]);

  const takeFromDiscard = useCallback(() => {
    if (gameMode === 'multiplayer') {
      syncTakeFromDiscard(roomCodeRef.current).catch(console.error);
      return;
    }
    if (phase !== 'draw' || currentPlayerIndex !== 0) return;
    const nextState = engineTakeFromDiscard(buildSoloEngineState(), 'p1');
    applySoloEngineState(nextState);
  }, [applySoloEngineState, buildSoloEngineState, gameMode, phase, currentPlayerIndex]);

  const skipPowerAction = useCallback(() => {
    if (gameMode === 'multiplayer') {
      syncSkipPower(roomCodeRef.current).catch(console.error);
      return;
    }
    const nextState = engineSkipPower(buildSoloEngineState(), 'p1');
    applySoloEngineState(nextState);
  }, [applySoloEngineState, buildSoloEngineState, gameMode]);

  function buildSoloProfiles(sourcePlayers?: Player[]): PlayerProfile[] {
    const existingPlayers = sourcePlayers && sourcePlayers.length > 0 ? sourcePlayers : playersRef.current;
    return PLAYER_CONFIGS.map((cfg, index) => {
      const existing = existingPlayers.find(player => player.id === cfg.id);
      return {
        id: existing?.id ?? cfg.id,
        name: existing?.name ?? cfg.name,
        avatar: existing?.avatar ?? cfg.avatar,
        color: existing?.color ?? cfg.color,
        glowColor: existing?.glowColor ?? cfg.glowColor,
      };
    });
  }

  function rememberCardForAI(
    aiPlayerId: string,
    targetPlayerId: string,
    cardIndex: number,
    card: Card,
    confidence: number,
  ) {
    if (!aiMemoryRef.current[aiPlayerId]) aiMemoryRef.current[aiPlayerId] = {};
    aiMemoryRef.current[aiPlayerId][createMemoryKey(targetPlayerId, cardIndex)] = {
      cardId: card.id,
      value: card.value,
      confidence,
      seenAt: Date.now(),
    };
  }

  function forgetMovedCardMemories(nextState: GameState) {
    const currentCardsByKey = new Map<string, string>();
    nextState.hands.forEach(hand => {
      hand.cards.forEach((card, index) => {
        if (!card) return;
        currentCardsByKey.set(createMemoryKey(hand.playerId, index), card.id);
      });
    });

    Object.values(aiMemoryRef.current).forEach(memoryMap => {
      Object.entries(memoryMap).forEach(([key, memory]) => {
        if (currentCardsByKey.get(key) !== memory.cardId) {
          delete memoryMap[key];
        }
      });
    });
  }

  function syncVisibleMemory(nextState: GameState) {
    const aiIds = nextState.hands
      .map(hand => hand.playerId)
      .filter(playerId => playerId !== 'p1');

    nextState.hands.forEach(hand => {
      hand.cards.forEach((card, index) => {
        if (!card?.faceUp) return;
        aiIds.forEach(aiId => {
          rememberCardForAI(aiId, hand.playerId, index, card as Card, 1);
        });
      });
    });
  }

  function seedSoloAIMemory(nextState: GameState) {
    nextState.hands.forEach(hand => {
      if (hand.playerId === 'p1') return;
      [2, 3].forEach(index => {
        const card = hand.cards[index];
        if (card) rememberCardForAI(hand.playerId, hand.playerId, index, card as Card, 0.95);
      });
    });
  }

  function applySoloEngineState(state: GameState, profiles?: PlayerProfile[]) {
    forgetMovedCardMemories(state);
    syncVisibleMemory(state);
    const profileList = profiles ?? buildSoloProfiles();
    const nextPlayers: Player[] = state.hands.map((hand, index) => {
      const profile = profileList.find(entry => entry.id === hand.playerId) ?? profileList[index] ?? PLAYER_CONFIGS[index];
      const cards = flatCardsToRows(hand.cards as (Card | null)[]);
      return {
        id: hand.playerId,
        name: profile?.name ?? `Player ${index + 1}`,
        avatar: profile?.avatar ?? PLAYER_AVATARS[index] ?? '🎮',
        color: profile?.color ?? PLAYER_COLORS[index] ?? '#1E88E5',
        glowColor: profile?.glowColor ?? GLOW_COLORS[index] ?? 'rgba(30,136,229,0.7)',
        cards,
        score: state.scores[hand.playerId] ?? 0,
        isAI: hand.playerId !== 'p1',
        isReady: true,
        hasKnocked: state.knockedById === hand.playerId,
      };
    });

    setPlayers(nextPlayers);
    setDrawPile(state.drawPile as Card[]);
    setDiscardPile(state.discardPile as Card[]);
    setCurrentPlayerIndex(state.currentPlayerIndex);
    setCurrentTurnPlayerId(state.playerOrder[state.currentPlayerIndex] ?? null);
    setDrawnCard(state.drawnCard ? { ...(state.drawnCard as Card), faceUp: true } : null);
    setPhase(mapPhase(state.phase));
    setFinalRound(state.finalRound);
    setKnockedBy(state.knockedById);
    setMatchWindowActive(state.reactionWindowOpen);
    setReactionEntries((state.reactions as ReactionEntry[]) ?? []);
    setPendingPower(state.pendingPower as '7' | '8' | '9' | '10' | null);
    setGiveawayGiverId(state.pendingGiveaway?.giverId ?? null);
    setLastPlayedCard(state.lastDiscardedCard as Card | null);
    soloPendingGiveawayRef.current = state.pendingGiveaway;
    playersRef.current = nextPlayers;
    drawPileRef.current = state.drawPile as Card[];
    discardPileRef.current = state.discardPile as Card[];
    currentPlayerIndexRef.current = state.currentPlayerIndex;
    drawnCardRef.current = state.drawnCard as Card | null;
    phaseRef.current = mapPhase(state.phase);
    finalRoundRef.current = state.finalRound;
    knockedByRef.current = state.knockedById;
    pendingPowerRef.current = state.pendingPower as '7' | '8' | '9' | '10' | null;
    matchWindowActiveRef.current = state.reactionWindowOpen;
    lastPlayedCardRef.current = state.lastDiscardedCard as Card | null;

    if (state.phase === 'game_over') {
      const winnerId = Object.entries(state.scores).reduce(
        (best, [id, score]) => (score < best.score ? { id, score } : best),
        { id: '', score: Infinity },
      ).id;
      setWinner(nextPlayers.find(player => player.id === winnerId) ?? null);
      gameActiveRef.current = false;
    } else {
      setWinner(null);
    }
  }

  function buildSoloEngineState(overrides: Partial<GameState> = {}): GameState {
    const currentPlayers = playersRef.current;
    return {
      drawPile: drawPileRef.current,
      discardPile: discardPileRef.current,
      hands: currentPlayers.map(player => ({
        playerId: player.id,
        cards: rowsToFlatCards(player.cards),
      })),
      playerOrder: currentPlayers.map(player => player.id),
      currentPlayerIndex: currentPlayerIndexRef.current,
      phase: mapContextPhaseToEngine(phaseRef.current),
      drawnCard: drawnCardRef.current,
      pendingPower: pendingPowerRef.current,
      lastDiscardedCard: lastPlayedCardRef.current,
      lastDiscardedById: currentPlayers[currentPlayerIndexRef.current]?.id ?? null,
      reactionWindowOpen: matchWindowActiveRef.current,
      reactions: soloReactionsRef.current,
      finalRound: finalRoundRef.current,
      knockedById: knockedByRef.current,
      gameOver: phaseRef.current === 'game_over',
      scores: currentPlayers.reduce<Record<string, number>>((acc, player) => {
        acc[player.id] = player.score;
        return acc;
      }, {}),
      power9Selection: null,
      pendingGiveaway: soloPendingGiveawayRef.current,
      ...overrides,
    };
  }

  const swapCard = useCallback((row: number, col: number) => {
    if (gameMode === 'multiplayer') {
      const flatIndex = row * 2 + col;
      syncSwapCard(roomCodeRef.current, flatIndex).catch(console.error);
      return;
    }
    if (phase !== 'swap' || !drawnCard || currentPlayerIndex !== 0) return;
    const flatIndex = row * 2 + col;
    const nextState = engineSwapCard(buildSoloEngineState(), 'p1', flatIndex);
    soloReactionsRef.current = [];
    applySoloEngineState(nextState);
  }, [applySoloEngineState, buildSoloEngineState, currentPlayerIndex, drawnCard, gameMode, phase]);

  const discardDrawn = useCallback(() => {
    if (gameMode === 'multiplayer') {
      syncDiscardDrawn(roomCodeRef.current).catch(console.error);
      return;
    }
    if (phase !== 'swap' || !drawnCard || currentPlayerIndex !== 0) return;
    const nextState = engineDiscardDrawnCard(buildSoloEngineState(), 'p1');
    soloReactionsRef.current = [];
    applySoloEngineState(nextState);
  }, [applySoloEngineState, buildSoloEngineState, currentPlayerIndex, drawnCard, gameMode, phase]);

  const reactToDiscard = useCallback((targetPlayerId: string, row: number, col: number) => {
    const flatIndex = row * 2 + col;
    const reactingPlayerId = myPlayerIdRef.current || playersRef.current[0]?.id;

    if (!reactingPlayerId) return;
    if (
      knockedByRef.current &&
      (reactingPlayerId === knockedByRef.current || targetPlayerId === knockedByRef.current)
    ) {
      return;
    }

    if (gameMode === 'multiplayer') {
      if (!matchWindowActive) return;
      syncReaction(roomCodeRef.current, targetPlayerId, flatIndex).catch(console.error);
      return;
    }

    if (!matchWindowActive) return;

    const alreadySent = soloReactionsRef.current.some(r => r.playerId === reactingPlayerId);
    if (alreadySent) return;
    const nextState = engineSubmitReaction(
      buildSoloEngineState({
        phase: 'react',
        reactionWindowOpen: true,
        reactions: soloReactionsRef.current,
      }),
      reactingPlayerId,
      targetPlayerId,
      flatIndex,
      Date.now(),
    );
    soloReactionsRef.current = nextState.reactions;
    setReactionEntries([...nextState.reactions]);
  }, [gameMode, matchWindowActive]);

  const completeSoloGiveaway = useCallback((row: number, col: number) => {
    const pending = soloPendingGiveawayRef.current;
    if (!pending) return;

    const flatIndex = row * 2 + col;
    const nextState = engineGiveAwayCard(
      buildSoloEngineState({
        phase: 'giveaway',
        pendingGiveaway: pending,
      }),
      pending.giverId,
      flatIndex,
    );
    soloPendingGiveawayRef.current = null;
    applySoloEngineState(nextState);
  }, [applySoloEngineState, buildSoloEngineState]);

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
      if (!latestPending) return;

      const latestGiver = playersRef.current.find(player => player.id === latestPending.giverId);
      if (!latestGiver || !latestGiver.isAI) return;

      const latestState = buildSoloEngineState({
        phase: 'giveaway',
        pendingGiveaway: latestPending,
      });
      const giverHand = latestState.hands.find(hand => hand.playerId === latestPending.giverId);
      const flatIndex = giverHand?.cards.findIndex(card => card !== null) ?? -1;
      if (flatIndex < 0) return;

      completeSoloGiveaway(Math.floor(flatIndex / 2), flatIndex % 2);
    }, 900);

    return () => clearTimeout(timer);
  }, [gameMode, phase, players, currentPlayerIndex, completeSoloGiveaway]);

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
    let nextState = buildSoloEngineState();
    if (pendingPower === '7' && cardFlatIndex !== undefined) {
      nextState = engineUsePower7(nextState, 'p1', cardFlatIndex);
    } else if (pendingPower === '8' && targetPlayerId && cardFlatIndex !== undefined) {
      nextState = engineUsePower8(nextState, 'p1', targetPlayerId, cardFlatIndex);
    } else {
      nextState = engineSkipPower(nextState, 'p1');
    }
    applySoloEngineState(nextState);
  }, [applySoloEngineState, buildSoloEngineState, gameMode, pendingPower, drawnCard]);

  const selectPower9Card = useCallback((targetPlayerId: string, cardFlatIndex: number) => {
    if (gameMode === 'multiplayer') {
      syncSelectPower9Card(roomCodeRef.current, targetPlayerId, cardFlatIndex).catch(console.error);
    }
  }, [gameMode]);

  // Immediately writes powerFocusTargetId to Firestore so all non-acting clients
  // can highlight the targeted player's panel in real time (powers 8/10).
  // Power 9 target is derived from power9Selection which is already synced by selectPower9Card.
  const setFocusTargetAction = useCallback((targetPlayerId: string | null) => {
    if (gameMode === 'multiplayer') {
      syncSetPowerFocusTarget(roomCodeRef.current, targetPlayerId).catch(console.error);
    }
  }, [gameMode]);

  const setPeekRevealCardAction = useCallback((card: { playerId: string; cardIndex: number } | null) => {
    if (gameMode === 'multiplayer') {
      syncSetPeekRevealCard(roomCodeRef.current, card).catch(console.error);
    }
  }, [gameMode]);

  const setPowerCueCardAction = useCallback((card: { playerId: string; cardIndex: number } | null) => {
    if (gameMode === 'multiplayer') {
      syncSetPowerCueCard(roomCodeRef.current, card).catch(console.error);
    }
  }, [gameMode]);

  const confirmPower9Action = useCallback((doSwap: boolean, selections: PowerCardSelection[]) => {
    if (gameMode === 'multiplayer') {
      if (selections.length < 2) return;

      (async () => {
        // Local UI tracks Power 9 selections optimistically, but Firestore remains
        // authoritative. Re-send both selections before confirming so the first
        // confirm click still succeeds even if the selection transactions are
        // still in flight.
        for (const selection of selections) {
          await syncSelectPower9Card(
            roomCodeRef.current,
            selection.playerId,
            selection.cardFlatIndex,
          );
        }

        await syncConfirmPower9(roomCodeRef.current, doSwap);
      })().catch(console.error);
      return;
    }

    if (selections.length < 2) return;
    let nextState = buildSoloEngineState({
      power9Selection: selections.map(selection => ({
        playerId: selection.playerId,
        cardIndex: selection.cardFlatIndex,
      })),
    });
    nextState = engineConfirmPower9(nextState, 'p1', doSwap);
    applySoloEngineState(nextState);
  }, [applySoloEngineState, buildSoloEngineState, gameMode]);

  const usePower10Action = useCallback((card1: PowerCardSelection, card2: PowerCardSelection) => {
    if (gameMode === 'multiplayer') {
      syncUsePower10(
        roomCodeRef.current,
        { playerId: card1.playerId, cardIndex: card1.cardFlatIndex },
        { playerId: card2.playerId, cardIndex: card2.cardFlatIndex },
      ).catch(console.error);
      return;
    }

    const nextState = engineUsePower10(
      buildSoloEngineState(),
      'p1',
      { playerId: card1.playerId, cardIndex: card1.cardFlatIndex },
      { playerId: card2.playerId, cardIndex: card2.cardFlatIndex },
    );
    applySoloEngineState(nextState);
  }, [applySoloEngineState, buildSoloEngineState, gameMode]);

  const knockAction = useCallback(() => {
    if (gameMode === 'multiplayer') {
      syncKnock(roomCodeRef.current).catch(console.error);
      return;
    }
    if (currentPlayerIndex !== 0 || finalRound) return;
    const nextState = engineKnock(buildSoloEngineState(), 'p1');
    applySoloEngineState(nextState);
  }, [applySoloEngineState, buildSoloEngineState, currentPlayerIndex, finalRound, gameMode]);

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
    aiMemoryRef.current = {};
    setGiveawayGiverId(null);
    setGameMode(null);
    setMyPlayerId('');
    setPlayerProfiles([]);
    setPlayers([]);
    setDrawPile([]); setDiscardPile([]);
    setCurrentPlayerIndex(0); setCurrentTurnPlayerId(null); setDrawnCard(null); setPhase('draw');
    setFinalRound(false); setKnockedBy(null); setMatchWindowActive(false);
    setReactionEntries([]);
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
      aiThinking, winner, chatMessages, lastPlayedCard, reactionEntries,
      pendingPower, power9Selection, powerFocusTargetId, peekRevealCard, powerCueCard, giveawayGiverId,
      setFocusTarget: setFocusTargetAction,
      setPeekRevealCard: setPeekRevealCardAction,
      setPowerCueCard: setPowerCueCardAction,
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
