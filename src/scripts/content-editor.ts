/**
 * 콘텐츠 편집 화면 동작: 목록 항목 추가/삭제, 서식 편집기(Quill), 사진 올리기
 */
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { shrinkImage, shrinkSummary } from './image-shrink';
import { initFormDrafts, type FormDraft } from './form-drafts';
type FormControl = HTMLInputElement | HTMLTextAreaElement | (HTMLSelectElement & HTMLElement);

// List indices must follow DOM order: collectValues sorts numeric indices on the server.
function initLists(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-list]').forEach((list) => {
    if (list.dataset.listReady) return;
    list.dataset.listReady = 'true';
    const rows = list.querySelector<HTMLElement>('[data-list-rows]');
    const tpl = list.querySelector<HTMLTemplateElement>('[data-list-template]');
    const undo = list.querySelector<HTMLButtonElement>('[data-list-undo]');
    const status = list.querySelector<HTMLElement>('[data-list-status]');
    let removed: { row: HTMLElement; index: number } | null = null;
    const renumber = () => {
      Array.from(rows?.children ?? []).forEach((node, i, nodes) => {
        const row = node as HTMLElement;
        const label = row.querySelector('.cf-list__row-head > span');
        if (label) label.textContent = label.textContent!.replace(/\s*\d*$/, '') + ' ' + (i + 1);
        row.querySelectorAll<HTMLInputElement>('[name]').forEach((input) => {
          const old = input.name;
          const head = list.dataset.list! + '[';
          if (!old.startsWith(head)) return;
          const next = head + i + old.slice(old.indexOf(']', head.length));
          input.name = next;
          if (input.id) {
            const oldId = input.id; input.id = 'f-' + next.replace(/[^\w-]+/g, '-');
            row.querySelectorAll<HTMLLabelElement>('label').forEach((l) => { if (l.htmlFor === oldId) l.htmlFor = input.id; });
            const hint = row.querySelector<HTMLElement>(`[id="${oldId}-hint"]`);
            if (hint) { hint.id = input.id + '-hint'; input.setAttribute('aria-describedby', hint.id); }
          }
        });
        const up = row.querySelector<HTMLButtonElement>('[data-list-up]');
        const down = row.querySelector<HTMLButtonElement>('[data-list-down]');
        if (up) { up.disabled = i === 0; up.setAttribute('aria-label', `${label?.textContent ?? '항목'} 위로 이동`); }
        if (down) { down.disabled = i === nodes.length - 1; down.setAttribute('aria-label', `${label?.textContent ?? '항목'} 아래로 이동`); }
        row.querySelector('[data-list-remove]')?.setAttribute('aria-label', `${label?.textContent ?? '항목'} 삭제`);
      });
    };
    const add = () => {
      if (!rows || !tpl) return;
      const wrap = document.createElement('div'); wrap.innerHTML = tpl.innerHTML.replace(/__IDX__/g, String(rows.children.length));
      const row = wrap.firstElementChild as HTMLElement; rows.appendChild(row); renumber(); return row;
    };
    list.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('button');
      if (!button || button.closest('[data-list]') !== list || !rows) return;
      const row = button.closest<HTMLElement>('[data-list-row]');
      if (button.hasAttribute('data-list-add')) { const added = add(); added?.querySelector<HTMLElement>('input:not([type=hidden]), textarea, select')?.focus(); if (status) status.textContent = '새 항목을 추가했습니다.'; }
      else if (button.hasAttribute('data-list-remove') && row) {
        removed = { row, index: Array.from(rows.children).indexOf(row) }; row.remove();
        if (undo) { undo.hidden = false; undo.focus(); } if (status) status.textContent = '항목을 삭제했습니다. 게시 전까지 취소할 수 있습니다.';
      } else if (button.hasAttribute('data-list-undo') && removed) {
        rows.insertBefore(removed.row, rows.children[removed.index] ?? null); removed = null;
        if (undo) undo.hidden = true; if (status) status.textContent = '삭제한 항목을 복원했습니다.';
      } else if (button.hasAttribute('data-list-up') && row?.previousElementSibling) { rows.insertBefore(row, row.previousElementSibling); }
      else if (button.hasAttribute('data-list-down') && row?.nextElementSibling) { rows.insertBefore(row.nextElementSibling, row); }
      else return;
      renumber();
      if (row && (button.hasAttribute('data-list-up') || button.hasAttribute('data-list-down'))) {
        if (status) status.textContent = `${Array.from(rows.children).indexOf(row) + 1}번째로 이동했습니다.`;
        (button.disabled ? row.querySelector<HTMLButtonElement>('button:not(:disabled)') : button)?.focus();
      }
      list.closest('form')?.dispatchEvent(new CustomEvent('draft:changed'));
    });
    list.closest('form')?.addEventListener('draft:before-restore', (event) => {
      const saved = (event as CustomEvent<FormDraft>).detail; const count = saved.lists[list.dataset.list!];
      if (count === undefined || !rows) return;
      while (rows.children.length > count) rows.lastElementChild?.remove();
      while (rows.children.length < count) if (!add()) break;
      renumber();
    });
    renumber();
  });
}
initLists();

