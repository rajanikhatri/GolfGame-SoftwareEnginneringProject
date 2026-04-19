import React from 'react';
import type { Card } from '../../../backend/GameContext';

interface GameCardProps {
  card?: Card | null;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  selectable?: boolean;
  glowing?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  rotated?: boolean;
}

const SUIT_COLORS: Record<string, string> = {
  hearts: '#D94B6A',
  diamonds: '#D28A1E',
  spades: '#173B73',
  clubs: '#1D7A70',
  joker: 'linear-gradient(135deg, #D94B6A, #F3A93B, #32B6A0, #4A90E2)',
};

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  spades: '♠',
  clubs: '♣',
  joker: '★',
};

const SUIT_BG: Record<string, string> = {
  hearts: 'linear-gradient(155deg, #FFF4F7 0%, #FFD7DF 52%, #FFC1CD 100%)',
  diamonds: 'linear-gradient(155deg, #FFF8E8 0%, #FFE2A8 52%, #FFD184 100%)',
  spades: 'linear-gradient(155deg, #F4F8FF 0%, #D9E8FF 52%, #BDD4F6 100%)',
  clubs: 'linear-gradient(155deg, #EEFFFB 0%, #C8F3E8 52%, #AFE7D8 100%)',
  joker: 'linear-gradient(155deg, #FFF6FB 0%, #E6DCFF 34%, #D4EEFF 68%, #FFF0CC 100%)',
};

const SIZES = {
  sm: { width: 52, height: 72, borderRadius: 10, fontSize: 20, cornerSize: 10 },
  md: { width: 70, height: 98, borderRadius: 12, fontSize: 28, cornerSize: 12 },
  lg: { width: 88, height: 124, borderRadius: 14, fontSize: 38, cornerSize: 14 },
};

