/**
 * 관리 화면 폼 → 프런트매터 값 변환, 파일 업로드 준비, 파일 이름 만들기, 검증 메시지
 * 폼 필드 이름 규칙: 중첩은 점(hero.headline), 목록은 대괄호(episodes[0].title)
 */
import type { ZodError } from 'astro/zod';
import type { Field } from './collections';
import { bytesToBase64 } from './store';

export interface UploadCtx {
  /** 커밋에 함께 넣을 새 파일들 */
  puts: { path: string; base64: string }[];
  /** 업로드한 파일의 공개 경로 목록 (변경 기록용) */
  uploaded: string[];
  /** 공개 경로 → 원래 파일 이름 (첨부 표시 이름 기본값) */
  originalNames: Map<string, string>;
}
export const newUploadCtx = (): UploadCtx => ({ puts: [], uploaded: [], originalNames: new Map() });

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ── 이름·경로 ─────────────────────────────────────────────────────────
/** 제목 → 파일/주소용 슬러그 (한글 허용, 소문자, 공백은 -) */
export function slugify(title: string, max = 60): string {
  const s = title.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/g, '');
  return s || 'post';
}
/** 업로드 파일 이름 정리 (경로 문자 제거) */
export function sanitizeFilename(name: string): { base: string; ext: string } {
  const clean = name.normalize('NFC').split(/[\\/]/).pop() ?? 'file';
  const m = /^(.*?)(\.[A-Za-z0-9]{1,8})?$/.exec(clean) ?? [clean, clean, ''];
  const base = (m[1] ?? 'file').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 80) || 'file';
  return { base, ext: (m[2] ?? '').toLowerCase() };
}
const stamp = () => Date.now().toString(36).slice(-5);
/** 저장소 안 경로와 공개 URL */
export function uploadTarget(kind: 'image' | 'file', originalName: string, now = new Date()): { repoPath: string; publicPath: string } {
  const { base, ext } = sanitizeFilename(originalName);
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  if (kind === 'file') {
    const name = `${yyyy}${mm}${dd}-${base}-${stamp()}${ext}`;
    return { repoPath: `public/files/${name}`, publicPath: `/files/${name}` };
  }
  const name = `${base}-${stamp()}${ext}`;
  return { repoPath: `public/images/uploads/${yyyy}/${mm}/${name}`, publicPath: `/images/uploads/${yyyy}/${mm}/${name}` };
}
export const MAX_UPLOAD = 25 * 1024 * 1024; // 25MB
/** 올릴 수 있는 파일 종류 (실행 파일·HTML 등은 제외) */
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);
const FILE_EXT = new Set([...IMAGE_EXT, '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.hwp', '.hwpx', '.zip', '.txt', '.mp3', '.m4a', '.mp4']);

export async function stageUpload(ctx: UploadCtx, file: File, kind: 'image' | 'file'): Promise<string> {
  if (file.size > MAX_UPLOAD) throw new Error(`파일이 너무 큽니다 (${file.name}, 최대 25MB).`);
  const ext = sanitizeFilename(file.name).ext;
  if (!(kind === 'image' ? IMAGE_EXT : FILE_EXT).has(ext)) {
    throw new Error(`올릴 수 없는 파일 형식입니다 (${file.name}). 허용: ${[...(kind === 'image' ? IMAGE_EXT : FILE_EXT)].join(' ')}`);
  }
  const t = uploadTarget(kind, file.name);
  ctx.puts.push({ path: t.repoPath, base64: bytesToBase64(new Uint8Array(await file.arrayBuffer())) });
  ctx.uploaded.push(t.publicPath);
  ctx.originalNames.set(t.publicPath, file.name.normalize('NFC'));
  return t.publicPath;
}

/** 유튜브 주소/ID → ID */
export function youtubeId(input: string): string {
  const s = input.trim();
  if (!s) return '';
  const m = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{6,})/.exec(s);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{6,}$/.test(s) ? s : s;
}