// ── 사진 올리기 → 저장소에 커밋 → 주소 ───────────────────────────────
async function uploadImage(original: File): Promise<string> {
  const file = await shrinkImage(original); // 큰 사진은 올리기 전에 줄임
  const fd = new FormData();
  fd.append('file', file, file.name);
  const res = await fetch('/manage/content/upload', { method: 'POST', body: fd });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? `업로드 실패 (${res.status})`);
  return data.url;
}

// Include photo fields added dynamically to repeated lists.
document.addEventListener('change', async (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.matches('input[type="file"][accept^="image"]:not([data-inline-upload])')) return;
  input.parentElement?.querySelector('[data-image-status]')?.remove();
  const note = document.createElement('small'); note.dataset.imageStatus = '';
  note.className = 'text-muted d-block';
  note.setAttribute('role', 'status');
  input.insertAdjacentElement('afterend', note);
    const before = Array.from(input.files ?? []);
    if (!before.length || input.dataset.shrinking) return;
    const submits = Array.from(input.form?.querySelectorAll<HTMLButtonElement>('button[type="submit"]') ?? []);
    input.dataset.shrinking = '1';
    submits.forEach((b) => (b.disabled = true)); // 줄이는 동안 저장되지 않게
    note.textContent = '사진 크기를 줄이는 중…';
    try {
      const after = await Promise.all(before.map(shrinkImage));
      if (after.some((f, i) => f !== before[i])) {
        const dt = new DataTransfer();
        after.forEach((f) => dt.items.add(f));
        input.files = dt.files;
      }
      note.textContent = shrinkSummary(before, after);
    } catch {
      note.textContent = '';
    } finally {
      delete input.dataset.shrinking;
      submits.forEach((b) => (b.disabled = !!input.form?.querySelector('[data-shrinking]')));
    }
});

const inlineInput = document.querySelector<HTMLInputElement>('[data-inline-upload]');
const inlineResult = document.querySelector<HTMLElement>('[data-inline-upload-result]');
inlineInput?.addEventListener('change', async () => {
  const file = inlineInput.files?.[0];
  if (!file || !inlineResult) return;
  inlineResult.textContent = '올리는 중…';
  try {
    const url = await uploadImage(file);
    inlineResult.innerHTML = `주소: <code>${url}</code> `;
    const copy = document.createElement('button');
    copy.type = 'button'; copy.className = 'btn btn-link btn-sm p-0'; copy.textContent = '복사';
    copy.addEventListener('click', () => navigator.clipboard?.writeText(url));
    inlineResult.appendChild(copy);
    if (quill && !rawMode()) { const range = quill.getSelection(true); quill.insertEmbed(range.index, 'image', url, 'user'); }
  } catch (e) {
    inlineResult.textContent = e instanceof Error ? e.message : '업로드 실패';
  }
  inlineInput.value = '';
});

// ── 서식 편집기 ─────────────────────────────────────────────────────
const form = document.querySelector<HTMLFormElement>('[data-content-form]');
const holder = document.getElementById('quill-editor');
const textarea = document.querySelector<HTMLTextAreaElement>('textarea[name="body"]');
const toggle = document.querySelector<HTMLInputElement>('[data-raw-toggle]');
const rawMode = () => !!toggle?.checked;
let quillChanged = false;
let quill: Quill | null = null;

