import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { pageSchema, postSchema, seriesSchema, storySchema } from './content/schemas';

/**
 * 콘텐츠 컬렉션. 스키마(필드 정의)는 src/content/schemas.ts 에 있습니다 — 관리 화면의 저장 검증과 공유.
 *  - pages:   src/content/pages/**.md   → 파일 경로가 곧 URL (about/purpose.md → /about/purpose)
 *  - posts:   src/content/posts/<게시판>/<파일>.md → 게시판 페이지 아래 글 (sermons/2026-08-02-1558.md → /media/sermons/2026-08-02-1558)
 *  - series:  src/content/series/*.md   → 설교 시리즈
 *  - stories: src/content/stories/*.md  → 우리 교회 이야기
 */
const pages = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/pages' }), schema: pageSchema });
const posts = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/posts' }), schema: postSchema });
const series = defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/series' }), schema: seriesSchema });
const stories = defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/stories' }), schema: storySchema });

export const collections = { pages, posts, series, stories };
