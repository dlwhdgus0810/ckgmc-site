/**
 * Cloudflare 환경 변수 읽기. 값은 대시보드(Workers → Settings → Variables)나 `.dev.vars`(로컬)에 넣습니다.
 * 이름 목록과 설명은 .dev.vars.example 을 보세요.
 */
import { env } from 'cloudflare:workers';

function str(name: string): string | undefined {
  const v = (env as unknown as Record<string, unknown>)[name];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

/** 자동으로 관리자가 되는 이메일 목록 (소문자) */
export function adminEmails(): string[] {
  return (str('ADMIN_EMAILS') ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
export function isAdminEmail(email: string): boolean {
  return adminEmails().includes(email.trim().toLowerCase());
}

export type ProviderId = 'google' | 'facebook';
export const PROVIDER_IDS: ProviderId[] = ['google', 'facebook'];

/** 소셜 로그인 설정. 클라이언트 ID/시크릿이 둘 다 있어야 켜집니다 */
export function oauthConfig(provider: ProviderId): { clientId: string; clientSecret: string } | null {
  const key = provider.toUpperCase();
  const clientId = str(`${key}_CLIENT_ID`);
  const clientSecret = str(`${key}_CLIENT_SECRET`);
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}
export function enabledProviders(): ProviderId[] {
  return PROVIDER_IDS.filter((p) => oauthConfig(p) !== null);
}
