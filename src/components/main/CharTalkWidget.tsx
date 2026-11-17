'use client';
// 캐릭터 말풍선 위젯 — 캐릭터를 누를 때마다 말풍선이 하나씩 뜨고, 오래된 말풍선은 위로 연해지다 사라진다.
// 설정(캐릭터 이미지·대사·색·크기 등)은 편집모드 우클릭 → 설정.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WidgetConf, useMainStore } from '@/lib/mainStore';
import { useBlobUrl } from '@/lib/blobStore';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { CharTalkEditor, CT_DEFAULTS, type CharTalkSettings } from '@/components/main/CharTalkEditor';

const FALLBACK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><circle cx='60' cy='62' r='46' fill='%23f4f2fb' stroke='%2337324a' stroke-width='2'/><circle cx='46' cy='58' r='5' fill='%2337324a'/><circle cx='74' cy='58' r='5' fill='%2337324a'/><path d='M50 76 q10 9 20 0' fill='none' stroke='%2337324a' stroke-width='2' stroke-linecap='round'/></svg>";

type Row = { id: number; text: string; on: boolean; out: boolean };
const SPD = 320;   // 말풍선 애니메이션(ms) — chartalk.css의 --ct-spd와 같게
let rowSeq = 1;

/** 뾰잉 효과음 — 파일 없이 브라우저가 직접 만든다 */
function useBoing(enabled: boolean) {
  const ref = useRef<AudioContext | null>(null);
  return useCallback(() => {
    if (!enabled) return;
    try {
      const AC = window.AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = ref.current ?? (ref.current = new AC());
      if (ac.state === 'suspended') void ac.resume();
      const t = ac.currentTime;
      const o = ac.createOscillator(), g = ac.createGain();
      const lfo = ac.createOscillator(), lg = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(950, t + 0.08);
      o.frequency.exponentialRampToValueAtTime(600, t + 0.22);
      lfo.frequency.value = 22; lg.gain.value = 40;   // 살짝 떨리는 느낌
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 0.3);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + 0.3);
    } catch { /* 소리를 못 내면 무시 */ }
  }, [enabled]);
}

function useEditEvent(id: string, onOpen: () => void) {
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail?.id === id) onOpen(); };
    window.addEventListener('ohome-widget-edit', h);
    return () => window.removeEventListener('ohome-widget-edit', h);
  }, [id, onOpen]);
}

export function CharTalkWidget({ conf }: { conf: WidgetConf }) {
  const { updateWidget } = useMainStore();
  const toast = useToast();
  const s = conf.settings as CharTalkSettings;
  const [open, setOpen] = useState(false);
  useEditEvent(conf.id, () => setOpen(true));

  const lines = (s.lines && s.lines.some(l => l.trim()) ? s.lines : CT_DEFAULTS.lines).map(l => l.trim()).filter(Boolean);
  const max = Math.max(1, s.max ?? CT_DEFAULTS.max);
  const imgUrl = useBlobUrl(s.img);
  const boing = useBoing(s.sound ?? false);

  const [rows, setRows] = useState<Row[]>([]);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const say = () => {
    boing();
    const id = rowSeq++;
    const text = s.random
      ? lines[Math.floor(Math.random() * lines.length)]
      : lines[seq.current++ % lines.length];
    setRows(prev => {
      const live = prev.filter(r => !r.out);
      let next = prev;
      if (live.length >= max) {
        const old = live[0];
        next = prev.map(r => (r.id === old.id ? { ...r, on: false, out: true } : r));
        timers.current.push(window.setTimeout(() => setRows(p => p.filter(r => r.id !== old.id)), SPD + 30));
      }
      return [...next, { id, text, on: false, out: false }];
    });
    requestAnimationFrame(() => requestAnimationFrame(() =>
      setRows(p => p.map(r => (r.id === id ? { ...r, on: true } : r)))));
  };

  const live = rows.filter(r => !r.out);
  const opacityOf = (id: number) => {
    const k = live.findIndex(r => r.id === id);
    return k < 0 ? 0 : ([1, 0.6, 0.32, 0.2][live.length - 1 - k] ?? 0.15);
  };

  const size = s.size ?? CT_DEFAULTS.size;
  const bubW = s.bubW ?? CT_DEFAULTS.bubW;
  const style = {
    '--ct-char': `${size}px`, '--ct-bubw': `${bubW}px`, '--ct-font': `${s.font ?? CT_DEFAULTS.font}px`,
    '--ct-area': `${max * 70}px`,
    '--ct-bubble': s.bubble || CT_DEFAULTS.bubble, '--ct-ink': s.line || CT_DEFAULTS.line,
    '--ct-text': s.text || CT_DEFAULTS.text,
  } as React.CSSProperties;

  return (
    <div className="ct-widget">
      <div className="ct-wrap" style={style}>
        <div className="ct-bubbles">
          {rows.map(r => (
            <div key={r.id} className={`ct-row ${r.on ? 'on' : ''} ${r.out ? 'out' : ''}`}>
              <div><p className="ct-bub" style={{ ['--o' as string]: opacityOf(r.id) } as React.CSSProperties}>{r.text}</p></div>
            </div>
          ))}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ct-char" src={imgUrl || FALLBACK} alt="캐릭터" draggable={false} onClick={say} />
      </div>

      <div onClick={e => e.stopPropagation()}>
        <Modal open={open} onClose={() => setOpen(false)} title="캐릭터 말풍선 설정"
          desc="캐릭터 이미지와 대사를 등록하세요 — 캐릭터를 누르면 대사가 말풍선으로 떠요">
          {open && (
            <CharTalkEditor value={s}
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