export function GameCard({
  card,
  faceDown = false,
  size = 'md',
  selected = false,
  selectable = false,
  glowing = false,
  onClick,
  style,
  className = '',
  rotated = false,
}: GameCardProps) {
  const dims = SIZES[size];
  const isEmptySlot = !card;
  const showBack = !isEmptySlot && (faceDown || !card.faceUp);

  const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds';
  const isJoker = card?.suit === 'joker';
  const isBlackKing = card?.rank === 'K' && (card?.suit === 'spades' || card?.suit === 'clubs');

  const containerStyle: React.CSSProperties = {
    width: rotated ? dims.height : dims.width,
    height: rotated ? dims.width : dims.height,
    borderRadius: dims.borderRadius,
    border: selected ? '3px solid #FFD600' : '3px solid rgba(255, 232, 196, 0.96)',
    boxShadow: selected
      ? '0 0 0 4px #FFD600, 0 0 0 10px rgba(255,214,0,0.28), 0 8px 28px rgba(0,0,0,0.55), 0 0 36px rgba(255,193,7,0.82)'
      : glowing
      ? '0 0 0 1px rgba(255,232,196,0.42), 0 8px 24px rgba(0,0,0,0.5), 0 0 24px rgba(30,136,229,0.85)'
      : '0 0 0 1px rgba(255,232,196,0.24), 0 6px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,248,230,0.32)',
    cursor: selectable || onClick ? 'pointer' : 'default',
    transition: 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    transform: rotated ? 'rotate(90deg)' : undefined,
    ...style,
  };

  if (isEmptySlot) {
  return (
    <div
      style={{
        ...containerStyle,
        border: '2px dashed rgba(190,224,255,0.35)',
        background: 'linear-gradient(145deg, rgba(18,47,94,0.22), rgba(26,90,150,0.14))',
        boxShadow: 'inset 0 0 16px rgba(120,190,255,0.08)',
      }}
      className={`game-card game-card-empty ${className}`}
      onClick={onClick}
    />
  );
}

if (showBack) {
  return (
    <div
      style={containerStyle}
      className={`game-card game-card-back ${className}`}
      onClick={onClick}
    >
      <div style={{
        position: 'absolute', inset: 6,
        border: '1.5px solid rgba(210,236,255,0.28)',
        borderRadius: dims.borderRadius - 4,
        background: 'repeating-linear-gradient(45deg, rgba(255,240,189,0.08) 0px, rgba(255,240,189,0.08) 2px, transparent 2px, transparent 8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: dims.fontSize * 0.7, opacity: 0.38 }}>🂠</span>
      </div>
      <div style={{
        position: 'absolute', top: 6, left: 8,
        fontSize: 10, color: 'rgba(255,240,189,0.35)',
        fontFamily: 'Nunito, sans-serif', fontWeight: 800,
      }}>⛳</div>
    </div>
  );
}

  if (!card) return null;

  const suitColor = SUIT_COLORS[card.suit] || '#333';
  const suitSymbol = SUIT_SYMBOLS[card.suit] || '?';
  const cardBg = SUIT_BG[card.suit] || 'white';
  const textColor = isRed || isJoker ? '#8E2447' : '#143254';

  return (
    <div
      style={{
        ...containerStyle,
        background: cardBg,
      }}
      className={`game-card ${className}`}
      onClick={onClick}
    >
      {/* Top-left corner */}
      <div style={{
        position: 'absolute', top: 5, left: 6,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        lineHeight: 1,
      }}>
        <span style={{
          fontSize: dims.cornerSize,
          fontWeight: 900,
          color: isJoker ? '#7B1FA2' : suitColor,
          fontFamily: 'Nunito, sans-serif',
        }}>{card.rank}</span>
        <span style={{
          fontSize: dims.cornerSize * 0.75,
          color: isJoker ? '#7B1FA2' : suitColor,
        }}>{suitSymbol}</span>
      </div>

      {/* Center */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 2,
      }}>
        {isJoker ? (
          <>
            <span style={{
              fontSize: dims.fontSize * 1.1,
              background: 'linear-gradient(135deg, #D94B6A, #F3A93B, #32B6A0, #4A90E2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 900,
              fontFamily: 'Nunito, sans-serif',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            }}>★</span>
            <span style={{
              fontSize: dims.cornerSize * 0.8,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #5C6BC0, #26A69A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: 'Nunito, sans-serif',
            }}>JOKER</span>
          </>
        ) : (
          <>
            <span style={{
              fontSize: dims.fontSize,
              fontWeight: 900,
              color: textColor,
              fontFamily: 'Nunito, sans-serif',
              lineHeight: 1,
              textShadow: '0 1px 2px rgba(0,0,0,0.15)',
            }}>{card.rank}</span>
            <span style={{
              fontSize: dims.fontSize * 0.7,
              color: isRed ? '#D94B6A' : suitColor,
              lineHeight: 1,
            }}>{suitSymbol}</span>
          </>
        )}
      </div>

      {/* Bottom-right corner (rotated) */}
      <div style={{
        position: 'absolute', bottom: 5, right: 6,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        lineHeight: 1, transform: 'rotate(180deg)',
      }}>
        <span style={{
          fontSize: dims.cornerSize,
          fontWeight: 900,
          color: isJoker ? '#7B1FA2' : suitColor,
          fontFamily: 'Nunito, sans-serif',
        }}>{card.rank}</span>
        <span style={{
          fontSize: dims.cornerSize * 0.75,
          color: isJoker ? '#7B1FA2' : suitColor,
        }}>{suitSymbol}</span>
      </div>

      {/* Special glow for joker */}
      {isJoker && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(92,107,192,0.12), rgba(38,166,154,0.1))',
          pointerEvents: 'none',
          borderRadius: dims.borderRadius - 3,
        }} />
      )}

      {/* Black king special - show "-2" value badge */}
      {isBlackKing && (
        <div style={{
          position: 'absolute', top: '50%', right: 4,
          transform: 'translateY(-50%)',
          background: 'rgba(255,193,7,0.9)',
          borderRadius: 4, padding: '1px 4px',
          fontSize: 9, fontWeight: 900,
          color: '#3E2723',
          fontFamily: 'Nunito, sans-serif',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }}>-2</div>
      )}

      {/* Value indicator for other negative values (joker) */}
      {card.value < 0 && card.rank !== 'K' && (
        <div style={{
          position: 'absolute', bottom: 18, left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(92,107,192,0.14)',
          borderRadius: 4, padding: '1px 6px',
          fontSize: 9, fontWeight: 800,
          color: '#3552A3',
          fontFamily: 'Nunito, sans-serif',
          border: '1px solid rgba(92,107,192,0.28)',
        }}>{card.value}</div>
      )}
    </div>
  );
}
