export {};
/**
 * 이야기 상세의 사진 넘겨 보기 (여러 장일 때).
 * 사진 줄은 브라우저가 직접 옆으로 스크롤하고 한 장씩 멈춥니다(CSS scroll snap) — 손가락으로 밀기·키보드 화살표는 스크립트 없이 됩니다.
 * 이 스크립트는 그 위에 이전/다음 버튼, 아래 작은 사진(바로 가기), "3 / 7" 표시, 화면낭독기 안내만 붙입니다.
 * 사진을 누르면 크게 보는 창이 열리는 것은 story-gallery.ts 가 맡습니다.
 */
document.querySelectorAll<HTMLElement>('[data-story-viewer]').forEach((viewer) => {
  const track = viewer.querySelector<HTMLElement>('[data-viewer-track]');
  if (!track) return;
  const slides = Array.from(track.children) as HTMLElement[];
  if (slides.length < 2) return;
  const controls = viewer.querySelector<HTMLElement>('[data-viewer-controls]');
  const markerBar = viewer.querySelector<HTMLElement>('[data-viewer-markers]');
  const markers = markerBar ? Array.from(markerBar.querySelectorAll<HTMLButtonElement>('[data-marker]')) : [];
  const previous = viewer.querySelector<HTMLButtonElement>('[data-direction="previous"]');
  const next = viewer.querySelector<HTMLButtonElement>('[data-direction="next"]');
  const status = viewer.querySelector<HTMLElement>('[data-viewer-status]');
  const count = viewer.querySelector<HTMLElement>('[data-viewer-count]');

  /** 스크롤이 멈춘 자리의 사진 번호 */
  let settled = 0;
  /** 버튼·작은 사진으로 가려는 사진 번호 (그 스크롤이 끝날 때까지). 빠르게 여러 번 눌러도 여기서 이어 갑니다 */
  let pending: number | null = null;
  /** 마지막으로 버튼·작은 사진을 누른 시각 — 그 직전 스크롤의 "끝남" 신호와 새 스크롤을 구분하는 데 씁니다 */
  let lastGo = 0;
  let shown = -1;

  /** 사진 가운데가 사진 줄 가운데에서 얼마나 떨어져 있는지 (실제 스크롤 위치 기준) */
  const offset = (el: HTMLElement) => {
    const a = el.getBoundingClientRect();
    const b = track.getBoundingClientRect();
    return a.left + a.width / 2 - (b.left + b.width / 2);
  };
  const nearest = () => slides.reduce((best, el, i) => (Math.abs(offset(el)) < Math.abs(offset(slides[best])) ? i : best), 0);
  // 끝에서 버튼을 disabled 로 바꾸면 방금 누른 버튼의 키보드 초점이 사라지므로, 누를 수 없다는 것만 aria-disabled 로 알립니다
  const setEnd = (button: HTMLButtonElement | null, atEnd: boolean) => {
    if (!button) return;
    if (atEnd) button.setAttribute('aria-disabled', 'true'); else button.removeAttribute('aria-disabled');
  };
  /** 지금 사진 표시(작은 사진 테두리, 숫자) — 누른 즉시 바꿉니다 */
  const paint = (index: number) => {
    if (index === shown) return;
    shown = index;
    markers.forEach((marker, i) => { if (i === index) marker.setAttribute('aria-current', 'true'); else marker.removeAttribute('aria-current'); });
    if (count) count.textContent = String(index + 1);
    setEnd(previous, index === 0);
    setEnd(next, index === slides.length - 1);
    // 작은 사진 줄이 넘칠 때는 지금 사진이 보이도록 그 줄만 옆으로 움직입니다 (페이지는 움직이지 않게)
    const marker = markers[index];
    if (marker && markerBar) {
      const a = marker.getBoundingClientRect();
      const b = markerBar.getBoundingClientRect();
      if (a.left < b.left || a.right > b.right) markerBar.scrollBy({ left: a.left + a.width / 2 - (b.left + b.width / 2) });
    }
  };
  /** 스크롤이 멈춘 뒤: 화면낭독기에 한 번 알립니다 (처음 열렸을 때는 조용히) */
  const settle = () => {
    const index = nearest();
    // 방금 새로 누른 직후에 온 신호는 이전 스크롤이 끝났다는 뜻입니다 — 새 스크롤이 끝날 때까지 기다립니다.
    // 그 밖에는(도중에 다른 자리에서 멈춘 경우 포함) 실제로 멈춘 자리를 따릅니다
    if (pending !== null && index !== pending && performance.now() - lastGo < 120) return;
    pending = null;
    paint(index);
    if (index !== settled) {
      settled = index;
      if (status) status.textContent = `사진 ${index + 1} / ${slides.length}`;
    }
  };
  const go = (index: number) => {
    if (index < 0 || index >= slides.length) return;
    pending = index;
    lastGo = performance.now();
    paint(index);
    track.scrollBy({ left: offset(slides[index]) }); // 부드럽게 넘길지는 CSS 가 정합니다 (움직임 줄이기 설정이면 바로 이동)
  };

  previous?.addEventListener('click', () => go((pending ?? settled) - 1));
  next?.addEventListener('click', () => go((pending ?? settled) + 1));
  markers.forEach((marker, i) => marker.addEventListener('click', () => go(i)));
  // 넘어가는 도중에 손가락·휠·키보드로 직접 움직이면 그 위치를 따릅니다
  for (const type of ['pointerdown', 'wheel', 'keydown', 'touchstart']) track.addEventListener(type, () => { pending = null; }, { passive: true });

  let frame = 0;
  track.addEventListener('scroll', () => {
    if (pending !== null || frame) return;
    frame = requestAnimationFrame(() => { frame = 0; if (pending === null) paint(nearest()); });
  }, { passive: true });
  if ('onscrollend' in window) {
    track.addEventListener('scrollend', settle);
  } else {
    // scrollend 가 없는 브라우저: 스크롤이 잠깐 멈추면 끝난 것으로 봅니다
    let timer = 0;
    track.addEventListener('scroll', () => { window.clearTimeout(timer); timer = window.setTimeout(settle, 140); }, { passive: true });
  }

  if (controls) controls.hidden = false;
  if (markerBar) markerBar.hidden = false;
  paint(nearest());
});
