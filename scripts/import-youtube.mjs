#!/usr/bin/env node
/**
 * 유튜브 채널의 최신 영상을 영상 설교 게시판(src/content/posts/sermons)에 자동으로 추가합니다.
 *
 *   npm run import:youtube            # src/data/site.json 의 youtubeChannelId 사용
 *   npm run import:youtube -- UCxxxx  # 다른 채널 ID 지정
 *
 * 유튜브 RSS 피드(API 키 불필요)를 읽어 최근 15개 영상 중 아직 없는 것만 새 마크다운 파일로 만듭니다.
 * 같은 예배를 다시 올려 제목이 똑같은 영상이 둘이 되면, 나중에 올린 것만 보이게 하고 먼저 올린 것은 `hidden: true` 로 숨깁니다
 * (목록에 같은 설교가 두 번 나오지 않게. 되돌리려면 관리 화면에서 숨김을 풀면 됩니다).
 * 실행 후 필요하면 파일을 열어 제목/본문을 다듬고, git 에 커밋하면 사이트가 다시 빌드됩니다.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/content/posts/sermons';
let channelId = process.argv[2];
if (!channelId) {
  channelId = JSON.parse(readFileSync('src/data/site.json', 'utf8')).youtubeChannelId;
}
if (!channelId) {
  console.error('유튜브 채널 ID를 찾을 수 없습니다. src/data/site.json 의 youtubeChannelId 를 확인하세요.');
  process.exit(1);
}

/** 유튜브가 주는 UTC 시각을 캔자스(America/Chicago) 벽시계 시각 'YYYY-MM-DDTHH:mm' 으로 */
const toKansasTime = (iso) => {
  const d = new Date(iso);
  const s = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return s.replace(' ', 'T');
};

const unescape = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? unescape(m[1].trim()) : '';
};

const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
if (!res.ok) {
  console.error('피드를 불러오지 못했습니다:', res.status);
  process.exit(1);
}
const xml = await res.text();
const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);

mkdirSync(DIR, { recursive: true });
const existing = new Set();
/** 보이는 글의 제목 → { file, date } (같은 제목의 영상이 다시 올라왔는지 확인용) */
const visibleByTitle = new Map();
const titleKey = (t) => t.replace(/\s+/g, '');
const parseTitle = (raw) => { try { return JSON.parse(raw); } catch { return raw.replace(/^["']|["']$/g, ''); } };
for (const f of readdirSync(DIR)) {
  const text = readFileSync(join(DIR, f), 'utf8');
  const m = text.match(/^youtube:\s*"?([^"\n]+)"?/m);
  if (m) existing.add(m[1].trim());
  const title = text.match(/^title:\s*(.+)$/m);
  const date = text.match(/^date:\s*(\S+)/m);
  if (m && title && date && !/^hidden:\s*true\s*$/m.test(text)) visibleByTitle.set(titleKey(parseTitle(title[1].trim())), { file: join(DIR, f), date: date[1] });
}
/** 프런트매터에 hidden: true 를 넣습니다 */
const hide = (file) => {
  const text = readFileSync(file, 'utf8');
  const end = text.indexOf('\n---', 3);
  if (end < 0 || /^hidden:/m.test(text.slice(0, end))) return;
  writeFileSync(file, text.slice(0, end) + '\nhidden: true' + text.slice(end));
};

let added = 0;
for (const e of entries) {
  const id = tag(e, 'yt:videoId');
  if (!id || existing.has(id)) continue;
  const title = tag(e, 'title');
  const published = toKansasTime(tag(e, 'published')); // 캔자스 현지 시각 YYYY-MM-DDTHH:mm
  const description = tag(e, 'media:description');
  const date = published.slice(0, 10);
  const file = join(DIR, `${date}-${id}.md`);
  if (existsSync(file)) continue;
  const body = description
    ? '<div>\n' + description.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('\n') + '\n</div>\n'
    : '';
  // 같은 제목의 영상이 이미 보이고 있으면 둘 중 먼저 올린 쪽을 숨김
  const twin = visibleByTitle.get(titleKey(title));
  const hideNew = !!twin && twin.date > published;
  const fm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `date: ${published}`,
    `youtube: ${JSON.stringify(id)}`,
    ...(hideNew ? ['hidden: true'] : []),
    '---',
  ].join('\n');
  writeFileSync(file, fm + '\n' + body);
  if (twin && !hideNew) { hide(twin.file); console.log('같은 제목의 예전 영상을 숨김:', twin.file); }
  if (!hideNew) visibleByTitle.set(titleKey(title), { file, date: published });
  console.log(hideNew ? '추가(숨김 — 같은 제목의 더 새로운 영상이 있음):' : '추가:', file);
  added++;
}
console.log(added ? `${added}개 영상을 추가했습니다.` : '새 영상이 없습니다.');
