/** 배포된 빌드 식별자 — 관리 화면의 배포 상태 표시용 */
export const prerender = true;
import type { APIRoute } from 'astro';
export const GET: APIRoute = () =>
  new Response(JSON.stringify({ sha: __BUILD_SHA__, builtAt: __BUILD_AT__ }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
