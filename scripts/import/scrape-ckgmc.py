#!/usr/bin/env python3.11
"""Scrape all board posts from ckgmc.org into JSON + download images/files."""
import json, os, re, sys, time, urllib.request, urllib.parse, hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from bs4 import BeautifulSoup

BASE = 'https://ckgmc.org'
OUT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(OUT, 'data'); os.makedirs(DATA, exist_ok=True)
IMG = os.path.join(OUT, 'img', 'posts'); os.makedirs(IMG, exist_ok=True)
FILES = os.path.join(OUT, 'files'); os.makedirs(FILES, exist_ok=True)

BOARDS = {
    'sermons':          '/미디어-media/sunday-sermon',
    'bulletins':        '/미디어-media/주보-bulletins',
    'resources':        '/미디어-media/resources',
    'choir':            '/미디어-media/성가대-찬양-choir',
    'choir-ministry':   '/사역-ministries/성가대-choir-ministry',
    'special-services': '/미디어-media/특별-집회-special-services',
    'mission-stories':  '/섬김과-선교-missions/mission-stories',
    'children':         '/사역-ministries/유아부-playdate-with-jesus',
    'youth':            '/사역-ministries/청소년부-x-youth',
    'young-adult':      '/사역-ministries/청년부-young-adult',
    'camping':          '/사역-ministries/캠핑-사역-camping-ministry',
    'english':          '/사역-ministries/english-ministry',
    'hesed':            '/사역-ministries/헤세드-워십-hesed-ministry',
    'newcomers':        '/양육과-훈련-next-steps/새가족환영회-dinner-with-pastors',
    'serving':          '/양육과-훈련-next-steps/serving-the-church',
    'community':        '/섬김과-선교-missions/serving-the-community',
}
ONLY = sys.argv[1:]  # optional subset of boards

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
                print('FAIL', url, e, file=sys.stderr); return None
            time.sleep(1.5 * (i + 1))

def download(url, folder):
    """Download once; return local basename."""
    if url.startswith('/'): url = BASE + url
    name = os.path.basename(urllib.parse.urlparse(url).path)
    name = urllib.parse.unquote(name)
    dst = os.path.join(folder, name)
    if not os.path.exists(dst) or os.path.getsize(dst) == 0:
        b = get(url, binary=True)
        if b: open(dst, 'wb').write(b)
    return name

def max_page(soup):
    m = 1
    for a in soup.select('a[href*="page="]'):
        if 'mode=show' in a['href']: continue
        mm = re.search(r'[?&]page=(\d+)', a['href'])
        if mm: m = max(m, int(mm.group(1)))
    return m

def parse_list(html):
    soup = BeautifulSoup(html, 'html.parser')
    items = []
    for card in soup.select('#loop-blog .card'):
        a = card.select_one('a[href*="pid="]')
        if not a: continue
        pid = int(re.search(r'pid=(\d+)', a['href']).group(1))
        img = card.select_one('img.card-img-top')
        thumb = img['src'] if img else ''
        if 'thumbnail-default' in thumb: thumb = ''
        title = card.select_one('.card-title')
        excerpt = card.select_one('p.card-text')
        date = card.select_one('small.text-muted')
        items.append({'pid': pid, 'thumb': thumb,
                      'title_short': title.get_text(strip=True) if title else '',
                      'excerpt': excerpt.get_text(' ', strip=True) if excerpt else '',
                      'datetime': date.get_text(strip=True) if date else ''})
    return soup, items

def clean_body(div):
    # rewrite image/file links to local copies
    attachments = []
    for img in div.select('img'):
        src = img.get('src', '')
        if '/storage/uploads/' in src or src.startswith('/images/'):
            name = download(src, IMG)
            img['src'] = '/images/posts/' + name
        for attr in ('data-lightbox', 'width', 'height', 'style', 'srcset', 'loading'):
            if img.has_attr(attr): del img[attr]
        cls = set(img.get('class', [])); cls.add('img-fluid'); img['class'] = sorted(cls)
    for a in div.select('a[href]'):
        href = a['href']
        if '/storage/uploads/' in href:
            path = urllib.parse.urlparse(href).path
            ext = os.path.splitext(path)[1].lower()
            if ext in ('.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.hwp', '.zip', '.mp3', '.txt'):
                name = download(href, FILES)
                a['href'] = '/files/' + name
                attachments.append({'name': a.get_text(strip=True) or name, 'file': name})
            else:
                name = download(href, IMG)
                a['href'] = '/images/posts/' + name
        if a.has_attr('data-lightbox'): del a['data-lightbox']
    for s in div.select('script, .addthis_inline_share_toolbox_xnn8'): s.decompose()
    html = div.decode_contents().strip()
    # drop empty paragraphs
    html = re.sub(r'<p>(\s|&nbsp;|\xa0|<br\s*/?>)*</p>', '', html)
    html = re.sub(r'\n{3,}', '\n\n', html)
    return html.strip(), attachments

