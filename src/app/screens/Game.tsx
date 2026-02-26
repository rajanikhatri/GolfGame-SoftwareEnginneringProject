import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, ChevronDown, Zap, Star, Eye } from 'lucide-react';
import { useGame, type Card, type Player } from '../context/GameContext';
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
function PowerBanner({ power }: { power: '7' | '8' | '9' | '10' }) {
  const isSelf = power === '7';
  const isPeekSwap = power === '9';
  const isSwapOpponents = power === '10';
  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90,
        background: isSwapOpponents
          ? 'linear-gradient(135deg, #EF6C00, #FFA726, #EF6C00)'
          : isPeekSwap
          ? 'linear-gradient(135deg, #00897B, #26A69A, #00897B)'
          : isSelf
          ? 'linear-gradient(135deg, #1565C0, #42A5F5, #1565C0)'
          : 'linear-gradient(135deg, #6A1B9A, #AB47BC, #6A1B9A)',
        backgroundSize: '200% auto',
        animation: 'shimmer 1.2s linear infinite',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 16,
        boxShadow: isSwapOpponents
          ? '0 4px 30px rgba(255,167,38,0.7)'
          : isPeekSwap
          ? '0 4px 30px rgba(38,166,154,0.7)'
          : isSelf
          ? '0 4px 30px rgba(30,136,229,0.7)'
          : '0 4px 30px rgba(171,71,188,0.7)',
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
          {isSwapOpponents ? '🔀 SWAP OPPONENT CARDS' : isPeekSwap ? '👀🔀 PEEK & SWAP' : isSelf ? '🔍 PEEK YOUR CARD' : '🕵️ SPY POWER!'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontFamily: 'Nunito' }}>
          {isSwapOpponents
            ? 'Tap one card from each of two opponents to swap them'
            : isPeekSwap
            ? 'Peek at 2 cards from 2 players (including yourself), then swap those cards'
            : isSelf
            ? 'Tap one of your face-down cards to peek at it for 3 seconds'
            : "Tap one of your opponent's cards to reveal it for 3 seconds"}
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

