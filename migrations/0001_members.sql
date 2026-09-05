-- 교인 전용 기능: 회원 · 세션 · D그룹 · D그룹 리더 보고서 · 일대일 양육보고서 · 답글
-- 적용: npm run db:migrate:local (개발)  /  npm run db:migrate:remote (배포)

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'member'  CHECK (role IN ('admin', 'member')),
  status        TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled')),
  password_hash TEXT,
  avatar_url    TEXT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_login_at TEXT
);

-- 소셜 로그인 계정 연결 (한 사람이 Google·Facebook 을 모두 연결할 수 있음)
CREATE TABLE IF NOT EXISTS user_identities (
  provider         TEXT    NOT NULL,
  provider_user_id TEXT    NOT NULL,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (provider, provider_user_id)
);
CREATE INDEX IF NOT EXISTS idx_identities_user ON user_identities(user_id);

-- 로그인 세션 (쿠키에는 토큰, DB 에는 토큰의 SHA-256 만 저장)
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 비밀번호 로그인 실패 기록 (같은 이메일로 15분 안에 5회 실패하면 잠시 차단)
CREATE TABLE IF NOT EXISTS login_attempts (
  email      TEXT NOT NULL COLLATE NOCASE,
  ip         TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, created_at);

-- D그룹 (소그룹)
CREATE TABLE IF NOT EXISTS groups (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  leaders      TEXT    NOT NULL DEFAULT '',   -- 리더 이름 (표시용)
  age          TEXT    NOT NULL DEFAULT '',   -- 대상 연령
  meeting_time TEXT    NOT NULL DEFAULT '',   -- 모임 시간
  focus        TEXT    NOT NULL DEFAULT '',   -- 모임 성격
  description  TEXT    NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- D그룹 리더 보고서
CREATE TABLE IF NOT EXISTS cell_reports (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id       INTEGER NOT NULL REFERENCES groups(id),
  user_id        INTEGER NOT NULL REFERENCES users(id),
  meeting_date   TEXT    NOT NULL,             -- YYYY-MM-DD
  attendance     INTEGER NOT NULL,
  absentees      TEXT    NOT NULL DEFAULT '[]', -- JSON [{"name":"","reason":""}]
  newcomers      TEXT    NOT NULL DEFAULT '',
  mood_score     INTEGER,                      -- 0~10 그룹 분위기
  prep_score     INTEGER,                      -- 0~10 모임 준비 정도
  reflection     TEXT    NOT NULL DEFAULT '',  -- 좋았던 점 / 개선할 점
  visits         TEXT    NOT NULL DEFAULT '',  -- 리더 심방 활동
  visit_requests TEXT    NOT NULL DEFAULT '',  -- 목회자 심방 요청
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_cell_reports_group_date ON cell_reports(group_id, meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_cell_reports_user ON cell_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cell_reports_date ON cell_reports(meeting_date DESC);

-- 일대일 양육보고서
CREATE TABLE IF NOT EXISTS care_reports (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id              INTEGER NOT NULL REFERENCES users(id),
  department           TEXT    NOT NULL,        -- 장년/청장년 | 청년
  barnabas_name        TEXT    NOT NULL,        -- 양육자(바나바)
  disciple_name        TEXT    NOT NULL,        -- 양육 대상자
  care_date            TEXT    NOT NULL,        -- YYYY-MM-DD
  week                 INTEGER NOT NULL,        -- 교육 주차
  curriculum           TEXT    NOT NULL,        -- 양육 교재
  attended_last_sunday INTEGER,                 -- 1 출석 / 0 불출석
  response             TEXT    NOT NULL DEFAULT '',
  prayer               TEXT    NOT NULL DEFAULT '',
  notes                TEXT    NOT NULL DEFAULT '',
  created_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_care_reports_user ON care_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_care_reports_date ON care_reports(care_date DESC);

-- 보고서 답글 (관리자 ↔ 보고자)
CREATE TABLE IF NOT EXISTS report_comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  report_type TEXT    NOT NULL CHECK (report_type IN ('cell', 'care')),
  report_id   INTEGER NOT NULL,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  body        TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_report ON report_comments(report_type, report_id, created_at);
