'use client';
// 낚시 위젯 — 메인 화면에 놓는 낚시 미니게임. 설정(제목·아이템·확률·배경 등)은 편집모드 우클릭 → 설정.
import React, { useEffect, useState } from 'react';
import { WidgetConf, useMainStore } from '@/lib/mainStore';
import { FishingPond, FishingSettings } from '@/components/main/FishingPond';
import { FishingEditor } from '@/components/main/FishingEditor';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

/* 편집모드 우클릭 「설정」 → 이 위젯의 설정 모달 열기 (다른 위젯과 같은 방식) */
function useEditEvent(id: string, onOpen: () => void) {
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail?.id === id) onOpen(); };
    window.addEventListener('ohome-widget-edit', h);
    return () => window.removeEventListener('ohome-widget-edit', h);
  }, [id, onOpen]);
}

export function FishingWidget({ conf }: { conf: WidgetConf }) {
  const { updateWidget } = useMainStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  useEditEvent(conf.id, () => setOpen(true));
  const settings = conf.settings as FishingSettings;

  return (
    <div className="fw-widget">
      <FishingPond settings={settings} dexKey={`ohome.fishdex.v1.${conf.id}`} />
      <div onClick={e => e.stopPropagation()}>
        <Modal open={open} onClose={() => setOpen(false)} title="낚시 연못 설정"
          desc="제목 · 입질 시간 · 배경 · 아이템(이미지·확률)을 바꿀 수 있어요">
          {open && (
            <FishingEditor value={settings}
              onSave={v => {
                updateWidget(conf.id, { settings: { ...conf.settings, ...v } }, { persist: true });
                setOpen(false);
                toast('낚시 연못 설정이 저장되었습니다');
              }}
              onClose={() => setOpen(false)} />
          )}
        </Modal>
      </div>
    </div>
  );
}
