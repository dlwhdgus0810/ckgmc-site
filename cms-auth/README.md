# cms-auth — 관리 화면(Sveltia CMS) GitHub 로그인 워커

[sveltia/sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth)(MIT)를 그대로 복사한 Cloudflare Worker 입니다.
`/admin/` 에서 *Sign in with GitHub* 를 누르면 이 워커가 GitHub 로그인 창을 열고, 발급된 토큰을 관리 화면에 넘겨 줍니다.
토큰은 `ALLOWED_DOMAINS` 에 적힌 도메인에서 열린 관리 화면에만 전달됩니다.

- 배포: `npm run cms-auth:deploy`
- 필요한 변수: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`(GitHub OAuth App), `ALLOWED_DOMAINS`
- 사이트 쪽 설정: `public/admin/config.yml` 의 `backend.base_url` 에 이 워커 주소
- 업데이트: 원본 저장소의 `src/index.js` 를 다시 복사한 뒤 배포
