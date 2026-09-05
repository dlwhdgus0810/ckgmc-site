#!/usr/bin/env python3.11
"""scrape-ckgmc.py 가 만든 JSON(data/*.json, fb/posts.json)과 내려받은 파일을
Astro 콘텐츠(src/content/posts, series, stories)와 public/ 로 변환·복사합니다.

    python3 scripts/import/json-to-markdown.py            # 프로젝트 루트 기준
    python3 scripts/import/json-to-markdown.py /path/to/site

주의: 기존 src/content/posts, series, stories 폴더를 지우고 다시 만듭니다.
DB 덤프에서 직접 JSON 을 만들 때는 게시판별로 data/<board>.json 에
[{pid, title, datetime "YYYY-MM-DD HH:MM", writer, youtube, thumb, body(HTML), attachments:[{name, file}]}, ...]
형태로 저장하면 됩니다."""
import json, os, re, html, glob, shutil, sys
SRC = os.path.dirname(os.path.abspath(__file__))
SITE = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
POSTS = os.path.join(SITE, 'src/content/posts')
SERIES = os.path.join(SITE, 'src/content/series')
STORIES = os.path.join(SITE, 'src/content/stories')
for d in (POSTS, SERIES, STORIES):
    shutil.rmtree(d, ignore_errors=True); os.makedirs(d)

def ystr(s):  # YAML-safe double quoted string (JSON syntax is valid YAML)
    return json.dumps(s or '', ensure_ascii=False)

def clean_body(body):
    body = body or ''
    lines = [l.strip() for l in body.splitlines()]
    lines = [l for l in lines if l]
    body = '\n'.join(lines)
    body = re.sub(r'\s(data-[a-z-]+|style)="[^"]*"', '', body)  # drop editor junk
    body = re.sub(r'<p>(\s|&nbsp;|\xa0)*</p>', '', body)
    return body.strip()

def write_post(board, it):
    title = (it.get('title') or it.get('title_short') or '').strip()
    dt = (it.get('datetime') or it.get('date') or '').strip()
    date_iso = dt.replace(' ', 'T') if dt else ''
    date_short = dt[:10]
    slug = f"{date_short}-{it['pid']}"
    fm = ['---', f'title: {ystr(title)}', f'date: {date_iso}']
    if it.get('writer'): fm.append(f'writer: {ystr(it["writer"])}')
    if it.get('youtube'): fm.append(f'youtube: {ystr(it["youtube"])}')
    if it.get('thumb'): fm.append(f'thumbnail: {ystr(it["thumb"])}')
    if it.get('attachments'):
        fm.append('attachments:')
        for a in it['attachments']:
            fm.append(f'  - name: {ystr(a["name"])}')
            fm.append(f'    file: {ystr(a["file"])}')
    fm.append('---')
    body = clean_body(it.get('body'))
    content = '\n'.join(fm) + '\n' + (f'<div>\n{body}\n</div>\n' if body else '')
    os.makedirs(os.path.join(POSTS, board), exist_ok=True)
    open(os.path.join(POSTS, board, slug + '.md'), 'w', encoding='utf-8').write(content)

# --- posts ---
boards = ['sermons','bulletins','resources','choir','special-services','mission-stories','children','youth','young-adult','camping','english','newcomers','serving','community']
choir = {i['pid'] for i in json.load(open(f'{SRC}/data/choir.json'))}
choir_m = {i['pid'] for i in json.load(open(f'{SRC}/data/choir-ministry.json'))}
print('choir == choir-ministry:', choir == choir_m)
total = 0
for b in boards:
    items = json.load(open(f'{SRC}/data/{b}.json'))
    for it in items: write_post(b, it)
    total += len(items)
    print(f'{b}: {len(items)}')
print('posts total', total)

# --- series ---
series = json.load(open(f'{SRC}/data/series.json'))
for s in series:
    eps = sorted(s.get('episodes') or [], key=lambda e: (e.get('episode_id') or 0, e.get('id') or 0))
    fm = ['---', f'title: {ystr(s["title"])}', f'thumbnail: {ystr(s.get("thumbnail_local") or "/images/thumbnail-default.jpg")}',
          f'ongoing: {"true" if s.get("on_going") else "false"}', f'date: {s["created_at"][:10]}']
    if s.get('updated_at'): fm.append(f'updated: {s["updated_at"][:10]}')
    fm.append('episodes:')
    for e in eps:
        fm.append(f'  - title: {ystr(e.get("title"))}')
        fm.append(f'    youtube: {ystr(e.get("embed_code"))}')
    fm.append('---')
    body = clean_body(s.get('content') or '')
    if body and not body.startswith('<'): body = f'<p>{html.escape(body)}</p>'
    open(os.path.join(SERIES, f'{s["id"]}.md'), 'w', encoding='utf-8').write('\n'.join(fm) + '\n' + (f'<div>\n{body}\n</div>\n' if body else ''))
print('series', len(series))

# --- copy downloaded images / files into public/ ---
for src_dir, dst_dir in (('img/posts', 'public/images/posts'), ('img/series', 'public/images/series'), ('files', 'public/files')):
    s_dir = os.path.join(SRC, src_dir); d_dir = os.path.join(SITE, dst_dir)
    if not os.path.isdir(s_dir): continue
    os.makedirs(d_dir, exist_ok=True)
    n = 0
    for name in os.listdir(s_dir):
        if not os.path.exists(os.path.join(d_dir, name)):
            shutil.copy(os.path.join(s_dir, name), os.path.join(d_dir, name)); n += 1
    print(f'copied {n} new files -> {dst_dir}')

# --- stories (facebook) ---
out_img = os.path.join(SITE, 'public/images/stories')
shutil.rmtree(out_img, ignore_errors=True); os.makedirs(out_img)
posts = json.load(open(f'{SRC}/fb/posts.json'))['posts']
n = 0
for p in posts:
    short = p['id'].split('_')[1]
    full = f'{SRC}/fb/full/{short}.json'
    msg = p.get('message') or ''
    images = []
    if os.path.exists(full) and os.path.getsize(full) > 0:
        d = json.load(open(full))
        msg = d.get('message') or msg
        for i, src in enumerate(d.get('_images', [])):
            name = f'{short}-{i+1}.jpg'
            shutil.copy(os.path.join(SRC, src), os.path.join(out_img, name)); images.append('/images/stories/' + name)
    elif os.path.exists(f'{SRC}/fb/{short}.jpg'):
        name = f'{short}-1.jpg'
        shutil.copy(f'{SRC}/fb/{short}.jpg', os.path.join(out_img, name)); images.append('/images/stories/' + name)
    msg = msg.strip()
    title = msg.split('\n')[0].strip()[:80]
    date = p['created_time'][:10]
    fm = ['---', f'title: {ystr(title)}', f'date: {p["created_time"]}']
    if images:
        fm.append(f'image: {ystr(images[0])}')
        fm.append('images:')
        for im in images: fm.append(f'  - {ystr(im)}')
    fm.append(f'permalink: {ystr(p.get("permalink_url"))}')
    fm.append('---')
    body = '<p>' + html.escape(msg).replace('\n', '<br>\n') + '</p>'
    open(os.path.join(STORIES, f'{date}-{short}.md'), 'w', encoding='utf-8').write('\n'.join(fm) + '\n' + body + '\n')
    n += 1
print('stories', n)
