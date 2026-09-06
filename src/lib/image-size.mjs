/**
 * public/ 안 이미지(/images/…)의 실제 픽셀 크기. 마크다운 본문 <img> 에 width/height 를 채워
 * 사진이 로딩되기 전에도 자리를 잡아 두기 위해 씁니다 (레이아웃 이동 방지).
 * 파일이 없거나 sharp 를 쓸 수 없으면 null 을 돌려주고 빌드는 계속됩니다.
 * astro.config.mjs 와 .astro 프런트매터 양쪽에서 쓰므로 순수 JS 입니다.
 */
import { join } from 'node:path';

const cache = new Map();

/** @param {unknown} src  @returns {Promise<{ width: number; height: number } | null>} */
export async function imageSize(src, publicDir = 'public') {
  if (typeof src !== 'string' || !src.startsWith('/') || src.startsWith('//')) return null;
  const file = join(publicDir, decodeURI(src.split(/[?#]/)[0]));
  if (cache.has(file)) return cache.get(file);
  let size = null;
  try {
    const { default: sharp } = await import('sharp');
    const m = await sharp(file).metadata();
    if (m.width && m.height) {
      // EXIF 회전(5~8)이 있으면 가로·세로가 바뀌어 표시됨
      size = (m.orientation ?? 1) >= 5 ? { width: m.height, height: m.width } : { width: m.width, height: m.height };
    }
  } catch {
    /* 파일 없음 · sharp 미설치 → 크기 생략 */
  }
  cache.set(file, size);
  return size;
}

/**
 * public/<dir> 안 이미지 전체의 크기 맵 { '/images/stories/a.jpg': { width, height } }.
 * astro.config.mjs 에서 한 번 계산해 vite.define 으로 페이지에 넘깁니다 (서버 번들 안에서는 sharp 를 쓸 수 없음).
 * @param {string} dir  '/images/stories' 처럼 public/ 기준 경로
 */
export async function imageSizeMap(dir, publicDir = 'public') {
  const { readdir } = await import('node:fs/promises');
  const map = {};
  let names = [];
  try { names = await readdir(join(publicDir, dir)); } catch { return map; }
  for (const name of names) {
    if (!/\.(jpe?g|png|webp|gif|avif)$/i.test(name)) continue;
    const src = `${dir.replace(/\/$/, '')}/${name}`;
    const size = await imageSize(src, publicDir);
    if (size) map[src] = size;
  }
  return map;
}
