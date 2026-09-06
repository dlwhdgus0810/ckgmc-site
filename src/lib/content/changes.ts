/**
 * 배포된 콘텐츠 목록(빌드 시 만든 /content-index.json)과 관리 화면에서 방금 바꾼 것(D1 content_changes)을 합칩니다.
 */
import { env } from 'cloudflare:workers';
import { all, one, run } from '../db';

export interface IndexEntry { collection: string; path: string; title: string; date?: string; order?: number; note?: string }
export interface ContentIndex { sha: string; builtAt: string; entries: IndexEntry[] }
export interface ContentChange { id: number; collection: string; path: string; title: string; action: 'create' | 'update' | 'delete' | 'upload'; user_id: number | null; user_name: string | null; commit_sha: string | null; created_at: string }

/** 빌드에 포함된 목록. 정적 파일이라 ASSETS 바인딩으로 바로 읽습니다 */
export async function loadIndex(requestUrl: URL): Promise<ContentIndex | null> {
  const url = new URL('/content-index.json', requestUrl).toString();
  try {
    // 배포본: 정적 파일(ASSETS 바인딩)에서 바로. 개발 서버에는 정적 파일이 없으므로 일반 요청으로 대체
    const assets = (env as unknown as { ASSETS?: Fetcher }).ASSETS;
    let res = assets ? await assets.fetch(url).catch(() => null) : null;
    if (!res || !res.ok) res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as ContentIndex;
  } catch {
    return null;
  }
}

export const recordChange = (c: { collection: string; path: string; title: string; action: ContentChange['action']; userId: number; commitSha: string }) =>
  run('INSERT INTO content_changes (collection, path, title, action, user_id, commit_sha) VALUES (?, ?, ?, ?, ?, ?)', c.collection, c.path, c.title, c.action, c.userId, c.commitSha);

/** 빌드 이후에 생긴 변경 (아직 사이트에 반영되지 않았을 수 있음) */
export const changesSince = (since: string | null | undefined, collection?: string) => all<ContentChange>(
  `SELECT c.*, u.name AS user_name FROM content_changes c LEFT JOIN users u ON u.id = c.user_id
    WHERE c.created_at > ? ${collection ? 'AND c.collection = ?' : ''} ORDER BY c.created_at`,
  since ?? '', ...(collection ? [collection] : []));

export const recentChanges = (limit = 10) => all<ContentChange>(
  `SELECT c.*, u.name AS user_name FROM content_changes c LEFT JOIN users u ON u.id = c.user_id ORDER BY c.created_at DESC LIMIT ?`, limit);

export const latestChange = () => one<ContentChange>(`SELECT c.*, u.name AS user_name FROM content_changes c LEFT JOIN users u ON u.id = c.user_id ORDER BY c.created_at DESC LIMIT 1`);

/** 목록에 보여줄 항목: 빌드 목록 + 빌드 이후 변경을 반영 */
export function mergeEntries(indexEntries: IndexEntry[], pending: ContentChange[]): Array<IndexEntry & { pending?: 'create' | 'update' | 'delete' }> {
  const map = new Map<string, IndexEntry & { pending?: 'create' | 'update' | 'delete' }>();
  for (const e of indexEntries) map.set(e.path, { ...e });
  for (const c of pending) {
    if (c.action === 'upload') continue;
    if (c.action === 'delete') { map.delete(c.path); continue; }
    const prev = map.get(c.path);
    map.set(c.path, { collection: c.collection, path: c.path, title: c.title || prev?.title || c.path, date: prev?.date ?? c.created_at, order: prev?.order, pending: prev && c.action === 'update' ? 'update' : c.action });
  }
  return [...map.values()];
}

/** 배포 상태 문구 */
export function deployState(index: ContentIndex | null, latest: ContentChange | null): { tone: 'success' | 'warning' | 'secondary'; text: string } {
  if (!index) return { tone: 'secondary', text: '배포된 빌드 정보를 읽을 수 없습니다.' };
  if (!latest) return { tone: 'success', text: '변경 사항이 없습니다.' };
  if (latest.created_at <= index.builtAt) return { tone: 'success', text: '마지막 저장 내용까지 모두 사이트에 반영되었습니다.' };
  const minutes = Math.max(0, Math.round((Date.now() - new Date(latest.created_at).getTime()) / 60000));
  if (minutes > 15) return { tone: 'warning', text: `${minutes}분 전 저장한 내용이 아직 반영되지 않았습니다. GitHub Actions 배포가 실패했을 수 있으니 저장소 Actions 탭을 확인해 주세요.` };
  return { tone: 'warning', text: '저장한 내용을 배포하는 중입니다 (보통 2~3분).' };
}
