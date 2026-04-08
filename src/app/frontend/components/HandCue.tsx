import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import Lottie from 'lottie-react';
import tapAnimation from '../../../assets/animations/tap.json';

interface HandCueProps {
  size?: number;
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
      exit={{ opacity: 0, y: -8, scale: 0.88 }}
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
