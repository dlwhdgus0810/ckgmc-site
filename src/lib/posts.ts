import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** 게시글 id('sermons/2026-08-02-1558')에서 게시판 키를 얻습니다 */
export function boardOf(post: Post): string {
  return post.id.split('/')[0];
}
/** 게시글 id에서 URL 슬러그 부분을 얻습니다 */
export function slugOf(post: Post): string {
  return post.id.split('/').slice(1).join('/');
}

/** 특정 게시판의 글을 최신순으로 반환 */
export async function getBoardPosts(board: string): Promise<Post[]> {
  const all = await getCollection('posts', (p) => p.id.startsWith(board + '/'));
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || b.id.localeCompare(a.id));
}

/** HTML 엔티티(&amp; &quot; …)를 일반 문자로 되돌립니다 */
export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** HTML 본문에서 태그를 제거하고 앞부분만 잘라 요약을 만듭니다 */
export function textExcerpt(html: string | undefined, length: number): string {
  const text = decodeEntities((html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return text.length > length ? text.slice(0, length) + '...' : text;
}

/** 게시글 요약: excerpt 필드 → 본문 앞부분 → 첨부파일 이름 순 */
export function excerptOf(post: Post, length = 70): string {
  if (post.data.excerpt) return post.data.excerpt;
  const text = textExcerpt(post.body, length);
  if (!text && post.data.attachments.length) return post.data.attachments.map((a) => a.name).join(', ');
  return text;
}

/** 목록용 썸네일: 지정 썸네일 → 유튜브 썸네일 → 본문 첫 이미지 → 기본 이미지 */
export function thumbnailOf(post: Post): string {
  if (post.data.thumbnail) return post.data.thumbnail;
  if (post.data.youtube) return `https://i.ytimg.com/vi/${post.data.youtube}/hqdefault.jpg`;
  const m = (post.body ?? '').match(/<img[^>]+src="([^"]+)"/);
  if (m) return m[1];
  return '/images/thumbnail-default.jpg';
}

/** 첨부파일 경로: `/` 나 `http` 로 시작하면 그대로, 아니면 public/files/ 안의 파일로 봅니다 */
export function fileUrl(file: string): string {
  return /^(\/|https?:)/.test(file) ? file : `/files/${file}`;
}
/** 첫 번째 PDF 첨부 (주보 미리보기용) */
export function pdfOf(post: Post): { name: string; file: string } | undefined {
  return post.data.attachments.find((a) => a.file.toLowerCase().endsWith('.pdf'));
}

export { formatDate, formatDateTime, formatKoreanDate, formatLongDate, formatStoryDate, isoDate, isNew } from './dates';
