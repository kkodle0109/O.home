'use client';
// 낚시 연못 — 낚싯대를 던지고, 입질이 오는 순간 타이밍 맞춰 당기면 아이템이 낚인다.
// 낚은 아이템은 방문자 브라우저마다 도감(localStorage)에 쌓인다.
// 아이템·제목·대기 시간·배경·효과음은 settings로 바꾼다 (위젯 우클릭 → 설정).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlobUrl } from '@/lib/blobStore';
import { Modal, useConfirmDelete } from '@/components/ui/Modal';

export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | '???';
export const RARITIES: Rarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', '???'];

export interface FishItem {
  id: string;
  name: string;
  desc: string;
  rarity: Rarity;
  weight: number;        // 등장 가중치 — 클수록 자주 낚임
  emoji: string;
  image?: string;        // 업로드한 이미지 참조 (있으면 이모지 대신 표시)
  nightOnly?: boolean;   // 밤(20~05시)에만 등장
  hidden?: boolean;      // 발견하기 전에는 도감에서 완전히 숨김
  enabled?: boolean;     // false면 등장하지 않음
}

export interface FishingSettings {
  title?: string;
  kicker?: string;
  waitMin?: number;      // 입질까지 최소 대기(ms)
  waitMax?: number;
  reactionMin?: number;  // 입질 후 반응 제한(ms)
  reactionMax?: number;
  sound?: boolean;
  volume?: number;       // 0~100
  background?: string;   // 연못 배경 이미지 참조
  items?: FishItem[];
}

export const DEFAULT_ITEMS: FishItem[] = [
  { id: 'fish_1', name: '붕어', desc: '아주 평범한 붕어. 오늘도 무사히 낚였다.', rarity: 'COMMON', weight: 18, emoji: '🐟' },
  { id: 'fish_2', name: '금붕어', desc: '작고 반짝인다. 이 연못에 왜 있는지는 아무도 모른다.', rarity: 'COMMON', weight: 15, emoji: '🐠' },
  { id: 'fish_3', name: '물풀', desc: '기대하게 만들고 올라온 물풀 한 움큼.', rarity: 'COMMON', weight: 11, emoji: '🌿' },
  { id: 'fish_4', name: '작은 열쇠', desc: '무엇을 여는 열쇠인지 알 수 없다.', rarity: 'UNCOMMON', weight: 5, emoji: '🗝️' },
  { id: 'fish_5', name: '병에 든 편지', desc: '병 안에 접힌 종이가 있다.', rarity: 'RARE', weight: 2.8, emoji: '🍾' },
  { id: 'fish_6', name: '미니 인형', desc: '손바닥만 한 인형. 표정이 묘하게 익숙하다.', rarity: 'EPIC', weight: 0.95, emoji: '🧸' },
  { id: 'fish_7', name: '정체불명의 생물', desc: '눈이 마주쳤다. 다시 물에 놓아주는 편이 좋을 것 같다.', rarity: '???', weight: 0.23, emoji: '👁️', nightOnly: true, hidden: true },
];

export const FISH_DEFAULTS = {
  title: '오늘의 연못',
  kicker: 'PRIVATE POND',
  waitMin: 1200, waitMax: 4800,
  reactionMin: 900, reactionMax: 1550,
  volume: 80,
};

type Phase = 'idle' | 'waiting' | 'bite';
const isOn = (it: FishItem) => it.enabled !== false;
const isNight = () => { const h = new Date().getHours(); return h >= 20 || h < 5; };

/** 아이템 아이콘 — 이미지가 있으면 이미지, 없으면 이모지 */
export function FishIcon({ item }: { item: Pick<FishItem, 'image' | 'emoji'> }) {
  const url = useBlobUrl(item.image);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" draggable={false} />;
  }
  return <>{item.emoji || '🐟'}</>;
}

/** 효과음 — 소리 파일 없이 브라우저가 직접 만든다 */
function useBeep(enabled: boolean, volume: number) {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback((freq: number, dur = 0.1, type: OscillatorType = 'sine', delay = 0) => {
    if (!enabled || volume <= 0) return;
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
      const t = ctx.currentTime + delay;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.08 * (volume / 100)), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch { /* 소리를 못 내면 무시 */ }
  }, [enabled, volume]);
}

