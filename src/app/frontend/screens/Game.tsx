import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Flag, RotateCcw, ChevronDown, Zap, Star, Eye } from 'lucide-react';
import { useGame, type Card, type Player, type PowerCardSelection } from '../../backend/GameContext';
import { GameCard } from '../components/game/GameCard';

// ─── Match Banner ────────────────────────────────────────────────────────────
function MatchBanner({ countdown }: { countdown: number }) {
  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90,
        background: 'linear-gradient(135deg, #FF6F00, #FFC107, #FF6F00)',
        backgroundSize: '200% auto',
        animation: 'shimmer 1s linear infinite',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 24,
        boxShadow: '0 4px 30px rgba(255,193,7,0.6)',
        borderBottom: '3px solid rgba(255,255,255,0.6)',
      }}
    >
      <Zap size={24} color="white" fill="white" />
      <span style={{
        fontSize: 24, fontWeight: 900, color: 'white',
        fontFamily: 'Nunito, sans-serif',
        textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        letterSpacing: '0.05em',
      }}>
        ⚡ MATCH WINDOW! ⚡
      </span>
      <div style={{
        width: 52, height: 52, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="52" height="52" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
          <circle
            cx="26" cy="26" r="22" fill="none" stroke="white" strokeWidth="4"
            strokeDasharray="138"
            strokeDashoffset={138 - (countdown / 3) * 138}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        <span style={{ fontSize: 18, fontWeight: 900, color: 'white', fontFamily: 'Nunito', zIndex: 1 }}>
          {countdown}
        </span>
      </div>
      <span style={{
        fontSize: 24, fontWeight: 900, color: 'white',
        fontFamily: 'Nunito, sans-serif',
        textShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        MATCH NOW!
      </span>
      <Zap size={24} color="white" fill="white" />
    </motion.div>
  );
}

// ─── Power Banner ─────────────────────────────────────────────────────────────
const POWER_CONFIG = {
  '7': {
    bg: 'linear-gradient(135deg, #1565C0, #42A5F5, #1565C0)',
    shadow: '0 4px 30px rgba(30,136,229,0.7)',
    title: '🔍 PEEK YOUR CARD',
    sub: 'Tap one of your face-down cards to peek at it for 3 seconds',
  },
  '8': {
    bg: 'linear-gradient(135deg, #6A1B9A, #AB47BC, #6A1B9A)',
    shadow: '0 4px 30px rgba(171,71,188,0.7)',
    title: '🕵️ SPY POWER!',
    sub: "Tap one of your opponent's cards to reveal it for 3 seconds",
  },
  '9': {
    bg: 'linear-gradient(135deg, #1B5E20, #43A047, #1B5E20)',
    shadow: '0 4px 30px rgba(67,160,71,0.7)',
    title: '👀 PEEK & SWAP',
    sub: 'Peek any 2 cards and optionally swap them — or skip the power',
  },
  '10': {
    bg: 'linear-gradient(135deg, #E65100, #FF7043, #E65100)',
    shadow: '0 4px 30px rgba(255,112,67,0.7)',
    title: '🔀 BLIND SWAP',
    sub: 'Blindly swap any 2 cards — or skip the power',
  },
} as const;

function PowerBanner({ power }: { power: '7' | '8' | '9' | '10' }) {
  const cfg = POWER_CONFIG[power];
  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90,
        background: cfg.bg,
        backgroundSize: '200% auto',
        animation: 'shimmer 1.2s linear infinite',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 16,
        boxShadow: cfg.shadow,
        borderBottom: '3px solid rgba(255,255,255,0.5)',
      }}
    >
      <Eye size={28} color="white" />
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 22, fontWeight: 900, color: 'white',
          fontFamily: 'Nunito, sans-serif',
          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          letterSpacing: '0.04em',
        }}>
          {cfg.title}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontFamily: 'Nunito' }}>
          {cfg.sub}
        </div>
      </div>
      <Eye size={28} color="white" />
    </motion.div>
  );
}

// ─── Final Round Banner ───────────────────────────────────────────────────────
function FinalRoundBanner({ knockerName }: { knockerName: string }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', bounce: 0.5 }}
      style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 80,
        background: 'linear-gradient(135deg, #B71C1C, #E53935, #B71C1C)',
        borderRadius: 24,
        border: '4px solid rgba(255,255,255,0.8)',
        padding: '28px 48px',
        textAlign: 'center',
        boxShadow: '0 0 60px rgba(229,57,53,0.7), 0 20px 60px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ fontSize: 44, marginBottom: 8 }}>🚨</div>
      <div style={{
        fontSize: 36, fontWeight: 900, color: 'white',
        fontFamily: 'Nunito, sans-serif',
        textShadow: '0 4px 12px rgba(0,0,0,0.4)',
        letterSpacing: '0.05em',
      }}>FINAL ROUND!</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontFamily: 'Nunito', marginTop: 8 }}>
        {knockerName} knocked! Everyone gets one more turn.
      </div>
    </motion.div>
  );
}

// ─── AI Thinking Indicator ────────────────────────────────────────────────────
function AIThinkingDots() {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 12px' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#FFC107',
          }}
          className={`thinking-dot-${i + 1}`}
        />
      ))}
    </div>
  );
}

function DiscardLandingCue() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.92 }}
      style={{
        position: 'absolute',
        top: -18,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg, rgba(255,193,7,0.96), rgba(255,152,0,0.96))',
        border: '2px solid rgba(255,255,255,0.7)',
        borderRadius: 999,
        padding: '4px 12px',
        fontSize: 10,
        fontWeight: 900,
        color: '#3E2723',
        fontFamily: 'Nunito',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        zIndex: 12,
        boxShadow: '0 8px 20px rgba(255,152,0,0.35)',
      }}
    >
      🤚 DISCARD HIDDEN HERE
    </motion.div>
  );
}

