import { useEffect, useRef } from 'react';

const COLORS = ['#E53935', '#FBC02D', '#43A047', '#1E88E5', '#AB47BC', '#FF7043', '#FFC107', '#26C6DA', '#EC407A'];

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  width: number;
  height: number;
  opacity: number;
  shape: 'rect' | 'circle' | 'star';
}

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const piecesRef = useRef<ConfettiPiece[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create confetti pieces
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < 150; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        width: 8 + Math.random() * 12,
        height: 4 + Math.random() * 8,
        opacity: 0.8 + Math.random() * 0.2,
        shape: (['rect', 'circle', 'star'] as const)[Math.floor(Math.random() * 3)],
      });
    }
    piecesRef.current = pieces;

    const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const innerAngle = ((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
        else ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
        ctx.lineTo(x + Math.cos(innerAngle) * (size * 0.4), y + Math.sin(innerAngle) * (size * 0.4));
      }
      ctx.closePath();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      piecesRef.current.forEach((piece, i) => {
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.rotation += piece.rotationSpeed;
        piece.vy += 0.05; // gravity

        if (piece.y > canvas.height + 20) {
          // Reset to top
          piece.y = -20;
          piece.x = Math.random() * canvas.width;
          piece.vy = 2 + Math.random() * 4;
        }

        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate((piece.rotation * Math.PI) / 180);
        ctx.globalAlpha = piece.opacity;
        ctx.fillStyle = piece.color;

        if (piece.shape === 'rect') {
          ctx.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
        } else if (piece.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, piece.width / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawStar(ctx, 0, 0, piece.width / 2);
          ctx.fill();
        }
        ctx.restore();
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}
