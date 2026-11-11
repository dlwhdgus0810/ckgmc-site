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
  for (const folder of ['series', 'stories', 'pages/ministries']) {
    const dir = resolve(root, 'src/content', folder);
    for (const file of await readdir(dir)) {
      if (!file.endsWith('.md')) continue;
      const text = await readFile(resolve(dir, file), 'utf8');
      const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!match) continue;
      const data = parse(match[1]);
      const src = data.thumbnail ?? data.image ?? data.headerImage;
      if (typeof src === 'string') sources.add(src);
    }
  }
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
      const sizes = src === site.hero.image ? [640, 960, 1440, 1920] : noticeImages.has(src) ? [320, 640, 960, 1600] : [320, 640, 960, 1440];
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
