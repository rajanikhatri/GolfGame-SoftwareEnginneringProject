import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Zap, Trophy, Users, Copy, Check, LogOut, User } from 'lucide-react';
import { useGame } from '../../backend/GameContext';
import { usePlayerAuth } from '../../auth/AuthContext';
import {
  createRoomWithRetries,
  joinRoomByCode,
  normalizeRoomCode,
} from '../../database/firebaseRooms';

// --- Types ---
type ModalStep = 'nickname' | 'room-list' | 'create-room' | 'waiting-room' | null;

// --- Floating background card ---
const FloatingShape = ({ style, children }: { style: React.CSSProperties; children: React.ReactNode }) => (
  <div className="absolute pointer-events-none select-none" style={style}>
    {children}
  </div>
);

// --- Modal wrapper ---
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1a1a1a',
          border: '2px solid #333',
          borderRadius: 12,
          padding: '32px',
          minWidth: 360,
          maxWidth: 520,
          width: '90vw',
          position: 'relative',
          color: 'white',
          fontFamily: 'Nunito, sans-serif',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: '#c0392b', border: 'none', borderRadius: 6,
            color: 'white', fontWeight: 900, fontSize: 14,
            width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>
        {children}
      </motion.div>
    </div>
  );
}

// --- Dark input style ---
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 6,
  border: '1px solid #555',
  background: 'white',
  color: '#000',
  fontSize: 16,
  fontFamily: 'Nunito, sans-serif',
  boxSizing: 'border-box',
};

// --- Dark button style ---
function DarkBtn({ onClick, children, style }: { onClick: () => void; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#111',
        border: '2px solid #555',
        borderRadius: 8,
        color: 'white',
        fontWeight: 800,
        fontSize: 16,
        padding: '10px 28px',
        cursor: 'pointer',
        fontFamily: 'Nunito, sans-serif',
        ...style,
      }}
    >{children}</button>
  );
}

