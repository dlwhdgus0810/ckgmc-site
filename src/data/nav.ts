/**
 * 사이트 메뉴 구조 — 상단 메뉴, 서브페이지 사이드 메뉴, 브레드크럼이 모두 이 파일을 사용합니다.
 * 페이지를 추가/삭제할 때는 src/content/pages/ 의 마크다운 파일과 함께 이 목록도 수정하세요.
 */
export interface NavItem {
  label: string;
  href: string;
}
export interface NavSection {
  /** URL 첫 번째 경로와 같아야 합니다. 예: /about/... → 'about' */
  key: string;
  label: string;
  /** 하위 메뉴가 없는 단일 링크일 때 */
  href?: string;
  items?: NavItem[];
}

export const nav: NavSection[] = [
  {
    key: 'about',
    label: '교회 소개 About us',
    items: [
      { label: '우리 교회의 사명 Our Purpose', href: '/about/purpose' },
      { label: '우리 교회의 이야기 Our Story', href: '/about/story' },
      { label: '리더십 Our Leadership', href: '/about/leadership' },
      { label: '섬기는 이들 Our Pastors & Staff', href: '/about/staff' },
      { label: '예배 안내 Our Services', href: '/about/services' },
      { label: '찾아오시는 길 Way to us', href: '/about/directions' },
      { label: '연락처 Contact us', href: '/about/contact' },
    ],
  },
  {
    key: 'media',
    label: '미디어 MEDIA',
    items: [
      { label: '설교 시리즈 Series sermons', href: '/media/series' },
      { label: '영상 설교', href: '/media/sermons' },
      { label: '특별 집회 Special services', href: '/media/special-services' },
      { label: '성가대 찬양 Choir', href: '/media/choir' },
      { label: '주보 Weekly', href: '/media/bulletins' },
      { label: '자료실 Resources', href: '/media/resources' },
    ],
  },
  {
    key: 'ministries',
    label: '사역 MINISTRIES',
    items: [
      { label: '유아 어린이부 Toddler & Children Ministry', href: '/ministries/children' },
      { label: '청소년부 X-Youth', href: '/ministries/youth' },
      { label: '청년부 Young Adult', href: '/ministries/young-adult' },
      { label: '남선교회 (믿음으로 사는 남자들) Men Living by Faith', href: '/ministries/men' },
      { label: '여선교회 Women Ministry', href: '/ministries/women' },
      { label: '성가대 Choir Ministry', href: '/ministries/choir' },
      { label: '헤세드 워십 Hesed Ministry', href: '/ministries/hesed' },
      { label: '캠핑 미니스트리 Camping Ministry', href: '/ministries/camping' },
      { label: 'English Ministry', href: '/ministries/english' },
    ],
  },
  {
    key: 'next-steps',
    label: '양육과 훈련 NEXT STEPS',
    items: [
      { label: '제자훈련 과정 안내 Discipleship Process', href: '/next-steps/discipleship' },
      { label: '예수동행일기 Journal with Jesus', href: '/next-steps/journal' },
      { label: '교인등록 Membership Registration', href: '/next-steps/membership' },
      { label: '세례식 Baptism', href: '/next-steps/baptism' },
      { label: '새가족환영회 Newcomers Reception', href: '/next-steps/newcomers' },
      { label: '말씀 묵상 (Quiet Time)', href: '/next-steps/quiet-time' },
      { label: '교회 섬김 Serving the Church', href: '/next-steps/serving' },
    ],
  },
  {
    key: 'missions',
    label: '섬김과 선교 Missions',
    items: [
      { label: '국내선교 Domestic Mission', href: '/missions/domestic' },
      { label: '해외선교 Oversea Mission', href: '/missions/oversea' },
      { label: '지역 사회 섬김 Serving the Community', href: '/missions/community' },
      { label: '선교지소식 Mission Stories', href: '/missions/stories' },
    ],
  },
  { key: 'offering', label: '온라인헌금 Online Offering', href: '/offering' },
];

/** 푸터 메뉴 */
export const footerNav: NavItem[] = [
  { label: '개인정보활용 및 보호정책', href: '/privacy-policy' },
  { label: '이용 약관', href: '/terms-of-use' },
];

/** URL 경로로 해당 섹션을 찾습니다. 예: '/about/staff' → about 섹션 */
export function findSection(pathname: string): NavSection | undefined {
  const key = pathname.split('/').filter(Boolean)[0];
  return nav.find((s) => s.key === key && s.items);
}

/** URL 경로로 메뉴 항목을 찾습니다. */
export function findNavItem(pathname: string): { section: NavSection; item: NavItem } | undefined {
  const clean = pathname.replace(/\/$/, '') || '/';
  for (const section of nav) {
    for (const item of section.items ?? []) {
      if (item.href === clean) return { section, item };
    }
  }
  return undefined;
}
