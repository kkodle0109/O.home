'use client';
// 인형뽑기 미리보기 — 위젯으로 등록하기 전에 동작을 확인하는 페이지
import { PlushCatcher } from '@/components/main/PlushCatcher';
import { PageTitle } from '@/components/ui/PageText';

export default function CatcherPreview() {
  return (
    <section className="page">
      <div className="page-head"><PageTitle>PRIZE CRANE</PageTitle></div>
      <div style={{ maxWidth: 360, margin: '0 auto' }}>
        <PlushCatcher settings={{}} />
      </div>
    </section>
  );
}
