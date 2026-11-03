'use client';
// 인형뽑기 페이지 — 메인 화면에 인형뽑기 위젯이 있으면 그 설정을 함께 쓴다 (한 곳에서 관리)
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { useMainStore } from '@/lib/mainStore';
import { PlushCatcher, CatcherSettings } from '@/components/main/PlushCatcher';
import { CatcherEditor } from '@/components/main/CatcherEditor';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { PageTitle } from '@/components/ui/PageText';

type Saved = CatcherSettings & { id: string };

export default function CatcherPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { state, updateWidget } = useMainStore();
  const [list, setList, loaded] = useLocalList<Saved>('ohome.catcher.v1', []);
  const [open, setOpen] = useState(false);

  if (!loaded) return <section className="page" />;

  const widget = state.widgets.find(w => w.type === 'catcher');
  const saved = list.find(x => x.id === 'main');
  const settings = (widget ? widget.settings : (saved ?? {})) as CatcherSettings;

  const save = (v: CatcherSettings) => {
    if (widget) {
      updateWidget(widget.id, { settings: { ...widget.settings, ...v } }, { persist: true });
    } else {
      const next: Saved = { ...v, id: 'main' };
      setList(saved ? list.map(x => (x.id === 'main' ? next : x)) : [...list, next]);
    }
    setOpen(false);
    toast('인형뽑기 설정이 저장되었습니다');
  };

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>PRIZE CRANE</PageTitle>
        {isAdmin && (
          <div className="head-actions">
            <button className="btn btn-dark" onClick={() => setOpen(true)}>SETTINGS</button>
          </div>
        )}
      </div>
      <div style={{ maxWidth: 360, margin: '0 auto' }}>
        <PlushCatcher settings={settings} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="인형뽑기 설정"
        desc="인형 이미지는 직접 올려서 등록합니다 (최대 10장)">
        {open && <CatcherEditor value={settings} onSave={save} onClose={() => setOpen(false)} />}
      </Modal>
    </section>
  );
}
