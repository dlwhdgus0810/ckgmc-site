# Central Korean Global Methodist Church of Kansas — Website

A rebuild of the existing ckgmc.org site, made with [Astro](https://astro.build). All regular pages are built as **static files**,
so the site fits on Cloudflare's free plan. Only the login-protected **members-only features** (D-Group leader reports, one-on-one discipleship reports, member management)
run server-side on Cloudflare Workers + D1 (free database).
Posts and photos can be edited in the browser admin UI, and new YouTube videos are posted to the sermon board automatically every week.

## Quick start

```bash
nvm use                     # use Node 22 from .nvmrc (without nvm, install 22 LTS from https://nodejs.org)
npm install                 # first time only
cp .dev.vars.example .dev.vars   # first time only: local env vars (put your email in ADMIN_EMAILS)
npm run db:migrate:local    # first time only: create local DB tables (for members-only features)
npm run dev                 # dev server at http://localhost:4321 (reloads on file changes)
npm run build               # build deployable output into dist/ (client = static, server = Worker)
npm run preview             # preview the build output
npm run check               # type/syntax check
```

Requires Node.js **22.12 or later** (`npm run admin:create` needs 22.18 or later).
On the dev server, `/login` shows a "dev login" option that signs you in with just an email (not present in production).

## Project structure — where to edit what

```
src/
  data/site.json        church name, address, contact, social links, service times, home hero text/photo, news posters  ← most settings
  data/site.ts          validates site.json and derives values (map links, etc.) — only edit when adding fields
  data/nav.ts           menu "sections" (About, Media, Ministries…). Sub-items are generated from page files
  content/pages/        regular pages (Markdown). File path = URL, e.g. about/staff.md → /about/staff
  content/posts/        board posts. Folder = board
                        sermons/ video sermons · bulletins/ bulletins · resources/ resources · choir/ choir ·
                        special-services/ · mission-stories/ · children/ youth/ young-adult/ camping/
                        english/ newcomers/ serving/ community/ (department news under ministry pages)
  content/series/       sermon series (groups of YouTube videos)
  content/stories/      church stories (photo news)
  styles/_tokens.scss   color, font, spacing tokens  ← change the design here
  styles/*.scss         per-component styles
  components/, layouts/ UI parts and page shells (components/home/ = home page sections, components/members/ = members area parts)
  pages/                URL → page routing (index, [...slug], story/, 404, thanks)
  pages/login.astro, auth/, members/, manage/   members-only features (server-rendered, login required)
  pages/manage/content/   content management (edit posts/photos/settings → GitHub commit)
  lib/content/          content management engine: collections.ts (form definitions) · store.ts (GitHub/local storage) · forms.ts · changes.ts
  content/schemas.ts, data/site.schema.ts   front matter and settings schemas (shared by the build and the admin UI)
  middleware.ts         login protection and same-origin checks (server-rendered pages only)
  lib/auth/, lib/reports.ts, lib/db.ts   sessions, passwords, social login, members, report queries (Cloudflare D1)
public/
  admin/                (optional) developer Sveltia CMS — repo and login URL set in config.yml
  images/               images (hero, slides, headers, pages, staff, posts, series, stories, uploads …)
  files/                attachments such as bulletin PDFs
  fonts/                Nanum Myeongjo (Pretendard is bundled from the npm package)
  _redirects            legacy URLs → new URLs (applied automatically by Cloudflare)
  _headers, robots.txt  exclude /admin, /members, /manage from search engines
migrations/             D1 database table definitions (npm run db:migrate:local / :remote)
wrangler.jsonc          Cloudflare Workers config (D1 binding, static assets directory)
.dev.vars.example       example local env vars → copy to .dev.vars
scripts/
  import-youtube.mjs    new YouTube channel videos → posts/sermons (run weekly by GitHub Actions)
  fetch-fonts.mjs       download Nanum Myeongjo web fonts
  import/               tools for importing data from the old site
.github/workflows/
  youtube-sync.yml      weekly Monday YouTube sync, then commit
  deploy-cloudflare.yml deploy to Cloudflare Workers on every commit to main
```

## Content management — publish posts and photos with a site login

Admins (accounts that can access `/manage`) edit all content at **`/manage/content`**, no GitHub account needed:
14 boards (bulletin PDFs, small group discussion sheets, video sermons, department news …), sermon series, church stories, pages (by section), and site settings (service times, home hero, posters, contact info).

- Saving makes the server **commit to the GitHub repository** (under the editor's name), and GitHub Actions builds it so the change **goes live in 2–3 minutes**.
  In the meantime the list shows it as "pending deploy", and newly uploaded photos/PDFs open right away even before deploy.
- Post bodies use a rich text editor (bold, lists, links, photos, YouTube) and can be switched to "edit HTML directly". Page bodies contain Bootstrap classes, so they are edited as HTML.
- Values are validated against the schemas (`src/content/schemas.ts`, `src/data/site.schema.ts`) before saving, so bad values cannot break the build.
- Edit form definitions live in one place: `src/lib/content/collections.ts`. To add a board, add one line to `BOARDS`.

**Setup (one time, repository owner)**
1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
   - Repository access: *Only select repositories* → `ckgmc-site`
   - Permissions → Repository permissions → **Contents: Read and write** (no other permissions needed), expiration 1 year (reissue before it expires)
2. Add the token to the Worker: `npx wrangler secret put GITHUB_TOKEN` (paste the value when prompted). Locally, use `GITHUB_TOKEN` in `.dev.vars`.
3. Auto deploy: in the repository Settings → Secrets and variables → Actions, add `CLOUDFLARE_API_TOKEN` (dashboard My Profile → API Tokens → *Edit Cloudflare Workers* template) and
   `CLOUDFLARE_ACCOUNT_ID` (right side of Workers & Pages). After that, `.github/workflows/deploy-cloudflare.yml` deploys every commit to main.
4. If the repository has D1 changes, run `npm run db:migrate:remote` (includes the `content_changes` change log table).

> Local testing: run `npm run dev:content` (separate terminal) and set `CONTENT_LOCAL_URL` in `.dev.vars` → saves from the admin UI write straight to files in this folder instead of GitHub, and `astro dev` shows them immediately. Commit them yourself.

### (Optional) Developer CMS — Sveltia (`/admin/`, GitHub login)

Developers with a GitHub account can also use the [Sveltia CMS](https://sveltiacms.app) UI. It edits the same files and commits on save.

> **Status (2026-09-05)**: steps 1, 2, 4 (ALLOWED_DOMAINS), and 5 are done. Remaining: **3. create the GitHub OAuth App** and add its keys to the worker, and 6. invite editors.
> If you use `/manage/content` above, you do not need this setup.

1. **GitHub repository** — `dlwhdgus0810/ckgmc-site` (done).
2. **Login worker** — the `cms-auth/` folder in this repository is that worker. Deployed with `npm run cms-auth:deploy` and
   running at `https://sveltia-cms-auth.ckgmc-site.workers.dev` (done).
3. **GitHub OAuth App** — GitHub → Settings → Developer settings → OAuth Apps → *New OAuth App*
   - Application name: `CKGMC CMS` (any name)
   - Homepage URL: `https://ckgmc.org`
   - Authorization callback URL: `https://sveltia-cms-auth.ckgmc-site.workers.dev/callback`
   - After creating it, copy the *Client ID*, then create a *Client Secret* with *Generate a new client secret*.
4. **Worker variables** — in a terminal (paste the values when prompted):
   ```bash
   npx wrangler secret put GITHUB_CLIENT_ID --config cms-auth/wrangler.toml
   npx wrangler secret put GITHUB_CLIENT_SECRET --config cms-auth/wrangler.toml
   ```
   `ALLOWED_DOMAINS` = `ckgmc.org,www.ckgmc.org,ckgmc-site.ckgmc-site.workers.dev` is already set.
5. **config.yml** — `repo` and `base_url` in `public/admin/config.yml` are set (done).
6. **Invite editors** — invite the GitHub accounts of people who will post as repository Collaborators (Write).
   The church admin (admin@ckgmc.org) also needs a GitHub account to use this UI (separate from the site login account).
7. Open `https://ckgmc.org/admin/` → *Sign in with GitHub* → pick a board from the left list and write a post.

> Local testing: start `npm run dev`, open `http://localhost:4321/admin/index.html` in Chrome, and choose
> **Work with Local Repository** to edit files in this folder directly without logging in.

## Editing files directly

### Site settings (`src/data/site.json`)
Church name, address, phone, email, social links, service times (`serviceTimes`), home hero (`hero`: photo, title, intro, buttons),
verse of the week (`verse`), upcoming events (`events`: hidden automatically once the date passes, 3 shown on the home page), news posters (`notices`: `alt` required, `until` sets the last display date, opens the original image in a new tab when `href` is missing),
partner banners (`links`), and contact form endpoint (`formEndpoint`). All of these are editable in Content management → Site settings.
If a value is invalid, the build fails and tells you which field.

**Home hero photo**: the young adults group photo (`/images/pages/young-adult.jpg`) is used as a placeholder for now.
Put a sanctuary/congregation photo at least 1920px wide in `public/images/hero/` and update `hero.image`.

### Pages (`src/content/pages/<section>/<name>.md`)
```md
---
title: "예배 안내"                 # title (shown large in the banner)
subtitle: "Our Services"           # English subtitle (optional)
order: 50                          # menu order within the section (lower = higher)
menuTitle: "예배 안내"             # menu label (optional; defaults to "title subtitle")
headerImage: /images/headers/about-services.png   # banner photo (optional)
image: /images/pages/xxx.jpg       # ministry card photo on the home page (ministry pages)
description: "한 줄 설명"          # for cards and search engines (optional)
board: sermons                     # board to attach below this page (optional)
widget: contact                    # contact | baptism | membership | offering | map | service-times (optional)
hideFromNav: true                  # hide from the menu (optional)
---
Body (Markdown + HTML, Bootstrap 4 classes allowed)
```
**Adding a page** = create a `.md` file in a section folder (about, media, ministries, next-steps, missions). It is added to the menu automatically.
To add or rename a section itself, edit `src/data/nav.ts`.

### Posts (`src/content/posts/<board>/YYYY-MM-DD-name.md`)
```md
---
title: "주일예배 LIVE | 참된 믿음 | 송명철 목사 | 2026.08.02"
date: 2026-08-02T14:10            # shown exactly as written (no time zone)
writer: "이주혁"
youtube: "KH6vXZN1nfw"            # YouTube video ID (optional) → video and thumbnail automatically
attachments:                      # attachments (optional). Put files in public/files/ and list them
  - name: "20260830 주일예배 주보.pdf"
    file: "20260830.pdf"          # or /files/20260830.pdf
hidden: true                      # (optional) hide from the site. Use for posts the YouTube sync would recreate if deleted, e.g. duplicate videos
---
<p>Body</p>
```
Bulletin PDF attachments display inline on the post page (desktop); on phones they open with an "open in new tab" button.
Only the date is shown (the time is for sorting). Sermons imported from YouTube show the service date at the end of the title (`… | 2026.09.04`) instead of `date` (upload time).
Body `<img>` tags get their actual pixel size (width/height) added at build time (`src/lib/markdown-img-size.mjs`).

### Sermon series (`src/content/series/<name>.md`)
`title`, `thumbnail`, `ongoing` (shown on the home page while in progress), `date`, `updated`, `episodes: [{title, youtube}]`.

### Church stories (`src/content/stories/YYYY-MM-DD-name.md`)
`title`, `date`, `image` (cover), `images` (album), `permalink` (original Facebook post). The body is the story text.

## Changing the design
Only edit the variables in `src/styles/_tokens.scss` — navy (`$navy-*`), gold (`$gold-*`), text colors, fonts, spacing, corner radius.
Fonts are Pretendard (body and headings) and Nanum Myeongjo (Bible verses and quotes). To change Nanum Myeongjo, edit `scripts/fetch-fonts.mjs` and run `npm run fetch:fonts`.
Accessibility: all color pairs meet WCAG AA contrast (4.5:1), with keyboard focus rings, a skip-to-content link, and reduced motion support.

## Automatic YouTube sermon posts
`.github/workflows/youtube-sync.yml` reads the YouTube channel RSS (`youtubeChannelId` in `site.json`) **every Monday**,
adds videos not yet present to `src/content/posts/sermons/`, and commits → Cloudflare rebuilds automatically.
You can also run it immediately from the GitHub repository → Actions tab → *Run workflow*. Locally, use `npm run import:youtube`.
Titles and bodies are copied from the YouTube title and description, so polish them in the admin UI if needed.

## Contact form · baptism application form
A static site has no server, so it uses the free form service [FormSubmit](https://formsubmit.co) (no sign-up).
`formEndpoint` in `site.json` is set to `https://formsubmit.co/<email>`.
1. After deploying, **submit the contact form once** from the contact page.
2. Click the link in the FormSubmit "Activate" email sent to that address (first time only).
3. From then on, inquiries and baptism applications arrive by email, and senders are redirected to `/thanks`.

To avoid exposing the email address, switch to the random-string endpoint FormSubmit gives you after activation. Changing the email requires activating again.

## Members-only features — login · D-Group leader reports · one-on-one discipleship reports

These replace the member features of the old site. All of these URLs require login and are hidden from search engines.

| URL | Who | What |
|---|---|---|
| `/login` | everyone | social login (buttons shown only for configured providers) + email/password |
| `/members` | member | My page: profile, my submitted reports and admin replies |
| `/members/cell-report` | member | write a D-Group leader report (same 8 fields as the original) |
| `/members/care-report` | member | write a one-on-one discipleship report |
| `/members/password` | member | set/change password |
| `/manage` | admin | dashboard, approve pending members directly |
| `/manage/cell-reports`, `/manage/care-reports` | admin | report lists (group/department/date filters), reply and delete from detail, CSV download |
| `/manage/groups` | admin | add, edit, deactivate D-Groups |
| `/manage/stats` | admin | yearly group summary, monthly average attendance |
| `/manage/users` | admin | search, approve, change role/status, reset password, create accounts |
| `/manage/content` | admin | edit posts, photos, settings ("Content management" section above) |

**Roles and statuses**
* Roles: `관리자` (admin) / `교인` (member). Statuses: `승인 대기` (pending) / `활성` (active) / `비활성` (disabled).
* People who sign in with social login for the first time are **pending** and need admin approval before writing reports (prevents spam sign-ups).
* Emails listed in the `ADMIN_EMAILS` env var (comma-separated) become admins immediately, whichever way they sign in.
* Admins can also create an account with "Add new member" and share an initial password (for people without social accounts).

**Creating the first admin** (either one)
```bash
# 1) email/password account (written directly to the deployed DB)
npm run admin:create -- --email admin@ckgmc.org --name 관리자 --password 'password-8-chars-or-more' --remote
# 2) or put your Google email in ADMIN_EMAILS and use social login (after "Connecting social login" below)
```

**Connecting social login** (can be done later — buttons are simply hidden while the variables are empty)
* Google: [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth client ID (web) →
  authorized redirect URI `https://ckgmc.org/auth/google/callback` (also register the www domain if used) → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
* Facebook: [Meta for Developers](https://developers.facebook.com/) → app → Facebook Login → valid OAuth redirect URI
  `https://ckgmc.org/auth/facebook/callback` → `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` (email permission required)
* Set the variables in the Cloudflare dashboard → Workers & Pages → ckgmc-site → Settings → Variables and Secrets (locally, `.dev.vars`).
* To add another provider (Kakao, etc.), add an entry to `PROVIDERS` in `src/lib/auth/oauth.ts`.

**How it works**
* Data is stored in Cloudflare **D1** (SQLite). Table definitions are in `migrations/`; queries are in `src/lib/reports.ts` and `src/lib/auth/users.ts`.
* Sessions are a 30-day cookie + DB (`sessions`). Passwords are hashed with PBKDF2-SHA256 (`src/lib/auth/password.ts`).
* Login protection and CSRF (same-origin) checks happen in one place, `src/middleware.ts`. Static pages are unaffected.
* Replies show on the reporter's My page (not emailed like the original — connect a mail API such as Resend if needed).
* Personal data (members, reports) lives only in the DB, never in the repository. The group list is also entered in the admin UI.

## Deployment — Cloudflare Workers (free plan is enough)
Static pages and members-only features deploy as **a single Worker** (static asset requests are free and unlimited; server requests are limited to 100,000 per day).

> **Status (2026-09-05)**: steps 1–5 below are done. D1 `ckgmc` created and migrated, Worker `ckgmc-site` deployed —
> https://ckgmc-site.ckgmc-site.workers.dev , `ADMIN_EMAILS` secret set. Remaining: create the first admin (6), connect the domain (7), add the domain to the CMS worker (8), connect auto deploy (optional).
> To redeploy after code changes, run `npm run deploy`.

**One-time setup**
1. `npx wrangler login` (connect your Cloudflare account).
2. Create the DB: `npx wrangler d1 create ckgmc` → put the printed `database_id` into `d1_databases[0].database_id` in `wrangler.jsonc` and commit.
3. Create tables: `npm run db:migrate:remote`
4. First deploy: `npm run deploy` (= `npm run build && wrangler deploy`). This creates `https://ckgmc-site.<your-account>.workers.dev`.
5. Dashboard → Workers & Pages → ckgmc-site → Settings → Variables and Secrets: add `ADMIN_EMAILS` (and social login keys).
6. Create the first admin (see "Members-only features" above).
7. Connect `ckgmc.org` and `www.ckgmc.org` in Settings → Domains & Routes.
   - **The online giving embed only shows on `https://ckgmc.org`.** ChurchTrac allows only that origin via `frame-ancestors https://ckgmc.org`, so
     the workers.dev URL and `www.ckgmc.org` show only the "give on ChurchTrac" button (`allowedHosts` in `src/components/widgets/Offering.astro`).
     Add a Cloudflare → Rules → Redirect Rule `www.ckgmc.org/*` → `https://ckgmc.org/$1` (301), or allow the www origin in ChurchTrac settings.
8. Add the domains above and `ckgmc-site.<your-account>.workers.dev` to `ALLOWED_DOMAINS` of the admin UI (CMS) login worker.

**Auto deploy on every push**: `.github/workflows/deploy-cloudflare.yml` builds and deploys every commit to main.
The repository Secrets need `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (step 3 of "Content management → Setup" above).
Commits from content management saves or the YouTube sync are deployed by this workflow.

`public/_redirects` (legacy URL redirects) and `public/_headers` apply to static files automatically.
When changing the DB schema, add `migrations/000N_*.sql` and run `npm run db:migrate:local` / `:remote`.

## Importing data from the old site
This repository contains **sample data only** (a few recent posts per board, 5 series, 16 stories).
* `scripts/import/scrape-ckgmc.py` — downloads all posts, attachments, and images from the old site and saves them as JSON (requires `beautifulsoup4`)
* `scripts/import/json-to-markdown.py` — converts the JSON into Markdown under `src/content/` and copies images/PDFs to `public/`

If you have a DB dump, create a `data/<board>.json` per board in the form
`[{pid, title, datetime "YYYY-MM-DD HH:MM", writer, youtube, thumb, body(HTML), attachments:[{name,file}]}]` and run only the second script.
Adding every bulletin PDF (about 430 files, 530MB) makes the repository large, so including only the last 1–2 years is recommended.

## Differences from the old site
* Login, D-Group leader reports, one-on-one discipleship reports — reimplemented on Cloudflare Workers + D1 (see "Members-only features"). No self sign-up by email; admin approval or admin-issued accounts instead.
* Reply emails, the "support request" (vendor contact) menu, and group statistics charts — dropped. Group statistics are provided as tables.
* Edits are not instant: commit → auto deploy (2–3 minutes). In exchange, every change is kept in the repository history and can be reverted.
* Home page — instead of a poster slider: church photo hero + service times/directions info strip + this week's sermon and bulletin + ministry intro + newcomer guide.
* Facebook feed — requires an API token, so stories are managed as `content/stories/` Markdown (photo stories can be added in the admin UI).
* URL scheme — English paths such as `/about/staff`. Old Korean URLs are redirected via `public/_redirects`.
* Fonts — Pretendard + Nanum Myeongjo, self-hosted (no Google Fonts or jsDelivr dependency).

## Follow-ups (optional)
Structured data for search engines (JSON-LD), per-post share images, on-site search (Pagefind), share buttons, image lightbox, Astro `<Image>` optimization pipeline.
