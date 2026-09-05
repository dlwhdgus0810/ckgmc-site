/**
 * 문의·세례 신청 폼(FormSubmit)의 전송 후 이동 주소(_next)를 지금 열린 도메인 기준으로 맞춥니다.
 * 빌드 시에는 astro.config 의 site(ckgmc.org)로 채워지므로, 임시 주소(workers.dev)나 미리보기에서도
 * 전송 뒤 같은 도메인의 /thanks 로 돌아오게 합니다.
 */
document.querySelectorAll<HTMLInputElement>('input[name="_next"]').forEach((input) => {
  try {
    const path = new URL(input.value, location.origin).pathname;
    input.value = new URL(path, location.origin).href;
  } catch {
    /* 값이 이상하면 그대로 둠 */
  }
});
