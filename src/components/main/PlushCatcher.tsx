'use client';
// 인형뽑기 — 크레인을 좌우로 옮겨 인형을 뽑으면 사이트의 갤러리 글 하나가 랜덤으로 나온다.
// 인형 이미지·기계 색·효과음·안내 문구는 settings로 바꾼다 (위젯으로 등록하면 설정창에서 지정).
'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBlobUrl } from '@/lib/blobStore';
import { Modal } from '@/components/ui/Modal';

export interface CatcherSettings {
  export interface CatcherSettings {
  dolls?: string[];
  prizes?: string[];
  color?: string;
  sound?: boolean;
  slip?: number;
}

type Doll = { id: number; x: number; img: number };
type Phase = 'idle' | 'busy';

const DUR = 900;                 // 크레인이 오르내리는 시간(ms) — plush-catcher.css의 --pc-dur와 같게
const HIT = 8.5;                 // 집을 수 있는 가로 오차(%)
const CHUTE_X = 10;              // 출구 위치(%)
const MIN_X = 8;
const MAX_X = 92;
const DOLL_COUNT = 5;
const HEAD_TOP = 8;              // 크레인 머리의 기본 높이(%)
const REACH = 66;                // 바닥까지 내려가는 거리(%)
const TONES = ['#f2b8c6', '#b9d6f2', '#f6e3a1', '#c9e4c5'];

let dollSeq = 1;
/** 겹치지 않는 자리에 인형 하나를 만든다 */
function makeDoll(existing: Doll[], imgs: number): Doll | null {
  for (let i = 0; i < 60; i++) {
    const x = 28 + Math.random() * 60;
    if (existing.every(d => Math.abs(d.x - x) >= 13)) {
      return { id: dollSeq++, x, img: Math.floor(Math.random() * Math.max(1, imgs)) };
    }
  }
  return null;
}

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** 효과음 — 소리 파일 없이 브라우저가 직접 만든다 */
function useBeep(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback((freq: number, dur = 0.08, type: OscillatorType = 'square', gain = 0.04) => {
    if (!enabled) return;
    try {
      const AC = window.AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = ctxRef.current ?? (ctxRef.current = new AC());
      if (ctx.state === 'suspended') void ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur);
    } catch { /* 소리를 못 내면 무시 */ }
  }, [enabled]);
}

/** 기본 봉제인형 */
function PlushSvg({ tone }: { tone: number }) {
  const c = TONES[tone % TONES.length];
  const line = 'rgba(0,0,0,.35)';
  return (
    <svg viewBox="0 0 64 64" className="pc-doll-img" aria-hidden>
      <circle cx="16" cy="16" r="9" fill={c} stroke={line} strokeWidth="2" />
      <circle cx="48" cy="16" r="9" fill={c} stroke={line} strokeWidth="2" />
      <ellipse cx="32" cy="38" rx="22" ry="20" fill={c} stroke={line} strokeWidth="2" />
      <circle cx="24" cy="34" r="2.6" fill="#333" />
      <circle cx="40" cy="34" r="2.6" fill="#333" />
      <ellipse cx="32" cy="42" rx="4" ry="3" fill="#333" opacity=".75" />
    </svg>
  );
}

/** 인형 한 마리 — 지정한 이미지가 있으면 그것, 없으면 기본 인형 */
function DollArt({ refId, idx }: { refId?: string; idx: number }) {
  const url = useBlobUrl(refId);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" draggable={false} className="pc-doll-img" />;
  }
  return <PlushSvg tone={idx} />;
}

