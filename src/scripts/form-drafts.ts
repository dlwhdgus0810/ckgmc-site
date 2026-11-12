/** Per-user, per-form drafts kept only in this browser tab. Never stores passwords or file bytes. */
export interface DraftControl { name: string; type: string; value: string; checked: boolean; index: number }
export interface FormDraft { controls: DraftControl[]; lists: Record<string, number>; updatedAt: number; files: string[] }
const prefix = 'ckgmc:draft:v1:';
type FormControl = HTMLInputElement | HTMLTextAreaElement | (HTMLSelectElement & HTMLElement);
const supported = (el: unknown): el is FormControl =>
  el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;
const draftable = (el: Element) => supported(el) && !!el.name && !el.disabled &&
  !['password', 'file', 'submit', 'button'].includes(el.type) &&
  (el.type !== 'hidden' || el.name.endsWith('__current')) && !/token|password|csrf/i.test(el.name);
export function clearFormDraft(key: string) { try { sessionStorage.removeItem(prefix + key); } catch { /* storage may be disabled */ } }
function read(key: string): FormDraft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(prefix + key) ?? 'null');
    return value && Array.isArray(value.controls) && value.controls.every((c: DraftControl) => c && typeof c.name === 'string' && typeof c.value === 'string' && Number.isInteger(c.index) && c.index >= 0) && value.lists && typeof value.lists === 'object' && Object.values(value.lists).every((n) => Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 500) && Array.isArray(value.files) && value.updatedAt > Date.now() - 24 * 60 * 60 * 1000 ? value : null;
  } catch { return null; }
}
function snapshot(form: HTMLFormElement): FormDraft {
  form.dispatchEvent(new CustomEvent('draft:before-snapshot'));
  const indices = new Map<string, number>();
  const controls = Array.from(form.elements).filter(draftable).map((el) => {
    const input = el as HTMLInputElement; const index = indices.get(input.name) ?? 0;
    indices.set(input.name, index + 1);
    return { name: input.name, type: input.type, value: input.value, checked: !!input.checked, index };
  });
  const lists = Object.fromEntries(Array.from(form.querySelectorAll<HTMLElement>('[data-list]')).map((el) => [el.dataset.list!, el.querySelector('[data-list-rows]')?.children.length ?? 0]));
  const files = Array.from(form.querySelectorAll<HTMLInputElement>('input[type=file]')).flatMap((el) => Array.from(el.files ?? []).map((f) => f.name));
  return { controls, lists, files, updatedAt: Date.now() };
}
const signature = (draft: FormDraft) => JSON.stringify([draft.controls, draft.lists, draft.files]);
export function initFormDrafts(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-draft-clear]').forEach((el) => { clearFormDraft(el.dataset.draftClear!); el.removeAttribute('data-draft-clear'); });
  root.querySelectorAll<HTMLFormElement>('form[data-draft-key]').forEach((form) => {
    if (form.dataset.draftReady) return;
    form.dataset.draftReady = 'true';
    const key = form.dataset.draftKey!;
    const initial = snapshot(form);
    const baseline = signature(initial);
    const failedSubmit = form.dataset.serverErrors === 'true' || !!form.querySelector('[aria-invalid="true"]');
    let dirty = failedSubmit, submitting = false;
    let status = form.querySelector<HTMLElement>('[data-draft-status]');
    if (!status) { status = document.createElement('p'); status.className = 'small text-muted'; status.dataset.draftStatus = ''; status.setAttribute('role', 'status'); form.insertBefore(status, form.firstChild); }
    const banner = document.createElement('div'); banner.className = 'alert alert-info'; banner.hidden = true; banner.setAttribute('role', 'status'); form.insertBefore(banner, form.firstChild);
    const setStatus = (saved = true) => { status!.textContent = dirty ? `저장하지 않은 변경사항이 있습니다.${saved ? ' 이 탭에 임시 보관했습니다.' : ' 이 브라우저에서는 임시 보관할 수 없습니다.'}` : '변경사항이 없습니다.'; };
    const save = () => {
      if (submitting) return;
      const draft = snapshot(form); dirty = failedSubmit || signature(draft) !== baseline;
      let saved = true;
      try { if (dirty) sessionStorage.setItem(prefix + key, JSON.stringify(draft)); else clearFormDraft(key); } catch { saved = false; }
      setStatus(saved);
      if (dirty && form.hasAttribute('data-content-form')) {
        const original = new Map(initial.controls.map((c) => [c.name + ':' + c.index, JSON.stringify(c)]));
        const current = new Map(draft.controls.map((c) => [c.name + ':' + c.index, JSON.stringify(c)]));
        const changed = [...new Set([...original.keys(), ...current.keys()])].filter((name) => original.get(name) !== current.get(name)).length;
        status!.textContent += ` 변경된 입력 ${changed}개${draft.files.length ? ` · 선택한 파일 ${draft.files.length}개` : ''}. 게시 전 변경 미리보기에서 확인하세요.`;
      }
    };
    const saved = read(key);
    if (saved && signature(saved) !== baseline) {
      banner.hidden = false;
      const text = document.createElement('p'); text.textContent = '이 탭에 저장하지 않은 입력이 있습니다. 복원하면 현재 입력을 대체합니다. 파일은 다시 선택해 주세요.'; banner.appendChild(text);
      const restore = document.createElement('button'); restore.type = 'button'; restore.className = 'btn btn-outline-primary btn-sm mr-2'; restore.textContent = '임시 입력 복원';
      const discard = document.createElement('button'); discard.type = 'button'; discard.className = 'btn btn-link btn-sm'; discard.textContent = '임시 입력 삭제';
      banner.appendChild(restore); banner.appendChild(discard);
      restore.addEventListener('click', () => {
        form.dispatchEvent(new CustomEvent('draft:before-restore', { detail: saved }));
        saved.controls.forEach((item) => {
          const els = Array.from(form.elements).filter((el) => draftable(el) && (el as HTMLInputElement).name === item.name);
          const el = els[item.index] as HTMLInputElement | undefined;
          if (!el) return;
          if (el.type === 'checkbox' || el.type === 'radio') el.checked = item.checked; else el.value = item.value;
        });
        form.dispatchEvent(new CustomEvent('draft:restored', { detail: saved }));
        banner.hidden = true; save();
      });
      discard.addEventListener('click', () => { clearFormDraft(key); banner.hidden = true; setStatus(); });
    }
    if (failedSubmit) save(); else setStatus();
    form.addEventListener('input', save); form.addEventListener('change', save); form.addEventListener('draft:changed', save);
    form.addEventListener('submit', (event) => { setTimeout(() => { if (!event.defaultPrevented) { save(); submitting = true; } }, 0); });
    window.addEventListener('pageshow', () => { submitting = false; });
    window.addEventListener('beforeunload', (event) => { if (dirty && !submitting) { event.preventDefault(); event.returnValue = ''; } });
  });
}