// ── 폼 → 값 ──────────────────────────────────────────────────────────
const str = (fd: FormData, key: string, max = 20000) => { const v = fd.get(key); return typeof v === 'string' ? v.trim().slice(0, max) : ''; };
const isFile = (v: FormDataEntryValue | null): v is File => typeof v !== 'string' && v !== null && typeof (v as File).size === 'number';

export async function collectValues(fd: FormData, fields: Field[], prefix: string, ctx: UploadCtx): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const name = prefix + f.name;
    let value: unknown;
    switch (f.widget) {
      case 'string': case 'text': { const s = str(fd, name); value = s || undefined; break; }
      case 'youtube': { const s = youtubeId(str(fd, name, 500)); value = s || undefined; break; }
      case 'number': { const s = str(fd, name, 20); value = s === '' ? undefined : Number(s); if (Number.isNaN(value)) value = undefined; break; }
      case 'boolean': { const all = fd.getAll(name); value = all.length ? all[all.length - 1] === 'true' : undefined; break; }
      case 'datetime': { const s = str(fd, name, 30); value = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) ? s.slice(0, 16) : undefined; break; }
      case 'date': { const s = str(fd, name, 30); value = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined; break; }
      case 'select': { const s = str(fd, name, 100); value = f.options.some((o) => o.value === s) ? s : undefined; break; }
      case 'image': case 'file': {
        const up = fd.get(name);
        if (isFile(up) && up.size > 0 && up.name) value = await stageUpload(ctx, up, f.widget);
        else if (fd.get(name + '__remove') === '1') value = undefined;
        else value = str(fd, name + '__current', 500) || undefined;
        break;
      }
      case 'imagelist': {
        const kept = fd.getAll(name + '__current').filter((v): v is string => typeof v === 'string' && v.trim() !== '');
        const files = fd.getAll(name).filter((v) => isFile(v) && v.size > 0 && v.name) as File[];
        const added: string[] = [];
        for (const file of files) added.push(await stageUpload(ctx, file, 'image'));
        value = [...kept, ...added];
        break;
      }
      case 'object': value = await collectValues(fd, f.fields, name + '.', ctx); break;
      case 'list': {
        const re = new RegExp(`^${escapeRe(name)}\\[(\\d+)\\]\\.`);
        const indices = new Set<number>();
        for (const key of fd.keys()) { const m = re.exec(key); if (m) indices.add(Number(m[1])); }
        const rows: Record<string, unknown>[] = [];
        for (const i of [...indices].sort((a, b) => a - b)) {
          const row = await collectValues(fd, f.fields, `${name}[${i}].`, ctx);
          if (Object.values(row).some((v) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))) rows.push(row);
        }
        value = rows;
        break;
      }
    }
    if (value !== undefined) out[f.name] = value;
  }
  return out;
}

/** 첨부파일 표시 이름이 비어 있으면 올린 파일의 원래 이름(없으면 저장된 파일 이름)으로 */
export function fillAttachmentNames(values: Record<string, unknown>, ctx?: UploadCtx): void {
  const list = values.attachments;
  if (!Array.isArray(list)) return;
  for (const a of list as Record<string, unknown>[]) {
    if (a.name || typeof a.file !== 'string') continue;
    a.name = ctx?.originalNames.get(a.file) ?? decodeURIComponent(a.file.split('/').pop() ?? '').replace(/-[a-z0-9]{5}(\.[a-z0-9]+)$/, '$1').replace(/^\d{8}-/, '');
  }
}

export function zodMessages(err: ZodError): string[] {
  return err.issues.map((i) => `${i.path.join('.') || '(전체)'}: ${i.message}`);
}

/** 값에서 표시용 제목 */
export const titleOf = (values: Record<string, unknown>, fallback = '(제목 없음)') => (typeof values.title === 'string' && values.title) || fallback;