export function PlushCatcher({ settings }: { settings: CatcherSettings }) {
  const color = settings.color || '#a63a45';
  const sound = settings.sound ?? true;
  const slip = Math.min(1, Math.max(0, settings.slip ?? 0.2));
  const dollRefs = (settings.dolls ?? []).slice(0, 10);
const prizeRefs = (settings.prizes ?? []).slice(0, 10);

const imgCount = dollRefs.length || TONES.length;

const refOf = (img: number) =>
  dollRefs.length ? dollRefs[img % dollRefs.length] : undefined;
  const cat = settings.category?.trim();
  
  const [x, setX] = useState(50);
  const [reach, setReach] = useState(0);        // 0 = 위, 1 = 바닥
  const [open, setOpen] = useState(true);       // 집게가 벌어졌는지
  const [holding, setHolding] = useState<Doll | null>(null);
  const [dolls, setDolls] = useState<Doll[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [msg, setMsg] = useState('');
  const [prize, setPrize] = useState<string | null>(null);
  const prizeUrl = useBlobUrl(prize ?? undefined);

  const xRef = useRef(50);
  const moveRef = useRef<number | null>(null);
  const alive = useRef(true);
  const beep = useBeep(sound);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { xRef.current = x; }, [x]);

  // 인형 배치 — 화면이 뜬 뒤에 만든다 (서버 화면과 어긋나지 않게)
  useEffect(() => {
    const list: Doll[] = [];
    for (let i = 0; i < DOLL_COUNT; i++) {
      const d = makeDoll(list, imgCount);
      if (d) list.push(d);
    }
    setDolls(list);
  }, [imgCount]);

  const stopMove = useCallback(() => {
    if (moveRef.current !== null) { clearInterval(moveRef.current); moveRef.current = null; }
  }, []);
  useEffect(() => stopMove, [stopMove]);

  const startMove = (dir: -1 | 1) => {
    if (phase !== 'idle') return;
    stopMove();
    const step = () => setX(v => Math.min(MAX_X, Math.max(MIN_X, v + dir * 1.2)));
    step();
    beep(620, 0.03, 'square', 0.02);
    moveRef.current = window.setInterval(step, 28);
  };

  const grab = async () => {
    if (phase !== 'idle') return;
    stopMove();
    setPhase('busy');
    setMsg('');
    const gx = xRef.current;

    // 1) 내려간다
    beep(330, 0.14, 'sawtooth');
    setOpen(true);
    setReach(1);
    await wait(DUR + 50); if (!alive.current) return;

    // 2) 집는다
    setOpen(false);
    beep(220, 0.1, 'square');
    await wait(450); if (!alive.current) return;

    // 가장 가까운 인형 (가로 오차 안에 있어야 집힌다)
    const target = dolls.reduce<Doll | null>((best, d) => {
      const dist = Math.abs(d.x - gx);
      if (dist > HIT) return best;
      return !best || dist < Math.abs(best.x - gx) ? d : best;
    }, null);

    if (!target) {
      setReach(0);
      await wait(DUR + 50); if (!alive.current) return;
      beep(180, 0.2, 'triangle');
      setMsg('아쉬워요, 다시 도전!');
      setPhase('idle');
      return;
    }
    setHolding(target);
    setDolls(ds => ds.filter(d => d.id !== target.id));

    // 3) 올라가다가 놓칠 수 있다
    setReach(0.5);
    await wait(DUR + 50); if (!alive.current) return;
    if (Math.random() < slip) {
      setHolding(null);
      setDolls(ds => [...ds, { ...target, x: gx }]);
      beep(150, 0.3, 'triangle');
      setMsg('앗, 놓쳤어요!');
      setReach(0);
      await wait(DUR + 50); if (!alive.current) return;
      setPhase('idle');
      return;
    }
    setReach(0);
    await wait(DUR + 50); if (!alive.current) return;

    // 4) 출구로 옮긴다
    setX(CHUTE_X);
    await wait(DUR + 50); if (!alive.current) return;

    // 5) 놓는다 → 선물
    setOpen(true);
    setHolding(null);
    beep(523, 0.12);
    setTimeout(() => beep(659, 0.12), 120);
    setTimeout(() => beep(784, 0.22), 240);
    setDolls(ds => { const d = makeDoll(ds, imgCount); return d ? [...ds, d] : ds; });  // 새 인형 보충
    await wait(500); if (!alive.current) return;
    setOpen(false);
    const selectedPrize = prizeRefs[target.img];
if (selectedPrize) {
  setPrize(selectedPrize);
} else {
  setMsg('이 인형에는 상품 이미지가 등록되지 않았어요.');
}

setPhase('idle');
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (phase !== 'idle') return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); setX(v => Math.max(MIN_X, v - 3)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setX(v => Math.min(MAX_X, v + 3)); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); void grab(); }
  };

  const headTop = `${HEAD_TOP + reach * REACH}%`;
  const busy = phase !== 'idle';

  return (
    <div className="pc-wrap" style={{ ['--pc-color' as string]: color } as React.CSSProperties}>
      <div className="pc-machine" tabIndex={0} onKeyDown={onKey} aria-label="인형뽑기 기계">
        <div className="pc-title">PRIZE CRANE</div>

        <div className={`pc-glass ${busy ? 'auto' : ''}`}>
          <div className="pc-rail" />
          <div className="pc-claw" style={{ left: `${x}%` }}>
            <div className="pc-rope" style={{ height: headTop }} />
            <div className={`pc-head ${open ? 'open' : ''}`} style={{ top: headTop }}>
              {holding && <div className="pc-held"><DollArt refId={refOf(holding.img)} idx={holding.img} /></div>}
              <i className="pc-prong l" />
              <i className="pc-prong r" />
            </div>
          </div>
          {dolls.map(d => (
            <div key={d.id} className="pc-doll" style={{ left: `${d.x}%` }}>
              <DollArt refId={refOf(d.img)} idx={d.img} />
            </div>
          ))}
          <div className="pc-chute"><span>OUT</span></div>
        </div>

        <div className="pc-ctrl">
          <button className="pc-btn" aria-label="왼쪽으로" disabled={busy}
            onPointerDown={() => startMove(-1)} onPointerUp={stopMove}
            onPointerLeave={stopMove} onPointerCancel={stopMove}>◀</button>
          <button className="pc-grab" disabled={busy} onClick={() => void grab()}>GRAB</button>
          <button className="pc-btn" aria-label="오른쪽으로" disabled={busy}
            onPointerDown={() => startMove(1)} onPointerUp={stopMove}
            onPointerLeave={stopMove} onPointerCancel={stopMove}>▶</button>
        </div>
        <div className="pc-msg">{msg}</div>
      </div>

        <div className="pc-panel">
          {tab === 'prize' && (
            pool.length === 0
              ? <span className="pc-empty">뽑을 수 있는 글이 없습니다</span>
              : pool.map(p => (
                <div key={p.id} className="pc-item" onClick={() => router.push(`/gallery/${p.id}`)}>
                  <span>{p.title}</span>
                  <small>{fmtDate(p.date)}</small>
                </div>
              ))
          )}
          {tab === 'how' && (settings.howTo?.trim() || DEFAULT_HOW)}
          {tab === 'info' && (
            settings.infoText?.trim()
              ? <><b style={{ display: 'block', marginBottom: 4 }}>{settings.infoTitle?.trim() || 'INFO'}</b>{settings.infoText}</>
              : <span className="pc-empty">등록된 안내가 없습니다</span>
          )}
        </div>
      </div>

      <Modal
  open={!!prize}
  onClose={() => setPrize(null)}
  small
  title="PRIZE!"
  desc="직접 뽑은 상품이에요!"
  actions={
    <button
      className="btn btn-dark"
      onClick={() => setPrize(null)}
    >
      CLOSE
    </button>
  }
>
  {prizeUrl && (
    <div
      style={{
        width: '100%',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <img
        src={prizeUrl}
        alt="당첨 상품"
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          objectFit: 'contain',
        }}
      />
    </div>
  )}
</Modal>
    </div>
  );
}