def parse_detail(html):
    soup = BeautifulSoup(html, 'html.parser')
    ec = soup.select_one('.entry-content')
    if not ec: return None
    t = ec.select_one('.entry-single-title')
    title = t.get_text(' ', strip=True) if t else ''
    meta = {}
    for d in ec.select('.badge-pill.badge-secondary'):
        key = d.get_text(strip=True).lower()
        val = d.parent.get_text(' ', strip=True)
        val = re.sub(r'^\s*(WRITER|VIEW|DATE)\s*', '', val, flags=re.I).strip()
        meta[key] = val
    yt = ''
    fr = ec.select_one('iframe[src*="youtube"]')
    if fr:
        m = re.search(r'/embed/([A-Za-z0-9_-]{6,})', fr['src'])
        if m: yt = m.group(1)
    body_div = None
    for d in ec.select('td.p-3 > div.py-4'):
        body_div = d; break
    body, attachments = clean_body(body_div) if body_div else ('', [])
    return {'title': title, 'writer': meta.get('writer', ''), 'date': meta.get('date', ''),
            'views': meta.get('view', ''), 'youtube': yt, 'body': body, 'attachments': attachments}

def scrape_board(key, path):
    out_file = os.path.join(DATA, f'{key}.json')
    print(f'== {key}', flush=True)
    first = get(BASE + q(path) + '?page=1')
    soup, items = parse_list(first)
    pages = max_page(soup)
    print(f'   pages={pages} first={len(items)}', flush=True)
    all_items = list(items)
    if pages > 1:
        with ThreadPoolExecutor(6) as ex:
            futs = {ex.submit(get, BASE + q(path) + f'?page={p}'): p for p in range(2, pages + 1)}
            page_items = {}
            for f in as_completed(futs):
                p = futs[f]; h = f.result()
                if h: page_items[p] = parse_list(h)[1]
        for p in sorted(page_items): all_items += page_items[p]
    print(f'   items={len(all_items)}', flush=True)
    # details
    def one(it):
        h = get(BASE + q(path) + f'?mode=show&pid={it["pid"]}')
        d = parse_detail(h) if h else None
        if d is None: d = {'title': it['title_short'], 'writer': '', 'date': it['datetime'][:10], 'youtube': '', 'body': '', 'attachments': []}
        if it['thumb']:
            it['thumb'] = '/images/posts/' + download(it['thumb'], IMG)
        it.update(d)
        return it
    results = []
    with ThreadPoolExecutor(6) as ex:
        for i, r in enumerate(ex.map(one, all_items)):
            results.append(r)
            if (i + 1) % 25 == 0: print(f'   {i+1}/{len(all_items)}', flush=True)
    results.sort(key=lambda x: (x['datetime'], x['pid']), reverse=True)
    json.dump(results, open(out_file, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'   saved {out_file} ({len(results)})', flush=True)

def scrape_series():
    out = []
    p = 1
    while True:
        d = json.loads(get(BASE + f'/api/get/series?page={p}'))['series']
        for s in d['data']:
            if s.get('thumbnail_url'):
                s['thumbnail_local'] = '/images/series/' + download(s['thumbnail_url'], os.path.join(OUT, 'img', 'series'))
            out.append(s)
        if not d.get('next_page_url'): break
        p += 1
    json.dump(out, open(os.path.join(DATA, 'series.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'== series saved ({len(out)})', flush=True)

if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'img', 'series'), exist_ok=True)
    if not ONLY or 'series' in ONLY: scrape_series()
    for k, p in BOARDS.items():
        if ONLY and k not in ONLY: continue
        try: scrape_board(k, p)
        except Exception as e: print('ERROR', k, e, file=sys.stderr)
    print('DONE', flush=True)