// =====================================================================
export default function ModeSelection() {
  const navigate = useNavigate();
  const { setGameMode, setPlayerName, setRoomCode } = useGame();
  const { user, profile, logout } = usePlayerAuth();

  // Modal state
  const [step, setStep] = useState<ModalStep>(null);
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');

  // Create room state
  const [roomNameInput, setRoomNameInput] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [hoveredCard, setHoveredCard] = useState<'multi' | 'solo' | null>(null);
  const accountBarRef = useRef<HTMLDivElement | null>(null);
  const accountEmail = user?.email ?? profile?.email ?? 'No email available';

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountBarRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [profileMenuOpen]);

  function closeModal() {
    setStep(null);
    setNickname('');
    setJoinRoomCode('');
    setRoomNameInput('');
    setRoomPassword('');
    setError('');
  }

  function handleSoloPlay() {
    flushSync(() => {
      setGameMode('solo');
    });
    navigate('/lobby');
  }

  // Step 1: confirm nickname
  function handleNicknameOk() {
    if (!nickname.trim()) return;
    setRoomNameInput(`${nickname.trim()}'s room`);
    setStep('room-list');
  }

  async function handleJoinByCode() {
    const normalizedCode = normalizeRoomCode(joinRoomCode);
    if (!normalizedCode) {
      setError('Enter a valid room code to join.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const name = nickname.trim();
      await joinRoomByCode(normalizedCode, {
        name,
        avatar: '🎮',
        color: '#1E88E5',
        glowColor: 'rgba(30,136,229,0.7)',
      });
      flushSync(() => {
        setPlayerName(name);
        setRoomCode(normalizedCode);
        setGameMode('multiplayer');
      });
      navigate('/lobby');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join room.');
    } finally {
      setLoading(false);
    }
  }

  // Step 3: create room in Firebase
  async function handleCreateRoom() {
    if (!roomNameInput.trim()) return;
    setLoading(true);
    setError('');
    try {
      const name = nickname.trim();
      const { code } = await createRoomWithRetries(
        { name, avatar: '🎮', color: '#1E88E5', glowColor: 'rgba(30,136,229,0.7)' },
        { roomName: roomNameInput.trim(), maxPlayers, password: roomPassword },
      );
      flushSync(() => {
        setCreatedRoomCode(code);
        setPlayerName(name);
        setRoomCode(code);
        setGameMode('multiplayer');
        setStep('waiting-room');
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  }

  // Step 4: navigate to lobby
  function handleStartGame() {
    navigate('/lobby');
  }

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center font-game"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #1565C0 0%, #0D47A1 30%, #0D2137 70%, #060D1B 100%)',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
      <div
        ref={accountBarRef}
        className="mode-selection-account-bar"
        style={{
          position: 'absolute',
          top: 12,
          right: 14,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          className="mode-selection-account-profile-wrap"
          style={{
            position: 'relative',
          }}
        >
          <button
            type="button"
            className="mode-selection-account-profile"
            aria-label="Show account email"
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen((open) => !open)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 42,
              height: 42,
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            <User size={18} />
          </button>

          <AnimatePresence>
            {profileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.16 }}
                className="mode-selection-account-popover"
                style={{
                  position: 'absolute',
                  top: 50,
                  right: 0,
                  minWidth: 220,
                  maxWidth: 'min(78vw, 320px)',
                  background: 'rgba(6,13,27,0.94)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 16,
                  padding: '12px 14px',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div style={{
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  color: 'rgba(255,255,255,0.45)',
                  fontFamily: 'Nunito, sans-serif',
                  marginBottom: 6,
                }}>
                  SIGNED IN AS
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 800,
                  lineHeight: 1.5,
                  color: 'white',
                  fontFamily: 'Nunito, sans-serif',
                  wordBreak: 'break-word',
                }}>
                  {accountEmail}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          className="mode-selection-account-logout"
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'rgba(229,57,53,0.8)',
            border: '1px solid rgba(229,57,53,0.5)',
            borderRadius: 999,
            padding: '6px 12px',
            color: 'white',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif',
          }}
        >
          <LogOut size={12} /> LOGOUT
        </button>
      </div>

      {/* Background floating suits */}
      <FloatingShape style={{ top: '5%', left: '3%', opacity: 0.15 }}>
        <div className="float-slow-anim text-8xl">♠</div>
      </FloatingShape>
      <FloatingShape style={{ top: '8%', right: '5%', opacity: 0.15 }}>
        <div className="float-anim text-7xl" style={{ color: '#E53935' }}>♥</div>
      </FloatingShape>
      <FloatingShape style={{ bottom: '12%', left: '6%', opacity: 0.12 }}>
        <div className="float-reverse-anim text-8xl" style={{ color: '#43A047' }}>♣</div>
      </FloatingShape>
      <FloatingShape style={{ bottom: '8%', right: '4%', opacity: 0.14 }}>
        <div className="float-slow-anim text-7xl" style={{ color: '#FBC02D' }}>♦</div>
      </FloatingShape>

      {/* Mini floating cards */}
      {[
        { top: '15%', left: '12%', rot: '-15deg', color: '#E53935', rank: '7', suit: '♥' },
        { top: '20%', right: '14%', rot: '12deg', color: '#1a1a4e', rank: 'K', suit: '♠' },
        { bottom: '20%', left: '10%', rot: '20deg', color: '#43A047', rank: 'A', suit: '♣' },
        { bottom: '25%', right: '11%', rot: '-10deg', color: '#FBC02D', rank: '9', suit: '♦' },
      ].map((c, i) => (
        <div
          key={i}
          className="absolute pointer-events-none float-anim"
          style={{ top: c.top, bottom: c.bottom, left: c.left, right: c.right, transform: `rotate(${c.rot})`, animationDelay: `${i * 0.7}s`, opacity: 0.2 }}
        >
          <div style={{ width: 50, height: 70, background: 'white', borderRadius: 8, border: '2px solid white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: c.color, fontFamily: 'Nunito' }}>{c.rank}</span>
            <span style={{ fontSize: 16, color: c.color }}>{c.suit}</span>
          </div>
        </div>
      ))}

      {/* Content */}
      <div className="mode-selection-content relative z-10 flex flex-col items-center gap-10 px-6 w-full max-w-5xl">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, type: 'spring', bounce: 0.4 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="flex items-center gap-3 mb-1">
            <div style={{ background: 'linear-gradient(135deg, #FFC107, #FF6F00)', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(255,193,7,0.5)', fontSize: 22 }}>⛳</div>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'Nunito, sans-serif' }}>THE CARD GAME</span>
          </div>
          <div className="relative">
            <div style={{ position: 'absolute', top: 6, left: 6, fontSize: 100, fontWeight: 900, color: '#0D2137', fontFamily: 'Nunito, sans-serif', letterSpacing: '-0.02em', userSelect: 'none' }}>GOLF</div>
            <div style={{ position: 'absolute', top: 3, left: 3, fontSize: 100, fontWeight: 900, color: '#0D47A1', fontFamily: 'Nunito, sans-serif', letterSpacing: '-0.02em', userSelect: 'none' }}>GOLF</div>
            <div style={{ position: 'relative', fontSize: 100, fontWeight: 900, background: 'linear-gradient(180deg, #FFFFFF 0%, #82B1FF 40%, #FFC107 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: 'Nunito, sans-serif', letterSpacing: '-0.02em', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))', userSelect: 'none' }}>GOLF</div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#FFC107" color="#FFC107" style={{ opacity: 0.8 }} />)}
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginLeft: 4, marginRight: 4, fontFamily: 'Nunito, sans-serif' }}>MULTIPLAYER EDITION</span>
            {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#FFC107" color="#FFC107" style={{ opacity: 0.8 }} />)}
          </div>
        </motion.div>

        {/* Mode Cards */}
        <div className="flex gap-6 w-full justify-center flex-wrap">

          {/* Multiplayer Card */}
          <motion.div
            initial={{ opacity: 0, x: -60, rotate: -5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ delay: 0.3, duration: 0.6, type: 'spring', bounce: 0.3 }}
            className="mode-card flex-1 min-w-[280px] max-w-[340px]"
            onMouseEnter={() => setHoveredCard('multi')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => setStep('nickname')}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ background: 'linear-gradient(145deg, #7B1FA2 0%, #4527A0 50%, #1A237E 100%)', borderRadius: 24, border: hoveredCard === 'multi' ? '3px solid rgba(171,71,188,0.9)' : '3px solid rgba(171,71,188,0.4)', boxShadow: hoveredCard === 'multi' ? '0 20px 60px rgba(123,31,162,0.6), 0 0 30px rgba(171,71,188,0.4), inset 0 1px 0 rgba(255,255,255,0.2)' : '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)', padding: '36px 32px', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, fontSize: 120, opacity: 0.06, transform: 'rotate(15deg)', fontFamily: 'Nunito' }}>♠</div>
              <div className="flex flex-col items-center gap-5">
                <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #CE93D8, #7B1FA2)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(123,31,162,0.5)' }}>
                  <Users size={36} color="white" />
                </div>
                <div className="text-center">
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'white', fontFamily: 'Nunito, sans-serif', letterSpacing: '-0.01em', marginBottom: 6 }}>MULTIPLAYER</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: 'Nunito, sans-serif', lineHeight: 1.5 }}>Challenge friends online.<br />Up to 4 players per room.</div>
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  {['Real Players', 'Live Chat', 'Ranked'].map(tag => (
                    <span key={tag} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 50, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontFamily: 'Nunito, sans-serif' }}>{tag}</span>
                  ))}
                </div>
                <button
                  className="arcade-btn arcade-btn-purple w-full py-4"
                  style={{ fontSize: 18, fontWeight: 900 }}
                  onClick={e => { e.stopPropagation(); setStep('nickname'); }}
                >🎮 PLAY NOW</button>
              </div>
            </div>
          </motion.div>

          {/* Solo vs AI Card */}
          <motion.div
            initial={{ opacity: 0, x: 60, rotate: 5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ delay: 0.4, duration: 0.6, type: 'spring', bounce: 0.3 }}
            className="mode-card right flex-1 min-w-[280px] max-w-[340px]"
            onMouseEnter={() => setHoveredCard('solo')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={handleSoloPlay}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ background: 'linear-gradient(145deg, #B71C1C 0%, #E65100 50%, #F57F17 100%)', borderRadius: 24, border: hoveredCard === 'solo' ? '3px solid rgba(255,152,0,0.9)' : '3px solid rgba(255,152,0,0.4)', boxShadow: hoveredCard === 'solo' ? '0 20px 60px rgba(230,81,0,0.6), 0 0 30px rgba(255,152,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)' : '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)', padding: '36px 32px', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, fontSize: 120, opacity: 0.06, transform: 'rotate(-15deg)' }}>🤖</div>
              <div className="flex flex-col items-center gap-5">
                <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #FFCC02, #E65100)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(230,81,0,0.5)', fontSize: 38 }}>🤖</div>
                <div className="text-center">
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'white', fontFamily: 'Nunito, sans-serif', letterSpacing: '-0.01em', marginBottom: 6 }}>SOLO VS AI</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: 'Nunito, sans-serif', lineHeight: 1.5 }}>Train your skills against<br />3 challenging AI opponents.</div>
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  {['Practice', 'AI Rivals', 'Offline'].map(tag => (
                    <span key={tag} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 50, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontFamily: 'Nunito, sans-serif' }}>{tag}</span>
                  ))}
                </div>
                <button
                  className="arcade-btn arcade-btn-gold w-full py-4"
                  style={{ fontSize: 18, fontWeight: 900 }}
                  onClick={e => { e.stopPropagation(); handleSoloPlay(); }}
                >🤖 PLAY NOW</button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom info */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          style={{
            width: '100%',
            maxWidth: 760,
            background: 'linear-gradient(145deg, rgba(13,71,161,0.45), rgba(6,13,27,0.72))',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 22,
            padding: '18px 22px',
            boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #FFD54F, #FF8F00)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(255,193,7,0.35)',
              }}>
                <Trophy size={22} color="#3E2723" />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.18em', fontFamily: 'Nunito, sans-serif' }}>
                  LEADERBOARD
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'white', fontFamily: 'Nunito, sans-serif' }}>
                  Rankings
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {[{ icon: <Zap size={14} />, text: 'Wins Only' }, { icon: <Star size={14} />, text: 'Logged-In Players' }].map(({ icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-2"
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 12,
                    fontFamily: 'Nunito',
                    fontWeight: 700,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 999,
                    padding: '6px 10px',
                  }}
                >
                  {icon}
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate('/leaderboard')}
            style={{
              width: '100%',
              marginTop: 16,
              background: 'linear-gradient(135deg, rgba(255,193,7,0.18), rgba(255,143,0,0.08))',
              border: '1px solid rgba(255,193,7,0.28)',
              borderRadius: 18,
              padding: '18px 20px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <div style={{
                fontSize: 18,
                fontWeight: 900,
                color: 'white',
                fontFamily: 'Nunito, sans-serif',
                marginBottom: 4,
              }}>
                View the full multiplayer leaderboard
              </div>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.62)',
                fontFamily: 'Nunito, sans-serif',
                lineHeight: 1.5,
              }}>
                Open the standings page to see ranked wins, top players, and your current position.
              </div>
            </div>

            <div style={{
              flexShrink: 0,
              background: 'linear-gradient(135deg, #FFD54F, #FF8F00)',
              color: '#3E2723',
              borderRadius: 999,
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: 900,
              fontFamily: 'Nunito, sans-serif',
              letterSpacing: '0.08em',
            }}>
              OPEN
            </div>
          </button>
        </motion.div>
      </div>

      {/* ===== MODALS ===== */}
      <AnimatePresence>

        {/* STEP 1: Choose Nickname */}
        {step === 'nickname' && (
          <Modal onClose={closeModal}>
            <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 24, textAlign: 'center' }}>Choose nickname</h2>
            <input
              style={inputStyle}
              placeholder="Your nickname..."
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNicknameOk()}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
              <DarkBtn onClick={handleNicknameOk} style={{ minWidth: 120 }}>OK</DarkBtn>
            </div>
          </Modal>
        )}

        {/* STEP 2: Join With Room Code */}
        {step === 'room-list' && (
          <Modal onClose={closeModal}>
            <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 20 }}>Join with room code</h2>
            <p style={{ fontSize: 13, color: '#aaa', marginBottom: 14, lineHeight: 1.6 }}>
              Enter the room code shared by the host. Players can only join multiplayer rooms by code now.
            </p>
            <input
              style={{ ...inputStyle, marginBottom: 12, fontSize: 18, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center' }}
              placeholder="GOLF-1234"
              value={joinRoomCode}
              onChange={e => {
                setJoinRoomCode(normalizeRoomCode(e.target.value));
                setError('');
              }}
              onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
              autoFocus
            />
            {error && (
              <div style={{ marginBottom: 18, color: '#e53935', fontSize: 13, fontWeight: 700 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleJoinByCode}
                disabled={loading}
                style={{ flex: 1, background: '#43A047', border: 'none', borderRadius: 8, color: 'white', fontWeight: 900, fontSize: 16, padding: '12px', cursor: loading ? 'default' : 'pointer', fontFamily: 'Nunito', opacity: loading ? 0.7 : 1 }}
              >{loading ? 'JOINING...' : 'JOIN ROOM'}</button>
              <button
                onClick={() => setStep('create-room')}
                style={{ flex: 1, background: '#1565C0', border: 'none', borderRadius: 8, color: 'white', fontWeight: 900, fontSize: 16, padding: '12px', cursor: 'pointer', fontFamily: 'Nunito' }}
              >+ CREATE MATCH</button>
            </div>
          </Modal>
        )}

        {/* STEP 3: Create Room */}
        {step === 'create-room' && (
          <Modal onClose={closeModal}>
            <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 24 }}>Create room</h2>
            <label style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 700, display: 'block', marginBottom: 6 }}>Name Room</label>
            <input
              style={{ ...inputStyle, marginBottom: 16 }}
              value={roomNameInput}
              onChange={e => setRoomNameInput(e.target.value)}
            />
            <label style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 700, display: 'block', marginBottom: 6 }}>Password</label>
            <input
              style={{ ...inputStyle, marginBottom: 6 }}
              type="password"
              placeholder="Leave empty for public room"
              value={roomPassword}
              onChange={e => setRoomPassword(e.target.value)}
            />
            <p style={{ fontSize: 12, color: '#aaa', marginBottom: 20 }}>If you don't set a password this room will be public.</p>
            <label style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 700, display: 'block', marginBottom: 10 }}>Max Players</label>
            <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
              {([2, 3, 4] as const).map(n => (
                <label key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 15 }}>
                  <input
                    type="radio"
                    name="maxPlayers"
                    checked={maxPlayers === n}
                    onChange={() => setMaxPlayers(n)}
                    style={{ accentColor: '#1565C0', width: 16, height: 16 }}
                  />
                  {n}
                </label>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#aaa', marginBottom: 20 }}>Choose the maximum number of players in room.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <DarkBtn onClick={handleCreateRoom} style={{ minWidth: 120 }}>CREATE</DarkBtn>
              <DarkBtn onClick={() => setStep('room-list')} style={{ minWidth: 120 }}>BACK</DarkBtn>
            </div>
          </Modal>
        )}

        {/* STEP 4: Waiting Room */}
        {step === 'waiting-room' && (
          <Modal onClose={closeModal}>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 20 }}>
              waiting for players in room:<br />
              <span style={{ color: '#82B1FF' }}>{roomNameInput}</span>
            </h2>
            <div style={{ background: '#2a2a2a', border: '1px solid #444', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 15 }}>
              {nickname} <span style={{ color: '#FFC107', fontSize: 12, marginLeft: 8 }}>(host)</span>
            </div>
            <p style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic', marginBottom: 16 }}>
              This room can contain max {maxPlayers} players
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Room Code — share this with your friends:</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <input
                readOnly
                value={createdRoomCode}
                style={{ ...inputStyle, fontSize: 18, fontWeight: 900, letterSpacing: '0.1em', textAlign: 'center' }}
              />
              <button
                onClick={() => { navigator.clipboard.writeText(createdRoomCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                style={{ background: codeCopied ? '#2e7d32' : '#333', border: '1px solid #555', borderRadius: 6, color: 'white', padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Nunito', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}
              >
                {codeCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <DarkBtn onClick={() => setStep('room-list')} style={{ minWidth: 100 }}>BACK</DarkBtn>
              <DarkBtn
                onClick={handleStartGame}
                style={{ minWidth: 100, background: '#1565C0', border: '2px solid #1976D2' }}
              >START GAME</DarkBtn>
            </div>
          </Modal>
        )}

      </AnimatePresence>
    </div>
  );
}
