/** Header disclosures share one explicit state for pointer and keyboard users. */
function initNav() {
  const header = document.querySelector<HTMLElement>('.site-header');
  if (!header) return;
  const toggle = header.querySelector<HTMLButtonElement>('.nav-toggle');
  const nav = header.querySelector<HTMLElement>('#site-nav');
  const backdrop = header.querySelector<HTMLElement>('[data-nav-backdrop]');
  const buttons = Array.from(header.querySelectorAll<HTMLButtonElement>('.site-nav__link[aria-controls]'));
  const desktop = window.matchMedia('(min-width: 992px)');
  const inertBeforeOpen = new Map<HTMLElement, boolean>();
  let drawerOpen = false;

  const menuOf = (button: HTMLButtonElement) => document.getElementById(button.getAttribute('aria-controls') ?? '');
  const isOpen = (button: HTMLButtonElement) => button.getAttribute('aria-expanded') === 'true';
  const setMenu = (button: HTMLButtonElement, open: boolean) => {
    menuOf(button)?.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
  };
  const closeMenus = (except?: HTMLButtonElement) => buttons.forEach((button) => {
    if (button !== except) setMenu(button, false);
  });
  const focusable = () => Array.from(header.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');

  const setDrawer = (open: boolean, restoreFocus = false) => {
    if (!nav || !toggle) return;
    drawerOpen = open && !desktop.matches;
    nav.dataset.open = String(drawerOpen);
    toggle.setAttribute('aria-expanded', String(drawerOpen));
    toggle.setAttribute('aria-label', drawerOpen ? '메뉴 닫기' : '메뉴 열기');
    document.body.classList.toggle('drawer-open', drawerOpen);
    if (backdrop) backdrop.hidden = !drawerOpen;
    if (drawerOpen) {
      header.setAttribute('role', 'dialog');
      header.setAttribute('aria-modal', 'true');
      header.setAttribute('aria-label', '전체 메뉴');
      for (const element of Array.from(document.body.children)) {
        if (element instanceof HTMLElement && element !== header && !['SCRIPT', 'STYLE'].includes(element.tagName)) {
          inertBeforeOpen.set(element, element.inert);
          element.inert = true;
        }
      }
      (buttons[0] ?? toggle).focus();
    } else {
      header.removeAttribute('role');
      header.removeAttribute('aria-modal');
      header.removeAttribute('aria-label');
      for (const [element, wasInert] of inertBeforeOpen) element.inert = wasInert;
      inertBeforeOpen.clear();
      closeMenus();
      if (restoreFocus) toggle.focus();
    }
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const open = isOpen(button);
      if (desktop.matches) closeMenus(button);
      setMenu(button, !open);
    });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      if (desktop.matches) closeMenus(button);
      setMenu(button, true);
      menuOf(button)?.querySelector<HTMLElement>('a[href]')?.focus();
    });
    const item = button.closest<HTMLElement>('.has-menu');
    item?.addEventListener('pointerenter', (event) => {
      if (!desktop.matches || event.pointerType === 'touch') return;
      closeMenus(button);
      setMenu(button, true);
    });
    item?.addEventListener('pointerleave', () => {
      if (desktop.matches && !item.contains(document.activeElement)) setMenu(button, false);
    });
    item?.addEventListener('focusout', () => {
      requestAnimationFrame(() => {
        if (desktop.matches && !item.contains(document.activeElement)) setMenu(button, false);
      });
    });
  });

  toggle?.addEventListener('click', () => setDrawer(!drawerOpen, drawerOpen));
  backdrop?.addEventListener('click', () => setDrawer(false, true));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (drawerOpen) {
        event.preventDefault();
        setDrawer(false, true);
      } else {
        const openButton = buttons.find(isOpen);
        if (openButton) {
          event.preventDefault();
          closeMenus();
          openButton.focus();
        }
      }
    }
    if (event.key === 'Tab' && drawerOpen) {
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && (document.activeElement === first || !header.contains(document.activeElement))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !header.contains(document.activeElement))) {
        event.preventDefault();
        first?.focus();
      }
    }
  });
  document.addEventListener('click', (event) => {
    if (desktop.matches && !header.contains(event.target as Node)) closeMenus();
  });
  nav?.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a[href]') && drawerOpen) setDrawer(false);
  });
  desktop.addEventListener('change', () => setDrawer(false));
}

initNav();
