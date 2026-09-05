/**
 * D그룹 · D그룹 리더 보고서 · 일대일 양육보고서 · 답글 · 통계 쿼리
 */
import { all, one, run } from './db';

// ── 선택지 (원본 사이트와 같게) ─────────────────────────────────────────
export const DEPARTMENTS = ['장년/청장년', '청년'] as const;
export const CURRICULA = ['풍성한 삶으로의 초대(4주)', '풍성한 삶의 첫걸음(10주)'] as const;
export const MAX_WEEK = 10;
export const SCORES = Array.from({ length: 11 }, (_, i) => i); // 0~10

// ── D그룹 ──────────────────────────────────────────────────────────────
export interface Group {
  id: number; name: string; leaders: string; age: string; meeting_time: string; focus: string; description: string;
  sort_order: number; is_active: number; created_at: string;
  report_count?: number; last_report?: string | null;
}
export type GroupInput = Pick<Group, 'name' | 'leaders' | 'age' | 'meeting_time' | 'focus' | 'description' | 'sort_order' | 'is_active'>;

export const listGroups = (activeOnly = false) => all<Group>(
  `SELECT g.*, (SELECT COUNT(*) FROM cell_reports r WHERE r.group_id = g.id) AS report_count,
          (SELECT MAX(meeting_date) FROM cell_reports r WHERE r.group_id = g.id) AS last_report
     FROM groups g ${activeOnly ? 'WHERE g.is_active = 1' : ''}
    ORDER BY g.is_active DESC, g.sort_order, g.name`);
export const getGroup = (id: number) => one<Group>(
  `SELECT g.*, (SELECT COUNT(*) FROM cell_reports r WHERE r.group_id = g.id) AS report_count FROM groups g WHERE g.id = ?`, id);
export async function createGroup(g: GroupInput): Promise<number> {
  const r = await run('INSERT INTO groups (name, leaders, age, meeting_time, focus, description, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    g.name, g.leaders, g.age, g.meeting_time, g.focus, g.description, g.sort_order, g.is_active);
  return Number(r.meta.last_row_id);
}
export const updateGroup = (id: number, g: GroupInput) => run(
  'UPDATE groups SET name = ?, leaders = ?, age = ?, meeting_time = ?, focus = ?, description = ?, sort_order = ?, is_active = ? WHERE id = ?',
  g.name, g.leaders, g.age, g.meeting_time, g.focus, g.description, g.sort_order, g.is_active, id);
/** 보고서가 없는 그룹만 삭제 가능 */
export async function deleteGroup(id: number): Promise<boolean> {
  const g = await getGroup(id);
  if (!g || (g.report_count ?? 0) > 0) return false;
  await run('DELETE FROM groups WHERE id = ?', id);
  return true;
}

// ── D그룹 리더 보고서 ──────────────────────────────────────────────────
export interface Absentee { name: string; reason: string }
export interface CellReport {
  id: number; group_id: number; user_id: number; meeting_date: string; attendance: number;
  absentees: string; newcomers: string; mood_score: number | null; prep_score: number | null;
  reflection: string; visits: string; visit_requests: string; created_at: string;
  group_name: string; reporter_name: string; reporter_email: string; comment_count: number;
}
export type CellReportInput = Omit<CellReport, 'id' | 'created_at' | 'group_name' | 'reporter_name' | 'reporter_email' | 'comment_count'>;

export function parseAbsentees(json: string): Absentee[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((a) => a && typeof a.name === 'string').map((a) => ({ name: String(a.name), reason: String(a.reason ?? '') })) : [];
  } catch { return []; }
}

const CELL_SELECT = `SELECT r.*, g.name AS group_name, u.name AS reporter_name, u.email AS reporter_email,
       (SELECT COUNT(*) FROM report_comments c WHERE c.report_type = 'cell' AND c.report_id = r.id) AS comment_count
  FROM cell_reports r JOIN groups g ON g.id = r.group_id JOIN users u ON u.id = r.user_id`;

