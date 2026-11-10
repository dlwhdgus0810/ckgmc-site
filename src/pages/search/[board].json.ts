/**
 * 게시판 검색 목록 (/search/sermons.json 등). 빌드 때 정적으로 만들어지고, 목록 화면의 검색 상자가 처음 쓰일 때 한 번 내려받습니다.
 * 사이트에 이미 공개된 내용(제목·설교자·날짜·주소)만 담습니다. 숨긴 글(hidden)은 빠집니다.
 *   u 주소 끝부분 · t 제목 · s 예배 종류 · p 설교자 · d 표시 날짜(YYYY-MM-DD) · i 썸네일 · f PDF · x 요약 · k 화면에 안 보이는 검색어(성경 본문)
 */
export const prerender = true;
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { getBoardPosts, slugOf, titleParts, displayDate, thumbnailOf, hasOwnImage, pdfOf, fileUrl, excerptOf, plainText, boardLayout, formatDate, PARSED_BOARDS } from '../../lib/posts';

export const getStaticPaths: GetStaticPaths = async () => {
  const pages = await getCollection('pages');
  const boards = [...new Set(pages.map((p) => p.data.board).filter((b): b is string => !!b && b !== 'series'))];
  return boards.map((board) => ({ params: { board } }));
};

/** 본문 앞부분에서 성경 본문 표기(사사기 1 : 1 - 7, 행 16:22-32, 로마서 8장 …)를 찾아 검색어로 씁니다 */
function scriptureOf(body: string | undefined): string | undefined {
  const m = plainText(body).slice(0, 400).match(/[가-힣]{1,6}\s?\d{1,3}\s?(?:[:：]\s?\d{1,3}(?:\s?[-~–]\s?\d{1,3})?|장)/);
  return m?.[0].replace(/\s+/g, ' ');
}

export const GET: APIRoute = async ({ params }) => {
  const board = params.board!;
  const posts = await getBoardPosts(board);
  const rows = boardLayout(posts) === 'rows';
  const parsed = PARSED_BOARDS.has(board);
  const items = posts.map((post) => {
    const t = titleParts(post);
    const pdf = pdfOf(post);
    const text = excerptOf(post, 90);
    return {
      u: slugOf(post),
      t: t.title,
      s: t.service,
      p: t.preacher,
      d: formatDate(parsed ? displayDate(post) : post.data.date),
      i: !rows && hasOwnImage(post) ? thumbnailOf(post) : undefined,
      f: rows && pdf ? fileUrl(pdf.file) : undefined,
      x: !parsed && text && !/\.(pdf|docx?|pptx?|xlsx?|hwp)$/i.test(text.trim()) ? text : undefined,
      k: parsed ? scriptureOf(post.body) : undefined,
    };
  });
  return new Response(JSON.stringify(items), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
