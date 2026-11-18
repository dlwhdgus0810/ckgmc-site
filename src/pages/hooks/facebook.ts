/**
 * 페이스북 웹훅 주소 — https://ckgmc.org/hooks/facebook  (설정 방법: README "Automatic Facebook stories" 절)
 *  GET  : Meta 앱 설정에서 이 주소를 저장할 때 한 번 확인합니다.
 *         hub.verify_token 이 Worker 시크릿 FACEBOOK_WEBHOOK_VERIFY_TOKEN 과 같으면 hub.challenge 를 그대로 돌려줍니다.
 *  POST : 교회 페이지 글이 바뀔 때마다 옵니다. 앱 시크릿(FACEBOOK_APP_SECRET) 서명이 맞고 새 글이면
 *         GitHub 에 "페이스북 이야기 자동 등록" 워크플로를 바로 실행하라고 알립니다 (repository_dispatch, 기존 GITHUB_TOKEN 사용).
 * 알림 내용(글·이름)은 저장하지 않습니다. 시크릿이 없으면 이 주소는 없는 것처럼 404 로 답합니다.
 */
export const prerender = false;
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { newPostIds, sameSecret, verifySignature } from '../../lib/facebook-webhook';

const MAX_BODY = 1_000_000;
/** 같은 글 알림이 다시 와도(사진마다, Meta 의 재전송) 10분 동안은 워크플로를 한 번만 실행 */
const SEEN_SECONDS = 600;

function vars(): Record<string, string | undefined> { return env as unknown as Record<string, string | undefined>; }
const reply = (text: string, status = 200) =>
  new Response(text, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

export const GET: APIRoute = ({ url }) => {
  const expected = vars().FACEBOOK_WEBHOOK_VERIFY_TOKEN;
  if (!expected) return reply('Not found', 404);
  const q = url.searchParams;
  const challenge = q.get('hub.challenge') ?? '';
  // challenge 는 Meta 가 보내는 숫자입니다. 다른 글자는 되돌려 보내지 않습니다
  if (q.get('hub.mode') === 'subscribe' && sameSecret(q.get('hub.verify_token'), expected) && /^[\w-]{1,128}$/.test(challenge)) {
    return reply(challenge);
  }
  return reply('Forbidden', 403);
};

/** Cloudflare 캐시에 "최근에 처리한 글"을 잠깐 표시해 둡니다. 캐시를 못 쓰면 그냥 매번 실행합니다 */
const seenKey = (id: string) => `https://ckgmc.org/hooks/facebook/seen/${encodeURIComponent(id)}`;
/** Workers 의 기본 캐시 (브라우저 타입 정의에는 `default` 가 없어서 직접 적습니다) */
const edgeCache = () => (caches as unknown as { default: Cache }).default;
async function unseen(ids: string[]): Promise<string[]> {
  try {
    const hits = await Promise.all(ids.map((id) => edgeCache().match(seenKey(id))));
    return ids.filter((_, i) => !hits[i]);
  } catch { return ids; }
}
async function markSeen(ids: string[]): Promise<void> {
  try {
    await Promise.all(ids.map((id) => edgeCache().put(seenKey(id), new Response('1', { headers: { 'cache-control': `max-age=${SEEN_SECONDS}` } }))));
  } catch { /* 표시를 못 해도 워크플로가 한 번 더 돌 뿐입니다 */ }
}

async function startImport(token: string, repo: string): Promise<void> {
  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'ckgmc-site-facebook-webhook',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ event_type: 'facebook-post' }),
  });
  if (res.status !== 204) throw new Error(`GitHub 응답 ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export const POST: APIRoute = async ({ request }) => {
  const v = vars();
  if (!v.FACEBOOK_APP_SECRET) return reply('Not found', 404);
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) return reply('Payload too large', 413);
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BODY) return reply('Payload too large', 413);
  if (!(await verifySignature(body, request.headers.get('x-hub-signature-256'), v.FACEBOOK_APP_SECRET))) {
    return reply('Invalid signature', 401);
  }

  let payload: unknown = null;
  try { payload = JSON.parse(new TextDecoder().decode(body)); } catch { /* 읽을 수 없는 알림은 무시 */ }
  const ids = await unseen(newPostIds(payload));
  if (ids.length === 0) return reply('OK');

  if (!v.GITHUB_TOKEN) {
    console.error('[facebook-webhook] 새 글 알림을 받았지만 GITHUB_TOKEN 이 없어 가져오기를 실행하지 못했습니다.');
    return reply('OK');
  }
  try {
    await startImport(v.GITHUB_TOKEN, v.GITHUB_REPO || 'dlwhdgus0810/ckgmc-site');
    await markSeen(ids);
    console.log(`[facebook-webhook] 새 글 ${ids.length}개 알림 → 가져오기 워크플로 실행`);
  } catch (e) {
    // Meta 는 200 이 아니면 36시간 동안 다시 보내는데, GitHub 쪽 문제는 그사이 풀리지 않을 수 있습니다.
    // 그래서 받았다고만 답하고, 놓친 글은 15분마다 도는 확인이 가져옵니다.
    console.error(`[facebook-webhook] 가져오기 워크플로를 실행하지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
  }
  return reply('OK');
};
