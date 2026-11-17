'use client';
// 캐릭터 말풍선 설정창 — 캐릭터 이미지 · 대사 · 크기 · 색 · 말풍선 개수 · 효과음
import React, { useState } from 'react';
import { KTextarea, KCheck, KStep } from '@/components/ui/Kit';
import { ColorField } from '@/components/ui/ColorField';
import { useConfirmDelete } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { putBlob, useBlobUrl } from '@/lib/blobStore';

export interface CharBubbleSettings {
  img?: string;          // 캐릭터 이미지 (저장된 파일 id, 투명 배경 PNG 권장)
  text?: string;         // 대사 — 한 줄에 하나
  size?: number;         // 캐릭터 크기(px)
  bubbleW?: number;      // 말풍선 최대 가로(px)
  font?: number;         // 글자 크기(px)
  area?: number;         // 말풍선이 쌓이는 세로 공간(px)
  radius?: number;       // 말풍선 모서리(px)
  max?: number;          // 한 번에 쌓이는 말풍선 수
  speed?: number;        // 애니메이션 속도(초)
  random?: boolean;      // 대사를 순서대로가 아니라 랜덤으로
  pixel?: boolean;       // 갈무리 픽셀 폰트
  bubble?: string;       // 말풍선 배경색
  line?: string;         // 말풍선 테두리색
  textColor?: string;    // 글자색
  sound?: 'off' | 'boing';
  volume?: number;       // 효과음 크기 0~1
}

export function CharBubbleEditor({ value, onSave, onClose }: {
  value: CharBubbleSettings;
  onSave: (v: CharBubbleSettings) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const del = useConfirmDelete();   // 삭제는 언제나 경고를 거친다
  const [d, setD] = useState<CharBubbleSettings>({ ...value });
  const url = useBlobUrl(d.img);
  const inputId = 'cbImgFile';
  const sound = d.sound ?? 'off';
  const set = (p: Partial<CharBubbleSettings>) => setD(v => ({ ...v, ...p }));

  const upload = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    set({ img: await putBlob(f) });
    toast('캐릭터 이미지가 등록되었습니다');
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div>
        <label className="k-label">캐릭터 이미지</label>
        <input id={inputId} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { void upload(e.target.files); e.target.value = ''; }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="cb-prev" onClick={() => document.getElementById(inputId)?.click()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {url ? <img src={url} alt="" /> : <span style={{ fontSize: 22, color: 'var(--faint)' }}>＋</span>}
          </div>
          {d.img && (
            <button className="btn btn-ghost" style={{ fontSize: 10.5, padding: '5px 11px' }}
              onClick={() => del.ask('캐릭터 이미지를 뺄까요?', () => set({ img: undefined }),
                '원본 파일은 지워지지 않습니다. 빼면 기본 얼굴이 나옵니다.')}>
              이미지 빼기
            </button>
          )}
        </div>
        <p className="hint">배경이 투명한 PNG를 권장합니다. 이미지를 누르면 다른 파일로 바꿀 수 있어요</p>
      </div>

      <div>
        <label className="k-label">대사 (한 줄에 하나 — 캐릭터를 누를 때마다 한 줄씩 나와요)</label>
        <KTextarea value={d.text ?? ''} onChange={e => set({ text: e.target.value })} />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="cp-lb">캐릭터 크기</span>
        <KStep value={d.size ?? 120} min={40} max={400} step={10} suffix="px" onChange={v => set({ size: v })} />
        <span className="cp-lb">말풍선 폭</span>
        <KStep value={d.bubbleW ?? 180} min={80} max={400} step={10} suffix="px" onChange={v => set({ bubbleW: v })} />
        <span className="cp-lb">글자 크기</span>
        <KStep value={d.font ?? 14} min={10} max={32} step={1} suffix="px" onChange={v => set({ font: v })} />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="cp-lb">말풍선 영역 높이</span>
        <KStep value={d.area ?? 210} min={80} max={500} step={10} suffix="px" onChange={v => set({ area: v })} />
        <span className="cp-lb">말풍선 개수</span>
        <KStep value={d.max ?? 3} min={1} max={6} step={1} suffix="개" onChange={v => set({ max: v })} />
        <span className="cp-lb">모서리</span>
        <KStep value={d.radius ?? 18} min={0} max={40} step={2} suffix="px" onChange={v => set({ radius: v })} />
        <span className="cp-lb">속도</span>
        <KStep value={Math.round((d.speed ?? 0.32) * 1000)} min={100} max={1000} step={20} suffix="ms"
          onChange={v => set({ speed: v / 1000 })} />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="cp-lb">말풍선</span>
        <ColorField value={d.bubble ?? '#ffffff'} onChange={hex => set({ bubble: hex })} />
        <span className="cp-lb">테두리</span>
        <ColorField value={d.line ?? '#37324a'} onChange={hex => set({ line: hex })} />
        <span className="cp-lb">글씨</span>
        <ColorField value={d.textColor ?? '#37324a'} onChange={hex => set({ textColor: hex })} />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <KCheck label="대사를 랜덤으로" checked={!!d.random} onChange={v => set({ random: v })} />
        <KCheck label="픽셀 폰트(갈무리)" checked={!!d.pixel} onChange={v => set({ pixel: v })} />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="cp-lb">효과음</span>
        <div className="mini-seg">
          <button className={sound === 'off' ? 'on' : ''} onClick={() => set({ sound: 'off' })}>소리 없음</button>
          <button className={sound === 'boing' ? 'on' : ''} onClick={() => set({ sound: 'boing' })}>뾰잉</button>
        </div>
        {sound === 'boing' && (
          <>
            <span className="cp-lb">크기</span>
            <KStep value={Math.round((d.volume ?? 0.18) * 100)} min={5} max={100} step={5} suffix="%"
              onChange={v => set({ volume: v / 100 })} />
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
        <button className="btn btn-dark" onClick={() => onSave(d)}>SAVE</button>
      </div>
      {del.element}
    </div>
  );
}