function CardHandCue({ mode }: { mode: 'tap' | 'swap' | 'draw' }) {
  const isTap = mode === 'tap';
  const isDraw = mode === 'draw';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.88 }}
      animate={isDraw
        ? {
            opacity: 1,
            x: [-6, 4, -2],
            y: [-18, -6, -14],
            rotate: [-10, -2, -8],
            scale: [1, 0.97, 1],
          }
        : isTap
        ? {
            opacity: 1,
            y: [-8, 2, -4],
            rotate: [-8, 0, -8],
            scale: [1, 0.95, 1],
          }
        : {
            opacity: 1,
            x: [-12, 10, -4],
            y: [-6, 2, -3],
            rotate: [-12, 4, -8],
            scale: [1, 1.02, 1],
          }}
      exit={{ opacity: 0, y: -12, scale: 0.84 }}
      transition={{
        duration: isDraw ? 1.05 : isTap ? 0.9 : 1,
        repeat: Infinity,
        repeatType: 'loop',
        ease: 'easeInOut',
      }}
      style={{
        position: 'absolute',
        top: isDraw ? -24 : -18,
        left: isDraw ? '58%' : isTap ? '50%' : '38%',
        transform: 'translateX(-50%)',
        zIndex: 8,
        pointerEvents: 'none',
        filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.28))',
      }}
    >
      <div style={{
        background: 'rgba(255,255,255,0.97)',
        border: '2px solid rgba(30,136,229,0.3)',
        borderRadius: 999,
        padding: isDraw ? '3px 9px' : isTap ? '2px 8px' : '2px 10px',
        fontSize: isDraw ? 25 : isTap ? 24 : 22,
        lineHeight: 1,
        boxShadow: '0 4px 12px rgba(255,255,255,0.25)',
      }}>
        {isDraw ? '👇' : isTap ? '👇' : '👉'}
      </div>
    </motion.div>
  );
}

interface GridSelection {
  row: number;
  col: number;
}

interface SwapCueSelection extends GridSelection {
  playerId: string;
}

interface PowerSelection extends PowerCardSelection {
  playerIndex: number;
  row: number;
  col: number;
}

