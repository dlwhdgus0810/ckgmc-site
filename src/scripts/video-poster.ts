export {};
/**
 * 영상 자리에는 처음에 썸네일과 재생 버튼만 둡니다. 버튼을 누르면 그 자리에 유튜브 플레이어를 넣고 바로 재생합니다.
 * 플레이어를 처음부터 넣으면 보지 않을 사람도 유튜브 스크립트 1MB 남짓을 내려받게 됩니다.
 *   <div class="video-poster" data-youtube="영상ID" data-title="제목"><img …><button class="video-poster__play">…</button></div>
 */
document.querySelectorAll<HTMLElement>('.video-poster').forEach((box) => {
  const button = box.querySelector<HTMLButtonElement>('.video-poster__play');
  const id = box.dataset.youtube;
  if (!button || !id) return;
  button.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    iframe.title = box.dataset.title ?? '설교 영상';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.setAttribute('allowfullscreen', '');
    box.replaceChildren(iframe);
    box.classList.add('is-playing');
    iframe.focus();
  });
});
