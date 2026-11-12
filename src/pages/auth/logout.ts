/** POST /auth/logout → 세션 삭제. (GET 으로 들어오면 홈으로) */
export const prerender = false;
import type { APIRoute } from 'astro';
import { destroySession } from '../../lib/auth/session';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  await destroySession(cookies);
  // 이 탭에 임시 보관된 보고서 초안은 로그아웃 버튼을 누를 때 브라우저 쪽에서 지웁니다 (src/scripts/nav.ts)
  return redirect('/', 303);
};
export const GET: APIRoute = ({ redirect }) => redirect('/', 302);
