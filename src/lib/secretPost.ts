// 비밀글 — 비밀번호 잠금 (브라우저 내장 WebCrypto 사용, 비밀번호 원문은 저장하지 않는다)
// ※ 화면에서 가리는 잠금이다. 글 데이터 자체를 암호화하는 것은 아니다.

export interface SecretLock { salt: string; hash: string; iter: number }

const ITER = 120_000;
const enc = new TextEncoder();

const toHex = (b: Uint8Array | ArrayBuffer) =>
  Array.from(b instanceof Uint8Array ? b : new Uint8Array(b))
    .map(x => x.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) =>
  new Uint8Array((hex.match(/.{2}/g) ?? []).map(h => parseInt(h, 16)));

async function derive(pw: string, salt: Uint8Array, iter: number): Promise<string> {
  const base = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: iter, hash: 'SHA-256' }, base, 256);
  return toHex(bits);
}

/** 글을 저장할 때 — 비밀번호로 잠금 정보를 만든다 */
export async function makeLock(pw: string): Promise<SecretLock> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toHex(salt), hash: await derive(pw, salt, ITER), iter: ITER };
}

/** 글을 열 때 — 입력한 비밀번호가 맞는지 확인한다 */
export async function checkLock(pw: string, lock: SecretLock): Promise<boolean> {
  try {
    const h = await derive(pw, fromHex(lock.salt), lock.iter || ITER);
    if (h.length !== lock.hash.length) return false;
    let diff = 0;
    for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ lock.hash.charCodeAt(i);
    return diff === 0;
  } catch { return false; }
}

// 한 번 푼 글은 같은 탭에서 다시 묻지 않는다 (탭을 닫으면 사라짐)
const KEY = 'ohome.secret.ok';
const mem = new Set<string>();

export function isUnlocked(id: string): boolean {
  if (mem.has(id)) return true;
  try {
    const a = JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as string[];
    return a.includes(id);
  } catch { return false; }
}

export function markUnlocked(id: string) {
  mem.add(id);
  try {
    const a = JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as string[];
    if (!a.includes(id)) { a.push(id); sessionStorage.setItem(KEY, JSON.stringify(a)); }
  } catch { /* 무시 */ }
}
