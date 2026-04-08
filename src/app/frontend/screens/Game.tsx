import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Flag, RotateCcw, ChevronDown, Zap, Star, Eye } from 'lucide-react';
import { useGame, type Card, type Player, type PowerCardSelection } from '../../backend/GameContext';
import { HandCue, SwapExchangeCue, type OverlayPoint } from '../components/HandCue';
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

type PowerTone = keyof typeof POWER_CONFIG;

const POWER_ACCENTS: Record<PowerTone, {
  glow: string;
  outline: string;
  softFill: string;
  badgeFill: string;
  badgeBorder: string;
  text: string;
}> = {
  '7': {
    glow: 'rgba(66,165,245,0.34)',
    outline: 'rgba(66,165,245,0.68)',
    softFill: 'rgba(66,165,245,0.16)',
    badgeFill: 'rgba(21,101,192,0.92)',
    badgeBorder: 'rgba(255,255,255,0.36)',
    text: '#E3F2FD',
  },
  '8': {
    glow: 'rgba(171,71,188,0.34)',
    outline: 'rgba(171,71,188,0.68)',
    softFill: 'rgba(171,71,188,0.16)',
    badgeFill: 'rgba(106,27,154,0.92)',
    badgeBorder: 'rgba(255,255,255,0.34)',
    text: '#F3E5F5',
  },
  '9': {
    glow: 'rgba(129,199,132,0.34)',
    outline: 'rgba(129,199,132,0.7)',
    softFill: 'rgba(129,199,132,0.16)',
    badgeFill: 'rgba(27,94,32,0.92)',
    badgeBorder: 'rgba(255,255,255,0.34)',
    text: '#E8F5E9',
  },
  '10': {
    glow: 'rgba(255,138,101,0.34)',
    outline: 'rgba(255,138,101,0.72)',
    softFill: 'rgba(255,138,101,0.16)',
    badgeFill: 'rgba(230,81,0,0.94)',
    badgeBorder: 'rgba(255,255,255,0.36)',
    text: '#FFF3E0',
  },
};

function getPowerBannerCopy(
  power: PowerTone,
  isActingPlayer: boolean,
  actorName: string,
  selectionCount: number,
  hasPeekedCard: boolean,
): {
  title: string;
  sub: string;
  stepLabel: string;
  progressCurrent?: number;
  progressTotal?: number;
} {
  if (!isActingPlayer) {
    return {
      title: POWER_CONFIG[power].title,
      sub: `${actorName} is resolving this power card.`,
      stepLabel: 'Waiting',
    };
  }

  switch (power) {
    case '7':
      return {
        title: 'Peek One Hidden Card',
        sub: hasPeekedCard
          ? 'Holding the reveal for a moment so you can memorize it.'
          : 'Your hidden cards are active. Face-up cards stay dimmed.',
        stepLabel: hasPeekedCard ? 'Revealing card' : 'Tap a hidden card',
        progressCurrent: hasPeekedCard ? 1 : 0,
        progressTotal: 1,
      };
    case '8':
      return {
        title: 'Spy An Opponent Card',
        sub: hasPeekedCard
          ? 'Holding the reveal for a moment so you can memorize it.'
          : 'Only opponent hidden cards are active right now.',
        stepLabel: hasPeekedCard ? 'Revealing card' : 'Tap an opponent card',
        progressCurrent: hasPeekedCard ? 1 : 0,
        progressTotal: 1,
      };
    case '9':
      return {
        title: selectionCount < 2 ? 'Peek And Prepare A Swap' : 'Confirm The Peek Swap',
        sub: selectionCount === 0
          ? 'Choose the first card to peek. Valid targets glow and everything else fades back.'
          : selectionCount === 1
          ? 'First card locked. Pick a card from a different player for the second reveal.'
          : 'Both cards are selected. Choose Keep or Swap below.',
        stepLabel: selectionCount === 0
          ? 'Pick 1 of 2'
          : selectionCount === 1
          ? 'Pick 2 of 2'
          : 'Ready to confirm',
        progressCurrent: Math.min(selectionCount, 2),
        progressTotal: 2,
      };
    case '10':
      return {
        title: selectionCount < 2 ? 'Blind Swap In Progress' : 'Sending Blind Swap',
        sub: selectionCount === 0
          ? 'Choose the first card to start the swap.'
          : selectionCount === 1
          ? 'First card locked. Pick a card from another player to complete the swap.'
          : 'Swap selections locked in. Waiting for the board to update.',
        stepLabel: selectionCount === 0
          ? 'Pick 1 of 2'
          : selectionCount === 1
          ? 'Pick 2 of 2'
          : 'Resolving swap',
        progressCurrent: Math.min(selectionCount, 2),
        progressTotal: 2,
      };
  }
}

