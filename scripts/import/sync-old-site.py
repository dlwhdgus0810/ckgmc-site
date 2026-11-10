#!/usr/bin/env python3
"""기존 사이트(ckgmc.org)에서 새 사이트에 아직 없는 게시글·설교 시리즈만 골라 **추가**합니다.

json-to-markdown.py 와 달리 기존 파일을 지우지 않으므로, 관리 화면에서 올린 글이나
유튜브 자동 등록 설교가 있어도 몇 번이든 다시 실행할 수 있습니다 (도메인을 옮기기 직전에 한 번 더).

    pip install beautifulsoup4
    python3 scripts/import/sync-old-site.py --dry-run      # 무엇이 추가될지 목록만
    python3 scripts/import/sync-old-site.py                # 실제로 내려받아 추가
    python3 scripts/import/sync-old-site.py bulletins      # 특정 게시판만 (series 도 가능)
    python3 scripts/import/sync-old-site.py --all          # SINCE 기간 제한 없이 전부

중복 판단
- 기존 사이트 글 번호(pid) — 가져온 글의 파일 이름이 <날짜>-<pid>.md
- 설교: 유튜브 영상 ID (유튜브 자동 등록으로 이미 들어온 영상은 건너뜀)
- 주보·나눔지: 제목의 예배 날짜(M/D/YYYY) (관리 화면에서 같은 주 주보를 이미 올렸으면 건너뜀)
- 설교 시리즈: 이미 있는 시리즈는 빠진 에피소드만 뒤에 덧붙이고 진행 여부·수정일만 갱신
  (`hidden: true` 로 숨긴 영상과 제목이 같은 에피소드는 넣지 않음)
- 기존 사이트에서도 열리지 않는 이미지·파일은 본문에서 뺍니다
- 유튜브에서 비공개·삭제된 영상의 글은 `hidden: true` 로 가져옵니다 (눌러도 재생되지 않으므로 목록에 내지 않음.
  영상을 다시 공개하면 관리 화면에서 숨김을 풀면 됩니다)

유튜브 영상이 있는 글의 목록 썸네일은 내려받지 않습니다 (사이트가 유튜브 썸네일을 씁니다).
"""
import argparse, glob, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from html import escape as html_escape
from bs4 import BeautifulSoup

BASE = 'https://ckgmc.org'
SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
POSTS = os.path.join(SITE, 'src/content/posts')
SERIES = os.path.join(SITE, 'src/content/series')
IMG = os.path.join(SITE, 'public/images/posts')
SERIES_IMG = os.path.join(SITE, 'public/images/series')
FILES = os.path.join(SITE, 'public/files')

# 새 사이트 게시판 키 → 기존 사이트 게시판 경로
BOARDS = {
    'sermons':          '/미디어-media/sunday-sermon',
    'bulletins':        '/미디어-media/주보-bulletins',
    'resources':        '/미디어-media/resources',
    'choir':            '/미디어-media/성가대-찬양-choir',
    'special-services': '/미디어-media/특별-집회-special-services',
    'mission-stories':  '/섬김과-선교-missions/mission-stories',
    'children':         '/사역-ministries/유아부-playdate-with-jesus',
    'youth':            '/사역-ministries/청소년부-x-youth',
    'young-adult':      '/사역-ministries/청년부-young-adult',
    'camping':          '/사역-ministries/캠핑-사역-camping-ministry',
    'english':          '/사역-ministries/english-ministry',
    'newcomers':        '/양육과-훈련-next-steps/새가족환영회-dinner-with-pastors',
    'serving':          '/양육과-훈련-next-steps/serving-the-church',
    'community':        '/섬김과-선교-missions/serving-the-community',
}
# PDF 가 붙는 게시판은 저장소 용량 때문에 이 날짜 이후 글만 가져옵니다 (--all 로 해제)
SINCE = {'bulletins': '2025-01-01', 'resources': '2025-01-01'}
# 제목의 예배 날짜로 중복을 거르는 게시판
DATE_DEDUPE = {'bulletins', 'resources'}
DOC_EXT = ('.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.hwp', '.zip', '.mp3', '.txt')

downloaded = {'count': 0, 'bytes': 0}


def q(path):
    return urllib.parse.quote(path, safe='/?=&%')


def get(url, binary=False, retries=4):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=60) as r:
                b = r.read()
                return b if binary else b.decode('utf-8', 'replace')
        except Exception as e:
            if i == retries - 1:
                print('  실패', url, e, file=sys.stderr)
                return None
            time.sleep(1.5 * (i + 1))


