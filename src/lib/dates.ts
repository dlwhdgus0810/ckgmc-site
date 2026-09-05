/**
 * 날짜 처리 규칙: 프런트매터의 `2026-08-29T22:50` 같은 시간대 없는 값은 "벽시계 시각"으로 보고
 * UTC 로 저장·표시합니다. 그래서 내 컴퓨터에서 빌드하든 Cloudflare(UTC)에서 빌드하든 같은 시각이 나옵니다.
 */
const NAIVE = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::(\d{2}))?)?$/;

/** 시간대 표기가 없는 문자열이면 UTC 로 해석해 Date 로 바꿉니다 (zod preprocess 용) */
export function parseWallClock(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const m = NAIVE.exec(value.trim());
  if (!m) return value;
  const [, date, hm = '00:00', ss = '00'] = m;
  return new Date(`${date}T${hm}:${ss}Z`);
}

const pad = (n: number) => String(n).padStart(2, '0');
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** 2026-08-29 */
export function formatDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
/** 2026-08-29 22:50 */
export function formatDateTime(d: Date): string {
  return `${formatDate(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
/** 2026년 8월 29일 */
export function formatKoreanDate(d: Date): string {
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}
/** Saturday 29 August 2026 */
export function formatLongDate(d: Date): string {
  return `${DAYS[d.getUTCDay()]} ${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
/** 24 April 2026 */
export function formatStoryDate(d: Date): string {
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
/** <time datetime="..."> 용 ISO 문자열 (분 단위) */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 16);
}
/** 30일 이내 글이면 NEW 배지 (빌드 시점 기준) */
export function isNew(d: Date, now = new Date()): boolean {
  return now.getTime() - d.getTime() < 30 * 24 * 3600 * 1000;
}
