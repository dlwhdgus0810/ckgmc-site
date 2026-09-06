#!/usr/bin/env node
/**
 * 개발용 콘텐츠 저장 서버. 관리 화면(/manage/content)이 GitHub 대신 이 서버로 저장하면
 * 이 폴더의 파일이 바로 바뀌고 astro dev 가 즉시 반영합니다 (커밋은 직접).
 *
 *   npm run dev:content      (기본 http://127.0.0.1:8788)
 *   .dev.vars 에 CONTENT_LOCAL_URL=http://127.0.0.1:8788 이 있어야 관리 화면이 이 서버를 씁니다.
 */
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8788);
const ALLOWED = ['src/content/', 'src/data/site.json', 'public/files/', 'public/images/'];

const safe = (rel) => {
  const clean = String(rel ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!ALLOWED.some((p) => clean === p || clean.startsWith(p))) throw new Error(`허용되지 않은 경로: ${clean}`);
  const abs = path.resolve(ROOT, clean);
  if (!abs.startsWith(ROOT + path.sep)) throw new Error('경로 오류');
  return { abs, clean };
};
const blobSha = (buf) => createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
const json = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && url.pathname === '/file') {
      const { abs } = safe(url.searchParams.get('path'));
      let buf;
      try { buf = await readFile(abs); } catch { return json(res, 404, { error: 'not found' }); }
      return json(res, 200, { base64: buf.toString('base64'), sha: blobSha(buf) });
    }
    if (req.method === 'GET' && url.pathname === '/list') {
      const { abs, clean } = safe(url.searchParams.get('path') + '/');
      let names = [];
      try { names = await readdir(abs); } catch { return json(res, 200, []); }
      const entries = [];
      for (const name of names) {
        if (name.startsWith('.')) continue;
        const st = await stat(path.join(abs, name));
        entries.push({ name, path: clean.replace(/\/$/, '') + '/' + name, type: st.isDirectory() ? 'dir' : 'file' });
      }
      return json(res, 200, entries);
    }
    if (req.method === 'POST' && url.pathname === '/commit') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      for (const put of body.put ?? []) {
        const { abs, clean } = safe(put.path);
        await mkdir(path.dirname(abs), { recursive: true });
        await writeFile(abs, Buffer.from(put.base64, 'base64'));
        console.log('  write ', clean);
      }
      for (const del of body.delete ?? []) {
        const { abs, clean } = safe(del);
        await rm(abs, { force: true });
        console.log('  delete', clean);
      }
      console.log(`[commit] ${body.message ?? ''}`);
      return json(res, 200, { sha: 'local-' + Date.now().toString(36) });
    }
    json(res, 404, { error: 'unknown endpoint' });
  } catch (e) {
    json(res, 400, { error: String(e.message ?? e) });
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`콘텐츠 저장 서버: http://127.0.0.1:${PORT}  (파일을 ${ROOT} 에 직접 씁니다)`);
});
