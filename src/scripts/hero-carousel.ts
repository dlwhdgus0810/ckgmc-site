export {};

/** One banner at a time; content stays fully readable when JavaScript is unavailable. */
document.querySelectorAll<HTMLElement>('[data-banner-carousel]').forEach((carousel) => {
  const track = carousel.querySelector<HTMLElement>('[data-banner-track]');
  const slides = [...carousel.querySelectorAll<HTMLElement>('[data-banner-slide]')];
  const viewport = carousel.querySelector<HTMLElement>('[data-banner-viewport]');
  if (!track || !viewport || !slides.length) return;
  const controls = carousel.querySelector<HTMLElement>('[data-banner-controls]');
  const previous = carousel.querySelector<HTMLButtonElement>('[data-banner-prev]');
  const next = carousel.querySelector<HTMLButtonElement>('[data-banner-next]');
  const status = carousel.querySelector<HTMLElement>('[data-banner-status]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  const interval = 10000;
  let touching = false;
  let hovered = false;
  let onScreen = false;
  let timer = 0;
  let suppressClickUntil = 0;

  const syncPlayback = () => {
    window.clearTimeout(timer);
    const focused = slides.some((slide) => slide.contains(document.activeElement)) || carousel.querySelector(':focus-visible');
    const playing = slides.length > 1 && !reducedMotion.matches && onScreen && !hovered && !touching && !document.hidden && !focused;
    carousel.dataset.bannerPlaying = String(playing);
    if (playing) {
      timer = window.setTimeout(() => { show(current + 1); syncPlayback(); }, interval);
    }
  };
  const show = (index: number, announce = false) => {
    current = (index + slides.length) % slides.length;
    carousel.dataset.bannerCurrent = String(current);
    slides.forEach((slide, number) => {
      const active = number === current;
      slide.inert = !active;
      slide.setAttribute('aria-hidden', String(!active));
    });
    // Load neighboring posters before their fade begins so the first rotation does not flash blank.
    [current, (current + 1) % slides.length, (current + slides.length - 1) % slides.length].forEach((index) => {
      slides[index].querySelectorAll<HTMLImageElement>('img').forEach((image) => {
        image.loading = 'eager';
        void image.decode().catch(() => { /* Keep the image's normal fallback if loading fails. */ });
      });
    });
    if (announce && status) status.textContent = `${current + 1} / ${slides.length}, ${slides[current].dataset.bannerTitle}`;
  };
  const manual = (index: number) => {
    // Arrow/swipe navigation can originate in a slide that is about to become inert.
    if (slides[current].contains(document.activeElement)) {
      (index > current ? next : previous)?.focus({ preventScroll: true });
    }
    show(index, true);
    syncPlayback();
  };

  carousel.classList.add('is-ready');
  if (controls && slides.length > 1) controls.hidden = false;
  show(0);
  // Paint only the welcome banner before enabling transitions between slides.
  requestAnimationFrame(() => requestAnimationFrame(() => carousel.classList.add('is-animated')));
  previous?.addEventListener('click', () => manual(current - 1));
  next?.addEventListener('click', () => manual(current + 1));
  carousel.addEventListener('focusin', syncPlayback);
  carousel.addEventListener('focusout', () => queueMicrotask(syncPlayback));
  carousel.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') { hovered = true; syncPlayback(); }
  });
  carousel.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') { hovered = false; syncPlayback(); }
  });
  carousel.addEventListener('keydown', (event) => {
    if (slides.length < 2 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    // 슬라이드 안의 링크·버튼에서는 화살표 키를 가로채지 않습니다 (배너 컨트롤 위에서만 좌우 키로 넘깁니다)
    if (!controls?.contains(event.target as Node)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); manual(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', syncPlayback);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.15;
      syncPlayback();
    }, { threshold: 0.15 }).observe(viewport);
  } else {
    onScreen = true;
  }

  let touchStart: { x: number; y: number } | null = null;
  viewport.addEventListener('touchstart', (event) => {
    touching = true;
    syncPlayback();
    if (event.touches.length !== 1) { touchStart = null; return; }
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  viewport.addEventListener('touchend', (event) => {
    touching = event.touches.length > 0;
    syncPlayback();
    if (!touchStart || slides.length < 2) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return;
    suppressClickUntil = Date.now() + 600;
    manual(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
  viewport.addEventListener('touchcancel', () => { touchStart = null; touching = false; syncPlayback(); });
  viewport.addEventListener('click', (event) => {
    if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  syncPlayback();
});
