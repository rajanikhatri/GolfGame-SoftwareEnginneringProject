import React from 'react';
import type { Card } from '../../context/GameContext';

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
  hearts: '#E53935',
  diamonds: '#E53935',
  spades: '#1a1a4e',
  clubs: '#1a3a1a',
  joker: 'linear-gradient(135deg, #E53935, #FBC02D, #43A047, #1E88E5)',
};

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  spades: '♠',
  clubs: '♣',
  joker: '★',
};

const SUIT_BG: Record<string, string> = {
  hearts: 'linear-gradient(145deg, #FFEBEE 0%, #FFCDD2 100%)',
  diamonds: 'linear-gradient(145deg, #FFF8E1 0%, #FFECB3 100%)',
  spades: 'linear-gradient(145deg, #E8EAF6 0%, #C5CAE9 100%)',
  clubs: 'linear-gradient(145deg, #E8F5E9 0%, #C8E6C9 100%)',
  joker: 'linear-gradient(145deg, #F3E5F5 0%, #E1BEE7 50%, #E3F2FD 100%)',
};

const SIZES = {
  sm: { width: 52, height: 72, borderRadius: 10, fontSize: 20, cornerSize: 10 },
  md: { width: 70, height: 98, borderRadius: 12, fontSize: 28, cornerSize: 12 },
  lg: { width: 88, height: 124, borderRadius: 14, fontSize: 38, cornerSize: 14 },
};

export function GameCard({
  card,
  faceDown,
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
  // `faceDown` (when provided) should override the card's persisted faceUp state.
  // This allows temporary reveals such as power-card peeks without mutating game state.
  const showBack = typeof faceDown === 'boolean' ? faceDown : !card?.faceUp;

  const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds';
  const isJoker = card?.suit === 'joker';

  const containerStyle: React.CSSProperties = {
    width: rotated ? dims.height : dims.width,
    height: rotated ? dims.width : dims.height,
    borderRadius: dims.borderRadius,
    border: selected ? '3px solid #FFC107' : '3px solid white',
    boxShadow: selected
      ? '0 0 0 3px #FFC107, 0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(255,193,7,0.6)'
      : glowing
      ? '0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(30,136,229,0.8)'
      : '0 6px 20px rgba(0,0,0,0.45)',
    cursor: selectable || onClick ? 'pointer' : 'default',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    transform: rotated ? 'rotate(90deg)' : undefined,
    ...style,
  };

  if (showBack) {
    return (
      <div
        style={containerStyle}
        className={`game-card game-card-back ${className}`}
        onClick={onClick}
      >
        <div style={{
          position: 'absolute', inset: 6,
          border: '1.5px solid rgba(255,255,255,0.2)',
          borderRadius: dims.borderRadius - 4,
          background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: dims.fontSize * 0.7, opacity: 0.3 }}>🂠</span>
        </div>
        <div style={{
          position: 'absolute', top: 6, left: 8,
          fontSize: 10, color: 'rgba(255,255,255,0.2)',
          fontFamily: 'Nunito, sans-serif', fontWeight: 800,
        }}>⛳</div>
      </div>
    );
  }

  if (!card) return null;

  const suitColor = SUIT_COLORS[card.suit] || '#333';
  const suitSymbol = SUIT_SYMBOLS[card.suit] || '?';
  const cardBg = SUIT_BG[card.suit] || 'white';
  const textColor = isRed || isJoker ? '#C62828' : '#1a1a2e';

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
              background: 'linear-gradient(135deg, #E53935, #FBC02D, #43A047, #1E88E5)',
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
              background: 'linear-gradient(135deg, #7B1FA2, #AB47BC)',
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
              color: isRed ? '#E53935' : suitColor,
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
          background: 'linear-gradient(135deg, rgba(123,31,162,0.08), rgba(30,136,229,0.08))',
          pointerEvents: 'none',
          borderRadius: dims.borderRadius - 3,
        }} />
      )}

      {/* King special - show "-2" value badge */}
      {card.rank === 'K' && (
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
          background: 'rgba(123,31,162,0.15)',
          borderRadius: 4, padding: '1px 6px',
          fontSize: 9, fontWeight: 800,
          color: '#6A1B9A',
          fontFamily: 'Nunito, sans-serif',
          border: '1px solid rgba(123,31,162,0.3)',
        }}>{card.value}</div>
      )}
    </div>
  );
}