/** 이 브라우저의 도감 — 위젯마다 따로 저장 */
function useDex(key: string) {
  const [dex, setDex] = useState<Set<string>>(new Set());
  useEffect(() => {
    try { setDex(new Set(JSON.parse(localStorage.getItem(key) || '[]'))); } catch { /* 빈 도감 */ }
  }, [key]);
  const save = (next: Set<string>) => {
    setDex(next);
    try { localStorage.setItem(key, JSON.stringify(Array.from(next))); } catch { /* 무시 */ }
  };
  return [dex, save] as const;
}

export function FishingPond({ settings, dexKey }: { settings: FishingSettings; dexKey: string }) {
  const all = settings.items ?? DEFAULT_ITEMS;
  const items = useMemo(() => all.filter(isOn), [all]);
  const title = settings.title || FISH_DEFAULTS.title;
  const kicker = settings.kicker || FISH_DEFAULTS.kicker;
  const bgUrl = useBlobUrl(settings.background);
  const beep = useBeep(settings.sound ?? true, settings.volume ?? FISH_DEFAULTS.volume);
  const del = useConfirmDelete();

  const [dex, saveDex] = useDex(dexKey);
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState('낚싯대를 던져볼까요?');
  const [caught, setCaught] = useState<{ item: FishItem; isNew: boolean } | null>(null);
  const [dexOpen, setDexOpen] = useState(false);

  const phaseRef = useRef<Phase>('idle');
  const biteTimer = useRef<number | null>(null);
  const escapeTimer = useRef<number | null>(null);
  const go = (p: Phase) => { phaseRef.current = p; setPhase(p); };
  const clearTimers = () => {
    if (biteTimer.current !== null) { clearTimeout(biteTimer.current); biteTimer.current = null; }
    if (escapeTimer.current !== null) { clearTimeout(escapeTimer.current); escapeTimer.current = null; }
  };
  useEffect(() => clearTimers, []);   // 위젯이 사라지면 타이머 정리

  // 설정에서 아이템이 지워져도 도감 숫자가 어긋나지 않게 — 존재하는 아이템만 센다
  const validIds = useMemo(() => new Set(all.map(x => x.id)), [all]);
  const found = useMemo(() => { let n = 0; dex.forEach(id => { if (validIds.has(id)) n++; }); return n; }, [dex, validIds]);

  const pick = (): FishItem | null => {
    const night = isNight();
    const pool = items.filter(x => !x.nightOnly || night);
    if (!pool.length) return null;
    const total = pool.reduce((z, x) => z + Math.max(0.01, Number(x.weight) || 1), 0);
    let r = Math.random() * total;
    for (const x of pool) {
      r -= Math.max(0.01, Number(x.weight) || 1);
      if (r <= 0) return x;
    }
    return pool[0];
  };

  const cast = () => {
    go('waiting');
    setStatus('낚싯대를 던졌습니다...');
    beep(300, 0.12, 'sine');
    const a = Number(settings.waitMin) || FISH_DEFAULTS.waitMin;
    const b = Number(settings.waitMax) || FISH_DEFAULTS.waitMax;
    const wMin = Math.min(a, b), wMax = Math.max(a, b);
    biteTimer.current = window.setTimeout(() => {
      if (phaseRef.current !== 'waiting') return;
      go('bite');
      setStatus('지금!');
      beep(880, 0.09, 'square');
      beep(880, 0.09, 'square', 0.13);
      const c = Number(settings.reactionMin) || FISH_DEFAULTS.reactionMin;
      const d = Number(settings.reactionMax) || FISH_DEFAULTS.reactionMax;
      const rMin = Math.min(c, d), rMax = Math.max(c, d);
      escapeTimer.current = window.setTimeout(() => {
        if (phaseRef.current !== 'bite') return;
        go('idle');
        setStatus('놓쳐버렸다...');
        beep(160, 0.25, 'triangle');
      }, rMin + Math.random() * (rMax - rMin));
    }, wMin + Math.random() * (wMax - wMin));
  };

  const reel = () => {
    if (phaseRef.current === 'idle') { cast(); return; }
    if (phaseRef.current !== 'bite') return;
    clearTimers();
    go('idle');
    const it = pick();
    if (!it) { setStatus('지금은 잡히는 게 없는 것 같다.'); return; }
    const isNew = !dex.has(it.id);
    if (isNew) saveDex(new Set(dex).add(it.id));
    setCaught({ item: it, isNew });
    setStatus('뭔가 낚였다!');
    beep(523, 0.12); beep(659, 0.12, 'sine', 0.12); beep(784, 0.2, 'sine', 0.24);
  };

  const btnLabel = phase === 'idle' ? (status === '낚싯대를 던져볼까요?' ? '낚시하기' : '다시 낚시하기')
    : phase === 'waiting' ? '기다리는 중...' : '지금 당기기!';

  const visible = all.filter(it => isOn(it) && (!it.hidden || dex.has(it.id)));

  return (
    <div className="fw-wrap">
      <header className="fw-head">
        <div className="fw-kicker">{kicker}</div>
        <strong className="fw-title">{title}</strong>
      </header>

      <div className="fw-pond" style={bgUrl ? { backgroundImage: `url("${bgUrl}")` } : undefined}>
        <div className="fw-moon" />
        <i className="fw-water a" /><i className="fw-water b" /><i className="fw-water c" />
        <i className="fw-shadow a" /><i className="fw-shadow b" />
        <div className={`fw-bobwrap ${phase !== 'idle' ? 'on' : ''}`}>
          <i className="fw-line" />
          <i className={`fw-bob ${phase === 'bite' ? 'bite' : ''}`} />
          <i className="fw-ripple" />
        </div>
        {phase === 'bite' && <div className="fw-bite"><strong>!!!</strong><span>입질이 왔다!</span></div>}
        <div className="fw-panel">
          <p>{status}</p>
          <button type="button" className="fw-primary" disabled={phase === 'waiting'} onClick={reel}>{btnLabel}</button>
        </div>
      </div>

      <footer className="fw-foot">
        <span>도감 <b>{found}</b> / <b>{items.length}</b></span>
        <button type="button" className="fw-link" onClick={() => setDexOpen(true)}>도감 열기</button>
      </footer>

      {/* 낚은 결과 */}
      <Modal open={!!caught} onClose={() => setCaught(null)} small
        title={caught?.isNew ? 'NEW!' : 'CATCH!'}
        actions={<button className="btn btn-dark" onClick={() => setCaught(null)}>확인</button>}>
        {caught && (
          <div className="fw-result">
            <div className="fw-result-icon"><FishIcon item={caught.item} /></div>
            <p className="fw-rarity">{caught.item.rarity}</p>
            <h3>{caught.item.name}</h3>
            <p className="fw-desc">{caught.item.desc}</p>
          </div>
        )}
      </Modal>

      {/* 도감 */}
      <Modal open={dexOpen} onClose={() => setDexOpen(false)} small title="낚시 도감" desc="이 브라우저에서 낚은 기록입니다"
        actions={<button className="btn btn-dark" onClick={() => setDexOpen(false)}>CLOSE</button>}>
        <div className="fw-progress">
          <div className="fw-track"><i style={{ width: `${items.length ? (found / items.length) * 100 : 0}%` }} /></div>
          <p><b>{found}</b> / <b>{items.length}</b> 발견</p>
        </div>
        <div className="fw-dex-grid">
          {visible.map(it => {
            const has = dex.has(it.id);
            return (
              <div key={it.id} className={`fw-dex-item ${has ? '' : 'locked'}`}>
                <div className="fw-no">{it.nightOnly ? 'NIGHT · ' : ''}{it.rarity}</div>
                <div className="fw-di">{has ? <FishIcon item={it} /> : '?'}</div>
                <div className="fw-dn">{has ? it.name : '???'}</div>
                <div className="fw-dr">{has ? it.rarity : 'UNKNOWN'}</div>
              </div>
            );
          })}
        </div>
        <button type="button" className="fw-reset"
          onClick={() => del.ask('내 도감을 초기화할까요?', () => saveDex(new Set()), '이 브라우저에 저장된 낚시 기록만 지워집니다.', 'RESET')}>
          내 도감 초기화
        </button>
      </Modal>
      {del.element}
    </div>
  );
}
