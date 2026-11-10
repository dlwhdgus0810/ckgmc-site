/**
 * 헤더 메뉴 동작 (jQuery/Bootstrap JS 없이 순수 JS)
 * - 데스크톱: 섹션 버튼 클릭/호버로 하위 메뉴 열기, Esc·바깥 클릭으로 닫기 (포커스는 버튼으로 복귀)
 * - 모바일: 햄버거 버튼으로 드로어 열기, 섹션은 아코디언, Esc 로 닫기, 열려 있을 때 배경 스크롤 잠금
 */
function initNav() {
  const header = document.querySelector<HTMLElement>('.site-header');
  if (!header) return;
  const toggle = header.querySelector<HTMLButtonElement>('.nav-toggle');
  const nav = header.querySelector<HTMLElement>('#site-nav');
  const buttons = Array.from(header.querySelectorAll<HTMLButtonElement>('.site-nav__link[aria-controls]'));
  const desktop = window.matchMedia('(min-width: 992px)');

  const menuOf = (btn: HTMLButtonElement) => document.getElementById(btn.getAttribute('aria-controls') ?? '');
  const isOpen = (btn: HTMLButtonElement) => menuOf(btn)?.classList.contains('is-open') ?? false;
  /** aria-expanded 를 실제로 보이는 상태에 맞춥니다 — 데스크톱에서는 클릭 말고도 호버·포커스(CSS)로 열리기 때문 */
  const syncExpanded = (btn: HTMLButtonElement) => {
    const item = btn.closest('.has-menu');
    const shownByCss = desktop.matches && !!item && (item.matches(':hover') || item.matches(':focus-within'));
    btn.setAttribute('aria-expanded', String(isOpen(btn) || shownByCss));
  };
  const setMenu = (btn: HTMLButtonElement, open: boolean) => {
    menuOf(btn)?.classList.toggle('is-open', open);
    syncExpanded(btn);
  };
  const closeMenus = (except?: HTMLButtonElement) => buttons.forEach((b) => b !== except && setMenu(b, false));

  const setDrawer = (open: boolean) => {
    if (!nav || !toggle) return;
    nav.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    document.body.classList.toggle('drawer-open', open);
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = isOpen(btn);
      if (desktop.matches) closeMenus(btn);
      setMenu(btn, !open);
    });
    const item = btn.closest('.has-menu');
    for (const type of ['mouseenter', 'mouseleave', 'focusin']) item?.addEventListener(type, () => syncExpanded(btn));
    // focusout 시점에는 아직 :focus-within 이 남아 있으므로 한 박자 뒤에 확인
    item?.addEventListener('focusout', () => setTimeout(() => syncExpanded(btn)));
  });

  toggle?.addEventListener('click', () => setDrawer(nav?.dataset.open !== 'true'));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openBtn = buttons.find(isOpen);
    if (desktop.matches) {
      if (openBtn) { closeMenus(); openBtn.focus(); }
    } else if (nav?.dataset.open === 'true') {
      setDrawer(false);
      toggle?.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (desktop.matches && !header.contains(e.target as Node)) closeMenus();
  });

  // 화면 크기가 바뀌면 열린 상태를 초기화
  desktop.addEventListener('change', () => { closeMenus(); setDrawer(false); });
}

initNav();
