#!/usr/bin/env node
/**
 * 유튜브 채널의 최신 영상을 영상 설교 게시판(src/content/posts/sermons)에 자동으로 추가합니다.
 *
 *   npm run import:youtube            # src/data/site.json 의 youtubeChannelId 사용
 *   npm run import:youtube -- UCxxxx  # 다른 채널 ID 지정
 *
 * 유튜브 RSS 피드(API 키 불필요)를 읽어 최근 15개 영상 중 아직 없는 것만 새 마크다운 파일로 만듭니다.
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

const unescape = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
for (const f of readdirSync(DIR)) {
  const m = readFileSync(join(DIR, f), 'utf8').match(/^youtube:\s*"?([^"\n]+)"?/m);
  if (m) existing.add(m[1].trim());
}

let added = 0;
for (const e of entries) {
  const id = tag(e, 'yt:videoId');
  if (!id || existing.has(id)) continue;
  const title = tag(e, 'title');
  const published = tag(e, 'published'); // 2026-08-02T14:10:00+00:00
  const description = tag(e, 'media:description');
  const date = published.slice(0, 10);
  const file = join(DIR, `${date}-${id}.md`);
  if (existsSync(file)) continue;
  const body = description
    ? '<div>\n' + description.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('\n') + '\n</div>\n'
    : '';
  const fm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `date: ${published.slice(0, 16)}`,
    `youtube: ${JSON.stringify(id)}`,
    '---',
  ].join('\n');
  writeFileSync(file, fm + '\n' + body);
  console.log('추가:', file);
  added++;
}
console.log(added ? `${added}개 영상을 추가했습니다.` : '새 영상이 없습니다.');
