/**
 * 콘텐츠 프런트매터 스키마. content.config.ts(빌드)와 관리 화면(저장 전 검증)이 함께 씁니다.
 * 필드 설명은 각 항목 주석 참고. 필드를 추가하면 src/lib/content/collections.ts 의 편집 폼 정의도 함께 고치세요.
 */
import { z } from 'astro/zod';
import { parseWallClock } from '../lib/dates';

/** 일반 페이지 (src/content/pages/**.md). 파일 경로가 곧 URL */
export const pageSchema = z.object({
  /** 페이지 제목 (한글) */
  title: z.string(),
  /** 영문 부제목 — 제목 옆에 작게 표시 */
  subtitle: z.string().optional(),
  /** 헤더 배경 이미지 (public/ 기준 경로). 없으면 단색 배경 */
  headerImage: z.string().optional(),
  /** 상단 배너에 제목을 표시할지 (게시글처럼 본문이 제목을 가진 경우 false) */
  showTitle: z.boolean().default(true),
  /** 메뉴에 표시할 짧은 이름 (없으면 "제목 부제목") */
  menuTitle: z.string().optional(),
  /** 같은 섹션 안에서의 메뉴 순서 (작을수록 위) */
  order: z.number().default(999),
  /** 메뉴에서 숨김 (정책 페이지 등) */
  hideFromNav: z.boolean().default(false),
  /** 메인 화면 사역 소개 카드 등에 쓰는 대표 사진 (없으면 headerImage) */
  image: z.string().optional(),
  /** 이 페이지 아래에 게시판을 붙일 때 게시판 키 (src/content/posts/<키>/ 폴더 이름). 'series'는 설교 시리즈 전용 */
  board: z.string().optional(),
  /** 게시판 한 페이지에 보여줄 글 수 */
  perPage: z.number().default(15),
  /** 검색엔진/SNS 공유용 설명 */
  description: z.string().optional(),
  /** 본문에 붙일 특수 기능: 문의 폼, 세례 신청 폼, 교인등록 구글폼, 온라인 헌금, 지도, 예배 시간 */
  widget: z.enum(['contact', 'baptism', 'membership', 'offering', 'map', 'service-times']).optional(),
  /** 위젯을 본문 위/아래 어디에 둘지 */
  widgetPosition: z.enum(['top', 'bottom']).default('bottom'),
});

/** 게시판 글 (src/content/posts/<게시판>/<파일>.md) */
export const postSchema = z.object({
  title: z.string(),
  /** 작성 시각. `2026-08-29T22:50` 처럼 적은 그대로 표시됩니다 */
  date: z.preprocess(parseWallClock, z.coerce.date()),
  /** 게시판 키 (폴더 이름과 같음; CMS 용) */
  board: z.string().optional(),
  writer: z.string().optional(),
  /** 목록 썸네일 이미지 (public/ 기준). 없으면 유튜브 썸네일 → 기본 이미지 순으로 사용 */
  thumbnail: z.string().optional(),
  /** 유튜브 영상 ID (https://youtu.be/XXXX 의 XXXX 부분) */
  youtube: z.string().optional(),
  /** 첨부파일 목록. file은 public/files/ 안의 파일 이름 또는 /files/… 경로 */
  attachments: z.array(z.object({ name: z.string(), file: z.string() })).default([]),
  /** 목록에 보여줄 짧은 요약 (없으면 본문 앞부분 사용) */
  excerpt: z.string().optional(),
});

/** 설교 시리즈 (src/content/series/<파일>.md) — 유튜브 영상(에피소드) 묶음 */
export const seriesSchema = z.object({
  title: z.string(),
  thumbnail: z.string(),
  /** 진행 중인 시리즈면 true — 메인 화면과 "진행 중인 시리즈"에 표시 */
  ongoing: z.boolean().default(false),
  date: z.preprocess(parseWallClock, z.coerce.date()),
  updated: z.preprocess(parseWallClock, z.coerce.date().optional()),
  episodes: z.array(z.object({ title: z.string(), youtube: z.string() })).default([]),
});

/** 우리 교회 이야기 (src/content/stories/<파일>.md) — 사진 소식 */
export const storySchema = z.object({
  title: z.string().optional(),
  date: z.preprocess(parseWallClock, z.coerce.date()),
  image: z.string().optional(),
  /** 앨범 사진들 (첫 번째가 대표 이미지) */
  images: z.array(z.string()).default([]),
  /** 원본 페이스북 글 링크 */
  permalink: z.string().optional(),
});
