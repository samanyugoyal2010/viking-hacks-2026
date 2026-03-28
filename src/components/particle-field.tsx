"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  base: number;
  phase: number;
};

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const rawCtx = el.getContext("2d");
    if (!rawCtx) return;
    const ctx = rawCtx;

    const particles: Particle[] = [];
    const COUNT = 200;
    let raf = 0;
    let t = 0;

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = Math.max(
        document.documentElement.scrollHeight,
        window.innerHeight
      );
      el.width = w * dpr;
      el.height = h * dpr;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };

    function seedParticles(w: number, h: number) {
      particles.length = 0;
      for (let i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.6 + 0.35,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          base: Math.random() * 0.35 + 0.12,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    let { w, h } = sizeCanvas();
    seedParticles(w, h);

    const onResize = () => {
      ({ w, h } = sizeCanvas());
      seedParticles(w, h);
    };
    window.addEventListener("resize", onResize);

    const tick = () => {
      t += 0.018;
      h = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      w = window.innerWidth;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -2) p.x = w + 2;
        if (p.x > w + 2) p.x = -2;
        if (p.y < -2) p.y = h + 2;
        if (p.y > h + 2) p.y = -2;

        const twinkle = 0.55 + 0.45 * Math.sin(t * 1.6 + p.phase);
        const alpha = Math.min(0.9, p.base * twinkle * 1.4);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 min-h-full w-full bg-black"
      aria-hidden
    />
  );
}
