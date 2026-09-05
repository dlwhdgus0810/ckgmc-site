/**
 * 메뉴 섹션 정의. 각 섹션의 하위 항목은 src/content/pages/<섹션>/ 안의 페이지에서 자동으로 만들어집니다
 * (프런트매터 `order` 로 순서, `menuTitle` 로 표시 이름, `hideFromNav: true` 로 숨김).
 * 실제 메뉴 목록을 얻으려면 src/lib/nav.ts 의 getNav() 를 사용하세요.
 */
export interface NavItem {
  label: string;
  href: string;
}
export interface NavSection {
  /** URL 첫 번째 경로이자 src/content/pages/ 아래 폴더 이름. 예: /about/... → 'about' */
  key: string;
  /** 한국어 이름 */
  label: string;
  /** 영문 이름 */
  labelEn: string;
  /** 하위 메뉴 없이 바로 이동하는 링크일 때 */
  href?: string;
  /** getNav() 가 채움 */
  items?: NavItem[];
}

export const sections: NavSection[] = [
  { key: 'about', label: '교회 소개', labelEn: 'About Us' },
  { key: 'media', label: '미디어', labelEn: 'Media' },
  { key: 'ministries', label: '사역', labelEn: 'Ministries' },
  { key: 'next-steps', label: '양육과 훈련', labelEn: 'Next Steps' },
  { key: 'missions', label: '섬김과 선교', labelEn: 'Missions' },
  { key: 'offering', label: '온라인헌금', labelEn: 'Online Offering', href: '/offering' },
];

/** 헤더 오른쪽 강조 링크 */
export const headerCtas: NavItem[] = [
  { label: '처음 오셨나요?', href: '/welcome' },
  { label: '온라인헌금', href: '/offering' },
];

/** 푸터 바로가기 */
export const footerQuickLinks: NavItem[] = [
  { label: '처음 오셨나요?', href: '/welcome' },
  { label: '예배 안내', href: '/about/services' },
  { label: '찾아오시는 길', href: '/about/directions' },
  { label: '주보', href: '/media/bulletins' },
  { label: '영상 설교', href: '/media/sermons' },
  { label: '교인등록', href: '/next-steps/membership' },
];

/** 푸터 "교인 전용" 링크 (로그인 필요) */
export const footerMemberLinks: NavItem[] = [
  { label: 'D그룹 리더 보고서', href: '/members/cell-report' },
  { label: '일대일 양육보고서', href: '/members/care-report' },
  { label: '로그인 · 마이페이지', href: '/members' },
];

/** 푸터 하단 정책 링크 */
export const footerNav: NavItem[] = [
  { label: '개인정보활용 및 보호정책', href: '/privacy-policy' },
  { label: '이용 약관', href: '/terms-of-use' },
];
