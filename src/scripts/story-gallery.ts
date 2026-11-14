export {};
const gallery = document.querySelector<HTMLElement>('[data-story-gallery]');
const dialog = gallery?.querySelector<HTMLDialogElement>('[data-gallery-dialog]');
if (gallery && dialog && typeof dialog.showModal === 'function') {
  const links = [...gallery.querySelectorAll<HTMLAnchorElement>('[data-gallery-image]')];
  const full = dialog.querySelector<HTMLImageElement>('[data-gallery-full]')!;
  const caption = dialog.querySelector<HTMLElement>('#gallery-caption')!;
  const original = dialog.querySelector<HTMLAnchorElement>('[data-gallery-original]')!;
  const previous = dialog.querySelector<HTMLButtonElement>('[data-gallery-prev]')!;
  const next = dialog.querySelector<HTMLButtonElement>('[data-gallery-next]')!;
  let index = 0;
  let opener: HTMLAnchorElement | null = null;
  // 끝 장에서 버튼을 disabled 로 바꾸면 방금 누른 버튼의 키보드 초점이 사라집니다. 누를 수 없다는 것만 aria-disabled 로 알립니다
  const setEnd = (button: HTMLButtonElement, atEnd: boolean) => { if (atEnd) button.setAttribute('aria-disabled', 'true'); else button.removeAttribute('aria-disabled'); };
  const show = (number: number) => {
    if (!links[number]) return;
    index = number; full.src = links[index].href; original.href = links[index].href;
    full.alt = `${gallery.querySelector('h1')?.textContent ?? '교회 이야기'} · 사진 ${index + 1}`;
    caption.textContent = `${gallery.querySelector('h1')?.textContent ?? '교회 이야기'} · 사진 ${index + 1} / ${links.length}`;
    setEnd(previous, index === 0); setEnd(next, index === links.length - 1);
  };
  links.forEach((link, number) => link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); opener = link; show(number); dialog.showModal();
    document.body.classList.add('gallery-open');
  }));
  // 닫기 버튼은 HTML 속성(commandfor/command)으로 동작합니다. 그 속성을 아직 지원하지 않는 브라우저(주로 iPhone·구형 브라우저)에서만 스크립트로 닫습니다.
  if (!('commandForElement' in HTMLButtonElement.prototype)) {
    dialog.querySelector('[data-gallery-close]')?.addEventListener('click', () => dialog.close());
  }
  // 창이 화면 전체를 덮으므로 "바깥"이 따로 없습니다. 사진·버튼이 아닌 어두운 빈 곳을 누르면 닫습니다
  dialog.addEventListener('click', (event) => {
    const target = event.target as Element;
    if (target === dialog || target.hasAttribute('data-gallery-stage') || target.id === 'gallery-caption') dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.classList.remove('gallery-open'); opener?.focus(); });
  previous.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); show(index + (event.key === 'ArrowLeft' ? -1 : 1)); }
  });
  let touchX = 0, touchY = 0;
  full.addEventListener('touchstart', (event) => { touchX = event.changedTouches[0].clientX; touchY = event.changedTouches[0].clientY; }, { passive: true });
  full.addEventListener('touchend', (event) => {
    const dx = event.changedTouches[0].clientX - touchX, dy = event.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
  }, { passive: true });
}