if (holder && textarea && form) {
  quill = new Quill(holder, {
    theme: 'snow',
    placeholder: '본문을 입력하세요',
    modules: {
      toolbar: {
        container: [
          [{ header: [2, 3, 4, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }, { align: [] }],
          ['blockquote', 'link', 'image', 'video'],
          ['clean'],
        ],
        handlers: {
          image() {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/*';
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file || !quill) return;
              const range = quill.getSelection(true);
              try { quill.insertEmbed(range.index, 'image', await uploadImage(file), 'user'); quill.setSelection(range.index + 1); }
              catch (e) { alert(e instanceof Error ? e.message : '업로드 실패'); }
            };
            input.click();
          },
        },
      },
    },
  });
  const load = (html: string) => { quill!.setContents(quill!.clipboard.convert({ html }), 'silent'); };
  load(textarea.value);
  const sync = () => { if (quillChanged && !rawMode()) { const html = quill!.getSemanticHTML(); textarea.value = quill!.getText().trim() === '' && !/<(img|iframe|video)/.test(html) ? '' : html; } };
  quill.on('text-change', (_delta, _old, source) => { if (source === 'user') { quillChanged = true; sync(); form.dispatchEvent(new CustomEvent('draft:changed')); } });
  form.addEventListener('draft:before-snapshot', sync);
  form.addEventListener('draft:restored', () => { load(textarea.value); quillChanged = false; });

  toggle?.addEventListener('change', () => {
    if (rawMode()) { if (quillChanged) textarea.value = quill!.getSemanticHTML(); textarea.classList.remove('d-none'); holder.classList.add('d-none'); }
    else { load(textarea.value); quillChanged = false; textarea.classList.add('d-none'); holder.classList.remove('d-none'); }
  });
  form.addEventListener('submit', () => {
    if (!rawMode() && quillChanged) {
      const html = quill!.getSemanticHTML();
      textarea.value = quill!.getText().trim() === '' && !/<(img|iframe|video)/.test(html) ? '' : html;
    }
  });
}

// Preserve existing page markup while editing individual text, link and image values.
const pageFields = document.querySelector<HTMLElement>('[data-page-fields]');
const pageSource = document.querySelector<HTMLInputElement>('[data-page-source]');
let pageDocument: Document | null = null;
const safeUrl = (value: string) => /^(https?:|mailto:|tel:|\/|#)/i.test(value.trim());
const renderPageFields = () => {
  if (!pageFields || !textarea) return;
  pageDocument = new DOMParser().parseFromString(textarea.value, 'text/html');
  pageFields.replaceChildren();
  const update = () => { textarea.value = pageDocument!.body.innerHTML; form?.dispatchEvent(new CustomEvent('draft:changed')); };
  const walker = pageDocument.createTreeWalker(pageDocument.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = []; let node: Node | null;
  while ((node = walker.nextNode())) if (node.textContent?.trim() && !(node.parentElement?.closest('script,style,iframe'))) nodes.push(node as Text);
  nodes.forEach((text, i) => {
    const label = document.createElement('label'); label.className = 'cf-page-field';
    const caption = document.createElement('span'); const tag = text.parentElement?.tagName ?? '';
    caption.textContent = `${/^H[1-6]$/.test(tag) ? '제목' : '문장'} ${i + 1}`;
    const input = document.createElement('textarea'); input.className = 'form-control'; input.value = text.textContent ?? ''; input.rows = input.value.length > 100 ? 3 : 2;
    input.addEventListener('input', () => { text.textContent = input.value; update(); }); label.appendChild(caption); label.appendChild(input); pageFields.appendChild(label);
  });
  pageDocument.querySelectorAll<HTMLAnchorElement | HTMLImageElement>('a[href],img[src]').forEach((el, i) => {
    const attribute = el.tagName === 'IMG' ? 'src' : 'href';
    const label = document.createElement('label'); label.className = 'cf-page-field';
    const caption = document.createElement('span'); caption.textContent = `${attribute === 'src' ? '사진 주소' : '링크 주소'} ${i + 1}`;
    const input = document.createElement('input'); input.className = 'form-control'; input.value = el.getAttribute(attribute) ?? ''; input.required = attribute === 'src' && !input.value; input.placeholder = 'https://… 또는 /images/…';
    input.addEventListener('input', () => { if (!safeUrl(input.value)) { input.setCustomValidity('http(s) 주소 또는 /로 시작하는 사이트 경로를 입력하세요.'); return; } input.setCustomValidity(''); el.setAttribute(attribute, input.value); update(); });
    label.appendChild(caption); label.appendChild(input); pageFields.appendChild(label);
    if (attribute === 'src') {
      const altLabel = document.createElement('label'); altLabel.className = 'cf-page-field';
      const altCaption = document.createElement('span'); altCaption.textContent = `사진 설명 ${i + 1}`;
      const alt = document.createElement('input'); alt.className = 'form-control'; alt.value = el.getAttribute('alt') ?? '';
      alt.addEventListener('input', () => { el.setAttribute('alt', alt.value); update(); });
      altLabel.appendChild(altCaption); altLabel.appendChild(alt); pageFields.appendChild(altLabel);
    }
  });
  if (!nodes.length) { const empty = document.createElement('p'); empty.className = 'text-muted'; empty.textContent = '아래에서 제목이나 문단을 추가하세요.'; pageFields.appendChild(empty); }
};
if (pageFields && textarea && pageSource) {
  renderPageFields(); textarea.classList.add('d-none');
  pageSource.addEventListener('change', () => { textarea.classList.toggle('d-none', !pageSource.checked); pageFields.hidden = pageSource.checked; if (!pageSource.checked) renderPageFields(); });
  form?.addEventListener('draft:restored', renderPageFields);
  document.querySelectorAll<HTMLButtonElement>('[data-add-block]').forEach((button) => button.addEventListener('click', () => {
    if (!pageDocument) return;
    if (pageSource.checked) pageDocument = new DOMParser().parseFromString(textarea.value, 'text/html');
    const kind = button.dataset.addBlock;
    const block = pageDocument.createElement(kind === 'heading' ? 'h2' : 'p');
    if (kind === 'image') { const img = pageDocument.createElement('img'); img.setAttribute('src', ''); img.setAttribute('alt', '사진 설명을 입력하세요'); block.appendChild(img); }
    else if (kind === 'link') { const link = pageDocument.createElement('a'); link.href = '/'; link.textContent = '링크 글자'; block.appendChild(link); }
    else block.textContent = kind === 'heading' ? '새 제목' : '새 문단';
    pageDocument.body.appendChild(block); textarea.value = pageDocument.body.innerHTML; renderPageFields(); form?.dispatchEvent(new CustomEvent('draft:changed')); pageFields.lastElementChild?.querySelector('input,textarea')?.scrollIntoView({ block: 'center' });
  }));
}

form?.addEventListener('draft:restored', (event) => {
  const saved = (event as CustomEvent<FormDraft>).detail;
  form.querySelectorAll<HTMLInputElement>('input[type=hidden][name$="__current"]').forEach((input) => {
    const wrap = input.closest('.cf-upload'); if (!wrap) return;
    let current = wrap.querySelector<HTMLElement>('.cf-upload__current');
    if (!current && input.value) {
      current = document.createElement('div'); current.className = 'cf-upload__current';
      if (wrap.closest('.cf-field--image')) { const img = document.createElement('img'); img.className = 'cf-upload__preview'; img.alt = ''; current.appendChild(img); }
      const link = document.createElement('a'); link.className = 'cf-upload__name'; link.target = '_blank'; link.rel = 'noopener'; current.appendChild(link);
      const label = document.createElement('label'); label.className = 'cf-upload__remove'; const remove = document.createElement('input'); remove.type = 'checkbox'; remove.name = input.name.replace(/__current$/, '__remove'); remove.value = '1'; remove.checked = saved.controls.find((c) => c.name === remove.name)?.checked ?? false; label.appendChild(remove); label.appendChild(document.createTextNode(' 삭제')); current.appendChild(label);
      wrap.insertBefore(current, input);
    }
    const image = wrap.querySelector<HTMLImageElement>('.cf-upload__preview');
    const link = wrap.querySelector<HTMLAnchorElement>('.cf-upload__name');
    if (current) current.hidden = !input.value;
    if (image) image.src = input.value;
    if (link) { link.href = input.value.startsWith('/') || /^https?:/.test(input.value) ? input.value : '/files/' + input.value; link.textContent = input.value.split('/').pop() ?? ''; }
    const file = wrap.querySelector<HTMLInputElement>('input[type=file]');
    if (file && input.value) file.required = false;
  });
});

// Section anchors open their disclosure; errors can reveal inputs inside closed sections.
function revealField(el: HTMLElement) { let p: HTMLElement | null = el; while (p) { if (p instanceof HTMLDetailsElement) p.open = true; p = p.parentElement; } el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
document.querySelectorAll<HTMLAnchorElement>('.cf-section-nav a').forEach((a) => a.addEventListener('click', () => {
  const target = document.getElementById(a.hash.slice(1)); if (target instanceof HTMLDetailsElement) target.open = true;
}));
const hashSection = document.getElementById(location.hash.slice(1));
if (hashSection instanceof HTMLDetailsElement) { hashSection.open = true; requestAnimationFrame(() => hashSection.scrollIntoView({ block: 'start' })); }
const errorBox = form?.querySelector<HTMLElement>('[data-editor-errors]');
form?.addEventListener('submit', (event) => {
  const invalid = Array.from(form.querySelectorAll<FormControl>('input,textarea,select')).filter((el) => !el.disabled && !el.validity.valid);
  if (invalid.length && errorBox) {
    event.preventDefault(); errorBox.hidden = false;
    const ul = errorBox.querySelector('ul')!; ul.replaceChildren();
    invalid.forEach((el) => {
      el.setAttribute('aria-invalid', 'true');
      const item = document.createElement('li'); const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-link p-0';
      const label = Array.from(form.querySelectorAll('label')).find((l) => el.id && l.htmlFor === el.id)?.textContent?.replace(/\s+/g, ' ').trim() || el.closest('label')?.querySelector('span')?.textContent || el.name;
      button.textContent = `${label}: ${el.validity.valueMissing ? '필수 항목을 입력해 주세요.' : '입력 형식을 확인해 주세요.'}`;
      button.addEventListener('click', () => revealField(el)); item.appendChild(button); ul.appendChild(item);
    }); revealField(invalid[0]);
  }
});
form?.addEventListener('input', (event) => { const el = event.target as HTMLInputElement; if (el.validity?.valid) el.removeAttribute('aria-invalid'); });
if (form?.dataset.serverErrors && errorBox) errorBox.focus();

// Preview uses current inputs and a sandbox with no scripts, forms or top navigation.
const dialog = document.querySelector<HTMLDialogElement>('[data-editor-preview]');
const previewFrame = document.querySelector<HTMLIFrameElement>('[data-preview-frame]');
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
form?.querySelector('[data-preview-open]')?.addEventListener('click', () => {
  if (!dialog || !previewFrame) return;
  form.dispatchEvent(new CustomEvent('draft:before-snapshot'));
  const preview = new DOMParser().parseFromString(textarea?.value ?? '', 'text/html');
  preview.querySelectorAll('script,style,link,iframe,object,embed,form,meta,base').forEach((el) => el.remove());
  preview.querySelectorAll('*').forEach((el) => Array.from(el.attributes).forEach((a) => { if (a.name.startsWith('on') || ((a.name === 'href' || a.name === 'src') && !safeUrl(a.value))) el.removeAttribute(a.name); }));
  const title = (form.elements.namedItem('title') as HTMLInputElement | null)?.value ?? (form.elements.namedItem('name') as HTMLInputElement | null)?.value ?? '현재 설정';
  const fields: string[] = [];
  form.querySelectorAll<FormControl>('input[name],textarea[name],select[name]').forEach((el) => {
    if (el.type === 'hidden' || el.name === 'body' || el.name.endsWith('__remove') || (el.type === 'checkbox' && !(el as HTMLInputElement).checked)) return;
    const value = el instanceof HTMLInputElement && el.type === 'file' ? Array.from(el.files ?? []).map((f) => f.name).join(', ') : el.value;
    if (!value) return;
    const label = Array.from(form.querySelectorAll('label')).find((l) => l.htmlFor === el.id)?.textContent?.trim() ?? el.name;
    fields.push(`<dt>${escape(label)}</dt><dd>${escape(value)}</dd>`);
  });
  previewFrame.srcdoc = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{font:16px/1.7 system-ui,sans-serif;color:#1b1f2a;padding:20px;overflow-wrap:anywhere}img{max-width:100%;height:auto}dt{font-weight:bold;margin-top:12px}dd{margin-left:0;white-space:pre-wrap}a{color:#223e7e}h1{font-size:1.7rem}.row{display:flex;flex-wrap:wrap;gap:16px}.row>div{flex:1;min-width:180px}</style><h1>${escape(title)}</h1>${preview.body.innerHTML}<details ${textarea ? '' : 'open'}><summary>입력 항목 확인</summary><dl>${fields.join('')}</dl></details></html>`;
  dialog.showModal();
});
document.querySelector('[data-preview-close]')?.addEventListener('click', () => dialog?.close());
initFormDrafts();
