/** /files/… 가 정적 파일에 없을 때(방금 올린 첨부) 저장소에서 읽어 응답 */
export const prerender = false;
import type { APIRoute } from 'astro';
import { serveFromStore } from '../../lib/content/proxy';
export const GET: APIRoute = ({ params }) => serveFromStore('public/files', params.path);