def download(url, folder):
    """한 번만 내려받고 파일 이름을 돌려줍니다. 받지 못하면 None.
    (기존 사이트 업로드 파일 이름은 무작위 40자라 겹치지 않음)"""
    if url.startswith('/'):
        url = BASE + url
    name = urllib.parse.unquote(os.path.basename(urllib.parse.urlparse(url).path))
    dst = os.path.join(folder, name)
    if not os.path.exists(dst) or os.path.getsize(dst) == 0:
        b = get(url, binary=True)
        if not b:
            return None
        os.makedirs(folder, exist_ok=True)
        with open(dst, 'wb') as f:
            f.write(b)
        downloaded['count'] += 1
        downloaded['bytes'] += len(b)
    return name


def video_available(youtube_id):
    """공개(또는 일부 공개) 영상인지 — 비공개·삭제 영상은 유튜브가 썸네일을 주지 않습니다(404)."""
    try:
        req = urllib.request.Request(f'https://i.ytimg.com/vi/{youtube_id}/hqdefault.jpg', method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30):
            return True
    except urllib.error.HTTPError as e:
        return e.code != 404
    except Exception:
        return True  # 확인하지 못했으면 숨기지 않음


def ystr(s):  # YAML 에서도 유효한 JSON 문자열
    return json.dumps(s or '', ensure_ascii=False)


def service_date(title):
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', title or '')
    return (int(m.group(3)), int(m.group(1)), int(m.group(2))) if m else None


# ── 기존 사이트 읽기 ────────────────────────────────────────────────────
def parse_list(html):
    soup = BeautifulSoup(html, 'html.parser')
    items = []
    for card in soup.select('#loop-blog .card'):
        a = card.select_one('a[href*="pid="]')
        if not a:
            continue
        img = card.select_one('img.card-img-top')
        thumb = img['src'] if img else ''
        if 'thumbnail-default' in thumb:
            thumb = ''
        title = card.select_one('.card-title')
        date = card.select_one('small.text-muted')
        items.append({'pid': int(re.search(r'pid=(\d+)', a['href']).group(1)), 'thumb': thumb,
                      'title_short': title.get_text(strip=True) if title else '',
                      'datetime': (date.get_text(strip=True) if date else '')[:16]})
    pages = 1
    for a in soup.select('a[href*="page="]'):
        m = re.search(r'[?&]page=(\d+)', a['href'])
        if m and 'mode=show' not in a['href']:
            pages = max(pages, int(m.group(1)))
    return pages, items


def list_board(path):
    first = get(BASE + q(path) + '?page=1')
    if not first:
        return []
    pages, items = parse_list(first)
    if pages > 1:
        with ThreadPoolExecutor(6) as ex:
            for html in ex.map(lambda p: get(BASE + q(path) + f'?page={p}'), range(2, pages + 1)):
                if html:
                    items += parse_list(html)[1]
    return items


def clean_body(div, dry_run):
    attachments = []
    for img in div.select('img'):
        src = img.get('src', '')
        if '/storage/uploads/' in src or src.startswith('/images/'):
            name = os.path.basename(src) if dry_run else download(src, IMG)
            if not name:  # 기존 사이트에서도 깨진 이미지
                img.decompose()
                continue
            img['src'] = '/images/posts/' + name
        for attr in ('data-lightbox', 'width', 'height', 'style', 'srcset', 'loading'):
            if img.has_attr(attr):
                del img[attr]
        img['class'] = sorted(set(img.get('class', [])) | {'img-fluid'})
    for a in div.select('a[href]'):
        href = a['href']
        if '/storage/uploads/' in href:
            ext = os.path.splitext(urllib.parse.urlparse(href).path)[1].lower()
            is_doc = ext in DOC_EXT
            name = os.path.basename(href) if dry_run else download(href, FILES if is_doc else IMG)
            if not name:  # 기존 사이트에서도 깨진 링크 — 글자만 남김
                a.unwrap()
                continue
            a['href'] = ('/files/' if is_doc else '/images/posts/') + name
            if is_doc:
                attachments.append({'name': a.get_text(strip=True) or name, 'file': name})
        if a.has_attr('data-lightbox'):
            del a['data-lightbox']
    for s in div.select('script, .addthis_inline_share_toolbox_xnn8'):
        s.decompose()
    body = div.decode_contents()
    body = re.sub(r'\s(data-[a-z-]+|style)="[^"]*"', '', body)
    lines = [l.strip() for l in body.splitlines() if l.strip()]
    body = '\n'.join(lines)
    body = re.sub(r'<p>(\s|&nbsp;|\xa0|<br\s*/?>)*</p>', '', body)
    return body.strip(), attachments


