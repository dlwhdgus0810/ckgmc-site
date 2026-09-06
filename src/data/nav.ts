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
  /** 섹션 목록 페이지(/about, /ministries …)의 배너 사진 */
  headerImage?: string;
  /** 섹션 목록 페이지의 검색엔진용 설명 */
  description?: string;
}

// 온라인헌금은 여기(주 메뉴)에 넣지 않습니다 — 아래 headerCtas 의 금색 버튼과 푸터·모바일 메뉴에 이미 있어
// 두 번 나오면 넓은 화면에서 헤더가 가로로 넘칩니다.
export const sections: NavSection[] = [
  { key: 'about', label: '교회 소개', labelEn: 'About Us', headerImage: '/images/headers/about.jpg', description: '캔사스중앙글로벌감리교회의 사명, 역사, 리더십, 섬기는 이들, 예배 안내와 찾아오시는 길' },
  { key: 'media', label: '미디어', labelEn: 'Media', headerImage: '/images/headers/media.jpeg', description: '설교 시리즈, 영상 설교, 특별 집회, 성가대 찬양, 주보와 자료실' },
  { key: 'ministries', label: '사역', labelEn: 'Ministries', headerImage: '/images/headers/ministries-camping.jpeg', description: '유아·어린이부부터 청소년·청년·남녀선교회·성가대·헤세드 워십·English Ministry 까지 교회의 모든 사역' },
  { key: 'next-steps', label: '양육과 훈련', labelEn: 'Next Steps', headerImage: '/images/headers/next-steps-discipleship.jpeg', description: '제자훈련, 예수동행일기, 교인등록, 세례, 새가족환영회, 말씀 묵상, 교회 섬김' },
  { key: 'missions', label: '섬김과 선교', labelEn: 'Missions', headerImage: '/images/headers/missions-oversea.jpeg', description: '국내 선교, 해외선교, 지역 사회 섬김과 선교지 소식' },
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
