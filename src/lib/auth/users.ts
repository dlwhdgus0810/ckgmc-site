/**
 * 사용자 조회·생성·권한. 새 소셜 계정은 '승인 대기(pending)' 로 만들어지고 관리자가 승인합니다.
 * ADMIN_EMAILS 에 있는 이메일은 어떤 방법으로 로그인해도 곧바로 관리자(활성)가 됩니다.
 */
import { all, one, run, nowIso } from '../db';
import { isAdminEmail } from '../env';
import type { OAuthProfile } from './oauth';
import type { Role, Status } from './session';

export interface UserRow {
  id: number;
  email: string;
  name: string;
  role: Role;
  status: Status;
  password_hash: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
}
export interface UserListRow extends UserRow {
  providers: string | null;   // "google,facebook"
  cell_count: number;
  care_count: number;
}

const COLS = 'id, email, name, role, status, password_hash, avatar_url, created_at, last_login_at';

export const findUserByEmail = (email: string) => one<UserRow>(`SELECT ${COLS} FROM users WHERE email = ?`, email.trim().toLowerCase());
export const findUserById = (id: number) => one<UserRow>(`SELECT ${COLS} FROM users WHERE id = ?`, id);

/** ADMIN_EMAILS 에 해당하면 관리자·활성으로 승격 */
export async function applyAdminBootstrap(user: UserRow): Promise<UserRow> {
  if (isAdminEmail(user.email) && (user.role !== 'admin' || user.status !== 'active')) {
    await run(`UPDATE users SET role = 'admin', status = 'active' WHERE id = ?`, user.id);
    return { ...user, role: 'admin', status: 'active' };
  }
  return user;
}

export async function createUser(input: { email: string; name: string; role?: Role; status?: Status; passwordHash?: string | null; avatarUrl?: string | null }): Promise<UserRow> {
  const email = input.email.trim().toLowerCase();
  const admin = isAdminEmail(email);
  const res = await run(
    'INSERT INTO users (email, name, role, status, password_hash, avatar_url) VALUES (?, ?, ?, ?, ?, ?)',
    email, input.name.trim() || email.split('@')[0],
    admin ? 'admin' : input.role ?? 'member',
    admin ? 'active' : input.status ?? 'pending',
    input.passwordHash ?? null, input.avatarUrl ?? null,
  );
  const user = await findUserById(Number(res.meta.last_row_id));
  if (!user) throw new Error('사용자를 만들지 못했습니다.');
  return user;
}

/** 소셜 로그인 프로필 → 기존 계정 연결 또는 새 계정 */
export async function upsertFromProfile(p: OAuthProfile): Promise<UserRow> {
  const linked = await one<{ user_id: number }>('SELECT user_id FROM user_identities WHERE provider = ? AND provider_user_id = ?', p.provider, p.providerUserId);
  let user = linked ? await findUserById(linked.user_id) : null;

  if (!user) {
    // 같은 이메일의 계정(관리자가 미리 만들어 둔 계정 등)이 있으면 연결
    const byEmail = p.emailVerified ? await findUserByEmail(p.email) : null;
    user = byEmail ?? (await createUser({ email: p.email, name: p.name, avatarUrl: p.avatarUrl }));
    await run('INSERT OR IGNORE INTO user_identities (provider, provider_user_id, user_id) VALUES (?, ?, ?)', p.provider, p.providerUserId, user.id);
  }
  if (!user.avatar_url && p.avatarUrl) {
    await run('UPDATE users SET avatar_url = ? WHERE id = ?', p.avatarUrl, user.id);
    user = { ...user, avatar_url: p.avatarUrl };
  }
  return applyAdminBootstrap(user);
}

