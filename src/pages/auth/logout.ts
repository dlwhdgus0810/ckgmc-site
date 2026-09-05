/** POST /auth/logout → 세션 삭제. (GET 으로 들어오면 홈으로) */
export const prerender = false;
import type { APIRoute } from 'astro';
import { destroySession } from '../../lib/auth/session';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  await destroySession(cookies);
  return redirect('/', 303);
};
export const GET: APIRoute = ({ redirect }) => redirect('/', 302);
