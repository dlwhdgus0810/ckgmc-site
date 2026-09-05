/**
 * 비밀번호 해시 (PBKDF2-SHA256, Web Crypto). Workers 와 Node 22 모두에서 같은 코드가 돌아갑니다.
 * 저장 형식: pbkdf2-sha256$반복횟수$salt(base64)$hash(base64)
 *
 * 반복 횟수는 Workers 무료 플랜의 CPU 한도(요청당 10ms) 안에서 동작하도록 정했습니다.
 * 유료 플랜으로 바꾸면 ITERATIONS 를 올리세요 — 기존 해시는 다음 로그인 때 자동으로 다시 저장됩니다.
 */
export const ITERATIONS = 40_000;
const KEY_BYTES = 32;

const enc = new TextEncoder();
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, KEY_BYTES * 8);
  return new Uint8Array(bits);
}

/** 길이가 같은 두 바이트열을 시간 차 없이 비교 */
function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string, iterations = ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [alg, iter, salt, hash] = stored.split('$');
  if (alg !== 'pbkdf2-sha256' || !iter || !salt || !hash) return false;
  const derived = await derive(password, unb64(salt), Number(iter));
  return equal(derived, unb64(hash));
}

/** 저장된 해시의 반복 횟수가 현재 설정보다 낮으면 true (로그인 성공 후 다시 해시) */
export function needsRehash(stored: string): boolean {
  const iter = Number(stored.split('$')[1]);
  return !Number.isFinite(iter) || iter < ITERATIONS;
}

/** 비밀번호 규칙: 8자 이상 */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
  if (pw.length > 200) return '비밀번호가 너무 깁니다.';
  return null;
}
