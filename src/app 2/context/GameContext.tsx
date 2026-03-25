import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export type Suit = 'hearts' | 'diamonds' | 'spades' | 'clubs' | 'joker';
export type GamePhase = 'draw' | 'swap' | 'match_window' | 'power' | 'game_over';

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
  cards: (Card | null)[][];  // 2 rows × 2 cols
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

interface GameContextType {
  gameMode: 'multiplayer' | 'solo' | null;
  setGameMode: (mode: 'multiplayer' | 'solo') => void;
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
  pendingPower: '7' | '8' | null;
  initGame: () => void;
  drawFromPile: () => void;
  takeFromDiscard: () => void;
  swapCard: (row: number, col: number) => void;
  discardDrawn: () => void;
  knock: () => void;
  sendChat: (message: string) => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  resetGame: () => void;
  resolvePower: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs'];
const RANKS = [
  { rank: 'A', value: 1 },
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 10 },
  { rank: 'Q', value: 10 },
  { rank: 'K', value: -2 },
];

function createDeck(): Card[] {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(({ rank, value }) => {
      deck.push({ id: `${suit}-${rank}-${Math.random().toFixed(6)}`, value, suit, rank, faceUp: false });
    });
  });
  deck.push({ id: `joker-1-${Math.random()}`, value: -1, suit: 'joker', rank: '★', faceUp: false });
  deck.push({ id: `joker-2-${Math.random()}`, value: -1, suit: 'joker', rank: '★', faceUp: false });
  return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
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
    if (top?.faceUp && bot?.faceUp && top.value === bot.value) {
      continue; // column match cancels out
    }
    if (top?.faceUp) total += top.value;
    if (bot?.faceUp) total += bot.value;
  }
  return total;
}

const PLAYER_CONFIGS = [
  { id: 'p1', name: 'YOU', avatar: '🎮', color: '#1E88E5', glowColor: 'rgba(30,136,229,0.7)' },
  { id: 'p2', name: 'ALEX', avatar: '🦊', color: '#E53935', glowColor: 'rgba(229,57,53,0.7)' },
  { id: 'p3', name: 'JAMIE', avatar: '🐼', color: '#43A047', glowColor: 'rgba(67,160,71,0.7)' },
  { id: 'p4', name: 'RILEY', avatar: '🦋', color: '#AB47BC', glowColor: 'rgba(171,71,188,0.7)' },
];

