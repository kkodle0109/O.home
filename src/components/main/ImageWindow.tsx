'use client';
// 이미지 창 — 장식 이미지를 사이트 기본 패널 스타일의 창에 담아 보여준다.
// ✕를 누르면 칩으로 줄어들고, 칩을 누르면 다시 열린다. ⌄는 제목만 남기고 접는다.
// 열림/닫힘은 방문자 브라우저에 기억된다.
import React, { useEffect, useState } from 'react';
import { WidgetConf, useMainStore } from '@/lib/mainStore';

type WinState = { closed: boolean; shaded: boolean };

export function ImageWindow({ conf, children }: { conf: WidgetConf; children: React.ReactNode }) {
  const { editOn } = useMainStore();
  const s = conf.settings as { winTitle?: string; winStartClosed?: boolean };
  const title = s.winTitle?.trim() || 'IMAGE';
  const key = `ohome.imgwin.${conf.id}`;

  const [st, setSt] = useState<WinState>({ closed: !!s.winStartClosed, shaded: false });

  // 방문자가 마지막에 둔 상태를 불러온다
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const p = JSON.parse(raw) as Partial<WinState>;
        setSt({ closed: !!p.closed, shaded: !!p.shaded });
      }
    } catch { /* 저장소를 못 쓰면 기본값 */ }
  }, [key]);

  const change = (next: Partial<WinState>) => {
    const merged = { ...st, ...next };
    setSt(merged);
    try { localStorage.setItem(key, JSON.stringify(merged)); } catch { /* 무시 */ }
  };

  // 편집모드에서는 늘 열어 둔다 — 크기·위치를 맞추고 설정을 열려면 창이 보여야 한다
  const closed = st.closed && !editOn;
  const shaded = st.shaded && !editOn;

  // 닫힌 상태 — 알약 모양 칩
  if (closed) {
    return (
      <div className="imgwin-closed">
        <button className="imgwin-chip" data-tip="눌러서 열기"
          onClick={() => change({ closed: false, shaded: false })}>
          <svg viewBox="0 0 16 16" aria-hidden>
            <rect x="2" y="3" width="12" height="10" rx="1.5" />
            <circle cx="6" cy="7" r="1.2" />
            <path d="M3 12l3.5-3.5 2.5 2.5 2-2 2 2" />
          </svg>
          <span>{title}</span>
        </button>
      </div>
    );
  }

  // 열린 상태 — 패널 창
  return (
    <div className={`imgwin imgwin-open ${shaded ? 'shaded' : ''}`}>
      <header className="imgwin-bar">
        <span className="imgwin-title">{title}</span>
        <button className="imgwin-btn imgwin-fold" aria-label={shaded ? '펼치기' : '접기'}
          data-tip={shaded ? '펼치기' : '접기'}
          onClick={() => { if (!editOn) change({ shaded: !st.shaded }); }}>
          <svg viewBox="0 0 16 16" aria-hidden><path d="M4 6l4 4 4-4" /></svg>
        </button>
        <button className="imgwin-btn" aria-label="창 닫기" data-tip="닫기"
          onClick={() => { if (!editOn) change({ closed: true }); }}>
          <svg viewBox="0 0 16 16" aria-hidden><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </button>
      </header>
      {!shaded && <div className="imgwin-body">{children}</div>}
    </div>
  );
}