// ── 비밀번호 로그인 실패 제한 ──────────────────────────────────────────
const MAX_FAILURES = 5;
const WINDOW_MIN = 15;
export async function tooManyFailures(email: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const row = await one<{ n: number }>('SELECT COUNT(*) AS n FROM login_attempts WHERE email = ? AND created_at > ?', email, since);
  return (row?.n ?? 0) >= MAX_FAILURES;
}
export async function recordLoginFailure(email: string, ip: string | null): Promise<void> {
  await run('INSERT INTO login_attempts (email, ip) VALUES (?, ?)', email, ip);
  // 오래된 기록 정리
  const old = new Date(Date.now() - 24 * 3600_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  await run('DELETE FROM login_attempts WHERE created_at < ?', old);
}
export const clearLoginFailures = (email: string) => run('DELETE FROM login_attempts WHERE email = ?', email);

// ── 관리자용 목록·수정 ─────────────────────────────────────────────────
export interface UserFilter { q?: string; status?: Status | ''; }
function userWhere(f: UserFilter): { where: string; params: (string | number)[] } {
  const conds: string[] = [];
  const params: (string | number)[] = [];
  if (f.q) { conds.push('(u.name LIKE ? OR u.email LIKE ?)'); params.push(`%${f.q}%`, `%${f.q}%`); }
  if (f.status) { conds.push('u.status = ?'); params.push(f.status); }
  return { where: conds.length ? 'WHERE ' + conds.join(' AND ') : '', params };
}
export async function countUsers(f: UserFilter): Promise<number> {
  const { where, params } = userWhere(f);
  return (await one<{ n: number }>(`SELECT COUNT(*) AS n FROM users u ${where}`, ...params))?.n ?? 0;
}
export async function listUsers(f: UserFilter, limit: number, offset: number): Promise<UserListRow[]> {
  const { where, params } = userWhere(f);
  return all<UserListRow>(
    `SELECT u.${COLS.split(', ').join(', u.')},
            (SELECT group_concat(provider, ',') FROM user_identities i WHERE i.user_id = u.id) AS providers,
            (SELECT COUNT(*) FROM cell_reports r WHERE r.user_id = u.id) AS cell_count,
            (SELECT COUNT(*) FROM care_reports r WHERE r.user_id = u.id) AS care_count
       FROM users u ${where}
      ORDER BY CASE u.status WHEN 'pending' THEN 0 ELSE 1 END, u.created_at DESC
      LIMIT ? OFFSET ?`,
    ...params, limit, offset,
  );
}
export async function getUserDetail(id: number): Promise<UserListRow | null> {
  const rows = await all<UserListRow>(
    `SELECT u.${COLS.split(', ').join(', u.')},
            (SELECT group_concat(provider, ',') FROM user_identities i WHERE i.user_id = u.id) AS providers,
            (SELECT COUNT(*) FROM cell_reports r WHERE r.user_id = u.id) AS cell_count,
            (SELECT COUNT(*) FROM care_reports r WHERE r.user_id = u.id) AS care_count
       FROM users u WHERE u.id = ?`, id);
  return rows[0] ?? null;
}
export const countPendingUsers = async () => (await one<{ n: number }>(`SELECT COUNT(*) AS n FROM users WHERE status = 'pending'`))?.n ?? 0;
export const listPendingUsers = (limit = 10) => all<UserRow>(`SELECT ${COLS} FROM users WHERE status = 'pending' ORDER BY created_at DESC LIMIT ?`, limit);

export async function updateUser(id: number, fields: { name?: string; role?: Role; status?: Status; password_hash?: string | null }): Promise<void> {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    sets.push(`${k} = ?`);
    params.push(v);
  }
  if (!sets.length) return;
  await run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, ...params, id);
}
/** 보고서가 없는 사용자만 완전히 삭제할 수 있습니다 (있으면 비활성화하세요) */
export async function deleteUser(id: number): Promise<boolean> {
  const u = await getUserDetail(id);
  if (!u || u.cell_count > 0 || u.care_count > 0) return false;
  await run('DELETE FROM report_comments WHERE user_id = ?', id);
  await run('DELETE FROM users WHERE id = ?', id);
  return true;
}
export const touchLogin = (id: number) => run('UPDATE users SET last_login_at = ? WHERE id = ?', nowIso(), id);
