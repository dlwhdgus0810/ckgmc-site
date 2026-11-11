/**
 * 색이 있는 이모티콘풍 아이콘 — 직접 그린 SVG (24×24 기준). <Emoji name="wave" /> 로 씁니다.
 * 버튼과 구역 제목이 옅은 색이라, 눈에 띄는 포인트는 이 아이콘이 맡습니다.
 * 색은 사이트 색감(남색·하늘색·금색)에 산호색·민트색을 더한 여섯 가지만 씁니다.
 * 새 아이콘을 그릴 때: 흰 바탕과 옅은 남색 바탕(버튼) 양쪽에서 보이도록, 밝은 면에는 옅은 테두리를 두릅니다.
 */
const Y = '#ffca4d'; // 노랑
const YD = '#f2a43a';
const N = '#223e7e'; // 남색
const S = '#6ea4f4'; // 하늘
const SD = '#4a86e0';
const C = '#f0705a'; // 산호
const CD = '#d9543f';
const M = '#3dbb85'; // 민트
const MD = '#2a9a6a';
const W = '#ffffff';
const K = '#fbefd3'; // 크림 (건물·종이)
const EDGE = '#6f8fd0'; // 밝은 면의 테두리

export const EMOJI = {
  /** 손 흔들기 — 환영, 처음 오신 분 */
  wave: `<g transform="rotate(-16 12 13)"><rect x="6.6" y="4.4" width="2.8" height="9" rx="1.4" fill="${Y}"/><rect x="9.5" y="3.1" width="2.8" height="10" rx="1.4" fill="${Y}"/><rect x="12.4" y="3.6" width="2.8" height="9.6" rx="1.4" fill="${Y}"/><rect x="15.3" y="5.4" width="2.6" height="8" rx="1.3" fill="${Y}"/><path d="M6.6 11.5h11.3v4.2a5.3 5.3 0 0 1-5.3 5.3h-.7a5.3 5.3 0 0 1-5.3-5.3z" fill="${Y}"/><rect x="2.4" y="11.7" width="7.2" height="3" rx="1.5" transform="rotate(38 6 13.2)" fill="${YD}"/></g><path d="M19.4 3.2c1.3.8 2.1 2 2.4 3.5M2.6 16.8c.3 1.5 1.2 2.7 2.5 3.4" fill="none" stroke="${S}" stroke-width="1.6" stroke-linecap="round"/>`,
  /** 교회 — 예배 안내 */
  church: `<rect x="3.6" y="14" width="16.8" height="7.5" fill="${K}"/><path d="M2.4 14.4 5.8 11h12.4l3.4 3.4z" fill="${C}"/><rect x="8.6" y="8.6" width="6.8" height="12.9" fill="#fff8e6"/><path d="M7.4 9.2 12 4.6l4.6 4.6z" fill="${CD}"/><path d="M12 1.3v3.4M10.6 2.6h2.8" stroke="${YD}" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="12.2" r="1.5" fill="${S}"/><path d="M10.3 21.5v-3.4a1.7 1.7 0 0 1 3.4 0v3.4z" fill="${N}"/><rect x="5.1" y="16.2" width="1.9" height="3.1" rx=".95" fill="${S}"/><rect x="17" y="16.2" width="1.9" height="3.1" rx=".95" fill="${S}"/>`,
  /** 펼친 책 — 설교, 말씀 */
  book: `<rect x="2" y="5.2" width="20" height="14.6" rx="2.2" fill="${N}"/><path d="M12 7.4C10.2 6.2 7.5 5.8 4 6v11.4c3.5-.2 6.2.2 8 1.4z" fill="${K}"/><path d="M12 7.4c1.8-1.2 4.5-1.6 8-1.4v11.4c-3.5-.2-6.2.2-8 1.4z" fill="${W}"/><path d="M5.9 9.6c1.6 0 3 .2 4.2.7M5.9 12.3c1.6 0 3 .2 4.2.7" stroke="#d9c285" stroke-width="1.1" stroke-linecap="round" fill="none"/><path d="M15.5 6v5.3l1.4-1.1 1.4 1.1V6z" fill="${C}"/>`,
  /** 재생 — 영상, YouTube Live */
  play: `<circle cx="12" cy="12" r="10" fill="${C}"/><path d="M10 8v8l6.6-4z" fill="${W}"/>`,
  /** 달력 — 이번 주, 일정 */
  calendar: `<rect x="3" y="4.6" width="18" height="16.6" rx="3" fill="${W}" stroke="${EDGE}" stroke-width="1.4"/><path d="M3 7.6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2.4H3z" fill="${C}"/><rect x="7" y="2.4" width="1.9" height="4.2" rx=".95" fill="${N}"/><rect x="15.1" y="2.4" width="1.9" height="4.2" rx=".95" fill="${N}"/><circle cx="8" cy="13.6" r="1.25" fill="${N}"/><circle cx="12" cy="13.6" r="1.25" fill="${N}"/><circle cx="16" cy="13.6" r="1.25" fill="${YD}"/><circle cx="8" cy="17.4" r="1.25" fill="${N}"/><circle cx="12" cy="17.4" r="1.25" fill="${N}"/>`,
  /** 확성기 — 교회 소식 */
  megaphone: `<path d="M6 14.4h3.2l.9 4.8a1 1 0 0 1-1 1.2H8a1 1 0 0 1-1-.800z" fill="${N}"/><path d="M4 9.4h4.4v5.2H4A1.4 1.4 0 0 1 2.6 13.2v-2.4A1.4 1.4 0 0 1 4 9.4z" fill="${CD}"/><path d="M8.4 9.4 17 5v14l-8.6-4.4z" fill="${C}"/><path d="M19.6 9c1 .8 1.5 1.8 1.5 3s-.5 2.2-1.5 3" stroke="${YD}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`,
  /** 하트 — 헌금, 섬김 */
  heart: `<path d="M12 20.8c-.3 0-.6-.1-.800-.300C6.5 16.5 3 13.4 3 9.5 3 6.7 5.2 4.5 8 4.5c1.6 0 3 .7 4 1.9 1-1.2 2.4-1.9 4-1.9 2.8 0 5 2.2 5 5 0 3.9-3.5 7-8.2 11-.200.2-.500.3-.800.3z" fill="${C}"/><path d="M7.7 7.2c-1.3.300-2.2 1.3-2.3 2.6" stroke="#ffc9bd" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
  /** 사람들 — 사역, 공동체 */
  people: `<circle cx="6" cy="9.4" r="2.7" fill="${S}"/><path d="M1.4 20v-.800a4.6 4.6 0 0 1 9.2 0v.800z" fill="${S}"/><circle cx="18" cy="9.4" r="2.7" fill="${Y}"/><path d="M13.4 20v-.800a4.6 4.6 0 0 1 9.2 0v.800z" fill="${Y}"/><circle cx="12" cy="8" r="3.3" fill="${N}" stroke="${W}" stroke-width="1.2"/><path d="M6.2 21v-.600a5.8 5.8 0 0 1 11.6 0v.600z" fill="${N}" stroke="${W}" stroke-width="1.2" stroke-linejoin="round"/>`,
  /** 지구 — 선교 */
  globe: `<circle cx="12" cy="12" r="9.7" fill="${S}"/><path d="M7.4 4.9c1.7-.5 3.3 0 4 1.2.6 1.1-.3 2-1.5 2.4-1.3.5-1.2 1.5-.3 2.4 1 1 .6 2.5-.900 2.8-1.6.3-2.9-.800-3.6-2.3-1-2.3-.2-5.5 2.3-6.5zM14.4 11c1.3-.600 3.1-.400 4.3.600.9.800.8 2.3.1 3.6-.800 1.5-2.1 2.8-3.3 2.8-1 0-1.3-1.2-1.1-2.3.2-1.3-.9-1.9-1.1-2.9-.2-.8.3-1.5 1.1-1.8z" fill="${M}"/>`,
  /** 새싹 — 양육, 훈련 */
  sprout: `<path d="M12 21v-8.4" stroke="${MD}" stroke-width="2.2" stroke-linecap="round"/><path d="M12 13.6c0-4.3-2.7-6.9-7.6-7.1-.2 4.7 2.5 7.5 7.6 7.1z" fill="${M}"/><path d="M12 11.3c0-3.7 2.5-6.1 7-6.3.2 4.2-2.3 6.7-7 6.3z" fill="#74d6a8"/><path d="M6.4 21.2h11.2" stroke="#c9a15f" stroke-width="2.2" stroke-linecap="round"/>`,
  /** 위치 핀 — 오시는 길 */
  pin: `<path d="M12 22.4s7.2-6.5 7.2-12.3a7.2 7.2 0 1 0-14.4 0c0 5.8 7.2 12.3 7.2 12.3z" fill="${C}"/><circle cx="12" cy="10" r="2.8" fill="${W}"/>`,
  /** 시계 — 예배 시간 */
  clock: `<circle cx="12" cy="12" r="9.8" fill="${S}"/><circle cx="12" cy="12" r="7.6" fill="${W}"/><path d="M12 7.4V12l3.1 1.9" stroke="${N}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="12" cy="12" r="1.15" fill="${C}"/>`,
  /** 문서 — 주보, PDF */
  doc: `<path d="M6.2 2.8h7.6l5 5v11.8a1.6 1.6 0 0 1-1.6 1.6h-11a1.6 1.6 0 0 1-1.6-1.6V4.4a1.6 1.6 0 0 1 1.6-1.6z" fill="${W}" stroke="${EDGE}" stroke-width="1.4" stroke-linejoin="round"/><path d="M13.8 2.8v3.4a1.6 1.6 0 0 0 1.6 1.6h3.4z" fill="${S}"/><rect x="7.4" y="10.8" width="9.2" height="1.7" rx=".85" fill="${C}"/><rect x="7.4" y="14.1" width="9.2" height="1.6" rx=".8" fill="#b8c5de"/><rect x="7.4" y="17.2" width="5.6" height="1.6" rx=".8" fill="#b8c5de"/>`,
  /** 종이비행기 — 보내기 */
  send: `<path d="M21.8 2.4 2.2 10.2l7 2.8 2.6 7.2z" fill="${S}"/><path d="M9.2 13 21.8 2.4l-10 17.8z" fill="${SD}"/>`,
  /** 카메라 — 사진 이야기 */
  camera: `<path d="M8.2 5.6 9.5 3.6h5l1.3 2H19a2.4 2.4 0 0 1 2.4 2.4v9.6A2.4 2.4 0 0 1 19 20H5a2.4 2.4 0 0 1-2.4-2.4V8A2.4 2.4 0 0 1 5 5.6z" fill="${N}"/><circle cx="12" cy="12.7" r="4.5" fill="${W}"/><circle cx="12" cy="12.7" r="2.9" fill="${S}"/><circle cx="18.2" cy="8.5" r="1.05" fill="${Y}"/>`,
  /** 음표 — 찬양 */
  music: `<path d="M8.2 17.4V6.2l10.8-2.4v11" stroke="${N}" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="M8.2 6.2 19 3.8v3.2L8.2 9.4z" fill="${YD}"/><ellipse cx="5.9" cy="17.8" rx="3" ry="2.4" fill="${N}"/><ellipse cx="16.7" cy="15.2" rx="3" ry="2.4" fill="${N}"/>`,
  /** 반짝임 — 오늘의 말씀 */
  sparkle: `<path d="M11 2.8l2 5.8 5.8 2-5.8 2-2 5.8-2-5.8-5.8-2 5.8-2z" fill="${Y}"/><path d="M18.4 14.2l1 2.9 2.9 1-2.9 1-1 2.9-1-2.9-2.9-1 2.9-1z" fill="${YD}"/><circle cx="19" cy="5" r="1.4" fill="${S}"/>`,
  /** 집 — 홈으로 */
  home: `<path d="M5 10.8h14V20a1.2 1.2 0 0 1-1.2 1.2H6.2A1.2 1.2 0 0 1 5 20z" fill="${K}"/><path d="M1.8 12 12 3l10.2 9-1.6 1.6L12 6 3.4 13.6z" fill="${C}"/><path d="M10.2 21.2v-4.8a1.8 1.8 0 0 1 3.6 0v4.8z" fill="${N}"/>`,
  /** 연필 — 등록, 신청 */
  pencil: `<path d="M3.6 20.4l1.1-4.6L15.4 5.1l3.5 3.5L8.2 19.3z" fill="${Y}"/><path d="M15.4 5.1l1.8-1.8a1.7 1.7 0 0 1 2.4 0l1.1 1.1a1.7 1.7 0 0 1 0 2.4l-1.8 1.8z" fill="${C}"/><path d="M3.6 20.4l1.1-4.6 3.5 3.5z" fill="${N}"/>`,
} as const;

export type EmojiName = keyof typeof EMOJI;
