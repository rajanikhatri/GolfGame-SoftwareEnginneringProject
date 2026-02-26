import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export type Suit = 'hearts' | 'diamonds' | 'spades' | 'clubs' | 'joker';
export type GamePhase = 'draw' | 'swap' | 'match_window' | 'power' | 'game_over';

export interface Card {
  id: string; value: number; suit: Suit; rank: string; faceUp: boolean;
}

export interface Player {
  id: string; name: string; avatar: string; color: string; glowColor: string;
  cards: (Card | null)[][];
  score: number; isAI: boolean; isReady: boolean; hasKnocked: boolean;
  realPlayerId?: string;
}

export interface RoomPlayer {
  id: string; name: string; avatar: string; color: string; glowColor: string;
  slotIndex: number; ready: boolean;
}

export interface ChatMessage {
  id: string; playerId: string; playerName: string; message: string; timestamp: Date;
}

export interface PowerNotice {
  id: number;
  message: string;
}

const API_BASE = `https://${projectId}.supabase.co/functions/v1/server/make-server-278ab37f`;
const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  apikey: publicAnonKey,
  'Authorization': `Bearer ${publicAnonKey}`,
};

interface GameContextType {
  gameMode: 'multiplayer' | 'solo' | null;
  setGameMode: (mode: 'multiplayer' | 'solo') => void;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  drawPile: Card[]; discardPile: Card[];
  currentPlayerIndex: number;
  drawnCard: Card | null; phase: GamePhase;
  finalRound: boolean; knockedBy: string | null;
  matchWindowActive: boolean; matchCountdown: number;
  aiThinking: boolean; winner: Player | null;
  chatMessages: ChatMessage[]; lastPlayedCard: Card | null;
  pendingPower: '7' | '8' | '9' | '10' | null;
  powerNotice: PowerNotice | null;
  // Multiplayer state
  roomCode: string | null; myPlayerId: string | null;
  mySlotIndex: number; isHost: boolean;
  roomPlayers: RoomPlayer[]; roomStatus: 'waiting' | 'playing' | 'ended' | null;
  // Actions
  initGame: () => void;
  createRoom: (playerName: string, avatar?: string) => Promise<{ code: string; playerId: string }>;
  joinRoom: (code: string, playerName: string, avatar?: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  setPlayerReady: () => Promise<void>;
  startMultiplayerGame: () => Promise<void>;
  drawFromPile: () => void;
  takeFromDiscard: () => void;
  swapCard: (row: number, col: number) => void;
  discardDrawn: () => void;
  knock: () => void;
  resolvePower: (data?: any) => void;
  sendChat: (message: string) => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

// ─── Solo deck helpers ─────────────────────────────────────────────────────────
const SUITS: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs'];
const RANKS = [
  { rank: 'A', value: 1 }, { rank: '2', value: 2 }, { rank: '3', value: 3 },
  { rank: '4', value: 4 }, { rank: '5', value: 5 }, { rank: '6', value: 6 },
  { rank: '7', value: 7 }, { rank: '8', value: 8 }, { rank: '9', value: 9 },
  { rank: '10', value: 10 }, { rank: 'J', value: 10 }, { rank: 'Q', value: 10 },
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
    const top = cards[0]?.[col]; const bot = cards[1]?.[col];
    if (top?.faceUp && bot?.faceUp && top.value === bot.value && top.value >= 0) continue;
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
  const [pendingPower, setPendingPower] = useState<'7' | '8' | '9' | '10' | null>(null);
  const [powerNotice, setPowerNotice] = useState<PowerNotice | null>(null);

  // Multiplayer state
  const [roomCode, setRoomCode] = useState<string | null>(() => sessionStorage.getItem('golf_room_code'));
  const [myPlayerId, setMyPlayerId] = useState<string | null>(() => sessionStorage.getItem('golf_player_id'));
  const [mySlotIndex, setMySlotIndex] = useState<number>(() => parseInt(sessionStorage.getItem('golf_slot_index') || '0'));
  const [isHost, setIsHost] = useState<boolean>(() => sessionStorage.getItem('golf_is_host') === 'true');
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'playing' | 'ended' | null>(null);

  // Refs for AI and game loop
  const drawPileRef = useRef<Card[]>([]);
  const discardPileRef = useRef<Card[]>([]);
  const playersRef = useRef<Player[]>([]);
  const finalRoundRef = useRef(false);
  const knockedByRef = useRef<string | null>(null);
  const gameActiveRef = useRef(false);
  const matchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<any>(null);
  const supabaseRef = useRef<any>(null);
  const powerNoticeSeqRef = useRef(0);
  const lastAppliedPowerNoticeIdRef = useRef<number | null>(null);

  useEffect(() => { drawPileRef.current = drawPile; }, [drawPile]);
  useEffect(() => { discardPileRef.current = discardPile; }, [discardPile]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { finalRoundRef.current = finalRound; }, [finalRound]);
  useEffect(() => { knockedByRef.current = knockedBy; }, [knockedBy]);

  const announcePowerNotice = useCallback((message: string) => {
    powerNoticeSeqRef.current += 1;
    const id = Date.now() + powerNoticeSeqRef.current;
    lastAppliedPowerNoticeIdRef.current = id;
    setPowerNotice({ id, message });
    return id;
  }, []);

  // Restore multiplayer session on mount
  useEffect(() => {
    const savedCode = sessionStorage.getItem('golf_room_code');
    const savedId = sessionStorage.getItem('golf_player_id');
    if (savedCode && savedId) {
      setGameMode('multiplayer');
    }
  }, []);

  // ─── Apply full game state from server ──────────────────────────────────────
  const applyGameState = useCallback((gs: any) => {
    if (!gs) return;
    setPlayers(gs.players || []);
    setDrawPile(gs.drawPile || []);
    setDiscardPile(gs.discardPile || []);
    setCurrentPlayerIndex(gs.currentPlayerIndex ?? 0);
    setDrawnCard(gs.drawnCard || null);
    setPhase(gs.phase || 'draw');
    setFinalRound(gs.finalRound || false);
    setKnockedBy(gs.knockedBy || null);
    setWinner(gs.winner || null);
    setPendingPower(gs.pendingPower || null);
    setLastPlayedCard(gs.lastPlayedCard || null);
    if (gs.lastPowerNotice && gs.lastPowerNoticeId && gs.lastPowerNoticeId !== lastAppliedPowerNoticeIdRef.current) {
      lastAppliedPowerNoticeIdRef.current = gs.lastPowerNoticeId;
      setPowerNotice({ id: gs.lastPowerNoticeId, message: gs.lastPowerNotice });
    }
    if (gs.phase !== 'game_over') gameActiveRef.current = true;
  }, []);

  // ─── Supabase Realtime subscription ──────────────────────────────────────────
  useEffect(() => {
    if (!roomCode || gameMode !== 'multiplayer') return;

    const sb = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
    supabaseRef.current = sb;

    const channel = sb.channel(`golf-room-${roomCode}`, {
      config: { broadcast: { self: false } },
    })
      .on('broadcast', { event: 'room_update' }, ({ payload }: any) => {
        if (payload?.room) {
          setRoomPlayers(payload.room.players || []);
          setRoomStatus(payload.room.status);
          if (payload.room.hostId === myPlayerId) setIsHost(true);
        }
        if (payload?.gameState) applyGameState(payload.gameState);
      })
      .on('broadcast', { event: 'game_update' }, ({ payload }: any) => {
        if (payload?.gameState) applyGameState(payload.gameState);
      })
      .on('broadcast', { event: 'chat' }, ({ payload }: any) => {
        if (payload?.message) {
          setChatMessages(prev => [...prev, { ...payload.message, id: `rt-${Date.now()}`, timestamp: new Date() }]);
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => { sb.removeChannel(channel); channelRef.current = null; };
  }, [roomCode, gameMode, myPlayerId, applyGameState]);

  // ─── Multiplayer polling (backup for missed broadcasts) ──────────────────────
  useEffect(() => {
    if (gameMode !== 'multiplayer' || !roomCode) return;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/room/${roomCode}`, { headers: AUTH_HEADERS });
        if (!res.ok) return;
        const { room, gameState } = await res.json();
        setRoomPlayers(room.players || []);
        setRoomStatus(room.status);
        if (room.hostId === myPlayerId) setIsHost(true);
        if (gameState && (room.status === 'playing' || room.status === 'ended')) {
          applyGameState(gameState);
        }
      } catch (e) { /* silent */ }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [roomCode, gameMode, myPlayerId, applyGameState]);

  // ─── Broadcast helper ─────────────────────────────────────────────────────────
  const broadcast = useCallback((event: string, payload: any) => {
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  // ─── Send action to server (multiplayer) ──────────────────────────────────────
  const sendAction = useCallback(async (action: string, data?: any) => {
    if (!roomCode || !myPlayerId) return;
    try {
      const res = await fetch(`${API_BASE}/room/${roomCode}/action`, {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ playerId: myPlayerId, action, data: data || {} }),
      });
      if (!res.ok) { console.log(`Action error: ${await res.text()}`); return; }
      const { gameState } = await res.json();
      applyGameState(gameState);
      broadcast('game_update', { gameState });
    } catch (e) { console.log(`sendAction error: ${e}`); }
  }, [roomCode, myPlayerId, applyGameState, broadcast]);

  // ─── Solo game helpers ────────────────────────────────────────────────────────
  const endGame = useCallback((finalPlayers: Player[]) => {
    gameActiveRef.current = false;
    const scored = finalPlayers.map(p => ({
      ...p, score: calcScore(p.cards),
      cards: p.cards.map(row => row.map(c => c ? { ...c, faceUp: true } : null)),
    }));
    const winnerP = scored.reduce((a, b) => a.score < b.score ? a : b);
    setPlayers(scored); setWinner(winnerP); setPhase('game_over');
  }, []);

  const showMatchWindow = useCallback((onComplete: () => void) => {
    setMatchWindowActive(true); setMatchCountdown(3);
    let count = 3;
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    matchTimerRef.current = setInterval(() => {
      count--; setMatchCountdown(count);
      if (count <= 0) {
        if (matchTimerRef.current) clearInterval(matchTimerRef.current);
        setMatchWindowActive(false); onComplete();
      }
    }, 1000);
  }, []);

  const advanceTurn = useCallback((fromIndex: number, currentPlayers: Player[], currentFinalRound: boolean, currentKnockedBy: string | null) => {
    const nextIndex = (fromIndex + 1) % 4;
    if (currentFinalRound && currentKnockedBy) {
      const knockerIdx = currentPlayers.findIndex(p => p.id === currentKnockedBy);
      if (nextIndex === knockerIdx) { endGame(currentPlayers); return; }
    }
    setCurrentPlayerIndex(nextIndex); setPhase('draw');
  }, [endGame]);

  // ─── AI Turn (solo only) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (gameMode !== 'solo') return;
    if (players.length === 0 || !gameActiveRef.current) return;
    if (phase !== 'draw' || matchWindowActive) return;
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer?.isAI) return;

    setAiThinking(true);
    const timer = setTimeout(() => {
      try {
        setAiThinking(false);
        let pile = [...drawPileRef.current];
        if (pile.length === 0) {
          const discards = [...discardPileRef.current];
          const [keepTop, ...rest] = discards;
          if (rest.length === 0) { advanceTurn(currentPlayerIndex, playersRef.current, finalRoundRef.current, knockedByRef.current); return; }
          pile = shuffle(rest.map(c => ({ ...c, faceUp: false })));
          setDiscardPile(keepTop ? [keepTop] : []);
        }
        const drawn = { ...pile[pile.length - 1], faceUp: true };
        const newPile = pile.slice(0, pile.length - 1);
        setDrawPile(newPile);

        const currentPlayers = [...playersRef.current];
        const player = { ...currentPlayers[currentPlayerIndex] };
        const newCards = player.cards.map(r => r.map(c => c ? { ...c } : null));
        let swapRow = -1, swapCol = -1, worstVal = drawn.value;
        const selfHasFaceDown = newCards.some(row => row.some(c => c && !c.faceUp));
        const usesDrawnPower =
          (drawn.rank === '7' && selfHasFaceDown) ||
          (drawn.rank === '8' && currentPlayers.length >= 2) ||
          (drawn.rank === '9' && currentPlayers.length >= 2) ||
          (drawn.rank === '10' && currentPlayers.length >= 3);

        if (!usesDrawnPower) {
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
        }

        let toDiscard: Card;
        if (swapRow !== -1) {
          const old = newCards[swapRow][swapCol];
          newCards[swapRow][swapCol] = { ...drawn, faceUp: true };
          toDiscard = old ? { ...old, faceUp: true } : drawn;
        } else { toDiscard = drawn; }

        player.cards = newCards;
        currentPlayers[currentPlayerIndex] = player;
        let playersForAdvance = currentPlayers;
        setLastPlayedCard(toDiscard);
        setDiscardPile(prev => [toDiscard, ...prev]);
        const actorName = currentPlayers[currentPlayerIndex]?.name || 'Opponent';
        const allTargetsForPlayer = (pi: number) => {
          const result: { playerIndex: number; row: number; col: number }[] = [];
          const cards = currentPlayers[pi]?.cards ?? [];
          for (let row = 0; row < cards.length; row++) {
            for (let col = 0; col < (cards[row]?.length ?? 0); col++) {
              if (cards[row][col]) result.push({ playerIndex: pi, row, col });
            }
          }
          return result;
        };
        const pickRandom = <T,>(arr: T[]): T | null => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
        const swapTargets = (a: { playerIndex: number; row: number; col: number }, b: { playerIndex: number; row: number; col: number }) => {
          const updated = playersForAdvance.map(p => ({
            ...p,
            cards: p.cards.map(row => row.map(c => (c ? { ...c } : null))),
          }));
          const cardA = updated[a.playerIndex]?.cards?.[a.row]?.[a.col] ?? null;
          const cardB = updated[b.playerIndex]?.cards?.[b.row]?.[b.col] ?? null;
          if (!cardA || !cardB) return false;
          updated[a.playerIndex].cards[a.row][a.col] = cardB;
          updated[b.playerIndex].cards[b.row][b.col] = cardA;
          playersForAdvance = updated;
          return true;
        };

        if (usesDrawnPower && drawn.rank === '7') {
          const ownFaceDownTargets = allTargetsForPlayer(currentPlayerIndex).filter(t => {
            const c = currentPlayers[t.playerIndex]?.cards?.[t.row]?.[t.col];
            return c && !c.faceUp;
          });
          if (ownFaceDownTargets.length > 0) {
            pickRandom(ownFaceDownTargets);
            announcePowerNotice(`${actorName} peeked at one of their own cards`);
          }
        } else if (usesDrawnPower && drawn.rank === '8') {
          const opponentIndices = currentPlayers.map((_, idx) => idx).filter(idx => idx !== currentPlayerIndex);
          const targetPlayerIndex = pickRandom(opponentIndices);
          if (targetPlayerIndex !== null) {
            const target = pickRandom(allTargetsForPlayer(targetPlayerIndex));
            if (target) announcePowerNotice(`${actorName} peeked at ${currentPlayers[target.playerIndex]?.name}'s card`);
          }
        } else if (usesDrawnPower && drawn.rank === '9') {
          const candidatePlayers = currentPlayers.map((_, idx) => idx);
          const firstPlayer = pickRandom(candidatePlayers);
          const secondPlayer = firstPlayer === null ? null : pickRandom(candidatePlayers.filter(idx => idx !== firstPlayer));
          if (firstPlayer !== null && secondPlayer !== null) {
            const a = pickRandom(allTargetsForPlayer(firstPlayer));
            const b = pickRandom(allTargetsForPlayer(secondPlayer));
            if (a && b && swapTargets(a, b)) {
              announcePowerNotice(`${actorName} peeked and swapped cards between ${currentPlayers[firstPlayer]?.name} and ${currentPlayers[secondPlayer]?.name}`);
            }
          }
        } else if (usesDrawnPower && drawn.rank === '10') {
          const opponentIndices = currentPlayers.map((_, idx) => idx).filter(idx => idx !== currentPlayerIndex);
          const firstPlayer = pickRandom(opponentIndices);
          const secondPlayer = firstPlayer === null ? null : pickRandom(opponentIndices.filter(idx => idx !== firstPlayer));
          if (firstPlayer !== null && secondPlayer !== null) {
            const a = pickRandom(allTargetsForPlayer(firstPlayer));
            const b = pickRandom(allTargetsForPlayer(secondPlayer));
            if (a && b && swapTargets(a, b)) {
              announcePowerNotice(`${actorName} swapped cards between ${currentPlayers[firstPlayer]?.name} and ${currentPlayers[secondPlayer]?.name}`);
            }
          }
        }

        setPlayers(playersForAdvance);
        showMatchWindow(() => advanceTurn(currentPlayerIndex, playersForAdvance, finalRoundRef.current, knockedByRef.current));
      } catch (err) {
        console.error('AI turn error', err);
        setAiThinking(false);
        showMatchWindow(() => advanceTurn(currentPlayerIndex, playersRef.current, finalRoundRef.current, knockedByRef.current));
      }
    }, 1200 + Math.random() * 1000);

    return () => clearTimeout(timer);
  }, [currentPlayerIndex, phase, players, matchWindowActive, gameMode, showMatchWindow, advanceTurn, announcePowerNotice]);