function PowerBanner({
  power,
  title,
  sub,
  stepLabel,
  progressCurrent,
  progressTotal,
}: {
  power: PowerTone;
  title: string;
  sub: string;
  stepLabel: string;
  progressCurrent?: number;
  progressTotal?: number;
}) {
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
        gap: 18,
        boxShadow: cfg.shadow,
        borderBottom: '3px solid rgba(255,255,255,0.5)',
      }}
    >
      <Eye size={28} color="white" />
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 999,
          padding: '4px 12px',
          background: 'rgba(255,255,255,0.14)',
          border: '1px solid rgba(255,255,255,0.18)',
          fontSize: 11,
          fontWeight: 900,
          color: 'rgba(255,255,255,0.92)',
          fontFamily: 'Nunito',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          <span>{stepLabel}</span>
          {progressTotal ? (
            <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
              {Array.from({ length: progressTotal }).map((_, index) => (
                <span
                  key={index}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: index < (progressCurrent ?? 0)
                      ? 'rgba(255,255,255,0.96)'
                      : 'rgba(255,255,255,0.35)',
                    boxShadow: index < (progressCurrent ?? 0)
                      ? '0 0 10px rgba(255,255,255,0.55)'
                      : 'none',
                  }}
                />
              ))}
            </span>
          ) : null}
        </div>
        <div style={{
          fontSize: 22, fontWeight: 900, color: 'white',
          fontFamily: 'Nunito, sans-serif',
          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          letterSpacing: '0.04em',
        }}>
          {title}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontFamily: 'Nunito' }}>
          {sub}
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

function PowerPanelCue({
  text,
  power,
}: {
  text: string;
  power: PowerTone;
}) {
  const accent = POWER_ACCENTS[power];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.92 }}
      animate={{ opacity: 1, y: [4, 0, 4], scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.9 }}
      transition={{
        duration: 1.6,
        repeat: Infinity,
        repeatType: 'mirror',
        ease: 'easeInOut',
      }}
      style={{
        position: 'absolute',
        top: -18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 14,
        pointerEvents: 'none',
      }}
    >
      <motion.div
        animate={{
          opacity: [0.28, 0.48, 0.28],
          scale: [0.96, 1.06, 0.96],
        }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          inset: -10,
          borderRadius: 999,
          background: `radial-gradient(circle, ${accent.glow} 0%, transparent 72%)`,
          filter: 'blur(8px)',
        }}
      />
      <div style={{
        position: 'absolute',
        left: '50%',
        bottom: -7,
        width: 12,
        height: 12,
        transform: 'translateX(-50%) rotate(45deg)',
        background: accent.badgeFill,
        borderRight: `1px solid ${accent.badgeBorder}`,
        borderBottom: `1px solid ${accent.badgeBorder}`,
        opacity: 0.94,
      }} />
      <div style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 999,
        background: accent.badgeFill,
        border: `1px solid ${accent.badgeBorder}`,
        color: accent.text,
        fontSize: 10,
        fontWeight: 900,
        fontFamily: 'Nunito',
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
        boxShadow: `0 10px 24px ${accent.glow}`,
        textTransform: 'uppercase',
      }}>
        <motion.span
          animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)',
            boxShadow: '0 0 10px rgba(255,255,255,0.52)',
          }}
        />
        <span>{text}</span>
      </div>
    </motion.div>
  );
}

interface GridSelection {
  row: number;
  col: number;
}

interface OrderedGridSelection extends GridSelection {
  order: number;
}

interface SwapCueSelection extends GridSelection {
  playerId: string;
}

interface PowerSelection extends PowerCardSelection {
  playerIndex: number;
  row: number;
  col: number;
}

interface CardAnchor extends OverlayPoint {
  width: number;
  height: number;
}

interface PowerSwapAnimation {
  from: CardAnchor;
  to: CardAnchor;
}

type RegisterCardNode = (
  playerId: string,
  row: number,
  col: number,
  node: HTMLDivElement | null,
) => void;

