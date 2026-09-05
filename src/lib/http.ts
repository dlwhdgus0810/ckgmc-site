/**
 * 서버 렌더링 페이지 공용: 폼 값 읽기, 같은 출처 검사, 한 번 보여주는 알림(flash), 날짜 표시, 페이지 나누기
 */
import type { AstroCookies } from 'astro';

// ── 폼 값 ─────────────────────────────────────────────────────────────
export function formStr(fd: FormData, key: string, max = 4000): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
export function formInt(fd: FormData, key: string): number | null {
  const s = formStr(fd, key, 20);
  if (!/^-?\d+$/.test(s)) return null;
  return Number(s);
}
export function formList(fd: FormData, key: string, max = 200): string[] {
  return fd.getAll(key).map((v) => (typeof v === 'string' ? v.trim().slice(0, max) : ''));
}
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── 같은 출처 검사 (폼 POST 의 CSRF 방지) ────────────────────────────
export function sameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('origin');
  if (origin) return origin === url.origin;
  const referer = request.headers.get('referer');
  if (referer) {
    try { return new URL(referer).origin === url.origin; } catch { return false; }
  }
  return false;
}

// ── 알림 (다음 요청에서 한 번 표시) ───────────────────────────────────
export type FlashType = 'success' | 'danger' | 'warning' | 'info';
export interface Flash { type: FlashType; text: string }
const FLASH_COOKIE = 'ck_flash';
export function setFlash(cookies: AstroCookies, type: FlashType, text: string): void {
  cookies.set(FLASH_COOKIE, JSON.stringify({ type, text }), { path: '/', httpOnly: true, sameSite: 'lax', secure: import.meta.env.PROD, maxAge: 60 });
}
export function takeFlash(cookies: AstroCookies): Flash | null {
  const raw = cookies.get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  cookies.delete(FLASH_COOKIE, { path: '/' });
  try {
    const f = JSON.parse(raw);
    if (f && typeof f.text === 'string' && ['success', 'danger', 'warning', 'info'].includes(f.type)) return f as Flash;
  } catch { /* 무시 */ }
  return null;
}

// ── 로그인 뒤 돌아갈 주소 (같은 사이트 안의 경로만 허용) ────────────────
export function safeNext(next: string | null | undefined, fallback = '/members'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return next;
}

// ── 날짜 표시 ─────────────────────────────────────────────────────────
const TZ = 'America/Chicago';
/** DB 의 UTC 시각(2026-09-05T21:03:11Z) → 캔자스 현지 "2026-09-05 16:03" */
export function formatLocal(iso: string | null | undefined, withTime = true): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  return withTime ? `${date} ${get('hour')}:${get('minute')}` : date;
}
/** 오늘 날짜 (캔자스 기준) YYYY-MM-DD — 폼 기본값용 */
export function todayLocal(): string {
  return formatLocal(new Date().toISOString(), false);
}
/** 2026-09-05 → 2026년 9월 5일 (토) */
export function koreanDate(ymd: string): string {
  if (!DATE_RE.test(ymd)) return ymd;
  const d = new Date(ymd + 'T00:00:00Z');
  const day = ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${day})`;
}

// ── 페이지 나누기 ──────────────────────────────────────────────────────
export interface Paging { page: number; perPage: number; total: number; pages: number; offset: number }
export function paging(pageParam: string | null, total: number, perPage = 20): Paging {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(pages, Math.max(1, Number(pageParam) || 1));
  return { page, perPage, total, pages, offset: (page - 1) * perPage };
}
/** 현재 검색 조건을 유지하면서 page 만 바꾼 주소 */
export function pageHref(url: URL, page: number): string {
  const u = new URL(url);
  u.searchParams.set('page', String(page));
  return u.pathname + u.search;
}
