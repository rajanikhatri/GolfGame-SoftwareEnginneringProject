import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, RotateCcw, Home } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/game/GameCard';
import { Confetti } from '../components/game/Confetti';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32', '#6B7280'];
const MEDAL_ICONS = ['🥇', '🥈', '🥉', '4️⃣'];
const PLACE_LABELS = ['1ST PLACE', '2ND PLACE', '3RD PLACE', '4TH PLACE'];

export default function EndGame() {
  const navigate = useNavigate();
  const { players, winner, resetGame, initGame } = useGame();
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [animateRows, setAnimateRows] = useState(false);

  useEffect(() => {
    if (!winner || players.length === 0) {
      navigate('/');
      return;
    }

    const t1 = setTimeout(() => setShowScoreboard(true), 1800);
    const t2 = setTimeout(() => setAnimateRows(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [winner, players, navigate]);

  if (!winner || players.length === 0) return null;

  // Sort players by score (lowest first)
  const sortedPlayers = [...players].sort((a, b) => a.score - b.score);

  const handlePlayAgain = () => {
    initGame();
    navigate('/game');
  };

  const handleMenu = () => {
    resetGame();
    navigate('/');
  };

  return (
    <div
      className="min-h-screen w-full overflow-hidden relative font-game"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #1565C0 0%, #0D47A1 30%, #0D2137 70%, #060D1B 100%)',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
      <Confetti />

      {/* Radial spotlight */}
      <div style={{
        position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: 800, height: 600,
        background: 'radial-gradient(ellipse, rgba(255,193,7,0.12) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      <div className="relative z-10 flex flex-col items-center min-h-screen py-12 px-6">

        {/* Winner announcement */}
        <motion.div
          initial={{ opacity: 0, scale: 0.3, rotate: -15 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
          className="flex flex-col items-center gap-6 mb-10"
        >
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: 80 }}
          >
            🏆
          </motion.div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 16, fontWeight: 800,
              color: 'rgba(255,255,255,0.5)',
              fontFamily: 'Nunito', letterSpacing: '0.3em',
              marginBottom: 8,
            }}>WINNER!</div>

            <div style={{ position: 'relative', display: 'inline-block' }}>
              {/* Shadow layers */}
              <div style={{
                position: 'absolute', top: 5, left: 5,
                fontSize: 64, fontWeight: 900,
                color: '#0D2137', fontFamily: 'Nunito',
              }}>{winner.name}</div>
              <div style={{
                position: 'absolute', top: 3, left: 3,
                fontSize: 64, fontWeight: 900,
                color: '#0D47A1', fontFamily: 'Nunito',
              }}>{winner.name}</div>
              <div style={{
                position: 'relative',
                fontSize: 64, fontWeight: 900,
                background: 'linear-gradient(180deg, #FFFFFF 0%, #FFC107 60%, #FF6F00 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontFamily: 'Nunito',
                filter: 'drop-shadow(0 4px 12px rgba(255,193,7,0.4))',
              }}>{winner.name}</div>
            </div>

            <div style={{
              fontSize: 20, fontWeight: 700,
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'Nunito', marginTop: 4,
            }}>
              with <span style={{ color: '#4CAF50', fontWeight: 900 }}>{winner.score} points!</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginLeft: 8 }}>(lowest score wins)</span>
            </div>
          </div>

          {/* Winner's avatar */}
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 96, height: 96, borderRadius: '50%',
              background: `radial-gradient(circle, ${winner.color}60, ${winner.color}20)`,
              border: `4px solid ${winner.color}`,
              boxShadow: `0 0 40px ${winner.color}80, 0 0 80px ${winner.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48,
            }}
          >
            {winner.avatar}
          </motion.div>

          {/* Winner's cards */}
          <div style={{ display: 'flex', gap: 6 }}>
            {winner.cards.flat().map((card, i) => (
              <motion.div
                key={i}
                initial={{ y: 30, opacity: 0, rotate: (i - 1.5) * 10 }}
                animate={{ y: 0, opacity: 1, rotate: (i - 1.5) * 6 }}
                transition={{ delay: 0.5 + i * 0.08, type: 'spring', bounce: 0.4 }}
              >
                <GameCard card={card ?? undefined} size="sm" />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Scoreboard */}
        <AnimatePresence>
          {showScoreboard && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                width: '100%', maxWidth: 560,
                background: 'rgba(0,0,0,0.35)',
                border: '2px solid rgba(255,255,255,0.12)',
                borderRadius: 24,
                overflow: 'hidden',
                marginBottom: 32,
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              }}
            >
              {/* Scoreboard header */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,193,7,0.2), rgba(255,193,7,0.05))',
                borderBottom: '1px solid rgba(255,193,7,0.3)',
                padding: '14px 24px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Trophy size={18} color="#FFC107" />
                <span style={{ fontSize: 14, fontWeight: 900, color: '#FFC107', fontFamily: 'Nunito', letterSpacing: '0.1em' }}>
                  FINAL SCOREBOARD
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.3)', fontFamily: 'Nunito', marginLeft: 'auto' }}>
                  Lower = Better
                </span>
              </div>

              {/* Scoreboard rows */}
              <div style={{ padding: '8px 16px' }}>
                {sortedPlayers.map((player, rank) => (
                  <motion.div
                    key={player.id}
                    initial={{ x: -40, opacity: 0 }}
                    animate={animateRows ? { x: 0, opacity: 1 } : {}}
                    transition={{ delay: rank * 0.12, type: 'spring', bounce: 0.3 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '14px 12px',
                      borderRadius: 16,
                      marginBottom: 6,
                      background: rank === 0
                        ? 'linear-gradient(135deg, rgba(255,193,7,0.2), rgba(255,193,7,0.05))'
                        : 'rgba(255,255,255,0.04)',
                      border: rank === 0 ? '2px solid rgba(255,193,7,0.4)' : '2px solid rgba(255,255,255,0.06)',
                      boxShadow: rank === 0 ? '0 4px 20px rgba(255,193,7,0.15)' : 'none',
                    }}
                  >
                    {/* Medal */}
                    <span style={{ fontSize: 24, flexShrink: 0, width: 36, textAlign: 'center' }}>
                      {MEDAL_ICONS[rank]}
                    </span>

                    {/* Place label */}
                    <span style={{
                      fontSize: 10, fontWeight: 900,
                      color: MEDAL_COLORS[rank],
                      fontFamily: 'Nunito', letterSpacing: '0.1em',
                      minWidth: 70,
                    }}>{PLACE_LABELS[rank]}</span>

                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: `radial-gradient(circle, ${player.color}40, ${player.color}10)`,
                      border: `2px solid ${player.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, flexShrink: 0,
                    }}>{player.avatar}</div>

                    {/* Name */}
                    <span style={{
                      flex: 1, fontSize: 18, fontWeight: 900,
                      color: rank === 0 ? '#FFC107' : 'white',
                      fontFamily: 'Nunito',
                    }}>
                      {player.name}
                      {player.id === 'p1' && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginLeft: 6 }}>(YOU)</span>}
                    </span>

                    {/* Score */}
                    <div style={{
                      background: rank === 0 ? 'linear-gradient(135deg, #FFD700, #FFA000)' : 'rgba(255,255,255,0.08)',
                      borderRadius: 50, padding: '6px 16px',
                      display: 'flex', alignItems: 'center', gap: 6,
                      flexShrink: 0,
                    }}>
                      <Star size={12} fill={rank === 0 ? '#3E2723' : '#FFC107'} color={rank === 0 ? '#3E2723' : '#FFC107'} />
                      <span style={{
                        fontSize: 18, fontWeight: 900,
                        color: rank === 0 ? '#3E2723' : 'white',
                        fontFamily: 'Nunito',
                      }}>{player.score}</span>
                    </div>

                    {/* Cards mini */}
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      {player.cards.flat().map((card, ci) => (
                        <GameCard key={ci} card={card ?? undefined} size="sm" style={{ width: 28, height: 40, borderWidth: 2 }} />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <AnimatePresence>
          {showScoreboard && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex gap-5"
            >
              <button
                className="arcade-btn arcade-btn-green"
                style={{ fontSize: 18, padding: '16px 36px', fontWeight: 900 }}
                onClick={handlePlayAgain}
              >
                <RotateCcw size={18} style={{ marginRight: 8 }} />
                PLAY AGAIN
              </button>
              <button
                className="arcade-btn arcade-btn-blue"
                style={{ fontSize: 18, padding: '16px 36px', fontWeight: 900 }}
                onClick={handleMenu}
              >
                <Home size={18} style={{ marginRight: 8 }} />
                MAIN MENU
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}