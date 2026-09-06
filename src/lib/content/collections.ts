/**
 * 관리 화면에서 편집할 수 있는 콘텐츠 종류와 입력 폼 정의.
 * 파일 스키마(src/content/schemas.ts, src/data/site.schema.ts)와 짝을 이룹니다 — 필드를 더하면 양쪽을 함께 고치세요.
 */
import type { ZodTypeAny } from 'astro/zod';
import { pageSchema, postSchema, seriesSchema, storySchema } from '../../content/schemas';
import { siteSchema } from '../../data/site.schema';

export interface FieldBase { name: string; label: string; hint?: string; required?: boolean }
export interface SimpleField extends FieldBase { widget: 'string' | 'text' | 'number' | 'datetime' | 'date' | 'image' | 'file' | 'youtube'; default?: string | number; placeholder?: string }
export interface BooleanField extends FieldBase { widget: 'boolean'; default?: boolean }
export interface SelectField extends FieldBase { widget: 'select'; options: { value: string; label: string }[]; default?: string }
export interface ListField extends FieldBase { widget: 'list'; fields: Field[]; itemLabel?: string }
export interface ImageListField extends FieldBase { widget: 'imagelist' }
export interface ObjectField extends FieldBase { widget: 'object'; fields: Field[] }
export type Field = SimpleField | BooleanField | SelectField | ListField | ImageListField | ObjectField;

export type CollectionGroup = '게시판' | '시리즈 · 이야기' | '페이지' | '사이트 설정';
export interface Collection {
  key: string;
  label: string;
  group: CollectionGroup;
  /** folder: 폴더 안의 .md 파일들 / json: 파일 하나 */
  kind: 'folder' | 'json';
  folder?: string;
  /** folder 형식에서 하위 폴더는 제외 (페이지 · 기타) */
  rootOnly?: boolean;
  file?: string;
  /** 글 주소 앞부분 (미리보기 링크) */
  urlPrefix?: string;
  fields: Field[];
  /** html: 서식 편집기 / raw: HTML 직접 편집 / none: 본문 없음 */
  body: 'html' | 'raw' | 'none';
  /** 새 파일 이름 앞에 날짜를 붙일지 (게시글) */
  datePrefix?: boolean;
  sortBy: 'date' | 'order' | 'title';
  hint?: string;
  schema?: ZodTypeAny;
}

/** 게시판: 키(폴더 이름) → 이름 · 주소 */
export const BOARDS: Array<{ key: string; label: string; urlPrefix: string; youtube?: boolean }> = [
  { key: 'sermons', label: '영상 설교', urlPrefix: '/media/sermons', youtube: true },
  { key: 'bulletins', label: '주보', urlPrefix: '/media/bulletins' },
  { key: 'resources', label: '자료실 (소그룹 나눔지)', urlPrefix: '/media/resources' },
  { key: 'choir', label: '성가대 찬양', urlPrefix: '/media/choir', youtube: true },
  { key: 'special-services', label: '특별 집회', urlPrefix: '/media/special-services', youtube: true },
  { key: 'mission-stories', label: '선교지 소식', urlPrefix: '/missions/stories' },
  { key: 'children', label: '부서 소식 · 유아·어린이부', urlPrefix: '/ministries/children' },
  { key: 'youth', label: '부서 소식 · 청소년부', urlPrefix: '/ministries/youth' },
  { key: 'young-adult', label: '부서 소식 · 청년부', urlPrefix: '/ministries/young-adult' },
  { key: 'camping', label: '부서 소식 · 캠핑 미니스트리', urlPrefix: '/ministries/camping' },
  { key: 'english', label: '부서 소식 · English Ministry', urlPrefix: '/ministries/english' },
  { key: 'newcomers', label: '부서 소식 · 새가족환영회', urlPrefix: '/next-steps/newcomers' },
  { key: 'serving', label: '부서 소식 · 교회 섬김', urlPrefix: '/next-steps/serving' },
  { key: 'community', label: '부서 소식 · 지역 사회 섬김', urlPrefix: '/missions/community' },
];

