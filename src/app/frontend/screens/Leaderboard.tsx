import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, RefreshCw, Star, Trophy } from 'lucide-react';
import { usePlayerAuth } from '../../auth/AuthContext';
import { getLeaderboard, type LeaderboardEntry } from '../../database/firebaseLeaderboard';

const pageButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '10px 16px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(255,255,255,0.08)',
  color: 'white',
  fontSize: 13,
  fontWeight: 800,
  fontFamily: 'Nunito, sans-serif',
  cursor: 'pointer',
};

function FloatingShape({
  style,
  children,
}: {
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute pointer-events-none select-none" style={style}>
      {children}
    </div>
  );
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const { profile } = usePlayerAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadLeaderboard() {
    setLoading(true);
    setError('');
    try {
      const nextEntries = await getLeaderboard(20);
      setEntries(nextEntries);
    } catch (err) {
      setEntries([]);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeaderboard();
  }, []);

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 20%, #1E88E5 0%, #0D47A1 36%, #09172D 72%, #040913 100%)',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
      <FloatingShape style={{ top: '6%', left: '4%', opacity: 0.14 }}>
        <div className="float-slow-anim text-8xl">♠</div>
      </FloatingShape>
      <FloatingShape style={{ top: '16%', right: '6%', opacity: 0.15 }}>
        <div className="float-anim text-7xl" style={{ color: '#E53935' }}>♥</div>
      </FloatingShape>
      <FloatingShape style={{ bottom: '14%', left: '7%', opacity: 0.12 }}>
        <div className="float-reverse-anim text-8xl" style={{ color: '#43A047' }}>♣</div>
      </FloatingShape>
      <FloatingShape style={{ bottom: '10%', right: '5%', opacity: 0.13 }}>
        <div className="float-slow-anim text-7xl" style={{ color: '#FBC02D' }}>♦</div>
      </FloatingShape>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-5 py-8 sm:px-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <button onClick={() => navigate('/')} style={pageButtonStyle}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <button onClick={loadLeaderboard} style={pageButtonStyle}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.5 }}
          style={{
            background: 'linear-gradient(145deg, rgba(8,25,52,0.92), rgba(5,14,28,0.92))',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 28,
            padding: '24px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                background: 'linear-gradient(135deg, #FFD54F, #FF8F00)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(255,193,7,0.32)',
              }}>
                <Trophy size={28} color="#3E2723" />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.52)', letterSpacing: '0.22em' }}>
                  MULTIPLAYER LEADERBOARD
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: 'white', lineHeight: 1.05 }}>
                  Top Winners
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.62)', marginTop: 6 }}>
                  Ranked by multiplayer wins. Solo AI games do not count.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['Logged-in players only', 'Lowest-score winner earns the win'].map(label => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 12px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.68)',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  <Star size={13} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {loading && (
              <div style={{
                padding: '20px 18px',
                borderRadius: 18,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.62)',
                fontSize: 15,
                fontWeight: 700,
                textAlign: 'center',
              }}>
                Loading leaderboard...
              </div>
            )}

            {!loading && error && (
              <div style={{
                padding: '20px 18px',
                borderRadius: 18,
                background: 'rgba(183,28,28,0.16)',
                border: '1px solid rgba(239,83,80,0.28)',
                color: '#FFCDD2',
                fontSize: 15,
                fontWeight: 700,
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            {!loading && !error && entries.length === 0 && (
              <div style={{
                padding: '22px 18px',
                borderRadius: 18,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.62)',
                fontSize: 15,
                fontWeight: 700,
                textAlign: 'center',
              }}>
                No multiplayer wins have been recorded yet. The first winner will take the top spot.
              </div>
            )}

            {!loading && !error && entries.map((entry, index) => {
              const isYou = profile?.uid === entry.uid;
              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

              return (
                <motion.div
                  key={entry.uid}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + (index * 0.03), duration: 0.32 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '72px minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    borderRadius: 20,
                    background: isYou
                      ? 'linear-gradient(135deg, rgba(255,193,7,0.2), rgba(255,143,0,0.08))'
                      : 'rgba(255,255,255,0.05)',
                    border: isYou
                      ? '1px solid rgba(255,193,7,0.38)'
                      : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      background: entry.color ?? '#1565C0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      boxShadow: '0 6px 16px rgba(0,0,0,0.22)',
                    }}>
                      {entry.avatar ?? '🎮'}
                    </div>
                    <div style={{
                      minWidth: 0,
                      fontSize: 20,
                      fontWeight: 900,
                      color: 'white',
                    }}>
                      {medal}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: isYou ? '#FFD54F' : 'white',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {entry.displayName}
                      </span>
                      {isYou && (
                        <span style={{
                          padding: '3px 9px',
                          borderRadius: 999,
                          background: 'rgba(255,193,7,0.18)',
                          border: '1px solid rgba(255,193,7,0.35)',
                          color: '#FFD54F',
                          fontSize: 11,
                          fontWeight: 900,
                          letterSpacing: '0.08em',
                        }}>
                          YOU
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.5)',
                      marginTop: 4,
                    }}>
                      Rank #{index + 1} on the multiplayer board
                    </div>
                  </div>

                  <div style={{
                    minWidth: 108,
                    justifySelf: 'end',
                    padding: '9px 14px',
                    borderRadius: 999,
                    textAlign: 'center',
                    background: isYou ? 'linear-gradient(135deg, #FFD54F, #FF8F00)' : 'rgba(255,255,255,0.08)',
                  }}>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: '0.08em',
                      color: isYou ? '#3E2723' : 'rgba(255,255,255,0.46)',
                    }}>
                      WINS
                    </div>
                    <div style={{
                      fontSize: 22,
                      fontWeight: 900,
                      lineHeight: 1.1,
                      color: isYou ? '#3E2723' : 'white',
                    }}>
                      {entry.wins}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
