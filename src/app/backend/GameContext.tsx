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
  syncSwapCard,
  syncDiscardDrawn,
  syncReaction,
  syncKnock,
  syncResolveReactionWindow,
  saveInitialGameState,
  syncRemovePlayer,
} from '../database/firebaseGameSync';
import {
  createInitialGameState,
  type GameState,
  type GamePhase as EnginePhase,
} from './gameEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Suit = 'hearts' | 'diamonds' | 'spades' | 'clubs' | 'joker';
export type GamePhase = 'peek' | 'draw' | 'swap' | 'match_window' | 'power' | 'game_over';

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
  reactToDiscard: (row: number, col: number) => void;
  knock: () => void;
  skipPower: () => void;
  swapCountdown: number | null;
  disconnectedPlayerName: string | null;
  sendChat: (message: string) => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  endPeek: () => void;
  resetGame: () => void;
  resolvePower: (targetPlayerId?: string, cardFlatIndex?: number) => void;
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
    RANKS.forEach(({ rank, value }) => {
      deck.push({ id: `${suit}-${rank}-${Math.random().toFixed(6)}`, value, suit, rank, faceUp: false });
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
  if (enginePhase === 'peek')  return 'peek';
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
  const [disconnectedPlayerName, setDisconnectedPlayerName] = useState<string | null>(null);
  const [swapCountdown,         setSwapCountdown]         = useState<number | null>(null);

  const drawPileRef    = useRef<Card[]>([]);
  const discardPileRef = useRef<Card[]>([]);
  const playersRef     = useRef<Player[]>([]);
  const finalRoundRef  = useRef(false);
  const knockedByRef   = useRef<string | null>(null);
  const gameActiveRef  = useRef(false);
  const matchTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const swapTimerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomCodeRef        = useRef('');
  const playerProfilesRef  = useRef<PlayerProfile[]>([]);
  const myPlayerIdRef      = useRef('');
  const lastGameStateRef   = useRef<GameState | null>(null);

  // These four are updated in effects (only used in async callbacks, fine to be one render late)
  useEffect(() => { drawPileRef.current    = drawPile;    }, [drawPile]);
  useEffect(() => { discardPileRef.current = discardPile; }, [discardPile]);
  useEffect(() => { playersRef.current     = players;     }, [players]);
  useEffect(() => { finalRoundRef.current  = finalRound;  }, [finalRound]);
  useEffect(() => { knockedByRef.current   = knockedBy;   }, [knockedBy]);
  useEffect(() => { roomCodeRef.current    = roomCode;    }, [roomCode]);

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

    setPlayers(newPlayers);
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
    setLastPlayedCard(state.lastDiscardedCard as Card | null);

    if (state.phase === 'game_over') {
      const scores = state.scores;
      const winnerId = Object.entries(scores).reduce(
        (best, [id, score]) => score < best.score ? { id, score } : best,
        { id: '', score: Infinity },
      ).id;
      setWinner(newPlayers.find(p => p.id === winnerId) ?? null);
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

  const soloShowMatchWindow = useCallback((onComplete: () => void) => {
    setMatchWindowActive(true);
    setMatchCountdown(3);
    let count = 3;
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    matchTimerRef.current = setInterval(() => {
      count--;
      setMatchCountdown(count);
      if (count <= 0) {
        if (matchTimerRef.current) clearInterval(matchTimerRef.current);
        setMatchWindowActive(false);
        onComplete();
      }
    }, 1000);
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
      const newCards = player.cards.map(r => r.map(c => c ? { ...c } : null));

      let swapRow = -1, swapCol = -1, worstVal = drawn.value;
      outer: for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const c = newCards[row][col];
          if (c && !c.faceUp) { swapRow = row; swapCol = col; break outer; }
        }
      }
      if (swapRow === -1) {
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 2; col++) {
            const c = newCards[row][col];
            if (c?.faceUp && c.value > worstVal) { worstVal = c.value; swapRow = row; swapCol = col; }
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

      soloShowMatchWindow(() => {
        soloAdvanceTurn(currentPlayerIndex, currentPlayers, finalRoundRef.current, knockedByRef.current);
      });
    }, thinkTime);

    return () => clearTimeout(timer);
  }, [gameMode, currentPlayerIndex, phase, players, matchWindowActive, soloShowMatchWindow, soloAdvanceTurn]);

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
    setMatchCountdown(3); setAiThinking(false); setWinner(null); setLastPlayedCard(null);
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
    setMatchCountdown(3); setAiThinking(false); setWinner(null); setLastPlayedCard(null);
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
    soloShowMatchWindow(() => soloAdvanceTurn(0, updated, finalRoundRef.current, knockedByRef.current));
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
    soloShowMatchWindow(() => soloAdvanceTurn(0, currentPlayers, finalRoundRef.current, knockedByRef.current));
  }, [gameMode, phase, drawnCard, currentPlayerIndex, soloShowMatchWindow, soloAdvanceTurn]);

  const reactToDiscard = useCallback((row: number, col: number) => {
    const flatIndex = row * 2 + col;

    if (gameMode === 'multiplayer') {
      if (!matchWindowActive) return;
      syncReaction(roomCodeRef.current, flatIndex).catch(console.error);
      return;
    }

    if (!matchWindowActive || currentPlayerIndex === 0 || !lastPlayedCard) return;

    const currentPlayers = [...playersRef.current];
    const player = { ...currentPlayers[0] };
    const newCards = player.cards.map(r => [...r]);
    const selectedCard = newCards[row]?.[col];
    if (!selectedCard) return;

    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    setMatchWindowActive(false);

    if (selectedCard.value === lastPlayedCard.value) {
      newCards[row][col] = null;
      setDiscardPile(prev => [{ ...selectedCard, faceUp: true }, ...prev]);
    } else {
      const reactedPlayerId = player.id;
      const exposedDiscard = clonePenaltyCard(lastPlayedCard, reactedPlayerId);
      let nextDiscardPile = discardPileRef.current.length > 0
        ? discardPileRef.current.slice(1)
        : [];
      let penalizedCards = addCardToGrid(newCards, exposedDiscard);
      let pile = [...drawPileRef.current];
      setDiscardPile(nextDiscardPile);
      if (pile.length === 0) {
        const [keepTop, ...rest] = nextDiscardPile;
        if (rest.length > 0) {
          pile = shuffleArr(rest.map(c => ({ ...c, faceUp: false })));
          nextDiscardPile = keepTop ? [keepTop] : [];
          setDiscardPile(nextDiscardPile);
        }
      }

      if (pile.length > 0) {
        const penaltyCard = { ...pile[pile.length - 1], faceUp: false };
        pile = pile.slice(0, pile.length - 1);
        setDrawPile(pile);
        penalizedCards = addCardToGrid(penalizedCards, penaltyCard);
      }
      player.cards = penalizedCards;
      currentPlayers[0] = player;
      setPlayers(currentPlayers);
      soloAdvanceTurn(currentPlayerIndex, currentPlayers, finalRoundRef.current, knockedByRef.current);
      return;
    }

    player.cards = newCards;
    currentPlayers[0] = player;
    setPlayers(currentPlayers);
    soloAdvanceTurn(currentPlayerIndex, currentPlayers, finalRoundRef.current, knockedByRef.current);
  }, [gameMode, matchWindowActive, currentPlayerIndex, lastPlayedCard, soloAdvanceTurn]);

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
    // Solo: once the power is used, discard the power card immediately and continue
    // through the normal reaction/turn-advance flow.
    const discarded = { ...drawnCard, faceUp: true };
    setPendingPower(null);
    setLastPlayedCard(discarded);
    setDiscardPile(prev => [discarded, ...prev]);
    setDrawnCard(null);
    setPhase('match_window');
    const currentPlayers = playersRef.current;
    soloShowMatchWindow(() => soloAdvanceTurn(0, currentPlayers, finalRoundRef.current, knockedByRef.current));
  }, [gameMode, pendingPower, drawnCard, soloShowMatchWindow, soloAdvanceTurn]);

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
      pendingPower,
      swapCountdown,
      disconnectedPlayerName,
      initMultiplayer,
      initGame, initGameFromState,
      drawFromPile, takeFromDiscard,
      swapCard, discardDrawn, reactToDiscard,
      knock: knockAction,
      skipPower: skipPowerAction,
      endPeek,
      sendChat, addChatMessage, resetGame, resolvePower,
    }}>
      {children}
    </GameContext.Provider>
  );
}
