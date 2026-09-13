/** POST /manage/content/upload (사진 1개) → 저장소에 커밋 → { url }. 편집기의 사진 넣기 버튼이 사용 */
export const prerender = false;
import type { APIRoute } from 'astro';
import { getStore } from '../../../lib/content/store';
import { newUploadCtx, stageUpload } from '../../../lib/content/forms';
import { recordChange } from '../../../lib/content/changes';

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user!;
  try {
    const fd = await request.formData();
    const file = fd.get('file');
    if (!(file instanceof File) || file.size === 0) return json({ error: '파일이 없습니다.' }, 400);
    if (!file.type.startsWith('image/')) return json({ error: '이미지 파일만 올릴 수 있습니다.' }, 400);
    const ctx = newUploadCtx();
    const url = await stageUpload(ctx, file, 'image');
    const store = getStore();
    const { sha } = await store.commit({ put: ctx.puts, delete: [] }, `content: upload photo — ${file.name} (admin UI, ${user.name})`, { name: user.name, email: user.email });
    await recordChange({ collection: 'uploads', path: ctx.puts[0].path, title: file.name, action: 'upload', userId: user.id, commitSha: sha });
    return json({ url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : '업로드 실패' }, 500);
  }
};
