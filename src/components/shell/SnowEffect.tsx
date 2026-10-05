'use client';

import { useEffect, useRef } from 'react';

type Flake = { x: number; y: number; size: number; vy: number; sway: number; phase: number };

export function SnowEffect({
  count = 80,      // 눈송이 개수 (모바일은 절반)
  speed = 1,       // 떨어지는 속도 배율
  color = '#fff',  // 눈 색
  outline = true,  // 검은 테두리 (흰 패널 위에서도 보이게)
}: {
  count?: number;
  speed?: number;
  color?: string;
  outline?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    // 「동작 줄이기」를 켠 사용자에게는 보여주지 않음
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const total = window.innerWidth < 620 ? Math.round(count / 2) : count;
    let w = 0, h = 0, raf = 0, last = performance.now();

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const flakes: Flake[] = Array.from({ length: total }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 2 + Math.floor(Math.random() * 3),   // 2~4px
      vy: 30 + Math.random() * 50,                // 초당 이동 px
      sway: 8 + Math.random() * 16,               // 좌우 흔들림 폭
      phase: Math.random() * Math.PI * 2,
    }));

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);

      for (const f of flakes) {
        f.y += f.vy * speed * dt;
        f.phase += dt;
        if (f.y > h + 10) {            // 바닥에 닿으면 위에서 다시
          f.y = -10;
          f.x = Math.random() * w;
        }
        const x = Math.round(f.x + Math.sin(f.phase) * f.sway);
        const y = Math.round(f.y);
        if (outline) {
          ctx.fillStyle = '#000';
          ctx.fillRect(x - 1, y - 1, f.size + 2, f.size + 2);
        }
        ctx.fillStyle = color;
        ctx.fillRect(x, y, f.size, f.size);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [count, speed, color, outline]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // 클릭을 가로막지 않음
        zIndex: 50,            // 상단바(60)·BGM(70)·모달(90) 아래
      }}
    />
  );
}
