'use client';
// 인형뽑기 위젯 — 메인 화면에 놓는 인형뽑기. 설정(인형 이미지·말머리·색 등)은 편집모드 우클릭 → 설정.
import React, { useEffect, useState } from 'react';
import { WidgetConf, useMainStore } from '@/lib/mainStore';
import { PlushCatcher, CatcherSettings } from '@/components/main/PlushCatcher';
import { CatcherEditor } from '@/components/main/CatcherEditor';
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

export function CatcherWidget({ conf }: { conf: WidgetConf }) {
  const { updateWidget } = useMainStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  useEditEvent(conf.id, () => setOpen(true));
  const settings = conf.settings as CatcherSettings;

  return (
    <div className="pc-widget">
      <PlushCatcher settings={settings} />
      <div onClick={e => e.stopPropagation()}>
        <Modal open={open} onClose={() => setOpen(false)} title="인형뽑기 설정"
          desc="인형 이미지는 직접 올려서 등록합니다 (최대 10장)">
          {open && (
            <CatcherEditor value={settings}
              onSave={v => {
                updateWidget(conf.id, { settings: { ...conf.settings, ...v } }, { persist: true });
                setOpen(false);
                toast('인형뽑기 설정이 저장되었습니다');
              }}
              onClose={() => setOpen(false)} />
          )}
        </Modal>
      </div>
    </div>
  );
}
