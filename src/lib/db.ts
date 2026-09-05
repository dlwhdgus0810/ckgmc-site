/**
 * D1(SQLite) 접근 도우미. 바인딩 이름 DB 는 wrangler.jsonc 에 정의되어 있습니다.
 * 모든 쿼리는 자리표시자(?)를 쓰고 값은 bind 로 넘깁니다.
 */
import { env } from 'cloudflare:workers';

type Param = string | number | null | boolean | undefined;
const clean = (params: Param[]) => params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? (p ? 1 : 0) : p));

/** 한 행 (없으면 null) */
export async function one<T = Record<string, unknown>>(sql: string, ...params: Param[]): Promise<T | null> {
  return (await env.DB.prepare(sql).bind(...clean(params)).first<T>()) ?? null;
}
/** 여러 행 */
export async function all<T = Record<string, unknown>>(sql: string, ...params: Param[]): Promise<T[]> {
  const r = await env.DB.prepare(sql).bind(...clean(params)).all<T>();
  return r.results;
}
/** INSERT / UPDATE / DELETE. meta.last_row_id 로 새 id 를 얻습니다 */
export async function run(sql: string, ...params: Param[]): Promise<D1Result> {
  return env.DB.prepare(sql).bind(...clean(params)).run();
}
/** 여러 문장을 한 번에 (원자적) */
export async function batch(statements: Array<{ sql: string; params?: Param[] }>): Promise<D1Result[]> {
  return env.DB.batch(statements.map((s) => env.DB.prepare(s.sql).bind(...clean(s.params ?? []))));
}

/** 2026-09-05T21:03:11Z 형식의 현재 시각 (DB 의 created_at 과 같은 형식) */
export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
