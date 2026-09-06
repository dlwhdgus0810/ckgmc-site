/**
 * 빌드에 포함된 콘텐츠 목록 (관리 화면 /manage/content 가 읽음). 정적으로 생성되어 빌드마다 갱신됩니다.
 * 담는 정보는 제목·경로·날짜뿐이라 공개되어도 문제없습니다 (모두 사이트에 이미 있는 내용).
 */
export const prerender = true;
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { pagesCollectionKey } from '../lib/content/collections';
import { isoDate } from '../lib/dates';

export const GET: APIRoute = async () => {
  const [pages, posts, series, stories] = await Promise.all([getCollection('pages'), getCollection('posts'), getCollection('series'), getCollection('stories')]);
  const entries = [
    ...pages.map((p) => ({
      collection: p.id.includes('/') ? pagesCollectionKey(p.id.split('/')[0]) : 'pages_misc',
      path: p.filePath ?? '', title: p.data.title, order: p.data.order,
      note: [p.data.subtitle, p.data.hideFromNav ? '메뉴 숨김' : ''].filter(Boolean).join(' · '),
    })),
    ...posts.map((p) => ({ collection: p.id.split('/')[0], path: p.filePath ?? '', title: p.data.title, date: isoDate(p.data.date), note: [p.data.writer, p.data.hidden ? '숨김' : ''].filter(Boolean).join(' · ') })),
    ...series.map((s) => ({ collection: 'series', path: s.filePath ?? '', title: s.data.title, date: isoDate(s.data.date), note: `${s.data.episodes.length}편${s.data.ongoing ? ' · 진행 중' : ''}` })),
    ...stories.map((s) => ({ collection: 'stories', path: s.filePath ?? '', title: s.data.title ?? '(제목 없음)', date: isoDate(s.data.date), note: `사진 ${s.data.images.length}장` })),
  ].filter((e) => e.path);
  return new Response(JSON.stringify({ sha: __BUILD_SHA__, builtAt: __BUILD_AT__, entries }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
