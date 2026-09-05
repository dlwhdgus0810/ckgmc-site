#!/usr/bin/env node
/**
 * 나눔명조(성경 구절·인용용) 웹폰트를 Google Fonts 에서 내려받아 자체 호스팅합니다.
 * 본문 글꼴 Pretendard 는 npm 패키지(pretendard)에서 가져오므로 여기서 다루지 않습니다.
 *
 *   node scripts/fetch-fonts.mjs
 *
 * - public/fonts/*.woff2      폰트 파일 (한글 폰트는 Google 이 나눈 조각 파일들)
 * - src/styles/fonts.css      @font-face 선언 (BaseLayout 에서 import)
 *
 * 폰트를 바꾸려면 아래 GOOGLE_CSS 주소의 family 목록을 고치고 다시 실행하세요.
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const GOOGLE_CSS = 'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&display=swap';
const OUT_DIR = 'public/fonts';
const CSS_OUT = 'src/styles/fonts.css';

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const res = await fetch(GOOGLE_CSS, { headers: { 'User-Agent': UA } });
if (!res.ok) throw new Error(`Google Fonts CSS 요청 실패: ${res.status}`);
let css = await res.text();

const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))];
console.log(`폰트 조각 ${urls.length}개 내려받는 중...`);

const download = async (url) => {
  const parts = new URL(url).pathname.split('/'); // /s/<family>/<version>/<file>
  const name = `${parts[2]}-${parts.at(-1)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`실패: ${url} (${r.status})`);
  writeFileSync(`${OUT_DIR}/${name}`, Buffer.from(await r.arrayBuffer()));
  return [url, `/fonts/${name}`];
};
for (let i = 0; i < urls.length; i += 10) {
  const batch = await Promise.all(urls.slice(i, i + 10).map(download));
  for (const [from, to] of batch) css = css.replaceAll(from, to);
  process.stdout.write(`\r  ${Math.min(i + 10, urls.length)}/${urls.length}`);
}
console.log();

const header = `/*
 * 자체 호스팅 웹폰트 — scripts/fetch-fonts.mjs 가 자동 생성한 파일입니다. 직접 수정하지 마세요.
 * Nanum Myeongjo (성경 구절·인용·강조 문구). 본문 글꼴 Pretendard 는 BaseLayout 에서 npm 패키지로 불러옵니다.
 */
`;
writeFileSync(CSS_OUT, header + css.replace(/\/\* [a-z\-\[\]0-9]+ \*\/\n/g, ''));
console.log(`완료: ${OUT_DIR}/ (${urls.length}개 파일), ${CSS_OUT}`);
