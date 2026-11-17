'use client';
// 캐릭터 말풍선 설정창 — 캐릭터 이미지 · 대사(한 줄에 하나) · 말풍선 수 · 랜덤 · 효과음 · 크기 · 색
import React, { useState } from 'react';
import { KTextarea, KCheck, KStep } from '@/components/ui/Kit';
import { ColorField } from '@/components/ui/ColorField';
import { useConfirmDelete } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { putBlob, useBlobUrl } from '@/lib/blobStore';

export interface CharTalkSettings {
  img?: string;          // 캐릭터 이미지 참조 (비우면 기본 얼굴)
  lines?: string[];      // 대사 목록
  max?: number;          // 동시에 보이는 말풍선 수
  random?: boolean;      // true = 랜덤 / false = 순서대로
  sound?: boolean;       // 뾰잉 효과음
  size?: number;         // 캐릭터 크기(px)
  bubW?: number;         // 말풍선 최대 폭(px)
  font?: number;         // 글자 크기(px)
  bubble?: string;       // 말풍선 배경색
  line?: string;         // 말풍선 테두리색
  text?: string;         // 글자색
}

export const CT_DEFAULTS = {
  max: 3, size: 120, bubW: 180, font: 14,
  bubble: '#ffffff', line: '#37324a', text: '#37324a',
  lines: ['안녕!', '오늘도 와줘서 고마워', '눌러줘서 기분 좋아'],
};

export function CharTalkEditor({ value, onSave, onClose }: {
  value: CharTalkSettings;
  onSave: (v: CharTalkSettings) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const del = useConfirmDelete();
  const [d, setD] = useState<CharTalkSettings>({ ...value });
  const [text, setText] = useState((value.lines ?? CT_DEFAULTS.lines).join('\n'));   // 대사는 입력 중 줄바꿈이 유지되도록 문자열로 편집
  const imgUrl = useBlobUrl(d.img);
  const patch = (p: Partial<CharTalkSettings>) => setD(v => ({ ...v, ...p }));

  const pick = async (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast('이미지 파일만 등록할 수 있습니다.'); return; }
    patch({ img: await putBlob(f) });
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div>
        <label className="k-label">캐릭터 이미지</label>
        <input id="ctImgFile" type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { void pick(e.target.files); e.target.value = ''; }} />
        <div className="fw-row">
          <div className="pc-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {imgUrl ? <img src={imgUrl} alt="" /> : <span style={{ fontSize: 10, color: 'var(--faint)', display: 'grid', placeItems: 'center', height: '100%' }}>기본</span>}
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => document.getElementById('ctImgFile')?.click()}>이미지 선택</button>
          {d.img && (
            <button type="button" className="btn btn-ghost"
              onClick={() => del.ask('캐릭터 이미지를 뺄까요?', () => patch({ img: undefined }), '원본 파일은 지워지지 않습니다. 기본 얼굴로 돌아갑니다.')}>
              빼기
            </button>
          )}
        </div>
        <p className="hint">배경이 투명한 PNG를 권장합니다. 비워 두면 기본 얼굴이 나와요.</p>
      </div>

      <div>
        <label className="k-label">대사 (한 줄에 하나)</label>
        <KTextarea value={text} onChange={e => setText(e.target.value)} placeholder={'안녕!\n오늘도 와줘서 고마워'} />
      </div>

      <div className="fw-row">
        <span className="cp-lb">동시에 보이는 말풍선</span>
        <KStep value={d.max ?? CT_DEFAULTS.max} min={1} max={6} suffix="개" onChange={v => patch({ max: v })} />
        <KCheck label="랜덤 순서" checked={d.random ?? false} onChange={v => patch({ random: v })} />
        <KCheck label="효과음" checked={d.sound ?? false} onChange={v => patch({ sound: v })} />
      </div>

      <div className="fw-row">
        <span className="cp-lb">캐릭터 크기</span>
        <KStep value={d.size ?? CT_DEFAULTS.size} min={40} max={400} step={10} suffix="px" onChange={v => patch({ size: v })} />
        <span className="cp-lb">말풍선 폭</span>
        <KStep value={d.bubW ?? CT_DEFAULTS.bubW} min={80} max={400} step={10} suffix="px" onChange={v => patch({ bubW: v })} />
        <span className="cp-lb">글자 크기</span>
        <KStep value={d.font ?? CT_DEFAULTS.font} min={9} max={28} suffix="px" onChange={v => patch({ font: v })} />
      </div>

      <div className="fw-row">
        <span className="cp-lb">말풍선 색</span>
        <ColorField value={d.bubble ?? CT_DEFAULTS.bubble} onChange={hex => patch({ bubble: hex })} />
        <span className="cp-lb">테두리</span>
        <ColorField value={d.line ?? CT_DEFAULTS.line} onChange={hex => patch({ line: hex })} />
        <span className="cp-lb">글자</span>
        <ColorField value={d.text ?? CT_DEFAULTS.text} onChange={hex => patch({ text: hex })} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
        <button className="btn btn-dark" onClick={() => {
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          if (!lines.length) { toast('대사를 한 줄 이상 적어 주세요.'); return; }
          onSave({ ...d, lines });
        }}>SAVE</button>
      </div>
      {del.element}
    </div>
  );
}
