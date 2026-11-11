export {};
/** Search, recoverable loading, and list context shared by every public board. */
type Item = { u: string; t: string; s?: string; p?: string; d: string; i?: string; f?: string; x?: string; k?: string };

const root = document.getElementById('loop-blog');
if (root) {
  const base = root.dataset.base ?? '';
  const params = new URLSearchParams(location.search);
  const shouldRestore = params.get('restore') === '1';
  const storageKey = `ckgmc:board:${base}`;
  const form = root.querySelector<HTMLFormElement>('[data-board-search]');
  let restoreY: number | null = null;
  if (shouldRestore) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
      if (saved && typeof saved.y === 'number' && Date.now() - saved.at < 86_400_000) restoreY = saved.y;
    } catch { /* Navigation remains usable without browser storage. */ }
  }
  const restoreScroll = () => {
    if (restoreY === null) return;
    const y = restoreY; restoreY = null;
    const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true }));
    void Promise.all([loaded, document.fonts.ready]).then(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' })));
    });
  };
  const remember = (event: Event) => {
    const link = (event.target as Element)?.closest<HTMLAnchorElement>('a[href]');
    if (!link) return;
    const target = new URL(link.href, location.href);
    if (target.origin !== location.origin || !target.pathname.startsWith(base + '/') || target.pathname.startsWith(base + '/page/')) return;
    const from = new URL(location.href);
    from.searchParams.set('restore', '1');
    target.searchParams.set('returnTo', from.pathname + from.search);
    link.href = target.pathname + target.search;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ y: scrollY, at: Date.now() })); } catch { /* optional */ }
  };
  root.addEventListener('click', remember);
  root.addEventListener('auxclick', remember);

  if (form) {
    const input = form.querySelector<HTMLInputElement>('[name="q"]')!;
    const year = form.querySelector('[name="year"]') as unknown as HTMLSelectElement;
    const service = form.querySelector('[name="service"]') as unknown as HTMLSelectElement | null;
    const reset = form.querySelector<HTMLButtonElement>('[data-search-reset]')!;
    const retry = root.querySelector<HTMLButtonElement>('[data-search-retry]')!;
    const status = root.querySelector<HTMLElement>('[data-search-status]')!;
    const results = root.querySelector<HTMLElement>('[data-search-results]')!;
    const list = root.querySelector<HTMLElement>('[data-board-list]')!;
    const rows = root.dataset.layout === 'rows';
    const parsed = root.dataset.parsed === 'true';
    const rowIcon = root.querySelector<HTMLTemplateElement>('[data-row-icon]');
    const STEP = 15;
    let items: Item[] | null = null;
    let loading: Promise<Item[]> | null = null;
    let shown = Math.max(STEP, Math.min(2000, Number(params.get('count')) || STEP));
    let renderId = 0;
    const norm = (s: string) => s.toLowerCase().replace(/[\s·|:,.\-~'"“”‘’()[\]]/g, '');
    const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
      const node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const add = <T extends Node>(parent: T, ...children: Node[]) => {
      for (const child of children) parent.appendChild(child);
      return parent;
    };
    const dateEl = (iso: string) => {
      const date = new Date(iso + 'T00:00:00Z');
      const label = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', ...(parsed ? { weekday: 'short' as const } : {}), timeZone: 'UTC' }).format(date);
      const node = el('time', undefined, label); node.dateTime = iso; return node;
    };
    const card = (item: Item) => {
      const col = el('div', 'col-sm-6 col-lg-4 mb-4');
      const link = el('a', 'card-tile'); link.href = `${base}/${item.u}`;
      const image = el('img'); image.src = item.i ?? '/images/thumbnail-default.jpg'; image.alt = ''; image.loading = 'lazy'; image.width = 640; image.height = 360;
      image.addEventListener('error', () => { image.src = '/images/thumbnail-default.jpg'; }, { once: true });
      const body = el('div', 'card-tile__body');
      if (item.s) add(body, el('span', 'card-tile__eyebrow', item.s));
      add(body, el('h2', 'card-tile__title h6', item.t));
      if (item.p || item.x) add(body, el('p', 'card-tile__text', item.p ?? item.x));
      add(body, add(el('p', 'card-tile__meta'), dateEl(item.d)));
      return add(col, add(link, add(el('div', 'card-tile__media'), image), body));
    };
    const row = (item: Item) => {
      const li = el('li', 'post-row');
      const link = el('a', 'post-row__main'); link.href = `${base}/${item.u}`;
      add(link, el('span', 'post-row__title', item.t));
      if (item.x) add(link, el('span', 'post-row__text', item.x));
      add(link, add(el('span', 'post-row__meta'), dateEl(item.d))); add(li, link);
      if (item.f) {
        const pdf = el('a', 'btn btn-outline-primary btn-sm post-row__action', 'PDF 열기');
        pdf.href = item.f; pdf.target = '_blank'; pdf.rel = 'noopener'; pdf.setAttribute('aria-label', `${item.t} PDF 열기 (새 창)`);
        if (rowIcon) pdf.insertBefore(rowIcon.content.cloneNode(true), pdf.firstChild);
        add(li, pdf);
      }
      return li;
    };
    const load = () => {
      if (items) return Promise.resolve(items);
      if (!loading) loading = fetch(form.dataset.index!).then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid search index');
        return (items = data as Item[]);
      }).finally(() => { loading = null; });
      return loading;
    };
    const render = async () => {
      const id = ++renderId;
      const q = input.value.trim(), y = year.value, s = service?.value ?? '';
      const active = !!(q || y || s);
      reset.hidden = !active; retry.hidden = true;
      const url = new URL(location.href);
      for (const [key, value] of [['q', q], ['year', y], ['service', s]]) value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
      url.searchParams.delete('restore');
      active && shown > STEP ? url.searchParams.set('count', String(shown)) : url.searchParams.delete('count');
      history.replaceState(history.state, '', url);
      if (!active) {
        root.removeAttribute('aria-busy');
        list.hidden = false; results.hidden = status.hidden = true; results.replaceChildren(); restoreScroll(); return;
      }
      status.hidden = false; results.hidden = true; list.hidden = false;
      status.textContent = '검색 중… 기본 목록을 먼저 볼 수 있습니다.';
      root.setAttribute('aria-busy', 'true');
      let data: Item[];
      try { data = await load(); }
      catch {
        if (id !== renderId) return;
        status.textContent = '검색 목록을 불러오지 못했습니다. 기본 목록을 이용하거나 다시 시도해 주세요.';
        retry.hidden = false; root.removeAttribute('aria-busy'); return;
      }
      if (id !== renderId) return;
      root.removeAttribute('aria-busy');
      const words = q.split(/\s+/).map(norm).filter(Boolean);
      const found = data.filter((item) => (!y || item.d.startsWith(y)) && (!s || item.s === s) && words.every((word) => norm([item.t, item.s, item.p, item.x, item.k].filter(Boolean).join(' ')).includes(word)));
      status.textContent = found.length ? `${found.length}개 중 ${Math.min(shown, found.length)}개를 표시합니다.` : '찾는 글이 없습니다. 검색어나 필터를 바꿔 보세요.';
      const box = rows ? el('ul', 'post-rows') : el('div', 'row board-cards');
      for (const item of found.slice(0, shown)) add(box, rows ? row(item) : card(item));
      results.replaceChildren(box); results.hidden = false; list.hidden = true;
      if (found.length > shown) {
        const more = el('button', 'btn btn-outline-primary', `더 보기 (${found.length - shown}개 남음)`); more.type = 'button';
        more.addEventListener('click', () => { shown += STEP; void render(); });
        add(results, add(el('p', 'text-center py-3'), more));
      }
      restoreScroll();
    };
    let timer = 0;
    const changed = () => { shown = STEP; void render(); };
    input.addEventListener('input', () => { clearTimeout(timer); timer = window.setTimeout(changed, 200); });
    year.addEventListener('change', changed); service?.addEventListener('change', changed);
    retry.addEventListener('click', () => { void render(); });
    reset.addEventListener('click', () => { input.value = ''; year.value = ''; if (service) service.value = ''; changed(); input.focus(); });
    form.addEventListener('submit', (event) => { event.preventDefault(); clearTimeout(timer); changed(); });
    form.hidden = false;
    input.value = params.get('q') ?? '';
    for (const select of [year, service]) if (select) {
      const value = params.get(select.name) ?? '';
      if ([...select.options].some((option) => option.value === value)) select.value = value;
    }
    void render();
  } else restoreScroll();
}