const LOBBY_MESSAGES: ChatMessage[] = [
  { id: 'l1', playerId: 'p2', playerName: 'ALEX', message: "Let's go! 🔥", timestamp: new Date(Date.now() - 60000) },
  { id: 'l2', playerId: 'p3', playerName: 'JAMIE', message: "I'm gonna destroy you all 😈", timestamp: new Date(Date.now() - 40000) },
  { id: 'l3', playerId: 'p4', playerName: 'RILEY', message: "Bring it on! Low score wins 🏌️", timestamp: new Date(Date.now() - 20000) },
];

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameMode, setGameMode] = useState<'multiplayer' | 'solo' | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [drawPile, setDrawPile] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [phase, setPhase] = useState<GamePhase>('draw');
  const [finalRound, setFinalRound] = useState(false);
  const [knockedBy, setKnockedBy] = useState<string | null>(null);
  const [matchWindowActive, setMatchWindowActive] = useState(false);
  const [matchCountdown, setMatchCountdown] = useState(3);
  const [aiThinking, setAiThinking] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(LOBBY_MESSAGES);
  const [lastPlayedCard, setLastPlayedCard] = useState<Card | null>(null);
  const [pendingPower, setPendingPower] = useState<'7' | '8' | null>(null);

  // Refs to track latest state for AI logic
  const drawPileRef = useRef<Card[]>([]);
  const discardPileRef = useRef<Card[]>([]);
  const playersRef = useRef<Player[]>([]);
  const finalRoundRef = useRef(false);
  const knockedByRef = useRef<string | null>(null);
  const gameActiveRef = useRef(false);
  const matchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { drawPileRef.current = drawPile; }, [drawPile]);
  useEffect(() => { discardPileRef.current = discardPile; }, [discardPile]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { finalRoundRef.current = finalRound; }, [finalRound]);
  useEffect(() => { knockedByRef.current = knockedBy; }, [knockedBy]);

  const endGame = useCallback((finalPlayers: Player[]) => {
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

  const showMatchWindow = useCallback((onComplete: () => void) => {
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

  const advanceTurn = useCallback((fromIndex: number, currentPlayers: Player[], currentFinalRound: boolean, currentKnockedBy: string | null) => {
    const nextIndex = (fromIndex + 1) % 4;

    // Check if final round is over
    if (currentFinalRound && currentKnockedBy) {
      const knockerIdx = currentPlayers.findIndex(p => p.id === currentKnockedBy);
      if (nextIndex === knockerIdx) {
        endGame(currentPlayers);
        return;
      }
    }

    setCurrentPlayerIndex(nextIndex);
    setPhase('draw');
  }, [endGame]);

  // AI Turn Effect - triggers whenever it becomes an AI player's turn
  useEffect(() => {
    if (players.length === 0 || !gameActiveRef.current) return;
    if (phase !== 'draw' || matchWindowActive) return;
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer?.isAI) return;

    setAiThinking(true);
    const thinkTime = 1200 + Math.random() * 1000;

    const timer = setTimeout(() => {
      setAiThinking(false);

      // Reshuffle discard into draw pile if empty
      let pile = [...drawPileRef.current];
      if (pile.length === 0) {
        const discards = [...discardPileRef.current];
        const [keepTop, ...rest] = discards;
        if (rest.length === 0) {
          // Truly no cards anywhere — advance turn without drawing
          advanceTurn(currentPlayerIndex, playersRef.current, finalRoundRef.current, knockedByRef.current);
          return;
        }
        pile = shuffle(rest.map(c => ({ ...c, faceUp: false })));
        setDiscardPile(keepTop ? [keepTop] : []);
      }

      const drawn = { ...pile[pile.length - 1], faceUp: true };
      const newPile = pile.slice(0, pile.length - 1);
      setDrawPile(newPile);

      // AI decides: swap with worst face-up card or any face-down card
      const currentPlayers = [...playersRef.current];
      const player = { ...currentPlayers[currentPlayerIndex] };
      const newCards = player.cards.map(r => r.map(c => c ? { ...c } : null));

      let swapRow = -1, swapCol = -1, worstVal = drawn.value;
      // First try face-down cards
      outer: for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const c = newCards[row][col];
          if (c && !c.faceUp) { swapRow = row; swapCol = col; break outer; }
        }
      }
      // If no face-down, swap with highest value card
      if (swapRow === -1) {
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 2; col++) {
            const c = newCards[row][col];
            if (c?.faceUp && c.value > worstVal) {
              worstVal = c.value;
              swapRow = row; swapCol = col;
            }
          }
        }
      }

      let toDiscard: Card;
      if (swapRow !== -1) {
        const old = newCards[swapRow][swapCol];
        newCards[swapRow][swapCol] = { ...drawn, faceUp: true };
        toDiscard = old ? { ...old, faceUp: true } : drawn;
      } else {
        toDiscard = drawn;
      }

      player.cards = newCards;
      currentPlayers[currentPlayerIndex] = player;
      setPlayers(currentPlayers);
      setLastPlayedCard(toDiscard);
      setDiscardPile(prev => [toDiscard, ...prev]);

      showMatchWindow(() => {
        advanceTurn(currentPlayerIndex, currentPlayers, finalRoundRef.current, knockedByRef.current);
      });
    }, thinkTime);

    return () => clearTimeout(timer);
  }, [currentPlayerIndex, phase, players, matchWindowActive, showMatchWindow, advanceTurn]);

  const initGame = useCallback(() => {
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    gameActiveRef.current = true;
    setPendingPower(null);

    const deck = createDeck();
    const newPlayers: Player[] = PLAYER_CONFIGS.map((cfg, i) => {
      const cards: (Card | null)[][] = [[], []];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const card = deck.pop()!;
          // Player 1 peeks their 2 bottom cards
          if (i === 0 && row === 1) {
            card.faceUp = true;
          }
          cards[row].push(card);
        }
      }
      return { ...cfg, cards, score: 0, isAI: i !== 0, isReady: true, hasKnocked: false };
    });

    const firstDiscard = deck.pop()!;
    firstDiscard.faceUp = true;

    setPlayers(newPlayers);
    setDrawPile([...deck]);
    setDiscardPile([firstDiscard]);
    setCurrentPlayerIndex(0);
    setDrawnCard(null);
    setPhase('draw');
    setFinalRound(false);
    setKnockedBy(null);
    setMatchWindowActive(false);
    setMatchCountdown(3);
    setAiThinking(false);
    setWinner(null);
    setLastPlayedCard(null);
  }, []);

  const drawFromPile = useCallback(() => {
    if (phase !== 'draw' || currentPlayerIndex !== 0) return;

    let pile = [...drawPile];
    // Reshuffle discard pile into draw pile if empty
    if (pile.length === 0) {
      const [keepTop, ...rest] = discardPile;
      if (rest.length === 0) return; // truly no cards anywhere
      pile = shuffle(rest.map(c => ({ ...c, faceUp: false })));
      setDiscardPile(keepTop ? [keepTop] : []);
    }

    const card = { ...pile.pop()!, faceUp: true };
    setDrawPile(pile);
    setDrawnCard(card);
    setPhase('swap');
  }, [phase, currentPlayerIndex, drawPile, discardPile]);

  const takeFromDiscard = useCallback(() => {
    if (phase !== 'draw' || currentPlayerIndex !== 0) return;
    if (discardPile.length === 0) return;

    const [top, ...rest] = discardPile;
    setDiscardPile(rest);
    setDrawnCard({ ...top, faceUp: true });
    setPhase('swap');
  }, [phase, currentPlayerIndex, discardPile]);

  const swapCard = useCallback((row: number, col: number) => {
    if (phase !== 'swap' || !drawnCard || currentPlayerIndex !== 0) return;

    const updated = [...players];
    const player = { ...updated[0] };
    const newCards = player.cards.map(r => [...r]);
    const oldCard = newCards[row][col];
    newCards[row][col] = { ...drawnCard, faceUp: true };
    player.cards = newCards;
    updated[0] = player;

    const toDiscard = oldCard ? { ...oldCard, faceUp: true } : drawnCard;
    setPlayers(updated);
    setLastPlayedCard(toDiscard);
    setDiscardPile(prev => [toDiscard, ...prev]);
    setDrawnCard(null);

    showMatchWindow(() => {
      advanceTurn(0, updated, finalRoundRef.current, knockedByRef.current);
    });
  }, [phase, drawnCard, currentPlayerIndex, players, showMatchWindow, advanceTurn]);

  const discardDrawn = useCallback(() => {
    if (phase !== 'swap' || !drawnCard || currentPlayerIndex !== 0) return;

    const toDiscard = { ...drawnCard, faceUp: true };
    setLastPlayedCard(toDiscard);
    setDiscardPile(prev => [toDiscard, ...prev]);
    setDrawnCard(null);

    // Power cards: 7 = peek own card, 8 = peek opponent card
    if (drawnCard.rank === '7' || drawnCard.rank === '8') {
      setPendingPower(drawnCard.rank as '7' | '8');
      setPhase('power');
      return;
    }

    const currentPlayers = playersRef.current;
    showMatchWindow(() => {
      advanceTurn(0, currentPlayers, finalRoundRef.current, knockedByRef.current);
    });
  }, [phase, drawnCard, currentPlayerIndex, showMatchWindow, advanceTurn]);

  const resolvePower = useCallback(() => {
    setPendingPower(null);
    const currentPlayers = playersRef.current;
    showMatchWindow(() => {
      advanceTurn(0, currentPlayers, finalRoundRef.current, knockedByRef.current);
    });
  }, [showMatchWindow, advanceTurn]);

  const knock = useCallback(() => {
    if (currentPlayerIndex !== 0 || finalRound) return;

    setFinalRound(true);
    setKnockedBy('p1');
    setPhase('match_window'); // Lock player from drawing more cards
    finalRoundRef.current = true;
    knockedByRef.current = 'p1';

    const currentPlayers = playersRef.current;
    setTimeout(() => {
      advanceTurn(0, currentPlayers, true, 'p1');
    }, 2200);
  }, [currentPlayerIndex, finalRound, advanceTurn]);

  const sendChat = useCallback((message: string) => {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      playerId: 'p1', playerName: 'YOU',
      message, timestamp: new Date(),
    }]);
  }, []);

  const addChatMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setChatMessages(prev => [...prev, { ...msg, id: Date.now().toString(), timestamp: new Date() }]);
  }, []);

  const resetGame = useCallback(() => {
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    gameActiveRef.current = false;
    setPendingPower(null);
    setGameMode(null);
    setPlayers([]);
    setDrawPile([]);
    setDiscardPile([]);
    setCurrentPlayerIndex(0);
    setDrawnCard(null);
    setPhase('draw');
    setFinalRound(false);
    setKnockedBy(null);
    setMatchWindowActive(false);
    setAiThinking(false);
    setWinner(null);
    setChatMessages(LOBBY_MESSAGES);
  }, []);

  return (
    <GameContext.Provider value={{
      gameMode, setGameMode,
      players, setPlayers,
      drawPile, discardPile,
      currentPlayerIndex, drawnCard, phase,
      finalRound, knockedBy,
      matchWindowActive, matchCountdown,
      aiThinking, winner, chatMessages, lastPlayedCard,
      pendingPower,
      initGame, drawFromPile, takeFromDiscard,
      swapCard, discardDrawn, knock,
      sendChat, addChatMessage, resetGame, resolvePower,
    }}>
      {children}
    </GameContext.Provider>
  );
}