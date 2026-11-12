#!/usr/bin/env node
/**
 * 페이스북 페이지에 새로 올린 사진 글을 "우리 교회 이야기"(src/content/stories)에 자동으로 추가합니다.
 *
 *   FACEBOOK_PAGE_TOKEN=… npm run import:facebook
 *   FACEBOOK_PAGE_TOKEN=… npm run import:facebook -- --dry-run            # 파일을 만들지 않고 무엇이 추가될지만 표시
 *   FACEBOOK_PAGE_TOKEN=… npm run import:facebook -- --since 2026-05-01   # 이 날짜 뒤에 올린 글부터 다시 확인
 *
 * 토큰: 교회 페이지 관리자가 발급한 "페이지 액세스 토큰" (README "Facebook stories" 절). 환경 변수 FACEBOOK_PAGE_TOKEN 으로만 받고
 *       저장소에는 넣지 않습니다. 토큰이 없으면 아무것도 하지 않고 끝납니다(자동 실행이 실패로 표시되지 않게).
 * 대상: 사진이 있는 글만 가져옵니다. 글만 있는 공지는 건너뜁니다.
 * 기록: 마지막으로 확인한 글의 시각을 scripts/import/facebook-state.json 에 적어 두고 그 뒤에 올라온 글만 봅니다.
 *       그래서 관리 화면에서 지운 이야기가 다시 생기지 않고, 고친 제목·본문을 덮어쓰지 않습니다.
 *       (페이스북에서 글을 나중에 고쳐도 사이트에는 반영되지 않습니다. 관리 화면에서 같이 고치세요.)
 * 사진: 페이스북 사진 주소는 며칠 뒤 만료되므로 public/images/stories 에 내려받습니다 (긴 변 2000px 이하 JPEG).
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const STORIES = 'src/content/stories';
const IMAGES = 'public/images/stories';
const STATE = 'scripts/import/facebook-state.json';
const MAX_SIDE = 2000;
const MAX_PAGES = 10; // 한 번에 최대 250개 글까지만 거슬러 올라갑니다

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sinceArg = args.includes('--since') ? args[args.indexOf('--since') + 1] : undefined;

const token = process.env.FACEBOOK_PAGE_TOKEN?.trim();
if (!token) {
  console.log('FACEBOOK_PAGE_TOKEN 이 없어 페이스북 글을 확인하지 않았습니다. (README 의 "Facebook stories" 절 참고)');
  process.exit(0);
}
// 페이지 토큰으로 부르면 `me` 가 그 페이지를 가리키므로 페이지 ID 는 없어도 됩니다
const page = process.env.FACEBOOK_PAGE_ID?.trim() || 'me';
const graph = (process.env.FACEBOOK_GRAPH_URL?.trim() || 'https://graph.facebook.com').replace(/\/$/, '');

// ── 어디까지 가져왔는지 ────────────────────────────────────────────────
const files = existsSync(STORIES) ? readdirSync(STORIES).filter((f) => f.endsWith('.md')) : [];
const texts = files.map((f) => readFileSync(join(STORIES, f), 'utf8'));
/** 이미 있는 글 (파일 이름의 글 번호 + 원본 링크) */
const known = new Set(files.map((f) => f.replace(/\.md$/, '').split('-').pop()));
const knownLinks = new Set(texts.map((t) => t.match(/^permalink:\s*"?([^"\n]+)"?/m)?.[1]).filter(Boolean));
const newestStory = texts.map((t) => Date.parse(t.match(/^date:\s*(\S+)/m)?.[1] ?? '')).filter(Number.isFinite).sort((a, b) => b - a)[0];

const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
// 처음 실행: 지금 있는 이야기 중 가장 최근 글 뒤부터. (이야기가 하나도 없으면 최근 90일)
const sinceMs = sinceArg ? Date.parse(sinceArg) : Date.parse(state.since ?? '') || newestStory || Date.now() - 90 * 86400e3;
if (!Number.isFinite(sinceMs)) {
  console.error(`--since 날짜를 읽을 수 없습니다: ${sinceArg}`);
  process.exit(1);
}

// ── 페이스북에서 글 목록 받기 ───────────────────────────────────────────
const FIELDS = 'id,message,created_time,permalink_url,full_picture,attachments{type,media{image{src}},subattachments.limit(40){type,media{image{src}}}}';
/** 토큰은 주소가 아니라 헤더로 보냅니다. 오류 문구에 주소를 넣지 않습니다 (다음 쪽 주소에는 토큰이 들어 있습니다) */
async function api(url) {
  let res;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    throw new Error(`페이스북에 연결하지 못했습니다: ${e.cause?.code ?? e.message}`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const err = body.error ?? {};
    const hint = err.code === 190 ? ' → 토큰이 만료되었거나 취소되었습니다. 새 페이지 액세스 토큰을 발급해 FACEBOOK_PAGE_TOKEN 을 바꿔 주세요.'
      : err.code === 10 || err.code === 200 ? ' → 토큰에 pages_read_engagement 권한이 없거나 페이지 관리자의 토큰이 아닙니다.'
      : '';
    throw new Error(`페이스북 응답 오류 (HTTP ${res.status}${err.code ? `, 코드 ${err.code}` : ''}): ${err.message ?? '알 수 없는 오류'}${hint}`);
  }
  return body;
}

const posts = [];
try {
  let url = `${graph}/${page}/posts?${new URLSearchParams({ fields: FIELDS, limit: '25', since: String(Math.floor(sinceMs / 1000)) })}`;
  for (let i = 0; i < MAX_PAGES && url; i++) {
    const body = await api(url);
    posts.push(...(body.data ?? []));
    // 다음 쪽 주소는 페이스북이 준 것을 그대로 따라가되, 같은 서버일 때만 (토큰을 다른 곳으로 보내지 않게)
    const next = (body.data ?? []).length ? body.paging?.next : undefined;
    url = next && new URL(next).origin === new URL(graph).origin ? next : undefined;
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// ── 글 → 이야기 ─────────────────────────────────────────────────────────
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PHOTO = new Set(['photo', 'album', 'cover_photo', 'profile_media']);
/** 글에 달린 사진 주소들 (앨범은 낱장으로). 사진이 아닌 글(링크·영상)은 빈 목록 */
function photosOf(post) {
  const out = [];
  for (const a of post.attachments?.data ?? []) {
    const subs = a.subattachments?.data ?? [];
    if (subs.length) {
      for (const s of subs) if (s.type === 'photo' && s.media?.image?.src) out.push(s.media.image.src);
    } else if (PHOTO.has(a.type) && a.media?.image?.src) {
      out.push(a.media.image.src);
    }
  }
  return [...new Set(out)];
}
/** 사진을 내려받아 긴 변 2000px 이하 JPEG 으로 */
async function fetchImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`사진을 받지 못했습니다 (HTTP ${res.status})`);
  const input = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(input).metadata();
  // 이미 크기가 맞는 JPEG 은 다시 압축하지 않습니다 (화질이 떨어지지 않게)
  if (meta.format === 'jpeg' && Math.max(meta.width ?? 0, meta.height ?? 0) <= MAX_SIDE && (meta.orientation ?? 1) === 1) return input;
  return sharp(input, { failOn: 'none' }).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#fff' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}

posts.sort((a, b) => Date.parse(a.created_time) - Date.parse(b.created_time)); // 오래된 글부터
let added = 0, skipped = 0, latest = sinceMs, failed = false;
for (const post of posts) {
  const time = Date.parse(post.created_time);
  if (!Number.isFinite(time) || time <= sinceMs) continue;
  const short = String(post.id).split('_').pop();
  const message = (post.message ?? '').trim();
  const first = message.split('\n')[0].trim();
  const label = `${post.created_time.slice(0, 10)} ${first.slice(0, 40) || '(글 없음)'}`;

  if (known.has(short) || (post.permalink_url && knownLinks.has(post.permalink_url))) { latest = Math.max(latest, time); continue; }
  const photos = photosOf(post);
  if (!photos.length) {
    console.log(`건너뜀 (사진 없음): ${label}`);
    skipped++; latest = Math.max(latest, time);
    continue;
  }
  if (dryRun) {
    console.log(`추가 예정: ${label} · 사진 ${photos.length}장`);
    added++;
    continue;
  }
  // 사진을 모두 받은 뒤에 파일을 씁니다. 하나라도 실패하면 이 글은 다음 실행에서 다시 시도합니다
  let images;
  try {
    images = await Promise.all(photos.map(fetchImage));
  } catch (e) {
    console.error(`실패: ${label} — ${e.message}`);
    failed = true;
    break;
  }
  mkdirSync(IMAGES, { recursive: true });
  mkdirSync(STORIES, { recursive: true });
  const paths = images.map((buf, i) => {
    const name = `${short}-${i + 1}.jpg`;
    writeFileSync(join(IMAGES, name), buf);
    return `/images/stories/${name}`;
  });
  const title = first.slice(0, 80) || `${post.created_time.slice(0, 10).replace(/-/g, '.')} 사진`;
  const front = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `date: ${post.created_time}`,
    `image: ${JSON.stringify(paths[0])}`,
    'images:',
    ...paths.map((p) => `  - ${JSON.stringify(p)}`),
    ...(post.permalink_url ? [`permalink: ${JSON.stringify(post.permalink_url)}`] : []),
    '---',
  ];
  const body = message ? `<p>${escapeHtml(message).replace(/\n/g, '<br>\n')}</p>` : '';
  writeFileSync(join(STORIES, `${post.created_time.slice(0, 10)}-${short}.md`), `${front.join('\n')}\n${body}\n`);
  console.log(`추가: ${label} · 사진 ${paths.length}장`);
  added++; latest = Math.max(latest, time);
}

if (!dryRun && latest > sinceMs) {
  writeFileSync(STATE, JSON.stringify({ since: new Date(latest).toISOString() }, null, 2) + '\n');
}
console.log(`${dryRun ? '[미리보기] ' : ''}새 이야기 ${added}개${skipped ? `, 건너뜀 ${skipped}개` : ''} (기준: ${new Date(sinceMs).toISOString()} 이후)`);
if (failed) process.exit(1);
