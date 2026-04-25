import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, Copy, Check, Wifi, Palette } from 'lucide-react';
import { useGame } from '../../backend/GameContext';
import { beginRoomStartCountdown, subscribeToRoom, startRoom, type FirebaseRoomDoc } from '../../database/firebaseRooms';
import { ensureAnonymousUser } from '../../database/firebase';
import {
  TABLE_THEMES,
  getStoredTableThemeId,
  setStoredTableThemeId,
  type TableThemeId,
} from '../lib/tableTheme';

const AI_MESSAGES = [
  "Can't wait to destroy you all 😈",
  'Low score wins, I never forget!',
  "Ready to GOLF! Let's go!",
  'Watch out for my jokers',
  'This is gonna be epic!',
];

interface LobbyPlayer {
  id: string;
  name: string;
  avatar: string;
  color: string;
  ready: boolean;
  isYou?: boolean;
}

const INITIAL_PLAYERS: LobbyPlayer[] = [
  { id: 'p1', name: 'YOU', avatar: '🎮', color: '#1E88E5', ready: true, isYou: true },
  { id: 'p2', name: 'ALEX', avatar: '🦊', color: '#E53935', ready: false },
  { id: 'p3', name: 'JAMIE', avatar: '🐼', color: '#43A047', ready: false },
  { id: 'p4', name: 'RILEY', avatar: '🦋', color: '#AB47BC', ready: false },
];

const PLAYER_COLORS = ['#1E88E5', '#E53935', '#43A047', '#AB47BC'];
const PLAYER_AVATARS = ['🎮', '🦊', '🐼', '🦋'];

