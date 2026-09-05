# 캔사스중앙글로벌감리교회 홈페이지

기존 ckgmc.org 를 **정적 사이트**로 다시 만든 프로젝트입니다. [Astro](https://astro.build) 로 만들었고,
빌드하면 HTML/CSS/JS 파일만 나오기 때문에 Cloudflare Pages 같은 무료 호스팅에 그대로 올릴 수 있습니다.
글·사진은 브라우저 관리 화면(`/admin`)에서 고칠 수 있고, 유튜브 새 영상은 매주 자동으로 설교 게시판에 올라갑니다.

## 빠른 시작

```bash
nvm use            # .nvmrc 의 Node 22 사용 (nvm 이 없으면 https://nodejs.org 에서 22 LTS 설치)
npm install        # 최초 1회
npm run dev        # 개발 서버 http://localhost:4321 (파일을 고치면 바로 반영)
npm run build      # dist/ 에 배포용 정적 파일 생성
npm run preview    # 빌드 결과 미리보기
npm run check      # 타입/문법 검사
```

Node.js **22.12 이상**이 필요합니다.

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
  components/, layouts/ 화면 부품과 틀 (components/home/ = 메인 화면 섹션들)
  pages/                주소 → 화면 연결 (index, [...slug], story/, 404, thanks)
public/
  admin/                관리 화면(Sveltia CMS) — config.yml 에 저장소·로그인 주소 설정
  images/               이미지 (hero, slides, headers, pages, staff, posts, series, stories, uploads …)
  files/                주보 PDF 등 첨부파일
  fonts/                나눔명조 (Pretendard 는 npm 패키지에서 자동 포함)
  _redirects            옛 주소 → 새 주소 (Cloudflare Pages / Netlify 에서 자동 적용)
  _headers, robots.txt  /admin 검색 제외
scripts/
  import-youtube.mjs    유튜브 채널 새 영상 → posts/sermons (GitHub Actions 가 매주 실행)
  fetch-fonts.mjs       나눔명조 웹폰트 내려받기
  import/               기존 사이트 데이터 가져오기 도구
.github/workflows/
  youtube-sync.yml      매주 월요일 유튜브 동기화 후 커밋
  deploy.yml            GitHub Pages 수동 배포 (예비)
```

## 콘텐츠 관리 화면 (CMS) — 개발자가 아니어도 글을 올릴 수 있게

사이트 안의 `https://ckgmc.org/admin/` 에서 [Sveltia CMS](https://sveltiacms.app) 가 뜹니다.
GitHub 계정으로 로그인해 글·사진·설정을 고치면 저장소에 커밋되고 1~2분 뒤 사이트에 반영됩니다.
**최초 1회** 아래 설정이 필요합니다 (사이트 소유자가 직접).

1. **GitHub 저장소** — 이 폴더를 GitHub 저장소(예: `jonghyunlee/ckgmc-site`)에 올립니다.
2. **로그인 워커 배포** — GitHub 로그인을 중계하는 무료 Cloudflare Worker 입니다.
   https://github.com/sveltia/sveltia-cms-auth 의 *Deploy to Cloudflare* 버튼으로 배포하면
   `https://sveltia-cms-auth.<내계정>.workers.dev` 같은 주소가 생깁니다.
3. **GitHub OAuth App** — GitHub → Settings → Developer settings → OAuth Apps → *New OAuth App*
   - Homepage URL: `https://github.com/sveltia/sveltia-cms-auth`
   - Authorization callback URL: `<워커 주소>/callback`
   - 생성 후 *Client ID* 와 *Client Secret* 을 복사합니다.
4. **워커 환경 변수** — Cloudflare 대시보드 → Workers → sveltia-cms-auth → Settings → Variables
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`(암호화), `ALLOWED_DOMAINS` = `ckgmc.org,www.ckgmc.org,<프로젝트>.pages.dev`
5. **config.yml 채우기** — `public/admin/config.yml` 맨 위 `repo:` 에 저장소 이름, `base_url:` 에 워커 주소를 넣고 커밋합니다.
6. **편집자 초대** — 글을 올릴 분들을 GitHub 저장소 Collaborator(Write) 로 초대합니다.
7. `https://ckgmc.org/admin/` 접속 → *Sign in with GitHub* → 왼쪽 목록에서 게시판을 골라 글쓰기.

관리 화면에서 할 수 있는 일: 페이지 본문 수정, 설교·주보(PDF 업로드)·자료실·부서 소식·시리즈·이야기 등록,
메인 첫 화면 문구/사진, 예배 시간, 교회 소식 포스터, 연락처 등 **사이트 설정** 편집.

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

## 배포 — Cloudflare Pages (무료, 트래픽 제한 없음)
1. GitHub 저장소에 push.
2. Cloudflare 대시보드 → Workers & Pages → Create → Pages → *Connect to Git* → 저장소 선택.
3. Framework preset **Astro**, Build command `npm run build`, Output directory `dist`.
   Node 버전은 `.nvmrc`(22)를 읽습니다. 안 되면 환경 변수 `NODE_VERSION=22`.
4. Custom domains 에서 `ckgmc.org`, `www.ckgmc.org` 연결.
5. 관리 화면 로그인 워커의 `ALLOWED_DOMAINS` 에 위 도메인과 `<프로젝트>.pages.dev` 를 넣습니다.

이후 push 하거나 관리 화면에서 저장할 때마다 자동으로 다시 빌드·배포됩니다.
`public/_redirects`(옛 주소 리다이렉트)와 `public/_headers` 는 자동 적용됩니다.
GitHub Pages 로 배포해야 할 경우 `.github/workflows/deploy.yml` 을 Actions 탭에서 수동 실행하세요 (리다이렉트는 미지원).

## 기존 사이트 데이터 가져오기
이 저장소에는 **확인용 샘플 데이터**만 있습니다 (게시판별 최근 글 몇 개, 시리즈 5개, 이야기 16개).
* `scripts/import/scrape-ckgmc.py` — 기존 사이트의 모든 글·첨부·이미지를 내려받아 JSON 으로 저장 (`beautifulsoup4` 필요)
* `scripts/import/json-to-markdown.py` — JSON 을 `src/content/` 마크다운으로 변환하고 이미지·PDF 를 `public/` 으로 복사

DB 덤프를 직접 받았다면 게시판별 `data/<board>.json` 을
`[{pid, title, datetime "YYYY-MM-DD HH:MM", writer, youtube, thumb, body(HTML), attachments:[{name,file}]}]` 형태로 만들어 두 번째 스크립트만 돌리면 됩니다.
전체 주보 PDF(약 430개, 530MB)를 모두 넣으면 저장소가 커지므로 최근 1~2년치만 넣는 것을 권합니다.

## 기존 사이트와 달라진 점
* 로그인/회원가입, D그룹 보고서, 일대일양육보고서 — 서버가 필요해 제외 (필요하면 Google Forms 등으로 대체).
* 메인 화면 — 포스터 슬라이더 대신 교회 사진 첫 화면 + 예배 시간/오시는 길 정보 띠 + 이번 주 설교·주보 + 사역 소개 + 새가족 안내.
* 페이스북 피드 자동 표시 — API 토큰이 필요해 `content/stories/` 마크다운으로 관리 (관리 화면에서 사진 소식 등록).
* 주소 체계 — `/about/staff` 같은 영문 주소. 옛 한글 주소는 `public/_redirects` 로 넘겨줍니다.
* 글꼴 — Pretendard + 나눔명조 자체 호스팅 (Google Fonts·jsDelivr 의존 없음).

## 후속 과제 (선택)
검색엔진용 구조화 데이터(JSON-LD), 게시글별 공유 이미지, 사이트 내 검색(Pagefind), 공유 버튼, 이미지 라이트박스, Astro `<Image>` 최적화 파이프라인.
