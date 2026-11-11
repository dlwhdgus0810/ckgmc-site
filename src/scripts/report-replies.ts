/** Read receipt metadata only: user/report IDs and the last reply ID, never report contents. */
function updateReplies() {
  const scope = document.querySelector<HTMLElement>('[data-reply-user]');
  if (!scope) return;
  const user = scope.dataset.replyUser;
  if (!user) return;
  const key = `ckgmc:reply-read:${user}`;
  let seen: Record<string, number> = {};
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '{}');
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const [id, value] of Object.entries(raw)) if (/^(cell|care):\d+$/.test(id) && Number.isSafeInteger(value) && Number(value) >= 0) seen[id] = Number(value);
    }
  } catch {
    if (scope.tagName === 'P') scope.textContent = '이 브라우저에서는 답변 확인 기록을 저장할 수 없습니다. 보고서 상세에서 답글을 확인해 주세요.';
  }
  document.querySelectorAll<HTMLElement>('[data-reply-marker]').forEach((badge) => {
    const id = badge.dataset.replyMarker!;
    const latest = Number(badge.dataset.latestReply) || 0;
    const unread = latest > (seen[id] || 0);
    badge.hidden = latest === 0;
    badge.textContent = unread ? '새 답변' : '확인함';
    badge.classList.toggle('badge-primary', unread);
    badge.classList.toggle('badge-secondary', !unread);
  });
  const detail = document.querySelector<HTMLElement>('[data-reply-read]');
  const heading = document.getElementById('comments-heading');
  if (!detail || !heading) return;
  const mark = () => {
    const latest = Number(detail.dataset.latestReply) || 0;
    if (!latest) return;
    seen[detail.dataset.replyRead!] = latest;
    try { localStorage.setItem(key, JSON.stringify(seen)); } catch { /* no read marker persisted */ }
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) { mark(); observer.disconnect(); }
    });
    observer.observe(heading);
  } else { mark(); }
}
updateReplies();
window.addEventListener('pageshow', updateReplies);
