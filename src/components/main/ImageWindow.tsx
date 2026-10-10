'use client';
// 이미지 창 — 장식 이미지를 사이트 기본 패널 스타일의 창에 담아 보여준다.
// ✕를 누르면 칩으로 줄어들고, 칩을 누르면 다시 열린다. ⌄는 제목만 남기고 접는다.
// 「방문자가 옮길 수 있게」를 켜면 제목 줄(닫힌 상태에서는 칩)을 끌어 옮길 수 있다.
// 열림/닫힘과 옮긴 위치는 접속 중에만 기억하고, 새로고침하면 처음 상태로 돌아간다.
// (「기억하기」를 켜면 브라우저에 저장해 새로고침해도 유지한다)
import React, { useEffect, useRef, useState } from 'react';
import { WidgetConf, useMainStore } from '@/lib/mainStore';

type WinState = { closed: boolean; shaded: boolean };
type Pos = { x: number; y: number };
type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
type DragInfo = Bounds & { sx: number; sy: number; ox: number; oy: number; moved: boolean };

const ZERO: Pos = { x: 0, y: 0 };

// 접속 중에만 기억하는 값 — 메뉴를 옮겨 다녀도 유지되고, 새로고침하면 사라진다
const sessionPos = new Map<string, Pos>();
const sessionState = new Map<string, WinState>();

