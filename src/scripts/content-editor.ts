/**
 * 콘텐츠 편집 화면 동작: 목록 항목 추가/삭제, 서식 편집기(Quill), 사진 올리기
 */
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

// ── 목록(첨부·에피소드·예배 시간 …) 행 추가/삭제 ─────────────────────
document.querySelectorAll<HTMLElement>('[data-list]').forEach((list) => {
  const rows = list.querySelector<HTMLElement>('[data-list-rows]');
  const tpl = list.querySelector<HTMLTemplateElement>('[data-list-template]');
  const renumber = () => {
    rows?.querySelectorAll<HTMLElement>(':scope > [data-list-row] > .cf-list__row-head > span').forEach((s, i) => {
      s.textContent = s.textContent!.replace(/\s*\d*$/, '') + ' ' + (i + 1);
    });
  };
  list.querySelector('[data-list-add]')?.addEventListener('click', () => {
    if (!rows || !tpl) return;
    const idx = Date.now() % 1000000; // 서버는 번호 순서만 보므로 겹치지 않으면 충분
    const html = tpl.innerHTML.replace(/__IDX__/g, String(idx));
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    const row = wrap.firstElementChild as HTMLElement;
    rows.appendChild(row);
    renumber();
    row.querySelector<HTMLElement>('input, textarea, select')?.focus();
  });
  list.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-list-remove]');
    if (!btn) return;
    btn.closest('[data-list-row]')?.remove();
    renumber();
  });
});

// ── 사진 올리기 → 저장소에 커밋 → 주소 ───────────────────────────────
async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/manage/content/upload', { method: 'POST', body: fd });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? `업로드 실패 (${res.status})`);
  return data.url;
}

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

  toggle?.addEventListener('change', () => {
    if (rawMode()) { textarea.value = quill!.getSemanticHTML(); textarea.classList.remove('d-none'); holder.classList.add('d-none'); }
    else { load(textarea.value); textarea.classList.add('d-none'); holder.classList.remove('d-none'); }
  });
  form.addEventListener('submit', () => {
    if (!rawMode()) {
      const html = quill!.getSemanticHTML();
      textarea.value = quill!.getText().trim() === '' && !/<(img|iframe|video)/.test(html) ? '' : html;
    }
  });
}
