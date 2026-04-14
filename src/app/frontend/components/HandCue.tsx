import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { RotateCcw } from 'lucide-react';
import Lottie from 'lottie-react';
import tapAnimation from '../../../assets/animations/tap.json';

interface HandCueProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export interface OverlayPoint {
  x: number;
  y: number;
}

interface SwapExchangeCueProps {
  from: OverlayPoint;
  to: OverlayPoint;
  className?: string;
  style?: CSSProperties;
}

export function HandCue({
  size = 72,
  className = '',
  style,
}: HandCueProps) {
  return (
    <motion.div
      aria-hidden="true"
      className={className}
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{
        opacity: 1,
        y: [6, 0, 6],
        scale: [0.98, 1, 0.98],
      }}
      exit={{ opacity: 0, y: -8, scale: 0.88, transition: { duration: 0.25, ease: 'easeOut' } }}
      transition={{
        duration: 1.8,
        repeat: Infinity,
        repeatType: 'mirror',
        ease: 'easeInOut',
      }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        pointerEvents: 'none',
        zIndex: 14,
        filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.3))',
        ...style,
      }}
    >
      <motion.div
        animate={{
          opacity: [0.2, 0.36, 0.2],
          scale: [0.92, 1.06, 0.92],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          inset: -10,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,214,102,0.28) 0%, rgba(255,214,102,0.12) 42%, transparent 72%)',
          filter: 'blur(8px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,224,130,0.12) 46%, transparent 74%)',
        }}
      >
        <Lottie
          animationData={tapAnimation}
          autoplay
          loop
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    </motion.div>
  );
}

export function SwapExchangeCue({
  from,
  to,
  className = '',
  style,
}: SwapExchangeCueProps) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const angle = Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);
  const arcHeight = Math.min(68, Math.max(32, distance * 0.18));
  const ghostWidth = 46;
  const ghostHeight = 64;

  const ghostCardStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: ghostWidth,
    height: ghostHeight,
    borderRadius: 12,
    border: '2px solid rgba(255, 205, 210, 0.78)',
    background: 'linear-gradient(145deg, rgba(255,245,245,0.96) 0%, rgba(255,205,210,0.92) 100%)',
    boxShadow: '0 10px 22px rgba(183,28,28,0.2), 0 0 18px rgba(239,83,80,0.24)',
    overflow: 'hidden',
  };

  return (
    <motion.div
      aria-hidden="true"
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 28,
        ...style,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scaleX: 0.86 }}
        animate={{ opacity: [0, 0.42, 0.18], scaleX: [0.86, 1, 1] }}
        transition={{ duration: 0.92, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          left: midX - distance / 2,
          top: midY - 3,
          width: distance,
          height: 6,
          borderRadius: 999,
          transform: `rotate(${angle}deg)`,
          transformOrigin: 'center',
          background: 'linear-gradient(90deg, rgba(239,83,80,0.06), rgba(239,83,80,0.38), rgba(239,83,80,0.06))',
          filter: 'blur(0.2px)',
        }}
      />

      {[from, to].map((point, index) => (
        <motion.div
          key={`${point.x}-${point.y}-${index}`}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0, 0.95, 0.1], scale: [0.7, 1.18, 1.34] }}
          transition={{ duration: 0.88, ease: 'easeOut', delay: index * 0.06 }}
          style={{
            position: 'absolute',
            left: point.x - 15,
            top: point.y - 15,
            width: 30,
            height: 30,
            borderRadius: '50%',
            border: '2px solid rgba(255,205,210,0.74)',
            background: 'radial-gradient(circle, rgba(255,138,128,0.4) 0%, rgba(239,83,80,0.16) 46%, transparent 72%)',
            boxShadow: '0 0 24px rgba(239,83,80,0.36)',
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.84, rotate: -24 }}
        animate={{ opacity: [0, 1, 0.18], scale: [0.84, 1.06, 1], rotate: [ -24, 0, 10 ] }}
        transition={{ duration: 0.96, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          left: midX - 26,
          top: midY - 26,
          width: 52,
          height: 52,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(255,245,245,0.96) 0%, rgba(255,205,210,0.82) 60%, rgba(239,83,80,0.18) 100%)',
          border: '1px solid rgba(255,205,210,0.76)',
          boxShadow: '0 14px 28px rgba(0,0,0,0.18), 0 0 24px rgba(239,83,80,0.22)',
        }}
      >
        <RotateCcw size={22} color="#B71C1C" strokeWidth={2.4} />
      </motion.div>

      <motion.div
        initial={{
          opacity: 0,
          x: from.x - ghostWidth / 2,
          y: from.y - ghostHeight / 2,
          rotate: -10,
          scale: 0.92,
        }}
        animate={{
          opacity: [0, 1, 1, 0],
          x: [from.x - ghostWidth / 2, midX - ghostWidth / 2, to.x - ghostWidth / 2],
          y: [from.y - ghostHeight / 2, midY - ghostHeight / 2 - arcHeight, to.y - ghostHeight / 2],
          rotate: [-10, 12, 4],
          scale: [0.92, 1.06, 1],
        }}
        transition={{ duration: 0.96, ease: 'easeInOut', times: [0, 0.18, 1] }}
        style={ghostCardStyle}
      >
        <div
          style={{
            position: 'absolute',
            inset: 6,
            borderRadius: 9,
            border: '1px solid rgba(183,28,28,0.14)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.56), rgba(255,138,128,0.12))',
          }}
        />
      </motion.div>

      <motion.div
        initial={{
          opacity: 0,
          x: to.x - ghostWidth / 2,
          y: to.y - ghostHeight / 2,
          rotate: 10,
          scale: 0.92,
        }}
        animate={{
          opacity: [0, 1, 1, 0],
          x: [to.x - ghostWidth / 2, midX - ghostWidth / 2, from.x - ghostWidth / 2],
          y: [to.y - ghostHeight / 2, midY - ghostHeight / 2 + arcHeight, from.y - ghostHeight / 2],
          rotate: [10, -12, -4],
          scale: [0.92, 1.06, 1],
        }}
        transition={{ duration: 0.96, ease: 'easeInOut', times: [0, 0.18, 1] }}
        style={{
          ...ghostCardStyle,
          background: 'linear-gradient(145deg, rgba(255,250,250,0.96) 0%, rgba(255,224,178,0.92) 100%)',
          border: '2px solid rgba(255,224,178,0.88)',
          boxShadow: '0 10px 22px rgba(230,81,0,0.18), 0 0 18px rgba(255,112,67,0.22)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 6,
            borderRadius: 9,
            border: '1px solid rgba(230,81,0,0.12)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.58), rgba(255,183,77,0.1))',
          }}
        />
      </motion.div>
    </motion.div>
  );
}
