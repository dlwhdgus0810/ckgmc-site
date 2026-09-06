/**
 * 아직 배포되지 않은 업로드 파일을 저장소에서 바로 읽어 보여줍니다.
 * 정적 파일이 있으면 Cloudflare 가 먼저 응답하므로, 이 코드는 "방금 올린 파일"에만 쓰입니다.
 */
import { base64ToBytes, getStore } from './store';

const TYPES: Record<string, string> = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
  mp3: 'audio/mpeg', mp4: 'video/mp4', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', zip: 'application/zip', txt: 'text/plain; charset=utf-8', hwp: 'application/x-hwp',
};

export async function serveFromStore(repoDir: string, relPath: string | undefined): Promise<Response> {
  const rel = decodeURIComponent(relPath ?? '');
  if (!rel || rel.includes('..') || rel.startsWith('/')) return new Response('Not found', { status: 404 });
  try {
    const file = await getStore().readFile(`${repoDir}/${rel}`);
    if (!file) return new Response('Not found', { status: 404 });
    const ext = rel.split('.').pop()?.toLowerCase() ?? '';
    const bytes = base64ToBytes(file.base64);
    return new Response(bytes as BodyInit, { headers: { 'content-type': TYPES[ext] ?? 'application/octet-stream', 'cache-control': 'public, max-age=300', 'x-served-from': 'content-store' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
