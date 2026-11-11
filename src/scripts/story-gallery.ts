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
  const show = (number: number) => {
    if (!links[number]) return;
    index = number; full.src = links[index].href; original.href = links[index].href;
    full.alt = `${gallery.querySelector('h1')?.textContent ?? '교회 이야기'} · 사진 ${index + 1}`;
    caption.textContent = `${gallery.querySelector('h1')?.textContent ?? '교회 이야기'} · 사진 ${index + 1} / ${links.length}`;
    previous.disabled = index === 0; next.disabled = index === links.length - 1;
  };
  links.forEach((link, number) => link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); opener = link; show(number); dialog.showModal();
    document.body.classList.add('gallery-open');
  }));
  dialog.querySelector('[data-gallery-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { document.body.classList.remove('gallery-open'); opener?.focus(); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
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
