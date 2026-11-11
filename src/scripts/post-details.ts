export {};
const back = document.querySelector<HTMLAnchorElement>('[data-return-to]');
if (back) {
  const raw = new URLSearchParams(location.search).get('returnTo');
  const base = back.dataset.returnTo!;
  if (raw) {
    try {
      const destination = new URL(raw, location.origin);
      const validPath = destination.pathname === base || destination.pathname.startsWith(base + '/page/') && /^\d+\/?$/.test(destination.pathname.slice((base + '/page/').length));
      if (destination.origin === location.origin && validPath) {
        const search = new URLSearchParams();
        for (const key of ['q', 'year', 'service', 'count', 'restore']) {
          const value = destination.searchParams.get(key);
          if (value !== null) search.set(key, value);
        }
        back.href = destination.pathname + (search.size ? '?' + search : '');
        back.textContent = search.has('q') || search.has('year') || search.has('service') ? '검색 결과로 돌아가기' : '목록으로 돌아가기';
        document.querySelectorAll<HTMLAnchorElement>('.post__nav-link').forEach((link) => {
          const url = new URL(link.href); url.searchParams.set('returnTo', destination.pathname + destination.search); link.href = url.pathname + url.search;
        });
      }
    } catch { /* Invalid return URLs retain the safe board link. */ }
  }
}

document.querySelectorAll<HTMLElement>('[data-file-details]').forEach(async (element) => {
  try {
    const url = new URL(element.dataset.fileDetails!, location.origin);
    if (url.origin !== location.origin) return;
    const response = await fetch(url, { method: 'HEAD' });
    const size = Number(response.headers.get('content-length'));
    if (!response.ok || !Number.isFinite(size) || size <= 0) return;
    const label = size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`;
    const target = element.querySelector('[data-file-size]');
    if (target) target.textContent = ` · ${label}`;
  } catch { /* File actions remain available if metadata cannot be fetched. */ }
});
