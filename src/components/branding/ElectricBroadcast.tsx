import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Two glowing "electricity" strands rendered with three.js, arcing from a
 * source element (the 7771 broadcast node) down into two target elements
 * (the driver phones) — screen-space, so it tracks the live DOM layout
 * instead of a hardcoded path. Purely decorative: pointer-events are off
 * and it fully disposes its GL resources on unmount.
 */
interface Props {
  containerRef: React.RefObject<HTMLElement | null>;
  sourceRef: React.RefObject<HTMLElement | null>;
  targetRefA: React.RefObject<HTMLElement | null>;
  targetRefB: React.RefObject<HTMLElement | null>;
  color?: string;
}

export const ElectricBroadcast = ({
  containerRef,
  sourceRef,
  targetRefA,
  targetRefB,
  color = '#3e55a5',
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, -10, 10);
    const baseColor = new THREE.Color(color);

    // Soft radial glow sprite, generated once and reused for every particle.
    const glowTexture = (() => {
      const size = 64;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      if (!g) return new THREE.Texture();
      const grad = g.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2,
      );
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.35, 'rgba(255,255,255,0.6)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    })();

    interface Strand {
      curve: THREE.QuadraticBezierCurve3;
      line: THREE.Line;
      particles: THREE.Sprite[];
    }
    let strands: Strand[] = [];
    const PARTICLES_PER_STRAND = 3;

    const disposeStrands = () => {
      strands.forEach((s) => {
        scene.remove(s.line);
        s.line.geometry.dispose();
        (s.line.material as THREE.Material).dispose();
        s.particles.forEach((p) => {
          scene.remove(p);
          (p.material as THREE.Material).dispose();
        });
      });
      strands = [];
    };

    const buildStrand = (
      srcX: number,
      srcY: number,
      tgtX: number,
      tgtY: number,
    ): Strand => {
      const midX = (srcX + tgtX) / 2;
      const midY = (srcY + tgtY) / 2 - Math.max(18, Math.abs(tgtX - srcX) * 0.08);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(srcX, srcY, 0),
        new THREE.Vector3(midX, midY, 0),
        new THREE.Vector3(tgtX, tgtY, 0),
      );

      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
      const mat = new THREE.LineBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.2,
      });
      const line = new THREE.Line(geo, mat);
      scene.add(line);

      const particles: THREE.Sprite[] = [];
      for (let p = 0; p < PARTICLES_PER_STRAND; p++) {
        const spriteMat = new THREE.SpriteMaterial({
          map: glowTexture,
          color: baseColor,
          transparent: true,
          depthTest: false,
          blending: THREE.AdditiveBlending,
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(13, 13, 1);
        scene.add(sprite);
        particles.push(sprite);
      }

      return { curve, line, particles };
    };

    const rebuild = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (width === 0 || height === 0) return;

      renderer.setSize(width, height, false);
      camera.left = 0;
      camera.right = width;
      camera.top = 0;
      // Screen-space (y-down) orthographic camera.
      camera.bottom = height;
      camera.updateProjectionMatrix();

      disposeStrands();

      const srcEl = sourceRef.current;
      if (!srcEl) return;
      const srcRect = srcEl.getBoundingClientRect();
      const sx = srcRect.left + srcRect.width / 2 - rect.left;
      const sy = srcRect.bottom - rect.top - 4;

      [targetRefA, targetRefB].forEach((ref) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const tx = r.left + r.width / 2 - rect.left;
        const ty = r.top - rect.top + 6;
        strands.push(buildStrand(sx, sy, tx, ty));
      });
    };

    rebuild();

    const ro = new ResizeObserver(() => rebuild());
    ro.observe(container);
    window.addEventListener('resize', rebuild);

    let raf = 0;
    const speed = 0.00032;

    const frame = (now: number) => {
      strands.forEach((s, si) => {
        s.particles.forEach((sprite, pi) => {
          const phase =
            (now * speed + pi / s.particles.length + si * 0.18) % 1;
          const pt = s.curve.getPoint(phase);
          const jitter = Math.sin(phase * 46 + pi * 3.1 + si) * 1.4;
          sprite.position.set(pt.x + jitter, pt.y, 0.1);
          const mat = sprite.material as THREE.SpriteMaterial;
          mat.opacity = 0.3 + 0.6 * Math.sin(phase * Math.PI);
        });
      });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };

    if (reduceMotion) {
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', rebuild);
      disposeStrands();
      glowTexture.dispose();
      renderer.dispose();
    };
  }, [containerRef, sourceRef, targetRefA, targetRefB, color]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 5 }}
      aria-hidden
    />
  );
};
