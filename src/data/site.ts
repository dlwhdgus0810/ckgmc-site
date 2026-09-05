/**
 * 사이트 전역 설정 — 실제 값은 site.json 에 있습니다 (관리 화면(CMS)에서도 편집 가능).
 * 이 파일은 JSON 을 검증하고, 자주 쓰는 파생값을 만들어 내보냅니다.
 * 필드를 추가하려면 site.json 과 아래 스키마를 함께 고치세요.
 */
import { z } from 'astro/zod';
import raw from './site.json';

const link = z.object({ label: z.string().min(1), href: z.string().min(1) });

const schema = z.object({
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
  quickLinks: z.array(z.object({ title: z.string(), subtitle: z.string(), icon: z.string(), href: z.string() })),
  /** 협력 단체 배너 */
  links: z.array(z.object({ title: z.string(), image: z.string(), href: z.string() })),
});

export type SiteConfig = z.infer<typeof schema>;

const parsed = schema.safeParse(raw);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => ` - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
  throw new Error(`src/data/site.json 설정에 오류가 있습니다:\n${issues}`);
}

export const site: SiteConfig = parsed.data;
export const quickLinks = site.quickLinks;
export const links = site.links;
/** @deprecated 과도기 별칭 — notices 를 사용하세요 */
export const slides = site.notices;

/** 전화 링크 (tel:) */
export const telHref = 'tel:' + site.phone.replace(/[^+\d]/g, '');
/** 구글 지도 길찾기 링크 */
export const mapsDirectionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(site.mapQuery);
/** 구글 지도 임베드 (주소 검색형) */
export const mapEmbedUrl = 'https://www.google.com/maps?q=' + encodeURIComponent(site.mapQuery) + '&output=embed';
/** 교인등록 구글폼을 새 창에서 열 때 쓰는 주소 */
export const membershipFormUrl = site.membershipFormEmbed.replace(/[?&]embedded=true/, '');
/** 유튜브 라이브 주소 */
export const liveUrl = site.liveUrl ?? site.social.youtube.replace(/\/$/, '') + '/live';