export function ImageWindow({ conf, children }: { conf: WidgetConf; children: React.ReactNode }) {
  const { editOn } = useMainStore();
  const s = conf.settings as {
    winTitle?: string; winStartClosed?: boolean; winMovable?: boolean; winKeepPos?: boolean;
  };
  const title = s.winTitle?.trim() || 'IMAGE';
  const keep = !!s.winKeepPos;   // 켜면 위치·열림/닫힘을 새로고침해도 유지
  const key = `ohome.imgwin.${conf.id}`;
  const posKey = `ohome.imgwin.pos.${conf.id}`;
  const initial: WinState = { closed: !!s.winStartClosed, shaded: false };

  const [st, setSt] = useState<WinState>(initial);
  const [pos, setPos] = useState<Pos>(ZERO);
  const [dragging, setDragging] = useState(false);
  const [mobile, setMobile] = useState(false);
  const posRef = useRef<Pos>(ZERO);
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragInfo | null>(null);
  const noClick = useRef(false);

  // 모바일(620px 이하)에서는 화면 스크롤과 겹쳐서 옮기기를 막는다
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 620px)');
    const h = () => setMobile(mq.matches);
    h();
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  // 열림/닫힘 상태와 위치를 불러온다
  useEffect(() => {
    let savedState: WinState | undefined;
    let savedPos: Pos | undefined;

    if (keep) {
      // 기억하기 — 브라우저에 저장된 값을 불러온다
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const p = JSON.parse(raw) as Partial<WinState>;
          savedState = { closed: !!p.closed, shaded: !!p.shaded };
        }
      } catch { /* 저장소를 못 쓰면 기본값 */ }
      try {
        const raw = localStorage.getItem(posKey);
        if (raw) {
          const p = JSON.parse(raw) as Partial<Pos>;
          if (Number.isFinite(p.x) && Number.isFinite(p.y)) savedPos = { x: p.x as number, y: p.y as number };
        }
      } catch { /* 무시 */ }
    } else {
      // 기본 — 예전에 저장돼 있던 값은 지우고, 접속 중에 바꾼 값만 되살린다
      try { localStorage.removeItem(key); localStorage.removeItem(posKey); } catch { /* 무시 */ }
      savedState = sessionState.get(conf.id);
      savedPos = sessionPos.get(conf.id);
    }

    // 저장된 게 없으면 설정에서 정한 처음 상태로
    setSt(savedState ?? { closed: !!s.winStartClosed, shaded: false });
    const p = savedPos ?? ZERO;
    posRef.current = p;
    setPos(p);
  }, [key, posKey, keep, conf.id, s.winStartClosed]);

  const change = (next: Partial<WinState>) => {
    const merged = { ...st, ...next };
    setSt(merged);
    sessionState.set(conf.id, merged);   // 접속 중 기억 (새로고침하면 사라짐)
    if (!keep) return;
    try { localStorage.setItem(key, JSON.stringify(merged)); } catch { /* 무시 */ }
  };

  const applyPos = (p: Pos) => { posRef.current = p; setPos(p); };
  const savePos = (p: Pos) => {
    const zero = p.x === 0 && p.y === 0;
    if (zero) sessionPos.delete(conf.id); else sessionPos.set(conf.id, p);
    if (!keep) return;
    try {
      if (zero) localStorage.removeItem(posKey);
      else localStorage.setItem(posKey, JSON.stringify(p));
    } catch { /* 무시 */ }
  };

  // 편집모드에서는 늘 열어 둔다 — 크기·위치를 맞추고 설정을 열려면 창이 보여야 한다
  const closed = st.closed && !editOn;
  const shaded = st.shaded && !editOn;
  // 옮기기는 설정이 켜져 있고, 편집모드가 아니고, 모바일이 아닐 때만
  const movable = !!s.winMovable && !editOn && !mobile;
  const off = movable ? pos : ZERO;

  /** 지금 보이는 창(또는 칩)이 화면 영역 안에 머물 수 있는 이동 범위 */
  const calcBounds = (cur: Pos): Bounds | null => {
    const vis = rootRef.current?.querySelector<HTMLElement>('.imgwin, .imgwin-chip');
    const area = document.getElementById('appMain');
    if (!vis || !area) return null;
    const r = vis.getBoundingClientRect();
    const a = area.getBoundingClientRect();
    const baseL = r.left - cur.x;   // 옮기지 않았을 때의 원래 자리
    const baseT = r.top - cur.y;
    const minX = a.left - baseL;
    const minY = a.top - baseT;
    return {
      minX, minY,
      maxX: Math.max(minX, a.right - r.width - baseL),
      maxY: Math.max(minY, a.bottom - r.height - baseT),
    };
  };
  const clampTo = (p: Pos, b: Bounds): Pos => ({
    x: Math.min(b.maxX, Math.max(b.minX, p.x)),
    y: Math.min(b.maxY, Math.max(b.minY, p.y)),
  });

  // 창을 열고 닫거나 화면 크기가 바뀌면 화면 밖으로 나간 창을 안으로 되돌린다
  useEffect(() => {
    if (!movable) return;
    const fit = () => {
      const b = calcBounds(posRef.current);
      if (!b) return;
      const next = clampTo(posRef.current, b);
      if (next.x !== posRef.current.x || next.y !== posRef.current.y) { applyPos(next); savePos(next); }
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [movable, keep, st.closed, st.shaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = (e: React.PointerEvent) => {
    if (!movable || e.button !== 0) return;
    const b = calcBounds(posRef.current);
    if (!b) return;
    drag.current = { ...b, sx: e.clientX, sy: e.clientY, ox: posRef.current.x, oy: posRef.current.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const moveDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;   // 살짝 눌렀다 뗀 건 클릭으로 본다
    if (!d.moved) { d.moved = true; setDragging(true); }
    applyPos(clampTo({ x: d.ox + dx, y: d.oy + dy }, d));
  };
  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* 무시 */ }
    setDragging(false);
    if (d.moved) {
      savePos(posRef.current);
      noClick.current = true;   // 끌고 놓은 직후의 클릭은 칩 열기로 처리하지 않는다
      setTimeout(() => { noClick.current = false; }, 50);
    }
  };
  const resetPos = () => { applyPos(ZERO); savePos(ZERO); };

  const dragProps = { onPointerMove: moveDrag, onPointerUp: endDrag, onPointerCancel: endDrag };
  const rootStyle = {
    translate: off.x || off.y ? `${off.x}px ${off.y}px` : undefined,
    position: 'relative',
    zIndex: off.x || off.y || dragging ? 30 : undefined,   // 옮긴 창이 옆 위젯 위로 오게
  } as React.CSSProperties;

  return (
    <div ref={rootRef} className={`imgwin-root ${dragging ? 'dragging' : ''}`} style={rootStyle}>
      {closed ? (
        // 닫힌 상태 — 알약 모양 칩
        <div className="imgwin-closed">
          <button className={`imgwin-chip ${movable ? 'movable' : ''}`}
            data-tip={movable ? '눌러서 열기 · 끌어서 이동' : '눌러서 열기'}
            onPointerDown={startDrag} {...dragProps}
            onClick={() => { if (noClick.current) return; change({ closed: false, shaded: false }); }}>
            <svg viewBox="0 0 16 16"
