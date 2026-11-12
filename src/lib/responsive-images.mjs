import { createHash, randomUUID } from 'node:crypto';
import { readFile, readdir, mkdir, access, rename } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import sharp from 'sharp';
import { parse } from 'yaml';

// Run in the build/config process, never in a Worker. Generated files are cached
// by source bytes + transform settings and recreated by every clean build.
export async function homeImageVariants(root = process.cwd()) {
  const publicRoot = resolve(root, 'public');
  const output = resolve(publicRoot, 'images/responsive');
  const site = JSON.parse(await readFile(resolve(root, 'src/data/site.json'), 'utf8'));
  const noticeImages = new Set(site.notices.map((n) => n.image));
  const sources = new Set([site.hero.image, ...noticeImages]);
  /** 작게만 쓰는 그림(이야기 앨범 썸네일, 로고)은 작은 크기만 만듭니다 — 빌드 시간을 아끼려고 */
  const smallOnly = new Map();
  const frontmatter = async (file) => {
    const match = (await readFile(file, 'utf8')).match(/^---\r?\n([\s\S]*?)\r?\n---/);
    return match ? parse(match[1]) : null;
  };
  for (const folder of ['series', 'stories', 'pages/ministries']) {
    const dir = resolve(root, 'src/content', folder);
    for (const file of await readdir(dir)) {
      if (!file.endsWith('.md')) continue;
      const data = await frontmatter(resolve(dir, file));
      if (!data) continue;
      const src = data.thumbnail ?? data.image ?? data.headerImage;
      if (typeof src === 'string') sources.add(src);
      // 이야기 앨범의 나머지 사진: 상세 페이지에서 썸네일로만 보입니다 (크게 볼 때는 원본을 엽니다)
      if (folder === 'stories' && Array.isArray(data.images)) for (const img of data.images) if (typeof img === 'string' && img !== src) smallOnly.set(img, [320, 640]);
    }
  }
  // 하위 페이지 배너 사진: 모든 페이지의 headerImage + 레이아웃이 직접 가리키는 public/images/headers 의 사진
  const walk = async (dir) => {
    const files = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) files.push(...await walk(resolve(dir, entry.name)));
      else files.push(resolve(dir, entry.name));
    }
    return files;
  };
  for (const file of await walk(resolve(root, 'src/content/pages'))) {
    if (!file.endsWith('.md')) continue;
    const data = await frontmatter(file);
    if (typeof data?.headerImage === 'string') sources.add(data.headerImage);
  }
  try { for (const name of await readdir(resolve(publicRoot, 'images/headers'))) if (/\.(jpe?g|png|webp)$/i.test(name)) sources.add(`/images/headers/${name}`); } catch { /* 폴더가 없으면 건너뜀 */ }
  // 로고: 모든 페이지에 나오고 표시 크기는 가로 270px 남짓
  if (typeof site.logo === 'string') smallOnly.set(site.logo, [320, 640, 960]);
  // 다른 곳에서 크게 쓰는 그림이면 큰 크기까지 만듭니다
  for (const src of [...smallOnly.keys()]) if (sources.has(src)) smallOnly.delete(src);
  for (const src of smallOnly.keys()) sources.add(src);
  await mkdir(output, { recursive: true });
  const entries = [...sources];
  const map = {};
  // Bound CPU/memory usage during CI builds.
  for (let offset = 0; offset < entries.length; offset += 3) {
    await Promise.all(entries.slice(offset, offset + 3).map(async (src) => {
      if (typeof src !== 'string' || !src.startsWith('/images/') || src.includes('?')) return;
      let file;
      try { file = resolve(publicRoot, '.' + decodeURI(src)); } catch { return; }
      if (relative(publicRoot, file).startsWith('..' + sep)) return;
      let input, meta;
      try { input = await readFile(file); meta = await sharp(input).metadata(); }
      catch { return; } // Existing original/fallback behavior handles absent media.
      if (!meta.width || !meta.height || (meta.pages ?? 1) > 1) return;
      const rotated = (meta.orientation ?? 1) >= 5;
      const width = rotated ? meta.height : meta.width;
      const height = rotated ? meta.width : meta.height;
      const sizes = src === site.hero.image ? [640, 960, 1440, 1920] : noticeImages.has(src) ? [320, 640, 960, 1600] : smallOnly.get(src) ?? [320, 640, 960, 1440];
      const widths = [...new Set(sizes.map((w) => Math.min(w, width)))];
      const hash = createHash('sha256').update(input).update('webp-78-v1').digest('hex').slice(0, 20);
      const variants = [];
      for (const size of widths) {
        const name = `${hash}-${size}.webp`;
        const target = resolve(output, name);
        try { await access(target); }
        catch {
          const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
          await sharp(input).rotate().resize({ width: size, withoutEnlargement: true }).webp({ quality: 78 }).toFile(temporary);
          await rename(temporary, target);
        }
        variants.push({ src: `/images/responsive/${name}`, width: size });
      }
      map[src] = { width, height, srcset: variants.map((v) => `${v.src} ${v.width}w`).join(', ') };
    }));
  }
  return map;
}
