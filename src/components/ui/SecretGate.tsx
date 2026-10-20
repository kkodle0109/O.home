'use client';
// 비밀글 입력 화면 — 비밀번호를 맞추면 안쪽 내용(children)을 보여준다.
// 잠금 정보(lock)가 없는 글, 관리자, bypass가 true인 사람(글쓴이 등)은 그냥 통과한다.
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { SecretLock, checkLock, isUnlocked, markUnlocked } from '@/lib/secretPost';

export function SecretGate({ id, lock, bypass, children }: {
  id: string;                // 글 id (한 번 푼 글을 기억하는 열쇠)
  lock?: SecretLock;         // 글에 저장된 잠금 정보 (없으면 비밀글이 아님)
  bypass?: boolean;          // true면 비밀번호 없이 통과 (글쓴이 등)
  children: React.ReactNode;
}) {
  const { isAdmin } = useAuth();
  const [checked, setChecked] = useState(false);
  const [ok, setOk] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [until, setUntil] = useState(0);

  useEffect(() => { setOk(isUnlocked(id)); setChecked(true); }, [id]);

  if (!lock || isAdmin || bypass) return <>{children}</>;
  if (!checked) return null;           // 이미 푼 글이 잠깐 잠겨 보이는 깜빡임 방지
  if (ok) return <>{children}</>;

  const submit = async () => {
    if (busy || !pw) return;
    const wait = until - Date.now();
    if (wait > 0) { setErr(`잠시 후 다시 시도해 주세요 (${Math.ceil(wait / 1000)}초)`); return; }
    setBusy(true);
    const good = await checkLock(pw, lock);
    setBusy(false);
    if (good) { markUnlocked(id); setOk(true); return; }
    const n = fails + 1;
    setFails(n);
    setPw('');
    if (n % 5 === 0) {
      setUntil(Date.now() + 30000);
      setErr('5번 틀렸습니다. 30초 뒤에 다시 시도해 주세요');
    } else {
      setErr('비밀번호가 맞지 않습니다');
    }
  };

  return (
    <div className="panel" style={{ maxWidth: 380, margin: '40px auto', padding: 28, textAlign: 'center' }}>
      <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden
        style={{ stroke: 'var(--sub)', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <b style={{ display: 'block', marginTop: 10, fontSize: 15 }}>비밀글입니다</b>
      <p className="hint" style={{ marginTop: 4 }}>비밀번호를 입력하면 볼 수 있습니다</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <input className="k-input" type="password" autoComplete="off" autoFocus
          placeholder="비밀번호" value={pw} style={{ flex: 1, minWidth: 0 }}
          onChange={e => { setPw(e.target.value); setErr(''); }}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        <button className="btn btn-dark" disabled={busy || !pw} onClick={submit}>확인</button>
      </div>
      {err && <p className="hint" style={{ color: 'var(--accent)', marginTop: 10 }}>{err}</p>}
    </div>
  );
}
