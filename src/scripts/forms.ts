/** Progressive enhancement for public contact and baptism forms. */
document.querySelectorAll<HTMLInputElement>('input[name="_next"]').forEach((input) => {
  try {
    const destination = new URL(input.value, location.origin);
    input.value = new URL(destination.pathname + destination.search, location.origin).href;
  } catch { /* Keep the native form destination if it cannot be parsed. */ }
});

const isPublicField = (element: unknown): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
  element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement ||
  (element instanceof HTMLInputElement && !['hidden', 'submit', 'button', 'file'].includes(element.type));

document.querySelectorAll<HTMLFormElement>('form[data-public-form]').forEach((form) => {
  // The Worker typings also declare an HTMLRewriter Element; narrow actual DOM
  // instances instead of constraining select elements to that merged interface.
  const fields = (Array.from(form.querySelectorAll('input,textarea,select')) as unknown[]).filter(isPublicField).filter((field) => !field.name.startsWith('_'));
  const feedback = form.querySelector<HTMLElement>('[data-public-feedback]');
  const status = form.querySelector<HTMLElement>('[data-public-status]');
  const fallback = form.querySelector<HTMLElement>('[data-public-fallback]');
  const offer = form.querySelector<HTMLElement>('[data-draft-offer]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const submitLabel = submit?.innerHTML ?? '';
  const key = 'ckgmc:public-draft:' + form.dataset.publicForm;
  const initial = () => JSON.stringify(fields.map((field) => [field.name, field.value]));
  let baseline = initial();
  let pending = false;
  let leavingAfterSubmit = false;
  let dirty = false;
  form.noValidate = true;
  if (feedback) feedback.hidden = false;

  const announce = (message: string, error = false) => {
    if (!status) return;
    status.hidden = false;
    status.dataset.state = error ? 'error' : 'info';
    status.setAttribute('role', error ? 'alert' : 'status');
    status.textContent = message;
  };
  const clearDraft = () => {
    try { sessionStorage.removeItem(key); } catch { /* Storage can be disabled. */ }
    if (offer) offer.hidden = true;
  };
  let draft: Record<string, string> | null = null;
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) draft = parsed;
    }
  } catch { /* Storage is optional; sending and validation do not depend on it. */ }
  if (offer && draft) {
    form.insertBefore(offer, form.firstChild);
    offer.hidden = false;
  }
  form.querySelector('[data-draft-restore]')?.addEventListener('click', () => {
    for (const field of fields) {
      if (typeof draft?.[field.name] === 'string') field.value = draft[field.name];
    }
    dirty = initial() !== baseline;
    if (offer) offer.hidden = true;
    announce('임시 저장한 내용을 불러왔습니다. 확인 후 전송해 주세요.');
    fields[0]?.focus();
  });
  form.querySelector('[data-draft-discard]')?.addEventListener('click', () => {
    clearDraft();
    draft = null;
    announce('이 탭의 임시 저장 내용을 삭제했습니다.');
  });
  form.querySelector('[data-draft-save]')?.addEventListener('click', () => {
    try {
      sessionStorage.setItem(key, JSON.stringify(Object.fromEntries(fields.map((field) => [field.name, field.value]))));
      announce('이 탭에 임시 저장했습니다. 새로고침 후 불러올 수 있으며, 교회에는 아직 전송되지 않았습니다.');
    } catch {
      announce('이 브라우저에서는 임시 저장을 사용할 수 없습니다. 화면을 닫기 전에 내용을 복사해 주세요.', true);
    }
  });

  const validate = (field: typeof fields[number]) => {
    let message = '';
    if (field.required && !field.value.trim()) message = '이 항목을 입력해 주세요.';
    else if (field.validity.typeMismatch && field instanceof HTMLInputElement && field.type === 'email') message = '이메일 주소를 확인해 주세요. 예: name@example.com';
    else if (!field.validity.valid) message = '입력 형식을 확인해 주세요.';
    const errorId = field.id + '-error';
    let error = document.getElementById(errorId);
    if (!error && message) {
      error = document.createElement('p');
      error.id = errorId;
      error.className = 'public-field-error';
      field.insertAdjacentElement('afterend', error);
      const descriptions = new Set((field.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean));
      descriptions.add(errorId);
      field.setAttribute('aria-describedby', [...descriptions].join(' '));
    }
    if (error) { error.textContent = message; error.hidden = !message; }
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return !message;
  };
  fields.forEach((field) => {
    field.addEventListener('input', () => {
      dirty = initial() !== baseline;
      if (field.hasAttribute('aria-invalid')) validate(field);
    });
    field.addEventListener('change', () => { dirty = initial() !== baseline; });
  });
  window.addEventListener('beforeunload', (event) => {
    if (dirty && !leavingAfterSubmit) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('pageshow', () => {
    leavingAfterSubmit = false;
    if (submit && !pending) { submit.disabled = false; submit.innerHTML = submitLabel; }
    form.removeAttribute('aria-busy');
  });

  form.addEventListener('submit', async (event) => {
    if (pending || leavingAfterSubmit) { event.preventDefault(); return; }
    const invalid = fields.filter((field) => !validate(field));
    if (invalid.length) {
      event.preventDefault();
      announce('입력 내용을 확인해 주세요. 표시된 항목을 수정하면 전송할 수 있습니다.', true);
      invalid[0].focus();
      return;
    }
    const endpoint = new URL(form.action);
    const formSubmit = endpoint.protocol === 'https:' && endpoint.hostname === 'formsubmit.co';
    const formspree = endpoint.protocol === 'https:' && endpoint.hostname === 'formspree.io';
    if (!formSubmit && !formspree) {
      // Other providers keep their normal form flow instead of assuming an API.
      leavingAfterSubmit = true;
      if (submit) submit.disabled = true;
      announce('전송 중입니다. 접수 확인 화면이 나올 때까지 기다려 주세요.');
      return;
    }
    event.preventDefault();
    pending = true;
    const payload = new FormData(form);
    const disabledBeforeSubmit = fields.map((field) => field.disabled);
    fields.forEach((field) => { field.disabled = true; });
    form.setAttribute('aria-busy', 'true');
    if (submit) { submit.disabled = true; submit.textContent = '전송 중…'; }
    if (fallback) fallback.hidden = true;
    announce('전송 중입니다. 잠시만 기다려 주세요.');
    if (formSubmit && !endpoint.pathname.startsWith('/ajax/')) endpoint.pathname = '/ajax' + endpoint.pathname;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(endpoint.href, {
        method: 'POST', body: payload, headers: { Accept: 'application/json' }, signal: controller.signal,
      });
      const result: { success?: string | boolean; ok?: boolean; errors?: unknown } = await response.json();
      const accepted = formSubmit ? result.success === true || result.success === 'true' : result.ok === true;
      if (!response.ok || !accepted) throw new Error('Submission not acknowledged');
      clearDraft();
      dirty = false;
      baseline = initial();
      leavingAfterSubmit = true;
      announce('접수되었습니다. 확인 화면으로 이동합니다.');
      const next = form.querySelector<HTMLInputElement>('input[name="_next"]')?.value;
      const destination = new URL(next || '/thanks', location.origin);
      location.assign(destination.origin === location.origin ? destination.href : '/thanks');
    } catch {
      announce('전송 완료를 확인하지 못했습니다. 입력 내용은 그대로 남아 있습니다. 접수 여부를 확인한 뒤 다시 전송하거나 아래 연락처로 문의해 주세요.', true);
      if (fallback) fallback.hidden = false;
      status?.focus();
      if (submit) submit.textContent = '다시 전송하기';
    } finally {
      window.clearTimeout(timeout);
      pending = false;
      fields.forEach((field, index) => { field.disabled = disabledBeforeSubmit[index]; });
      form.removeAttribute('aria-busy');
      if (submit) submit.disabled = leavingAfterSubmit;
    }
  });
});
