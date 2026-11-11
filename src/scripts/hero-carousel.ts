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
  const toggle = carousel.querySelector<HTMLButtonElement>('[data-banner-toggle]');
  const dots = [...carousel.querySelectorAll<HTMLButtonElement>('[data-banner-dot]')];
  const count = carousel.querySelector<HTMLElement>('[data-banner-count]');
  const status = carousel.querySelector<HTMLElement>('[data-banner-status]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let playing = slides.length > 1 && !reducedMotion.matches;
  let hovered = false;
  let onScreen = false;
  let timer = 0;
  let pointerToggleAction = false;
  let suppressClickUntil = 0;

  const syncPlayback = () => {
    window.clearTimeout(timer);
    carousel.dataset.bannerPlaying = String(playing);
    if (toggle) {
      toggle.textContent = playing ? '일시정지' : '자동 재생';
      toggle.setAttribute('aria-label', playing ? '배너 자동 넘김 일시정지' : '배너 자동 넘김 시작');
    }
    if (playing && onScreen && !hovered && !document.hidden) {
      timer = window.setTimeout(() => { show(current + 1); syncPlayback(); }, 6000);
    }
  };
  const setPlaying = (value: boolean) => { playing = slides.length > 1 && value; syncPlayback(); };
  const show = (index: number, announce = false) => {
    current = (index + slides.length) % slides.length;
    carousel.dataset.bannerCurrent = String(current);
    slides.forEach((slide, number) => {
      const active = number === current;
      slide.inert = !active;
      slide.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, number) => {
      if (number === current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    track.style.transform = `translateX(-${current * 100}%)`;
    if (count) count.textContent = `${current + 1} / ${slides.length}`;
    if (announce && status) status.textContent = `${current + 1} / ${slides.length}, ${slides[current].dataset.bannerTitle}`;
  };
  const manual = (index: number) => {
    setPlaying(false);
    // Arrow/swipe navigation can originate in a slide that is about to become inert.
    if (slides[current].contains(document.activeElement)) {
      (index > current ? next : previous)?.focus({ preventScroll: true });
    }
    show(index, true);
  };

  carousel.classList.add('is-ready');
  if (controls && slides.length > 1) controls.hidden = false;
  show(0);
  previous?.addEventListener('click', () => manual(current - 1));
  next?.addEventListener('click', () => manual(current + 1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => manual(index)));
  // Remember the pointer's intended action before focusin pauses playback.
  toggle?.addEventListener('pointerdown', () => { pointerToggleAction = !playing; });
  toggle?.addEventListener('click', (event) => setPlaying(event.detail > 0 ? pointerToggleAction : !playing));
  carousel.addEventListener('focusin', () => setPlaying(false));
  carousel.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') { hovered = true; syncPlayback(); }
  });
  carousel.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') { hovered = false; syncPlayback(); }
  });
  carousel.addEventListener('keydown', (event) => {
    if (slides.length < 2 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); manual(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) setPlaying(false); });
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
    if (event.touches.length !== 1) { touchStart = null; return; }
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    setPlaying(false);
  }, { passive: true });
  viewport.addEventListener('touchend', (event) => {
    if (!touchStart || slides.length < 2) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return;
    suppressClickUntil = Date.now() + 600;
    manual(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
  viewport.addEventListener('touchcancel', () => { touchStart = null; });
  viewport.addEventListener('click', (event) => {
    if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  syncPlayback();
});
