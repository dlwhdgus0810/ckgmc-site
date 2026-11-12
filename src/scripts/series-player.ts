export {};
const player = document.getElementById('yt-player');
const links = [...document.querySelectorAll<HTMLAnchorElement>('.episode [data-youtube-id]')].sort((a, b) => Number(a.dataset.no) - Number(b.dataset.no));
const controls = document.querySelector<HTMLElement>('[data-episode-controls]');
const current = document.querySelector<HTMLElement>('[data-episode-current]');
const externalLink = document.querySelector<HTMLAnchorElement>('[data-episode-external]');
const previous = document.querySelector<HTMLButtonElement>('[data-episode-prev]');
const next = document.querySelector<HTMLButtonElement>('[data-episode-next]');
const copyStatus = document.querySelector<HTMLElement>('[data-episode-copy-status]');
let selected = -1;
// 첫 회·마지막 회에서 버튼을 disabled 로 바꾸면 방금 누른 버튼의 키보드 초점이 사라집니다. 누를 수 없다는 것만 aria-disabled 로 알립니다
const setEnd = (button: HTMLButtonElement | null, atEnd: boolean) => { if (!button) return; if (atEnd) button.setAttribute('aria-disabled', 'true'); else button.removeAttribute('aria-disabled'); };
const initialPlayer = player ? [...player.childNodes].map((node) => node.cloneNode(true)) : [];

const choose = (index: number, userAction = false, updateUrl = false) => {
  const link = links[index];
  if (!player || !link) return;
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(link.dataset.youtubeId!)}?rel=0${userAction ? '&autoplay=1' : ''}`;
  iframe.title = link.dataset.title ?? '설교 영상';
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture'; iframe.setAttribute('allowfullscreen', '');
  player.replaceChildren(iframe); selected = index;
  links.forEach((item) => { item.removeAttribute('aria-current'); item.closest('.episode')?.classList.remove('is-active'); });
  link.setAttribute('aria-current', 'true'); link.closest('.episode')?.classList.add('is-active');
  if (controls) controls.hidden = false;
  if (current) current.textContent = `현재 회차: ${link.dataset.no}편 · ${link.dataset.title}`;
  if (externalLink) externalLink.href = link.href;
  setEnd(previous, index === 0);
  setEnd(next, index === links.length - 1);
  if (copyStatus) copyStatus.textContent = '';
  if (updateUrl) {
    const url = new URL(location.href); url.searchParams.set('episode', link.dataset.youtubeId!);
    history.pushState(null, '', url);
  }
  if (userAction) player.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
};
links.forEach((link, index) => link.addEventListener('click', (event) => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); choose(index, true, true);
}));
previous?.addEventListener('click', () => choose(selected - 1, true, true));
next?.addEventListener('click', () => choose(selected + 1, true, true));
const fromUrl = () => {
  const id = new URLSearchParams(location.search).get('episode');
  const index = links.findIndex((link) => link.dataset.youtubeId === id);
  if (index >= 0) choose(index);
  else {
    selected = -1; player?.replaceChildren(...initialPlayer.map((node) => node.cloneNode(true)));
    if (controls) controls.hidden = true;
    links.forEach((link) => { link.removeAttribute('aria-current'); link.closest('.episode')?.classList.remove('is-active'); });
  }
};
fromUrl(); window.addEventListener('popstate', fromUrl);
document.querySelector('[data-episode-copy]')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    if (copyStatus) copyStatus.textContent = '이 회차의 주소를 복사했습니다.';
  } catch {
    if (copyStatus) copyStatus.textContent = `주소창의 주소를 복사해 주세요: ${location.href}`;
  }
});

const list = document.querySelector<HTMLOListElement>('.episode-list');
const order = document.querySelector<HTMLButtonElement>('[data-episode-order]');
if (list && order) order.addEventListener('click', () => {
  const newest = list.dataset.order !== 'newest';
  for (const item of [...list.children].reverse()) list.appendChild(item);
  list.dataset.order = newest ? 'newest' : 'oldest'; list.reversed = newest;
  order.textContent = newest ? '1편부터 보기' : '최신 회차부터 보기';
});
const search = document.querySelector<HTMLInputElement>('#episode-search');
const searchStatus = document.querySelector<HTMLElement>('[data-episode-search-status]');
search?.addEventListener('input', () => {
  const query = search.value.trim().toLocaleLowerCase(); let count = 0;
  links.forEach((link) => {
    const row = link.closest<HTMLElement>('.episode')!;
    row.hidden = !row.textContent?.toLocaleLowerCase().includes(query);
    if (!row.hidden) count++;
  });
  if (searchStatus) searchStatus.textContent = query ? `${count}개 회차를 찾았습니다.` : '';
});
