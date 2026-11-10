#!/usr/bin/env node
/**
 * public/images 안의 무거운 사진을 줄입니다. 실행한 뒤 바뀐 파일을 커밋하세요.
 *
 *   npm run optimize:images               # 250KB 넘는 파일을 줄임
 *   npm run optimize:images -- --dry-run  # 무엇이 얼마나 줄어드는지만 표시
 *
 * - JPEG: 긴 변을 2000px 로 줄이고 품질 82 로 다시 저장 (파일 이름 그대로)
 * - 투명한 부분이 없는 PNG(사진·포스터): JPEG 로 바꾸고(.jpg) src/ 안의 주소를 새 이름으로 고침
 * - 투명한 부분이 있는 PNG(로고·아이콘): 긴 변 2000px, 색 수를 줄인 PNG 로 다시 저장
 * 10% 이상 작아지지 않으면 건드리지 않습니다. 이미 줄인 JPEG 은 다시 압축하지 않으므로 여러 번 실행해도 됩니다. 관리 화면에서 올리는 사진은 올릴 때 브라우저가 미리 줄이므로
 * (src/scripts/image-shrink.ts) 이 스크립트는 예전에 올라간 사진이나 직접 넣은 사진을 정리할 때 씁니다.
 */
import { readdirSync, readFileSync, writeFileSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const ROOT = 'public/images';
const MIN_BYTES = 250 * 1024;
const MAX_SIDE = 2000;
const dryRun = process.argv.includes('--dry-run');

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const kb = (n) => `${Math.round(n / 1024)}KB`;
const TEXT = /\.(md|json|astro|ts|mjs|scss|css|ya?ml|html)$/;
const textFiles = [...walk('src'), ...(existsSync('public/admin') ? walk('public/admin') : [])].filter((f) => TEXT.test(f));

/** 사이트 주소(/images/…)가 바뀐 파일의 참조를 고칩니다. 한글 파일 이름은 인코딩된 표기도 함께 */
function rewriteRefs(from, to) {
  const pairs = [[from, to], [encodeURI(from), encodeURI(to)]];
  let n = 0;
  for (const f of textFiles) {
    const text = readFileSync(f, 'utf8');
    let next = text;
    for (const [a, b] of pairs) next = next.split(a).join(b);
    if (next !== text) { if (!dryRun) writeFileSync(f, next); n++; }
  }
  return n;
}

let before = 0, after = 0, count = 0;
for (const file of walk(ROOT)) {
  const ext = extname(file).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;
  const size = statSync(file).size;
  if (size < MIN_BYTES) continue;
  const input = readFileSync(file);
  // 이미 줄인 JPEG 을 다시 압축하면 실행할 때마다 화질이 떨어집니다. 크기가 한도 안이고 충분히 압축된 것(화소당 0.3바이트 이하)은 건너뜁니다
  const meta = await sharp(input).metadata();
  const pixels = (meta.width ?? 0) * (meta.height ?? 0);
  if (ext !== '.png' && Math.max(meta.width ?? 0, meta.height ?? 0) <= MAX_SIDE && pixels > 0 && size / pixels <= 0.3) continue;
  const base = sharp(input, { failOn: 'none' }).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true });
  let out, target = file;
  if (ext === '.png') {
    const { isOpaque } = await sharp(input).stats();
    const jpg = file.slice(0, -ext.length) + '.jpg';
    // 포스터처럼 글자가 들어간 그림이 많아 품질을 조금 높게(88)
    if (isOpaque && !existsSync(jpg)) { out = await base.jpeg({ quality: 88, mozjpeg: true }).toBuffer(); target = jpg; }
    else out = await base.png({ palette: true, quality: 85, effort: 8 }).toBuffer();
  } else {
    out = await base.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  }
  if (out.length > size * 0.9) continue;
  let note = '';
  if (target !== file) {
    const refs = rewriteRefs(file.replace(/^public/, ''), target.replace(/^public/, ''));
    note = ` → .jpg (참조 ${refs}곳 수정)`;
  }
  if (!dryRun) { writeFileSync(target, out); if (target !== file) unlinkSync(file); }
  console.log(`${kb(size).padStart(7)} → ${kb(out.length).padStart(6)}  ${file.replace(ROOT + '/', '')}${note}`);
  before += size; after += out.length; count++;
}
console.log(`${dryRun ? '[미리 보기] ' : ''}${count}개 파일: ${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(1)}MB`);
