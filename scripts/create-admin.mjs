#!/usr/bin/env node
/**
 * 첫 관리자 계정 만들기 (또는 기존 계정을 관리자로 올리고 비밀번호 재설정).
 *
 *   npm run admin:create -- --email admin@ckgmc.org --name 관리자 --password '비밀번호8자이상'          # 로컬 DB
 *   npm run admin:create -- --email admin@ckgmc.org --name 관리자 --password '비밀번호8자이상' --remote  # 배포 DB
 *
 * 비밀번호는 여기서 해시되어 SQL 로만 전달됩니다 (사이트 코드의 src/lib/auth/password.ts 와 같은 방식).
 * Node 22.18 이상 필요 (.ts 파일을 그대로 불러옵니다).
 */
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const get = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const email = (get('email') ?? '').trim().toLowerCase();
const name = (get('name') ?? '').trim();
const password = get('password') ?? '';
const remote = args.includes('--remote');

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || password.length < 8) {
  console.error('사용법: npm run admin:create -- --email 이메일 --name 이름 --password 비밀번호(8자+) [--remote]');
  process.exit(1);
}

let hashPassword;
try {
  ({ hashPassword } = await import('../src/lib/auth/password.ts'));
} catch (e) {
  console.error('src/lib/auth/password.ts 를 불러오지 못했습니다. Node 22.18 이상인지 확인하세요 (node -v).');
  console.error(String(e));
  process.exit(1);
}

const hash = await hashPassword(password);
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sql = `INSERT INTO users (email, name, role, status, password_hash) VALUES (${q(email)}, ${q(name)}, 'admin', 'active', ${q(hash)})
ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = 'admin', status = 'active', password_hash = excluded.password_hash;`;

console.log(`${remote ? '배포(remote)' : '로컬(local)'} DB 에 관리자 계정을 기록합니다: ${email}`);
const r = spawnSync('npx', ['wrangler', 'd1', 'execute', 'ckgmc', remote ? '--remote' : '--local', '--command', sql], { stdio: 'inherit', shell: false });
process.exit(r.status ?? 1);
