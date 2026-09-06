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

// ── 설교 제목 나누기 ────────────────────────────────────────────────
/** 유튜브 제목처럼 `예배 종류 | 설교 제목 | 설교자 | 날짜` 로 이어진 제목을 나눕니다 */
export interface ParsedTitle { title: string; service?: string; preacher?: string; date?: string; raw: string }
/** 제목을 나눠서 보여주는 게시판 (유튜브에서 자동 등록되는 것들) */
export const PARSED_BOARDS = new Set(['sermons', 'special-services', 'choir']);

export function parseSermonTitle(raw: string): ParsedTitle {
  const parts = raw.split('|').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return { title: raw, raw };
  let date: string | undefined;
  let preacher: string | undefined;
  let service: string | undefined;
  const rest: string[] = [];
  for (const p of parts) {
    const clean = p.replace(/^\[|\]$/g, '').trim();
    if (!date && /^\d{4}[.\-/]\s?\d{1,2}[.\-/]\s?\d{1,2}\.?(\s*\(.\))?$/.test(clean)) date = clean.replace(/\.$/, '');
    else if (!preacher && clean.length <= 24 && /(목사|전도사|간사|장로|사모|선교사|교수|집사|Pastor|Rev\.|Dr\.)/.test(clean)) preacher = clean;
    else if (!service && clean.length <= 28 && /(예배|집회|설교|찬양|간증|LIVE|Live|Service|Worship|Praise)/.test(clean)) service = clean;
    else rest.push(clean);
  }
  if (rest.length === 0) return { title: service ?? raw, preacher, date, raw };
  return { title: rest.join(' | '), service, preacher, date, raw };
}
/** 게시판에 따라 나눈 제목 또는 원래 제목 */
export function titleParts(post: Post): ParsedTitle {
  return PARSED_BOARDS.has(boardOf(post)) ? parseSermonTitle(post.data.title) : { title: post.data.title, raw: post.data.title };
}
export const displayTitle = (post: Post) => titleParts(post).title;

// ── 유튜브 설명 접기 ─────────────────────────────────────────────────
const DIVIDER = /<p>\s*(?:[─—–_=-]\s*){8,}<\/p>|<hr\s*\/?>/i;
/**
 * 영상 설명 본문을 "말씀 소개"와 "그 아래 상용구(예배 안내·헌금·저작권)" 로 나눕니다.
 * 구분선(────)이 없으면 나누지 않습니다. URL 은 링크로 바꿉니다.
 */
export function splitDescription(html: string | undefined): { intro: string; more: string } | null {
  if (!html) return null;
  let body = html.trim().replace(/^<div>\s*/i, '').replace(/\s*<\/div>\s*$/i, '');
  const m = DIVIDER.exec(body);
  if (!m) return null;
  const linkify = (s: string) => s.replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, (_, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener">${decodeURIComponent(url).replace(/^https?:\/\//, '')}</a>`);
  const intro = linkify(body.slice(0, m.index).trim());
  const more = linkify(body.slice(m.index + m[0].length).replace(DIVIDER, '<hr>').replace(new RegExp(DIVIDER.source, 'gi'), '<hr>').trim());
  return { intro, more };
}
