'use client';

import { useEffect, useRef } from 'react';

type Mote = {
  x: number; y: number;
  z: number;       // 0(멀리·작음) ~ 1(가까이·큼)
  vx: number; vy: number;
  phase: number; speed: number; tw: number;
  star: boolean;   // 별 모양 반짝임 여부
  c: number;       // 색 번호
};

// 부드러운 빛 알갱이 — 미리 한 장 그려 두고 재사용 (매 프레임 그라디언트 생성은 느림)
function makeGlow(color: string) {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, s, s);
  return c;
}

// 4갈래 별 반짝임
function makeStar(color: string) {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  g.translate(s / 2, s / 2);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, -30);
  g.quadraticCurveTo(2, -2, 30, 0);
  g.quadraticCurveTo(2, 2, 0, 30);
  g.quadraticCurveTo(-2, 2, -30, 0);
  g.quadraticCurveTo(-2, -2, 0, -30);
  g.fill();
  const core = g.createRadialGradient(0, 0, 0, 0, 0, 10);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = core;
  g.beginPath();
  g.arc(0, 0, 10, 0, Math.PI * 2);
  g.fill();
  return c;
}

export function SparkleDust({
  count = 150,                                    // 알갱이 개수 (모바일은 절반)
  speed = 1,                                     // 움직임 속도 배율
  colors = ['#fff'],    // 섞어 쓸 빛 색
  stars = 0,                                  // 별 모양 반짝임 비율 (0~1)
  layer = 'back',                                // 'back' = 글·카드 뒤 / 'front' = 앞
}: {
  count?: number;
  speed?: number;
  colors?: string[];
  stars?: number;
  layer?: 'back' | 'front';
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const total = window.innerWidth < 620 ? Math.round(count / 2) : count;
    const glows = colors.map(makeGlow);
    const starSprites = colors.map(makeStar);
    let w = 0, h = 0, raf = 0, last = performance.now(), t = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const motes: Mote[] = Array.from({ length: total }, () => {
      const z = Math.random() ** 1.5; // 먼 것(작은 것)이 더 많게
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        z,
        vx: (Math.random() - 0.5) * 8,
        vy: -(3 + z * 10),            // 천천히 떠오름
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.6,
        tw: 0.6 + Math.random() * 1.8,
        star: Math.random() < stars,
        c: Math.floor(Math.random() * colors.length),
      };
    });

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter'; // 겹치면 더 밝게

      for (const m of motes) {
        m.phase += dt * m.speed;
        m.x += (m.vx + Math.sin(m.phase * 0.7) * 6) * speed * dt;
        m.y += m.vy * speed * dt;

        const d = m.star ? 14 + m.z * 18 : 4 + m.z * 14;
        if (m.y < -d) m.y = h + d;
        if (m.y > h + d) m.y = -d;
        if (m.x < -d) m.x = w + d;
        if (m.x > w + d) m.x = -d;

        // 세제곱으로 깜빡임을 날카롭게 — 대부분 은은하다가 가끔 번쩍
        const pulse = Math.pow(0.5 + 0.5 * Math.sin(t * m.tw + m.phase), 3);
        ctx.globalAlpha = (0.9 - m.z * 0.4) * (0.2 + 0.8 * pulse);
        const sprite = m.star ? starSprites[m.c] : glows[m.c];
        ctx.drawImage(sprite, m.x - d / 2, m.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [count, speed, stars, colors.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: layer === 'back' ? -1 : 50,
      }}
    />
  );
}