const PAGE_SECTIONS: Array<{ key: string; label: string }> = [
  { key: 'about', label: '교회 소개' },
  { key: 'media', label: '미디어' },
  { key: 'ministries', label: '사역' },
  { key: 'next-steps', label: '양육과 훈련' },
  { key: 'missions', label: '섬김과 선교' },
];
export const pagesCollectionKey = (section: string) => `pages_${section.replace(/-/g, '_')}`;

const postFields = (youtube: boolean): Field[] => [
  { name: 'title', label: '제목', widget: 'string', required: true },
  { name: 'date', label: '날짜', widget: 'datetime', required: true, hint: '적은 시각 그대로 표시됩니다' },
  { name: 'writer', label: '작성자', widget: 'string', default: '관리자' },
  { name: 'youtube', label: '유튜브 영상', widget: 'youtube', hint: youtube ? '영상 주소를 붙여 넣으면 됩니다 (https://youtu.be/… 또는 watch?v=…)' : '영상이 있으면 주소를 붙여 넣으세요' },
  { name: 'thumbnail', label: '목록 썸네일', widget: 'image', hint: '비우면 유튜브 썸네일 → 기본 이미지 순으로 표시' },
  { name: 'attachments', label: '첨부파일', widget: 'list', itemLabel: '첨부', fields: [
    { name: 'name', label: '표시 이름', widget: 'string', placeholder: '예: 2026-08-30 주일예배 주보 (비우면 파일 이름)' },
    { name: 'file', label: '파일', widget: 'file', required: true },
  ] },
  { name: 'excerpt', label: '목록 요약', widget: 'text', hint: '비우면 본문 앞부분을 보여줍니다' },
];

const pageFields: Field[] = [
  { name: 'title', label: '제목', widget: 'string', required: true },
  { name: 'subtitle', label: '영문 부제', widget: 'string' },
  { name: 'menuTitle', label: '메뉴 표시 이름', widget: 'string', hint: "비우면 '제목 부제'로 표시" },
  { name: 'order', label: '메뉴 순서', widget: 'number', hint: '작을수록 위 (10, 20, 30 …)', default: 999 },
  { name: 'hideFromNav', label: '메뉴에서 숨김', widget: 'boolean', default: false },
  { name: 'headerImage', label: '상단 배너 사진', widget: 'image', hint: '권장 1600×500' },
  { name: 'image', label: '카드 사진 (메인 사역 소개)', widget: 'image' },
  { name: 'description', label: '한 줄 설명 (카드·검색엔진)', widget: 'text' },
  { name: 'board', label: '이 페이지 아래 게시판', widget: 'select', options: [{ value: 'series', label: '설교 시리즈' }, ...BOARDS.map((b) => ({ value: b.key, label: b.label }))] },
  { name: 'perPage', label: '게시판 한 페이지 글 수', widget: 'number', default: 15 },
  { name: 'widget', label: '특수 기능', widget: 'select', options: [
    { value: 'contact', label: '문의 폼 + 연락처' }, { value: 'baptism', label: '세례 신청 폼' }, { value: 'membership', label: '교인등록 구글폼' },
    { value: 'offering', label: '온라인 헌금' }, { value: 'map', label: '지도' }, { value: 'service-times', label: '예배 시간' },
  ] },
  { name: 'widgetPosition', label: '특수 기능 위치', widget: 'select', options: [{ value: 'top', label: '본문 위' }, { value: 'bottom', label: '본문 아래' }], default: 'bottom' },
  { name: 'showTitle', label: '(호환용) 본문 제목 표시', widget: 'boolean', default: true },
];