  // ─── initGame (solo) ───────────────────────────────────────────────────────────
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
          if (i === 0 && row === 1) card.faceUp = true;
          cards[row].push(card);
        }
      }
      return { ...cfg, cards, score: 0, isAI: i !== 0, isReady: true, hasKnocked: false };
    });
    const firstDiscard = deck.pop()!;
    firstDiscard.faceUp = true;
    setPlayers(newPlayers); setDrawPile([...deck]); setDiscardPile([firstDiscard]);
    setCurrentPlayerIndex(0); setDrawnCard(null); setPhase('draw');
    setFinalRound(false); setKnockedBy(null); setMatchWindowActive(false);
    setMatchCountdown(3); setAiThinking(false); setWinner(null); setLastPlayedCard(null); setPowerNotice(null);
  }, []);

  // ─── Multiplayer room actions ──────────────────────────────────────────────────
  const createRoom = useCallback(async (playerName: string, avatar?: string) => {
    const res = await fetch(`${API_BASE}/room/create`, {
      method: 'POST', headers: AUTH_HEADERS,
      body: JSON.stringify({ playerName, avatar }),
    });
    if (!res.ok) throw new Error(await res.text());
    const { code, playerId, room } = await res.json();
    setRoomCode(code); setMyPlayerId(playerId); setMySlotIndex(0); setIsHost(true);
    setRoomPlayers(room.players); setRoomStatus('waiting'); setGameMode('multiplayer');
    sessionStorage.setItem('golf_room_code', code);
    sessionStorage.setItem('golf_player_id', playerId);
    sessionStorage.setItem('golf_slot_index', '0');
    sessionStorage.setItem('golf_is_host', 'true');
    return { code, playerId };
  }, []);

  const joinRoom = useCallback(async (code: string, playerName: string, avatar?: string) => {
    const res = await fetch(`${API_BASE}/room/join`, {
      method: 'POST', headers: AUTH_HEADERS,
      body: JSON.stringify({ code, playerName, avatar }),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to join'); }
    const { playerId, slotIndex, room } = await res.json();
    setRoomCode(code); setMyPlayerId(playerId); setMySlotIndex(slotIndex); setIsHost(false);
    setRoomPlayers(room.players); setRoomStatus('waiting'); setGameMode('multiplayer');
    sessionStorage.setItem('golf_room_code', code);
    sessionStorage.setItem('golf_player_id', playerId);
    sessionStorage.setItem('golf_slot_index', String(slotIndex));
    sessionStorage.setItem('golf_is_host', 'false');

    // Broadcast join to lobby
    setTimeout(() => {
      broadcast('room_update', { room });
    }, 500);
  }, [broadcast]);

  const leaveRoom = useCallback(async () => {
    if (!roomCode || !myPlayerId) return;
    try {
      await fetch(`${API_BASE}/room/${roomCode}/leave`, {
        method: 'DELETE', headers: AUTH_HEADERS,
        body: JSON.stringify({ playerId: myPlayerId }),
      });
    } catch (e) { /* silent */ }
    sessionStorage.removeItem('golf_room_code');
    sessionStorage.removeItem('golf_player_id');
    sessionStorage.removeItem('golf_slot_index');
    sessionStorage.removeItem('golf_is_host');
    setRoomCode(null); setMyPlayerId(null); setMySlotIndex(0); setIsHost(false);
    setRoomPlayers([]); setRoomStatus(null);
  }, [roomCode, myPlayerId]);

  const setPlayerReady = useCallback(async () => {
    if (!roomCode || !myPlayerId) return;
    const res = await fetch(`${API_BASE}/room/${roomCode}/ready`, {
      method: 'POST', headers: AUTH_HEADERS,
      body: JSON.stringify({ playerId: myPlayerId }),
    });
    if (!res.ok) return;
    const { room } = await res.json();
    setRoomPlayers(room.players);
    broadcast('room_update', { room });
  }, [roomCode, myPlayerId, broadcast]);

  const startMultiplayerGame = useCallback(async () => {
    if (!roomCode || !myPlayerId) return;
    const res = await fetch(`${API_BASE}/room/${roomCode}/start`, {
      method: 'POST', headers: AUTH_HEADERS,
      body: JSON.stringify({ playerId: myPlayerId }),
    });
    if (!res.ok) { console.log(`Start error: ${await res.text()}`); return; }
    const { room, gameState } = await res.json();
    setRoomStatus('playing');
    applyGameState(gameState);
    broadcast('room_update', { room, gameState });
  }, [roomCode, myPlayerId, applyGameState, broadcast]);

  // ─── Game actions (routed by mode) ────────────────────────────────────────────
  const drawFromPile = useCallback(() => {
    if (gameMode === 'multiplayer') { sendAction('draw_from_pile'); return; }
    if (phase !== 'draw' || currentPlayerIndex !== 0) return;
    let pile = [...drawPile];
    if (pile.length === 0) {
      const [keepTop, ...rest] = discardPile;
      if (rest.length === 0) return;
      pile = shuffle(rest.map(c => ({ ...c, faceUp: false })));
      setDiscardPile(keepTop ? [keepTop] : []);
    }
    const card = { ...pile.pop()!, faceUp: true };
    setDrawPile(pile); setDrawnCard(card); setPhase('swap');
  }, [gameMode, phase, currentPlayerIndex, drawPile, discardPile, sendAction]);

  const takeFromDiscard = useCallback(() => {
    if (gameMode === 'multiplayer') { sendAction('take_from_discard'); return; }
    if (phase !== 'draw' || currentPlayerIndex !== 0) return;
    if (discardPile.length === 0) return;
    const [top, ...rest] = discardPile;
    setDiscardPile(rest); setDrawnCard({ ...top, faceUp: true }); setPhase('swap');
  }, [gameMode, phase, currentPlayerIndex, discardPile, sendAction]);

  const swapCard = useCallback((row: number, col: number) => {
    if (gameMode === 'multiplayer') { sendAction('swap_card', { row, col }); return; }
    if (phase !== 'swap' || !drawnCard || currentPlayerIndex !== 0) return;
    const updated = [...players];
    const player = { ...updated[0] };
    const newCards = player.cards.map(r => [...r]);
    const oldCard = newCards[row][col];
    newCards[row][col] = { ...drawnCard, faceUp: true };
    player.cards = newCards; updated[0] = player;
    const toDiscard = oldCard ? { ...oldCard, faceUp: true } : drawnCard;
    setPlayers(updated); setLastPlayedCard(toDiscard);
    setDiscardPile(prev => [toDiscard, ...prev]); setDrawnCard(null);
    showMatchWindow(() => advanceTurn(0, updated, finalRoundRef.current, knockedByRef.current));
  }, [gameMode, phase, drawnCard, currentPlayerIndex, players, showMatchWindow, advanceTurn, sendAction]);

  const discardDrawn = useCallback(() => {
    if (gameMode === 'multiplayer') { sendAction('discard_drawn'); return; }
    if (phase !== 'swap' || !drawnCard || currentPlayerIndex !== 0) return;
    const toDiscard = { ...drawnCard, faceUp: true };
    setLastPlayedCard(toDiscard); setDiscardPile(prev => [toDiscard, ...prev]); setDrawnCard(null);
    if (drawnCard.rank === '7' || drawnCard.rank === '8' || drawnCard.rank === '9' || drawnCard.rank === '10') {
      if (drawnCard.rank === '7') {
        const selfCards = playersRef.current[0]?.cards ?? [];
        const hasFaceDownCard = selfCards.some((row) => row.some((c) => c && !c.faceUp));
        if (!hasFaceDownCard) {
          const currentPlayers = playersRef.current;
          showMatchWindow(() => advanceTurn(0, currentPlayers, finalRoundRef.current, knockedByRef.current));
          return;
        }
      }
      if (drawnCard.rank === '10' && playersRef.current.length < 3) {
        const currentPlayers = playersRef.current;
        showMatchWindow(() => advanceTurn(0, currentPlayers, finalRoundRef.current, knockedByRef.current));
        return;
      }
      setPendingPower(drawnCard.rank as '7' | '8' | '9' | '10'); setPhase('power'); return;
    }
    const currentPlayers = playersRef.current;
    showMatchWindow(() => advanceTurn(0, currentPlayers, finalRoundRef.current, knockedByRef.current));
  }, [gameMode, phase, drawnCard, currentPlayerIndex, showMatchWindow, advanceTurn, sendAction]);

  const resolvePower = useCallback((data?: any) => {
    if (gameMode === 'multiplayer') { sendAction('use_power', data); return; }
    let playersForAdvance = playersRef.current;
    if (typeof data?.notice === 'string' && data.notice.trim()) {
      announcePowerNotice(data.notice.trim());
    }
    if (pendingPower === '9' || pendingPower === '10') {
      let swapped = false;
      const targets = Array.isArray(data?.targets) ? data.targets : null;
      if (targets?.length === 2) {
        const [a, b] = targets;
        const validIndex = (v: any) => Number.isInteger(v) && v >= 0;
        const validRowCol = (v: any) => Number.isInteger(v) && v >= 0 && v < 2;
        const myIndex = 0;
        const valid =
          validIndex(a?.playerIndex) && validIndex(b?.playerIndex) &&
          validRowCol(a?.row) && validRowCol(a?.col) &&
          validRowCol(b?.row) && validRowCol(b?.col) &&
          a.playerIndex !== b.playerIndex &&
          (pendingPower === '9'
            ? true
            : (a.playerIndex !== myIndex && b.playerIndex !== myIndex));

        if (valid) {
          const updated = playersRef.current.map(p => ({
            ...p,
            cards: p.cards.map(row => row.map(c => (c ? { ...c } : null))),
          }));
          const cardA = updated[a.playerIndex]?.cards?.[a.row]?.[a.col] ?? null;
          const cardB = updated[b.playerIndex]?.cards?.[b.row]?.[b.col] ?? null;
          if (cardA && cardB) {
            updated[a.playerIndex].cards[a.row][a.col] = cardB;
            updated[b.playerIndex].cards[b.row][b.col] = cardA;
            setPlayers(updated);
            playersForAdvance = updated;
            swapped = true;
          }
        }
      }
      if (!swapped) return;
    }
    setPendingPower(null);
    showMatchWindow(() => advanceTurn(0, playersForAdvance, finalRoundRef.current, knockedByRef.current));
  }, [gameMode, pendingPower, showMatchWindow, advanceTurn, sendAction, announcePowerNotice]);

  const knock = useCallback(() => {
    if (gameMode === 'multiplayer') { sendAction('knock'); return; }
    if (currentPlayerIndex !== 0 || finalRound) return;
    setFinalRound(true); setKnockedBy('p1'); setPhase('match_window');
    finalRoundRef.current = true; knockedByRef.current = 'p1';
    const currentPlayers = playersRef.current;
    setTimeout(() => advanceTurn(0, currentPlayers, true, 'p1'), 2200);
  }, [gameMode, currentPlayerIndex, finalRound, advanceTurn, sendAction]);

  const sendChat = useCallback((message: string) => {
    const myPlayer = gameMode === 'multiplayer'
      ? roomPlayers.find(p => p.id === myPlayerId)
      : null;
    const msg = {
      id: Date.now().toString(), playerId: myPlayerId || 'p1',
      playerName: myPlayer?.name || 'YOU', message, timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, msg]);
    if (gameMode === 'multiplayer') broadcast('chat', { message: msg });
  }, [gameMode, myPlayerId, roomPlayers, broadcast]);

  const addChatMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setChatMessages(prev => [...prev, { ...msg, id: Date.now().toString(), timestamp: new Date() }]);
  }, []);

  const resetGame = useCallback(() => {
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    gameActiveRef.current = false; setPendingPower(null);
    setGameMode(null); setPlayers([]); setDrawPile([]); setDiscardPile([]);
    setCurrentPlayerIndex(0); setDrawnCard(null); setPhase('draw');
    setFinalRound(false); setKnockedBy(null); setMatchWindowActive(false);
    setAiThinking(false); setWinner(null); setChatMessages(LOBBY_MESSAGES); setPowerNotice(null);
    // Clear multiplayer session
    leaveRoom();
  }, [leaveRoom]);

  return (
    <GameContext.Provider value={{
      gameMode, setGameMode, players, setPlayers, drawPile, discardPile,
      currentPlayerIndex, drawnCard, phase, finalRound, knockedBy,
      matchWindowActive, matchCountdown, aiThinking, winner, chatMessages,
      lastPlayedCard, pendingPower, powerNotice,
      roomCode, myPlayerId, mySlotIndex, isHost, roomPlayers, roomStatus,
      initGame, createRoom, joinRoom, leaveRoom, setPlayerReady, startMultiplayerGame,
      drawFromPile, takeFromDiscard, swapCard, discardDrawn, knock, resolvePower,
      sendChat, addChatMessage, resetGame,
    }}>
      {children}
    </GameContext.Provider>
  );
}
