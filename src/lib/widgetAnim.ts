import type { CSSProperties } from 'react';

export type WidgetAnim = 'none' | 'float' | 'sway' | 'bounce';

// 설정창의 선택지로 쓸 목록
export const ANIM_OPTIONS: { value: WidgetAnim; label: string }[] = [
  { value: 'none', label: '없음' },
  { value: 'float', label: '둥실' },
  { value: 'sway', label: '살랑' },
  { value: 'bounce', label: '통통' },
];

// 기본 시간(초)과 움직임 크기 (float·bounce는 px, sway는 도)
const BASE = {
  float: { dur: 4, amp: 10 },
  sway: { dur: 3, amp: 3 },
  bounce: { dur: 1.4, amp: 14 },
};

/** 이미지에 붙일 클래스 이름 */
export function animClass(a?: WidgetAnim) {
  return a && a !== 'none' ? `wa-${a}` : '';
}

/** speed: 1=기본, 2=두 배 빠르게 / size: 1=기본, 2=두 배 크게 */
export function animStyle(a?: WidgetAnim, speed = 1, size = 1): CSSProperties | undefined {
  if (!a || a === 'none') return undefined;
  const b = BASE[a];
  return {
    ['--wa-dur' as string]: `${(b.dur / speed).toFixed(2)}s`,
    ['--wa-amp' as string]: `${(b.amp * size).toFixed(1)}px`,
    ['--wa-deg' as string]: `${(b.amp * size).toFixed(1)}deg`,
  } as CSSProperties;
}
