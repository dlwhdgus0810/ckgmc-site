/**
 * 소셜 로그인 (OAuth 2.0 / OIDC). 라이브러리 없이 표준 흐름만 구현했습니다.
 * 공급자를 추가하려면 PROVIDERS 에 항목을 넣고 .dev.vars.example 에 변수 이름을 적으면 됩니다.
 * state(+PKCE verifier)는 10분짜리 HttpOnly 쿠키에 보관해 콜백에서 대조합니다.
 */
import type { AstroCookies } from 'astro';
import { oauthConfig, type ProviderId } from '../env';

export interface OAuthProfile {
  provider: ProviderId;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
}

interface ProviderDef {
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  pkce: boolean;
  extraAuthParams?: Record<string, string>;
  fetchProfile(accessToken: string): Promise<OAuthProfile>;
}

async function getJson<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, { headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' } });
  if (!res.ok) throw new Error(`프로필을 가져오지 못했습니다 (${res.status})`);
  return (await res.json()) as T;
}

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  google: {
    label: 'Google',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    pkce: true,
    extraAuthParams: { prompt: 'select_account' },
    async fetchProfile(token) {
      const j = await getJson<{ sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string }>(
        'https://openidconnect.googleapis.com/v1/userinfo', token,
      );
      if (!j.email) throw new Error('Google 계정에서 이메일을 받지 못했습니다.');
      return { provider: 'google', providerUserId: j.sub, email: j.email, emailVerified: j.email_verified === true, name: j.name ?? j.email.split('@')[0], avatarUrl: j.picture ?? null };
    },
  },
  facebook: {
    label: 'Facebook',
    authorizeUrl: 'https://www.facebook.com/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/oauth/access_token',
    scope: 'email,public_profile',
    pkce: false,
    async fetchProfile(token) {
      const j = await getJson<{ id: string; name?: string; email?: string; picture?: { data?: { url?: string } } }>(
        'https://graph.facebook.com/me?fields=id,name,email,picture.type(large)', token,
      );
      if (!j.email) throw new Error('Facebook 계정에 이메일이 없어 로그인할 수 없습니다. 다른 방법으로 로그인해 주세요.');
      return { provider: 'facebook', providerUserId: j.id, email: j.email, emailVerified: true, name: j.name ?? j.email.split('@')[0], avatarUrl: j.picture?.data?.url ?? null };
    },
  },
};

export const isProviderId = (s: string): s is ProviderId => s === 'google' || s === 'facebook';

const STATE_COOKIE = 'ck_oauth';
interface StateCookie { p: ProviderId; s: string; v?: string; n: string }

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

/** 공급자 로그인 화면으로 보낼 주소를 만들고 state 쿠키를 심습니다 */
export async function beginLogin(provider: ProviderId, cookies: AstroCookies, redirectUri: string, next: string): Promise<string> {
  const cfg = oauthConfig(provider);
  if (!cfg) throw new Error('설정되지 않은 로그인 방법입니다.');
  const def = PROVIDERS[provider];
  const state = random();
  const data: StateCookie = { p: provider, s: state, n: next };
  const url = new URL(def.authorizeUrl);
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', def.scope);
  url.searchParams.set('state', state);
  for (const [k, v] of Object.entries(def.extraAuthParams ?? {})) url.searchParams.set(k, v);
  if (def.pkce) {
    const verifier = random(48);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    url.searchParams.set('code_challenge', b64url(new Uint8Array(digest)));
    url.searchParams.set('code_challenge_method', 'S256');
    data.v = verifier;
  }
  cookies.set(STATE_COOKIE, JSON.stringify(data), { path: '/', httpOnly: true, sameSite: 'lax', secure: import.meta.env.PROD, maxAge: 600 });
  return url.toString();
}

/** 콜백: state 대조 → 토큰 교환 → 프로필. 실패하면 한국어 메시지의 Error */
export async function completeLogin(provider: ProviderId, url: URL, cookies: AstroCookies, redirectUri: string): Promise<{ profile: OAuthProfile; next: string }> {
  const cfg = oauthConfig(provider);
  if (!cfg) throw new Error('설정되지 않은 로그인 방법입니다.');
  const raw = cookies.get(STATE_COOKIE)?.value;
  cookies.delete(STATE_COOKIE, { path: '/' });
  let saved: StateCookie | null = null;
  try { saved = raw ? (JSON.parse(raw) as StateCookie) : null; } catch { saved = null; }

  const err = url.searchParams.get('error');
  if (err) throw new Error(err === 'access_denied' ? '로그인이 취소되었습니다.' : `로그인에 실패했습니다 (${err}).`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || !saved || saved.p !== provider || saved.s !== state) {
    throw new Error('로그인 요청이 만료되었거나 올바르지 않습니다. 다시 시도해 주세요.');
  }

  const def = PROVIDERS[provider];
  const body = new URLSearchParams({
    grant_type: 'authorization_code', code, redirect_uri: redirectUri,
    client_id: cfg.clientId, client_secret: cfg.clientSecret,
  });
  if (def.pkce && saved.v) body.set('code_verifier', saved.v);
  const tokenRes = await fetch(def.tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body });
  if (!tokenRes.ok) throw new Error(`로그인 토큰을 받지 못했습니다 (${tokenRes.status}).`);
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) throw new Error('로그인 토큰이 비어 있습니다.');

  const profile = await def.fetchProfile(token.access_token);
  return { profile, next: saved.n || '/members' };
}
