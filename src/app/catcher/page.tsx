'use client';
// 인형뽑기 페이지 — 관리자는 SETTINGS에서 인형 이미지(최대 10장)·말머리·색 등을 정한다
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { PlushCatcher, CatcherSettings } from '@/components/main/PlushCatcher';
import { CatcherEditor } from '@/components/main/CatcherEditor';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { PageTitle } from '@/components/ui/PageText';

type Saved = CatcherSettings & { id: string };

export default function CatcherPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  // 설정은 글 목록과 같은 저장소에 한 건으로 보관한다 (모든 방문자에게 같은 설정이 보이도록)
  const [list, setList, loaded] = useLocalList<Saved>('ohome.catcher.v1', []);
  const [open, setOpen] = useState(false);

  if (!loaded) return <section className="page" />;

  const saved = list.find(x => x.id === 'main');
  const settings: CatcherSettings = saved ?? {};
  const save = (v: CatcherSettings) => {
    const next: Saved = { ...v, id: 'main' };
    setList(saved ? list.map(x => (x.id === 'main' ? next : x)) : [...list, next]);
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
