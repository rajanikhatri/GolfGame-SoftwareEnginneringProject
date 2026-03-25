import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Zap, Trophy, Users, RefreshCw, Lock, LogIn, Copy, Check } from 'lucide-react';
import { useGame } from '../context/GameContext';

// --- Types ---
type ModalStep = 'nickname' | 'room-list' | 'create-room' | 'waiting-room' | 'room-password' | null;

interface Room {
  id: string;
  name: string;
  current: number;
  max: number;
  hasPassword: boolean;
}

// --- Mock rooms (replace with Firebase fetch later) ---
const MOCK_ROOMS: Room[] = [];

// --- Helpers ---
function generateRoomCode() {
  return 'GOLF-' + Math.floor(1000 + Math.random() * 9000);
}

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
  const { setGameMode, setPlayerName } = useGame();

  // Modal state
  const [step, setStep] = useState<ModalStep>(null);
  const [nickname, setNickname] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [rooms, setRooms] = useState<Room[]>(MOCK_ROOMS);

  // Create room state
  const [roomNameInput, setRoomNameInput] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
  const [createdRoomCode, setCreatedRoomCode] = useState('');

  // Join room state
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  const [hoveredCard, setHoveredCard] = useState<'multi' | 'solo' | null>(null);

  function closeModal() {
    setStep(null);
    setNickname('');
    setSearchQuery('');
    setRoomNameInput('');
    setRoomPassword('');
    setJoinPassword('');
    setJoinError('');
    setSelectedRoom(null);
  }

  function handleSoloPlay() {
    setGameMode('solo');
    navigate('/lobby');
  }

  // Step 1: confirm nickname
  function handleNicknameOk() {
    if (!nickname.trim()) return;
    setRoomNameInput(`${nickname.trim()}'s room`);
    setStep('room-list');
  }

  // Step 2: refresh rooms (placeholder for Firebase)
  function handleRefreshRooms() {
    setRooms([...MOCK_ROOMS]);
    setUpdateMsg('Updated!');
    setTimeout(() => setUpdateMsg(''), 2000);
  }

  // Step 2: click a room to join
  function handleRoomClick(room: Room) {
    if (room.current >= room.max) return; // full
    setSelectedRoom(room);
    if (room.hasPassword) {
      setJoinPassword('');
      setJoinError('');
      setStep('room-password');
    } else {
      joinRoom(room, '');
    }
  }

  function joinRoom(room: Room, password: string) {
    // TODO: verify password against Firebase
    setPlayerName(nickname.trim());
    setGameMode('multiplayer');
    navigate('/lobby');
  }

  // Password submit for private room
  function handlePasswordOk() {
    if (!selectedRoom) return;
    if (joinPassword !== selectedRoom.hasPassword.toString()) {
      // In real app: verify against Firebase. For now just proceed.
    }
    joinRoom(selectedRoom, joinPassword);
  }

  // Step 3: create room
  function handleCreateRoom() {
    if (!roomNameInput.trim()) return;
    const code = generateRoomCode();
    setCreatedRoomCode(code);
    // Add to local room list (Firebase would handle this)
    const newRoom: Room = {
      id: code,
      name: roomNameInput.trim(),
      current: 1,
      max: maxPlayers,
      hasPassword: roomPassword.length > 0,
    };
    setRooms(prev => [...prev, newRoom]);
    setPlayerName(nickname.trim());
    setGameMode('multiplayer');
    setStep('waiting-room');
  }

  // Step 4: start game from waiting room
  function handleStartGame() {
    navigate('/lobby');
  }

  const filteredRooms = rooms.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center font-game"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #1565C0 0%, #0D47A1 30%, #0D2137 70%, #060D1B 100%)',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex items-center gap-6">
          {[{ icon: <Trophy size={14} />, text: 'Leaderboards' }, { icon: <Zap size={14} />, text: 'Fast Rounds' }, { icon: <Star size={14} />, text: 'Rank Up' }].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Nunito', fontWeight: 600 }}>{icon}<span>{text}</span></div>
          ))}
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

        {/* STEP 2: Match List */}
        {step === 'room-list' && (
          <Modal onClose={closeModal}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 26, fontWeight: 900 }}>Match list</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {updateMsg && <span style={{ color: '#4caf50', fontSize: 13, fontWeight: 700 }}>{updateMsg}</span>}
                <button
                  onClick={handleRefreshRooms}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#333', border: '1px solid #555', borderRadius: 6, color: 'white', fontSize: 13, fontWeight: 700, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Nunito' }}
                >
                  <RefreshCw size={14} /> UPDATE
                </button>
              </div>
            </div>
            <input
              style={{ ...inputStyle, marginBottom: 12 }}
              placeholder="find a room..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div style={{ border: '1px solid #444', borderRadius: 8, overflow: 'hidden', marginBottom: 20, maxHeight: 320, overflowY: 'auto' }}>
              {filteredRooms.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#888', fontSize: 14 }}>
                  No rooms available. Be the first to create one!
                </div>
              ) : (
                filteredRooms.map((room, i) => {
                  const isFull = room.current >= room.max;
                  return (
                    <div
                      key={room.id}
                      onClick={() => !isFull && handleRoomClick(room)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: i % 2 === 0 ? '#222' : '#2a2a2a',
                        cursor: isFull ? 'not-allowed' : 'pointer',
                        opacity: isFull ? 0.5 : 1,
                        borderBottom: i < filteredRooms.length - 1 ? '1px solid #333' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!isFull) (e.currentTarget as HTMLDivElement).style.background = '#1565C0'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = i % 2 === 0 ? '#222' : '#2a2a2a'; }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{room.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, color: '#aaa' }}>{room.current}/{room.max}</span>
                        {room.hasPassword
                          ? <Lock size={16} color="#aaa" />
                          : <LogIn size={16} color="#4caf50" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
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

        {/* STEP 5: Room Password */}
        {step === 'room-password' && (
          <Modal onClose={closeModal}>
            <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 24, textAlign: 'center' }}>Type Room Password</h2>
            <label style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 700, display: 'block', marginBottom: 8 }}>Type Room Password</label>
            <input
              style={{ ...inputStyle, marginBottom: 8 }}
              type="password"
              value={joinPassword}
              onChange={e => { setJoinPassword(e.target.value); setJoinError(''); }}
              onKeyDown={e => e.key === 'Enter' && handlePasswordOk()}
              autoFocus
            />
            {joinError && <p style={{ color: '#e53935', fontSize: 13, marginBottom: 8 }}>{joinError}</p>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
              <DarkBtn onClick={handlePasswordOk} style={{ minWidth: 100 }}>OK</DarkBtn>
              <DarkBtn onClick={() => setStep('room-list')} style={{ minWidth: 100 }}>BACK</DarkBtn>
            </div>
          </Modal>
        )}

      </AnimatePresence>
    </div>
  );
}
