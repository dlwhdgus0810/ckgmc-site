/**
 * 사이트 전역 설정 — 실제 값은 site.json 에 있습니다 (관리 화면(CMS)에서도 편집 가능).
 * 이 파일은 JSON 을 검증하고, 자주 쓰는 파생값을 만들어 내보냅니다.
 * 필드를 추가하려면 site.json 과 아래 스키마를 함께 고치세요.
 */
import raw from './site.json';
import { siteSchema, type SiteConfig } from './site.schema';
export type { SiteConfig };

const parsed = siteSchema.safeParse(raw);
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
