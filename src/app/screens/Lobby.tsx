import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, Copy, Check, Wifi, Crown, Link } from 'lucide-react';
import { useGame } from '../context/GameContext';

const AI_MESSAGES = [
  "Can't wait to destroy you all 😈",
  "Low score wins, I never forget! 🏌️",
  "Ready to GOLF! Let's go!",
  "Watch out for my jokers ⚡",
  "This is gonna be epic! 🔥",
];

export default function Lobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    gameMode, initGame, chatMessages, sendChat, addChatMessage,
    roomCode, myPlayerId, isHost, roomPlayers, roomStatus,
    setPlayerReady, startMultiplayerGame, leaveRoom,
  } = useGame();

  const [inputMsg, setInputMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [soloPlayers, setSoloPlayers] = useState([
    { id: 'p1', name: 'YOU', avatar: '🎮', color: '#1E88E5', ready: true, isYou: true },
    { id: 'p2', name: 'ALEX', avatar: '🦊', color: '#E53935', ready: false },
    { id: 'p3', name: 'JAMIE', avatar: '🐼', color: '#43A047', ready: false },
    { id: 'p4', name: 'RILEY', avatar: '🦋', color: '#AB47BC', ready: false },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isMultiplayer = gameMode === 'multiplayer';
  const shareUrl = roomCode ? `${window.location.origin}${window.location.pathname}?code=${roomCode}` : '';

  // Solo mode: AI bots auto-join
  useEffect(() => {
    if (isMultiplayer) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => { setSoloPlayers(prev => prev.map(p => p.id === 'p2' ? { ...p, ready: true } : p)); addChatMessage({ playerId: 'p2', playerName: 'ALEX', message: AI_MESSAGES[0] }); }, 1800));
    timers.push(setTimeout(() => { setSoloPlayers(prev => prev.map(p => p.id === 'p3' ? { ...p, ready: true } : p)); addChatMessage({ playerId: 'p3', playerName: 'JAMIE', message: AI_MESSAGES[2] }); }, 3000));
    timers.push(setTimeout(() => { setSoloPlayers(prev => prev.map(p => p.id === 'p4' ? { ...p, ready: true } : p)); addChatMessage({ playerId: 'p4', playerName: 'RILEY', message: AI_MESSAGES[3] }); }, 4000));
    return () => timers.forEach(clearTimeout);
  }, [isMultiplayer, addChatMessage]);

  // Watch for game starting (multiplayer)
  useEffect(() => {
    if (isMultiplayer && roomStatus === 'playing') {
      setCountdown(3);
    }
  }, [isMultiplayer, roomStatus]);

  // Countdown to game
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { navigate('/game'); return; }
    const t = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode || '').catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSoloStart = () => { initGame(); setCountdown(3); };

  const handleMultiStart = async () => {
    await startMultiplayerGame();
    // Navigation will happen via the roomStatus === 'playing' effect above
  };

  const handleSend = () => {
    if (!inputMsg.trim()) return;
    sendChat(inputMsg.trim()); setInputMsg('');
  };

  const handleBack = async () => {
    if (isMultiplayer) await leaveRoom();
    navigate('/');
  };

  // ── Multiplayer: build display slots (filled + empty) ──────────────────────
  const multiSlots = Array.from({ length: 4 }, (_, i) => {
    const rp = roomPlayers.find(p => p.slotIndex === i);
    return rp ? { ...rp, isYou: rp.id === myPlayerId } : null;
  });

  const allMultiReady = isMultiplayer && roomPlayers.length >= 2 && roomPlayers.every(p => p.ready);
  const allSoloReady = !isMultiplayer && soloPlayers.every(p => p.ready);
  const myReadyStatus = isMultiplayer ? (roomPlayers.find(p => p.id === myPlayerId)?.ready ?? false) : true;

  return (
    <div className="min-h-screen w-full relative overflow-hidden font-game"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #1565C0 0%, #0D47A1 30%, #0D2137 70%, #060D1B 100%)', fontFamily: 'Nunito, sans-serif' }}>

      {/* Bg dots */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && countdown > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.7)', fontFamily: 'Nunito' }}>GAME STARTING IN</div>
            <motion.div key={countdown} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ fontSize: 140, fontWeight: 900, background: 'linear-gradient(180deg, #FFC107, #FF6F00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: 'Nunito', filter: 'drop-shadow(0 8px 24px rgba(255,193,7,0.5))', lineHeight: 1 }}>
              {countdown}
            </motion.div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito' }}>⛳ Get ready to GOLF!</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 relative z-10">
        <button className="arcade-btn arcade-btn-red flex items-center gap-2 px-5 py-3" style={{ fontSize: 15, fontWeight: 800 }} onClick={handleBack}>
          <ArrowLeft size={18} /> BACK
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito', letterSpacing: '0.1em' }}>
            {isMultiplayer ? 'ROOM CODE' : 'SOLO MODE'}
          </div>
          {isMultiplayer ? (
            <div className="flex items-center gap-3 mt-1">
              <div className="room-code-badge px-5 py-2">
                <span style={{ fontSize: 22, fontWeight: 900, color: 'white', fontFamily: 'Nunito', letterSpacing: '0.15em' }}>{roomCode}</span>
              </div>
              <button onClick={handleCopy} style={{ background: copied ? 'rgba(67,160,71,0.3)' : 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 12px', color: 'white', cursor: 'pointer', transition: 'all 0.2s' }}>
                {copied ? <Check size={18} color="#4CAF50" /> : <Copy size={18} />}
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 22, fontWeight: 900, color: '#FFC107', fontFamily: 'Nunito', marginTop: 4 }}>⛳ GOLF</div>
          )}
        </div>

        <div style={{ background: 'rgba(30,136,229,0.2)', border: '2px solid rgba(30,136,229,0.4)', borderRadius: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wifi size={16} color="#42A5F5" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#42A5F5', fontFamily: 'Nunito' }}>{isMultiplayer ? 'ONLINE' : 'SOLO MODE'}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-6 px-6 pb-6 relative z-10" style={{ minHeight: 'calc(100vh - 100px)' }}>
        {/* Left: Players + Controls */}
        <div className="flex-1 flex flex-col gap-5">
          <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.4)', fontFamily: 'Nunito', letterSpacing: '0.2em' }}>
            PLAYERS ({isMultiplayer ? roomPlayers.length : soloPlayers.filter(p => p.ready || p.isYou).length}/4)
          </div>

          {/* Share link banner (multiplayer only) */}
          {isMultiplayer && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(171,71,188,0.12)', border: '2px solid rgba(171,71,188,0.35)', borderRadius: 16, padding: '12px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#CE93D8', fontFamily: 'Nunito', letterSpacing: '0.1em', marginBottom: 6 }}>🔗 INVITE FRIENDS — SHARE THIS LINK</div>
              <div className="flex items-center gap-3">
                <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontFamily: 'Nunito', wordBreak: 'break-all', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {shareUrl}
                </div>
                <button onClick={handleCopyLink}
                  style={{ background: copiedLink ? 'rgba(67,160,71,0.3)' : 'rgba(171,71,188,0.3)', border: `2px solid ${copiedLink ? 'rgba(67,160,71,0.5)' : 'rgba(171,71,188,0.5)'}`, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'white', fontFamily: 'Nunito', fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                  {copiedLink ? <Check size={16} color="#4CAF50" /> : <Link size={16} />}
                  {copiedLink ? 'COPIED!' : 'COPY'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Player grid */}
          <div className="grid grid-cols-2 gap-4">
            {(isMultiplayer ? multiSlots : soloPlayers).map((player, i) => {
              if (!player) {
                // Empty slot (multiplayer)
                return (
                  <motion.div key={`empty-${i}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="player-panel p-4"
                    style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', opacity: 0.5 }}>
                    <div className="flex items-center gap-4">
                      <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '3px dashed rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'rgba(255,255,255,0.2)' }}>?</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.2)', fontFamily: 'Nunito' }}>OPEN SLOT</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.15)', fontFamily: 'Nunito', marginTop: 2 }}>Waiting for player...</div>
                      </div>
                      <div style={{ marginLeft: 'auto', width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.2)', fontFamily: 'Nunito' }}>{i + 1}</div>
                    </div>
                  </motion.div>
                );
              }

              const isYou = isMultiplayer ? (player as any).isYou : (player as any).isYou;
              const ready = isMultiplayer ? (player as any).ready : (player as any).ready;
              const color = (player as any).color;
              const avatar = (player as any).avatar;
              const name = (player as any).name;

              return (
                <motion.div key={(player as any).id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="player-panel p-4"
                  style={{ borderColor: ready ? `${color}60` : 'rgba(255,255,255,0.1)', background: ready ? `linear-gradient(135deg, ${color}15, rgba(255,255,255,0.05))` : 'rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-4">
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: ready ? `radial-gradient(circle, ${color}40, ${color}15)` : 'rgba(255,255,255,0.05)', border: `3px solid ${ready ? color : 'rgba(255,255,255,0.1)'}`, boxShadow: ready ? `0 0 20px ${color}50` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, transition: 'all 0.4s ease', flexShrink: 0 }}>
                      {avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 16, fontWeight: 900, color: isYou ? '#FFC107' : ready ? 'white' : 'rgba(255,255,255,0.3)', fontFamily: 'Nunito', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {name}
                        {isYou && <Crown size={14} color="#FFC107" />}
                        {isMultiplayer && isHost && isYou && <span style={{ fontSize: 10, fontWeight: 800, color: '#FFC107', background: 'rgba(255,193,7,0.15)', borderRadius: 50, padding: '1px 6px', border: '1px solid rgba(255,193,7,0.3)' }}>HOST</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {ready ? (
                          <><div className="pulse-glow-green" style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50' }} /><span style={{ fontSize: 12, fontWeight: 700, color: '#4CAF50', fontFamily: 'Nunito' }}>READY</span></>
                        ) : (
                          <><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', animation: 'thinking-dot 1.4s ease-in-out infinite' }} /><span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontFamily: 'Nunito' }}>{isMultiplayer ? 'NOT READY' : 'JOINING...'}</span></>
                        )}
                      </div>
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.3)', fontFamily: 'Nunito', flexShrink: 0 }}>{i + 1}</div>
                  </div>

                  {/* Mini card deck */}
                  {ready && (
                    <div className="mt-3 flex gap-1 items-center">
                      {[...Array(4)].map((_, ci) => (
                        <div key={ci} className="float-anim" style={{ animationDelay: `${ci * 0.1}s`, width: 18, height: 26, borderRadius: 4, background: ci < 2 ? `linear-gradient(135deg, ${color}80, ${color}40)` : 'linear-gradient(135deg, #1a237e, #283593)', border: '1.5px solid rgba(255,255,255,0.3)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>
                          {ci < 2 ? '?' : ''}
                        </div>
                      ))}
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontFamily: 'Nunito', marginLeft: 4 }}>4 CARDS</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Rules */}
          <div style={{ background: 'rgba(255,193,7,0.08)', border: '2px solid rgba(255,193,7,0.2)', borderRadius: 16, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#FFC107', fontFamily: 'Nunito', letterSpacing: '0.1em', marginBottom: 8 }}>⛳ HOW TO PLAY</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: 'Nunito', lineHeight: 1.8 }}>
              • Lowest score wins<br />
              • Draw or take from discard, then swap<br />
              • Matching column = <span style={{ color: '#4CAF50', fontWeight: 800 }}>ZERO points!</span><br />
              • King = <span style={{ color: '#FFC107', fontWeight: 800 }}>-2 pts</span> • Joker = <span style={{ color: '#AB47BC', fontWeight: 800 }}>-1 pt</span><br />
              • Discard a <span style={{ color: '#42A5F5', fontWeight: 800 }}>7</span> → peek your own card • <span style={{ color: '#AB47BC', fontWeight: 800 }}>8</span> → spy opponent
            </div>
          </div>

          {/* Ready toggle (multiplayer non-host) */}
          {isMultiplayer && !isHost && (
            <motion.button whileTap={{ scale: 0.96 }}
              className={`arcade-btn ${myReadyStatus ? 'arcade-btn-red' : 'arcade-btn-green'} py-4 w-full`}
              style={{ fontSize: 18, fontWeight: 900 }}
              onClick={setPlayerReady}>
              {myReadyStatus ? '✋ UNREADY' : '✅ READY UP'}
            </motion.button>
          )}

          {/* Start button */}
          {(!isMultiplayer || isHost) && (
            <motion.button whileTap={{ scale: 0.96 }}
              className="arcade-btn arcade-btn-green py-5 w-full"
              style={{ fontSize: 22, fontWeight: 900, opacity: (isMultiplayer ? allMultiReady : allSoloReady) ? 1 : 0.45, cursor: (isMultiplayer ? allMultiReady : allSoloReady) ? 'pointer' : 'not-allowed' }}
              onClick={(isMultiplayer ? allMultiReady : allSoloReady) ? (isMultiplayer ? handleMultiStart : handleSoloStart) : undefined}>
              {isMultiplayer
                ? (allMultiReady ? '⚡ START GAME ⚡' : roomPlayers.length < 2 ? '⏳ NEED AT LEAST 2 PLAYERS' : '⏳ WAITING FOR ALL TO READY UP')
                : (allSoloReady ? '⚡ START GAME ⚡' : '⏳ WAITING FOR PLAYERS...')}
            </motion.button>
          )}

          {/* Non-host waiting message */}
          {isMultiplayer && !isHost && (
            <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontFamily: 'Nunito' }}>
              ⏳ Waiting for host to start the game...
            </div>
          )}
        </div>

        {/* Right: Chat */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.4)', fontFamily: 'Nunito', letterSpacing: '0.2em' }}>💬 GAME CHAT</div>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.25)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 'calc(100vh - 320px)', minHeight: 300 }}>
            <AnimatePresence>
              {chatMessages.map(msg => {
                const isMe = isMultiplayer ? msg.playerId === myPlayerId : msg.playerId === 'p1';
                const COLORS: Record<string, string> = { p1: '#1E88E5', p2: '#E53935', p3: '#43A047', p4: '#AB47BC' };
                const playerColor = COLORS[msg.playerId] || '#1E88E5';
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && <span style={{ fontSize: 11, fontWeight: 800, color: playerColor, fontFamily: 'Nunito', marginBottom: 3, paddingLeft: 4 }}>{msg.playerName}</span>}
                    <div className={isMe ? 'chat-bubble-self' : 'chat-bubble-other'} style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'white', fontFamily: 'Nunito', maxWidth: '85%' }}>
                      {msg.message}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <input value={inputMsg} onChange={e => setInputMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Say something..."
              style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.15)', borderRadius: 50, padding: '10px 18px', color: 'white', fontSize: 14, fontFamily: 'Nunito', fontWeight: 600, outline: 'none' }} />
            <button onClick={handleSend} className="arcade-btn arcade-btn-blue" style={{ width: 46, height: 46, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
