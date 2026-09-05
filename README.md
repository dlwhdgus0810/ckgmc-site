# 캔사스중앙글로벌감리교회 홈페이지

기존 ckgmc.org 를 다시 만든 프로젝트입니다. [Astro](https://astro.build) 로 만들었고, 일반 페이지는 모두 **정적 파일**로 빌드되어
Cloudflare 무료 플랜에 올릴 수 있습니다. 로그인이 필요한 **교인 전용 기능**(D그룹 리더 보고서, 일대일 양육보고서, 회원 관리)만
Cloudflare Workers + D1(무료 DB)에서 서버로 동작합니다.
글·사진은 브라우저 관리 화면(`/admin`)에서 고칠 수 있고, 유튜브 새 영상은 매주 자동으로 설교 게시판에 올라갑니다.

## 빠른 시작

```bash
nvm use                     # .nvmrc 의 Node 22 사용 (nvm 이 없으면 https://nodejs.org 에서 22 LTS 설치)
npm install                 # 최초 1회
cp .dev.vars.example .dev.vars   # 최초 1회: 로컬용 환경 변수 (ADMIN_EMAILS 에 내 이메일)
npm run db:migrate:local    # 최초 1회: 로컬 DB(교인 전용 기능용) 테이블 생성
npm run dev                 # 개발 서버 http://localhost:4321 (파일을 고치면 바로 반영)
npm run build               # dist/ 에 배포용 파일 생성 (client = 정적, server = Worker)
npm run preview             # 빌드 결과 미리보기
npm run check               # 타입/문법 검사
```

Node.js **22.12 이상**이 필요합니다 (`npm run admin:create` 는 22.18 이상).
개발 서버에서 `/login` 을 열면 "개발용 로그인"이 보여 이메일만 넣고 바로 들어갈 수 있습니다 (배포본에는 없음).

## 폴더 구조 — 어디를 고치면 되나

```
src/
  data/site.json        교회 이름·주소·연락처·SNS·예배 시간·메인 첫 화면 문구/사진·교회 소식 포스터  ← 대부분의 설정
  data/site.ts          site.json 을 검증하고 파생값(지도 링크 등)을 만드는 코드 (필드를 추가할 때만)
  data/nav.ts           메뉴 "섹션"(교회 소개·미디어·사역…) 정의. 하위 항목은 페이지 파일에서 자동 생성
  content/pages/        일반 페이지 (마크다운). 파일 경로 = 주소  예) about/staff.md → /about/staff
  content/posts/        게시판 글. 폴더 = 게시판
                        sermons/ 영상설교 · bulletins/ 주보 · resources/ 자료실 · choir/ 성가대 찬양 ·
                        special-services/ · mission-stories/ · children/ youth/ young-adult/ camping/
                        english/ newcomers/ serving/ community/ (사역 페이지 아래 부서 소식)
  content/series/       설교 시리즈 (유튜브 영상 묶음)
  content/stories/      우리 교회 이야기 (사진 소식)
  styles/_tokens.scss   색·글꼴·간격 토큰  ← 디자인을 바꾸려면 여기
  styles/*.scss         컴포넌트별 스타일
  components/, layouts/ 화면 부품과 틀 (components/home/ = 메인 화면 섹션들, components/members/ = 교인 공간 부품)
  pages/                주소 → 화면 연결 (index, [...slug], story/, 404, thanks)
  pages/login.astro, auth/, members/, manage/   교인 전용 기능 (서버 렌더링, 로그인 필요)
  middleware.ts         로그인 보호·같은 출처 검사 (서버 렌더링 페이지에만 적용)
  lib/auth/, lib/reports.ts, lib/db.ts   세션·비밀번호·소셜 로그인·회원·보고서 쿼리 (Cloudflare D1)
public/
  admin/                관리 화면(Sveltia CMS) — config.yml 에 저장소·로그인 주소 설정
  images/               이미지 (hero, slides, headers, pages, staff, posts, series, stories, uploads …)
  files/                주보 PDF 등 첨부파일
  fonts/                나눔명조 (Pretendard 는 npm 패키지에서 자동 포함)
  _redirects            옛 주소 → 새 주소 (Cloudflare 가 자동 적용)
  _headers, robots.txt  /admin·/members·/manage 검색 제외
migrations/             D1 데이터베이스 테이블 정의 (npm run db:migrate:local / :remote)
wrangler.jsonc          Cloudflare Workers 설정 (D1 바인딩, 정적 파일 폴더)
.dev.vars.example       로컬 개발용 환경 변수 예시 → .dev.vars 로 복사
scripts/
  import-youtube.mjs    유튜브 채널 새 영상 → posts/sermons (GitHub Actions 가 매주 실행)
  fetch-fonts.mjs       나눔명조 웹폰트 내려받기
  import/               기존 사이트 데이터 가져오기 도구
.github/workflows/
  youtube-sync.yml      매주 월요일 유튜브 동기화 후 커밋
  deploy.yml            GitHub Pages 수동 배포 (예비, 정적 페이지만)
```

## 콘텐츠 관리 화면 (CMS) — 개발자가 아니어도 글을 올릴 수 있게

사이트 안의 `https://ckgmc.org/admin/` 에서 [Sveltia CMS](https://sveltiacms.app) 가 뜹니다.
GitHub 계정으로 로그인해 글·사진·설정을 고치면 저장소에 커밋되고 1~2분 뒤 사이트에 반영됩니다.
**최초 1회** 아래 설정이 필요합니다 (사이트 소유자가 직접).

> **현재 상태 (2026-09-05)**: 1·2·4(ALLOWED_DOMAINS)·5 는 끝났습니다. 남은 것은 **3. GitHub OAuth App 만들기**와 그 키를 워커에 넣는 것, 그리고 6. 편집자 초대입니다.

1. **GitHub 저장소** — `dlwhdgus0810/ckgmc-site` (완료).
2. **로그인 워커** — 이 저장소의 `cms-auth/` 폴더가 그 워커입니다. `npm run cms-auth:deploy` 로 배포되어
   `https://sveltia-cms-auth.ckgmc-site.workers.dev` 에서 동작 중 (완료).
3. **GitHub OAuth App** — GitHub → Settings → Developer settings → OAuth Apps → *New OAuth App*
   - Application name: `CKGMC CMS` (아무 이름)
   - Homepage URL: `https://ckgmc.org`
   - Authorization callback URL: `https://sveltia-cms-auth.ckgmc-site.workers.dev/callback`
   - 생성 후 *Client ID* 를 복사하고, *Generate a new client secret* 으로 *Client Secret* 을 만듭니다.
4. **워커 변수** — 터미널에서 (값을 물어보면 붙여 넣기):
   ```bash
   npx wrangler secret put GITHUB_CLIENT_ID --config cms-auth/wrangler.toml
   npx wrangler secret put GITHUB_CLIENT_SECRET --config cms-auth/wrangler.toml
   ```
   `ALLOWED_DOMAINS` = `ckgmc.org,www.ckgmc.org,ckgmc-site.ckgmc-site.workers.dev` 는 이미 설정됨.
5. **config.yml** — `public/admin/config.yml` 의 `repo`, `base_url` 설정 완료.
6. **편집자 초대** — 글을 올릴 분들의 GitHub 계정을 저장소 Collaborator(Write) 로 초대합니다.
   교회 관리자(admin@ckgmc.org)도 GitHub 계정이 있어야 관리 화면에 들어올 수 있습니다 (사이트 로그인 계정과는 별개).
7. `https://ckgmc.org/admin/` 접속 → *Sign in with GitHub* → 왼쪽 목록에서 게시판을 골라 글쓰기.

관리 화면에서 할 수 있는 일: 페이지 본문 수정, 설교·주보(PDF 업로드)·자료실·부서 소식·시리즈·이야기 등록,
메인 첫 화면 문구/사진, 예배 시간, 교회 소식 포스터, 연락처 등 **사이트 설정** 편집.
교인 전용 기능의 관리자 화면(`/manage`) 왼쪽 메뉴와 대시보드에도 이 화면으로 가는 링크가 있습니다.
저장 = 저장소 커밋이므로, Workers Builds(아래 "배포" 절)를 연결해 두지 않았다면 `npm run deploy` 를 실행해야 사이트에 반영됩니다.

> 로컬 테스트: `npm run dev` 를 켠 뒤 Chrome 에서 `http://localhost:4321/admin/index.html` 을 열고
> **Work with Local Repository** 를 선택하면 로그인 없이 이 폴더의 파일을 직접 편집해 볼 수 있습니다.

## 파일로 직접 편집하기

### 사이트 설정 (`src/data/site.json`)
교회 이름·주소·전화·이메일·SNS, 예배 시간(`serviceTimes`), 메인 첫 화면(`hero`: 사진·제목·소개·버튼),
교회 소식 포스터(`notices`, 권장 1600×500, `alt` 필수), 협력 단체 배너(`links`), 문의 폼 주소(`formEndpoint`).
잘못된 값이 있으면 빌드가 실패하면서 어느 항목인지 알려줍니다.

**메인 첫 화면 사진**: 현재 청년부 단체 사진(`/images/pages/young-adult.jpg`)을 임시로 쓰고 있습니다.
가로 1920px 이상의 예배당/전체 사진을 `public/images/hero/` 에 넣고 `hero.image` 를 바꿔주세요.

### 페이지 (`src/content/pages/<섹션>/<이름>.md`)
```md
---
title: "예배 안내"                 # 제목 (배너에 크게 표시)
subtitle: "Our Services"           # 영문 부제 (선택)
order: 50                          # 같은 섹션 안의 메뉴 순서 (작을수록 위)
menuTitle: "예배 안내"             # 메뉴 표시 이름 (선택, 비우면 "제목 부제")
headerImage: /images/headers/about-services.png   # 배너 사진 (선택)
image: /images/pages/xxx.jpg       # 메인 사역 소개 카드 사진 (사역 페이지)
description: "한 줄 설명"          # 카드·검색엔진용 (선택)
board: sermons                     # 이 페이지 아래에 붙일 게시판 (선택)
widget: contact                    # contact | baptism | membership | offering | map | service-times (선택)
hideFromNav: true                  # 메뉴에서 숨김 (선택)
---
본문 (마크다운 + HTML, Bootstrap 4 클래스 사용 가능)
```
**새 페이지 추가** = 섹션 폴더(about, media, ministries, next-steps, missions)에 `.md` 파일을 만들면 끝. 메뉴에 자동으로 들어갑니다.
섹션 자체를 추가/이름 변경하려면 `src/data/nav.ts` 를 고칩니다.

### 게시글 (`src/content/posts/<게시판>/YYYY-MM-DD-이름.md`)
```md
---
title: "주일예배 LIVE | 참된 믿음 | 송명철 목사 | 2026.08.02"
date: 2026-08-02T14:10            # 적은 시각 그대로 표시 (시간대 없음)
writer: "이주혁"
youtube: "KH6vXZN1nfw"            # 유튜브 영상 ID (선택) → 영상·썸네일 자동
attachments:                      # 첨부 (선택). public/files/ 에 넣고 이름을 적음
  - name: "20260830 주일예배 주보.pdf"
    file: "20260830.pdf"          # 또는 /files/20260830.pdf
---
<p>본문</p>
```
주보는 첨부 PDF 가 글 페이지 안에서 바로 보이고(데스크톱), 휴대전화에서는 "새 창에서 열기" 버튼으로 열립니다.

### 설교 시리즈 (`src/content/series/<이름>.md`)
`title`, `thumbnail`, `ongoing`(진행 중이면 메인에 표시), `date`, `updated`, `episodes: [{title, youtube}]`.

### 우리 교회 이야기 (`src/content/stories/YYYY-MM-DD-이름.md`)
`title`, `date`, `image`(대표), `images`(앨범), `permalink`(원본 페이스북 글). 본문은 소식 글.

## 디자인 바꾸기
`src/styles/_tokens.scss` 의 변수만 고치면 됩니다 — 남색(`$navy-*`), 금색(`$gold-*`), 글자색, 글꼴, 간격, 모서리.
글꼴은 Pretendard(본문·제목)와 나눔명조(성경 구절·인용)입니다. 나눔명조를 바꾸려면 `scripts/fetch-fonts.mjs` 를 고치고 `npm run fetch:fonts`.
접근성: 모든 색 조합은 WCAG AA 대비(4.5:1)를 만족하도록 정했고, 키보드 포커스 링·본문 건너뛰기 링크·감소 모션 설정을 지원합니다.

## 유튜브 설교 자동 등록
`.github/workflows/youtube-sync.yml` 이 **매주 월요일** 유튜브 채널(`site.json` 의 `youtubeChannelId`) RSS 를 읽어
아직 없는 영상을 `src/content/posts/sermons/` 에 추가하고 커밋합니다 → Cloudflare 가 자동 재빌드.
GitHub 저장소 → Actions 탭에서 *Run workflow* 로 즉시 실행할 수도 있습니다. 로컬에서는 `npm run import:youtube`.
제목·본문은 유튜브 제목·설명을 그대로 가져오므로, 필요하면 관리 화면에서 다듬으면 됩니다.

## 문의 폼 · 세례 신청 폼
정적 사이트에는 서버가 없어 무료 폼 전송 서비스 [FormSubmit](https://formsubmit.co) 을 씁니다 (가입 불필요).
`site.json` 의 `formEndpoint` 가 `https://formsubmit.co/<이메일>` 로 설정되어 있습니다.
1. 배포 후 연락처 페이지에서 문의 폼을 **한 번 전송**합니다.
2. 그 이메일로 온 FormSubmit "Activate" 메일의 링크를 누릅니다 (최초 1회).
3. 이후 문의·세례 신청이 이메일로 도착하고, 보낸 사람은 `/thanks` 페이지로 이동합니다.

이메일 노출을 피하려면 활성화 후 FormSubmit 이 알려주는 임의 문자열 주소로 바꾸세요. 이메일을 바꾸면 다시 활성화해야 합니다.

## 교인 전용 기능 — 로그인 · D그룹 리더 보고서 · 일대일 양육보고서

기존 사이트의 회원 기능을 옮긴 부분입니다. 주소는 모두 로그인이 필요하며 검색엔진에는 노출되지 않습니다.

| 주소 | 누가 | 내용 |
|---|---|---|
| `/login` | 모두 | 소셜 로그인(설정된 것만 버튼 표시) + 이메일·비밀번호 |
| `/members` | 교인 | 마이페이지: 내 정보, 내가 낸 보고서와 관리자 답글 |
| `/members/cell-report` | 교인 | D그룹 리더 보고서 작성 (원본의 8개 항목 그대로) |
| `/members/care-report` | 교인 | 일대일 양육보고서 작성 |
| `/members/password` | 교인 | 비밀번호 만들기/변경 |
| `/manage` | 관리자 | 대시보드, 승인 대기 회원 바로 승인 |
| `/manage/cell-reports`, `/manage/care-reports` | 관리자 | 보고서 목록(그룹·부서·기간 필터), 상세에서 답글·삭제, CSV 내려받기 |
| `/manage/groups` | 관리자 | D그룹 추가·수정·비활성 |
| `/manage/stats` | 관리자 | 연도별 그룹 요약, 월별 평균 출석 |
| `/manage/users` | 관리자 | 회원 검색·승인·권한/상태 변경·비밀번호 재설정·계정 만들기 |

**권한과 상태**
* 권한: `관리자`(admin) / `교인`(member). 상태: `승인 대기`(pending) / `활성`(active) / `비활성`(disabled).
* 소셜 로그인으로 처음 들어온 사람은 **승인 대기**가 되어 관리자가 승인해야 보고서를 쓸 수 있습니다 (스팸 가입 방지).
* 환경 변수 `ADMIN_EMAILS`(쉼표 구분)에 적힌 이메일은 어떤 방법으로 로그인해도 곧바로 관리자가 됩니다.
* 관리자가 "새 회원 추가"로 계정을 만들고 초기 비밀번호를 알려 주는 방식도 됩니다 (소셜 계정이 없는 분).

**첫 관리자 만들기** (둘 중 하나)
```bash
# 1) 이메일·비밀번호 계정으로 (배포 DB 에 직접 기록)
npm run admin:create -- --email admin@ckgmc.org --name 관리자 --password '8자이상비밀번호' --remote
# 2) 또는 ADMIN_EMAILS 에 내 Google 이메일을 넣고 소셜 로그인 (아래 "소셜 로그인 연결" 후)
```

**소셜 로그인 연결** (나중에 해도 됨 — 변수가 비어 있으면 버튼이 안 보일 뿐입니다)
* Google: [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 클라이언트 ID(웹) →
  승인된 리디렉션 URI `https://ckgmc.org/auth/google/callback` (www 도메인도 쓰면 함께 등록) → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
* Facebook: [Meta for Developers](https://developers.facebook.com/) → 앱 → Facebook 로그인 → 유효한 OAuth 리디렉션 URI
  `https://ckgmc.org/auth/facebook/callback` → `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` (이메일 권한 필요)
* 변수는 Cloudflare 대시보드 → Workers & Pages → ckgmc-site → Settings → Variables and Secrets 에 넣습니다 (로컬은 `.dev.vars`).
* 다른 공급자(카카오 등)를 붙이려면 `src/lib/auth/oauth.ts` 의 `PROVIDERS` 에 항목을 추가하면 됩니다.

**어떻게 동작하나**
* 데이터는 Cloudflare **D1**(SQLite) 에 저장됩니다. 테이블 정의는 `migrations/`, 쿼리는 `src/lib/reports.ts`, `src/lib/auth/users.ts`.
* 세션은 30일 쿠키 + DB(`sessions`) 입니다. 비밀번호는 PBKDF2-SHA256 으로 해시합니다 (`src/lib/auth/password.ts`).
* 로그인 보호와 CSRF(같은 출처) 검사는 `src/middleware.ts` 한 곳에서 합니다. 정적 페이지에는 영향이 없습니다.
* 답글은 보고자의 마이페이지에 표시됩니다 (원본처럼 이메일로 보내지는 않음 — 필요하면 Resend 같은 메일 API 연결).
* 개인 정보(회원·보고서)는 저장소가 아니라 DB 에만 있습니다. 그룹 목록도 관리 화면에서 직접 입력합니다.

## 배포 — Cloudflare Workers (무료 플랜으로 충분)
정적 페이지와 교인 전용 기능이 **하나의 Worker** 로 배포됩니다 (정적 파일 요청은 무료·무제한, 서버 요청은 하루 10만 건).

> **현재 상태 (2026-09-05)**: 아래 1~5 단계는 끝났습니다. D1 `ckgmc` 생성·마이그레이션 완료, Worker `ckgmc-site` 배포 완료 —
> https://ckgmc-site.ckgmc-site.workers.dev , `ADMIN_EMAILS` 시크릿 설정됨. 남은 일: 첫 관리자 만들기(6), 도메인 연결(7), CMS 워커 도메인 추가(8), 자동 배포 연결(선택).
> 코드를 고친 뒤 다시 배포하려면 `npm run deploy` 한 줄이면 됩니다.

**최초 1회**
1. `npx wrangler login` (Cloudflare 계정 연결).
2. DB 만들기: `npx wrangler d1 create ckgmc` → 출력된 `database_id` 를 `wrangler.jsonc` 의 `d1_databases[0].database_id` 에 넣고 커밋.
3. 테이블 만들기: `npm run db:migrate:remote`
4. 첫 배포: `npm run deploy` (= `npm run build && wrangler deploy`). `https://ckgmc-site.<내계정>.workers.dev` 가 생깁니다.
5. 대시보드 → Workers & Pages → ckgmc-site → Settings → Variables and Secrets 에 `ADMIN_EMAILS` (와 소셜 로그인 키) 추가.
6. 첫 관리자 만들기 (위 "교인 전용 기능" 절).
7. Settings → Domains & Routes 에서 `ckgmc.org`, `www.ckgmc.org` 연결.
8. 관리 화면(CMS) 로그인 워커의 `ALLOWED_DOMAINS` 에 위 도메인과 `ckgmc-site.<내계정>.workers.dev` 를 넣습니다.

**push 할 때마다 자동 배포** (선택): 대시보드 → Workers & Pages → Create → *Import a repository* 로 이 저장소를 연결하고
Build command `npm run build`, Deploy command `npx wrangler deploy` 를 지정합니다 (Workers Builds).
관리 화면(CMS)에서 글을 저장하면 커밋이 생기므로 이 설정이 있어야 자동으로 반영됩니다.

`public/_redirects`(옛 주소 리다이렉트)와 `public/_headers` 는 정적 파일에 자동 적용됩니다.
DB 스키마를 바꿀 때는 `migrations/000N_*.sql` 을 추가하고 `npm run db:migrate:local` / `:remote` 를 실행합니다.

> GitHub Pages 로도 배포할 수는 있지만(`.github/workflows/deploy.yml`, 수동 실행) 정적 페이지만 나오고
> 로그인·보고서 기능과 옛 주소 리다이렉트는 동작하지 않습니다.

## 기존 사이트 데이터 가져오기
이 저장소에는 **확인용 샘플 데이터**만 있습니다 (게시판별 최근 글 몇 개, 시리즈 5개, 이야기 16개).
* `scripts/import/scrape-ckgmc.py` — 기존 사이트의 모든 글·첨부·이미지를 내려받아 JSON 으로 저장 (`beautifulsoup4` 필요)
* `scripts/import/json-to-markdown.py` — JSON 을 `src/content/` 마크다운으로 변환하고 이미지·PDF 를 `public/` 으로 복사

DB 덤프를 직접 받았다면 게시판별 `data/<board>.json` 을
`[{pid, title, datetime "YYYY-MM-DD HH:MM", writer, youtube, thumb, body(HTML), attachments:[{name,file}]}]` 형태로 만들어 두 번째 스크립트만 돌리면 됩니다.
전체 주보 PDF(약 430개, 530MB)를 모두 넣으면 저장소가 커지므로 최근 1~2년치만 넣는 것을 권합니다.

## 기존 사이트와 달라진 점
* 로그인·D그룹 리더 보고서·일대일 양육보고서 — Cloudflare Workers + D1 로 다시 구현 (위 "교인 전용 기능"). 이메일 자체 가입은 없고 관리자 승인 또는 계정 발급 방식.
* 답글 이메일 발송, "지원 요청"(제작사 문의) 메뉴, 그룹 통계의 그래프 — 제외. 그룹 통계는 표로 제공.
* 메인 화면 — 포스터 슬라이더 대신 교회 사진 첫 화면 + 예배 시간/오시는 길 정보 띠 + 이번 주 설교·주보 + 사역 소개 + 새가족 안내.
* 페이스북 피드 자동 표시 — API 토큰이 필요해 `content/stories/` 마크다운으로 관리 (관리 화면에서 사진 소식 등록).
* 주소 체계 — `/about/staff` 같은 영문 주소. 옛 한글 주소는 `public/_redirects` 로 넘겨줍니다.
* 글꼴 — Pretendard + 나눔명조 자체 호스팅 (Google Fonts·jsDelivr 의존 없음).

## 후속 과제 (선택)
검색엔진용 구조화 데이터(JSON-LD), 게시글별 공유 이미지, 사이트 내 검색(Pagefind), 공유 버튼, 이미지 라이트박스, Astro `<Image>` 최적화 파이프라인.