def fetch_detail(path, pid, dry_run):
    html = get(BASE + q(path) + f'?mode=show&pid={pid}')
    if not html:
        return None
    ec = BeautifulSoup(html, 'html.parser').select_one('.entry-content')
    if not ec:
        return None
    t = ec.select_one('.entry-single-title')
    meta = {}
    for d in ec.select('.badge-pill.badge-secondary'):
        meta[d.get_text(strip=True).lower()] = re.sub(r'^\s*(WRITER|VIEW|DATE)\s*', '', d.parent.get_text(' ', strip=True), flags=re.I).strip()
    yt = ''
    fr = ec.select_one('iframe[src*="youtube"]')
    if fr:
        m = re.search(r'/embed/([A-Za-z0-9_-]{6,})', fr['src'])
        if m:
            yt = m.group(1)
    body_div = ec.select_one('td.p-3 > div.py-4')
    body, attachments = clean_body(body_div, dry_run) if body_div else ('', [])
    return {'title': t.get_text(' ', strip=True) if t else '', 'writer': meta.get('writer', ''),
            'youtube': yt, 'body': body, 'attachments': attachments}


# ── 새 사이트 현황 ──────────────────────────────────────────────────────
def existing(board):
    pids, youtube, dates = set(), set(), set()
    for f in glob.glob(os.path.join(POSTS, board, '*.md')):
        m = re.match(r'\d{4}-\d{2}-\d{2}-(\d{1,6})\.md$', os.path.basename(f))
        if m:
            pids.add(int(m.group(1)))
        text = open(f, encoding='utf-8').read()
        m = re.search(r'^youtube:\s*"?([^"\n]+)"?', text, re.M)
        if m:
            youtube.add(m.group(1).strip())
        m = re.search(r'^title:\s*(.+)$', text, re.M)
        if m and service_date(m.group(1)):
            dates.add(service_date(m.group(1)))
    return pids, youtube, dates


def write_post(board, it):
    dt = it['datetime']
    fm = ['---', f'title: {ystr(it["title"] or it["title_short"])}', f'date: {dt.replace(" ", "T")}']
    if it.get('writer'):
        fm.append(f'writer: {ystr(it["writer"])}')
    if it.get('youtube'):
        fm.append(f'youtube: {ystr(it["youtube"])}')
    if it.get('thumbnail'):
        fm.append(f'thumbnail: {ystr(it["thumbnail"])}')
    if it.get('attachments'):
        fm.append('attachments:')
        for a in it['attachments']:
            fm.append(f'  - name: {ystr(a["name"])}')
            fm.append(f'    file: {ystr(a["file"])}')
    if it.get('hidden'):
        fm.append('hidden: true')
    fm.append('---')
    body = it.get('body') or ''
    path = os.path.join(POSTS, board, f'{dt[:10]}-{it["pid"]}.md')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(fm) + '\n' + (f'<div>\n{body}\n</div>\n' if body else ''))


def sync_board(board, path, since, dry_run):
    pids, youtube, dates = existing(board)
    items = [i for i in list_board(path) if i['pid'] not in pids and (not since or i['datetime'][:10] >= since)]
    if board in DATE_DEDUPE:  # 목록 제목은 잘릴 수 있지만 날짜는 앞부분이라 남아 있음
        items = [i for i in items if service_date(i['title_short']) not in dates]

    def one(it):
        d = fetch_detail(path, it['pid'], dry_run)
        if d is None:
            print(f'  ! pid {it["pid"]} 본문을 읽지 못해 건너뜀', file=sys.stderr)
            return None
        it.update(d)
        if board == 'sermons' and it['youtube'] in youtube:
            return None  # 유튜브 자동 등록으로 이미 있는 영상
        if board in DATE_DEDUPE and service_date(it['title']) in dates:
            return None
        if it['youtube'] and not video_available(it['youtube']):
            it['hidden'] = True
        if it['thumb'] and not it['youtube']:  # 영상이 있으면 사이트가 유튜브 썸네일을 씀
            name = os.path.basename(it['thumb']) if dry_run else download(it['thumb'], IMG)
            if name:
                it['thumbnail'] = '/images/posts/' + name
        return it

    with ThreadPoolExecutor(6) as ex:
        new = [r for r in ex.map(one, items) if r]
    for it in new:
        if dry_run:
            print(f'  + {it["datetime"][:10]} [{it["pid"]}] {it["title"]}' + (f'  (첨부 {len(it["attachments"])})' if it['attachments'] else '') + ('  (영상 비공개 — 숨김)' if it.get('hidden') else ''))
        else:
            write_post(board, it)
    print(f'== {board}: {len(new)}개 {"추가 예정" if dry_run else "추가"}' + (f' ({since} 이후만)' if since else ''), flush=True)
    return len(new)


def hidden_videos():
    """새 사이트에서 `hidden: true` 로 숨긴 글의 유튜브 ID (같은 예배를 다시 올린 중복 영상 등)."""
    ids = set()
    for f in glob.glob(os.path.join(POSTS, '*', '*.md')):
        text = open(f, encoding='utf-8').read()
        m = re.search(r'^youtube:\s*"?([^"\n]+)"?', text, re.M)
        if m and re.search(r'^hidden:\s*true\s*$', text, re.M):
            ids.add(m.group(1).strip())
    return ids


