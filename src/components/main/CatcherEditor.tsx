'use client';
// 인형뽑기 설정창 — 인형 이미지(최대 10장 직접 업로드) · 말머리 · 색 · 효과음 · 놓칠 확률 · 안내 문구
import React, { useState } from 'react';
import { KInput, KTextarea, KCheck, KStep } from '@/components/ui/Kit';
import { ColorField } from '@/components/ui/ColorField';
import { useConfirmDelete } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { putBlob, useBlobUrl } from '@/lib/blobStore';
import type { CatcherSettings } from '@/components/main/PlushCatcher';

export const MAX_DOLLS = 10;

function Thumb({ refId, onRemove }: { refId: string; onRemove: () => void }) {
  const url = useBlobUrl(refId);
  return (
    <div className="pc-thumb">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" />}
      <button className="pc-thumb-x" aria-label="삭제" onClick={onRemove}>✕</button>
    </div>
  );
}

export function CatcherEditor({ value, onSave, onClose }: {
  value: CatcherSettings;
  onSave: (v: CatcherSettings) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const del = useConfirmDelete();   // 삭제는 언제나 경고를 거친다
  const [d, setD] = useState<CatcherSettings>({ ...value });
  const dolls = d.dolls ?? [];
  const inputId = 'pcDollFiles';

  const addFiles = async (list: FileList | null) => {
    // input.files는 라이브 목록이라 await 전에 바로 복사해 둔다
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const room = MAX_DOLLS - dolls.length;
    if (room <= 0) { toast(`인형 이미지는 최대 ${MAX_DOLLS}장까지입니다`); return; }
    const use = files.slice(0, room);
    if (files.length > room) toast(`${MAX_DOLLS}장까지만 추가됩니다 — ${files.length - room}장은 제외했어요`);
    const ids: string[] = [];
    for (const f of use) ids.push(await putBlob(f));
    setD(v => ({ ...v, dolls: [...(v.dolls ?? []), ...ids] }));
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div>
        <label className="k-label">인형 이미지 ({dolls.length}/{MAX_DOLLS})</label>
        <input id={inputId} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => { void addFiles(e.target.files); e.target.value = ''; }} />
        <div className="pc-thumbs">
          {dolls.map((r, i) => (
            <Thumb key={`${r}-${i}`} refId={r}
              onRemove={() => del.ask(`${i + 1}번째 인형 이미지를 뺄까요?`,
                () => setD(v => ({ ...v, dolls: (v.dolls ?? []).filter((_, j) => j !== i) })),
                '원본 파일은 지워지지 않습니다.')} />
          ))}
          {dolls.length < MAX_DOLLS && (
            <button className="pc-thumb pc-add" aria-label="이미지 추가"
              onClick={() => document.getElementById(inputId)?.click()}>＋</button>
          )}
        </div>
        <p className="hint">
          배경이 투명한 PNG를 권장합니다. 여러 장을 한 번에 고를 수 있고, 비워 두면 기본 인형이 나옵니다.
          용량이 큰 이미지는 불러오기가 느려지니 가로 300~500px 정도가 좋아요
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="cp-lb">뽑을 글의 말머리</span>
        <KInput placeholder="비우면 전체 (갤러리 글쓰기의 말머리 이름)" value={d.category ?? ''}
          onChange={e => setD(v => ({ ...v, category: e.target.value }))} style={{ flex: 1, minWidth: 180 }} />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="cp-lb">기계 색</span>
        <ColorField value={d.color ?? '#a63a45'} onChange={hex => setD(v => ({ ...v, color: hex }))} />
        <KCheck label="효과음" checked={d.sound ?? true} onChange={v => setD(x => ({ ...x, sound: v }))} />
        <span className="cp-lb">놓칠 확률</span>
        <KStep value={Math.round((d.slip ?? 0.2) * 100)} min={0} max={100} step={5} suffix="%"
          onChange={v => setD(x => ({ ...x, slip: v / 100 }))} />
      </div>

      <div>
        <label className="k-label">HOW TO 문구 (비우면 기본 문구)</label>
        <KTextarea value={d.howTo ?? ''} onChange={e => setD(v => ({ ...v, howTo: e.target.value }))} />
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <label className="k-label">INFO 안내</label>
        <KInput placeholder="제목" value={d.infoTitle ?? ''}
          onChange={e => setD(v => ({ ...v, infoTitle: e.target.value }))} />
        <KTextarea value={d.infoText ?? ''} onChange={e => setD(v => ({ ...v, infoText: e.target.value }))} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
        <button className="btn btn-dark" onClick={() => onSave(d)}>SAVE</button>
      </div>
      {del.element}
    </div>
  );
}
