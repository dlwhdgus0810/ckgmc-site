/**
 * 사이트 전역 설정
 * 교회 이름, 주소, 연락처, SNS 링크, 메인 슬라이드, 하단 배너 링크를 이 파일 한 곳에서 관리합니다.
 */
export const site = {
  name: '캔사스중앙글로벌감리교회',
  nameEn: 'Central Korean Global Methodist Church of Kansas',
  description: '캔사스중앙글로벌감리교회 Central Korean Global Methodist Church of Kansas',
  address: '9400 Nall Ave. Overland Park, KS 66207',
  email: 'mchrissong@gmail.com',
  phone: '+1 913-649-2488',
  /** 헤더에 표시되는 로고 이미지 (public/images/ 기준) */
  logo: '/images/logo.png',
  /** SNS 공유용 기본 이미지 */
  ogImage: '/images/og-default.jpg',
  social: {
    facebook: 'https://www.facebook.com/ckgmckc',
    youtube: 'https://youtube.com/@ckgmc',
    instagram: 'https://www.instagram.com/central_kgmc/',
  },
  /** YouTube 채널 ID — `npm run import:youtube` 로 최신 영상을 가져올 때 사용 */
  youtubeChannelId: 'UCpUFVi7PAUsJySVorgbadxQ',
  /** 온라인 헌금 (ChurchTrac) */
  giving: {
    url: 'https://ckgmc.churchtrac.com/give',
    embed: 'https://ckgmc.churchtrac.com/give/embed',
  },
  /** 교인등록 구글 폼 */
  membershipFormEmbed:
    'https://docs.google.com/forms/d/e/1FAIpQLSfucF16fd_sQuAYPZN6Mq2jLaiWbX-WjLg7MywkTFf5u6OcMA/viewform?embedded=true',
  newFamilyFormUrl: 'https://forms.gle/1YSckhKR3hkLQJv86',
  /**
   * 문의/세례 신청 폼 전송 주소.
   * 정적 사이트에는 서버가 없으므로 Formspree(https://formspree.io) 같은 무료 폼 서비스를 사용합니다.
   * 예: 'https://formspree.io/f/xxxxxxxx'  — 비워두면 이메일 링크(mailto)로 대체됩니다.
   */
  formEndpoint: '',
  /** 구글 지도 embed 주소 (찾아오시는 길) */
  mapEmbed:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3102.497794014454!2d-94.65218868426709!3d38.95829997956136!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x87c0ebe0ac4619c7%3A0x4cf299b35b41a697!2z7LqU7IKs7Iqk7ZWc7J247KSR7JWZ7Jew7ZWp6rCQ66as6rWQ7ZqMIENlbnRyYWwgS29yZWFuIFVuaXRlZCBNZXRob2Rpc3QgQ2h1cmNo!5e0!3m2!1sko!2skr!4v1527926670944',
};

/** 메인 화면 상단 슬라이드. 이미지는 1600x500 권장. 위에서부터 순서대로 표시됩니다. */
export const slides: { image: string; alt: string; href?: string }[] = [
  { image: '/images/slides/slide-1.jpg', alt: '청년부 수련회 9/6-7 Springfield, MO' },
  { image: '/images/slides/slide-2.jpg', alt: '' },
  { image: '/images/slides/slide-3.png', alt: '' },
  { image: '/images/slides/slide-4.png', alt: '' },
];

/** 메인 화면 상단 바로가기 4개 */
export const quickLinks = [
  { title: '교회 소개', subtitle: 'About Us', icon: '/images/icons/front-icon-1.png', href: '/about/purpose' },
  { title: '예배시간 안내', subtitle: 'Our Services', icon: '/images/icons/front-icon-2.png', href: '/about/services' },
  { title: '오시는 길', subtitle: 'Way to Us', icon: '/images/icons/front-icon-3.png', href: '/about/directions' },
  { title: '섬기는 이들', subtitle: 'Pastors & Staff', icon: '/images/icons/front-icon-4.png', href: '/about/staff' },
];

/** 메인 화면 하단 LINKS 배너 */
export const links = [
  { title: '위지엠 (예수동행일기)', image: '/images/links/journalwithjesus.jpeg', href: 'http://journalwithjesus.org/home' },
  { title: '캔사스 청년&청장년 연합집회', image: '/images/links/kansas-united.jpeg', href: 'https://www.facebook.com/%EC%BA%94%EC%82%AC%EC%8A%A4-%EC%B2%AD%EB%85%84%EC%B2%AD%EC%9E%A5%EB%85%84-%EC%97%B0%ED%95%A9%EC%A7%91%ED%9A%8C-741591112706959/' },
  { title: 'THE JOSHUA GENERATION', image: '/images/links/jgen.jpeg', href: 'http://www.j-gen.org/' },
];