// ─── Player Card Grid ─────────────────────────────────────────────────────────
function PlayerCardGrid({
  player, isActive, isYou, onCardClick, selectedForSwap,
  revealCards, powerSelectableCards, powerSelectedCards, powerConfirmCards, powerSwapGlowCardIds, powerModeActive, powerTone, onPowerClick, peekPhase, reactionSelectable, onReactionClick, reactionSelected, registerCardNode,
}: {
  player: Player;
  isActive: boolean;
  isYou: boolean;
  onCardClick?: (row: number, col: number) => void;
  selectedForSwap?: boolean;
  revealCards?: GridSelection[];
  powerSelectableCards?: GridSelection[];
  powerSelectedCards?: OrderedGridSelection[];
  powerConfirmCards?: GridSelection[];
  powerSwapGlowCardIds?: string[];
  powerModeActive?: boolean;
  powerTone?: PowerTone | null;
  peekPhase?: boolean;
  onPowerClick?: (row: number, col: number) => void;
  reactionSelectable?: boolean;
  onReactionClick?: (playerId: string, row: number, col: number) => void;
  reactionSelected?: { playerId: string; row: number; col: number } | null;
  registerCardNode?: RegisterCardNode;
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
            const powerSelection = powerSelectedCards?.find(selection => selection.row === ri && selection.col === ci);
            const powerSelectionOrder = powerSelection?.order ?? null;
            const isPowerSelected = powerSelectionOrder !== null;
            const isPowerConfirm = Boolean(powerConfirmCards?.some(selection => selection.row === ri && selection.col === ci));
            const isPowerSwapGlow = Boolean(displayCard?.id && powerSwapGlowCardIds?.includes(displayCard.id));
            const isReactionSelected =
              reactionSelected?.playerId === player.id &&
              reactionSelected?.row === ri &&
              reactionSelected?.col === ci;
            const isReactionTarget = Boolean(reactionSelectable && card && !reactionSelected);
            const shouldDimForPower = Boolean(
              powerModeActive &&
              card &&
              !isPowerTarget &&
              !isPowerSelected &&
              !isPowerConfirm &&
              !isPeeked &&
              !isReactionTarget &&
              !isReactionSelected
            );
            const isInteractive = Boolean((isYou && selectedForSwap && card) || isPowerTarget || isReactionTarget);
            const powerAccent = powerTone ? POWER_ACCENTS[powerTone] : null;

            const handleClick = () => {
              if (isPowerTarget && onPowerClick) {
                onPowerClick(ri, ci);
              } else if (isReactionTarget && onReactionClick) {
                onReactionClick(player.id, ri, ci);
              } else if ((!powerSelectableCards || powerSelectableCards.length === 0) && card) {
                onCardClick?.(ri, ci);
              }
            };

            return (
              <motion.div
                key={ci}
                ref={node => registerCardNode?.(player.id, ri, ci, node)}
                initial={false}
                animate={isPowerConfirm
                  ? {
                      opacity: shouldDimForPower ? 0.36 : 1,
                      y: [0, -8, -2, 0],
                      scale: [1, 1.08, 1.03, 1],
                    }
                  : {
                      opacity: shouldDimForPower ? 0.36 : 1,
                      y: isPowerSelected ? -6 : isPowerTarget ? -4 : 0,
                      scale: isPowerSelected ? 1.05 : isPowerTarget ? 1.025 : 1,
                    }}
                transition={isPowerConfirm
                  ? { duration: 0.72, times: [0, 0.42, 0.72, 1], ease: 'easeOut' }
                  : { type: 'spring', stiffness: 280, damping: 24, opacity: { duration: 0.18 } }}
                style={{
                  position: 'relative',
                  filter: shouldDimForPower ? 'grayscale(0.32) saturate(0.72) brightness(0.8)' : undefined,
                }}
              >
                {isPowerSwapGlow && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: -5,
                      borderRadius: isYou ? 16 : 14,
                      pointerEvents: 'none',
                      zIndex: 1,
                      background: 'radial-gradient(circle, rgba(239,83,80,0.22) 0%, rgba(239,83,80,0.12) 42%, transparent 72%)',
                      boxShadow: 'inset 0 0 0 2px rgba(255,138,128,0.78), 0 0 18px rgba(239,83,80,0.42), 0 0 34px rgba(183,28,28,0.24)',
                      animation: 'power-swap-red-glow 5s ease-out forwards',
                    }}
                  />
                )}
                <GameCard
                  card={displayCard ?? undefined}
                  faceDown={faceDown}
                  size={isYou ? 'md' : 'sm'}
                  selectable={isInteractive}
                  selected={isReactionSelected || isPowerSelected}
                  onClick={handleClick}
                  glowing={
                    isPeeked ||
                    isPowerTarget ||
                    isPowerSelected ||
                    isReactionTarget ||
                    isReactionSelected
                  }
                  style={
                    isPowerSelected && powerAccent
                      ? {
                          boxShadow: `0 0 0 3px ${powerAccent.outline}, 0 0 26px ${powerAccent.glow}`,
                          transform: 'translateY(-2px) scale(1.04)',
                        }
                      : isPowerTarget && powerAccent
                      ? {
                          boxShadow: `0 0 0 3px ${powerAccent.outline}, 0 0 24px ${powerAccent.glow}`,
                          transform: 'translateY(-1px) scale(1.02)',
                          animation: 'pulse-glow 1s ease-in-out infinite',
                        }
                      : isPowerConfirm && powerAccent
                      ? {
                          boxShadow: `0 0 0 3px ${powerAccent.outline}, 0 0 28px ${powerAccent.glow}`,
                          transform: 'scale(1.03)',
                        }
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
                {isPowerSelected && powerAccent && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.88 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      background: powerAccent.badgeFill,
                      borderRadius: 999,
                      padding: '2px 8px',
                      fontSize: 9,
                      fontWeight: 900,
                      color: powerAccent.text,
                      fontFamily: 'Nunito',
                      zIndex: 8,
                      border: `1px solid ${powerAccent.badgeBorder}`,
                      boxShadow: `0 4px 12px ${powerAccent.glow}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {powerSelectionOrder === 1 ? '1ST PICK' : '2ND PICK'}
                  </motion.div>
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
                {isPowerConfirm && powerAccent && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.9 }}
                    style={{
                      position: 'absolute',
                      bottom: -20,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: powerAccent.badgeFill,
                      borderRadius: 999,
                      padding: '2px 8px',
                      fontSize: 9,
                      fontWeight: 900,
                      color: powerAccent.text,
                      fontFamily: 'Nunito',
                      zIndex: 7,
                      border: `1px solid ${powerAccent.badgeBorder}`,
                      boxShadow: `0 4px 12px ${powerAccent.glow}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    SWAPPED
                  </motion.div>
                )}
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
              </motion.div>
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
  revealCards, powerSelectableCards, powerSelectedCards, powerConfirmCards, powerSwapGlowCardIds, powerModeActive, powerTone, powerGuideText, onPowerClick, reactionSelectable, onReactionClick, reactionSelected, discardLandingCue, registerCardNode,
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
  powerSelectedCards?: OrderedGridSelection[];
  powerConfirmCards?: GridSelection[];
  powerSwapGlowCardIds?: string[];
  powerModeActive?: boolean;
  powerTone?: PowerTone | null;
  powerGuideText?: string | null;
  onPowerClick?: (row: number, col: number) => void;
  reactionSelectable?: boolean;
  onReactionClick?: (playerId: string, row: number, col: number) => void;
  reactionSelected?: { playerId: string; row: number; col: number } | null;
  discardLandingCue?: boolean;
  registerCardNode?: RegisterCardNode;
}) {
  const isHorizontal = position === 'top' || position === 'bottom';
  const hasPowerTargets = Boolean(powerSelectableCards && powerSelectableCards.length > 0);
  const hasPowerSelections = Boolean(powerSelectedCards && powerSelectedCards.length > 0);
  const hasPowerConfirmCards = Boolean(powerConfirmCards && powerConfirmCards.length > 0);
  const shouldDimForPower = Boolean(powerModeActive && !hasPowerTargets && !hasPowerSelections && !hasPowerConfirmCards);
  const powerAccent = powerTone ? POWER_ACCENTS[powerTone] : null;
  const showInstructionalPanelCue = Boolean(isYou && powerModeActive && powerGuideText && powerTone);

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
        outline: hasPowerTargets && powerAccent ? `3px solid ${powerAccent.outline}` : 'none',
        borderRadius: 12,
        padding: hasPowerTargets ? 6 : 0,
        transition: 'all 0.24s ease',
        position: 'relative',
        opacity: shouldDimForPower ? 0.56 : 1,
        filter: shouldDimForPower ? 'saturate(0.72) brightness(0.82)' : undefined,
        boxShadow: hasPowerTargets && powerAccent
          ? `0 0 0 1px ${powerAccent.outline}, 0 18px 34px ${powerAccent.glow}`
          : hasPowerSelections && powerAccent
          ? `0 12px 28px ${powerAccent.glow}`
          : hasPowerConfirmCards && powerAccent
          ? `0 12px 30px ${powerAccent.glow}`
          : undefined,
        background: hasPowerTargets && powerAccent
          ? `linear-gradient(135deg, ${powerAccent.softFill}, rgba(255,255,255,0.04))`
          : undefined,
        transform: hasPowerTargets ? 'translateY(-2px)' : undefined,
      }}>
        <AnimatePresence>
          {discardLandingCue && <DiscardLandingCue />}
        </AnimatePresence>
        <AnimatePresence>
          {showInstructionalPanelCue && powerGuideText && powerTone && (
            <PowerPanelCue text={powerGuideText} power={powerTone} />
          )}
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
          powerConfirmCards={powerConfirmCards}
          powerSwapGlowCardIds={powerSwapGlowCardIds}
          powerModeActive={powerModeActive}
          powerTone={powerTone}
          onPowerClick={onPowerClick}
          reactionSelectable={reactionSelectable}
          onReactionClick={onReactionClick}
          reactionSelected={reactionSelected}
          registerCardNode={registerCardNode}
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
  const gameRootRef = useRef<HTMLDivElement | null>(null);
  const cardNodeMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const {
    myPlayerId,
    players, drawPile, discardPile, currentPlayerIndex,
    isMyTurn, giveAwayCardAction,
    drawnCard, phase, finalRound, knockedBy,
    matchWindowActive, matchCountdown, aiThinking,
    winner, drawFromPile, takeFromDiscard, swapCard, discardDrawn, reactToDiscard, knock,
    initGame, pendingPower, resolvePower, skipPower, disconnectedPlayerName, swapCountdown, endPeek,
    selectPower9Card, confirmPower9, usePower10, giveawayGiverId,
  } = useGame();

  const [showFinalBanner, setShowFinalBanner] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [peekTimeLeft, setPeekTimeLeft] = useState(5);
  const [peekActive, setPeekActive] = useState(true);
  const p1 = players[0];
  const p2 = players[1];
  const p3 = players[2];
  const p4 = players[3];
  const canGiveAway = phase === 'giveaway' && giveawayGiverId === p1?.id;
  const giveawayGiverName = players.find(player => player.id === giveawayGiverId)?.name ?? 'Someone';

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
  const [powerConfirmCards, setPowerConfirmCards] = useState<SwapCueSelection[]>([]);
  const [powerSwapGlowCardIds, setPowerSwapGlowCardIds] = useState<string[]>([]);
  const [selectedPowerCueAnchor, setSelectedPowerCueAnchor] = useState<CardAnchor | null>(null);
  const [powerSwapAnimation, setPowerSwapAnimation] = useState<PowerSwapAnimation | null>(null);
  const [powerCompletionLabel, setPowerCompletionLabel] = useState<string | null>(null);
  const [submittedReactionCard, setSubmittedReactionCard] = useState<{
    playerId: string;
    row: number;
    col: number;
  } | null>(null);
  const [discardLandingPlayerIds, setDiscardLandingPlayerIds] = useState<string[]>([]);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discardLandingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const powerConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const powerSwapGlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const powerSwapAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const powerCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPlayersRef = useRef<Player[]>([]);
  const prevMatchWindowRef = useRef(matchWindowActive);
  const prevPhaseRef = useRef(phase);
  const prevPendingPowerRef = useRef<typeof pendingPower>(pendingPower);
  const prevGuidancePowerRef = useRef<typeof pendingPower>(pendingPower);

  const buildCardNodeKey = useCallback((playerId: string, row: number, col: number) => {
    return `${playerId}:${row}:${col}`;
  }, []);

  const registerCardNode = useCallback<RegisterCardNode>((playerId, row, col, node) => {
    const key = buildCardNodeKey(playerId, row, col);
    if (node) {
      cardNodeMapRef.current.set(key, node);
    } else {
      cardNodeMapRef.current.delete(key);
    }
  }, [buildCardNodeKey]);

  const measureCardAnchor = useCallback((playerId: string, row: number, col: number): CardAnchor | null => {
    const rootNode = gameRootRef.current;
    const cardNode = cardNodeMapRef.current.get(buildCardNodeKey(playerId, row, col));
    if (!rootNode || !cardNode) return null;

    const rootRect = rootNode.getBoundingClientRect();
    const cardRect = cardNode.getBoundingClientRect();

    return {
      x: cardRect.left - rootRect.left + cardRect.width / 2,
      y: cardRect.top - rootRect.top + cardRect.height / 2,
      width: cardRect.width,
      height: cardRect.height,
    };
  }, [buildCardNodeKey]);

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
    if (prevGuidancePowerRef.current !== pendingPower) {
      setPeekedCards([]);
      setPowerSelections([]);
      setSelectedPowerCueAnchor(null);
    }
    prevGuidancePowerRef.current = pendingPower;
  }, [pendingPower]);

  useEffect(() => {
    if (phase === 'power' && pendingPower && isMyTurn && currentPlayerIndex === 0) return;
    setPeekedCards([]);
    setPowerSelections([]);
    setSelectedPowerCueAnchor(null);
  }, [phase, pendingPower, isMyTurn, currentPlayerIndex]);

  useEffect(() => {
    if (!matchWindowActive) {
      setSubmittedReactionCard(null);
    }
  }, [matchWindowActive]);

  const selectedSwapCueActive =
    phase === 'power' &&
    isMyTurn &&
    currentPlayerIndex === 0 &&
    players[0]?.id === myPlayerId &&
    (pendingPower === '9' || pendingPower === '10') &&
    powerSelections.length === 1 &&
    !powerSwapAnimation;

  useEffect(() => {
    if (!selectedSwapCueActive) {
      setSelectedPowerCueAnchor(null);
    }
  }, [selectedSwapCueActive]);

  useEffect(() => {
    if (powerSwapAnimation) {
      setSelectedPowerCueAnchor(null);
    }
  }, [powerSwapAnimation]);

  useLayoutEffect(() => {
    const selectedSwapCard = selectedSwapCueActive
      ? powerSelections[0]
      : null;

    if (!selectedSwapCard) {
      setSelectedPowerCueAnchor(null);
      return;
    }

    const updateAnchor = () => {
      setSelectedPowerCueAnchor(
        measureCardAnchor(
          selectedSwapCard.playerId,
          selectedSwapCard.row,
          selectedSwapCard.col,
        ),
      );
    };

    const frame = window.requestAnimationFrame(updateAnchor);
    window.addEventListener('resize', updateAnchor);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateAnchor);
    };
  }, [
    selectedSwapCueActive,
    powerSelections,
    measureCardAnchor,
  ]);

  useEffect(() => {
    const previousPlayers = prevPlayersRef.current;
    const previousMatchWindow = prevMatchWindowRef.current;
    const previousPhase = prevPhaseRef.current;
    const previousPendingPower = prevPendingPowerRef.current;

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

      const changedCardIds = changedSlots.flatMap(selection => {
        const currentPlayer = players.find(player => player.id === selection.playerId);
        const currentCard = currentPlayer?.cards[selection.row]?.[selection.col] ?? null;
        return currentCard ? [currentCard.id] : [];
      });
      const uniqueChangedCardIds = [...new Set(changedCardIds)];

      const shouldConfirmPowerSwap =
        previousPhase === 'power' &&
        (previousPendingPower === '9' || previousPendingPower === '10') &&
        changedSlots.length >= 2;

      if (shouldConfirmPowerSwap) {
        const selectedSwapCards = powerSelections.slice(0, 2);
        const firstSwapAnchor = selectedSwapCards[0]
          ? measureCardAnchor(
              selectedSwapCards[0].playerId,
              selectedSwapCards[0].row,
              selectedSwapCards[0].col,
            )
          : null;
        const secondSwapAnchor = selectedSwapCards[1]
          ? measureCardAnchor(
              selectedSwapCards[1].playerId,
              selectedSwapCards[1].row,
              selectedSwapCards[1].col,
            )
          : null;

        if (powerConfirmTimerRef.current) clearTimeout(powerConfirmTimerRef.current);
        if (powerSwapGlowTimerRef.current) clearTimeout(powerSwapGlowTimerRef.current);
        if (powerSwapAnimationTimerRef.current) clearTimeout(powerSwapAnimationTimerRef.current);
        if (powerCompletionTimerRef.current) clearTimeout(powerCompletionTimerRef.current);
        setSelectedPowerCueAnchor(null);
        setPowerConfirmCards(changedSlots);
        powerConfirmTimerRef.current = setTimeout(() => {
          setPowerConfirmCards([]);
        }, 1200);
        if (firstSwapAnchor && secondSwapAnchor) {
          setPowerSwapAnimation({
            from: firstSwapAnchor,
            to: secondSwapAnchor,
          });
          powerSwapAnimationTimerRef.current = setTimeout(() => {
            setPowerSwapAnimation(null);
          }, 1050);
        } else {
          setPowerSwapAnimation(null);
        }
        setPowerSwapGlowCardIds(uniqueChangedCardIds);
        powerSwapGlowTimerRef.current = setTimeout(() => {
          setPowerSwapGlowCardIds([]);
        }, 5000);
        setPowerCompletionLabel(previousPendingPower === '9' ? 'Peek swap complete' : 'Blind swap complete');
        powerCompletionTimerRef.current = setTimeout(() => {
          setPowerCompletionLabel(null);
        }, 1400);
      } else {
        setPowerConfirmCards([]);
      }
    }

    prevPlayersRef.current = players;
    prevMatchWindowRef.current = matchWindowActive;
    prevPhaseRef.current = phase;
    prevPendingPowerRef.current = pendingPower;
  }, [players, matchWindowActive, phase, pendingPower, powerSelections, measureCardAnchor]);

  useEffect(() => () => {
    if (discardLandingTimerRef.current) clearTimeout(discardLandingTimerRef.current);
    if (powerConfirmTimerRef.current) clearTimeout(powerConfirmTimerRef.current);
    if (powerSwapGlowTimerRef.current) clearTimeout(powerSwapGlowTimerRef.current);
    if (powerSwapAnimationTimerRef.current) clearTimeout(powerSwapAnimationTimerRef.current);
    if (powerCompletionTimerRef.current) clearTimeout(powerCompletionTimerRef.current);
  }, []);

  const handleCardClick = useCallback((row: number, col: number) => {
    if (phase === 'swap' && isMyTurn) {
      swapCard(row, col);
      setSwapMode(false);
    }
    if (phase === 'giveaway' && canGiveAway) {
      giveAwayCardAction(row, col);
      return;
    }
  }, [phase, isMyTurn, canGiveAway, swapCard, giveAwayCardAction]);

  const handleReactionCardClick = useCallback((targetPlayerId: string, row: number, col: number) => {
    if (matchWindowActive) {
      setSubmittedReactionCard({ playerId: targetPlayerId, row, col });
      reactToDiscard(targetPlayerId, row, col);
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

  const buildSelectedPowerCards = useCallback((playerIndex: number): OrderedGridSelection[] => {
    return powerSelections.flatMap((selection, index) => (
      selection.playerIndex === playerIndex
        ? [{ row: selection.row, col: selection.col, order: index + 1 }]
        : []
    ));
  }, [powerSelections]);

  const buildPowerConfirmCards = useCallback((playerId: string): GridSelection[] => {
    return powerConfirmCards
      .filter(selection => selection.playerId === playerId)
      .map(selection => ({ row: selection.row, col: selection.col }));
  }, [powerConfirmCards]);

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
    setSelectedPowerCueAnchor(null);
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
        setSelectedPowerCueAnchor(null);
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

  const localPowerViewerReady = Boolean(myPlayerId) && players[0]?.id === myPlayerId;
  const powerModeActive =
    phase === 'power' &&
    Boolean(pendingPower) &&
    isMyTurn &&
    currentPlayerIndex === 0 &&
    localPowerViewerReady;
  const powerInteractionActive =
    powerModeActive &&
    !((pendingPower === '7' || pendingPower === '8') && peekedCards.length > 0) &&
    !(pendingPower === '10' && powerSelections.length === 2);
  const powerTone = phase === 'power' && pendingPower ? pendingPower : null;
  const powerBannerCopy = pendingPower
    ? getPowerBannerCopy(
        pendingPower,
        isMyTurn,
        players[currentPlayerIndex]?.name ?? 'A player',
        powerSelections.length,
        peekedCards.length > 0,
      )
    : null;

  const buildPowerGuideText = (playerIndex: number): string | null => {
    if (!powerInteractionActive || !pendingPower) return null;

    const selectableCount = buildSelectablePowerCards(playerIndex).length;

    if (selectableCount === 0) return null;

    switch (pendingPower) {
      case '7':
        return selectableCount > 0 ? 'Choose a hidden card' : null;
      case '8':
        return selectableCount > 0 ? 'Spy this hand' : null;
      case '9':
        if (powerSelections.length === 0 && selectableCount > 0) return 'Pick card 1 of 2';
        return null;
      case '10':
        if (powerSelections.length === 0 && selectableCount > 0) return 'Pick the first card';
        return null;
    }
  };

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

  const showPowerBanner = Boolean(powerInteractionActive && powerBannerCopy);
  const reactionMode = matchWindowActive;
  const swapPowerCueSize = 68;
  const statusLabel = pendingPower === '7'
    ? (isMyTurn ? '👁 PEEK YOUR CARD' : `👁 ${players[currentPlayerIndex]?.name} IS USING 7`)
    : pendingPower === '8'
    ? (isMyTurn ? '🕵️ SPY AN OPPONENT' : `🕵️ ${players[currentPlayerIndex]?.name} IS USING 8`)
    : pendingPower === '9'
    ? (isMyTurn
      ? (powerSelections.length < 2 ? `👀 PICK ${2 - powerSelections.length} CARD${powerSelections.length === 1 ? '' : 'S'}` : '👀 SWAP OR KEEP')
      : `👀 ${players[currentPlayerIndex]?.name} IS USING 9`)
    : pendingPower === '10'
    ? (isMyTurn
      ? (powerSelections.length === 0 ? '🔀 PICK 2 CARDS' : powerSelections.length === 1 ? '🔀 PICK 1 MORE CARD' : '🔀 SWAP SENT')
      : `🔀 ${players[currentPlayerIndex]?.name} IS USING 10`)
    : phase === 'giveaway'
    ? (canGiveAway ? '🎁 GIVE A CARD AWAY' : `🎁 ${giveawayGiverName} IS GIVING A CARD`)
    : phase === 'match_window'
    ? '⚡ MATCH WINDOW'
    : phase === 'swap'
    ? (isMyTurn ? '🔄 SWAP OR DISCARD' : `${players[currentPlayerIndex]?.name}'S TURN`)
    : phase === 'draw'
    ? (isMyTurn ? '🎮 YOUR TURN' : `${players[currentPlayerIndex]?.name}'S TURN`)
    : isMyTurn
    ? '🎮 YOUR TURN'
    : `${players[currentPlayerIndex]?.name}'S TURN`;

  return (
    <div
      ref={gameRootRef}
      className="min-h-screen w-full overflow-hidden font-game relative"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #1565C0 0%, #0D47A1 25%, #0D2137 65%, #060D1B 100%)',
        fontFamily: 'Nunito, sans-serif',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <LayoutGroup id="game-table">
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

      <AnimatePresence>
        {selectedSwapCueActive && selectedPowerCueAnchor && (
          <HandCue
            size={swapPowerCueSize}
            style={{
              left: selectedPowerCueAnchor.x - swapPowerCueSize / 2,
              top: selectedPowerCueAnchor.y - swapPowerCueSize / 2,
              zIndex: 34,
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {powerSwapAnimation && (
          <SwapExchangeCue
            from={powerSwapAnimation.from}
            to={powerSwapAnimation.to}
          />
        )}
      </AnimatePresence>

      {/* Banners */}
      <AnimatePresence>
        {matchWindowActive && <MatchBanner countdown={matchCountdown} />}
      </AnimatePresence>
      <AnimatePresence>
        {showPowerBanner && pendingPower && powerBannerCopy && (
          <PowerBanner
            power={pendingPower}
            title={powerBannerCopy.title}
            sub={powerBannerCopy.sub}
            stepLabel={powerBannerCopy.stepLabel}
            progressCurrent={powerBannerCopy.progressCurrent}
            progressTotal={powerBannerCopy.progressTotal}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {powerCompletionLabel && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.92 }}
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 92,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              borderRadius: 999,
              background: 'rgba(46, 16, 18, 0.94)',
              border: '1px solid rgba(239,83,80,0.34)',
              boxShadow: '0 16px 32px rgba(0,0,0,0.28), 0 0 22px rgba(239,83,80,0.2)',
              color: 'white',
              fontSize: 12,
              fontWeight: 900,
              fontFamily: 'Nunito',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#EF5350',
              boxShadow: '0 0 10px rgba(239,83,80,0.72)',
            }} />
            <span>{powerCompletionLabel}</span>
          </motion.div>
        )}
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
            {statusLabel}
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
              selectedForSwap={swapMode}
              aiThinking={aiThinking}
              score={countCardsInHand(p3)}
              revealCards={buildRevealCards(2)}
              powerSelectableCards={buildSelectablePowerCards(2)}
              powerSelectedCards={buildSelectedPowerCards(2)}
              powerConfirmCards={buildPowerConfirmCards(p3.id)}
              powerSwapGlowCardIds={powerSwapGlowCardIds}
              powerModeActive={powerInteractionActive}
              powerTone={powerTone}
              powerGuideText={buildPowerGuideText(2)}
              onPowerClick={(row, col) => handlePowerCardClick(2, row, col)}
              reactionSelectable={reactionMode}
              onReactionClick={handleReactionCardClick}
              reactionSelected={submittedReactionCard?.playerId === p3.id ? submittedReactionCard : null}
              registerCardNode={registerCardNode}
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
              selectedForSwap={swapMode}
              aiThinking={aiThinking}
              score={countCardsInHand(p2)}
              revealCards={buildRevealCards(1)}
              powerSelectableCards={buildSelectablePowerCards(1)}
              powerSelectedCards={buildSelectedPowerCards(1)}
              powerConfirmCards={buildPowerConfirmCards(p2.id)}
              powerSwapGlowCardIds={powerSwapGlowCardIds}
              powerModeActive={powerInteractionActive}
              powerTone={powerTone}
              powerGuideText={buildPowerGuideText(1)}
              onPowerClick={(row, col) => handlePowerCardClick(1, row, col)}
              reactionSelectable={reactionMode}
              onReactionClick={handleReactionCardClick}
              reactionSelected={submittedReactionCard?.playerId === p2.id ? submittedReactionCard : null}
              registerCardNode={registerCardNode}
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
              selectedForSwap={swapMode}
              aiThinking={aiThinking}
              score={countCardsInHand(p4)}
              revealCards={buildRevealCards(3)}
              powerSelectableCards={buildSelectablePowerCards(3)}
              powerSelectedCards={buildSelectedPowerCards(3)}
              powerConfirmCards={buildPowerConfirmCards(p4.id)}
              powerSwapGlowCardIds={powerSwapGlowCardIds}
              powerModeActive={powerInteractionActive}
              powerTone={powerTone}
              powerGuideText={buildPowerGuideText(3)}
              onPowerClick={(row, col) => handlePowerCardClick(3, row, col)}
              reactionSelectable={reactionMode}
              onReactionClick={handleReactionCardClick}
              reactionSelected={submittedReactionCard?.playerId === p4.id ? submittedReactionCard : null}
              registerCardNode={registerCardNode}
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
              {powerInteractionActive && pendingPower === '7' && (
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
              {powerInteractionActive && pendingPower === '9' && (
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
              {powerInteractionActive && pendingPower === '10' && (
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
              powerConfirmCards={buildPowerConfirmCards(p1.id)}
              powerSwapGlowCardIds={powerSwapGlowCardIds}
              powerModeActive={powerInteractionActive}
              powerTone={powerTone}
              onPowerClick={(row, col) => handlePowerCardClick(0, row, col)}
              reactionSelectable={reactionMode}
              onReactionClick={handleReactionCardClick}
              reactionSelected={submittedReactionCard}
              peekPhase={peekActive}
              registerCardNode={registerCardNode}
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

            {!finalRound && isMyTurn && phase === 'draw' && (
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
              {powerInteractionActive && pendingPower === '7' && '👁 Tap a face-down card to peek, or skip'}
              {powerInteractionActive && pendingPower === '8' && '🕵️ Tap one opponent card to spy, or skip'}
              {powerInteractionActive && pendingPower === '9' && powerSelections.length < 2 && '👀 Pick 2 cards from 2 different players'}
              {powerInteractionActive && pendingPower === '9' && powerSelections.length === 2 && '👀 Optional swap: choose KEEP or SWAP'}
              {powerInteractionActive && pendingPower === '10' && powerSelections.length === 0 && '🔀 Tap any card to start a blind swap'}
              {powerInteractionActive && pendingPower === '10' && powerSelections.length === 1 && '🔀 Tap a card from another player to complete the blind swap'}
              {phase === 'power' && !isMyTurn && `⏳ ${players[currentPlayerIndex]?.name} is using power ${pendingPower}...`}
              {phase === 'draw' && isMyTurn && '🎯 Draw a card to start your turn'}
              {phase === 'swap' && isMyTurn && '🔄 Tap a card to swap, or discard'}
              {phase === 'giveaway' && canGiveAway && '🎁 Choose one of your cards to give away'}
              {phase === 'giveaway' && !canGiveAway && `🎁 ${giveawayGiverName} is giving a card away...`}
              {reactionMode && (
                submittedReactionCard
                  ? '✅ Reaction submitted'
                  : '⚡ Reaction window: tap any matching card now'
              )}
              {!reactionMode && !isMyTurn && phase !== 'power' && `⏳ Wait for ${players[currentPlayerIndex]?.name}...`}
            </div>
          </div>
        </div>
      </div>
      </LayoutGroup>
    </div>
  );
}
