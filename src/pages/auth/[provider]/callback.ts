/** GET /auth/google/callback?code=…&state=… → 계정 연결/생성 → 세션 발급 */
export const prerender = false;
import type { APIRoute } from 'astro';
import { completeLogin, isProviderId } from '../../../lib/auth/oauth';
import { createSession } from '../../../lib/auth/session';
import { upsertFromProfile } from '../../../lib/auth/users';
import { safeNext, setFlash } from '../../../lib/http';

export const GET: APIRoute = async ({ params, url, cookies, redirect, request }) => {
  const provider = params.provider ?? '';
  if (!isProviderId(provider)) return new Response('Not found', { status: 404 });
  try {
    const redirectUri = new URL(`/auth/${provider}/callback`, url.origin).toString();
    const { profile, next } = await completeLogin(provider, url, cookies, redirectUri);
    const user = await upsertFromProfile(profile);
    if (user.status === 'disabled') {
      setFlash(cookies, 'danger', '사용이 중지된 계정입니다. 교회 사무실로 문의해 주세요.');
      return redirect('/login', 303);
    }
    await createSession(cookies, user.id, request.headers.get('user-agent'));
    if (user.status === 'pending') {
      setFlash(cookies, 'info', '가입이 접수되었습니다. 관리자가 승인하면 보고서를 작성할 수 있습니다.');
    }
    return redirect(safeNext(next), 303);
  } catch (e) {
    setFlash(cookies, 'danger', e instanceof Error ? e.message : '로그인에 실패했습니다.');
    return redirect('/login', 303);
  }
};
