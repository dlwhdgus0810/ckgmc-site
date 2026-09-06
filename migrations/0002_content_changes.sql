-- 관리 화면에서 한 콘텐츠 변경 기록 (목록에 "배포 대기" 표시, 누가 언제 무엇을 바꿨는지)
CREATE TABLE IF NOT EXISTS content_changes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  collection TEXT    NOT NULL,
  path       TEXT    NOT NULL,             -- 저장소 안 파일 경로
  title      TEXT    NOT NULL DEFAULT '',
  action     TEXT    NOT NULL CHECK (action IN ('create', 'update', 'delete', 'upload')),
  user_id    INTEGER REFERENCES users(id),
  commit_sha TEXT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_content_changes_created ON content_changes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_changes_path ON content_changes(path, created_at DESC);
