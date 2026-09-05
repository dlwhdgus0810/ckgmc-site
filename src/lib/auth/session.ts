/**
 * 로그인 세션. 브라우저 쿠키에는 무작위 토큰만 두고, DB(sessions) 에는 토큰의 SHA-256 을 저장합니다.
 * ck_auth 쿠키는 값이 없는 "로그인 표시" 로, 정적 헤더가 로그인/마이페이지 링크를 바꾸는 데만 씁니다.
 */
import type { AstroCookies } from 'astro';
import { all, one, run, nowIso } from '../db';

export const SESSION_COOKIE = 'ck_session';
export const AUTH_FLAG_COOKIE = 'ck_auth';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

export type Role = 'admin' | 'member';
export type Status = 'pending' | 'active' | 'disabled';
export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  status: Status;
  avatar_url: string | null;
}

export const ROLE_LABEL: Record<Role, string> = { admin: '관리자', member: '교인' };
export const STATUS_LABEL: Record<Status, string> = { pending: '승인 대기', active: '활성', disabled: '비활성' };

export const isAdmin = (u: SessionUser | null | undefined): boolean => !!u && u.role === 'admin' && u.status === 'active';
export const isActive = (u: SessionUser | null | undefined): boolean => !!u && u.status === 'active';

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const cookieBase = { path: '/', sameSite: 'lax' as const, secure: import.meta.env.PROD };

/** 로그인 처리: 세션 행 생성 + 쿠키 발급 */
export async function createSession(cookies: AstroCookies, userId: number, userAgent?: string | null): Promise<void> {
  const token = randomToken();
  const expires = new Date(Date.now() + TTL_MS);
  await run(
    'INSERT INTO sessions (id, user_id, expires_at, user_agent) VALUES (?, ?, ?, ?)',
    await sha256Hex(token), userId, expires.toISOString(), userAgent?.slice(0, 200) ?? null,
  );
  // 만료된 세션은 이때 정리
  await run('DELETE FROM sessions WHERE expires_at < ?', nowIso());
  await run('UPDATE users SET last_login_at = ? WHERE id = ?', nowIso(), userId);
  cookies.set(SESSION_COOKIE, token, { ...cookieBase, httpOnly: true, expires });
  cookies.set(AUTH_FLAG_COOKIE, '1', { ...cookieBase, httpOnly: false, expires });
}

/** 쿠키의 세션이 유효하면 사용자 정보 */
export async function getSessionUser(cookies: AstroCookies): Promise<SessionUser | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await one<SessionUser>(
    `SELECT u.id, u.email, u.name, u.role, u.status, u.avatar_url
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > ?`,
    await sha256Hex(token), nowIso(),
  );
  if (!row || row.status === 'disabled') return null;
  return row;
}

/** 로그아웃: 이 세션만 삭제 */
export async function destroySession(cookies: AstroCookies): Promise<void> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await run('DELETE FROM sessions WHERE id = ?', await sha256Hex(token));
  cookies.delete(SESSION_COOKIE, { path: '/' });
  cookies.delete(AUTH_FLAG_COOKIE, { path: '/' });
}

/** 비밀번호 변경·계정 비활성화 때: 그 사용자의 모든 세션 종료 */
export async function destroyUserSessions(userId: number): Promise<void> {
  await run('DELETE FROM sessions WHERE user_id = ?', userId);
}

export async function countSessions(userId: number): Promise<number> {
  const rows = await all<{ n: number }>('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND expires_at > ?', userId, nowIso());
  return rows[0]?.n ?? 0;
}