def sync_series(dry_run):
    hidden = hidden_videos()
    series, page = [], 1
    while True:
        raw = get(BASE + f'/api/get/series?page={page}')
        if not raw:
            break
        d = json.loads(raw)['series']
        series += d['data']
        if not d.get('next_page_url'):
            break
        page += 1
    added = updated = 0
    for s in series:
        eps = sorted(s.get('episodes') or [], key=lambda e: (e.get('episode_id') or 0, e.get('id') or 0))
        eps = [e for e in eps if e.get('embed_code') and e['embed_code'] not in hidden]
        path = os.path.join(SERIES, f'{s["id"]}.md')
        if os.path.exists(path):
            text = open(path, encoding='utf-8').read()
            have = set(re.findall(r'youtube:\s*"([^"]+)"', text))
            titles = {json.loads(t) for t in re.findall(r'^\s+- title:\s*(".*")\s*$', text, re.M)}
            # 같은 제목이 이미 있으면 같은 예배를 다시 올린 영상이므로 넣지 않음
            missing = [e for e in eps if e['embed_code'] not in have and (e.get('title') or '') not in titles]
            ongoing = 'true' if s.get('on_going') else 'false'
            changed_flag = not re.search(rf'^ongoing: {ongoing}$', text, re.M)
            if not missing and not changed_flag:
                continue
            lines = text.split('\n')
            end = lines.index('---', 1)  # 프런트매터 끝 (episodes 가 마지막 항목)
            if 'episodes:' not in lines[:end]:
                print(f'  ! 시리즈 {s["id"]}: episodes 항목을 찾지 못해 건너뜀', file=sys.stderr)
                continue
            new_lines = []
            for e in missing:
                new_lines += [f'  - title: {ystr(e.get("title"))}', f'    youtube: {ystr(e["embed_code"])}']
            lines[end:end] = new_lines
            lines = [f'ongoing: {ongoing}' if l.startswith('ongoing:') else l for l in lines]
            if s.get('updated_at'):
                lines = [f'updated: {s["updated_at"][:10]}' if l.startswith('updated:') else l for l in lines]
            print(f'  ~ 시리즈 {s["id"]} {s["title"]}: 에피소드 {len(missing)}개 추가' + (f', ongoing → {ongoing}' if changed_flag else ''))
            if not dry_run:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(lines))
            updated += 1
            continue
        thumb = '/images/thumbnail-default.jpg'
        if s.get('thumbnail_url'):
            thumb = '/images/series/' + (os.path.basename(s['thumbnail_url']) if dry_run else download(s['thumbnail_url'], SERIES_IMG))
        fm = ['---', f'title: {ystr(s["title"])}', f'thumbnail: {ystr(thumb)}',
              f'ongoing: {"true" if s.get("on_going") else "false"}', f'date: {s["created_at"][:10]}']
        if s.get('updated_at'):
            fm.append(f'updated: {s["updated_at"][:10]}')
        fm.append('episodes:')
        for e in eps:
            fm += [f'  - title: {ystr(e.get("title"))}', f'    youtube: {ystr(e.get("embed_code"))}']
        fm.append('---')
        text = BeautifulSoup(s.get('content') or '', 'html.parser').get_text('\n', strip=True)
        body = '\n'.join(f'<p>{html_escape(l)}</p>' for l in text.split('\n') if l.strip())
        print(f'  + 시리즈 {s["id"]} {s["title"]} (에피소드 {len(eps)})')
        if not dry_run:
            with open(path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(fm) + '\n' + (f'<div>\n{body}\n</div>\n' if body else ''))
        added += 1
    print(f'== series: 새 시리즈 {added}개, 갱신 {updated}개', flush=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('only', nargs='*', help='게시판 키 또는 series (생략하면 전부)')
    ap.add_argument('--dry-run', action='store_true', help='내려받거나 쓰지 않고 추가될 목록만 출력')
    ap.add_argument('--all', action='store_true', help='SINCE 기간 제한 없이 전부 가져오기')
    args = ap.parse_args()
    unknown = set(args.only) - set(BOARDS) - {'series'}
    if unknown:
        ap.error(f'알 수 없는 게시판: {", ".join(sorted(unknown))}')
    if not args.only or 'series' in args.only:
        sync_series(args.dry_run)
    total = 0
    for board, path in BOARDS.items():
        if args.only and board not in args.only:
            continue
        total += sync_board(board, path, None if args.all else SINCE.get(board), args.dry_run)
    print(f'완료: 글 {total}개' + ('' if args.dry_run else f', 새 파일 {downloaded["count"]}개 ({downloaded["bytes"] / 1048576:.1f}MB) 내려받음'))


if __name__ == '__main__':
    main()
