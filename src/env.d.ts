/**
 * 서버 렌더링 페이지에서 쓰는 요청별 값 (src/middleware.ts 가 채움)
 * Cloudflare 바인딩(env.DB 등)의 타입은 `wrangler types` 가 만드는 worker-configuration.d.ts 에 있습니다.
 */
import type { SessionUser } from './lib/auth/session';

declare global {
  namespace App {
    interface Locals {
      /** 로그인한 사용자. 비로그인·정적 페이지에서는 null */
      user: SessionUser | null;
    }
  }
}

export {};
