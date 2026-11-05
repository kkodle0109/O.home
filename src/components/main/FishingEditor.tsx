'use client';
// 낚시 연못 설정창 — 기본 설정(제목·대기 시간·배경·효과음) + 아이템 관리(이름·설명·희귀도·확률·이미지)
import React, { useState } from 'react';
import { KInput, KTextarea, KCheck, KStep, KSelect } from '@/components/ui/Kit';
import { useConfirmDelete } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { putBlob, useBlobUrl } from '@/lib/blobStore';
import {
  DEFAULT_ITEMS, FISH_DEFAULTS, FishIcon, RARITIES,
  type FishItem, type FishingSettings, type Rarity,
} from '@/components/main/FishingPond';

const blank = (): FishItem => ({
  id: `fish_${Date.now().toString(36)}`,
  name: '새 아이템', desc: '', rarity: 'COMMON', weight: 1, emoji: '🐟',
  nightOnly: false, hidden: false, enabled: true,
});

export function FishingEditor({ value, onSave, onClose }: {
  value: FishingSettings;
  onSave: (v: FishingSettings) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const del = useConfirmDelete();   // 삭제는 언제나 경고를 거친다
  const [d, setD] = useState<FishingSettings>({ ...value, items: value.items ?? DEFAULT_ITEMS.map(x => ({ ...x })) });
  const [tab, setTab] = useState<'general' | 'items'>('general');
  const [selId, setSelId] = useState<string | null>(null);
  const bgUrl = useBlobUrl(d.background);

  const items = d.items ?? [];
  const sel = items.find(x => x.id === selId) ?? null;
  const patch = (p: Partial<FishingSettings>) => setD(v => ({ ...v, ...p }));
  const patchItem = (id: string, p: Partial<FishItem>) =>
    setD(v => ({ ...v, items: (v.items ?? []).map(x => (x.id === id ? { ...x, ...p } : x)) }));

  const pickImage = async (list: FileList | null, onDone: (ref: string) => void) => {
    const f = list?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast('이미지 파일만 등록할 수 있습니다.'); return; }
    onDone(await putBlob(f));
  };

  const addItem = () => { const it = blank(); setD(v => ({ ...v, items: [...(v.items ?? []), it] })); setSelId(it.id); };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="fw-tabs">
        <button type="button" className={tab === 'general' ? 'on' : ''} onClick={() => setTab('general')}>기본 설정</button>
        <button type="button" className={tab === 'items' ? 'on' : ''} onClick={() => setTab('items')}>아이템 관리 ({items.length})</button>
      </div>

      {tab === 'general' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="fw-row">
            <span className="cp-lb">위젯 제목</span>
            <KInput value={d.title ?? ''} placeholder={FISH_DEFAULTS.title} maxLength={60}
              onChange={e => patch({ title: e.target.value })} style={{ flex: 1, minWidth: 140 }} />
          </div>
          <div className="fw-row">
            <span className="cp-lb">작은 제목</span>
            <KInput value={d.kicker ?? ''} placeholder={FISH_DEFAULTS.kicker} maxLength={60}
              onChange={e => patch({ kicker: e.target.value })} style={{ flex: 1, minWidth: 140 }} />
          </div>

          <div className="fw-row">
            <span className="cp-lb">입질 대기(ms)</span>
            <KStep value={d.waitMin ?? FISH_DEFAULTS.waitMin} min={300} max={60000} step={100}
              onChange={v => patch({ waitMin: v })} />
            <span>~</span>
            <KStep value={d.waitMax ?? FISH_DEFAULTS.waitMax} min={300} max={60000} step={100}
              onChange={v => patch({ waitMax: v })} />
          </div>
          <div className="fw-row">
            <span className="cp-lb">반응 시간(ms)</span>
            <KStep value={d.reactionMin ?? FISH_DEFAULTS.reactionMin} min={250} max={10000} step={50}
              onChange={v => patch({ reactionMin: v })} />
            <span>~</span>
            <KStep value={d.reactionMax ?? FISH_DEFAULTS.reactionMax} min={250} max={10000} step={50}
              onChange={v => patch({ reactionMax: v })} />
          </div>
          <p className="hint" style={{ marginTop: -6 }}>
            입질 대기 = 낚싯대를 던지고 입질이 오기까지 · 반응 시간 = 입질이 온 뒤 당길 수 있는 시간 (짧을수록 어려워요)
          </p>

          <div className="fw-row">
            <KCheck label="효과음" checked={d.sound ?? true} onChange={v => patch({ sound: v })} />
            <span className="cp-lb">소리 크기</span>
            <KStep value={d.volume ?? FISH_DEFAULTS.volume} min={0} max={100} step={10} suffix="%"
              onChange={v => patch({ volume: v })} />
          </div>

          <div>
            <label className="k-label">연못 배경 이미지</label>
            <input id="fwBgFile" type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { void pickImage(e.target.files, ref => patch({ background: ref })); e.target.value = ''; }} />
            <div className="fw-row">
              <div className="fw-bgprev" style={bgUrl ? { backgroundImage: `url("${bgUrl}")` } : undefined}>
                {!bgUrl && <span>기본 배경</span>}
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => document.getElementById('fwBgFile')?.click()}>이미지 선택</button>
              {d.background && (
                <button type="button" className="btn btn-ghost"
                  onClick={() => del.ask('배경 이미지를 뺄까요?', () => patch({ background: undefined }), '원본 파일은 지워지지 않습니다. 기본 배경으로 돌아갑니다.')}>
                  삭제
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'items' && (
        <div className="fw-items">
          <aside>
            <button type="button" className="fw-add" onClick={addItem}>＋ 새 아이템</button>
            <div className="fw-itemlist">
              {items.map(it => (
                <button type="button" key={it.id} className={`fw-itembtn ${it.id === selId ? 'on' : ''}`} onClick={() => setSelId(it.id)}>
                  <span className="thumb"><FishIcon item={it} /></span>
                  <span>
                    <b>{it.name || '(이름 없음)'}</b>
                    <small>{it.rarity} · {it.weight}{it.enabled === false ? ' · 숨김' : ''}</small>
                  </span>
                </button>
              ))}
              {items.length === 0 && <span className="hint">아이템이 없어요. 하나 이상 추가해 주세요.</span>}
            </div>
          </aside>

          <div>
            {!sel && <p className="hint" style={{ marginTop: 0 }}>왼쪽에서 아이템을 고르거나 새로 추가하세요.</p>}
            {sel && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label className="k-label">이름</label>
                  <KInput value={sel.name} maxLength={60} onChange={e => patchItem(sel.id, { name: e.target.value })} />
                </div>
                <div>
                  <label className="k-label">설명</label>
                  <KTextarea value={sel.desc} maxLength={300} onChange={e => patchItem(sel.id, { desc: e.target.value })} />
                </div>
                <div className="fw-row">
                  <span className="cp-lb">희귀도</span>
                  <KSelect value={sel.rarity} options={RARITIES.map(r => ({ value: r, label: r }))}
                    onChange={v => patchItem(sel.id, { rarity: v as Rarity })} />
                  <span className="cp-lb">등장 가중치</span>
                  <KInput type="number" step="0.01" min="0.01" value={sel.weight} style={{ width: 90 }}
                    onChange={e => patchItem(sel.id, { weight: Math.max(0.01, parseFloat(e.target.value) || 1) })} />
                </div>
                <p className="hint" style={{ marginTop: -6 }}>가중치가 클수록 자주 낚여요. (예: 붕어 18 · 희귀템 0.95)</p>

                <div className="fw-row">
                  <span className="cp-lb">이모지</span>
                  <KInput value={sel.emoji} maxLength={12} style={{ width: 90 }}
                    onChange={e => patchItem(sel.id, { emoji: e.target.value })} />
                  <div className="fw-preview"><FishIcon item={sel} /></div>
                  <input id="fwItemFile" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { void pickImage(e.target.files, ref => patchItem(sel.id, { image: ref })); e.target.value = ''; }} />
                  <button type="button" className="btn btn-ghost" onClick={() => document.getElementById('fwItemFile')?.click()}>이미지 선택</button>
                  {sel.image && (
                    <button type="button" className="btn btn-ghost" onClick={() => patchItem(sel.id, { image: undefined })}>이미지 빼기</button>
                  )}
                </div>
                <p className="hint" style={{ marginTop: -6 }}>이미지를 올리면 이모지 대신 표시돼요. 배경이 투명한 PNG를 권장합니다.</p>

                <div className="fw-row">
                  <KCheck label="등장함" checked={sel.enabled !== false} onChange={v => patchItem(sel.id, { enabled: v })} />
                  <KCheck label="밤(20~05시)에만 등장" checked={!!sel.nightOnly} onChange={v => patchItem(sel.id, { nightOnly: v })} />
                  <KCheck label="발견 전 도감에서 숨김" checked={!!sel.hidden} onChange={v => patchItem(sel.id, { hidden: v })} />
                </div>

                <div>
                  <button type="button" className="btn btn-ghost"
                    onClick={() => del.ask(`「${sel.name}」 아이템을 삭제할까요?`, () => {
                      setD(v => ({ ...v, items: (v.items ?? []).filter(x => x.id !== sel.id) }));
                      setSelId(null);
                    })}>
                    이 아이템 삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost"
          onClick={() => del.ask('전체 설정을 기본값으로 되돌릴까요?', () => { setD({ items: DEFAULT_ITEMS.map(x => ({ ...x })) }); setSelId(null); },
            'SAVE를 눌러야 확정됩니다. 업로드했던 이미지 연결은 사라집니다.', 'RESET')}>
          기본값으로
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn-dark" onClick={() => {
            if (!(d.items ?? []).some(x => x.enabled !== false)) { toast('등장하는 아이템이 하나 이상 있어야 해요.'); return; }
            if ((d.items ?? []).some(x => !x.name.trim())) { toast('이름이 비어 있는 아이템이 있어요.'); return; }
            onSave(d);
          }}>SAVE</button>
        </div>
      </div>
      {del.element}
    </div>
  );
}
