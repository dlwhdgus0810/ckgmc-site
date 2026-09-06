/**
 * 콘텐츠 저장소 — 관리 화면(/manage/content)이 글·파일을 읽고 쓰는 곳.
 *  - 배포: GitHubStore — GitHub 저장소에 커밋 (GITHUB_TOKEN). 커밋되면 GitHub Actions 가 빌드·배포.
 *  - 개발: LocalStore  — scripts/dev-content-server.mjs 를 통해 이 폴더의 파일에 직접 저장 (CONTENT_LOCAL_URL).
 */
import { env } from 'cloudflare:workers';

export interface DirEntry { name: string; path: string; type: 'file' | 'dir' }
export interface FileData { base64: string; sha: string }
export interface Author { name: string; email: string }
export interface ChangeSet { put: { path: string; base64: string }[]; delete: string[] }

export interface ContentStore {
  readonly label: string;
  readFile(path: string): Promise<FileData | null>;
  list(dir: string): Promise<DirEntry[]>;
  /** 여러 파일을 한 번(한 커밋)에 반영 */
  commit(changes: ChangeSet, message: string, author: Author): Promise<{ sha: string }>;
}

export class ContentStoreError extends Error {}

// ── base64 도우미 ─────────────────────────────────────────────────────
const enc = new TextEncoder();
const dec = new TextDecoder();
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export const utf8ToBase64 = (s: string) => bytesToBase64(enc.encode(s));
export const base64ToUtf8 = (b64: string) => dec.decode(base64ToBytes(b64));

// ── GitHub ────────────────────────────────────────────────────────────
class GitHubStore implements ContentStore {
  constructor(private token: string, private repo: string, private branch: string) {}
  get label() { return `GitHub ${this.repo} (${this.branch})`; }

  private headers() {
    return {
      authorization: `Bearer ${this.token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'ckgmc-site-content-manager',
      'content-type': 'application/json',
    };
  }
  private encodePath(p: string) { return p.split('/').map(encodeURIComponent).join('/'); }
  private async api<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
    const res = await fetch(`https://api.github.com${path}`, { method, headers: this.headers(), body: body === undefined ? undefined : JSON.stringify(body) });
    if (res.status === 404 && method === 'GET') return { status: 404, data: null as T };
    if (!res.ok) {
      const text = await res.text();
      throw new ContentStoreError(`GitHub API 오류 ${res.status} (${method} ${path}): ${text.slice(0, 300)}`);
    }
    return { status: res.status, data: (await res.json()) as T };
  }

  async readFile(path: string): Promise<FileData | null> {
    const r = await this.api<{ type: string; content?: string; encoding?: string; sha: string }>(
      'GET', `/repos/${this.repo}/contents/${this.encodePath(path)}?ref=${encodeURIComponent(this.branch)}`);
    if (r.status === 404 || !r.data || r.data.type !== 'file') return null;
    if (r.data.content && r.data.encoding === 'base64') return { base64: r.data.content.replace(/\n/g, ''), sha: r.data.sha };
    // 1MB 를 넘는 파일은 blob API 로
    const blob = await this.api<{ content: string }>('GET', `/repos/${this.repo}/git/blobs/${r.data.sha}`);
    return { base64: blob.data.content.replace(/\n/g, ''), sha: r.data.sha };
  }

  async list(dir: string): Promise<DirEntry[]> {
    const r = await this.api<Array<{ name: string; path: string; type: string }>>(
      'GET', `/repos/${this.repo}/contents/${this.encodePath(dir)}?ref=${encodeURIComponent(this.branch)}`);
    if (r.status === 404 || !Array.isArray(r.data)) return [];
    return r.data.map((e) => ({ name: e.name, path: e.path, type: e.type === 'dir' ? 'dir' : 'file' }));
  }

  async commit(changes: ChangeSet, message: string, author: Author): Promise<{ sha: string }> {
    const R = `/repos/${this.repo}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      const ref = await this.api<{ object: { sha: string } }>('GET', `${R}/git/ref/heads/${encodeURIComponent(this.branch)}`);
      if (!ref.data) throw new ContentStoreError(`브랜치 ${this.branch} 를 찾을 수 없습니다.`);
      const head = ref.data.object.sha;
      const base = await this.api<{ tree: { sha: string } }>('GET', `${R}/git/commits/${head}`);
      const tree: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string | null }> = [];
      for (const put of changes.put) {
        const blob = await this.api<{ sha: string }>('POST', `${R}/git/blobs`, { content: put.base64, encoding: 'base64' });
        tree.push({ path: put.path, mode: '100644', type: 'blob', sha: blob.data.sha });
      }
      for (const del of changes.delete) tree.push({ path: del, mode: '100644', type: 'blob', sha: null });
      const newTree = await this.api<{ sha: string }>('POST', `${R}/git/trees`, { base_tree: base.data.tree.sha, tree });
      const commit = await this.api<{ sha: string }>('POST', `${R}/git/commits`, {
        message, tree: newTree.data.sha, parents: [head],
        author: { name: author.name, email: author.email, date: new Date().toISOString() },
      });
      const res = await fetch(`https://api.github.com${R}/git/refs/heads/${encodeURIComponent(this.branch)}`, {
        method: 'PATCH', headers: this.headers(), body: JSON.stringify({ sha: commit.data.sha, force: false }),
      });
      if (res.ok) return { sha: commit.data.sha };
      if (res.status !== 422 && res.status !== 409) throw new ContentStoreError(`커밋 반영 실패 ${res.status}: ${(await res.text()).slice(0, 300)}`);
      // 그 사이 다른 커밋이 들어옴 → 최신 상태에서 한 번 더
    }
    throw new ContentStoreError('저장소가 동시에 바뀌어 저장하지 못했습니다. 다시 시도해 주세요.');
  }
}

