import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 일반 페이지 (src/content/pages/**.md)
 * 파일 경로가 곧 URL입니다. 예) src/content/pages/about/purpose.md → /about/purpose
 */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    /** 페이지 제목 (한글) */
    title: z.string(),
    /** 영문 부제목 — 제목 옆에 작게 표시 */
    subtitle: z.string().optional(),
    /** 헤더 배경 이미지 (public/ 기준 경로). 없으면 단색 배경 */
    headerImage: z.string().optional(),
    /** 본문 위에 "제목 <small>부제</small>" 헤딩을 자동으로 표시할지 */
    showTitle: z.boolean().default(true),
    /** 이 페이지 아래에 게시판을 붙일 때 게시판 키 (src/content/posts/<키>/ 폴더 이름). 'series'는 설교 시리즈 전용 */
    board: z.string().optional(),
    /** 게시판 한 페이지에 보여줄 글 수 */
    perPage: z.number().default(15),
    /** 검색엔진/SNS 공유용 설명 */
    description: z.string().optional(),
    /** 본문에 붙일 특수 기능: 문의 폼, 세례 신청 폼, 교인등록 구글폼, 온라인 헌금, 지도 */
    widget: z.enum(['contact', 'baptism', 'membership', 'offering', 'map']).optional(),
    /** 위젯을 본문 위/아래 어디에 둘지 */
    widgetPosition: z.enum(['top', 'bottom']).default('bottom'),
  }),
});

/**
 * 게시판 글 (src/content/posts/<게시판>/<파일>.md)
 * 예) src/content/posts/sermons/2026-08-02-1558.md → /media/sermons/2026-08-02-1558
 */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    writer: z.string().optional(),
    /** 목록 썸네일 이미지 (public/ 기준). 없으면 유튜브 썸네일 → 기본 이미지 순으로 사용 */
    thumbnail: z.string().optional(),
    /** 유튜브 영상 ID (https://youtu.be/XXXX 의 XXXX 부분) */
    youtube: z.string().optional(),
    /** 첨부파일 목록. file은 public/files/ 안의 파일 이름 */
    attachments: z.array(z.object({ name: z.string(), file: z.string() })).default([]),
    /** 목록에 보여줄 짧은 요약 (없으면 본문 앞부분 사용) */
    excerpt: z.string().optional(),
  }),
});

/**
 * 설교 시리즈 (src/content/series/<파일>.md)
 * 각 시리즈는 여러 유튜브 영상(에피소드)을 묶습니다.
 */
const series = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/series' }),
  schema: z.object({
    title: z.string(),
    thumbnail: z.string(),
    /** 진행 중인 시리즈면 true — 메인 화면과 "진행 중인 시리즈"에 표시 */
    ongoing: z.boolean().default(false),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    episodes: z.array(z.object({ title: z.string(), youtube: z.string() })).default([]),
  }),
});

/**
 * 우리 교회 이야기 (메인 화면 OUR STORY) — 페이스북 게시물을 옮겨온 것. src/content/stories/<파일>.md
 */
const stories = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/stories' }),
  schema: z.object({
    title: z.string().optional(),
    date: z.coerce.date(),
    image: z.string().optional(),
    /** 앨범 사진들 (첫 번째가 대표 이미지) */
    images: z.array(z.string()).default([]),
    /** 원본 페이스북 글 링크 */
    permalink: z.string().optional(),
  }),
});

export const collections = { pages, posts, series, stories };