// ─── Player Card Grid ─────────────────────────────────────────────────────────
function PlayerCardGrid({
  player, isActive, isYou, onCardClick, selectedForSwap,
  revealCard, powerSelectable, onPowerClick, powerAllowSelfAny,
}: {
  player: Player;
  isActive: boolean;
  isYou: boolean;
  onCardClick?: (row: number, col: number) => void;
  selectedForSwap?: boolean;
  revealCard?: { row: number; col: number } | null;
  powerSelectable?: boolean;
  onPowerClick?: (row: number, col: number) => void;
  powerAllowSelfAny?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {player.cards.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 6 }}>
          {row.map((card, ci) => {
            const isPeeked = revealCard?.row === ri && revealCard?.col === ci;

            // Opponents are hidden unless peeked; own hidden cards also temporarily reveal when peeked.
            const faceDown = isYou
              ? (!card?.faceUp && !isPeeked)
              : !isPeeked;

            // Power click targets:
            // - card 7 (peek self): own face-down cards only
            // - card 8 (peek opponent): all opponent cards
            const isPowerTarget = powerSelectable && (
              isYou ? (powerAllowSelfAny ? true : !card?.faceUp) : true
            );

            const handleClick = () => {
              if (isPowerTarget && onPowerClick) {
                onPowerClick(ri, ci);
              } else if (!powerSelectable) {
                onCardClick?.(ri, ci);
              }
            };

            return (
              <div key={ci} style={{ position: 'relative' }} onClick={handleClick}>
                <GameCard
                  card={card ?? undefined}
                  faceDown={faceDown}
                  size={isYou ? 'md' : 'sm'}
                  selectable={(isYou && selectedForSwap) || isPowerTarget}
                  glowing={
                    (isActive && isYou && selectedForSwap) ||
                    isPeeked ||
                    isPowerTarget
                  }
                  style={
                    isPowerTarget
                      ? { boxShadow: '0 0 0 3px #FFC107, 0 0 20px rgba(255,193,7,0.8)', animation: 'pulse-glow 0.8s infinite' }
                      : isPeeked
                      ? { boxShadow: '0 0 0 3px #42A5F5, 0 0 24px rgba(66,165,245,0.9)', transform: 'scale(1.06)' }
                      : undefined
                  }
                />
                {/* Column match indicator — only for your own cards */}
                {ri === 0 && isYou && player.cards[1]?.[ci] &&
                  card?.faceUp && player.cards[1][ci]?.faceUp &&
                  card?.value === player.cards[1][ci]?.value &&
                  (card?.value ?? 0) >= 0 && (
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
  revealCard, powerSelectable, onPowerClick,
}: {
  player: Player;
  isActive: boolean;
  isYou: boolean;
  position: 'top' | 'left' | 'right' | 'bottom';
  onCardClick?: (row: number, col: number) => void;
  selectedForSwap?: boolean;
  aiThinking: boolean;
  score: number | string;
  revealCard?: { row: number; col: number } | null;
  powerSelectable?: boolean;
  onPowerClick?: (row: number, col: number) => void;
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
        outline: powerSelectable ? '3px solid rgba(255,193,7,0.5)' : 'none',
        borderRadius: 12,
        padding: powerSelectable ? 6 : 0,
        transition: 'outline 0.2s',
      }}>
        <PlayerCardGrid
          player={player}
          isActive={isActive}
          isYou={isYou}
          onCardClick={onCardClick}
          selectedForSwap={selectedForSwap}
          revealCard={revealCard}
          powerSelectable={powerSelectable}
          onPowerClick={onPowerClick}
        />
      </div>
    </div>
  );
}

// ─── Draw / Discard Piles ─────────────────────────────────────────────────────
function PileArea({
  drawPile, discardPile, drawnCard, phase, currentPlayerIndex,
  onDraw, onTakeDiscard, isMyTurn,
}: {
  drawPile: Card[];
  discardPile: Card[];
  drawnCard: Card | null;
  phase: string;
  currentPlayerIndex: number;
  onDraw: () => void;
  onTakeDiscard: () => void;
  isMyTurn: boolean;
}) {
  const canDraw = isMyTurn && phase === 'draw';
  const discardTop = discardPile[0];
  const [drawnSource, setDrawnSource] = useState<'draw' | 'discard' | null>(null);
  const [discardFlight, setDiscardFlight] = useState<{
    key: number;
    card: Card;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  } | null>(null);
  const hideDiscardTopDuringFlight = !!(
    discardFlight &&
    discardTop &&
    discardTop.id === discardFlight.card.id
  );
  const pilesRowRef = useRef<HTMLDivElement>(null);
  const drawPileRef = useRef<HTMLDivElement>(null);
  const discardPileRef = useRef<HTMLDivElement>(null);
  const prevDrawnCardRef = useRef<Card | null>(null);

  useEffect(() => {
    const prevDrawn = prevDrawnCardRef.current;
    if (
      prevDrawn &&
      !drawnCard &&
      drawnSource === 'draw' &&
      discardTop &&
      discardTop.id === prevDrawn.id &&
      pilesRowRef.current &&
      drawPileRef.current &&
      discardPileRef.current
    ) {
      const rowRect = pilesRowRef.current.getBoundingClientRect();
      const fromRect = drawPileRef.current.getBoundingClientRect();
      const toRect = discardPileRef.current.getBoundingClientRect();
      setDiscardFlight({
        key: Date.now(),
        card: prevDrawn,
        fromX: fromRect.left - rowRect.left,
        fromY: fromRect.top - rowRect.top,
        toX: toRect.left - rowRect.left,
        toY: toRect.top - rowRect.top,
      });
    }
    prevDrawnCardRef.current = drawnCard;
  }, [drawnCard, discardTop, drawnSource]);

  useEffect(() => {
    if (!discardFlight) return;
    const t = setTimeout(() => setDiscardFlight(null), 420);
    return () => clearTimeout(t);
  }, [discardFlight]);

  useEffect(() => {
    if (!drawnCard && phase === 'draw') {
      setDrawnSource(null);
    }
  }, [drawnCard, phase]);

  const handleDrawClick = () => {
    if (!canDraw) return;
    setDrawnSource('draw');
    onDraw();
  };

  const handleTakeDiscardClick = () => {
    if (!canDraw || !discardTop) return;
    setDrawnSource('discard');
    onTakeDiscard();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
    }}>
      <div ref={pilesRowRef} style={{ display: 'flex', gap: 24, alignItems: 'center', position: 'relative' }}>
        {/* Draw Pile */}
        <div className="flex flex-col items-center gap-2">
          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito', letterSpacing: '0.1em' }}>
            DRAW PILE
          </span>
          <div
            className="card-pile"
            ref={drawPileRef}
            onClick={canDraw ? handleDrawClick : undefined}
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
            {drawnCard && drawnSource === 'draw' && (
              <motion.div
                key={`drawn-on-draw-${drawnCard.id}`}
                initial={{ y: 12, scale: 0.92, opacity: 0 }}
                animate={{ y: -6, scale: 1, opacity: 1 }}
                exit={{ y: 12, scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.25, duration: 0.28 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 20,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.45))',
                }}
              >
                <GameCard card={drawnCard} size="lg" glowing />
              </motion.div>
            )}
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
            ref={discardPileRef}
            onClick={canDraw && discardTop ? handleTakeDiscardClick : undefined}
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
                  style={{ opacity: hideDiscardTopDuringFlight ? 0 : 1 }}
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
            {drawnCard && drawnSource === 'discard' && (
              <motion.div
                key={`drawn-on-discard-${drawnCard.id}`}
                initial={{ y: 12, scale: 0.92, opacity: 0 }}
                animate={{ y: -6, scale: 1, opacity: 1 }}
                exit={{ y: 12, scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.25, duration: 0.28 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 24,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.45))',
                }}
              >
                <GameCard card={drawnCard} size="lg" glowing />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {discardFlight && (
          <motion.div
            key={discardFlight.key}
            initial={{
              x: discardFlight.fromX,
              y: discardFlight.fromY - 6,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: discardFlight.toX,
              y: discardFlight.toY - 6,
              scale: 1,
              opacity: 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.18, duration: 0.35 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 40,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.5))',
            }}
          >
            <GameCard card={discardFlight.card} size="lg" glowing />
          </motion.div>
        )}
      </AnimatePresence>

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
              {(drawnCard.rank === '7' || drawnCard.rank === '8' || drawnCard.rank === '9' || drawnCard.rank === '10') && (
                <span style={{
                  marginLeft: 8,
                  background: drawnCard.rank === '7'
                    ? '#1565C0'
                    : drawnCard.rank === '8'
                    ? '#6A1B9A'
                    : drawnCard.rank === '9'
                    ? '#00897B'
                    : '#EF6C00',
                  borderRadius: 50, padding: '2px 10px', fontSize: 10, color: 'white',
                }}>
                  {drawnCard.rank === '7'
                    ? '👁 PEEK SELF'
                    : drawnCard.rank === '8'
                    ? '🕵️ SPY'
                    : drawnCard.rank === '9'
                    ? '👀🔀 PEEK+SWAP'
                    : '🔀 SWAP OPP'}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Game Screen ─────────────────────────────────────────────────────────
export default function Game() {
  const navigate = useNavigate();
  const {
    players, drawPile, discardPile, currentPlayerIndex,
    drawnCard, phase, finalRound, knockedBy,
    matchWindowActive, matchCountdown, aiThinking,
    winner, drawFromPile, takeFromDiscard, swapCard, discardDrawn, knock,
    initGame, pendingPower, resolvePower, powerNotice,
    gameMode, mySlotIndex,
  } = useGame();

  const [showFinalBanner, setShowFinalBanner] = useState(false);
  const [swapMode, setSwapMode] = useState(false);

  // Peeked card: { playerIndex, row, col }
  const [peekedCard, setPeekedCard] = useState<{
    playerIndex: number; row: number; col: number;
  } | null>(null);
  const [swapPowerFirstTarget, setSwapPowerFirstTarget] = useState<{
    playerIndex: number; row: number; col: number;
  } | null>(null);
  const [powerToast, setPowerToast] = useState<{ id: number; message: string } | null>(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const myIdx = gameMode === 'multiplayer' ? mySlotIndex : 0;
    setSwapMode(phase === 'swap' && currentPlayerIndex === myIdx);
  }, [phase, currentPlayerIndex, gameMode, mySlotIndex]);

  useEffect(() => {
    if (phase !== 'power' || (pendingPower !== '10' && pendingPower !== '9')) {
      setSwapPowerFirstTarget(null);
    }
  }, [phase, pendingPower]);

  useEffect(() => {
    if (!powerNotice) return;
    setPowerToast(powerNotice);
    const t = setTimeout(() => setPowerToast((prev) => (prev?.id === powerNotice.id ? null : prev)), 2600);
    return () => clearTimeout(t);
  }, [powerNotice]);

  useEffect(() => {
    if (phase !== 'power' || pendingPower !== '7' || players.length === 0) return;
    const myIdx = gameMode === 'multiplayer' ? mySlotIndex : 0;
    const myCards = players[myIdx]?.cards ?? [];
    const hasFaceDownCard = myCards.some((row) => row.some((card) => card && !card.faceUp));
    if (!hasFaceDownCard) {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      const t = setTimeout(() => resolvePower(), 0);
      return () => clearTimeout(t);
    }
  }, [phase, pendingPower, players, gameMode, mySlotIndex, resolvePower]);

  // Called when player taps a card during power phase
  const handlePowerCardClick = useCallback((playerIndex: number, row: number, col: number) => {
    if (!pendingPower) return;
    const myIdx = gameMode === 'multiplayer' ? mySlotIndex : 0;
    const actorName = players[myIdx]?.name || 'You';
    const targetPlayerName = players[playerIndex]?.name || 'opponent';

    if (pendingPower === '9' || pendingPower === '10') {
      if (pendingPower === '10' && playerIndex === myIdx) return;
      const nextTarget = { playerIndex, row, col };
      if (!swapPowerFirstTarget) {
        setSwapPowerFirstTarget(nextTarget);
        if (pendingPower === '9') {
          setPeekedCard(nextTarget);
        }
        return;
      }
      if (swapPowerFirstTarget.playerIndex === playerIndex) {
        // Must choose a different player on the second pick; replace first selection.
        setSwapPowerFirstTarget(nextTarget);
        if (pendingPower === '9') {
          setPeekedCard(nextTarget);
        }
        return;
      }
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      if (pendingPower === '9') {
        setPeekedCard(nextTarget);
        peekTimerRef.current = setTimeout(() => {
          setPeekedCard(null);
          const firstName = players[swapPowerFirstTarget.playerIndex]?.name || 'Player';
          const secondName = players[nextTarget.playerIndex]?.name || 'Player';
          const firstTarget = swapPowerFirstTarget;
          setSwapPowerFirstTarget(null);
          resolvePower({
            targets: [firstTarget, nextTarget],
            notice: `${actorName} peeked and swapped cards between ${firstName} and ${secondName}`,
          });
        }, 1800);
      } else {
        const firstName = players[swapPowerFirstTarget.playerIndex]?.name || 'Player';
        const secondName = players[nextTarget.playerIndex]?.name || 'Player';
        const firstTarget = swapPowerFirstTarget;
        setSwapPowerFirstTarget(null);
        resolvePower({
          targets: [firstTarget, nextTarget],
          notice: `${actorName} swapped cards between ${firstName} and ${secondName}`,
        });
      }
      return;
    }

    // Clear any existing peek timer
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);

    setPeekedCard({ playerIndex, row, col });

    // Reveal for 3 seconds then resolve power
    peekTimerRef.current = setTimeout(() => {
      setPeekedCard(null);
      resolvePower({
        target: { playerIndex, row, col },
        notice: pendingPower === '7'
          ? `${actorName} peeked at their own card`
          : `${actorName} peeked at ${targetPlayerName}'s card`,
      });
    }, 3000);
  }, [pendingPower, resolvePower, gameMode, mySlotIndex, swapPowerFirstTarget, players]);

  const handleCardClick = useCallback((row: number, col: number) => {
    const myIdx = gameMode === 'multiplayer' ? mySlotIndex : 0;
    if (phase === 'power' && pendingPower === '9' && currentPlayerIndex === myIdx) {
      handlePowerCardClick(myIdx, row, col);
      return;
    }
    if (phase === 'swap' && currentPlayerIndex === myIdx) {
      swapCard(row, col);
      setSwapMode(false);
    }
  }, [phase, pendingPower, currentPlayerIndex, swapCard, gameMode, mySlotIndex, handlePowerCardClick]);

  if (players.length === 0) return null;

  // Rotate player layout so the local player is always at the bottom
  const myIdx = gameMode === 'multiplayer' ? mySlotIndex : 0;
  const numPlayers = players.length;
  const bottomIdx = myIdx % numPlayers;
  const leftIdx = (myIdx + 1) % numPlayers;
  const topIdx = (myIdx + 2) % numPlayers;
  const rightIdx = (myIdx + 3) % numPlayers;

  const pBottom = players[bottomIdx];
  const pLeft = players[leftIdx];
  const pTop = players[topIdx];
  const pRight = players[rightIdx];

  const isMyTurn = currentPlayerIndex === myIdx;
  const getPowerRevealForPlayer = (playerIndex: number) => {
    if (pendingPower === '9' && swapPowerFirstTarget?.playerIndex === playerIndex) {
      return { row: swapPowerFirstTarget.row, col: swapPowerFirstTarget.col };
    }
    if (peekedCard?.playerIndex === playerIndex) {
      return { row: peekedCard.row, col: peekedCard.col };
    }
    return null;
  };

  const calcVisibleScore = (p: Player) => {
    let total = 0;
    p.cards.forEach((row, ri) => {
      row.forEach((card, ci) => {
        if (card?.faceUp) {
          const other = p.cards[ri === 0 ? 1 : 0]?.[ci];
          if (other?.faceUp && other.value === card.value && card.value >= 0) return;
          total += card.value;
        }
      });
    });
    return total;
  };

  // Power mode derived from pendingPower
  const powerMode = pendingPower === '7' ? 'peek_self'
    : pendingPower === '8' ? 'peek_opponent'
    : pendingPower === '9' ? 'peek_swap_any'
    : pendingPower === '10' ? 'swap_opponents'
    : null;

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
        {pendingPower && !peekedCard && <PowerBanner power={pendingPower} />}
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
        {powerToast && (
          <motion.div
            key={powerToast.id}
            initial={{ y: -16, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            style={{
              position: 'fixed',
              top: 66,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 85,
              maxWidth: 'min(88vw, 720px)',
              background: 'rgba(5,16,33,0.92)',
              border: '1px solid rgba(77,182,172,0.45)',
              borderRadius: 12,
              padding: '8px 14px',
              boxShadow: '0 10px 26px rgba(0,0,0,0.35)',
              color: 'rgba(255,255,255,0.92)',
              fontSize: 12,
              fontWeight: 800,
              fontFamily: 'Nunito, sans-serif',
              letterSpacing: '0.02em',
              textAlign: 'center',
            }}
          >
            {powerToast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: 0,
        background: 'transparent',
        borderBottom: 'none',
        position: 'fixed', top: 14, right: 16, zIndex: 20,
        flexShrink: 0,
      }}>
        {false && (
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
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito' }}>K=-2</span>
            <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito' }}>★=-1</span>
          </div>
        </div>
        )}

        {false && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 50, padding: '6px 14px',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: currentPlayerIndex === 0 ? '#4CAF50' : '#FFC107',
            animation: 'pulse-glow 1.5s infinite',
          }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: 'white', fontFamily: 'Nunito' }}>
            {pendingPower === '7' ? '👁 PEEK YOUR CARD'
              : pendingPower === '8' ? '🕵️ SPY AN OPPONENT'
              : currentPlayerIndex === 0 ? '🎮 YOUR TURN'
              : `${players[currentPlayerIndex]?.name}'S TURN`}
          </span>
        </div>
        )}

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
        padding: '56px 20px 16px',
        minHeight: 0,
      }}>

        {/* Top player */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <PlayerPanelComp
            player={pTop}
            isActive={currentPlayerIndex === topIdx}
            isYou={false}
            position="top"
            aiThinking={aiThinking && currentPlayerIndex === topIdx}
            score="?"
            revealCard={getPowerRevealForPlayer(topIdx)}
            powerSelectable={powerMode === 'peek_opponent' || powerMode === 'peek_swap_any' || powerMode === 'swap_opponents'}
            onPowerClick={(row, col) => handlePowerCardClick(topIdx, row, col)}
          />
        </div>

        {/* Left player */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <PlayerPanelComp
            player={pLeft}
            isActive={currentPlayerIndex === leftIdx}
            isYou={false}
            position="left"
            aiThinking={aiThinking && currentPlayerIndex === leftIdx}
            score="?"
            revealCard={getPowerRevealForPlayer(leftIdx)}
            powerSelectable={powerMode === 'peek_opponent' || powerMode === 'peek_swap_any' || powerMode === 'swap_opponents'}
            onPowerClick={(row, col) => handlePowerCardClick(leftIdx, row, col)}
          />
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
            currentPlayerIndex={currentPlayerIndex}
            onDraw={drawFromPile}
            onTakeDiscard={takeFromDiscard}
            isMyTurn={isMyTurn}
          />
        </div>

        {/* Right player */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <PlayerPanelComp
            player={pRight}
            isActive={currentPlayerIndex === rightIdx}
            isYou={false}
            position="right"
            aiThinking={aiThinking && currentPlayerIndex === rightIdx}
            score="?"
            revealCard={getPowerRevealForPlayer(rightIdx)}
            powerSelectable={powerMode === 'peek_opponent' || powerMode === 'peek_swap_any' || powerMode === 'swap_opponents'}
            onPowerClick={(row, col) => handlePowerCardClick(rightIdx, row, col)}
          />
        </div>

        {/* Bottom player — YOU */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: isMyTurn ? `linear-gradient(135deg, ${pBottom.color}20, ${pBottom.color}08)` : 'rgba(255,255,255,0.04)',
            border: isMyTurn ? `2px solid ${pBottom.color}80` : '2px solid rgba(255,255,255,0.08)',
            borderRadius: 20, padding: '16px 24px',
            boxShadow: isMyTurn ? `0 0 30px ${pBottom.color}30` : 'none',
            transition: 'all 0.3s ease',
            animation: isMyTurn ? 'glow-ring-active 2s ease-in-out infinite' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `radial-gradient(circle, ${pBottom.color}60, ${pBottom.color}20)`, border: `2px solid ${pBottom.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{pBottom.avatar}</div>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#FFC107', fontFamily: 'Nunito' }}>★ {pBottom.name} (YOU)</span>
              <div className="score-badge" style={{ padding: '2px 10px' }}>
                <Star size={10} fill="#FFC107" color="#FFC107" style={{ marginRight: 4 }} />
                <span style={{ fontSize: 12, fontWeight: 900, color: '#3E2723', fontFamily: 'Nunito' }}>{calcVisibleScore(pBottom)} pts</span>
              </div>
              {powerMode === 'peek_self' && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={{ background: 'rgba(30,136,229,0.2)', border: '2px solid rgba(66,165,245,0.7)', borderRadius: 50, padding: '4px 14px', fontSize: 12, fontWeight: 800, color: '#42A5F5', fontFamily: 'Nunito' }}>
                  👁 TAP A FACE-DOWN CARD
                </motion.div>
              )}
            </div>

            <PlayerCardGrid
              player={pBottom}
              isActive={isMyTurn}
              isYou={true}
              onCardClick={handleCardClick}
              selectedForSwap={swapMode}
              revealCard={getPowerRevealForPlayer(bottomIdx)}
              powerSelectable={powerMode === 'peek_self' || powerMode === 'peek_swap_any'}
              powerAllowSelfAny={powerMode === 'peek_swap_any'}
              onPowerClick={(row, col) => handlePowerCardClick(bottomIdx, row, col)}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {phase === 'swap' && isMyTurn && drawnCard && (
              <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="arcade-btn arcade-btn-blue" style={{ fontSize: 14, padding: '10px 20px' }} onClick={discardDrawn}>
                {drawnCard.rank === '7'
                    ? '👁 DISCARD + PEEK SELF'
                  : drawnCard.rank === '8'
                    ? '🕵️ DISCARD + SPY OPP'
                    : drawnCard.rank === '9'
                      ? '👀🔀 DISCARD + PEEK/SWAP'
                    : drawnCard.rank === '10'
                      ? '🔀 DISCARD + SWAP OPPONENTS'
                      : '🗑 DISCARD DRAWN'}
              </motion.button>
            )}
            {!finalRound && isMyTurn && phase !== 'power' && (
              <motion.button whileTap={{ scale: 0.95 }} className="arcade-btn arcade-btn-red" style={{ fontSize: 15, padding: '12px 24px' }} onClick={knock}>
                KNOCK
              </motion.button>
            )}
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 16px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Nunito', textAlign: 'center' }}>
              {phase === 'power' && pendingPower === '7' && '👁 Tap one of your face-down cards to peek'}
              {phase === 'power' && pendingPower === '8' && "🕵️ Tap an opponent's card to spy on it"}
              {phase === 'power' && pendingPower === '9' && (
                swapPowerFirstTarget
                  ? `👀🔀 Now tap a card from a different player than ${players[swapPowerFirstTarget.playerIndex]?.name}`
                  : '👀🔀 Tap 1 card from any player, then tap a card from a different player'
              )}
              {phase === 'power' && pendingPower === '10' && (
                swapPowerFirstTarget
                  ? `🔀 Now tap a card from a different opponent than ${players[swapPowerFirstTarget.playerIndex]?.name}`
                  : '🔀 Tap one card from an opponent, then tap a card from another opponent'
              )}
              {phase === 'draw' && isMyTurn && '🎯 Draw a card to start your turn'}
              {phase === 'swap' && isMyTurn && '⬆ TAP A CARD TO SWAP'}
              {!isMyTurn && phase !== 'power' && `⏳ Wait for ${players[currentPlayerIndex]?.name}...`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
