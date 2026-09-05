# 캔사스중앙글로벌감리교회 홈페이지 (Astro)

기존 ckgmc.org 사이트를 **정적 사이트**로 다시 만든 프로젝트입니다.
[Astro](https://astro.build) 로 만들었고, 빌드하면 순수 HTML/CSS/JS 파일만 나오기 때문에
Cloudflare Pages · GitHub Pages · Netlify 같은 무료 호스팅에 그대로 올릴 수 있습니다.

## 빠른 시작

```bash
npm install        # 최초 1회
npm run dev        # 개발 서버 http://localhost:4321 (파일을 고치면 바로 반영)
npm run build      # dist/ 폴더에 배포용 정적 파일 생성
npm run preview    # 빌드 결과 미리보기
npm run check      # 타입/문법 검사
```

Node.js **22.12 이상**이 필요합니다 (`.nvmrc` 에 22 로 지정). nvm 을 쓰면 프로젝트 폴더에서 `nvm use` 한 번으로 맞춰집니다.
nvm 이 없으면 https://nodejs.org 에서 22 LTS 를 설치하세요.

## 폴더 구조 — 어디를 고치면 되나

```
src/
  data/site.ts          교회 이름·주소·연락처·SNS·메인 슬라이드·하단 배너 링크
  data/nav.ts           상단 메뉴 / 사이드 메뉴 / 브레드크럼 (메뉴 구조 한 곳에서 관리)
  content/pages/        일반 페이지 (마크다운). 파일 경로 = 주소
                        예) about/staff.md → /about/staff
  content/posts/        게시판 글. 폴더 = 게시판
                        sermons/ 영상설교, bulletins/ 주보, resources/ 자료실, choir/ 성가대 찬양,
                        special-services/, mission-stories/, children/, youth/, young-adult/,
                        camping/, english/, newcomers/, serving/, community/
  content/series/       설교 시리즈 (유튜브 영상 묶음)
  content/stories/      메인 화면 OUR STORY (페이스북에서 옮겨온 소식)
  styles/global.scss    색상·폰트·레이아웃 (맨 위 변수만 바꿔도 테마가 바뀝니다)
  layouts/, components/ 화면 틀과 부품 (보통 손댈 일 없음)
  pages/                주소 → 화면 연결, 404 페이지 (보통 손댈 일 없음)
public/
  images/               이미지 (logo, slides, headers, pages, staff, posts, series, stories …)
  files/                주보 PDF 등 첨부파일
  _redirects            옛 주소 → 새 주소 (Cloudflare Pages / Netlify 에서 자동 적용)
  robots.txt            검색엔진 안내 (sitemap.xml 은 빌드 시 자동 생성)
scripts/
  import-youtube.mjs    유튜브 채널 최신 영상을 설교 게시판에 자동 추가
  import/               기존 사이트 데이터 가져오기 도구 (아래 참고)
```

## 자주 하는 작업

### 페이지 내용 고치기
`src/content/pages/…/*.md` 파일을 열어 수정합니다. 맨 위 `---` 사이가 설정, 그 아래가 본문입니다.
본문은 마크다운과 HTML 을 섞어 쓸 수 있고, 기존 사이트와 똑같이 Bootstrap 4 클래스(`row`, `col-sm-4`, `img-fluid` …)를 쓸 수 있습니다.

```md
---
title: "예배 안내"            # 제목
subtitle: "Our Services"      # 영문 부제 (선택)
headerImage: /images/headers/about-services.png   # 상단 배경 (선택)
showTitle: true               # 본문 위 제목 자동 표시 (false 면 직접 씀)
board: sermons                # 이 페이지 아래에 붙일 게시판 (선택)
widget: contact               # contact | baptism | membership | offering | map (선택)
---
본문 …
```

### 새 페이지 추가
1. `src/content/pages/<섹션>/<이름>.md` 파일을 만듭니다. (`<섹션>` 은 about, media, ministries, next-steps, missions 중 하나)
2. `src/data/nav.ts` 의 해당 섹션 `items` 에 `{ label: '메뉴 이름', href: '/<섹션>/<이름>' }` 를 추가합니다.

### 게시판에 글 올리기 (설교 · 주보 · 자료실 …)
`src/content/posts/<게시판>/YYYY-MM-DD-이름.md` 파일을 만듭니다. 파일 이름이 곧 주소이므로 날짜로 시작하면 자동으로 최신순 정렬됩니다.

```md
---
title: "주일예배 LIVE | 참된 믿음 | 송명철 목사 | 2026.08.02"
date: 2026-08-02T14:10
youtube: "KH6vXZN1nfw"                  # 유튜브 영상 ID (선택) — 자동으로 영상+썸네일 표시
thumbnail: /images/posts/xxx.jpg         # 목록 썸네일 (선택)
attachments:                             # 첨부파일 (선택) — public/files/ 에 파일을 넣고 이름을 적음
  - name: "20260830 주일예배 주보.pdf"
    file: "20260830.pdf"
---
<p>본문 (HTML 또는 마크다운)</p>
```

* **주보**: PDF 를 `public/files/` 에 넣고 `attachments` 에 적으면 글 페이지 안에 PDF 가 바로 표시됩니다.
* **설교**: `npm run import:youtube` 를 실행하면 유튜브 채널의 새 영상이 자동으로 `posts/sermons/` 에 추가됩니다. (채널 ID 는 `src/data/site.ts` 의 `youtubeChannelId`)

### 설교 시리즈
`src/content/series/<번호>.md`:

```md
---
title: "주일예배 설교시리즈 [그리스도인과 웨슬리안의 정체성]"
thumbnail: /images/series/xxx.png
ongoing: true          # 진행 중이면 메인 화면 SERIES SERMONS 에 표시
date: 2026-07-05
updated: 2026-08-06
episodes:
  - title: "1회 제목"
    youtube: "F4o_2O_l4T0"
  - title: "2회 제목"
    youtube: "ytgCXSou2eA"
---
```

### 메인 슬라이드 · 바로가기 · 하단 링크
`src/data/site.ts` 의 `slides`, `quickLinks`, `links` 배열을 고칩니다. 슬라이드 이미지는 1600×500 크기를 권장합니다.

### OUR STORY (메인 화면 소식)
`src/content/stories/YYYY-MM-DD-이름.md` 에 사진(`image`, `images`)과 글을 넣습니다. 기존 페이스북 글 링크는 `permalink` 에 적습니다.

## 문의 폼 · 세례 신청 폼
정적 사이트에는 서버가 없으므로 메일 발송은 외부 폼 서비스 [FormSubmit](https://formsubmit.co) (무료, 가입 불필요)을 씁니다.
`src/data/site.ts` 의 `formEndpoint` 에 `https://formsubmit.co/<받을 이메일>` 이 설정되어 있습니다.

1. 사이트를 배포한 뒤 연락처 페이지에서 문의 폼을 **한 번 전송**합니다.
2. 그 이메일로 FormSubmit 의 "Activate" 확인 메일이 오면 링크를 누릅니다. (최초 1회)
3. 이후 문의·세례 신청 내용이 이메일로 도착하고, 보낸 사람은 `/thanks` 페이지로 이동합니다.

활성화 후 FormSubmit 이 알려주는 임의 문자열 주소(`https://formsubmit.co/xxxxxxxx`)로 바꾸면 이메일이 페이지 소스에 노출되지 않습니다.
Formspree 등 다른 서비스 주소를 넣어도 같은 폼이 그대로 동작하며, 비워두면 이메일 링크(mailto)로 대체됩니다.

## 배포

### Cloudflare Pages (추천 — 무료, 트래픽 제한 없음)
1. 이 프로젝트를 GitHub 저장소에 올립니다.
2. Cloudflare 대시보드 → Workers & Pages → Create → Pages → Connect to Git → 저장소 선택
3. Framework preset: **Astro**, Build command: `npm run build`, Output directory: `dist`
   (Node 버전은 저장소의 `.nvmrc` 를 자동으로 읽습니다. 안 되면 환경 변수 `NODE_VERSION=22` 를 추가하세요.)
4. Custom domains 에서 `ckgmc.org` 연결
이후에는 git push 만 하면 자동으로 다시 빌드·배포됩니다. `public/_redirects` 의 옛 주소 리다이렉트도 자동 적용됩니다.

### GitHub Pages
`.github/workflows/deploy.yml` 이 준비되어 있습니다. 저장소 Settings → Pages → Source 를 **GitHub Actions** 로 바꾸면 push 때마다 배포됩니다.
(리다이렉트 파일은 GitHub Pages 에서는 동작하지 않습니다.)

### Netlify
Build command `npm run build`, Publish directory `dist`.

## 기존 사이트 데이터 가져오기
이 저장소에는 **페이지 확인용 샘플 데이터**만 들어 있습니다 (게시판별 최근 글 몇 개, 시리즈 5개, 소식 16개).
전체 자료를 옮기려면:

* `scripts/import/scrape-ckgmc.py` — 기존 사이트에서 모든 게시판 글·첨부파일·이미지를 내려받아 JSON 으로 저장 (`python3 scripts/import/scrape-ckgmc.py`, `beautifulsoup4` 필요)
* `scripts/import/json-to-markdown.py` — 그 JSON 을 `src/content/` 마크다운으로 변환

DB 덤프를 직접 받았다면 같은 JSON 형태(`{pid, title, datetime, writer, youtube, thumb, body, attachments:[{name,file}]}` 목록)로 만들어 두 번째 스크립트만 돌리면 됩니다.
주보 PDF 전체(약 430개, 530MB)와 사진 전체(약 180MB)를 모두 넣으면 저장소가 커지므로, 최근 1~2년치만 넣고 나머지는 별도 저장소(Google Drive 등)에 링크하는 것을 권합니다.

## 웹폰트
폰트(SUIT, 나눔명조, Patua One, Gothic A1)는 외부 CDN 대신 `public/fonts/` 에서 직접 제공합니다.
폰트를 바꾸거나 다시 내려받으려면 `scripts/fetch-fonts.mjs` 의 목록을 고친 뒤 `npm run fetch:fonts` 를 실행하세요.

## 기존 사이트와 달라진 점
* 로그인/회원가입, D그룹 보고서, 일대일양육보고서 — 서버가 필요한 기능이라 제외했습니다 (필요하면 Google Forms 등으로 대체).
* 문의/세례 신청 폼 — FormSubmit 으로 전송합니다 (위 참고, 최초 1회 활성화 필요).
* 페이스북 피드 자동 표시 — 페이스북 API 토큰이 필요해 자동화 대신 `content/stories/` 마크다운으로 관리합니다.
* 설교 시리즈 목록/에피소드 — 원래는 서버 API 로 불러왔지만 지금은 마크다운 파일로 관리합니다.
* 주소 체계 — 한글 주소 대신 `/about/staff` 같은 영문 주소를 씁니다. 옛 주소는 `public/_redirects` 로 넘겨줍니다.
