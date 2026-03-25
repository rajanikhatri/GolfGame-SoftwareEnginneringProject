import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, Copy, Check, Wifi, Crown } from 'lucide-react';
import { useGame } from '../context/GameContext';

const AI_MESSAGES = [
  "Can't wait to destroy you all 😈",
  "Low score wins, I never forget! 🏌️",
  "Ready to GOLF! Let's go!",
  "Watch out for my jokers ⚡",
  "This is gonna be epic! 🔥",
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

export default function Lobby() {
  const navigate = useNavigate();
  const { gameMode, initGame, chatMessages, sendChat, addChatMessage } = useGame();
  const [players, setPlayers] = useState<LobbyPlayer[]>(INITIAL_PLAYERS);
  const [inputMsg, setInputMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const ROOM_CODE = 'GOLF-4821';

  // Simulate players joining and getting ready
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => {
      setPlayers(prev => prev.map(p => p.id === 'p2' ? { ...p, ready: false } : p));
      addChatMessage({ playerId: 'p2', playerName: 'ALEX', message: '✅ Joined the room!' });
    }, 800));

    timers.push(setTimeout(() => {
      setPlayers(prev => prev.map(p => p.id === 'p2' ? { ...p, ready: true } : p));
      addChatMessage({ playerId: 'p2', playerName: 'ALEX', message: AI_MESSAGES[0] });
    }, 2200));

    timers.push(setTimeout(() => {
      setPlayers(prev => prev.map(p => p.id === 'p3' ? { ...p, ready: false } : p));
      addChatMessage({ playerId: 'p3', playerName: 'JAMIE', message: '✅ Joined the room!' });
    }, 1500));

    timers.push(setTimeout(() => {
      setPlayers(prev => prev.map(p => p.id === 'p3' ? { ...p, ready: true } : p));
      addChatMessage({ playerId: 'p3', playerName: 'JAMIE', message: AI_MESSAGES[2] });
    }, 3000));

    timers.push(setTimeout(() => {
      setPlayers(prev => prev.map(p => p.id === 'p4' ? { ...p, ready: false } : p));
      addChatMessage({ playerId: 'p4', playerName: 'RILEY', message: '✅ Joined the room!' });
    }, 2500));

    timers.push(setTimeout(() => {
      setPlayers(prev => prev.map(p => p.id === 'p4' ? { ...p, ready: true } : p));
      addChatMessage({ playerId: 'p4', playerName: 'RILEY', message: AI_MESSAGES[3] });
    }, 3800));

    return () => timers.forEach(clearTimeout);
  }, [addChatMessage]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleCopy = () => {
    navigator.clipboard.writeText(ROOM_CODE).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    initGame();
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      navigate('/game');
      return;
    }
    const t = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  const handleSend = () => {
    if (!inputMsg.trim()) return;
    sendChat(inputMsg.trim());
    setInputMsg('');
  };

  const allReady = players.every(p => p.ready);

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden font-game"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #1565C0 0%, #0D47A1 30%, #0D2137 70%, #060D1B 100%)',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
      {/* Subtle bg pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
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
                fontSize: 140, fontWeight: 900,
                background: 'linear-gradient(180deg, #FFC107, #FF6F00)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontFamily: 'Nunito',
                filter: 'drop-shadow(0 8px 24px rgba(255,193,7,0.5))',
                lineHeight: 1,
              }}
            >{countdown}</motion.div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito' }}>
              ⛳ Get ready to GOLF!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 relative z-10">
        <button
          className="arcade-btn arcade-btn-red flex items-center gap-2 px-5 py-3"
          style={{ fontSize: 15, fontWeight: 800 }}
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={18} />
          BACK
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito', letterSpacing: '0.1em' }}>
            ROOM CODE
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="room-code-badge px-5 py-2">
              <span style={{ fontSize: 22, fontWeight: 900, color: 'white', fontFamily: 'Nunito', letterSpacing: '0.15em' }}>
                {ROOM_CODE}
              </span>
            </div>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? 'rgba(67,160,71,0.3)' : 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: 10, padding: '8px 12px',
                color: 'white', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {copied ? <Check size={18} color="#4CAF50" /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        <div style={{
          background: 'rgba(30,136,229,0.2)',
          border: '2px solid rgba(30,136,229,0.4)',
          borderRadius: 12, padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Wifi size={16} color="#42A5F5" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#42A5F5', fontFamily: 'Nunito' }}>
            {gameMode === 'solo' ? 'SOLO MODE' : 'ONLINE'}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-6 px-6 pb-6 relative z-10" style={{ minHeight: 'calc(100vh - 100px)' }}>

        {/* Left: Player slots */}
        <div className="flex-1 flex flex-col gap-5">
          <div style={{
            fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.4)',
            fontFamily: 'Nunito', letterSpacing: '0.2em', textTransform: 'uppercase',
          }}>
            PLAYERS ({players.filter(p => p.ready || p.isYou).length}/4)
          </div>

          <div className="grid grid-cols-2 gap-4">
            {players.map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="player-panel p-4"
                style={{
                  borderColor: player.ready ? `${player.color}60` : 'rgba(255,255,255,0.1)',
                  background: player.ready
                    ? `linear-gradient(135deg, ${player.color}15, rgba(255,255,255,0.05))`
                    : 'rgba(255,255,255,0.04)',
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div style={{
                    width: 60, height: 60,
                    borderRadius: '50%',
                    background: player.ready
                      ? `radial-gradient(circle, ${player.color}40, ${player.color}15)`
                      : 'rgba(255,255,255,0.05)',
                    border: player.ready ? `3px solid ${player.color}` : '3px solid rgba(255,255,255,0.1)',
                    boxShadow: player.ready ? `0 0 20px ${player.color}50` : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28,
                    transition: 'all 0.4s ease',
                    flexShrink: 0,
                  }}>
                    {player.ready || player.isYou ? player.avatar : '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Name */}
                    <div style={{
                      fontSize: 16, fontWeight: 900,
                      color: player.isYou ? '#FFC107' : player.ready ? 'white' : 'rgba(255,255,255,0.3)',
                      fontFamily: 'Nunito',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {player.name}
                      {player.isYou && <Crown size={14} color="#FFC107" />}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 mt-1">
                      {player.ready || player.isYou ? (
                        <>
                          <div className="pulse-glow-green" style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#4CAF50',
                          }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#4CAF50', fontFamily: 'Nunito' }}>
                            READY
                          </span>
                        </>
                      ) : (
                        <>
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            animation: 'thinking-dot 1.4s ease-in-out infinite',
                          }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontFamily: 'Nunito' }}>
                            JOINING...
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Slot number */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.3)',
                    fontFamily: 'Nunito', flexShrink: 0,
                  }}>{i + 1}</div>
                </div>

                {/* Decorative card stack */}
                {(player.ready || player.isYou) && (
                  <div className="mt-3 flex gap-1">
                    {[...Array(4)].map((_, ci) => (
                      <div
                        key={ci}
                        className="float-anim"
                        style={{
                          animationDelay: `${ci * 0.1}s`,
                          width: 18, height: 26,
                          borderRadius: 4,
                          background: ci < 2 ? `linear-gradient(135deg, ${player.color}80, ${player.color}40)` : 'linear-gradient(135deg, #1a237e, #283593)',
                          border: '1.5px solid rgba(255,255,255,0.3)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 7, color: 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {ci < 2 ? '?' : ''}
                      </div>
                    ))}
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontFamily: 'Nunito', marginLeft: 4, alignSelf: 'center' }}>
                      4 CARDS
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Game rules reminder */}
          <div style={{
            background: 'rgba(255,193,7,0.08)',
            border: '2px solid rgba(255,193,7,0.2)',
            borderRadius: 16, padding: '16px 20px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#FFC107', fontFamily: 'Nunito', letterSpacing: '0.1em', marginBottom: 8 }}>
              ⛳ HOW TO PLAY
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: 'Nunito', lineHeight: 1.8 }}>
              • Lowest score wins<br />
              • Draw or take from discard, then swap<br />
              • Matching column = <span style={{ color: '#4CAF50', fontWeight: 800 }}>ZERO points!</span><br />
              • King = <span style={{ color: '#FFC107', fontWeight: 800 }}>-2 pts</span> • Joker = <span style={{ color: '#AB47BC', fontWeight: 800 }}>-1 pt</span><br />
              • Discard a <span style={{ color: '#42A5F5', fontWeight: 800 }}>7</span> → peek one of your hidden cards<br />
              • Discard an <span style={{ color: '#AB47BC', fontWeight: 800 }}>8</span> → spy on an opponent's card
            </div>
          </div>

          {/* Start button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="arcade-btn arcade-btn-green py-5 w-full"
            style={{
              fontSize: 22, fontWeight: 900,
              opacity: allReady ? 1 : 0.5,
              cursor: allReady ? 'pointer' : 'not-allowed',
            }}
            onClick={allReady ? handleStartGame : undefined}
          >
            {allReady ? '⚡ START GAME ⚡' : '⏳ WAITING FOR PLAYERS...'}
          </motion.button>
        </div>

        {/* Right: Chat */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.4)',
            fontFamily: 'Nunito', letterSpacing: '0.2em',
          }}>
            💬 GAME CHAT
          </div>

          <div style={{
            flex: 1,
            background: 'rgba(0,0,0,0.25)',
            border: '2px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: '16px',
            display: 'flex', flexDirection: 'column',
            gap: 10,
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 320px)',
            minHeight: 300,
          }}>
            <AnimatePresence>
              {chatMessages.map(msg => {
                const isYou = msg.playerId === 'p1';
                const playerColor = INITIAL_PLAYERS.find(p => p.id === msg.playerId)?.color || '#1E88E5';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex flex-col ${isYou ? 'items-end' : 'items-start'}`}
                  >
                    {!isYou && (
                      <span style={{
                        fontSize: 11, fontWeight: 800,
                        color: playerColor,
                        fontFamily: 'Nunito',
                        marginBottom: 3,
                        paddingLeft: 4,
                      }}>{msg.playerName}</span>
                    )}
                    <div
                      className={isYou ? 'chat-bubble-self' : 'chat-bubble-other'}
                      style={{
                        padding: '8px 14px',
                        fontSize: 13, fontWeight: 600,
                        color: 'white', fontFamily: 'Nunito',
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

          {/* Chat input */}
          <div className="flex gap-2">
            <input
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Say something..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.08)',
                border: '2px solid rgba(255,255,255,0.15)',
                borderRadius: 50,
                padding: '10px 18px',
                color: 'white',
                fontSize: 14, fontFamily: 'Nunito', fontWeight: 600,
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              className="arcade-btn arcade-btn-blue"
              style={{ width: 46, height: 46, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}