// ─── Player Card Grid ─────────────────────────────────────────────────────────
function PlayerCardGrid({
  player, isActive, isYou, onCardClick, selectedForSwap,
  revealCards, powerSelectableCards, powerSelectedCards, swapCueCards, onPowerClick, peekPhase, reactionSelectable, onReactionClick, reactionSelected,
}: {
  player: Player;
  isActive: boolean;
  isYou: boolean;
  onCardClick?: (row: number, col: number) => void;
  selectedForSwap?: boolean;
  revealCards?: GridSelection[];
  powerSelectableCards?: GridSelection[];
  powerSelectedCards?: GridSelection[];
  swapCueCards?: GridSelection[];
  peekPhase?: boolean;
  onPowerClick?: (row: number, col: number) => void;
  reactionSelectable?: boolean;
  onReactionClick?: (row: number, col: number) => void;
  reactionSelected?: { row: number; col: number } | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {player.cards.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 6 }}>
          {row.map((card, ci) => {
            const isPeeked = Boolean(revealCards?.some(selection => selection.row === ri && selection.col === ci));
            const isPeekRow = peekPhase && isYou && ri === 1;

            // During peek phase bottom row: show card face-up by overriding faceUp
            const displayCard = (isPeekRow || isPeeked) && card
              ? { ...card, faceUp: true }
              : card;
            const faceDown = isYou ? !displayCard?.faceUp : !isPeeked;

            // Power click targets:
            // - card 7 (peek self): own hidden cards only
            // - card 8 (peek opponent): opponent hidden cards only
            const isPowerTarget = Boolean(powerSelectableCards?.some(selection => selection.row === ri && selection.col === ci));
            const isPowerSelected = Boolean(powerSelectedCards?.some(selection => selection.row === ri && selection.col === ci));
            const isSwapCue = Boolean(swapCueCards?.some(selection => selection.row === ri && selection.col === ci));
            const isReactionSelected = reactionSelected?.row === ri && reactionSelected?.col === ci;
            const isReactionTarget = Boolean(reactionSelectable && isYou && card && !reactionSelected);
            const isSwapTargetGuide = Boolean(isYou && selectedForSwap && card && !isPowerTarget && !isReactionTarget);
            const isInteractive = Boolean((isYou && selectedForSwap) || isPowerTarget || isReactionTarget);

            const handleClick = () => {
              if (isPowerTarget && onPowerClick) {
                onPowerClick(ri, ci);
              } else if (isReactionTarget && onReactionClick) {
                onReactionClick(ri, ci);
              } else if (!powerSelectableCards || powerSelectableCards.length === 0) {
                onCardClick?.(ri, ci);
              }
            };

            return (
              <div key={ci} style={{ position: 'relative' }}>
                <GameCard
                  card={displayCard ?? undefined}
                  faceDown={faceDown}
                  size={isYou ? 'md' : 'sm'}
                  selectable={isInteractive}
                  selected={isReactionSelected || isPowerSelected}
                  onClick={handleClick}
                  glowing={
                    (isActive && isYou && selectedForSwap) ||
                    isPeeked ||
                    isPowerTarget ||
                    isPowerSelected ||
                    isReactionTarget ||
                    isReactionSelected
                  }
                  style={
                    isPowerTarget
                      ? { boxShadow: '0 0 0 3px #FFC107, 0 0 20px rgba(255,193,7,0.8)', animation: 'pulse-glow 0.8s infinite' }
                      : isPowerSelected
                      ? { boxShadow: '0 0 0 3px #FFD54F, 0 0 24px rgba(255,213,79,0.9)', transform: 'scale(1.04)' }
                      : isReactionSelected
                      ? { boxShadow: '0 0 0 3px #66BB6A, 0 0 24px rgba(102,187,106,0.95)', transform: 'scale(1.04)' }
                      : isReactionTarget
                      ? { boxShadow: '0 0 0 3px #FFB300, 0 0 22px rgba(255,179,0,0.85)', animation: 'pulse-glow 0.8s infinite' }
                      : isPeeked
                      ? { boxShadow: '0 0 0 3px #42A5F5, 0 0 24px rgba(66,165,245,0.9)', transform: 'scale(1.06)' }
                      : undefined
                  }
                />
                {isInteractive && (
                  <button
                    type="button"
                    onClick={handleClick}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      margin: 0,
                      cursor: 'pointer',
                      zIndex: 6,
                    }}
                    aria-label="Select card"
                  />
                )}
                {isReactionSelected && (
                  <div style={{
                    position: 'absolute',
                    top: -8,
                    right: -6,
                    background: '#66BB6A',
                    borderRadius: 999,
                    padding: '2px 8px',
                    fontSize: 9,
                    fontWeight: 900,
                    color: 'white',
                    fontFamily: 'Nunito',
                    zIndex: 7,
                    boxShadow: '0 2px 8px rgba(102,187,106,0.6)',
                    whiteSpace: 'nowrap',
                  }}>
                    SENT
                  </div>
                )}
                {isSwapTargetGuide && <CardHandCue mode="tap" />}
                {isPowerSelected && <CardHandCue mode="tap" />}
                {isSwapCue && <CardHandCue mode="swap" />}
                {/* Column match indicator — only for your own cards */}
                {ri === 0 && isYou && player.cards[1]?.[ci] &&
                  card?.faceUp && player.cards[1][ci]?.faceUp &&
                  card?.value === player.cards[1][ci]?.value && (
                    <div style={{
                      position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                      background: '#4CAF50', borderRadius: 50, padding: '2px 6px',
                      fontSize: 9, fontWeight: 900, color: 'white', fontFamily: 'Nunito',
                      whiteSpace: 'nowrap', zIndex: 5,
                      boxShadow: '0 2px 6px rgba(76,175,80,0.5)',
                    }}>MATCH!</div>
                  )
                }
                {/* Peek indicator */}
                {isPeeked && (
                  <div style={{
                    position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(66,165,245,0.95)', borderRadius: 50, padding: '1px 8px',
                    fontSize: 9, fontWeight: 900, color: 'white', fontFamily: 'Nunito',
                    whiteSpace: 'nowrap', zIndex: 5,
                  }}>👁 PEEKING</div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Player Panel ─────────────────────────────────────────────────────────────
function PlayerPanelComp({
  player, isActive, isYou, position, onCardClick, selectedForSwap, aiThinking, score,
  revealCards, powerSelectableCards, powerSelectedCards, swapCueCards, onPowerClick, reactionSelectable, onReactionClick, reactionSelected, discardLandingCue,
}: {
  player: Player;
  isActive: boolean;
  isYou: boolean;
  position: 'top' | 'left' | 'right' | 'bottom';
  onCardClick?: (row: number, col: number) => void;
  selectedForSwap?: boolean;
  aiThinking: boolean;
  score: number | string;
  revealCards?: GridSelection[];
  powerSelectableCards?: GridSelection[];
  powerSelectedCards?: GridSelection[];
  swapCueCards?: GridSelection[];
  onPowerClick?: (row: number, col: number) => void;
  reactionSelectable?: boolean;
  onReactionClick?: (row: number, col: number) => void;
  reactionSelected?: { row: number; col: number } | null;
  discardLandingCue?: boolean;
}) {
  const isHorizontal = position === 'top' || position === 'bottom';

  return (
    <div style={{
      display: 'flex',
      flexDirection: isHorizontal ? 'column' : (position === 'left' ? 'row' : 'row-reverse'),
      alignItems: 'center',
      gap: 10,
    }}>
      {/* Player info */}
      <div style={{
        background: isActive
          ? `linear-gradient(135deg, ${player.color}30, ${player.color}15)`
          : 'rgba(255,255,255,0.05)',
        border: isActive ? `2px solid ${player.color}` : '2px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: '8px 14px',
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        alignItems: 'center',
        gap: 8,
        minWidth: isHorizontal ? 'auto' : 70,
        boxShadow: isActive ? `0 0 20px ${player.color}40` : 'none',
        transition: 'all 0.3s ease',
        animation: isActive ? 'glow-ring-active 1.5s ease-in-out infinite' : 'none',
      }}>
        {/* Avatar */}
        <div style={{
          width: isYou ? 44 : 36, height: isYou ? 44 : 36,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${player.color}50, ${player.color}20)`,
          border: `2px solid ${player.color}`,
          boxShadow: isActive ? `0 0 16px ${player.color}` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isYou ? 22 : 18,
          flexShrink: 0,
        }}>
          {player.avatar}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isHorizontal ? 'flex-start' : 'center', gap: 2 }}>
          <div style={{
            fontSize: 12, fontWeight: 900, color: isYou ? '#FFC107' : 'white',
            fontFamily: 'Nunito', letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {isYou && <span style={{ color: '#FFC107' }}>★</span>}
            {player.name}
            {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50', animation: 'pulse-glow 1s infinite' }} />}
          </div>
          <div className="score-badge" style={{ padding: '1px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Star size={9} fill="#FFC107" color="#FFC107" />
            <span style={{ fontSize: 11, fontWeight: 900, color: '#3E2723', fontFamily: 'Nunito' }}>
              {isYou ? score : '?'}
            </span>
          </div>
        </div>

        {isActive && player.isAI && aiThinking && <AIThinkingDots />}
      </div>

      {/* Cards */}
      <div style={{
        outline: powerSelectableCards && powerSelectableCards.length > 0 ? '3px solid rgba(255,193,7,0.5)' : 'none',
        borderRadius: 12,
        padding: powerSelectableCards && powerSelectableCards.length > 0 ? 6 : 0,
        transition: 'outline 0.2s',
        position: 'relative',
      }}>
        <AnimatePresence>
          {discardLandingCue && <DiscardLandingCue />}
        </AnimatePresence>
        <PlayerCardGrid
          player={player}
          isActive={isActive}
          isYou={isYou}
          onCardClick={onCardClick}
          selectedForSwap={selectedForSwap}
          revealCards={revealCards}
          powerSelectableCards={powerSelectableCards}
          powerSelectedCards={powerSelectedCards}
          swapCueCards={swapCueCards}
          onPowerClick={onPowerClick}
          reactionSelectable={reactionSelectable}
          onReactionClick={onReactionClick}
          reactionSelected={reactionSelected}
        />
      </div>
    </div>
  );
}

// ─── Draw / Discard Piles ─────────────────────────────────────────────────────
function PileArea({
  drawPile, discardPile, drawnCard, phase, isMyTurn,
  onDraw, onTakeDiscard,
}: {
  drawPile: Card[];
  discardPile: Card[];
  drawnCard: Card | null;
  phase: string;
  isMyTurn: boolean;
  onDraw: () => void;
  onTakeDiscard: () => void;
}) {
  const canDraw = isMyTurn && phase === 'draw';
  const discardTop = discardPile[0];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {/* Draw Pile */}
        <div className="flex flex-col items-center gap-2">
          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito', letterSpacing: '0.1em' }}>
            DRAW PILE
          </span>
          <div
            className="card-pile"
            onClick={canDraw ? onDraw : undefined}
            style={{ cursor: canDraw ? 'pointer' : 'default', position: 'relative' }}
          >
            {canDraw && !drawnCard && <CardHandCue mode="draw" />}
            {/* Stack shadow layers */}
            {[3, 2, 1].map(offset => (
              <div
                key={offset}
                style={{
                  position: 'absolute',
                  top: offset * 2, left: offset * 2,
                  width: 88, height: 124,
                  borderRadius: 14,
                  background: '#1a237e',
                  border: '3px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              />
            ))}
            <div style={{ position: 'relative', zIndex: 4 }}>
              <GameCard faceDown size="lg" glowing={canDraw} />
            </div>
            {canDraw && (
              <div style={{
                position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                fontSize: 10, fontWeight: 800, color: '#4CAF50',
                fontFamily: 'Nunito', letterSpacing: '0.05em',
                animation: 'pulse-glow 1.5s infinite',
              }}>
                ▲ DRAW CARD
              </div>
            )}
            <div style={{
              position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.4)', borderRadius: 50, padding: '2px 8px',
              fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito', whiteSpace: 'nowrap',
            }}>
              {drawPile.length > 0 ? `${drawPile.length} left` : '♾ reshuffling'}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <ChevronDown size={16} color="rgba(255,255,255,0.3)" />
          <div style={{ width: 2, height: 40, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
          <ChevronDown size={16} color="rgba(255,255,255,0.3)" />
        </div>

        {/* Discard Pile */}
        <div className="flex flex-col items-center gap-2">
          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito', letterSpacing: '0.1em' }}>
            DISCARD
          </span>
          <div
            className="card-pile"
            onClick={canDraw && discardTop ? onTakeDiscard : undefined}
            style={{ cursor: canDraw && discardTop ? 'pointer' : 'default', position: 'relative' }}
          >
            {discardPile.slice(1, 4).reverse().map((card, i) => (
              <div
                key={card.id}
                style={{
                  position: 'absolute',
                  top: i * 2, left: i * 2,
                  zIndex: i,
                  transform: `rotate(${(i - 1) * 5}deg)`,
                  opacity: 0.6,
                }}
              >
                <GameCard card={card} size="lg" />
              </div>
            ))}
            <div style={{ position: 'relative', zIndex: 10 }}>
              {discardTop ? (
                <motion.div
                  key={discardTop.id}
                  initial={{ scale: 1.2, y: -20, opacity: 0.5 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.4 }}
                >
                  <GameCard card={discardTop} size="lg" glowing={canDraw} />
                </motion.div>
              ) : (
                <div style={{
                  width: 88, height: 124, borderRadius: 14,
                  border: '3px dashed rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.03)',
                }}>
                  <span style={{ fontSize: 28, opacity: 0.2 }}>?</span>
                </div>
              )}
            </div>
            {canDraw && discardTop && (
              <div style={{
                position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                fontSize: 10, fontWeight: 800, color: '#FBC02D',
                fontFamily: 'Nunito', letterSpacing: '0.05em',
              }}>
                ▲ TAKE CARD
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawn card preview */}
      <AnimatePresence>
        {drawnCard && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 20 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}
          >
            <div style={{
              fontSize: 11, fontWeight: 800, color: '#FFC107',
              fontFamily: 'Nunito', letterSpacing: '0.1em',
            }}>
              DRAWN CARD — SWAP OR DISCARD
              {(drawnCard.rank === '7' || drawnCard.rank === '8') && (
                <span style={{
                  marginLeft: 8, background: drawnCard.rank === '7' ? '#1565C0' : '#6A1B9A',
                  borderRadius: 50, padding: '2px 10px', fontSize: 10, color: 'white',
                }}>
                  {drawnCard.rank === '7' ? '👁 PEEK SELF' : '🕵️ SPY'}
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              {isMyTurn && phase === 'swap' && <CardHandCue mode="swap" />}
              <GameCard card={drawnCard} size="md" glowing />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function countCardsInHand(player: Player): number {
  return player.cards.reduce(
    (total, row) => total + row.filter(card => card !== null).length,
    0,
  );
}

// ─── Main Game Screen ─────────────────────────────────────────────────────────
export default function Game() {
  const navigate = useNavigate();
  const {
    players, drawPile, discardPile, currentPlayerIndex,
    isMyTurn,
    drawnCard, phase, finalRound, knockedBy,
    matchWindowActive, matchCountdown, aiThinking,
    winner, drawFromPile, takeFromDiscard, swapCard, discardDrawn, reactToDiscard, knock,
    initGame, pendingPower, resolvePower, skipPower, disconnectedPlayerName, swapCountdown, endPeek,
    selectPower9Card, confirmPower9, usePower10,
  } = useGame();

  const [showFinalBanner, setShowFinalBanner] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [peekTimeLeft, setPeekTimeLeft] = useState(5);
  const [peekActive, setPeekActive] = useState(true);

  useEffect(() => {
    if (!peekActive) return;
    if (peekTimeLeft === 0) { setPeekActive(false); endPeek(); return; }
    const t = setTimeout(() => setPeekTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [peekTimeLeft, peekActive, endPeek]);

  // Peeked card: { playerIndex, row, col }
  const [peekedCards, setPeekedCards] = useState<Array<{
    playerIndex: number; row: number; col: number;
  }>>([]);
  const [powerSelections, setPowerSelections] = useState<PowerSelection[]>([]);
  const [swapCueCards, setSwapCueCards] = useState<SwapCueSelection[]>([]);
  const [submittedReactionCard, setSubmittedReactionCard] = useState<{ row: number; col: number } | null>(null);
  const [discardLandingPlayerIds, setDiscardLandingPlayerIds] = useState<string[]>([]);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discardLandingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swapCueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPlayersRef = useRef<Player[]>([]);
  const prevMatchWindowRef = useRef(matchWindowActive);
  const prevPhaseRef = useRef(phase);

  // Redirect if no game
  useEffect(() => {
    if (players.length === 0) {
      navigate('/');
    }
  }, [players, navigate]);

  useEffect(() => {
    if (finalRound) {
      setShowFinalBanner(true);
      const t = setTimeout(() => setShowFinalBanner(false), 3000);
      return () => clearTimeout(t);
    }
  }, [finalRound]);

  // Navigate to end screen
  useEffect(() => {
    if (winner) {
      const t = setTimeout(() => navigate('/end'), 2000);
      return () => clearTimeout(t);
    }
  }, [winner, navigate]);

  // Auto-enable swap mode when player draws
  useEffect(() => {
    setSwapMode(phase === 'swap' && isMyTurn);
  }, [phase, isMyTurn]);

  // Clear peeked card when power resolves
  useEffect(() => {
    if (!pendingPower) {
      setPeekedCards([]);
      setPowerSelections([]);
    }
  }, [pendingPower]);

  useEffect(() => {
    if (phase !== 'power') {
      setPeekedCards([]);
      setPowerSelections([]);
    }
  }, [phase]);

  useEffect(() => {
    if (!matchWindowActive) {
      setSubmittedReactionCard(null);
    }
  }, [matchWindowActive]);

  useEffect(() => {
    const previousPlayers = prevPlayersRef.current;
    const previousMatchWindow = prevMatchWindowRef.current;
    const previousPhase = prevPhaseRef.current;

    if (previousMatchWindow && !matchWindowActive && previousPlayers.length > 0 && players.length > 0) {
      const receivingPlayers = players
        .filter(player => {
          const previousPlayer = previousPlayers.find(prev => prev.id === player.id);
          const previousCount = previousPlayer ? countCardsInHand(previousPlayer) : 0;
          return countCardsInHand(player) > previousCount;
        })
        .map(player => player.id);

      if (discardLandingTimerRef.current) clearTimeout(discardLandingTimerRef.current);
      if (receivingPlayers.length > 0) {
        setDiscardLandingPlayerIds(receivingPlayers);
        discardLandingTimerRef.current = setTimeout(() => {
          setDiscardLandingPlayerIds([]);
        }, 1800);
      } else {
        setDiscardLandingPlayerIds([]);
      }
    }

    if (
      previousPlayers.length > 0 &&
      players.length > 0 &&
      phase === 'match_window' &&
      (previousPhase === 'swap' || previousPhase === 'power')
    ) {
      const changedSlots = players.flatMap(player => {
        const previousPlayer = previousPlayers.find(prev => prev.id === player.id);
        if (!previousPlayer) return [];

        const rows = Math.max(previousPlayer.cards.length, player.cards.length);
        const selections: SwapCueSelection[] = [];
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < 2; col++) {
            const previousCard = previousPlayer.cards[row]?.[col] ?? null;
            const currentCard = player.cards[row]?.[col] ?? null;
            if (previousCard?.id !== currentCard?.id && currentCard) {
              selections.push({ playerId: player.id, row, col });
            }
          }
        }
        return selections;
      });

      if (swapCueTimerRef.current) clearTimeout(swapCueTimerRef.current);
      if (changedSlots.length > 0) {
        setSwapCueCards(changedSlots);
        swapCueTimerRef.current = setTimeout(() => {
          setSwapCueCards([]);
        }, 1800);
      } else {
        setSwapCueCards([]);
      }
    }

    prevPlayersRef.current = players;
    prevMatchWindowRef.current = matchWindowActive;
    prevPhaseRef.current = phase;
  }, [players, matchWindowActive, phase]);

  useEffect(() => () => {
    if (discardLandingTimerRef.current) clearTimeout(discardLandingTimerRef.current);
    if (swapCueTimerRef.current) clearTimeout(swapCueTimerRef.current);
  }, []);

  const handleCardClick = useCallback((row: number, col: number) => {
    if (phase === 'swap' && isMyTurn) {
      swapCard(row, col);
      setSwapMode(false);
    }
  }, [phase, isMyTurn, swapCard]);

  const handleReactionCardClick = useCallback((row: number, col: number) => {
    if (matchWindowActive) {
      setSubmittedReactionCard({ row, col });
      reactToDiscard(row, col);
    }
  }, [matchWindowActive, reactToDiscard]);

  const isSamePowerSelection = useCallback((a: PowerSelection, b: PowerSelection) => {
    return a.playerId === b.playerId && a.cardFlatIndex === b.cardFlatIndex;
  }, []);

  const buildRevealCards = useCallback((playerIndex: number): GridSelection[] => {
    return peekedCards
      .filter(card => card.playerIndex === playerIndex)
      .map(card => ({ row: card.row, col: card.col }));
  }, [peekedCards]);

  const buildSelectedPowerCards = useCallback((playerIndex: number): GridSelection[] => {
    return powerSelections
      .filter(selection => selection.playerIndex === playerIndex)
      .map(selection => ({ row: selection.row, col: selection.col }));
  }, [powerSelections]);

  const buildSwapCueCards = useCallback((playerId: string): GridSelection[] => {
    return swapCueCards
      .filter(selection => selection.playerId === playerId)
      .map(selection => ({ row: selection.row, col: selection.col }));
  }, [swapCueCards]);

  const buildSelectablePowerCards = useCallback((playerIndex: number): GridSelection[] => {
    if (phase !== 'power' || !pendingPower || !isMyTurn) return [];
    const player = players[playerIndex];
    if (!player) return [];

    const firstSelection = powerSelections[0] ?? null;
    const selectionsFull = powerSelections.length >= 2;
    const singlePeekLocked = (pendingPower === '7' || pendingPower === '8') && peekedCards.length > 0;

    return player.cards.flatMap((row, ri) => row.flatMap((card, ci) => {
      if (!card) return [];
      const alreadySelected = powerSelections.some(selection =>
        selection.playerIndex === playerIndex && selection.row === ri && selection.col === ci
      );
      const canSelect = (
        (pendingPower === '7' && !singlePeekLocked && playerIndex === 0 && !card.faceUp) ||
        (pendingPower === '8' && !singlePeekLocked && playerIndex !== 0 && !card.faceUp) ||
        (
          pendingPower === '9' &&
          !alreadySelected &&
          !selectionsFull &&
          (!firstSelection || firstSelection.playerId !== player.id)
        ) ||
        (
          pendingPower === '10' &&
          !alreadySelected &&
          !selectionsFull &&
          (!firstSelection || firstSelection.playerId !== player.id)
        )
      );
      return canSelect ? [{ row: ri, col: ci }] : [];
    }));
  }, [phase, pendingPower, players, powerSelections, isMyTurn, peekedCards]);

  const commitPower9Choice = useCallback((doSwap: boolean) => {
    if (powerSelections.length < 2) return;
    confirmPower9(doSwap, powerSelections.map(selection => ({
      playerId: selection.playerId,
      cardFlatIndex: selection.cardFlatIndex,
    })));
  }, [confirmPower9, powerSelections]);

  // Called when player taps a card during power phase
  const handlePowerCardClick = useCallback((playerIndex: number, row: number, col: number) => {
    if (!pendingPower || phase !== 'power' || !isMyTurn) return;
    const targetCard = players[playerIndex]?.cards[row]?.[col];
    if (!targetCard) return;
    const flatIndex = row * 2 + col;
    const targetPlayerId = players[playerIndex]?.id ?? '';
    const selection: PowerSelection = { playerIndex, playerId: targetPlayerId, row, col, cardFlatIndex: flatIndex };

    if (pendingPower === '7' || pendingPower === '8') {
      if (peekedCards.length > 0) return;
      if (pendingPower === '7' && (playerIndex !== 0 || targetCard.faceUp)) return;
      if (pendingPower === '8' && (playerIndex === 0 || targetCard.faceUp)) return;
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);

      setPeekedCards([{ playerIndex, row, col }]);
      peekTimerRef.current = setTimeout(() => {
        resolvePower(targetPlayerId, flatIndex);
      }, 3000);
      return;
    }

    if (pendingPower === '9') {
      if (powerSelections.some(existing => isSamePowerSelection(existing, selection)) || powerSelections.length >= 2) {
        return;
      }
      selectPower9Card(targetPlayerId, flatIndex);
      setPowerSelections(prev => [...prev, selection]);
      setPeekedCards(prev => [...prev, { playerIndex, row, col }]);
      return;
    }

    if (pendingPower === '10') {
      if (powerSelections.some(existing => isSamePowerSelection(existing, selection)) || powerSelections.length >= 2) {
        return;
      }
      if (powerSelections.length === 1 && powerSelections[0].playerId === targetPlayerId) return;

      const nextSelections = [...powerSelections, selection];
      setPowerSelections(nextSelections);

      if (nextSelections.length === 2) {
        usePower10(
          { playerId: nextSelections[0].playerId, cardFlatIndex: nextSelections[0].cardFlatIndex },
          { playerId: nextSelections[1].playerId, cardFlatIndex: nextSelections[1].cardFlatIndex },
        );
      }
    }
  }, [
    pendingPower,
    phase,
    isMyTurn,
    peekedCards,
    players,
    powerSelections,
    resolvePower,
    selectPower9Card,
    usePower10,
      isSamePowerSelection,
  ]);

  if (players.length === 0) return null;

  const p1 = players[0];
  const p2 = players[1];
  const p3 = players[2];
  const p4 = players[3];

  const calcVisibleScore = (p: Player) => {
    let total = 0;
    for (let col = 0; col < 2; col++) {
      const top = p.cards[0]?.[col];
      const bot = p.cards[1]?.[col];
      if (top?.faceUp && bot?.faceUp && top.value === bot.value) continue;
      if (top?.faceUp) total += top.value;
      if (bot?.faceUp) total += bot.value;
    }
    for (let row = 2; row < p.cards.length; row++) {
      for (let col = 0; col < 2; col++) {
        if (p.cards[row]?.[col]?.faceUp) total += p.cards[row][col]!.value;
      }
    }
    return total;
  };

  const showPowerBanner = Boolean(pendingPower && peekedCards.length === 0 && powerSelections.length === 0);
  const reactionMode = matchWindowActive && !isMyTurn;

  return (
    <div
      className="min-h-screen w-full overflow-hidden font-game relative"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #1565C0 0%, #0D47A1 25%, #0D2137 65%, #060D1B 100%)',
        fontFamily: 'Nunito, sans-serif',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Subtle grid pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
      }} />

      {/* Table felt */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, height: 360,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(27,94,32,0.25) 0%, rgba(27,94,32,0.08) 60%, transparent 100%)',
        border: '2px solid rgba(27,94,32,0.2)',
        pointerEvents: 'none',
      }} />

      {/* Banners */}
      <AnimatePresence>
        {matchWindowActive && <MatchBanner countdown={matchCountdown} />}
      </AnimatePresence>
      <AnimatePresence>
        {showPowerBanner && pendingPower && <PowerBanner power={pendingPower} />}
      </AnimatePresence>
      <AnimatePresence>
        {showFinalBanner && knockedBy && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 79 }}
            />
            <FinalRoundBanner knockerName={players.find(p => p.id === knockedBy)?.name || 'Someone'} />
          </>
        )}
      </AnimatePresence>

      {/* Disconnect notification */}
      <AnimatePresence>
        {disconnectedPlayerName && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 95,
              background: 'rgba(229,57,53,0.92)',
              padding: '12px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 4px 20px rgba(229,57,53,0.5)',
            }}
          >
            <span style={{ fontSize: 20 }}>⚠️</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'white', fontFamily: 'Nunito, sans-serif' }}>
              {disconnectedPlayerName} left the game
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Peek phase overlay */}
      <AnimatePresence>
        {peekActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 95,
              display: 'flex', justifyContent: 'center',
              paddingTop: 16,
              pointerEvents: 'none',
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #1565C0, #42A5F5)',
              borderRadius: 20, padding: '16px 32px',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(30,136,229,0.6)',
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'white', fontFamily: 'Nunito' }}>
                👁 PEEK YOUR BOTTOM 2 CARDS!
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontFamily: 'Nunito', marginTop: 4 }}>
                Memorize them — they'll be hidden in{' '}
                <span style={{ color: '#FFC107', fontWeight: 900 }}>{peekTimeLeft}s</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px',
        background: 'rgba(0,0,0,0.25)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'relative', zIndex: 10,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 28, fontWeight: 900,
            background: 'linear-gradient(180deg, #FFFFFF, #82B1FF)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: 'Nunito',
          }}>⛳ GOLF</span>
          {finalRound && (
            <div style={{
              background: 'linear-gradient(135deg, #B71C1C, #E53935)',
              borderRadius: 50, padding: '4px 12px',
              fontSize: 11, fontWeight: 900, color: 'white',
              fontFamily: 'Nunito', letterSpacing: '0.05em',
              boxShadow: '0 4px 12px rgba(229,57,53,0.5)',
            }}>🚨 FINAL ROUND</div>
          )}
          {/* Power card legend */}
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center',
            background: 'rgba(255,255,255,0.06)', borderRadius: 50,
            padding: '4px 12px', border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito' }}>7=👁YOU</span>
            <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito' }}>8=🕵️OPP</span>
            <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito' }}>K♠/♣=-2</span>
            <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito' }}>★=-1</span>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 50, padding: '6px 14px',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isMyTurn ? '#4CAF50' : '#FFC107',
            animation: 'pulse-glow 1.5s infinite',
          }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: 'white', fontFamily: 'Nunito' }}>
            {pendingPower === '7' ? (isMyTurn ? '👁 PEEK YOUR CARD' : `👁 ${players[currentPlayerIndex]?.name} IS USING 7`)
              : pendingPower === '8' ? (isMyTurn ? '🕵️ SPY AN OPPONENT' : `🕵️ ${players[currentPlayerIndex]?.name} IS USING 8`)
              : pendingPower === '9' ? (isMyTurn
                ? (powerSelections.length < 2 ? `👀 PICK ${2 - powerSelections.length} CARD${powerSelections.length === 1 ? '' : 'S'}` : '👀 SWAP OR KEEP')
                : `👀 ${players[currentPlayerIndex]?.name} IS USING 9`)
              : pendingPower === '10' ? (isMyTurn
                ? (powerSelections.length === 0 ? '🔀 PICK 2 CARDS' : powerSelections.length === 1 ? '🔀 PICK 1 MORE CARD' : '🔀 SWAP SENT')
                : `🔀 ${players[currentPlayerIndex]?.name} IS USING 10`)
              : isMyTurn ? '🎮 YOUR TURN'
              : `${players[currentPlayerIndex]?.name}'S TURN`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="arcade-btn arcade-btn-blue"
            style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => { initGame(); }}
          >
            <RotateCcw size={14} /> RESTART
          </button>
          <button
            className="arcade-btn arcade-btn-red"
            style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => navigate('/')}
          >
            EXIT
          </button>
        </div>
      </div>

      {/* Game table */}
      <div style={{
        flex: 1, position: 'relative', zIndex: 5,
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 12,
        padding: '16px 20px',
        minHeight: 0,
      }}>

        {/* Top player (P3) */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          {p3 && (
            <PlayerPanelComp
              player={p3}
              isActive={currentPlayerIndex === 2}
              isYou={false}
              position="top"
              aiThinking={aiThinking && currentPlayerIndex === 2}
              score="?"
              revealCards={buildRevealCards(2)}
              powerSelectableCards={buildSelectablePowerCards(2)}
              powerSelectedCards={buildSelectedPowerCards(2)}
              swapCueCards={buildSwapCueCards(p3.id)}
              onPowerClick={(row, col) => handlePowerCardClick(2, row, col)}
              discardLandingCue={discardLandingPlayerIds.includes(p3.id)}
            />
          )}
        </div>

        {/* Left player (P2) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          {p2 && (
            <PlayerPanelComp
              player={p2}
              isActive={currentPlayerIndex === 1}
              isYou={false}
              position="left"
              aiThinking={aiThinking && currentPlayerIndex === 1}
              score="?"
              revealCards={buildRevealCards(1)}
              powerSelectableCards={buildSelectablePowerCards(1)}
              powerSelectedCards={buildSelectedPowerCards(1)}
              swapCueCards={buildSwapCueCards(p2.id)}
              onPowerClick={(row, col) => handlePowerCardClick(1, row, col)}
              discardLandingCue={discardLandingPlayerIds.includes(p2.id)}
            />
          )}
        </div>

        {/* Center area */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '8px 24px',
        }}>
          <PileArea
            drawPile={drawPile}
            discardPile={discardPile}
            drawnCard={drawnCard}
            phase={phase}
            isMyTurn={isMyTurn}
            onDraw={drawFromPile}
            onTakeDiscard={takeFromDiscard}
          />
        </div>

        {/* Right player (P4) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          {p4 && (
            <PlayerPanelComp
              player={p4}
              isActive={currentPlayerIndex === 3}
              isYou={false}
              position="right"
              aiThinking={aiThinking && currentPlayerIndex === 3}
              score="?"
              revealCards={buildRevealCards(3)}
              powerSelectableCards={buildSelectablePowerCards(3)}
              powerSelectedCards={buildSelectedPowerCards(3)}
              swapCueCards={buildSwapCueCards(p4.id)}
              onPowerClick={(row, col) => handlePowerCardClick(3, row, col)}
              discardLandingCue={discardLandingPlayerIds.includes(p4.id)}
            />
          )}
        </div>

        {/* Bottom player (P1 - YOU) */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {/* Player hand */}
          <div style={{
            position: 'relative',
            background: isMyTurn
              ? `linear-gradient(135deg, ${p1.color}20, ${p1.color}08)`
              : 'rgba(255,255,255,0.04)',
            border: isMyTurn ? `2px solid ${p1.color}80` : '2px solid rgba(255,255,255,0.08)',
            borderRadius: 20, padding: '16px 24px',
            boxShadow: isMyTurn ? `0 0 30px ${p1.color}30` : 'none',
            transition: 'all 0.3s ease',
            animation: isMyTurn ? 'glow-ring-active 2s ease-in-out infinite' : 'none',
          }}>
            <AnimatePresence>
              {discardLandingPlayerIds.includes(p1.id) && <DiscardLandingCue />}
            </AnimatePresence>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `radial-gradient(circle, ${p1.color}60, ${p1.color}20)`,
                border: `2px solid ${p1.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>{p1.avatar}</div>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#FFC107', fontFamily: 'Nunito' }}>
                ★ YOU ({p1.name})
              </span>
              <div className="score-badge" style={{ padding: '2px 10px' }}>
                <Star size={10} fill="#FFC107" color="#FFC107" style={{ marginRight: 4 }} />
                <span style={{ fontSize: 12, fontWeight: 900, color: '#3E2723', fontFamily: 'Nunito' }}>
                  {calcVisibleScore(p1)} pts
                </span>
              </div>
              {swapMode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    background: 'rgba(255,193,7,0.15)',
                    border: '2px solid rgba(255,193,7,0.6)',
                    borderRadius: 50, padding: '4px 14px',
                    fontSize: 12, fontWeight: 800, color: '#FFC107',
                    fontFamily: 'Nunito',
                  }}
                >
                  ⬆ TAP A CARD TO SWAP
                </motion.div>
              )}
              {isMyTurn && pendingPower === '7' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    background: 'rgba(30,136,229,0.2)',
                    border: '2px solid rgba(66,165,245,0.7)',
                    borderRadius: 50, padding: '4px 14px',
                    fontSize: 12, fontWeight: 800, color: '#42A5F5',
                    fontFamily: 'Nunito',
                  }}
                >
                  👁 TAP A FACE-DOWN CARD
                </motion.div>
              )}
              {isMyTurn && pendingPower === '9' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    background: 'rgba(67,160,71,0.18)',
                    border: '2px solid rgba(129,199,132,0.7)',
                    borderRadius: 50, padding: '4px 14px',
                    fontSize: 12, fontWeight: 800, color: '#81C784',
                    fontFamily: 'Nunito',
                  }}
                >
                  {powerSelections.length < 2 ? `👀 PICK ${2 - powerSelections.length} CARD${powerSelections.length === 1 ? '' : 'S'} TO PEEK` : '👀 SWAP OR KEEP'}
                </motion.div>
              )}
              {isMyTurn && pendingPower === '10' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    background: 'rgba(255,112,67,0.18)',
                    border: '2px solid rgba(255,112,67,0.7)',
                    borderRadius: 50, padding: '4px 14px',
                    fontSize: 12, fontWeight: 800, color: '#FF8A65',
                    fontFamily: 'Nunito',
                  }}
                >
                  {powerSelections.length === 0
                    ? '🔀 TAP FIRST CARD TO SWAP'
                    : powerSelections.length === 1
                    ? '🔀 TAP A CARD FROM ANOTHER PLAYER'
                    : '🔀 BLIND SWAP SENT'}
                </motion.div>
              )}
              {reactionMode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    background: 'rgba(255,179,0,0.16)',
                    border: '2px solid rgba(255,179,0,0.7)',
                    borderRadius: 50, padding: '4px 14px',
                    fontSize: 12, fontWeight: 800, color: '#FFB300',
                    fontFamily: 'Nunito',
                  }}
                >
                  {submittedReactionCard ? '✅ REACTION SENT' : '⚡ TAP YOUR MATCHING CARD'}
                </motion.div>
              )}
            </div>

            <PlayerCardGrid
              player={p1}
              isActive={isMyTurn}
              isYou={true}
              onCardClick={handleCardClick}
              selectedForSwap={swapMode}
              revealCards={buildRevealCards(0)}
              powerSelectableCards={buildSelectablePowerCards(0)}
              powerSelectedCards={buildSelectedPowerCards(0)}
              swapCueCards={buildSwapCueCards(p1.id)}
              onPowerClick={(row, col) => handlePowerCardClick(0, row, col)}
              reactionSelectable={reactionMode}
              onReactionClick={handleReactionCardClick}
              reactionSelected={submittedReactionCard}
              peekPhase={peekActive}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {phase === 'swap' && isMyTurn && drawnCard && (
              <>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="arcade-btn arcade-btn-blue"
                  style={{ fontSize: 14, padding: '10px 20px' }}
                  onClick={discardDrawn}
                >
                  🗑 DISCARD DRAWN
                </motion.button>
                {swapCountdown !== null && (
                  <div style={{
                    fontSize: 13, fontWeight: 900,
                    color: swapCountdown <= 3 ? '#FF5252' : '#FFC107',
                    fontFamily: 'Nunito',
                    animation: swapCountdown <= 3 ? 'pulse-glow 0.6s infinite' : 'none',
                  }}>
                    ⏱ {swapCountdown}s
                  </div>
                )}
              </>
            )}

            {/* Skip power button — available for all power ranks */}
            {phase === 'power' && isMyTurn &&
              !((pendingPower === '7' || pendingPower === '8') && peekedCards.length > 0) &&
              !(pendingPower === '9' && powerSelections.length > 0) &&
              !(pendingPower === '10' && powerSelections.length === 2) && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.95 }}
                className="arcade-btn arcade-btn-blue"
                style={{ fontSize: 13, padding: '10px 18px' }}
                onClick={skipPower}
              >
                ⏭ SKIP POWER
              </motion.button>
            )}

            {phase === 'power' && isMyTurn && pendingPower === '9' && powerSelections.length === 2 && (
              <>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="arcade-btn arcade-btn-blue"
                  style={{ fontSize: 13, padding: '10px 18px' }}
                  onClick={() => commitPower9Choice(false)}
                >
                  👀 KEEP CARDS
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="arcade-btn arcade-btn-blue"
                  style={{ fontSize: 13, padding: '10px 18px' }}
                  onClick={() => commitPower9Choice(true)}
                >
                  🔀 SWAP SELECTED
                </motion.button>
              </>
            )}

            {!finalRound && isMyTurn && phase !== 'power' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="arcade-btn arcade-btn-red"
                style={{ fontSize: 15, padding: '12px 24px' }}
                onClick={knock}
              >
                <Flag size={16} style={{ marginRight: 6 }} />
                KNOCK
              </motion.button>
            )}

            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '8px 16px',
              fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
              fontFamily: 'Nunito', textAlign: 'center',
            }}>
              {phase === 'power' && isMyTurn && pendingPower === '7' && '👁 Tap a face-down card to peek, or skip'}
              {phase === 'power' && isMyTurn && pendingPower === '8' && '🕵️ Tap one opponent card to spy, or skip'}
              {phase === 'power' && isMyTurn && pendingPower === '9' && powerSelections.length < 2 && '👀 Pick 2 cards from 2 different players'}
              {phase === 'power' && isMyTurn && pendingPower === '9' && powerSelections.length === 2 && '👀 Optional swap: choose KEEP or SWAP'}
              {phase === 'power' && isMyTurn && pendingPower === '10' && powerSelections.length === 0 && '🔀 Tap any card to start a blind swap'}
              {phase === 'power' && isMyTurn && pendingPower === '10' && powerSelections.length === 1 && '🔀 Tap a card from another player to complete the blind swap'}
              {phase === 'power' && isMyTurn && pendingPower === '10' && powerSelections.length === 2 && '🔀 Blind swap sent. Waiting for game state update...'}
              {phase === 'power' && !isMyTurn && `⏳ ${players[currentPlayerIndex]?.name} is using power ${pendingPower}...`}
              {phase === 'draw' && isMyTurn && '🎯 Draw a card to start your turn'}
              {phase === 'swap' && isMyTurn && '🔄 Tap a card to swap, or discard'}
              {reactionMode && (submittedReactionCard ? '✅ Reaction submitted' : '⚡ Reaction window: tap your matching card now')}
              {!reactionMode && !isMyTurn && phase !== 'power' && `⏳ Wait for ${players[currentPlayerIndex]?.name}...`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
