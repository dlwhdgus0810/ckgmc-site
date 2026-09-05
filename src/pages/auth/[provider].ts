/** GET /auth/google?next=/members → 공급자 로그인 화면으로 이동 */
export const prerender = false;
import type { APIRoute } from 'astro';
import { beginLogin, isProviderId } from '../../lib/auth/oauth';
import { oauthConfig } from '../../lib/env';
import { safeNext } from '../../lib/http';

export const GET: APIRoute = async ({ params, url, cookies, redirect }) => {
  const provider = params.provider ?? '';
  if (!isProviderId(provider) || !oauthConfig(provider)) {
    return new Response('설정되지 않은 로그인 방법입니다.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  const redirectUri = new URL(`/auth/${provider}/callback`, url.origin).toString();
  const to = await beginLogin(provider, cookies, redirectUri, safeNext(url.searchParams.get('next')));
  return redirect(to, 302);
};
