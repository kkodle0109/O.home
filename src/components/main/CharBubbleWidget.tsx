'use client';
// 캐릭터 말풍선 위젯 — 캐릭터를 누르면 말풍선이 하나씩 쌓이고, 가득 차면 오래된 것부터 사라진다.
// 동작 방식은 https://umatoma.tistory.com/8 의 「캐릭터 말풍선 위젯」을 이 사이트 위젯에 맞게 새로 옮겨 만든 것이다.
// (효과음은 파일 없이 브라우저가 직접 만들고, 픽셀 폰트는 갈무리 — SIL Open Font License 1.1)
import React, { useEffect, useRef, useState } from 'react';
import { WidgetConf, useMainStore } from '@/lib/mainStore';
import { useAuth } from '@/lib/auth';
import { useBlobUrl } from '@/lib/blobStore';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { CharBubbleEditor, CharBubbleSettings } from '@/components/main/CharBubbleEditor';

type Row = { id: number; text: string; phase: 'in' | 'on' | 'out' };

// 이미지를 정하지 않았을 때 보이는 기본 얼굴
const FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>"
  + "<circle cx='60' cy='62' r='46' fill='#f4f2fb' stroke='#37324a' stroke-width='2'/>"
  + "<circle cx='46' cy='58' r='5' fill='#37324a'/><circle cx='74' cy='58' r='5' fill='#37324a'/>"
  + "<path d='M50 76 q10 9 20 0' fill='none' stroke='#37324a' stroke-width='2' stroke-linecap='round'/></svg>");

/* 뾰잉 효과음 — 파일 없이 브라우저가 직접 만든다 */
let ac: AudioContext | null = null;
function boing(vol: number) {
  try {
    const AC = window.AudioContext
      || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ac = ac ?? new AC();
    if (ac.state === 'suspended') void ac.resume();
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    const lfo = ac.createOscillator();
    const lg = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(950, t + 0.08);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.22);
    lfo.frequency.value = 22;           // 살짝 떨리는 느낌
    lg.gain.value = 40;
    lfo.connect(lg);
    lg.connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + 0.3);
  } catch { /* 소리를 못 내면 무시 */ }
}

/* 편집모드 우클릭 「설정」 → 이 위젯의 설정 모달 열기 (다른 위젯과 같은 방식) */
function useEditEvent(id: string, onOpen: () => void) {
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail?.id === id) onOpen(); };
    window.addEventListener('ohome-widget-edit', h);
    return () => window.removeEventListener('ohome-widget-edit', h);
  }, [id, onOpen]);
}

export function CharBubble({ settings }: { settings: CharBubbleSettings }) {
  const { isAdmin } = useAuth();
  const { editOn } = useMainStore();
  const imgUrl = useBlobUrl(settings.img);
  const lines = (settings.text ?? '').split('\n').map(t => t.trim()).filter(Boolean);
  const max = Math.max(1, Math.min(6, Math.round(settings.max ?? 3)));
  const spd = Math.min(1.5, Math.max(0.05, settings.speed ?? 0.32));

  const [rows, setRows] = useState<Row[]>([]);
  const rowsRef = useRef<Row[]>([]);      // 연속 클릭에도 최신 목록을 보도록 따로 들고 있는다
  const seq = useRef(0);
  const nextLine = useRef(0);
  const alive = useRef(true);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; timers.current.forEach(t => clearTimeout(t)); };
  }, []);

  const commit = (next: Row[]) => { rowsRef.current = next; setRows(next); };

  const click = () => {
    if (editOn || !lines.length) return;   // 편집모드에서는 위젯 배치가 우선
    if (settings.sound === 'boing') boing(Math.min(1, Math.max(0.02, settings.volume ?? 0.18)));

    const cur = rowsRef.current;
    const live = cur.filter(r => r.phase !== 'out');
    let next = cur;
    // 가득 차면 가장 오래된 말풍선을 사라지게 한다
    if (live.length >= max) {
      const oldest = live[0];
      next = next.map(r => (r.id === oldest.id ? { ...r, phase: 'out' as const } : r));
      timers.current.push(window.setTimeout(() => {
        if (alive.current) commit(rowsRef.current.filter(r => r.id !== oldest.id));
      }, spd * 1000 + 30));
    }
    const id = ++seq.current;
    const text = settings.random
      ? lines[Math.floor(Math.random() * lines.length)]
      : lines[nextLine.current++ % lines.length];
    commit([...next, { id, text, phase: 'in' }]);
    // 두 프레임 뒤에 등장 효과를 시작해야 transition이 먹는다
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (alive.current) commit(rowsRef.current.map(r => (r.id === id ? { ...r, phase: 'on' as const } : r)));
    }));
  };

  const vars = {
    '--cb-char': `${settings.size ?? 120}px`,
    '--cb-bubw': `${settings.bubbleW ?? 180}px`,
    '--cb-font': `${settings.font ?? 14}px`,
    '--cb-area': `${settings.area ?? 210}px`,
    '--cb-radius': `${settings.radius ?? 18}px`,
    '--cb-spd': `${spd}s`,
    '--cb-bubble': settings.bubble || '#ffffff',
    '--cb-ink': settings.line || '#37324a',
    '--cb-text': settings.textColor || '#37324a',
  } as React.CSSProperties;

  // 위로 갈수록 연해지는 단계 — 개수가 바뀔 때 깜빡이지 않도록 직접 계산한다
  const live = rows.filter(r => r.phase !== 'out');

  return (
    <div className={`cb-wrap ${settings.pixel ? 'pixel' : ''}`} style={vars}>
      <div className="cb-bubbles">
        {rows.map(r => {
          const k = live.indexOf(r);
          const o = k >= 0 ? ([1, 0.6, 0.32, 0.2][live.length - 1 - k] ?? 0.15) : undefined;
          return (
            <div key={r.id}
              className={`cb-row ${r.phase === 'on' ? 'on' : r.phase === 'out' ? 'out' : ''}`}
              style={o !== undefined ? ({ '--o': o } as React.CSSProperties) : undefined}>
              <div><p className="cb-bub">{r.text}</p></div>
            </div>
          );
        })}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="cb-char" src={imgUrl || FALLBACK} alt="캐릭터" draggable={false} onClick={click} />
      {!lines.length && isAdmin && (
        <p className="hint" style={{ marginTop: 6 }}>편집모드에서 우클릭 → 설정으로 대사를 적어 주세요</p>
      )}
    </div>
  );
}

export function CharBubbleWidget({ conf }: { conf: WidgetConf }) {
  const { updateWidget } = useMainStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  useEditEvent(conf.id, () => setOpen(true));
  const settings = conf.settings as CharBubbleSettings;

  return (
    <div className="cb-widget">
      <CharBubble settings={settings} />
      <div onClick={e => e.stopPropagation()}>
        <Modal open={open} onClose={() => setOpen(false)} title="캐릭터 말풍선"
          desc="캐릭터를 누르면 말풍선이 하나씩 쌓입니다 — 이미지·대사·색을 정해 주세요">
          {open && (
            <CharBubbleEditor value={settings}
              onSave={v => {
                updateWidget(conf.id, { settings: { ...conf.settings, ...v } }, { persist: true });
                setOpen(false);
                toast('캐릭터 말풍선 설정이 저장되었습니다');
              }}
              onClose={() => setOpen(false)} />
          )}
        </Modal>
      </div>
    </div>
  );
}
