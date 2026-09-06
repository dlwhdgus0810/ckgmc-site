import { getCollection, type CollectionEntry } from 'astro:content';
import { formatDate, isoDate } from './dates';

export type Post = CollectionEntry<'posts'>;

/** 게시글 id('sermons/2026-08-02-1558')에서 게시판 키를 얻습니다 */
export function boardOf(post: Post): string {
  return post.id.split('/')[0];
}
/** 게시글 id에서 URL 슬러그 부분을 얻습니다 */
export function slugOf(post: Post): string {
  return post.id.split('/').slice(1).join('/');
}

/** 특정 게시판의 글을 최신순으로 반환 (hidden: true 인 글은 목록·홈·주소·사이트맵 모두에서 제외) */
export async function getBoardPosts(board: string): Promise<Post[]> {
  const all = await getCollection('posts', (p) => p.id.startsWith(board + '/') && !p.data.hidden);
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

/** HTML → 태그를 없애고 공백을 정리한 순수 텍스트 */
export function plainText(html: string | undefined): string {
  return decodeEntities((html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}
const truncate = (text: string, length: number) => (text.length > length ? text.slice(0, length) + '...' : text);
/** HTML 본문에서 태그를 제거하고 앞부분만 잘라 요약을 만듭니다 */
export function textExcerpt(html: string | undefined, length: number): string {
  return truncate(plainText(html), length);
}
/** 이야기 요약: 페이스북에서 옮긴 글은 본문 첫 줄이 제목과 같으므로 그 부분은 빼고 자릅니다 */
export function storyExcerpt(story: CollectionEntry<'stories'>, length = 90): string {
  let text = plainText(story.body);
  const title = (story.data.title ?? '').replace(/\s+/g, ' ').trim();
  if (title && text.startsWith(title)) text = text.slice(title.length).replace(/^[\s|·:\-–—]+/, '');
  return truncate(text, length);
}

/** 게시글 요약: excerpt 필드 → 본문 앞부분 → 첨부파일 이름 순 */
export function excerptOf(post: Post, length = 70): string {
  if (post.data.excerpt) return post.data.excerpt;
  const text = textExcerpt(post.body, length);
  if (!text && post.data.attachments.length) return post.data.attachments.map((a) => a.name).join(', ');
  return text;
}

/**
 * 목록용 썸네일: 지정 썸네일 → 유튜브 썸네일 → 본문 첫 이미지 → 기본 이미지
 * size 'hq' = 480×360(약 13KB, 위아래 검은 띠는 16:9 상자에서 잘려 보이지 않음) / 'hd' = 1280×720(약 300KB, 큰 카드 전용)
 */
export function thumbnailOf(post: Post, size: 'hq' | 'hd' = 'hq'): string {
  if (post.data.thumbnail) return post.data.thumbnail;
  if (post.data.youtube) return `https://i.ytimg.com/vi/${post.data.youtube}/${size === 'hd' ? 'hq720' : 'hqdefault'}.jpg`;
  const m = (post.body ?? '').match(/<img[^>]+src="([^"]+)"/);
  if (m) return m[1];
  return '/images/thumbnail-default.jpg';
}

/**
 * <img> 에 펼쳐 넣는 썸네일 속성. 'hd' 는 16:9 원본(hq720)을 먼저 쓰고 없는 영상이면 기본(hqdefault)으로 바꿉니다.
 */
export function thumbAttrs(post: Post, size: 'hq' | 'hd' = 'hq'): { src: string; onerror?: string } {
  const src = thumbnailOf(post, size);
  if (size === 'hd' && !post.data.thumbnail && post.data.youtube) {
    return { src, onerror: `this.onerror=null;this.src='https://i.ytimg.com/vi/${post.data.youtube}/hqdefault.jpg'` };
  }
  return { src };
}

/** 첨부파일 경로: `/` 나 `http` 로 시작하면 그대로, 아니면 public/files/ 안의 파일로 봅니다 */
export function fileUrl(file: string): string {
  return /^(\/|https?:)/.test(file) ? file : `/files/${file}`;
}
/** 첫 번째 PDF 첨부 (주보 미리보기용) */
export function pdfOf(post: Post): { name: string; file: string } | undefined {
  return post.data.attachments.find((a) => a.file.toLowerCase().endsWith('.pdf'));
}

export { formatDate, formatKoreanDate, isoDate, isNew } from './dates';

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

// ── 표시 날짜 ────────────────────────────────────────────────────────
// 유튜브에서 자동 등록된 설교의 `date` 는 업로드 시각이고, 제목 끝의 `2026.09.04` 가 실제 예배 날짜입니다.
// 홈·목록·상세가 같은 날짜를 보여주도록 예배 날짜를 우선하고, 없으면 게시 시각을 씁니다.
/** 제목에 적힌 예배 날짜(2026.08.16 / 2026.8.16 (일) …)를 Date(UTC 자정)로. 없으면 undefined */
export function serviceDate(post: Post): Date | undefined {
  const m = titleParts(post).date?.match(/^(\d{4})[.\-/]\s?(\d{1,2})[.\-/]\s?(\d{1,2})/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : undefined;
}
/** 화면에 보여줄 날짜: 예배 날짜 → 없으면 게시 시각 */
export const displayDate = (post: Post): Date => serviceDate(post) ?? post.data.date;
/** <time datetime> 값: 예배 날짜면 날짜만, 아니면 게시 시각(분 단위) */
export const dateTimeAttr = (post: Post): string => {
  const s = serviceDate(post);
  return s ? formatDate(s) : isoDate(post.data.date);
};

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
