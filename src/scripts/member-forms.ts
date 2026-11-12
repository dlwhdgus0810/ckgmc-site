/**
 * 교인 공간·관리 화면의 모든 전송 폼(POST)에 공통으로 붙는 동작.
 * - 한 번만 전송: 버튼을 두 번 누르거나 두 번 탭해도 보고서·글이 두 건 올라가지 않게 합니다.
 * - 로그아웃할 때 이 탭에 임시 보관된 입력(보고서 초안)을 지웁니다. 같이 쓰는 컴퓨터에 남지 않게.
 */
const DRAFT_PREFIX = 'ckgmc:draft:v1:';

export function initMemberForms(root: ParentNode = document) {
  root.querySelectorAll<HTMLFormElement>('form').forEach((form) => {
    if (form.method.toLowerCase() !== 'post' || form.dataset.submitOnce) return;
    form.dataset.submitOnce = 'ready';
    const buttons = () => form.querySelectorAll<HTMLButtonElement>('button[type="submit"], button:not([type])');
    form.addEventListener('submit', (event) => {
      if (form.dataset.submitOnce !== 'ready') { event.preventDefault(); return; }
      form.dataset.submitOnce = 'checking';
      // 필수 항목 검사나 "삭제할까요?" 확인이 전송을 취소했는지는 다른 처리들이 모두 끝난 뒤에야 알 수 있습니다
      setTimeout(() => {
        if (event.defaultPrevented) { form.dataset.submitOnce = 'ready'; return; }
        form.dataset.submitOnce = 'sent';
        form.setAttribute('aria-busy', 'true');
        // disabled 로 바꾸면 버튼의 name/value 가 전송에서 빠지므로 aria-disabled 로만 표시합니다
        buttons().forEach((button) => button.setAttribute('aria-disabled', 'true'));
        if (form.getAttribute('action') === '/auth/logout') clearDrafts();
      }, 0);
    });
  });
}

function clearDrafts() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch { /* 저장소를 쓸 수 없는 브라우저 */ }
}

// 전송 뒤 "뒤로"로 돌아온 화면에서는 다시 보낼 수 있어야 합니다
window.addEventListener('pageshow', () => {
  document.querySelectorAll<HTMLFormElement>('form[data-submit-once]').forEach((form) => {
    form.dataset.submitOnce = 'ready';
    form.removeAttribute('aria-busy');
    form.querySelectorAll('button[aria-disabled="true"]').forEach((button) => button.removeAttribute('aria-disabled'));
  });
});
