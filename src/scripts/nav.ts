/** 모바일 메뉴 버튼과 드롭다운 메뉴 동작 (jQuery/Bootstrap JS 없이 순수 JS) */
function initNav() {
  const toggler = document.querySelector<HTMLButtonElement>('.mobile-navbar-toggler');
  const menu = document.getElementById('mainNav');
  if (toggler && menu) {
    toggler.addEventListener('click', () => {
      const open = menu.classList.toggle('show');
      toggler.setAttribute('aria-expanded', String(open));
    });
  }

  const closeAll = () => {
    document.querySelectorAll('#main-navigation .dropdown.show').forEach((d) => {
      d.classList.remove('show');
      d.querySelector('.dropdown-menu')?.classList.remove('show');
    });
  };

  document.querySelectorAll<HTMLAnchorElement>('#main-navigation .dropdown-toggle').forEach((toggle) => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const dd = toggle.parentElement!;
      const wasOpen = dd.classList.contains('show');
      closeAll();
      if (!wasOpen) {
        dd.classList.add('show');
        dd.querySelector('.dropdown-menu')?.classList.add('show');
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('#main-navigation')) closeAll();
  });
}

initNav();
