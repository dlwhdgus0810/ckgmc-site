/**
 * 페이스북 웹훅 — 교회 페이지에 글이 올라오면 Meta 가 /hooks/facebook 으로 바로 알려 줍니다 (src/pages/hooks/facebook.ts).
 * 여기에는 그 알림을 확인하는 순수한 함수만 둡니다. 글 내용은 저장하지 않고, 가져오기는 지금처럼
 * GitHub 워크플로(facebook-sync.yml → scripts/import-facebook.mjs)가 합니다. 웹훅은 그 워크플로를 "지금 실행"시키기만 합니다.
 */

const enc = new TextEncoder();

/**
 * Meta 가 보낸 알림이 맞는지: 헤더 `X-Hub-Signature-256: sha256=<hex>` 는 앱 시크릿을 키로 본문 바이트 그대로를 HMAC-SHA256 한 값입니다.
 * 비교는 Web Crypto 의 verify 로 합니다 (글자를 하나씩 비교하면 걸린 시간으로 값을 짐작할 수 있습니다).
 */
export async function verifySignature(body: BufferSource, header: string | null, appSecret: string | undefined): Promise<boolean> {
  const m = /^sha256=([0-9a-f]{64})$/i.exec(header?.trim() ?? '');
  if (!m || !appSecret) return false;
  const sig = new Uint8Array(32);
  for (let i = 0; i < 32; i++) sig[i] = parseInt(m[1].slice(i * 2, i * 2 + 2), 16);
  const key = await crypto.subtle.importKey('raw', enc.encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, sig, body);
}

/** 주소 등록 때 받는 확인 문자열 비교 (길이가 같으면 끝까지 비교) */
export function sameSecret(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = enc.encode(given);
  const b = enc.encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

interface FeedValue { item?: unknown; verb?: unknown; post_id?: unknown; photo_id?: unknown; published?: unknown }
interface Notification { object?: unknown; entry?: Array<{ id?: unknown; changes?: Array<{ field?: unknown; value?: FeedValue }> }> }

/** 새 글로 볼 알림 종류. 댓글·좋아요·공유 반응·수정·삭제는 사이트에 가져올 것이 없으므로 무시합니다 */
const NEW_ITEMS = new Set(['post', 'status', 'photo', 'album', 'video']);

/**
 * 알림 묶음에서 "새로 올라온 글"의 번호만 고릅니다 (같은 글은 한 번만).
 * 사진 여러 장짜리 글은 사진마다 알림이 오지만 글 번호(post_id)가 같아서 하나로 모입니다.
 */
export function newPostIds(payload: unknown): string[] {
  const p = payload as Notification | null;
  if (!p || p.object !== 'page' || !Array.isArray(p.entry)) return [];
  const ids = new Set<string>();
  for (const entry of p.entry) {
    if (!entry || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      const v = change?.value;
      if (change?.field !== 'feed' || !v || v.verb !== 'add' || !NEW_ITEMS.has(String(v.item))) continue;
      if (v.published === 0 || v.published === false || v.published === '0') continue; // 예약·비공개 글
      const id = v.post_id ?? v.photo_id ?? entry.id;
      ids.add(typeof id === 'string' || typeof id === 'number' ? String(id).slice(0, 100) : 'page');
    }
  }
  return [...ids];
}
