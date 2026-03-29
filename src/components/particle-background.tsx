"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

export function ParticleBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctxMaybe = canvas.getContext("2d");
    if (!ctxMaybe) return;
    const render: CanvasRenderingContext2D = ctxMaybe;

    let animationId = 0;
    let particles: Particle[] = [];
    let w = 0;
    let h = 0;

    function resize() {
      const c = ref.current;
      if (!c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      const g = c.getContext("2d");
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = Math.min(96, Math.max(48, Math.floor((w * h) / 22000)));
      particles = Array.from({ length: target }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.1 + 0.35,
      }));
    }

    resize();
    window.addEventListener("resize", resize);

    const maxDist = 118;
    const lineAlpha = 0.12;

    function tick() {
      render.fillStyle = "#030303";
      render.fillRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -8) p.x = w + 8;
        if (p.x > w + 8) p.x = -8;
        if (p.y < -8) p.y = h + 8;
        if (p.y > h + 8) p.y = -8;
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < maxDist) {
            const alpha = (1 - d / maxDist) * lineAlpha;
            render.strokeStyle = `rgba(200, 210, 230, ${alpha})`;
            render.lineWidth = 0.45;
            render.beginPath();
            render.moveTo(a.x, a.y);
            render.lineTo(b.x, b.y);
            render.stroke();
          }
        }
      }

      for (const p of particles) {
        render.beginPath();
        render.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        render.fillStyle = "rgba(248, 250, 255, 0.42)";
        render.fill();
      }

      animationId = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      aria-hidden
    />
  );
}
