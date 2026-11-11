/** Accessible field feedback for member report forms; server validation remains authoritative. */
export function initReportValidation() {
  document.querySelectorAll<HTMLFormElement>('form[data-report-form]').forEach((form) => {
    if (form.dataset.validationReady) return;
    form.dataset.validationReady = 'true';
    const summary = form.querySelector<HTMLElement>('[data-report-errors]');
    const controls = () => Array.from(form.querySelectorAll('input:not([type="hidden"]), select, textarea')) as Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
    const labelFor = (field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
      if (field instanceof HTMLInputElement && field.type === 'radio') return field.closest('fieldset')?.querySelector('legend')?.textContent?.replace(/\s*\(필수\)/, '').trim() || '항목';
      return Array.from(field.labels || []).map(label => label.textContent).join(' ').replace(/\s*\((필수|선택)\)/g, '').replace(/^\d+\.\s*/, '').trim() || '항목';
    };
    const showErrors = (errors: Map<string, string>) => {
      form.querySelectorAll<HTMLElement>('[data-field-error]').forEach(el => { el.hidden = true; el.textContent = ''; });
      controls().forEach(field => field.removeAttribute('aria-invalid'));
      errors.forEach((message, id) => {
        const field = document.getElementById(id) as HTMLInputElement | null;
        if (!field || !form.contains(field)) return;
        let inline = form.querySelector<HTMLElement>(`[data-field-error="${id}"]`);
        if (!inline) {
          inline = document.createElement('p'); inline.id = `${id}-error`; inline.dataset.fieldError = id;
          inline.className = 'small text-danger mt-1 mb-0';
          (field.closest('.form-group') || field.parentElement)?.appendChild(inline);
        }
        inline.textContent = message; inline.hidden = false;
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', [field.getAttribute('aria-describedby'), inline.id].filter(Boolean).join(' ').split(/\s+/).filter((x, i, all) => all.indexOf(x) === i).join(' '));
      });
      if (!summary) return;
      summary.hidden = errors.size === 0;
      const list = summary.querySelector('ul');
      if (list) { list.replaceChildren(); errors.forEach((message, id) => { const li = document.createElement('li'); const link = document.createElement('a'); link.href = `#${id}`; link.textContent = message; li.appendChild(link); list.appendChild(li); }); }
      if (errors.size) summary.focus();
    };
    summary?.addEventListener('click', (event) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      const field = link?.hash ? document.getElementById(link.hash.slice(1)) : null;
      if (field) { event.preventDefault(); field.focus(); field.scrollIntoView({ block: 'center' }); }
    });
    if (summary && !summary.hidden) summary.focus();
    form.addEventListener('submit', (event) => {
      const errors = new Map<string, string>();
      const radios = new Set<string>();
      for (const field of controls()) {
        if (field.disabled || !field.id) continue;
        if (field instanceof HTMLInputElement && field.type === 'radio') {
          if (radios.has(field.name)) continue;
          radios.add(field.name);
        }
        const label = labelFor(field);
        if (field.validity.valueMissing) errors.set(field.id, `${label} 항목을 입력하거나 선택해 주세요.`);
        else if (field.validity.rangeUnderflow || field.validity.rangeOverflow) errors.set(field.id, `${label} 값을 허용 범위 안에서 입력해 주세요.`);
        else if (field.validity.badInput || field.validity.stepMismatch || field.validity.typeMismatch) errors.set(field.id, `${label} 형식을 확인해 주세요.`);
      }
      form.querySelectorAll<HTMLElement>('.absentee-row').forEach(row => {
        const name = row.querySelector<HTMLInputElement>('[name="absentee_name"]');
        const reason = row.querySelector<HTMLInputElement>('[name="absentee_reason"]');
        if (name && reason?.value.trim() && !name.value.trim()) errors.set(name.id, '결석 사유를 적은 줄의 이름도 입력해 주세요.');
      });
      showErrors(errors);
      if (errors.size) event.preventDefault();
    });
  });
}
