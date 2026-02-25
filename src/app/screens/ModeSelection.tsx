import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Gamepad2, Bot, Star, Zap, Trophy, Users } from 'lucide-react';
import { useGame } from '../context/GameContext';

const FloatingShape = ({ style, children }: { style: React.CSSProperties; children: React.ReactNode }) => (
  <div className="absolute pointer-events-none select-none" style={style}>
    {children}
  </div>
);

export default function ModeSelection() {
  const navigate = useNavigate();
  const { setGameMode } = useGame();
  const [hoveredCard, setHoveredCard] = useState<'multi' | 'solo' | null>(null);

  const handleSelect = (mode: 'multiplayer' | 'solo') => {
    setGameMode(mode);
    navigate('/lobby');
  };

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center font-game"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #1565C0 0%, #0D47A1 30%, #0D2137 70%, #060D1B 100%)',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
      {/* Background floating shapes */}
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
      <FloatingShape style={{ top: '40%', left: '1%', opacity: 0.08 }}>
        <div className="float-anim text-6xl">★</div>
      </FloatingShape>
      <FloatingShape style={{ top: '35%', right: '1%', opacity: 0.08 }}>
        <div className="float-reverse-anim text-6xl">★</div>
      </FloatingShape>

      {/* Mini floating cards in bg */}
      {[
        { top: '15%', left: '12%', rot: '-15deg', color: '#E53935', rank: '7', suit: '♥' },
        { top: '20%', right: '14%', rot: '12deg', color: '#1a1a4e', rank: 'K', suit: '♠' },
        { bottom: '20%', left: '10%', rot: '20deg', color: '#43A047', rank: 'A', suit: '♣' },
        { bottom: '25%', right: '11%', rot: '-10deg', color: '#FBC02D', rank: '9', suit: '♦' },
      ].map((c, i) => (
        <div
          key={i}
          className="absolute pointer-events-none float-anim"
          style={{
            top: c.top, bottom: c.bottom, left: c.left, right: c.right,
            transform: `rotate(${c.rot})`,
            animationDelay: `${i * 0.7}s`,
            opacity: 0.2,
          }}
        >
          <div style={{
            width: 50, height: 70,
            background: 'white',
            borderRadius: 8,
            border: '2px solid white',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: c.color, fontFamily: 'Nunito' }}>{c.rank}</span>
            <span style={{ fontSize: 16, color: c.color }}>{c.suit}</span>
          </div>
        </div>
      ))}

      {/* Spotlight glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse, rgba(30,136,229,0.2) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

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
            <div style={{
              background: 'linear-gradient(135deg, #FFC107, #FF6F00)',
              borderRadius: '50%', width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(255,193,7,0.5)',
              fontSize: 22,
            }}>⛳</div>
            <span style={{
              fontSize: 14, fontWeight: 800,
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              fontFamily: 'Nunito, sans-serif',
            }}>THE CARD GAME</span>
          </div>

          <div className="relative">
            {/* Shadow layers for 3D logo effect */}
            <div style={{
              position: 'absolute', top: 6, left: 6,
              fontSize: 100, fontWeight: 900,
              color: '#0D2137',
              fontFamily: 'Nunito, sans-serif',
              letterSpacing: '-0.02em',
              userSelect: 'none',
            }}>GOLF</div>
            <div style={{
              position: 'absolute', top: 3, left: 3,
              fontSize: 100, fontWeight: 900,
              color: '#0D47A1',
              fontFamily: 'Nunito, sans-serif',
              letterSpacing: '-0.02em',
              userSelect: 'none',
            }}>GOLF</div>
            <div style={{
              position: 'relative',
              fontSize: 100, fontWeight: 900,
              background: 'linear-gradient(180deg, #FFFFFF 0%, #82B1FF 40%, #FFC107 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: 'Nunito, sans-serif',
              letterSpacing: '-0.02em',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              userSelect: 'none',
            }}>GOLF</div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill="#FFC107" color="#FFC107" style={{ opacity: 0.8 }} />
            ))}
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              marginLeft: 4, marginRight: 4,
              fontFamily: 'Nunito, sans-serif',
            }}>MULTIPLAYER EDITION</span>
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill="#FFC107" color="#FFC107" style={{ opacity: 0.8 }} />
            ))}
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
            onClick={() => handleSelect('multiplayer')}
            style={{ cursor: 'pointer' }}
          >
            <div style={{
              background: 'linear-gradient(145deg, #7B1FA2 0%, #4527A0 50%, #1A237E 100%)',
              borderRadius: 24,
              border: hoveredCard === 'multi' ? '3px solid rgba(171,71,188,0.9)' : '3px solid rgba(171,71,188,0.4)',
              boxShadow: hoveredCard === 'multi'
                ? '0 20px 60px rgba(123,31,162,0.6), 0 0 30px rgba(171,71,188,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                : '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
              padding: '36px 32px',
              transition: 'all 0.3s ease',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Background decoration */}
              <div style={{
                position: 'absolute', top: -30, right: -30,
                fontSize: 120, opacity: 0.06, transform: 'rotate(15deg)',
                fontFamily: 'Nunito',
              }}>♠</div>

              <div className="flex flex-col items-center gap-5">
                <div style={{
                  width: 72, height: 72,
                  background: 'linear-gradient(135deg, #CE93D8, #7B1FA2)',
                  borderRadius: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(123,31,162,0.5)',
                }}>
                  <Users size={36} color="white" />
                </div>

                <div className="text-center">
                  <div style={{
                    fontSize: 28, fontWeight: 900, color: 'white',
                    fontFamily: 'Nunito, sans-serif', letterSpacing: '-0.01em',
                    marginBottom: 6,
                  }}>MULTIPLAYER</div>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: 'rgba(255,255,255,0.6)',
                    fontFamily: 'Nunito, sans-serif',
                    lineHeight: 1.5,
                  }}>Challenge friends online.<br />Up to 4 players per room.</div>
                </div>

                <div className="flex gap-3 flex-wrap justify-center">
                  {['Real Players', 'Live Chat', 'Ranked'].map(tag => (
                    <span key={tag} style={{
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 50, padding: '4px 12px',
                      fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)',
                      fontFamily: 'Nunito, sans-serif',
                    }}>{tag}</span>
                  ))}
                </div>

                <button
                  className="arcade-btn arcade-btn-purple w-full py-4"
                  style={{ fontSize: 18, fontWeight: 900 }}
                  onClick={(e) => { e.stopPropagation(); handleSelect('multiplayer'); }}
                >
                  🎮 PLAY NOW
                </button>
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
            onClick={() => handleSelect('solo')}
            style={{ cursor: 'pointer' }}
          >
            <div style={{
              background: 'linear-gradient(145deg, #B71C1C 0%, #E65100 50%, #F57F17 100%)',
              borderRadius: 24,
              border: hoveredCard === 'solo' ? '3px solid rgba(255,152,0,0.9)' : '3px solid rgba(255,152,0,0.4)',
              boxShadow: hoveredCard === 'solo'
                ? '0 20px 60px rgba(230,81,0,0.6), 0 0 30px rgba(255,152,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                : '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
              padding: '36px 32px',
              transition: 'all 0.3s ease',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -30, right: -30,
                fontSize: 120, opacity: 0.06, transform: 'rotate(-15deg)',
              }}>🤖</div>

              <div className="flex flex-col items-center gap-5">
                <div style={{
                  width: 72, height: 72,
                  background: 'linear-gradient(135deg, #FFCC02, #E65100)',
                  borderRadius: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(230,81,0,0.5)',
                  fontSize: 38,
                }}>🤖</div>

                <div className="text-center">
                  <div style={{
                    fontSize: 28, fontWeight: 900, color: 'white',
                    fontFamily: 'Nunito, sans-serif', letterSpacing: '-0.01em',
                    marginBottom: 6,
                  }}>SOLO VS AI</div>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: 'rgba(255,255,255,0.6)',
                    fontFamily: 'Nunito, sans-serif',
                    lineHeight: 1.5,
                  }}>Train your skills against<br />3 challenging AI opponents.</div>
                </div>

                <div className="flex gap-3 flex-wrap justify-center">
                  {['Practice', 'AI Rivals', 'Offline'].map(tag => (
                    <span key={tag} style={{
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 50, padding: '4px 12px',
                      fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)',
                      fontFamily: 'Nunito, sans-serif',
                    }}>{tag}</span>
                  ))}
                </div>

                <button
                  className="arcade-btn arcade-btn-gold w-full py-4"
                  style={{ fontSize: 18, fontWeight: 900 }}
                  onClick={(e) => { e.stopPropagation(); handleSelect('solo'); }}
                >
                  🤖 PLAY NOW
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center gap-6"
        >
          {[
            { icon: <Trophy size={14} />, text: 'Leaderboards' },
            { icon: <Zap size={14} />, text: 'Fast Rounds' },
            { icon: <Star size={14} />, text: 'Rank Up' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Nunito', fontWeight: 600 }}>
              {icon}
              <span>{text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
