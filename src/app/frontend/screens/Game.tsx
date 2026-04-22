import { Profiler, memo, type ReactNode, type CSSProperties, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Flag, ChevronDown, Zap, Eye, MessageSquare, Send } from 'lucide-react';
import { useGame, type Card, type Player, type PowerCardSelection } from '../../backend/GameContext';
import { calcHandScore, compareReactionEntries } from '../../backend/gameEngine';
import { HandCue, SwapExchangeCue, type OverlayPoint } from '../components/HandCue';
import { GameCard } from '../components/game/GameCard';
import { getStoredTableThemeId, getTableTheme } from '../lib/tableTheme';
import { isPerfDebugEnabled } from '../lib/perfDebug';

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

// ─── Power Notification Popup ────────────────────────────────────────────────
function PowerNotificationPopup({ actorName, powerCard }: { actorName: string; powerCard: string }) {
  const cfg = POWER_CONFIG[powerCard as PowerTone];
  if (!cfg) return null;
  return (
    <motion.div
      aria-live="polite"
      initial={{ opacity: 0, scale: 0.82, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -14, transition: { duration: 0.28, ease: 'easeIn' } }}
      transition={{ duration: 0.36, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 85,
        pointerEvents: 'none',
        background: cfg.bg,
        backgroundSize: '200% auto',
        borderRadius: 22,
        border: '2px solid rgba(255,255,255,0.38)',
        padding: '20px 36px',
        textAlign: 'center',
        boxShadow: `${cfg.shadow}, 0 24px 48px rgba(0,0,0,0.45)`,
        minWidth: 240,
      }}
    >
      <div style={{
        fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.7)',
        fontFamily: 'Nunito', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
      }}>
        ⚡ Power Card Activated
      </div>
      <div style={{
        fontSize: 26, fontWeight: 900, color: 'white',
        fontFamily: 'Nunito', textShadow: '0 2px 10px rgba(0,0,0,0.45)', marginBottom: 4,
      }}>
        {actorName}
      </div>
      <div style={{
        fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.88)',
        fontFamily: 'Nunito',
      }}>
        {cfg.title}
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

const EMPTY_GRID_SELECTIONS: GridSelection[] = [];
const EMPTY_ORDERED_GRID_SELECTIONS: OrderedGridSelection[] = [];
const EMPTY_STYLE: CSSProperties = {};

function formatOrdinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}TH`;

  switch (value % 10) {
    case 1:
      return `${value}ST`;
    case 2:
      return `${value}ND`;
    case 3:
      return `${value}RD`;
    default:
      return `${value}TH`;
  }
}

function getReactionOrderLabel(order: number) {
  return `${formatOrdinal(order)} REACTOR`;
}

function getReactionBadgeColors(order: number) {
  if (order === 1) {
    return {
      background: '#43A047',
      boxShadow: '0 4px 12px rgba(67,160,71,0.55)',
    };
  }

  if (order === 2) {
    return {
      background: '#FB8C00',
      boxShadow: '0 4px 12px rgba(251,140,0,0.48)',
    };
  }

  return {
    background: '#546E7A',
    boxShadow: '0 4px 12px rgba(84,110,122,0.42)',
  };
}

function debugPerf(label: string, details?: Record<string, unknown>) {
  if (!isPerfDebugEnabled()) return;
  console.debug(`[perf] ${label}`, details ?? {});
}

function DebugProfiler({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  if (!isPerfDebugEnabled()) return <>{children}</>;

  return (
    <Profiler
      id={id}
      onRender={(profileId, phase, actualDuration, baseDuration, startTime, commitTime) => {
        console.debug(`[profiler] ${profileId}`, {
          phase,
          actualDuration: Number(actualDuration.toFixed(2)),
          baseDuration: Number(baseDuration.toFixed(2)),
          startTime: Number(startTime.toFixed(2)),
          commitTime: Number(commitTime.toFixed(2)),
        });
      }}
    >
      {children}
    </Profiler>
  );
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
  revealCards, powerSelectableCards, powerSelectedCards, powerConfirmCards, powerSwapGlowCardIds, powerModeActive, powerTone, onPowerClick, peekPhase, reactionSelectable, onReactionClick, reactionSelected, reactionOrder, registerCardNode, peekHighlightCards,
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
  reactionOrder?: number | null;
  registerCardNode?: RegisterCardNode;
  /** Positions where the acting player is currently peeking — shown as a glow
   *  to observers WITHOUT flipping the card face-up (value stays hidden). */
  peekHighlightCards?: GridSelection[];
}) {
  debugPerf(`PlayerCardGrid render:${player.id}`, {
    isActive,
    isYou,
    selectedForSwap: Boolean(selectedForSwap),
    revealCount: revealCards?.length ?? 0,
    powerSelectableCount: powerSelectableCards?.length ?? 0,
    powerSelectedCount: powerSelectedCards?.length ?? 0,
    reactionSelectable: Boolean(reactionSelectable),
  });

  return (
    <div
      className={`game-player-grid${isYou ? ' game-player-grid--bottom' : ''}`}
      style={
        isYou
          ? undefined
          : { display: 'flex', flexDirection: 'column', gap: 'var(--game-player-grid-row-gap, 6px)' }
      }
    >
      {player.cards.map((row, ri) => (
        <div
          key={ri}
          className={`game-player-grid__row${isYou ? ' game-player-grid__row--bottom' : ''}`}
          style={
            isYou
              ? undefined
              : { display: 'flex', gap: 'var(--game-player-grid-col-gap, 6px)' }
          }
        >
          {row.map((card, ci) => {
            const isPeeked = Boolean(revealCards?.some(selection => selection.row === ri && selection.col === ci));
            const isPeekRow = peekPhase && isYou && ri === 1;
            if (!card) return null;

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
            const isPeekHighlight = Boolean(peekHighlightCards?.some(s => s.row === ri && s.col === ci));
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
              !isPeekHighlight &&
              !isReactionTarget &&
              !isReactionSelected
            );
            const isInteractive = Boolean((isYou && selectedForSwap && card) || isPowerTarget || isReactionTarget);
            const powerAccent = powerTone ? POWER_ACCENTS[powerTone] : null;
            const reactionBadgeColors = reactionOrder ? getReactionBadgeColors(reactionOrder) : null;

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
                      y: [0, -14, -4, 0],
                      scale: [1, 1.18, 1.10, 1],
                    }
                  : {
                      opacity: shouldDimForPower ? 0.36 : 1,
                      y: isPowerSelected ? -8 : isPowerTarget ? -5 : isPeeked ? -8 : isReactionSelected ? -6 : 0,
                      scale: isPowerSelected ? 1.14 : isPowerTarget ? 1.07 : isPeeked ? 1.14 : isReactionSelected ? 1.12 : 1,
                    }}
                whileTap={isInteractive ? { scale: 0.90 } : undefined}
                transition={isPowerConfirm
                  ? { duration: 0.85, times: [0, 0.35, 0.68, 1], ease: 'easeOut' }
                  : { type: 'spring', stiffness: 420, damping: 16, opacity: { duration: 0.18 } }}
                style={{
                  position: 'relative',
                  gridColumn: isYou ? (ri < 2 ? ci + 1 : ri + 1) : undefined,
                  gridRow: isYou ? (ri < 2 ? ri + 1 : ci + 1) : undefined,
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
                      animation: 'power-swap-red-glow 7s ease-out forwards',
                    }}
                  />
                )}
                {isPeekHighlight && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: isYou ? 16 : 13,
                      pointerEvents: 'none',
                      zIndex: 2,
                      border: '2px solid rgba(180, 100, 255, 0.88)',
                      boxShadow: '0 0 0 3px rgba(160,80,255,0.32), 0 0 18px rgba(160,80,255,0.55)',
                      background: 'radial-gradient(circle, rgba(160,80,255,0.12) 0%, transparent 68%)',
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
                          boxShadow: `0 0 0 4px ${powerAccent.outline}, 0 0 32px ${powerAccent.glow}`,
                        }
                      : isPowerTarget && powerAccent
                      ? {
                          boxShadow: `0 0 0 3px ${powerAccent.outline}, 0 0 28px ${powerAccent.glow}`,
                          animation: 'pulse-glow 1s ease-in-out infinite',
                        }
                      : isPowerConfirm && powerAccent
                      ? {
                          boxShadow: `0 0 0 4px ${powerAccent.outline}, 0 0 36px ${powerAccent.glow}`,
                        }
                      : isReactionSelected
                      ? { boxShadow: '0 0 0 4px #66BB6A, 0 0 32px rgba(102,187,106,0.95)' }
                      : isReactionTarget
                      ? { boxShadow: '0 0 0 3px #FFB300, 0 0 26px rgba(255,179,0,0.85)', animation: 'pulse-glow 0.8s infinite' }
                      : isPeeked
                      ? { boxShadow: '0 0 0 4px #42A5F5, 0 0 32px rgba(66,165,245,0.9)' }
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
                    background: reactionBadgeColors?.background ?? '#66BB6A',
                    borderRadius: 999,
                    padding: '2px 8px',
                    fontSize: 9,
                    fontWeight: 900,
                    color: 'white',
                    fontFamily: 'Nunito',
                    zIndex: 7,
                    boxShadow: reactionBadgeColors?.boxShadow ?? '0 2px 8px rgba(102,187,106,0.6)',
                    whiteSpace: 'nowrap',
                  }}>
                    {reactionOrder ? getReactionOrderLabel(reactionOrder) : 'REACTION SENT'}
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
                {/* Peek indicator */}
                {isPeeked && (
                  <div style={{
                    position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(66,165,245,0.95)', borderRadius: 50, padding: '1px 8px',
                    fontSize: 9, fontWeight: 900, color: 'white', fontFamily: 'Nunito',
                    whiteSpace: 'nowrap', zIndex: 9,
                    boxShadow: '0 3px 10px rgba(66,165,245,0.45)',
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
  player, isActive, isYou, position, onCardClick, selectedForSwap, aiThinking,
  revealCards, powerSelectableCards, powerSelectedCards, powerConfirmCards, powerSwapGlowCardIds, powerModeActive, powerTone, powerGuideText, onPowerClick, reactionSelectable, onReactionClick, reactionSelected, reactionOrder, discardLandingCue, registerCardNode, cardAreaGlowStyle, peekHighlightCards,
}: {
  player: Player;
  isActive: boolean;
  isYou: boolean;
  position: 'top' | 'left' | 'right' | 'bottom';
  onCardClick?: (row: number, col: number) => void;
  selectedForSwap?: boolean;
  aiThinking: boolean;
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
  reactionOrder?: number | null;
  discardLandingCue?: boolean;
  registerCardNode?: RegisterCardNode;
  cardAreaGlowStyle?: CSSProperties;
  peekHighlightCards?: GridSelection[];
}) {
  const isHorizontal = position === 'top' || position === 'bottom';
  const hasPowerTargets = Boolean(powerSelectableCards && powerSelectableCards.length > 0);
  const hasPowerSelections = Boolean(powerSelectedCards && powerSelectedCards.length > 0);
  const hasPowerConfirmCards = Boolean(powerConfirmCards && powerConfirmCards.length > 0);
  const hasPeekHighlights = Boolean(peekHighlightCards && peekHighlightCards.length > 0);
  const shouldPadCardArea = hasPowerTargets || hasPowerSelections || hasPowerConfirmCards || hasPeekHighlights;
  const shouldDimForPower = Boolean(powerModeActive && !hasPowerTargets && !hasPowerSelections && !hasPowerConfirmCards);
  const powerAccent = powerTone ? POWER_ACCENTS[powerTone] : null;
  const showInstructionalPanelCue = Boolean(isYou && powerModeActive && powerGuideText && powerTone);
  const reactionBadgeColors = reactionOrder ? getReactionBadgeColors(reactionOrder) : null;

  debugPerf(`PlayerPanel render:${player.id}`, {
    position,
    isActive,
    isYou,
    selectedForSwap: Boolean(selectedForSwap),
    handCount: countCardsInHand(player),
    hasPowerTargets,
    reactionSelectable: Boolean(reactionSelectable),
  });

  return (
    <div className={`game-player-panel game-player-panel--${position}`} style={{
      display: 'flex',
      flexDirection: isHorizontal ? 'column' : (position === 'left' ? 'row' : 'row-reverse'),
      alignItems: 'center',
      gap: 'var(--game-player-panel-gap, 10px)',
    }}>
      {/* Player info */}
      <div className="game-player-panel__info" style={{
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
          {reactionOrder && (
            <div style={{
              padding: '3px 9px',
              borderRadius: 999,
              background: reactionBadgeColors?.background ?? '#66BB6A',
              color: 'white',
              fontSize: 10,
              fontWeight: 900,
              fontFamily: 'Nunito',
              letterSpacing: '0.05em',
              boxShadow: reactionBadgeColors?.boxShadow ?? '0 4px 12px rgba(102,187,106,0.6)',
              whiteSpace: 'nowrap',
            }}>
              {getReactionOrderLabel(reactionOrder)}
            </div>
          )}
        </div>

        {isActive && player.isAI && aiThinking && <AIThinkingDots />}
      </div>

      {/* Cards */}
      <div className="game-player-panel__cards" style={{
        outline: hasPowerTargets && powerAccent ? `3px solid ${powerAccent.outline}` : 'none',
        borderRadius: 12,
        padding: shouldPadCardArea ? 8 : 0,
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
        ...cardAreaGlowStyle,
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
          reactionOrder={reactionOrder}
          registerCardNode={registerCardNode}
          peekHighlightCards={peekHighlightCards}
        />
      </div>
    </div>
  );
}

const MemoPlayerPanelComp = memo(PlayerPanelComp);

// ─── Draw / Discard Piles ─────────────────────────────────────────────────────
function PileArea({
  drawPile, discardPile, drawnCard, phase, isMyTurn, pileActionPending, showSoloChangeCue,
  onDraw, onTakeDiscard,
}: {
  drawPile: Card[];
  discardPile: Card[];
  drawnCard: Card | null;
  phase: string;
  isMyTurn: boolean;
  pileActionPending: boolean;
  showSoloChangeCue: boolean;
  onDraw: () => void;
  onTakeDiscard: () => void;
}) {
  const canDraw = isMyTurn && phase === 'draw' && !pileActionPending;
  const canTakeDiscard = canDraw && discardPile.length > 0;
  const discardTop = discardPile[0];

  debugPerf('PileArea render', {
    canDraw,
    pileActionPending,
    phase,
    drawPile: drawPile.length,
    discardPile: discardPile.length,
    drawnCard: drawnCard?.id ?? null,
  });

  return (
    <div className="game-pile-area" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--game-pile-gap, 16px)',
    }}>
      <div
        className="game-pile-area__piles"
        style={{
          display: 'grid',
          gridTemplateColumns: 'var(--game-drawn-slot-width, 132px) var(--game-pile-slot-width, 104px) auto var(--game-pile-slot-width, 104px)',
          gap: 'var(--game-pile-row-gap, 24px)',
          alignItems: 'start',
        }}
      >
        {/* Drawn card preview */}
        <div
          className="game-pile-area__drawn-slot"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            width: 'var(--game-drawn-slot-width, 132px)',
          }}
        >
          <div style={{
            minHeight: drawnCard && (drawnCard.rank === '7' || drawnCard.rank === '8') ? 38 : 0,
            fontSize: 11, fontWeight: 800, color: drawnCard ? '#FFC107' : 'transparent',
            fontFamily: 'Nunito', letterSpacing: '0.1em',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}>
            DRAWN CARD
            {drawnCard && (drawnCard.rank === '7' || drawnCard.rank === '8') && (
              <span style={{
                display: 'inline-block',
                marginTop: 6,
                background: drawnCard.rank === '7' ? '#1565C0' : '#6A1B9A',
                borderRadius: 50, padding: '2px 10px', fontSize: 10, color: 'white',
              }}>
                {drawnCard.rank === '7' ? '👁 PEEK SELF' : '🕵️ SPY'}
              </span>
            )}
          </div>
          <div style={{ position: 'relative', minHeight: 124, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AnimatePresence>
              {drawnCard && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0, x: 20 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0.5, opacity: 0, x: 20 }}
                >
                  <div style={{ position: 'relative' }}>
                    {showSoloChangeCue && isMyTurn && (
                      <HandCue
                        size={64}
                        style={{
                          left: '50%',
                          top: '50%',
                          marginLeft: -32,
                          marginTop: -32,
                          zIndex: 12,
                        }}
                      />
                    )}
                    <GameCard card={drawnCard} size="lg" glowing />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Draw Pile */}
        <div className="game-pile-area__draw-slot flex flex-col items-center gap-2">
          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito', letterSpacing: '0.1em' }}>
            DRAW PILE
          </span>
          <div
            className="card-pile"
            onClick={canDraw ? onDraw : undefined}
            aria-disabled={!canDraw}
            style={{ cursor: canDraw ? 'pointer' : 'default', position: 'relative' }}
          >
            {/* Back-facing stack layers */}
            {[3, 2, 1].map(offset => (
              <div
                key={offset}
                style={{
                  position: 'absolute',
                  top: offset * 2,
                  left: offset * 2,
                  zIndex: offset,
                  pointerEvents: 'none',
                }}
              >
                <GameCard faceDown size="lg" />
              </div>
            ))}
            <div style={{ position: 'relative', zIndex: 4 }}>
              <GameCard faceDown size="lg" />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(8, 18, 46, 0.72)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 999,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 900,
                color: 'rgba(255,255,255,0.9)',
                fontFamily: 'Nunito',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
                boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
                zIndex: 9,
                pointerEvents: 'none',
              }}>
                {drawPile.length > 0 ? `${drawPile.length} left` : '♾ reshuffling'}
              </div>
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
          </div>
        </div>

        {/* Divider */}
        <div className="game-pile-area__divider" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <ChevronDown size={16} color="rgba(255,255,255,0.3)" />
          <div style={{ width: 2, height: 40, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
          <ChevronDown size={16} color="rgba(255,255,255,0.3)" />
        </div>

        {/* Discard Pile */}
        <div className="game-pile-area__discard-slot flex flex-col items-center gap-2">
          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito', letterSpacing: '0.1em' }}>
            DISCARD
          </span>
          <div
            className="card-pile"
            onClick={canTakeDiscard ? onTakeDiscard : undefined}
            aria-disabled={!canTakeDiscard}
            style={{ cursor: canTakeDiscard ? 'pointer' : 'default', position: 'relative' }}
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
                  <GameCard card={discardTop} size="lg" glowing={canTakeDiscard} />
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
  const pileAreaNodeRef = useRef<HTMLDivElement | null>(null);
  const cardNodeMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const drawPerfStartRef = useRef<number | null>(null);
  const {
    gameMode,
    myPlayerId,
    players, drawPile, discardPile, currentPlayerIndex,
    isMyTurn, giveAwayCardAction,
    drawnCard, phase, finalRound, knockedBy,
    matchWindowActive, matchCountdown, aiThinking,
    winner, drawFromPile, takeFromDiscard, swapCard, discardDrawn, reactToDiscard, knock,
    reactionEntries,
    pileActionPending,
    initGame, pendingPower, resolvePower, skipPower, disconnectedPlayerName, swapCountdown, endPeek,
    selectPower9Card, confirmPower9, usePower10, giveawayGiverId,
    powerFocusTargetId, setFocusTarget,
    peekRevealCard, setPeekRevealCard,
    powerCueCard, setPowerCueCard,
    chatMessages, sendChat,
  } = useGame();

  const [showFinalBanner, setShowFinalBanner] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [peekTimeLeft, setPeekTimeLeft] = useState(5);
  const [peekActive, setPeekActive] = useState(false);
  const [tableThemeId] = useState(() => getStoredTableThemeId());
  const p1 = players[0];
  const p2 = players[1];
  const p3 = players[2];
  const p4 = players[3];
  const swapMode = phase === 'swap' && isMyTurn;
  const canGiveAway = phase === 'giveaway' && giveawayGiverId === p1?.id;
  const giveawayGiverName = players.find(player => player.id === giveawayGiverId)?.name ?? 'Someone';
  const reactionMode = matchWindowActive;
  const canReactThisWindow = reactionMode && knockedBy !== myPlayerId;
  const canReactToPlayer = (playerId?: string) => Boolean(
    canReactThisWindow &&
    playerId &&
    playerId !== knockedBy
  );
  const sortedReactionEntries = [...reactionEntries].sort(compareReactionEntries);
  const reactionOrderByPlayerId = new Map<string, number>();
  sortedReactionEntries.forEach((reaction, index) => {
    if (!reactionOrderByPlayerId.has(reaction.playerId)) {
      reactionOrderByPlayerId.set(reaction.playerId, index + 1);
    }
  });
  const getPlayerReactionOrder = (playerId?: string) => (
    playerId ? (reactionOrderByPlayerId.get(playerId) ?? null) : null
  );
  const localReactionOrder = getPlayerReactionOrder(myPlayerId || p1?.id);
  const tableTheme = getTableTheme(tableThemeId);

  useEffect(() => {
    if (phase === 'peek') {
      setPeekTimeLeft(5);
      setPeekActive(true);
      return;
    }
    setPeekActive(false);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'peek' || !peekActive) return;
    if (peekTimeLeft === 0) { setPeekActive(false); endPeek(); return; }
    const t = setTimeout(() => setPeekTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [peekTimeLeft, peekActive, endPeek, phase]);

  // Peeked card: { playerIndex, row, col }
  const [peekedCards, setPeekedCards] = useState<Array<{
    playerIndex: number; row: number; col: number;
  }>>([]);
  const [powerSelections, setPowerSelections] = useState<PowerSelection[]>([]);
  const [powerConfirmCards, setPowerConfirmCards] = useState<SwapCueSelection[]>([]);
  const [powerSwapGlowCardIds, setPowerSwapGlowCardIds] = useState<string[]>([]);
  const [selectedPowerCueAnchor, setSelectedPowerCueAnchor] = useState<CardAnchor | null>(null);
  const [opponentSwapCueAnchor, setOpponentSwapCueAnchor] = useState<CardAnchor | null>(null);
  const [powerSwapAnimation, setPowerSwapAnimation] = useState<PowerSwapAnimation | null>(null);
  const [powerCompletionLabel, setPowerCompletionLabel] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatPanelEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showChat) chatPanelEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, showChat]);
  const [submittedReactionCard, setSubmittedReactionCard] = useState<{
    playerId: string;
    row: number;
    col: number;
  } | null>(null);
  const [discardLandingPlayerIds, setDiscardLandingPlayerIds] = useState<string[]>([]);
  const [powerNotification, setPowerNotification] = useState<{ actorName: string; powerCard: string } | null>(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discardLandingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const powerConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const powerSwapGlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const powerSwapAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const powerCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const powerNotificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevNotifPendingPowerRef = useRef<typeof pendingPower>(pendingPower);
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

  // Clear peeked card when power resolves
  useEffect(() => {
    if (!pendingPower) {
      setPeekedCards(prev => (prev.length === 0 ? prev : []));
      setPowerSelections(prev => (prev.length === 0 ? prev : []));
    }
  }, [pendingPower]);

  useEffect(() => {
    if (phase !== 'power') {
      setPeekedCards(prev => (prev.length === 0 ? prev : []));
      setPowerSelections(prev => (prev.length === 0 ? prev : []));
    }
  }, [phase]);

  useEffect(() => {
    if (prevGuidancePowerRef.current !== pendingPower) {
      setPeekedCards(prev => (prev.length === 0 ? prev : []));
      setPowerSelections(prev => (prev.length === 0 ? prev : []));
      setSelectedPowerCueAnchor(null);
    }
    prevGuidancePowerRef.current = pendingPower;
  }, [pendingPower]);

  useEffect(() => {
    if (phase === 'power' && pendingPower && isMyTurn && currentPlayerIndex === 0) return;
    setPeekedCards(prev => (prev.length === 0 ? prev : []));
    setPowerSelections(prev => (prev.length === 0 ? prev : []));
    setSelectedPowerCueAnchor(null);
  }, [phase, pendingPower, isMyTurn, currentPlayerIndex]);

  // Global power notification — fires for all non-acting players when a new power is activated
  useEffect(() => {
    const wasNull = prevNotifPendingPowerRef.current == null;
    const isNewPower = wasNull && pendingPower != null;

    if (pendingPower == null) {
      // Power ended — immediately clear any in-flight notification
      if (powerNotificationTimerRef.current) clearTimeout(powerNotificationTimerRef.current);
      setPowerNotification(null);
    } else if (isNewPower && currentPlayerIndex !== 0 && players.length > 0) {
      // New power activated by someone other than the local player
      const actorName = players[currentPlayerIndex]?.name ?? 'A player';
      if (powerNotificationTimerRef.current) clearTimeout(powerNotificationTimerRef.current);
      setPowerNotification({ actorName, powerCard: pendingPower });
      powerNotificationTimerRef.current = setTimeout(() => {
        setPowerNotification(null);
      }, 2400);
    }

    prevNotifPendingPowerRef.current = pendingPower;
  }, [pendingPower, players, currentPlayerIndex]);

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
    powerSelections.length >= 1 &&
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
    // Cue points at the most recently selected card (first or second pick).
    const selectedSwapCard = selectedSwapCueActive ? (powerSelections[powerSelections.length - 1] ?? null) : null;

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

  // True on non-acting screens whenever the acting player has selected a card
  // (powerCueCard set), so the cue is anchored to the exact selected card.
  const opponentSwapCueActive =
    phase === 'power' &&
    !isMyTurn &&
    (pendingPower === '9' || pendingPower === '10') &&
    powerCueCard !== null &&
    !powerSwapAnimation;

  useLayoutEffect(() => {
    if (!opponentSwapCueActive || !powerCueCard) {
      setOpponentSwapCueAnchor(null);
      return;
    }
    const row = Math.floor(powerCueCard.cardIndex / 2);
    const col = powerCueCard.cardIndex % 2;
    const updateAnchor = () => {
      setOpponentSwapCueAnchor(measureCardAnchor(powerCueCard.playerId, row, col));
    };
    const frame = window.requestAnimationFrame(updateAnchor);
    window.addEventListener('resize', updateAnchor);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateAnchor);
    };
  }, [opponentSwapCueActive, powerCueCard, measureCardAnchor]);

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

    const shouldShowBroadSoloCue = gameMode === 'solo';
    const shouldShowLegacyCue =
      phase === 'match_window' &&
      (previousPhase === 'swap' || previousPhase === 'power');

    if (previousPlayers.length > 0 && players.length > 0 && (shouldShowBroadSoloCue || shouldShowLegacyCue)) {
      const changedSlots = players.flatMap(player => {
        const previousPlayer = previousPlayers.find(prev => prev.id === player.id);
        if (!previousPlayer) return [];

        const rows = Math.max(previousPlayer.cards.length, player.cards.length);
        const selections: SwapCueSelection[] = [];
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < 2; col++) {
            const previousCard = previousPlayer.cards[row]?.[col] ?? null;
            const currentCard = player.cards[row]?.[col] ?? null;
            const cardIdentityChanged = previousCard?.id !== currentCard?.id;
            const cardRevealChanged =
              previousCard?.id === currentCard?.id &&
              previousCard?.faceUp !== currentCard?.faceUp;

            if ((cardIdentityChanged || cardRevealChanged) && currentCard) {
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

      // Helper: measure the center pile area position (available on every client's screen)
      const measurePileAnchor = (): CardAnchor | null => {
        const rootNode = gameRootRef.current;
        const pileNode = pileAreaNodeRef.current;
        if (!rootNode || !pileNode) return null;
        const rootRect = rootNode.getBoundingClientRect();
        const pileRect = pileNode.getBoundingClientRect();
        return {
          x: pileRect.left - rootRect.left + pileRect.width / 2,
          y: pileRect.top - rootRect.top + pileRect.height / 2,
          width: pileRect.width,
          height: pileRect.height,
        };
      };

      if (shouldConfirmPowerSwap) {
        // Power 9 / 10: derive anchors from changedSlots — visible to ALL players, not just the acting player
        const firstSwapAnchor = changedSlots[0]
          ? measureCardAnchor(
              changedSlots[0].playerId,
              changedSlots[0].row,
              changedSlots[0].col,
            )
          : null;
        const secondSwapAnchor = changedSlots[1]
          ? measureCardAnchor(
              changedSlots[1].playerId,
              changedSlots[1].row,
              changedSlots[1].col,
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
          }, 1600);
        } else {
          setPowerSwapAnimation(null);
        }
        setPowerSwapGlowCardIds(uniqueChangedCardIds);
        powerSwapGlowTimerRef.current = setTimeout(() => {
          setPowerSwapGlowCardIds([]);
        }, 7000);
        setPowerCompletionLabel(previousPendingPower === '9' ? 'Peek swap complete' : 'Blind swap complete');
        powerCompletionTimerRef.current = setTimeout(() => {
          setPowerCompletionLabel(null);
        }, 1400);
      } else if (previousPhase === 'swap' && changedSlots.length >= 1) {
        // Normal draw-swap (deck or discard → hand): arc from pile area to the changed hand slot
        const pileAnchor = measurePileAnchor();
        const handAnchor = changedSlots[0]
          ? measureCardAnchor(
              changedSlots[0].playerId,
              changedSlots[0].row,
              changedSlots[0].col,
            )
          : null;

        if (powerConfirmTimerRef.current) clearTimeout(powerConfirmTimerRef.current);
        if (powerSwapGlowTimerRef.current) clearTimeout(powerSwapGlowTimerRef.current);
        if (powerSwapAnimationTimerRef.current) clearTimeout(powerSwapAnimationTimerRef.current);
        setPowerConfirmCards(changedSlots);
        powerConfirmTimerRef.current = setTimeout(() => {
          setPowerConfirmCards([]);
        }, 1200);
        if (pileAnchor && handAnchor) {
          setPowerSwapAnimation({ from: pileAnchor, to: handAnchor });
          powerSwapAnimationTimerRef.current = setTimeout(() => {
            setPowerSwapAnimation(null);
          }, 1600);
        }
        setPowerSwapGlowCardIds(uniqueChangedCardIds);
        powerSwapGlowTimerRef.current = setTimeout(() => {
          setPowerSwapGlowCardIds([]);
        }, 7000);
      } else {
        setPowerConfirmCards([]);
      }
    } else if (gameMode === 'solo') {
      setPowerConfirmCards([]);
    }

    prevPlayersRef.current = players;
    prevMatchWindowRef.current = matchWindowActive;
    prevPhaseRef.current = phase;
    prevPendingPowerRef.current = pendingPower;
  }, [players, matchWindowActive, phase, pendingPower, gameMode, measureCardAnchor]);

  useEffect(() => () => {
    if (discardLandingTimerRef.current) clearTimeout(discardLandingTimerRef.current);
    if (powerConfirmTimerRef.current) clearTimeout(powerConfirmTimerRef.current);
    if (powerSwapGlowTimerRef.current) clearTimeout(powerSwapGlowTimerRef.current);
    if (powerSwapAnimationTimerRef.current) clearTimeout(powerSwapAnimationTimerRef.current);
    if (powerCompletionTimerRef.current) clearTimeout(powerCompletionTimerRef.current);
    if (powerNotificationTimerRef.current) clearTimeout(powerNotificationTimerRef.current);
  }, []);

  const handleCardClick = useCallback((row: number, col: number) => {
    if (phase === 'swap' && isMyTurn) {
      swapCard(row, col);
    }
    if (phase === 'giveaway' && canGiveAway) {
      giveAwayCardAction(row, col);
      return;
    }
  }, [phase, isMyTurn, canGiveAway, swapCard, giveAwayCardAction]);

  const handleReactionCardClick = useCallback((targetPlayerId: string, row: number, col: number) => {
    if (!matchWindowActive) return;
    if (myPlayerId === knockedBy || targetPlayerId === knockedBy) return;

    setSubmittedReactionCard({ playerId: targetPlayerId, row, col });
    reactToDiscard(targetPlayerId, row, col);
  }, [matchWindowActive, myPlayerId, knockedBy, reactToDiscard]);

  const isSamePowerSelection = useCallback((a: PowerSelection, b: PowerSelection) => {
    return a.playerId === b.playerId && a.cardFlatIndex === b.cardFlatIndex;
  }, []);

  // Only the acting player sees cards face-up; value is never exposed to other players.
  const buildRevealCards = useCallback((playerIndex: number): GridSelection[] => {
    if (peekedCards.length === 0) return EMPTY_GRID_SELECTIONS;
    const nextRevealCards = peekedCards
      .filter(card => card.playerIndex === playerIndex)
      .map(card => ({ row: card.row, col: card.col }));
    return nextRevealCards.length > 0 ? nextRevealCards : EMPTY_GRID_SELECTIONS;
  }, [peekedCards]);

  // Non-acting players see only a highlight (glow) on the peeked card — card stays face-down.
  const buildPeekHighlightCards = useCallback((playerIndex: number): GridSelection[] => {
    // The acting player's screen shows the full reveal via buildRevealCards instead.
    if (currentPlayerIndex === 0) return EMPTY_GRID_SELECTIONS;
    if (!peekRevealCard) return EMPTY_GRID_SELECTIONS;
    if (players[playerIndex]?.id !== peekRevealCard.playerId) return EMPTY_GRID_SELECTIONS;
    return [{ row: Math.floor(peekRevealCard.cardIndex / 2), col: peekRevealCard.cardIndex % 2 }];
  }, [currentPlayerIndex, peekRevealCard, players]);

  const buildSelectedPowerCards = useCallback((playerIndex: number): OrderedGridSelection[] => {
    if (powerSelections.length === 0) return EMPTY_ORDERED_GRID_SELECTIONS;

    const nextSelectedPowerCards = powerSelections.flatMap((selection, index) => (
      selection.playerIndex === playerIndex
        ? [{ row: selection.row, col: selection.col, order: index + 1 }]
        : []
    ));
    return nextSelectedPowerCards.length > 0 ? nextSelectedPowerCards : EMPTY_ORDERED_GRID_SELECTIONS;
  }, [powerSelections]);

  const buildPowerConfirmCards = useCallback((playerId: string): GridSelection[] => {
    if (powerConfirmCards.length === 0) return EMPTY_GRID_SELECTIONS;

    const nextPowerConfirmCards = powerConfirmCards
      .filter(selection => selection.playerId === playerId)
      .map(selection => ({ row: selection.row, col: selection.col }));
    return nextPowerConfirmCards.length > 0 ? nextPowerConfirmCards : EMPTY_GRID_SELECTIONS;
  }, [powerConfirmCards]);

  const buildSelectablePowerCards = useCallback((playerIndex: number): GridSelection[] => {
    if (phase !== 'power' || !pendingPower || !isMyTurn) return EMPTY_GRID_SELECTIONS;
    const player = players[playerIndex];
    if (!player) return EMPTY_GRID_SELECTIONS;

    const firstSelection = powerSelections[0] ?? null;
    const selectionsFull = powerSelections.length >= 2;
    const singlePeekLocked = (pendingPower === '7' || pendingPower === '8') && peekedCards.length > 0;

    const nextSelectablePowerCards = player.cards.flatMap((row, ri) => row.flatMap((card, ci) => {
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
    return nextSelectablePowerCards.length > 0 ? nextSelectablePowerCards : EMPTY_GRID_SELECTIONS;
  }, [phase, pendingPower, players, powerSelections, isMyTurn, peekedCards]);

  const commitPower9Choice = useCallback((doSwap: boolean) => {
    if (powerSelections.length < 2) return;
    setSelectedPowerCueAnchor(null);
    setPowerCueCard(null);
    confirmPower9(doSwap, powerSelections.map(selection => ({
      playerId: selection.playerId,
      cardFlatIndex: selection.cardFlatIndex,
    })));
  }, [confirmPower9, powerSelections, setPowerCueCard]);

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

      // Power 8: write the target to Firestore immediately so opponent screens
      // can show the blue target glow during the 3-second peek window.
      if (pendingPower === '8') {
        setFocusTarget(targetPlayerId);
      }

      // Share which card is being peeked so all players can see the reveal.
      setPeekRevealCard({ playerId: targetPlayerId, cardIndex: flatIndex });
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
      // Sync cue card so all clients anchor to the newly selected card.
      setPowerCueCard({ playerId: targetPlayerId, cardIndex: flatIndex });
      if (targetPlayerId !== players[0]?.id) {
        setFocusTarget(targetPlayerId);
      }
      return;
    }

    if (pendingPower === '10') {
      if (powerSelections.some(existing => isSamePowerSelection(existing, selection)) || powerSelections.length >= 2) {
        return;
      }
      if (powerSelections.length === 1 && powerSelections[0].playerId === targetPlayerId) return;

      const nextSelections = [...powerSelections, selection];
      setPowerSelections(nextSelections);
      // Sync cue card so all clients anchor to the newly selected card.
      setPowerCueCard({ playerId: targetPlayerId, cardIndex: flatIndex });

      if (targetPlayerId !== players[0]?.id) {
        setFocusTarget(targetPlayerId);
      }

      if (nextSelections.length === 2) {
        setSelectedPowerCueAnchor(null);
        setPowerCueCard(null);
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
    setFocusTarget,
    setPeekRevealCard,
    setPowerCueCard,
  ]);
  const handlePowerCardClickRef = useRef(handlePowerCardClick);
  handlePowerCardClickRef.current = handlePowerCardClick;

  const handlePowerClickP1 = useCallback((row: number, col: number) => {
    handlePowerCardClickRef.current(0, row, col);
  }, []);

  const handlePowerClickP2 = useCallback((row: number, col: number) => {
    handlePowerCardClickRef.current(1, row, col);
  }, []);

  const handlePowerClickP3 = useCallback((row: number, col: number) => {
    handlePowerCardClickRef.current(2, row, col);
  }, []);

  const handlePowerClickP4 = useCallback((row: number, col: number) => {
    handlePowerCardClickRef.current(3, row, col);
  }, []);

  const handleDrawFromPile = useCallback(() => {
    if (pileActionPending || phase !== 'draw' || !isMyTurn) return;
    if (isPerfDebugEnabled()) {
      drawPerfStartRef.current = performance.now();
      debugPerf('drawFromPile click', {
        phase,
        drawPile: drawPile.length,
        isMyTurn,
        pileActionPending,
      });
    }
    drawFromPile();
  }, [drawFromPile, drawPile.length, isMyTurn, phase, pileActionPending]);

  const handleTakeFromDiscard = useCallback(() => {
    if (pileActionPending || phase !== 'draw' || !isMyTurn || discardPile.length === 0) return;
    takeFromDiscard();
  }, [discardPile.length, isMyTurn, phase, pileActionPending, takeFromDiscard]);

  useEffect(() => {
    if (!isPerfDebugEnabled() || drawPerfStartRef.current === null) return;
    if (phase === 'draw' && drawnCard === null) return;

    const elapsed = performance.now() - drawPerfStartRef.current;
    debugPerf('drawFromPile resolved', {
      phase,
      drawnCard: drawnCard?.id ?? null,
      drawPile: drawPile.length,
      elapsedMs: Number(elapsed.toFixed(2)),
    });
    drawPerfStartRef.current = null;
  }, [drawPile.length, drawnCard, phase]);

  if (players.length === 0) return null;

  debugPerf('Game render', {
    phase,
    currentPlayerIndex,
    isMyTurn,
    drawPile: drawPile.length,
    discardPile: discardPile.length,
    drawnCard: drawnCard?.id ?? null,
    pendingPower,
    swapMode,
    matchWindowActive,
  });

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
    return calcHandScore(p.cards.flatMap(row => row));
  };

  const showPowerBanner = Boolean(powerInteractionActive && powerBannerCopy);

  // ─── Focus mode: opponent-side spotlight/dim for power-card actions ─────────
  // Both signals come from shared Firestore state, so they fire on ALL clients
  // simultaneously as soon as the power-card phase starts.
  //
  // Rule: the acting player's OWN screen is never affected — they already have the
  // full PowerBanner + interaction UI. Only the non-acting players' screens show
  // the spotlight + dim.
  //
  // Note: real-time per-card target highlighting (while the acting player is still
  // picking) is not feasible here because the card selections live in local state
  // (powerSelections) and are not broadcast until the action commits to Firestore.
  const powerFocusActive = phase === 'power' && Boolean(pendingPower);

  // Outer container: only dim non-focus players. Acting/target players stay fully opaque.
  const getPlayerDimStyle = (playerIndex: number): CSSProperties => {
    if (!powerFocusActive) return {};
    if (currentPlayerIndex === 0) return {};
    const isActing = playerIndex === currentPlayerIndex;
    const isTarget = powerFocusTargetId !== null && players[playerIndex]?.id === powerFocusTargetId;
    if (isActing || isTarget) return { transition: 'opacity 0.4s ease, filter 0.4s ease' };
    return {
      opacity: 0.35,
      filter: 'brightness(0.55) saturate(0.4)',
      transition: 'opacity 0.4s ease, filter 0.4s ease',
    };
  };

  // Card area only: glow on actor (gold) or target (blue). No effect on dimmed players.
  const getPlayerCardGlowStyle = (playerIndex: number): CSSProperties => {
    if (!powerFocusActive) return EMPTY_STYLE;
    if (currentPlayerIndex === 0) return EMPTY_STYLE;
    const isActing = playerIndex === currentPlayerIndex;
    const isTarget = powerFocusTargetId !== null && players[playerIndex]?.id === powerFocusTargetId;
    if (isActing) return {
      boxShadow: '0 0 0 3px rgba(255, 200, 30, 0.84), 0 0 44px rgba(255, 180, 0, 0.55)',
    };
    if (isTarget) return {
      boxShadow: '0 0 0 3px rgba(100, 200, 255, 0.84), 0 0 44px rgba(80, 160, 255, 0.5)',
    };
    return EMPTY_STYLE;
  };
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
    ? (canReactThisWindow ? '⚡ MATCH WINDOW' : '🚫 KNOCKED - MATCH LOCKED')
    : phase === 'swap'
    ? (isMyTurn ? '🔄 SWAP OR DISCARD' : `${players[currentPlayerIndex]?.name}'S TURN`)
    : phase === 'draw'
    ? (isMyTurn ? '🎮 YOUR TURN' : `${players[currentPlayerIndex]?.name}'S TURN`)
    : isMyTurn
    ? '🎮 YOUR TURN'
    : `${players[currentPlayerIndex]?.name}'S TURN`;

  return (
    <DebugProfiler id="GameScreen">
      <div
        ref={gameRootRef}
        className="game-screen min-h-screen w-full overflow-hidden font-game relative"
        style={{
          background: tableTheme.screenBackground,
          fontFamily: 'Nunito, sans-serif',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <LayoutGroup id="game-table">
      {/* Subtle grid pattern */}
      <div className="game-screen__pattern" style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle, ${tableTheme.patternDot} 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
      }} />

      {/* Table felt */}
      <div className="game-screen__felt" style={{
        position: 'absolute',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'var(--game-felt-width, 480px)', height: 'var(--game-felt-height, 360px)',
        borderRadius: '50%',
        background: tableTheme.feltBackground,
        border: `2px solid ${tableTheme.feltBorder}`,
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

      {/* Hand cue on non-acting screens: floats over the acting player's card area */}
      <AnimatePresence>
        {opponentSwapCueActive && opponentSwapCueAnchor && (
          <HandCue
            size={swapPowerCueSize}
            style={{
              left: opponentSwapCueAnchor.x - swapPowerCueSize / 2,
              top: opponentSwapCueAnchor.y - swapPowerCueSize / 2,
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

      {/* Power notification — center popup for non-acting players */}
      <AnimatePresence>
        {powerNotification && (
          <PowerNotificationPopup
            actorName={powerNotification.actorName}
            powerCard={powerNotification.powerCard}
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

      <AnimatePresence>
        {showRulesModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="game-rules-modal__backdrop"
              onClick={() => setShowRulesModal(false)}
            />
            <div className="game-rules-modal__viewport">
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.985 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="game-rules-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Golf rules"
              >
                <div className="game-rules-modal__header">
                  <div>
                    <div className="game-rules-modal__eyebrow">Rules</div>
                    <div className="game-rules-modal__title">How Golf Works</div>
                  </div>
                  <button
                    type="button"
                    className="game-rules-modal__close"
                    onClick={() => setShowRulesModal(false)}
                    aria-label="Close rules"
                  >
                    ×
                  </button>
                </div>
                <div className="game-rules-modal__body">
                  <div className="game-rules-modal__section">
                    <div className="game-rules-modal__section-title">Goal</div>
                    <div className="game-rules-modal__text">Finish with the lowest total score.</div>
                  </div>
                  <div className="game-rules-modal__section">
                    <div className="game-rules-modal__section-title">Power Cards</div>
                    <div className="game-rules-modal__rule"><strong>7:</strong> Peek one of your own face-down cards.</div>
                    <div className="game-rules-modal__rule"><strong>8:</strong> Spy one opponent face-down card.</div>
                  </div>
                  <div className="game-rules-modal__section">
                    <div className="game-rules-modal__section-title">Special Scores</div>
                    <div className="game-rules-modal__rule"><strong>J:</strong> worth `11`.</div>
                    <div className="game-rules-modal__rule"><strong>Q:</strong> worth `12`.</div>
                    <div className="game-rules-modal__rule"><strong>K♠ / K♣:</strong> worth `-2`.</div>
                    <div className="game-rules-modal__rule"><strong>K♥ / K♦:</strong> worth `13`.</div>
                    <div className="game-rules-modal__rule"><strong>★:</strong> worth `-1`.</div>
                  </div>
                  <div className="game-rules-modal__section">
                    <div className="game-rules-modal__section-title">Turn Flow</div>
                    <div className="game-rules-modal__rule">Draw from the pile or take the discard.</div>
                    <div className="game-rules-modal__rule">Swap the drawn card into your grid or discard it.</div>
                    <div className="game-rules-modal__rule">Press <strong>KNOCK</strong> when you want to end the round.</div>
                  </div>
                </div>
              </motion.div>
            </div>
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

      {/* In-game chat (multiplayer only) */}
      {gameMode === 'multiplayer' && (
        <div style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 60,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
          fontFamily: 'Nunito, sans-serif',
        }}>
          {showChat && (
            <div style={{
              width: 272, background: 'rgba(6,13,27,0.96)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
              display: 'flex', flexDirection: 'column', maxHeight: 300, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}>
              <div style={{
                padding: '8px 14px', fontSize: 11, fontWeight: 900, letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.45)', borderBottom: '1px solid rgba(255,255,255,0.07)',
                flexShrink: 0,
              }}>
                CHAT
              </div>
              <div style={{
                flex: 1, overflowY: 'auto', padding: '8px 10px',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                {chatMessages.length === 0 && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '8px 0' }}>
                    No messages yet
                  </div>
                )}
                {chatMessages.map(msg => {
                  const isMe = msg.playerId === myPlayerId;
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      {!isMe && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 2, paddingLeft: 4 }}>
                          {msg.playerName}
                        </span>
                      )}
                      <div style={{
                        padding: '5px 10px', borderRadius: 10, maxWidth: '85%',
                        fontSize: 12, fontWeight: 600, color: 'white', wordBreak: 'break-word',
                        background: isMe ? 'rgba(30,136,229,0.75)' : 'rgba(255,255,255,0.10)',
                      }}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatPanelEndRef} />
              </div>
              <div style={{
                display: 'flex', gap: 6, padding: '8px 10px',
                borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
              }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && chatInput.trim()) {
                      sendChat(chatInput.trim());
                      setChatInput('');
                    }
                  }}
                  placeholder="Say something…"
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'white',
                    fontFamily: 'Nunito, sans-serif', outline: 'none',
                  }}
                />
                <button
                  onClick={() => { if (chatInput.trim()) { sendChat(chatInput.trim()); setChatInput(''); } }}
                  style={{
                    width: 32, height: 32, background: 'rgba(30,136,229,0.8)', border: 'none',
                    borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }}
                  aria-label="Send message"
                >
                  <Send size={14} color="white" />
                </button>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowChat(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 20,
              background: showChat ? 'rgba(30,136,229,0.85)' : 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: 'white', fontSize: 13, fontWeight: 700,
              fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
            aria-label={showChat ? 'Hide chat' : 'Show chat'}
          >
            <MessageSquare size={15} />
            {showChat ? 'Hide' : 'Chat'}
            {!showChat && chatMessages.length > 0 && (
              <span style={{
                background: '#1E88E5', borderRadius: 10,
                fontSize: 10, fontWeight: 900, padding: '1px 6px',
              }}>
                {chatMessages.length}
              </span>
            )}
          </button>
        </div>
      )}

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
      <div className="game-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--game-header-padding, 12px 20px)',
        background: 'rgba(0,0,0,0.25)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'relative', zIndex: 10,
        flexShrink: 0,
      }}>
        <div className="game-header__brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="game-header__title" style={{
            fontSize: 'var(--game-title-size, 28px)', fontWeight: 900,
            background: 'linear-gradient(180deg, #FFFFFF, #82B1FF)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: 'Nunito',
          }}>⛳ GOLF</span>
          <button
            type="button"
            className="game-header__info-button"
            onClick={() => setShowRulesModal(true)}
            aria-label="Open rules"
          >
            <span className="game-header__info-item game-header__info-item--1">7 = Peek self</span>
            <span className="game-header__info-sep game-header__info-sep--1" />
            <span className="game-header__info-item game-header__info-item--2">8 = Spy opp</span>
            <span className="game-header__info-sep game-header__info-sep--2" />
            <span className="game-header__info-item game-header__info-item--3">K♠/♣ = -2</span>
            <span className="game-header__info-sep game-header__info-sep--3" />
            <span className="game-header__info-item game-header__info-item--4">★ = -1</span>
            <span className="game-header__info-more">...</span>
          </button>
          {finalRound && (
            <div style={{
              background: 'linear-gradient(135deg, #B71C1C, #E53935)',
              borderRadius: 50, padding: '4px 12px',
              fontSize: 11, fontWeight: 900, color: 'white',
              fontFamily: 'Nunito', letterSpacing: '0.05em',
              boxShadow: '0 4px 12px rgba(229,57,53,0.5)',
            }}>🚨 FINAL ROUND</div>
          )}
        </div>

        <div className="game-header__status" style={{
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

        <div className="game-header__controls" style={{ display: 'flex', gap: 8 }}>
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
      <div className="game-board" style={{
        flex: 1, position: 'relative', zIndex: 5,
        display: 'grid',
        gridTemplateRows: 'var(--game-board-rows, auto 1fr auto)',
        gridTemplateColumns: 'var(--game-board-columns, auto 1fr auto)',
        gap: 'var(--game-board-gap, 12px)',
        padding: 'var(--game-board-padding, 16px 20px)',
        minHeight: 0,
      }}>

        {/* Top player (P3) */}
        <div className="game-board__slot game-board__slot--top" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', ...getPlayerDimStyle(2) }}>
          {p3 && (
            <MemoPlayerPanelComp
              player={p3}
              isActive={currentPlayerIndex === 2}
              isYou={false}
              position="top"
              selectedForSwap={false}
              aiThinking={aiThinking}
              revealCards={buildRevealCards(2)}
              powerSelectableCards={buildSelectablePowerCards(2)}
              powerSelectedCards={buildSelectedPowerCards(2)}
              powerConfirmCards={buildPowerConfirmCards(p3.id)}
              powerSwapGlowCardIds={powerSwapGlowCardIds}
              powerModeActive={powerInteractionActive}
              powerTone={powerTone}
              powerGuideText={buildPowerGuideText(2)}
              onPowerClick={handlePowerClickP3}
              reactionSelectable={canReactToPlayer(p3?.id)}
              onReactionClick={handleReactionCardClick}
              reactionSelected={submittedReactionCard?.playerId === p3.id ? submittedReactionCard : null}
              reactionOrder={getPlayerReactionOrder(p3.id)}
              registerCardNode={registerCardNode}
              cardAreaGlowStyle={getPlayerCardGlowStyle(2)}
              peekHighlightCards={buildPeekHighlightCards(2)}
            />
          )}
        </div>

        {/* Left player (P2) */}
        <div className="game-board__slot game-board__slot--left" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', ...getPlayerDimStyle(1) }}>
          {p2 && (
            <MemoPlayerPanelComp
              player={p2}
              isActive={currentPlayerIndex === 1}
              isYou={false}
              position="left"
              selectedForSwap={false}
              aiThinking={aiThinking}
              revealCards={buildRevealCards(1)}
              powerSelectableCards={buildSelectablePowerCards(1)}
              powerSelectedCards={buildSelectedPowerCards(1)}
              powerConfirmCards={buildPowerConfirmCards(p2.id)}
              powerSwapGlowCardIds={powerSwapGlowCardIds}
              powerModeActive={powerInteractionActive}
              powerTone={powerTone}
              powerGuideText={buildPowerGuideText(1)}
              onPowerClick={handlePowerClickP2}
              reactionSelectable={canReactToPlayer(p2?.id)}
              onReactionClick={handleReactionCardClick}
              reactionSelected={submittedReactionCard?.playerId === p2.id ? submittedReactionCard : null}
              reactionOrder={getPlayerReactionOrder(p2.id)}
              registerCardNode={registerCardNode}
              cardAreaGlowStyle={getPlayerCardGlowStyle(1)}
              peekHighlightCards={buildPeekHighlightCards(1)}
            />
          )}
        </div>

        {/* Center area */}
        <div ref={pileAreaNodeRef} className="game-board__center" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--game-center-padding, 8px 24px)',
        }}>
          <DebugProfiler id="PileArea">
            <PileArea
              drawPile={drawPile}
              discardPile={discardPile}
              drawnCard={drawnCard}
              phase={phase}
              isMyTurn={isMyTurn}
              pileActionPending={pileActionPending}
              showSoloChangeCue={gameMode === 'solo'}
              onDraw={handleDrawFromPile}
              onTakeDiscard={handleTakeFromDiscard}
            />
          </DebugProfiler>
        </div>

        {/* Right player (P4) */}
        <div className="game-board__slot game-board__slot--right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', ...getPlayerDimStyle(3) }}>
          {p4 && (
            <MemoPlayerPanelComp
              player={p4}
              isActive={currentPlayerIndex === 3}
              isYou={false}
              position="right"
              selectedForSwap={false}
              aiThinking={aiThinking}
              revealCards={buildRevealCards(3)}
              powerSelectableCards={buildSelectablePowerCards(3)}
              powerSelectedCards={buildSelectedPowerCards(3)}
              powerConfirmCards={buildPowerConfirmCards(p4.id)}
              powerSwapGlowCardIds={powerSwapGlowCardIds}
              powerModeActive={powerInteractionActive}
              powerTone={powerTone}
              powerGuideText={buildPowerGuideText(3)}
              onPowerClick={handlePowerClickP4}
              reactionSelectable={canReactToPlayer(p4?.id)}
              onReactionClick={handleReactionCardClick}
              reactionSelected={submittedReactionCard?.playerId === p4.id ? submittedReactionCard : null}
              reactionOrder={getPlayerReactionOrder(p4.id)}
              registerCardNode={registerCardNode}
              cardAreaGlowStyle={getPlayerCardGlowStyle(3)}
              peekHighlightCards={buildPeekHighlightCards(3)}
            />
          )}
        </div>

        {/* Bottom player (P1 - YOU) */}
        <div className="game-board__slot game-board__slot--bottom game-bottom-section" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, ...getPlayerDimStyle(0) }}>
          <div className="game-bottom-shell">
          {/* Player hand */}
          <div className="game-bottom-panel" style={{
            position: 'relative',
            background: isMyTurn
              ? 'linear-gradient(135deg, rgba(88, 28, 135, 0.28), rgba(194, 65, 12, 0.14))'
              : 'rgba(255,255,255,0.04)',
            border: isMyTurn ? '2px solid rgba(251, 191, 36, 0.88)' : '2px solid rgba(255,255,255,0.08)',
            borderRadius: 20, padding: 'var(--game-bottom-panel-padding, 16px 24px)',
            boxShadow: isMyTurn ? '0 0 34px rgba(251, 191, 36, 0.24), inset 0 0 18px rgba(147, 51, 234, 0.12)' : 'none',
            transition: 'all 0.3s ease',
            animation: isMyTurn ? 'glow-ring-active 2s ease-in-out infinite' : 'none',
            ...getPlayerCardGlowStyle(0),
          }}>
            <AnimatePresence>
              {discardLandingPlayerIds.includes(p1.id) && <DiscardLandingCue />}
            </AnimatePresence>
            <div className="game-bottom-panel__meta" style={{
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
                ★ YOU
              </span>
              {localReactionOrder && (
                <div style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: getReactionBadgeColors(localReactionOrder).background,
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 900,
                  fontFamily: 'Nunito',
                  letterSpacing: '0.05em',
                  boxShadow: getReactionBadgeColors(localReactionOrder).boxShadow,
                }}>
                  {getReactionOrderLabel(localReactionOrder)}
                </div>
              )}
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
                  {!canReactThisWindow
                    ? '🚫 YOU KNOCKED - NO MATCHES'
                    : localReactionOrder
                    ? `✅ ${getReactionOrderLabel(localReactionOrder)}`
                    : submittedReactionCard
                    ? '✅ REACTION SENT'
                    : '⚡ TAP YOUR MATCHING CARD'}
                </motion.div>
              )}
            </div>

            <DebugProfiler id="BottomPlayerGrid">
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
                onPowerClick={handlePowerClickP1}
                reactionSelectable={canReactToPlayer(p1?.id)}
                onReactionClick={handleReactionCardClick}
                reactionSelected={submittedReactionCard}
                reactionOrder={getPlayerReactionOrder(p1.id)}
                peekPhase={peekActive}
                registerCardNode={registerCardNode}
                peekHighlightCards={buildPeekHighlightCards(0)}
              />
            </DebugProfiler>
          </div>

          {/* Action buttons */}
          <div className="game-action-row" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {phase === 'swap' && isMyTurn && drawnCard && (
              <>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="game-action-button game-action-button--right arcade-btn arcade-btn-blue"
                  style={{ fontSize: 14, padding: '10px 20px' }}
                  onClick={discardDrawn}
                >
                  🗑 DISCARD DRAWN
                </motion.button>
                {swapCountdown !== null && (
                  <div className="game-action-pill game-action-pill--right" style={{
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
                className="game-action-button game-action-button--right arcade-btn arcade-btn-blue"
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
                  className="game-action-button game-action-button--right arcade-btn arcade-btn-blue"
                  style={{ fontSize: 13, padding: '10px 18px' }}
                  onClick={() => commitPower9Choice(false)}
                >
                  👀 KEEP CARDS
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="game-action-button game-action-button--right arcade-btn arcade-btn-blue"
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
                className="game-action-button game-action-button--left arcade-btn arcade-btn-red"
                style={{ fontSize: 15, padding: '12px 24px' }}
                onClick={knock}
              >
                <Flag size={16} style={{ marginRight: 6 }} />
                KNOCK
              </motion.button>
            )}
            </div>
          </div>
        </div>
      </div>
        </LayoutGroup>
      </div>
    </DebugProfiler>
  );
}
