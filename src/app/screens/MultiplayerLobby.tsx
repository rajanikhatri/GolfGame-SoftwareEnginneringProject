import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Copy, Crown, LogIn, Plus, Users, Wifi } from 'lucide-react';
import { useGame } from '../context/GameContext';

type RoomRole = 'host' | 'guest';

function normalizeRoomCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
}

function generateRoomCode() {
  return `GOLF-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function MultiplayerLobby() {
  const navigate = useNavigate();
  const { gameMode } = useGame();

  const [joinCode, setJoinCode] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [roomRole, setRoomRole] = useState<RoomRole | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (gameMode !== 'multiplayer') {
      navigate('/');
    }
  }, [gameMode, navigate]);

  const handleCreateRoom = () => {
    const code = generateRoomCode();
    setActiveRoomCode(code);
    setRoomRole('host');
    setJoinCode(code);
    setError(null);
  };

  const handleJoinRoom = () => {
    const code = normalizeRoomCode(joinCode.trim());
    if (!code) {
      setError('Enter a room code to join.');
      return;
    }

    setActiveRoomCode(code);
    setRoomRole('guest');
    setJoinCode(code);
    setError(null);
  };

  const handleCopy = () => {
    if (!activeRoomCode) return;
    navigator.clipboard.writeText(activeRoomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const leaveRoom = () => {
    setActiveRoomCode(null);
    setRoomRole(null);
    setError(null);
  };

  if (gameMode !== 'multiplayer') return null;

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

      <div className="relative z-10 flex flex-col min-h-screen px-6 py-6 gap-6">
        <div className="flex items-center justify-between">
          <button
            className="arcade-btn arcade-btn-red flex items-center gap-2 px-5 py-3"
            style={{ fontSize: 15, fontWeight: 800 }}
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={18} />
            BACK
          </button>

          <div
            style={{
              background: 'rgba(30,136,229,0.2)',
              border: '2px solid rgba(30,136,229,0.4)',
              borderRadius: 12,
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Wifi size={16} color="#42A5F5" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#42A5F5' }}>
              MULTIPLAYER
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center text-center gap-3">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              fontSize: 42,
              fontWeight: 900,
              color: 'white',
              letterSpacing: '-0.02em',
            }}
          >
            Multiplayer Room
          </motion.div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.65)', maxWidth: 700 }}>
            Bot players are disabled in multiplayer mode. Players should join using a room code.
          </div>
        </div>

        {!activeRoomCode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="player-panel p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #42A5F5, #1565C0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 22px rgba(30,136,229,0.35)',
                  }}
                >
                  <LogIn size={22} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>Join Room</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>
                    Enter a room code shared by another player.
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(normalizeRoomCode(e.target.value))}
                  placeholder="GOLF-4821"
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.08)',
                    border: '2px solid rgba(255,255,255,0.15)',
                    borderRadius: 14,
                    padding: '12px 14px',
                    color: 'white',
                    fontSize: 15,
                    fontWeight: 700,
                    outline: 'none',
                    letterSpacing: '0.08em',
                  }}
                />
                <button
                  className="arcade-btn arcade-btn-blue px-5"
                  style={{ fontSize: 14, fontWeight: 900 }}
                  onClick={handleJoinRoom}
                >
                  JOIN
                </button>
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
                Type the room code exactly, then join.
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="player-panel p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #66BB6A, #2E7D32)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 22px rgba(76,175,80,0.35)',
                  }}
                >
                  <Plus size={22} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>Create Room</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>
                    Create a room and share the code with friends.
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '2px dashed rgba(255,255,255,0.18)',
                  borderRadius: 14,
                  padding: '14px',
                  marginBottom: 12,
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Create a room to generate a code. Other players can join using that code.
              </div>

              <button
                className="arcade-btn arcade-btn-green w-full py-4"
                style={{ fontSize: 16, fontWeight: 900 }}
                onClick={handleCreateRoom}
              >
                CREATE ROOM
              </button>
            </motion.div>
          </div>
        )}

        {error && !activeRoomCode && (
          <div
            style={{
              alignSelf: 'center',
              background: 'rgba(229,57,53,0.15)',
              border: '2px solid rgba(229,57,53,0.35)',
              borderRadius: 12,
              padding: '10px 14px',
              color: '#FF8A80',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {activeRoomCode && (
          <div className="max-w-5xl w-full mx-auto flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="player-panel p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
              }}
            >
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <div className="room-code-badge px-5 py-2">
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: 'white',
                        letterSpacing: '0.12em',
                      }}
                    >
                      {activeRoomCode}
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    style={{
                      background: copied ? 'rgba(67,160,71,0.25)' : 'rgba(255,255,255,0.08)',
                      border: '2px solid rgba(255,255,255,0.18)',
                      borderRadius: 10,
                      padding: '8px 10px',
                      color: 'white',
                    }}
                  >
                    {copied ? <Check size={18} color="#4CAF50" /> : <Copy size={18} />}
                  </button>
                  <div
                    style={{
                      borderRadius: 50,
                      padding: '6px 12px',
                      background: roomRole === 'host' ? 'rgba(255,193,7,0.15)' : 'rgba(66,165,245,0.15)',
                      border: roomRole === 'host'
                        ? '1px solid rgba(255,193,7,0.35)'
                        : '1px solid rgba(66,165,245,0.35)',
                      color: roomRole === 'host' ? '#FFC107' : '#42A5F5',
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {roomRole === 'host' ? 'HOST' : 'JOINED'}
                  </div>
                </div>

                <button
                  className="arcade-btn arcade-btn-red px-5 py-3"
                  style={{ fontSize: 13, fontWeight: 900 }}
                  onClick={leaveRoom}
                >
                  LEAVE ROOM
                </button>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
              <div className="player-panel p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={16} color="#FFC107" />
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#FFC107', letterSpacing: '0.08em' }}>
                    ROOM PLAYERS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[0, 1, 2, 3].map((slot) => {
                    const isYou = slot === 0;
                    return (
                      <div
                        key={slot}
                        className="player-panel p-4"
                        style={{
                          background: isYou ? 'linear-gradient(135deg, rgba(30,136,229,0.18), rgba(30,136,229,0.05))' : 'rgba(255,255,255,0.03)',
                          borderColor: isYou ? 'rgba(30,136,229,0.4)' : 'rgba(255,255,255,0.1)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 22,
                              border: isYou ? '2px solid #1E88E5' : '2px dashed rgba(255,255,255,0.2)',
                              background: isYou ? 'rgba(30,136,229,0.2)' : 'rgba(255,255,255,0.03)',
                              color: 'white',
                              flexShrink: 0,
                            }}
                          >
                            {isYou ? '🎮' : '?'}
                          </div>
                          <div className="min-w-0">
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 900,
                                color: isYou ? '#FFC107' : 'rgba(255,255,255,0.45)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              {isYou ? 'YOU' : `EMPTY SLOT ${slot + 1}`}
                              {isYou && <Crown size={13} color="#FFC107" />}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
                              {isYou
                                ? roomRole === 'host'
                                  ? 'Room creator'
                                  : 'Joined by room code'
                                : 'Waiting for player to join with code'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="player-panel p-5 flex flex-col gap-4">
                <div style={{ fontSize: 15, fontWeight: 900, color: 'white' }}>
                  Multiplayer Status
                </div>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '2px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    padding: '14px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.6,
                  }}
                >
                  No AI players are added in this room. Players should join using the room code shown above.
                </div>

                <div
                  style={{
                    background: 'rgba(255,193,7,0.08)',
                    border: '2px solid rgba(255,193,7,0.2)',
                    borderRadius: 14,
                    padding: '14px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.75)',
                    lineHeight: 1.6,
                  }}
                >
                  {roomRole === 'host'
                    ? 'Share this code with your friends. Starting an actual real-time multiplayer match still needs backend room sync and gameplay networking.'
                    : 'Wait for the host and other players to join this room using the same code.'}
                </div>

                <button
                  className="arcade-btn arcade-btn-green py-4"
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    opacity: 0.45,
                    cursor: 'not-allowed',
                  }}
                  disabled
                  title="Real-time multiplayer gameplay is not implemented yet"
                >
                  {roomRole === 'host' ? 'START MULTIPLAYER (COMING SOON)' : 'WAITING FOR HOST'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