// ── 로컬 개발 ─────────────────────────────────────────────────────────
class LocalStore implements ContentStore {
  constructor(private base: string) {}
  readonly label = '로컬 폴더 (개발용 — npm run dev:content)';
  private async call<T>(path: string, init?: RequestInit): Promise<{ status: number; data: T }> {
    let res: Response;
    try { res = await fetch(`${this.base}${path}`, init); } catch {
      throw new ContentStoreError('로컬 콘텐츠 서버에 연결할 수 없습니다. 다른 터미널에서 `npm run dev:content` 를 실행해 주세요.');
    }
    if (res.status === 404) return { status: 404, data: null as T };
    if (!res.ok) throw new ContentStoreError(`로컬 콘텐츠 서버 오류 ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return { status: 200, data: (await res.json()) as T };
  }
  async readFile(path: string) { const r = await this.call<FileData>(`/file?path=${encodeURIComponent(path)}`); return r.status === 404 ? null : r.data; }
  async list(dir: string) { const r = await this.call<DirEntry[]>(`/list?path=${encodeURIComponent(dir)}`); return r.data ?? []; }
  async commit(changes: ChangeSet, message: string, author: Author) {
    const r = await this.call<{ sha: string }>('/commit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...changes, message, author }) });
    return r.data;
  }
}

// ── 선택 ──────────────────────────────────────────────────────────────
function vars(): Record<string, string | undefined> { return env as unknown as Record<string, string | undefined>; }

/** 설정된 저장소. 없으면 ContentStoreError */
export function getStore(): ContentStore {
  const v = vars();
  if (import.meta.env.DEV && v.CONTENT_LOCAL_URL) return new LocalStore(v.CONTENT_LOCAL_URL);
  if (v.GITHUB_TOKEN) return new GitHubStore(v.GITHUB_TOKEN, v.GITHUB_REPO || 'dlwhdgus0810/ckgmc-site', v.GITHUB_BRANCH || 'main');
  throw new ContentStoreError('GITHUB_TOKEN 이 설정되지 않아 콘텐츠를 저장할 수 없습니다. Cloudflare 대시보드 → ckgmc-site → Settings → Variables 에 추가하세요.');
}
export function storeStatus(): { ok: true; label: string } | { ok: false; reason: string } {
  try { return { ok: true, label: getStore().label }; } catch (e) { return { ok: false, reason: e instanceof Error ? e.message : String(e) }; }
}
