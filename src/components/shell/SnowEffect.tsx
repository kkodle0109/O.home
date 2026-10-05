'use client';

import { useEffect, useRef } from 'react';

type Flake = {
  x: number; y: number;
  z: number;      // 0(멀리·작고 선명) ~ 1(가까이·크고 흐림)
  vy: number; sway: number; phase: number; tw: number;
  sprite: number; // 색 번호
};

// 부드러운 빛 덩어리 한 장을 미리 그려 두고 재사용한다 (매 프레임 그라디언트를 만들면 느림)
function makeSprite(color: string) {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'source-in'; // 흰 빛 모양 그대로 색만 입힌다
  g.fillStyle = color;
  g.fillRect(0, 0, s, s);
  return c;
}

export function SnowEffect({
  count = 120,                                    // 눈송이 개수 (모바일은 절반)
  speed = 0.7,                                     // 떨어지는 속도 배율
  colors = ['#ffffff'],    // 섞어 쓸 빛 색
  glow = true,                                   // 겹치면 더 밝아지는 발광 합성
  blur = 1.5,                                      // 전체에 추가로 거는 블러(px). 0이면 끔
}: {
  count?: number;
  speed?: number;
  colors?: string[];
  glow?: boolean;
  blur?: number;
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
    const sprites = colors.map(makeSprite);
    let w = 0, h = 0, raf = 0, last = performance.now(), t = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const make = (): Flake => {
      const z = Math.random() ** 1.5; // 멀리 있는(작은) 눈이 더 많게
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        z,
        vy: 25 + z * 70,
        sway: 10 + z * 30,
        phase: Math.random() * Math.PI * 2,
        tw: 0.8 + Math.random() * 1.6,
        sprite: Math.floor(Math.random() * sprites.length),
      };
    };
    const flakes = Array.from({ length: total }, make);

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = glow ? 'lighter' : 'source-over';

      for (const f of flakes) {
        f.y += f.vy * speed * dt;
        f.phase += dt * 0.6;
        const d = 6 + f.z * 30; // 지름
        if (f.y > h + d) {
          f.y = -d;
          f.x = Math.random() * w;
        }
        const x = f.x + Math.sin(f.phase) * f.sway;
        // 가까운 눈일수록 크고 옅게, 살짝 반짝임
        const twinkle = 0.7 + 0.3 * Math.sin(t * f.tw + f.phase);
        ctx.globalAlpha = (0.85 - f.z * 0.45) * twinkle;
        ctx.drawImage(sprites[f.sprite], x - d / 2, f.y - d / 2, d, d);
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
    // colors 배열은 매번 새로 만들어지므로 문자열로 합쳐서 비교
  }, [count, speed, glow, colors.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

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
        zIndex: -1,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
      }}
    />
  );
}