export async function createCellReport(d: CellReportInput): Promise<number> {
  const r = await run(
    `INSERT INTO cell_reports (group_id, user_id, meeting_date, attendance, absentees, newcomers, mood_score, prep_score, reflection, visits, visit_requests)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    d.group_id, d.user_id, d.meeting_date, d.attendance, d.absentees, d.newcomers, d.mood_score, d.prep_score, d.reflection, d.visits, d.visit_requests);
  return Number(r.meta.last_row_id);
}
export const getCellReport = (id: number) => one<CellReport>(`${CELL_SELECT} WHERE r.id = ?`, id);
export const deleteCellReport = async (id: number) => {
  await run(`DELETE FROM report_comments WHERE report_type = 'cell' AND report_id = ?`, id);
  await run('DELETE FROM cell_reports WHERE id = ?', id);
};

export interface CellFilter { groupId?: number | null; from?: string; to?: string; userId?: number }
function cellWhere(f: CellFilter) {
  const conds: string[] = []; const params: (string | number)[] = [];
  if (f.groupId) { conds.push('r.group_id = ?'); params.push(f.groupId); }
  if (f.from) { conds.push('r.meeting_date >= ?'); params.push(f.from); }
  if (f.to) { conds.push('r.meeting_date <= ?'); params.push(f.to); }
  if (f.userId) { conds.push('r.user_id = ?'); params.push(f.userId); }
  return { where: conds.length ? 'WHERE ' + conds.join(' AND ') : '', params };
}
export async function countCellReports(f: CellFilter): Promise<number> {
  const { where, params } = cellWhere(f);
  return (await one<{ n: number }>(`SELECT COUNT(*) AS n FROM cell_reports r ${where}`, ...params))?.n ?? 0;
}
export async function listCellReports(f: CellFilter, limit: number, offset = 0): Promise<CellReport[]> {
  const { where, params } = cellWhere(f);
  return all<CellReport>(`${CELL_SELECT} ${where} ORDER BY r.meeting_date DESC, r.id DESC LIMIT ? OFFSET ?`, ...params, limit, offset);
}

// ── 일대일 양육보고서 ──────────────────────────────────────────────────
export interface CareReport {
  id: number; user_id: number; department: string; barnabas_name: string; disciple_name: string; care_date: string;
  week: number; curriculum: string; attended_last_sunday: number | null; response: string; prayer: string; notes: string; created_at: string;
  reporter_name: string; reporter_email: string; comment_count: number;
}
export type CareReportInput = Omit<CareReport, 'id' | 'created_at' | 'reporter_name' | 'reporter_email' | 'comment_count'>;

const CARE_SELECT = `SELECT r.*, u.name AS reporter_name, u.email AS reporter_email,
       (SELECT COUNT(*) FROM report_comments c WHERE c.report_type = 'care' AND c.report_id = r.id) AS comment_count
  FROM care_reports r JOIN users u ON u.id = r.user_id`;

export async function createCareReport(d: CareReportInput): Promise<number> {
  const r = await run(
    `INSERT INTO care_reports (user_id, department, barnabas_name, disciple_name, care_date, week, curriculum, attended_last_sunday, response, prayer, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    d.user_id, d.department, d.barnabas_name, d.disciple_name, d.care_date, d.week, d.curriculum, d.attended_last_sunday, d.response, d.prayer, d.notes);
  return Number(r.meta.last_row_id);
}
export const getCareReport = (id: number) => one<CareReport>(`${CARE_SELECT} WHERE r.id = ?`, id);
export const deleteCareReport = async (id: number) => {
  await run(`DELETE FROM report_comments WHERE report_type = 'care' AND report_id = ?`, id);
  await run('DELETE FROM care_reports WHERE id = ?', id);
};

export interface CareFilter { department?: string; from?: string; to?: string; userId?: number }
function careWhere(f: CareFilter) {
  const conds: string[] = []; const params: (string | number)[] = [];
  if (f.department) { conds.push('r.department = ?'); params.push(f.department); }
  if (f.from) { conds.push('r.care_date >= ?'); params.push(f.from); }
  if (f.to) { conds.push('r.care_date <= ?'); params.push(f.to); }
  if (f.userId) { conds.push('r.user_id = ?'); params.push(f.userId); }
  return { where: conds.length ? 'WHERE ' + conds.join(' AND ') : '', params };
}
export async function countCareReports(f: CareFilter): Promise<number> {
  const { where, params } = careWhere(f);
  return (await one<{ n: number }>(`SELECT COUNT(*) AS n FROM care_reports r ${where}`, ...params))?.n ?? 0;
}
export async function listCareReports(f: CareFilter, limit: number, offset = 0): Promise<CareReport[]> {
  const { where, params } = careWhere(f);
  return all<CareReport>(`${CARE_SELECT} ${where} ORDER BY r.care_date DESC, r.id DESC LIMIT ? OFFSET ?`, ...params, limit, offset);
}

// ── 답글 ──────────────────────────────────────────────────────────────
export type ReportType = 'cell' | 'care';
export interface Comment { id: number; report_type: ReportType; report_id: number; user_id: number; body: string; created_at: string; author_name: string; author_role: string }
export const listComments = (type: ReportType, reportId: number) => all<Comment>(
  `SELECT c.*, u.name AS author_name, u.role AS author_role FROM report_comments c JOIN users u ON u.id = c.user_id
    WHERE c.report_type = ? AND c.report_id = ? ORDER BY c.created_at, c.id`, type, reportId);
export const addComment = (type: ReportType, reportId: number, userId: number, body: string) =>
  run('INSERT INTO report_comments (report_type, report_id, user_id, body) VALUES (?, ?, ?, ?)', type, reportId, userId, body);
export const deleteComment = (id: number) => run('DELETE FROM report_comments WHERE id = ?', id);

// ── 대시보드 · 통계 ─────────────────────────────────────────────────────
export interface Counts { cellTotal: number; cellMonth: number; careTotal: number; careMonth: number; groups: number; activeUsers: number; pendingUsers: number }
export async function dashboardCounts(monthPrefix: string): Promise<Counts> {
  const q = async (sql: string, ...p: (string | number)[]) => (await one<{ n: number }>(sql, ...p))?.n ?? 0;
  return {
    cellTotal: await q('SELECT COUNT(*) AS n FROM cell_reports'),
    cellMonth: await q('SELECT COUNT(*) AS n FROM cell_reports WHERE meeting_date LIKE ?', monthPrefix + '%'),
    careTotal: await q('SELECT COUNT(*) AS n FROM care_reports'),
    careMonth: await q('SELECT COUNT(*) AS n FROM care_reports WHERE care_date LIKE ?', monthPrefix + '%'),
    groups: await q('SELECT COUNT(*) AS n FROM groups WHERE is_active = 1'),
    activeUsers: await q(`SELECT COUNT(*) AS n FROM users WHERE status = 'active'`),
    pendingUsers: await q(`SELECT COUNT(*) AS n FROM users WHERE status = 'pending'`),
  };
}

export interface GroupYearStat { group_id: number; group_name: string; reports: number; avg_attendance: number; total_absent: number; last_date: string | null }
export const groupYearStats = (year: string) => all<GroupYearStat>(
  `SELECT g.id AS group_id, g.name AS group_name, COUNT(r.id) AS reports,
          COALESCE(ROUND(AVG(r.attendance), 1), 0) AS avg_attendance,
          COALESCE(SUM(json_array_length(r.absentees)), 0) AS total_absent,
          MAX(r.meeting_date) AS last_date
     FROM groups g LEFT JOIN cell_reports r ON r.group_id = g.id AND r.meeting_date LIKE ?
    GROUP BY g.id ORDER BY g.is_active DESC, g.sort_order, g.name`, year + '%');

export interface MonthCell { group_id: number; ym: string; reports: number; avg_attendance: number }
export const monthlyStats = (year: string) => all<MonthCell>(
  `SELECT group_id, substr(meeting_date, 1, 7) AS ym, COUNT(*) AS reports, ROUND(AVG(attendance), 1) AS avg_attendance
     FROM cell_reports WHERE meeting_date LIKE ? GROUP BY group_id, ym`, year + '%');

export const reportYears = async (): Promise<string[]> =>
  (await all<{ y: string }>('SELECT DISTINCT substr(meeting_date, 1, 4) AS y FROM cell_reports ORDER BY y DESC')).map((r) => r.y);
