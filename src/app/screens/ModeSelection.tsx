import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Zap, Trophy, Users, X, ArrowRight, LogIn } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { usePlayerAuth } from '../auth/AuthContext';

const AVATARS = ['🎮', '🦊', '🐼', '🦋', '🐉', '🦁', '🐯', '🦅'];

export default function ModeSelection() {
  const navigate = useNavigate();
  const { setGameMode, createRoom, joinRoom } = useGame();
  const { logout, profile } = usePlayerAuth();
  const [hoveredCard, setHoveredCard] = useState<'multi' | 'solo' | null>(null);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [modalTab, setModalTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🎮');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-detect room code in URL → open join modal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setJoinCode(code.toUpperCase());
      setModalTab('join');
      setShowMultiModal(true);
    }
  }, []);

  const handleSolo = () => { setGameMode('solo'); navigate('/lobby'); };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) { setError('Please enter your name'); return; }
    setLoading(true); setError('');
    try {
      const { code } = await createRoom(playerName.trim(), selectedAvatar);
      navigate(`/lobby?code=${code}`);
    } catch (e: any) { setError(e.message || 'Failed to create room'); }
    setLoading(false);
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) { setError('Please enter your name'); return; }
    if (!joinCode.trim()) { setError('Please enter a room code'); return; }
    setLoading(true); setError('');
    try {
      await joinRoom(joinCode.trim().toUpperCase(), playerName.trim(), selectedAvatar);
      navigate(`/lobby?code=${joinCode.trim().toUpperCase()}`);
    } catch (e: any) { setError(e.message || 'Room not found or full'); }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center font-game"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #1565C0 0%, #0D47A1 30%, #0D2137 70%, #060D1B 100%)',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
      <button
        type="button"
        onClick={() => void logout()}
        style={{
          position: 'fixed',
          top: 16,
          left: 20,
          zIndex: 40,
          background: 'linear-gradient(180deg, #EF5350 0%, #D32F2F 100%)',
          border: 'none',
          borderRadius: 999,
          padding: '10px 18px',
          color: 'white',
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: '0.04em',
          boxShadow: '0 8px 20px rgba(211,47,47,0.35)',
          cursor: 'pointer',
          fontFamily: 'Nunito, sans-serif',
        }}
      >
        LOG OUT
      </button>

      {profile && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 20,
            zIndex: 40,
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 999,
            padding: '10px 14px',
            color: 'white',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'Nunito, sans-serif',
            maxWidth: 'min(48vw, 420px)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={`${profile.displayName} • ${profile.email ?? 'signed in'}`}
        >
          {profile.displayName} • {profile.email ?? 'signed in'}
        </div>
      )}

      {/* Floating suit symbols */}
      {[
        { top: '5%', left: '3%', symbol: '♠', color: 'white' },
        { top: '8%', right: '5%', symbol: '♥', color: '#E53935' },
        { bottom: '12%', left: '6%', symbol: '♣', color: '#43A047' },
        { bottom: '8%', right: '4%', symbol: '♦', color: '#FBC02D' },
      ].map((s, i) => (
        <div key={i} className="absolute pointer-events-none float-anim"
          style={{ top: (s as any).top, bottom: (s as any).bottom, left: (s as any).left, right: (s as any).right, fontSize: 80, opacity: 0.12, color: s.color, animationDelay: `${i * 0.5}s` }}>
          {s.symbol}
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-10 px-6 w-full max-w-5xl">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, type: 'spring', bounce: 0.4 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="flex items-center gap-3 mb-1">
            <div style={{ background: 'linear-gradient(135deg, #FFC107, #FF6F00)', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(255,193,7,0.5)', fontSize: 22 }}>⛳</div>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.3em', fontFamily: 'Nunito' }}>THE CARD GAME</span>
          </div>
          <div className="relative">
            <div style={{ position: 'absolute', top: 6, left: 6, fontSize: 100, fontWeight: 900, color: '#0D2137', fontFamily: 'Nunito', userSelect: 'none' }}>GOLF</div>
            <div style={{ position: 'absolute', top: 3, left: 3, fontSize: 100, fontWeight: 900, color: '#0D47A1', fontFamily: 'Nunito', userSelect: 'none' }}>GOLF</div>
            <div style={{ position: 'relative', fontSize: 100, fontWeight: 900, background: 'linear-gradient(180deg, #FFFFFF 0%, #82B1FF 40%, #FFC107 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: 'Nunito', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))', userSelect: 'none' }}>GOLF</div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#FFC107" color="#FFC107" style={{ opacity: 0.8 }} />)}
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginLeft: 4, marginRight: 4, fontFamily: 'Nunito' }}>MULTIPLAYER EDITION</span>
            {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#FFC107" color="#FFC107" style={{ opacity: 0.8 }} />)}
          </div>
        </motion.div>

        {/* Mode Cards */}
        <div className="flex gap-6 w-full justify-center flex-wrap">
          {/* Multiplayer */}
          <motion.div
            initial={{ opacity: 0, x: -60, rotate: -5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ delay: 0.3, duration: 0.6, type: 'spring', bounce: 0.3 }}
            className="flex-1 min-w-[280px] max-w-[340px]"
            onMouseEnter={() => setHoveredCard('multi')}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ cursor: 'pointer' }}
            onClick={() => setShowMultiModal(true)}
          >
            <div style={{ background: 'linear-gradient(145deg, #7B1FA2 0%, #4527A0 50%, #1A237E 100%)', borderRadius: 24, border: hoveredCard === 'multi' ? '3px solid rgba(171,71,188,0.9)' : '3px solid rgba(171,71,188,0.4)', boxShadow: hoveredCard === 'multi' ? '0 20px 60px rgba(123,31,162,0.6), 0 0 30px rgba(171,71,188,0.4)' : '0 10px 40px rgba(0,0,0,0.4)', padding: '36px 32px', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, fontSize: 120, opacity: 0.06, transform: 'rotate(15deg)' }}>♠</div>
              <div className="flex flex-col items-center gap-5">
                <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #CE93D8, #7B1FA2)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(123,31,162,0.5)' }}>
                  <Users size={36} color="white" />
                </div>
                <div className="text-center">
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'white', fontFamily: 'Nunito', marginBottom: 6 }}>MULTIPLAYER</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: 'Nunito', lineHeight: 1.5 }}>Challenge real players online.<br />Share a room code to play together.</div>
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  {['Real Players', 'Live Sync', 'Ranked'].map(tag => (
                    <span key={tag} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 50, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontFamily: 'Nunito' }}>{tag}</span>
                  ))}
                </div>
                <button className="arcade-btn arcade-btn-purple w-full py-4" style={{ fontSize: 18, fontWeight: 900 }} onClick={e => { e.stopPropagation(); setShowMultiModal(true); }}>
                  🎮 PLAY ONLINE
                </button>
              </div>
            </div>
          </motion.div>

          {/* Solo */}
          <motion.div
            initial={{ opacity: 0, x: 60, rotate: 5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ delay: 0.4, duration: 0.6, type: 'spring', bounce: 0.3 }}
            className="flex-1 min-w-[280px] max-w-[340px]"
            onMouseEnter={() => setHoveredCard('solo')}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ cursor: 'pointer' }}
            onClick={handleSolo}
          >
            <div style={{ background: 'linear-gradient(145deg, #B71C1C 0%, #E65100 50%, #F57F17 100%)', borderRadius: 24, border: hoveredCard === 'solo' ? '3px solid rgba(255,152,0,0.9)' : '3px solid rgba(255,152,0,0.4)', boxShadow: hoveredCard === 'solo' ? '0 20px 60px rgba(230,81,0,0.6), 0 0 30px rgba(255,152,0,0.4)' : '0 10px 40px rgba(0,0,0,0.4)', padding: '36px 32px', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, fontSize: 120, opacity: 0.06 }}>🤖</div>
              <div className="flex flex-col items-center gap-5">
                <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #FFCC02, #E65100)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>🤖</div>
                <div className="text-center">
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'white', fontFamily: 'Nunito', marginBottom: 6 }}>SOLO VS AI</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: 'Nunito', lineHeight: 1.5 }}>Train your skills against<br />3 challenging AI opponents.</div>
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  {['Practice', 'AI Rivals', 'Offline'].map(tag => (
                    <span key={tag} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 50, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontFamily: 'Nunito' }}>{tag}</span>
                  ))}
                </div>
                <button className="arcade-btn arcade-btn-gold w-full py-4" style={{ fontSize: 18, fontWeight: 900 }} onClick={e => { e.stopPropagation(); handleSolo(); }}>
                  🤖 PLAY NOW
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex items-center gap-6">
          {[{ icon: <Trophy size={14} />, text: 'Leaderboards' }, { icon: <Zap size={14} />, text: 'Fast Rounds' }, { icon: <Star size={14} />, text: 'Rank Up' }].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Nunito', fontWeight: 600 }}>{icon}<span>{text}</span></div>
          ))}
        </motion.div>
      </div>

      {/* ── Multiplayer Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showMultiModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMultiModal(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50 }}
            />

            {/*
              Centering wrapper: pure CSS, no motion transforms.
              The motion.div inside handles only opacity/scale animation.
            */}
            <div style={{
              position: 'fixed', inset: 0, zIndex: 51,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ type: 'spring', duration: 0.35, bounce: 0.25 }}
                style={{
                  width: '90%', maxWidth: 460,
                  background: 'linear-gradient(145deg, #0D2137 0%, #0a1d35 100%)',
                  border: '2px solid rgba(171,71,188,0.55)',
                  borderRadius: 24,
                  padding: 32,
                  boxShadow: '0 24px 80px rgba(0,0,0,0.65), 0 0 40px rgba(123,31,162,0.25)',
                  pointerEvents: 'all',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'white', fontFamily: 'Nunito' }}>
                    🎮 MULTIPLAYER
                  </div>
                  <button
                    onClick={() => setShowMultiModal(false)}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex mb-6" style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 12, padding: 4 }}>
                  {(['create', 'join'] as const).map(tab => (
                    <button key={tab} onClick={() => { setModalTab(tab); setError(''); }}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                        cursor: 'pointer', fontFamily: 'Nunito', fontWeight: 800, fontSize: 14,
                        background: modalTab === tab ? 'linear-gradient(135deg, #7B1FA2, #4527A0)' : 'transparent',
                        color: modalTab === tab ? 'white' : 'rgba(255,255,255,0.4)',
                        transition: 'all 0.2s',
                      }}>
                      {tab === 'create' ? '✨ CREATE ROOM' : '🔑 JOIN ROOM'}
                    </button>
                  ))}
                </div>

                {/* Avatar picker */}
                <div className="mb-5">
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)', fontFamily: 'Nunito', letterSpacing: '0.15em', marginBottom: 8 }}>CHOOSE YOUR AVATAR</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {AVATARS.map(av => (
                      <button key={av} onClick={() => setSelectedAvatar(av)}
                        style={{
                          width: 46, height: 46, borderRadius: 10, fontSize: 22, cursor: 'pointer',
                          border: selectedAvatar === av ? '2px solid #FFC107' : '2px solid rgba(255,255,255,0.12)',
                          background: selectedAvatar === av ? 'rgba(255,193,7,0.18)' : 'rgba(255,255,255,0.06)',
                          boxShadow: selectedAvatar === av ? '0 0 14px rgba(255,193,7,0.45)' : 'none',
                          transition: 'all 0.15s',
                        }}>
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name input */}
                <div className="mb-4">
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)', fontFamily: 'Nunito', letterSpacing: '0.15em', marginBottom: 8 }}>YOUR NAME</div>
                  <input
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (modalTab === 'create' ? handleCreateRoom() : handleJoinRoom())}
                    placeholder="Enter your name..."
                    maxLength={16}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 16px', color: 'white', fontSize: 16, fontFamily: 'Nunito', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Room code (join tab) */}
                {modalTab === 'join' && (
                  <div className="mb-4">
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)', fontFamily: 'Nunito', letterSpacing: '0.15em', marginBottom: 8 }}>ROOM CODE</div>
                    <input
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
                      placeholder="GOLF-0000"
                      maxLength={9}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,193,7,0.4)', borderRadius: 12, padding: '12px 16px', color: '#FFC107', fontSize: 20, fontFamily: 'Nunito', fontWeight: 900, outline: 'none', letterSpacing: '0.12em', boxSizing: 'border-box', textAlign: 'center' }}
                    />
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.4)', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#EF9A9A', fontFamily: 'Nunito', marginBottom: 16 }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* CTA */}
                <button
                  onClick={modalTab === 'create' ? handleCreateRoom : handleJoinRoom}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Nunito', fontWeight: 900, fontSize: 18,
                    background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #7B1FA2, #AB47BC)',
                    color: 'white', boxShadow: loading ? 'none' : '0 4px 20px rgba(171,71,188,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s',
                  }}
                >
                  {loading
                    ? <span style={{ opacity: 0.6 }}>⏳ Please wait...</span>
                    : modalTab === 'create'
                      ? <><ArrowRight size={20} /> CREATE &amp; ENTER LOBBY</>
                      : <><LogIn size={20} /> JOIN ROOM</>
                  }
                </button>

                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.28)', fontFamily: 'Nunito' }}>
                  {modalTab === 'create' ? "You'll get a shareable link to send to friends" : 'Ask the host for the room code or link'}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
