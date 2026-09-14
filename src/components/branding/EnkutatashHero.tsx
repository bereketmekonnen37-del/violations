import { useEffect, useRef } from 'react';

/**
 * Cinematic Ethiopian New Year (Enkutatash) backdrop for the login screen's
 * left showcase panel. Canvas-driven Adey Abeba (Meskel daisy) petals drift
 * down over a dusk-to-gold gradient — pure canvas/CSS, no animation library,
 * so it stays light and has zero effect on the form panel next to it.
 */
export const EnkutatashHero = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const colors = ['#FCDD09', '#F9C74F', '#FFE083', '#E2B93B'];

    interface Petal {
      x: number;
      y: number;
      size: number;
      speed: number;
      drift: number;
      driftPhase: number;
      rotation: number;
      rotSpeed: number;
      color: string;
      opacity: number;
    }

    const count = Math.round((width * height) / 26000);
    const petals: Petal[] = Array.from({ length: Math.max(18, count) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 5 + Math.random() * 7,
      speed: 0.35 + Math.random() * 0.7,
      drift: 0.6 + Math.random() * 1.1,
      driftPhase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 0.55 + Math.random() * 0.4,
    }));

    const drawPetal = (p: Petal) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      // Four-lobed Adey Abeba-ish bloom made of small overlapping circles.
      const r = p.size / 2.4;
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, Math.sin(a) * r, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.fillStyle = '#B8860B';
      ctx.globalAlpha = p.opacity * 0.9;
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    let raf = 0;
    let t = 0;
    const frame = () => {
      ctx.clearRect(0, 0, width, height);
      t += 1;
      for (const p of petals) {
        p.y += p.speed;
        p.x += Math.sin(t * 0.01 + p.driftPhase) * p.drift * 0.05;
        p.rotation += p.rotSpeed;
        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x > width + 10) p.x = -10;
        if (p.x < -10) p.x = width + 10;
        drawPetal(p);
      }
      raf = requestAnimationFrame(frame);
    };

    if (reduceMotion) {
      for (const p of petals) drawPetal(p);
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
};
