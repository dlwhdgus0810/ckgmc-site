/**
 * 서버 렌더링 요청마다 실행: 세션 확인 → locals.user, 로그인 필요 구역 보호, 폼 POST 의 출처 검사.
 * 정적으로 빌드되는 페이지(isPrerendered)에서는 아무 일도 하지 않습니다.
 */
import { defineMiddleware } from 'astro:middleware';
import { getSessionUser, isAdmin } from './lib/auth/session';
import { sameOrigin, setFlash } from './lib/http';

const MEMBER_PREFIX = '/members';
const MANAGE_PREFIX = '/manage';
/** 승인 대기 중인 사용자도 들어갈 수 있는 곳 */
const PENDING_OK = new Set(['/members', '/members/password']);

export const onRequest = defineMiddleware(async (ctx, next) => {
  ctx.locals.user = null;
  if (ctx.isPrerendered) return next();

  const path = ctx.url.pathname.replace(/\/$/, '') || '/';
  const method = ctx.request.method;

  if (method !== 'GET' && method !== 'HEAD' && !sameOrigin(ctx.request, ctx.url)) {
    return new Response('요청 출처를 확인할 수 없습니다.', { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  ctx.locals.user = await getSessionUser(ctx.cookies);
  const user = ctx.locals.user;

  const protectedArea = path === MEMBER_PREFIX || path.startsWith(MEMBER_PREFIX + '/') || path === MANAGE_PREFIX || path.startsWith(MANAGE_PREFIX + '/');
  if (protectedArea) {
    if (!user) {
      return ctx.redirect(`/login?next=${encodeURIComponent(path)}`, 302);
    }
    if (path.startsWith(MANAGE_PREFIX) && !isAdmin(user)) {
      setFlash(ctx.cookies, 'warning', '관리자만 들어갈 수 있는 페이지입니다.');
      return ctx.redirect('/members', 302);
    }
    if (user.status !== 'active' && !PENDING_OK.has(path)) {
      setFlash(ctx.cookies, 'warning', '관리자 승인 후 이용할 수 있습니다.');
      return ctx.redirect('/members', 302);
    }
  }

  const res = await next();
  if (protectedArea || path === '/login' || path.startsWith('/auth/')) {
    res.headers.set('cache-control', 'private, no-store');
    res.headers.set('x-robots-tag', 'noindex, nofollow');
  }
  return res;
});
