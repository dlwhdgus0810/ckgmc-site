/**
 * src/data/site.json 의 스키마. site.ts(빌드 시 검증)와 관리 화면(저장 전 검증)이 함께 씁니다.
 */
import { z } from 'astro/zod';

const link = z.object({ label: z.string().min(1), href: z.string().min(1) });

export const siteSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().min(1),
  description: z.string().min(1),
  address: z.string().min(1),
  /** 구글 지도 검색어(주소). 지도 임베드·길찾기 링크에 사용 */
  mapQuery: z.string().min(1),
  phone: z.string().min(1),
  email: z.email(),
  logo: z.string().min(1),
  ogImage: z.string().min(1),
  social: z.object({ facebook: z.url(), youtube: z.url(), instagram: z.url() }),
  /** `npm run import:youtube` 가 새 영상을 가져올 채널 ID */
  youtubeChannelId: z.string().min(1),
  /** 유튜브 라이브 주소 (없으면 채널 주소 + /live) */
  liveUrl: z.url().optional(),
  giving: z.object({ url: z.url(), embed: z.url() }),
  membershipFormEmbed: z.url(),
  newFamilyFormUrl: z.url(),
  /** 문의/세례 신청 폼 전송 주소 (FormSubmit·Formspree). 비우면 이메일 링크로 대체 */
  formEndpoint: z.string(),
  formThanksPath: z.string().min(1),
  /** 메인 첫 화면 */
  hero: z.object({
    image: z.string().min(1),
    alt: z.string().min(1, '히어로 사진의 대체 텍스트(alt)는 비울 수 없습니다'),
    eyebrow: z.string(),
    headline: z.string().min(1),
    subline: z.string(),
    primary: link,
    secondary: link,
  }),
  /** 예배 시간 (메인 정보 띠·푸터·처음 오셨나요 페이지) */
  serviceTimes: z.array(z.object({ name: z.string().min(1), time: z.string().min(1), place: z.string(), note: z.string().optional() })),
  /** 교회 소식 포스터 (구 메인 슬라이드). 권장 1600×500 */
  notices: z.array(z.object({
    image: z.string().min(1),
    alt: z.string().min(1, '포스터의 대체 텍스트(alt)는 비울 수 없습니다'),
    title: z.string().optional(),
    href: z.string().optional(),
  })),
  /** 다가오는 일정 (메인에 날짜가 지나지 않은 것 3개까지 표시) */
  events: z.array(z.object({
    title: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식').optional(),
    time: z.string().optional(),
    place: z.string().optional(),
    href: z.string().optional(),
    description: z.string().optional(),
  })).default([]),
  /** 이번 주 말씀 (정보 띠 아래 한 구절) */
  verse: z.object({ text: z.string().min(1), ref: z.string().min(1) }).optional(),
  quickLinks: z.array(z.object({ title: z.string(), subtitle: z.string(), icon: z.string(), href: z.string() })),
  /** 협력 단체 배너 */
  links: z.array(z.object({ title: z.string(), image: z.string(), href: z.string() })),
});

export type SiteConfig = z.infer<typeof siteSchema>;
