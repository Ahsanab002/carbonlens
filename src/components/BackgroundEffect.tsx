import { useEffect, useRef } from "react";

const BackgroundEffect = () => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number | null = null;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    let points: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    const pointCount = Math.max(12, Math.floor((window.innerWidth * window.innerHeight) / 150000));

    const initPoints = () => {
      points = [];
      for (let i = 0; i < pointCount; i++) {
        points.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: 1 + Math.random() * 2,
        });
      }
    };

    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      // subtle background tint
      ctx.fillStyle = "rgba(10,12,10,0.02)";
      ctx.fillRect(0, 0, w, h);

      // draw connections
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        for (let j = i + 1; j < points.length; j++) {
          const q = points[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.hypot(dx, dy);
          const maxDist = 160;
          if (dist < maxDist) {
            const alpha = 0.12 * (1 - dist / maxDist);
            ctx.strokeStyle = `hsla(142,48%,52%,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }

      // draw points
      for (const p of points) {
        ctx.fillStyle = "hsla(142,48%,62%,0.12)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      if (!prefersReduced) {
        for (const p of points) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -20) p.x = window.innerWidth + 20;
          if (p.x > window.innerWidth + 20) p.x = -20;
          if (p.y < -20) p.y = window.innerHeight + 20;
          if (p.y > window.innerHeight + 20) p.y = -20;
        }
      }
      draw();
      rafId = requestAnimationFrame(step);
    };

    const handleResize = () => {
      resize();
      initPoints();
    };

    resize();
    initPoints();
    rafId = requestAnimationFrame(step);
    window.addEventListener("resize", handleResize);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none"
    />
  );
};

export default BackgroundEffect;