export const COLLECTIONS: Collection[] = [
  ...BOARDS.map<Collection>((b) => ({
    key: b.key, label: b.label, group: '게시판', kind: 'folder', folder: `src/content/posts/${b.key}`, urlPrefix: b.urlPrefix,
    fields: postFields(!!b.youtube), body: 'html', datePrefix: true, sortBy: 'date', schema: postSchema,
  })),
  {
    key: 'series', label: '설교 시리즈', group: '시리즈 · 이야기', kind: 'folder', folder: 'src/content/series', urlPrefix: '/media/series',
    fields: [
      { name: 'title', label: '시리즈 이름', widget: 'string', required: true },
      { name: 'thumbnail', label: '썸네일', widget: 'image', required: true },
      { name: 'ongoing', label: '진행 중 (메인 화면에 표시)', widget: 'boolean', default: false },
      { name: 'date', label: '시작일', widget: 'date', required: true },
      { name: 'updated', label: '최근 업데이트', widget: 'date' },
      { name: 'episodes', label: '에피소드', widget: 'list', itemLabel: '영상', fields: [
        { name: 'title', label: '제목', widget: 'string', required: true },
        { name: 'youtube', label: '유튜브 영상', widget: 'youtube', required: true },
      ] },
    ],
    body: 'html', sortBy: 'date', schema: seriesSchema,
  },
  {
    key: 'stories', label: '우리 교회 이야기', group: '시리즈 · 이야기', kind: 'folder', folder: 'src/content/stories', urlPrefix: '/story',
    fields: [
      { name: 'title', label: '제목', widget: 'string', required: true },
      { name: 'date', label: '날짜', widget: 'datetime', required: true },
      { name: 'image', label: '대표 사진', widget: 'image', hint: '비우면 앨범의 첫 사진' },
      { name: 'images', label: '앨범 사진', widget: 'imagelist' },
      { name: 'permalink', label: '원본 글 링크 (페이스북 등)', widget: 'string' },
    ],
    body: 'html', datePrefix: true, sortBy: 'date', schema: storySchema,
  },
  ...PAGE_SECTIONS.map<Collection>((s) => ({
    key: pagesCollectionKey(s.key), label: `페이지 · ${s.label}`, group: '페이지', kind: 'folder', folder: `src/content/pages/${s.key}`, urlPrefix: `/${s.key}`,
    fields: pageFields, body: 'raw', sortBy: 'order', schema: pageSchema,
    hint: '페이지 본문은 Bootstrap 클래스가 들어간 HTML 이라 직접 편집 방식입니다. 새 페이지를 만들면 메뉴에 자동으로 들어갑니다.',
  })),
  {
    key: 'pages_misc', label: '페이지 · 기타 (처음 오셨나요, 헌금, 정책)', group: '페이지', kind: 'folder', folder: 'src/content/pages', rootOnly: true, urlPrefix: '',
    fields: pageFields, body: 'raw', sortBy: 'title', schema: pageSchema,
  },
  {
    key: 'settings', label: '사이트 설정', group: '사이트 설정', kind: 'json', file: 'src/data/site.json',
    hint: '교회 정보 · 예배 시간 · 메인 첫 화면 · 교회 소식 포스터 · 링크. 잘못된 값은 저장 전에 검사합니다.',
    fields: [
      { name: 'name', label: '교회 이름', widget: 'string', required: true },
      { name: 'nameEn', label: '교회 이름 (영문)', widget: 'string', required: true },
      { name: 'description', label: '사이트 설명 (검색엔진·공유)', widget: 'text', required: true },
      { name: 'address', label: '주소', widget: 'string', required: true },
      { name: 'mapQuery', label: '구글 지도 검색어', widget: 'string', required: true, hint: '지도 임베드·길찾기에 쓰는 주소' },
      { name: 'phone', label: '전화', widget: 'string', required: true },
      { name: 'email', label: '대표 이메일', widget: 'string', required: true, hint: '문의 폼도 이 주소로 갑니다 (formEndpoint 참고)' },
      { name: 'logo', label: '로고', widget: 'image', required: true },
      { name: 'ogImage', label: '공유용 대표 이미지', widget: 'image', required: true },
      { name: 'social', label: 'SNS', widget: 'object', fields: [
        { name: 'facebook', label: '페이스북', widget: 'string', required: true },
        { name: 'youtube', label: '유튜브', widget: 'string', required: true },
        { name: 'instagram', label: '인스타그램', widget: 'string', required: true },
      ] },
      { name: 'youtubeChannelId', label: '유튜브 채널 ID', widget: 'string', required: true, hint: '자동 설교 등록에 사용' },
      { name: 'liveUrl', label: '유튜브 라이브 주소', widget: 'string' },
      { name: 'giving', label: '온라인 헌금', widget: 'object', fields: [
        { name: 'url', label: '헌금 페이지 주소', widget: 'string', required: true },
        { name: 'embed', label: '임베드 주소', widget: 'string', required: true },
      ] },
      { name: 'membershipFormEmbed', label: '교인등록 구글폼 임베드 주소', widget: 'string', required: true },
      { name: 'newFamilyFormUrl', label: '새가족 등록 신청서 주소', widget: 'string', required: true },
      { name: 'formEndpoint', label: '문의 폼 전송 주소 (FormSubmit)', widget: 'string', hint: 'https://formsubmit.co/이메일 — 비우면 이메일 링크로 대체' },
      { name: 'formThanksPath', label: '폼 전송 후 이동 경로', widget: 'string', default: '/thanks', required: true },
      { name: 'hero', label: '메인 첫 화면', widget: 'object', fields: [
        { name: 'image', label: '배경 사진', widget: 'image', required: true, hint: '가로 1920px 이상 권장' },
        { name: 'alt', label: '사진 설명 (대체 텍스트)', widget: 'string', required: true },
        { name: 'eyebrow', label: '작은 윗글 (영문 교회명)', widget: 'string' },
        { name: 'headline', label: '큰 제목', widget: 'string', required: true },
        { name: 'subline', label: '소개 문장', widget: 'text' },
        { name: 'primary', label: '첫 번째 버튼', widget: 'object', fields: [{ name: 'label', label: '글자', widget: 'string', required: true }, { name: 'href', label: '링크', widget: 'string', required: true }] },
        { name: 'secondary', label: '두 번째 버튼', widget: 'object', fields: [{ name: 'label', label: '글자', widget: 'string', required: true }, { name: 'href', label: '링크', widget: 'string', required: true }] },
      ] },
      { name: 'serviceTimes', label: '예배 시간', widget: 'list', itemLabel: '예배', fields: [
        { name: 'name', label: '예배 이름', widget: 'string', required: true },
        { name: 'time', label: '시간', widget: 'string', required: true },
        { name: 'place', label: '장소', widget: 'string' },
        { name: 'note', label: '비고', widget: 'string' },
      ] },
      { name: 'notices', label: '교회 소식 포스터 (메인)', widget: 'list', itemLabel: '포스터', fields: [
        { name: 'image', label: '포스터 이미지', widget: 'image', required: true, hint: '권장 1600×500' },
        { name: 'alt', label: '포스터 설명 (대체 텍스트)', widget: 'string', required: true },
        { name: 'title', label: '제목', widget: 'string' },
        { name: 'href', label: '누르면 이동할 주소', widget: 'string' },
      ] },
      { name: 'quickLinks', label: '메인 바로가기 아이콘', widget: 'list', itemLabel: '바로가기', fields: [
        { name: 'title', label: '제목', widget: 'string', required: true },
        { name: 'subtitle', label: '영문', widget: 'string' },
        { name: 'icon', label: '아이콘 파일 경로', widget: 'string' },
        { name: 'href', label: '주소', widget: 'string', required: true },
      ] },
      { name: 'links', label: '협력 단체 배너', widget: 'list', itemLabel: '단체', fields: [
        { name: 'title', label: '이름', widget: 'string', required: true },
        { name: 'image', label: '로고 이미지', widget: 'image', required: true },
        { name: 'href', label: '주소', widget: 'string', required: true },
      ] },
    ],
    body: 'none', sortBy: 'title', schema: siteSchema,
  },
];

export const GROUPS: CollectionGroup[] = ['게시판', '시리즈 · 이야기', '페이지', '사이트 설정'];
export const getCollection = (key: string | undefined) => COLLECTIONS.find((c) => c.key === key);

/** 파일 경로가 이 컬렉션에 속하는지 (다른 파일을 건드리지 못하게) */
export function ownsPath(col: Collection, path: string): boolean {
  if (col.kind === 'json') return path === col.file;
  if (!col.folder || !path.startsWith(col.folder + '/') || !path.endsWith('.md')) return false;
  const rest = path.slice(col.folder.length + 1);
  return col.rootOnly ? !rest.includes('/') : true;
}
/** 파일 경로 → 사이트 주소 */
export function urlForPath(col: Collection, path: string): string | null {
  if (col.kind === 'json' || !col.folder) return null;
  const slug = path.slice(col.folder.length + 1).replace(/\.md$/, '');
  return `${col.urlPrefix ?? ''}/${slug}`;
}