export default function Lobby() {
  const navigate = useNavigate();
  const { gameMode, playerName, roomCode, initGame, initMultiplayer, chatMessages, sendChat, addChatMessage } = useGame();
  const initialPlayers: LobbyPlayer[] = gameMode === 'multiplayer'
    ? [{ id: 'p1', name: playerName || 'YOU', avatar: '🎮', color: '#1E88E5', ready: true, isYou: true }]
    : INITIAL_PLAYERS.map(player => (player.isYou ? { ...player, name: playerName || 'YOU' } : player));

  const [players, setPlayers] = useState<LobbyPlayer[]>(initialPlayers);
  const [inputMsg, setInputMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isHost, setIsHost] = useState(gameMode === 'solo');
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [selectedTableTheme, setSelectedTableTheme] = useState<TableThemeId>(() => getStoredTableThemeId());
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showRulesDetails, setShowRulesDetails] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const themePickerRef = useRef<HTMLDivElement>(null);
  const seenPlayerIdsRef = useRef<Set<string>>(new Set());
  const isFirstRoomUpdate = useRef(true);
  const myUserIdRef = useRef<string | null>(null);
  const roomStartFinalizedRef = useRef(false);
  const ROOM_CODE = roomCode || 'GOLF-0000';

  useEffect(() => {
    if (!gameMode) navigate('/');
  }, [gameMode, navigate]);

  useEffect(() => {
    if (gameMode !== 'multiplayer') return;
    ensureAnonymousUser().then(user => {
      myUserIdRef.current = user.uid;
    });
  }, [gameMode]);

  useEffect(() => {
    if (gameMode !== 'multiplayer' || !roomCode) return;

    const unsub = subscribeToRoom(roomCode, (room: FirebaseRoomDoc | null) => {
      if (!room) return;

      if (room.status === 'starting') {
        const remainingSeconds = Math.max(1, Math.ceil(((room.startsAt ?? Date.now() + 3000) - Date.now()) / 1000));
        setIsStarting(true);
        setStartError(null);
        setCountdown(remainingSeconds);
      }

      if (room.status === 'playing') {
        const glowColors = ['rgba(30,136,229,0.7)', 'rgba(229,57,53,0.7)', 'rgba(67,160,71,0.7)', 'rgba(171,71,188,0.7)'];
        const profiles = room.players.map((player, index) => ({
          id: player.id,
          name: player.name,
          avatar: PLAYER_AVATARS[index] ?? '🎮',
          color: PLAYER_COLORS[index] ?? '#1E88E5',
          glowColor: glowColors[index] ?? 'rgba(30,136,229,0.7)',
        }));

        ensureAnonymousUser().then(user => {
          initMultiplayer(user.uid, profiles).then(() => navigate('/game'));
        });
        return;
      }

      const updatedPlayers: LobbyPlayer[] = room.players.map((player, index) => ({
        id: player.id,
        name: player.name,
        avatar: PLAYER_AVATARS[index] ?? '🎮',
        color: PLAYER_COLORS[index] ?? '#1E88E5',
        ready: player.ready,
        isYou: myUserIdRef.current ? player.id === myUserIdRef.current : player.name === playerName,
      }));

      setPlayers(updatedPlayers);
      const myPlayer = room.players.find(player =>
        myUserIdRef.current ? player.id === myUserIdRef.current : player.name === playerName
      );
      setIsHost(Boolean(myPlayer) && myPlayer.id === room.hostId);

      if (isFirstRoomUpdate.current) {
        isFirstRoomUpdate.current = false;
        room.players.forEach(player => seenPlayerIdsRef.current.add(player.id));
      } else {
        for (const player of room.players) {
          if (!seenPlayerIdsRef.current.has(player.id)) {
            seenPlayerIdsRef.current.add(player.id);
            addChatMessage({ playerId: player.id, playerName: player.name, message: 'Joined the room.' });
          }
        }
      }
    });

    return () => unsub();
  }, [gameMode, roomCode, playerName, addChatMessage, initMultiplayer, navigate]);

  useEffect(() => {
    if (gameMode !== 'solo') return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => {
      setPlayers(prev => prev.map(player => (player.id === 'p2' ? { ...player, ready: true } : player)));
      addChatMessage({ playerId: 'p2', playerName: 'ALEX', message: AI_MESSAGES[0] });
    }, 1000));

    timers.push(setTimeout(() => {
      setPlayers(prev => prev.map(player => (player.id === 'p3' ? { ...player, ready: true } : player)));
      addChatMessage({ playerId: 'p3', playerName: 'JAMIE', message: AI_MESSAGES[2] });
    }, 2000));

    timers.push(setTimeout(() => {
      setPlayers(prev => prev.map(player => (player.id === 'p4' ? { ...player, ready: true } : player)));
      addChatMessage({ playerId: 'p4', playerName: 'RILEY', message: AI_MESSAGES[3] });
    }, 3000));

    return () => timers.forEach(clearTimeout);
  }, [gameMode, addChatMessage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (!showThemePicker) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!themePickerRef.current?.contains(event.target as Node)) {
        setShowThemePicker(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showThemePicker]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      if (gameMode === 'multiplayer' && roomCode) {
        if (isHost && !roomStartFinalizedRef.current) {
          roomStartFinalizedRef.current = true;
          startRoom(roomCode).catch(error => {
            const message = error instanceof Error ? error.message : 'Failed to start game';
            setStartError(message);
            setIsStarting(false);
            setCountdown(null);
            roomStartFinalizedRef.current = false;
            console.error('Failed to start room:', error);
          });
        }
        return;
      }
      navigate('/game');
      return;
    }

    const timer = setTimeout(() => setCountdown(value => (value ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, gameMode, isHost, navigate, roomCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(ROOM_CODE).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    if (!isHost || !allReady || isStarting) return;

    if (gameMode === 'multiplayer' && roomCode) {
      setIsStarting(true);
      setStartError(null);
      try {
        if (players.length < 2) {
          setStartError('Need at least 2 players to start a multiplayer game.');
          setIsStarting(false);
          return;
        }

        const user = await ensureAnonymousUser();
        const glowColors = ['rgba(30,136,229,0.7)', 'rgba(229,57,53,0.7)', 'rgba(67,160,71,0.7)', 'rgba(171,71,188,0.7)'];
        const profiles = players.map((player, index) => ({
          id: player.id,
          name: player.name,
          avatar: PLAYER_AVATARS[index] ?? '🎮',
          color: PLAYER_COLORS[index] ?? '#1E88E5',
          glowColor: glowColors[index] ?? 'rgba(30,136,229,0.7)',
        }));

        await initMultiplayer(user.uid, profiles, players.map(player => player.id));
        roomStartFinalizedRef.current = false;
        await beginRoomStartCountdown(roomCode, Date.now() + 3000);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to start game';
        setStartError(message);
        console.error('Failed to start room:', error);
        setIsStarting(false);
      }
      return;
    }

    setIsStarting(true);
    initGame();
    setCountdown(3);
  };

  const handleSend = () => {
    if (!inputMsg.trim()) return;
    sendChat(inputMsg.trim());
    setInputMsg('');
  };

  const handleThemeSelect = (themeId: TableThemeId) => {
    setSelectedTableTheme(themeId);
    setStoredTableThemeId(themeId);
    setShowThemePicker(false);
  };

  const allReady = players.every(player => player.ready);
  const readyPlayerCount = players.filter(player => player.ready || player.isYou).length;
  const activeTableTheme = TABLE_THEMES.find(theme => theme.id === selectedTableTheme) ?? TABLE_THEMES[0];
  const startHint = !isHost
    ? 'Waiting for the host to start the game.'
    : allReady
    ? 'All players are ready.'
    : 'Waiting for every player to be ready.';

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden font-game"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #1565C0 0%, #0D47A1 30%, #0D2137 70%, #060D1B 100%)',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      <AnimatePresence>
        {countdown !== null && countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.7)', fontFamily: 'Nunito' }}>
              GAME STARTING IN
            </div>
            <motion.div
              key={countdown}
              initial={{ scale: 1.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                fontSize: 140,
                fontWeight: 900,
                background: 'linear-gradient(180deg, #FFC107, #FF6F00)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontFamily: 'Nunito',
                filter: 'drop-shadow(0 8px 24px rgba(255,193,7,0.5))',
                lineHeight: 1,
              }}
            >
              {countdown}
            </motion.div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito' }}>
              Get ready to GOLF!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lobby-header relative z-30">
        <button
          className="arcade-btn arcade-btn-red flex items-center gap-2 px-5 py-3"
          style={{ fontSize: 15, fontWeight: 800 }}
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={18} />
          BACK
        </button>

        <div className="lobby-header__center">
          <div className="lobby-header__eyebrow">PLAYERS</div>
          <div className="lobby-header__title">{readyPlayerCount}/4 READY</div>
          {gameMode !== 'solo' && (
            <div className="lobby-header__room-row">
              <div className="room-code-badge px-4 py-2">
                <span style={{ fontSize: 16, fontWeight: 900, color: 'white', fontFamily: 'Nunito', letterSpacing: '0.12em' }}>
                  {ROOM_CODE}
                </span>
              </div>
              <button onClick={handleCopy} className="lobby-header__copy" aria-label="Copy room code">
                {copied ? <Check size={16} color="#4CAF50" /> : <Copy size={16} />}
              </button>
            </div>
          )}
        </div>

        <div className="lobby-header-tools">
          <div className="lobby-header-status-row" ref={themePickerRef}>
            <button
              type="button"
              className="lobby-theme-trigger"
              aria-label="Open table theme options"
              aria-expanded={showThemePicker}
              onClick={() => setShowThemePicker(value => !value)}
              style={{
                ['--lobby-theme-trigger-accent' as string]: activeTableTheme.accent,
              }}
            >
              <Palette size={15} />
            </button>
            <div className="lobby-header__mode-badge">
              <Wifi size={16} color="#42A5F5" />
              <span>{gameMode === 'solo' ? 'SOLO MODE' : 'MULTIPLAYER'}</span>
            </div>
            {showThemePicker && (
              <div className="lobby-header-theme-picker">
                <div className="lobby-header-theme-picker__label">TABLE THEME</div>
                <div className="lobby-theme-buttons" role="group" aria-label="Select table theme">
                  {TABLE_THEMES.map(theme => {
                    const isSelected = selectedTableTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        className={`lobby-theme-button${isSelected ? ' lobby-theme-button--selected' : ''}`}
                        aria-pressed={isSelected}
                        onClick={() => handleThemeSelect(theme.id)}
                        style={{
                          ['--lobby-theme-button-glow' as string]: theme.optionGlow,
                          ['--lobby-theme-button-accent' as string]: theme.accent,
                        }}
                      >
                        {theme.name}
                      </button>
                    );
                  })}
                </div>
                <div
                  className="lobby-theme-preview"
                  style={{
                    ['--lobby-theme-preview-bg' as string]: activeTableTheme.previewBackground,
                  }}
                >
                  <div className="lobby-theme-preview__swatch" />
                  <div className="lobby-theme-preview__copy">
                    <div className="lobby-theme-preview__name">{activeTableTheme.name}</div>
                    <div className="lobby-theme-preview__description">{activeTableTheme.description}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lobby-shell relative z-0">
        <div className="lobby-roster-grid">
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`lobby-seat-card${player.isYou ? ' lobby-seat-card--you' : ''}`}
              style={{
                ['--seat-color' as string]: player.color,
                borderColor: player.ready || player.isYou ? `${player.color}55` : 'rgba(255,255,255,0.08)',
                background: player.ready || player.isYou
                  ? `linear-gradient(135deg, ${player.color}14, rgba(255,255,255,0.03))`
                  : 'rgba(255,255,255,0.03)',
              }}
            >
              <div className="lobby-seat-card__seat">{index + 1}</div>
              <div className="lobby-seat-card__top">
                <div
                  className="lobby-seat-card__avatar"
                  style={{
                    background: player.ready || player.isYou
                      ? `radial-gradient(circle, ${player.color}30, rgba(255,255,255,0.04))`
                      : 'rgba(255,255,255,0.05)',
                    borderColor: player.ready || player.isYou ? player.color : 'rgba(255,255,255,0.14)',
                  }}
                >
                  {player.ready || player.isYou ? player.avatar : '?'}
                </div>
                <div className="lobby-seat-card__copy">
                  <div className="lobby-seat-card__name-row">
                    <div className="lobby-seat-card__name">{player.name}</div>
                    {player.isYou && <span className="lobby-seat-card__you-badge">YOU</span>}
                  </div>
                  <div className="lobby-seat-card__status">
                    <span className={`lobby-seat-card__status-dot${player.ready || player.isYou ? ' is-ready' : ''}`} />
                    <span>{player.ready || player.isYou ? 'READY' : 'JOINING'}</span>
                  </div>
                </div>
              </div>
              <div className="lobby-seat-card__bottom">
                <div className="lobby-seat-card__mini-stack">
                  {[...Array(4)].map((_, cardIndex) => (
                    <span
                      key={cardIndex}
                      className="lobby-seat-card__mini-card"
                      style={{
                        background: cardIndex < 2
                          ? `linear-gradient(135deg, ${player.color}85, ${player.color}55)`
                          : 'linear-gradient(135deg, #1a237e, #283593)',
                      }}
                    />
                  ))}
                </div>
                <span className="lobby-seat-card__meta">4 cards</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="lobby-help-card">
          <div className="lobby-help-card__header">
            <div>
              <div className="lobby-help-card__eyebrow">HOW TO PLAY</div>
              <div className="lobby-help-card__summary">
                Lowest score wins. 7 = peek self. 8 = spy opponent. Black King = -2. Joker = -1.
              </div>
            </div>
            <button
              type="button"
              className="lobby-help-card__toggle"
              onClick={() => setShowRulesDetails(value => !value)}
            >
              {showRulesDetails ? 'Hide' : 'Show more'}
            </button>
          </div>

          <div className="lobby-help-card__chips">
            <span className="lobby-help-chip">Lowest score wins</span>
            <span className="lobby-help-chip">7 = Peek self</span>
            <span className="lobby-help-chip">8 = Spy opponent</span>
            <span className="lobby-help-chip">Black King = -2</span>
            <span className="lobby-help-chip">Joker = -1</span>
          </div>

          {showRulesDetails && (
            <div className="lobby-help-card__details">
              <div className="lobby-help-detail">
                <span className="lobby-help-detail__label">Turn</span>
                <span className="lobby-help-detail__value">Draw from the pile or take discard, then swap or discard.</span>
              </div>
              <div className="lobby-help-detail">
                <span className="lobby-help-detail__label">Scoring</span>
                <span className="lobby-help-detail__value">Every remaining card counts individually. J = 11, Q = 12, K = 13, except K♠/K♣ = -2 and Joker = -1.</span>
              </div>
              <div className="lobby-help-detail">
                <span className="lobby-help-detail__label">Knock</span>
                <span className="lobby-help-detail__value">Knock when you are ready to end the round.</span>
              </div>
            </div>
          )}
        </div>

        {startError && (
          <div className="lobby-start-error">
            {startError}
          </div>
        )}

        <div className="lobby-start-panel">
          <div className="lobby-start-panel__hint">{startHint}</div>
          <motion.button
            whileTap={{ scale: isHost && allReady && !isStarting ? 0.97 : 1 }}
            className="arcade-btn arcade-btn-green py-4"
            style={{
              width: 'min(100%, 360px)',
              fontSize: 20,
              fontWeight: 900,
              opacity: isHost && allReady && !isStarting ? 1 : 0.58,
              cursor: isHost && allReady && !isStarting ? 'pointer' : 'not-allowed',
            }}
            onClick={handleStartGame}
          >
            {!isHost
              ? 'WAITING FOR HOST'
              : isStarting
              ? 'STARTING...'
              : allReady
              ? 'START GAME'
              : 'WAITING FOR PLAYERS'}
          </motion.button>
        </div>

        {gameMode !== 'solo' && (
          <div className="lobby-chat-card">
            <div className="lobby-chat-card__header">CHAT</div>
            <div className="lobby-chat-card__messages">
              <AnimatePresence>
                {chatMessages.map(msg => {
                  const sender = players.find(player => player.id === msg.playerId || player.name === msg.playerName);
                  const isYou = Boolean(
                    sender?.isYou ||
                    (myUserIdRef.current && msg.playerId === myUserIdRef.current) ||
                    (!myUserIdRef.current && msg.playerName === playerName)
                  );
                  const playerColor = sender?.color || INITIAL_PLAYERS.find(player => player.id === msg.playerId)?.color || '#1E88E5';
                  const senderName = msg.playerName || sender?.name || 'Player';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${isYou ? 'items-end' : 'items-start'}`}
                    >
                      <span className={`lobby-chat-card__name${isYou ? ' lobby-chat-card__name--self' : ''}`} style={{ color: playerColor }}>
                        {senderName}{isYou ? ' (you)' : ''}
                      </span>
                      <div
                        className={isYou ? 'chat-bubble-self' : 'chat-bubble-other'}
                        style={{
                          padding: '8px 12px',
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'white',
                          fontFamily: 'Nunito',
                          maxWidth: '85%',
                        }}
                      >
                        {msg.message}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>
            <div className="lobby-chat-card__composer">
              <input
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Say something..."
                className="lobby-chat-card__input"
              />
              <button
                onClick={handleSend}
                className="arcade-btn arcade-btn-blue"
                style={{ width: 42, height: 42, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
