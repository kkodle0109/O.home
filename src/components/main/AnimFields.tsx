'use client';
// 위젯 애니메이션 선택 칸 — 종류 / 속도 / 크기
import { KSelect, KStep } from '@/components/ui/Kit';
import { ANIM_OPTIONS, type WidgetAnim } from '@/lib/widgetAnim';

export function AnimFields({ anim, speed, size, onChange }: {
  anim: WidgetAnim;
  speed: number;   // 1 = 기본
  size: number;    // 1 = 기본
  onChange: (patch: { anim?: WidgetAnim; animSpeed?: number; animSize?: number }) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="cp-lb">애니메이션</span>
        <KSelect minWidth={130} value={anim}
          onChange={v => onChange({ anim: v as WidgetAnim })}
          options={ANIM_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
        {anim !== 'none' && (
          <>
            <span className="cp-lb">속도</span>
            <KStep value={Math.round(speed * 100)} min={50} max={300} step={10} suffix="%"
              onChange={v => onChange({ animSpeed: v / 100 })} />
            {/* 회전은 움직이는 크기가 없어서 크기 칸을 숨긴다 */}
            {anim !== 'spin' && (
              <>
                <span className="cp-lb">크기</span>
                <KStep value={Math.round(size * 100)} min={50} max={300} step={10} suffix="%"
                  onChange={v => onChange({ animSize: v / 100 })} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
