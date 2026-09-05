// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // 실제 배포 도메인으로 바꿔주세요 (sitemap, canonical URL 등에 사용)
  site: 'https://ckgmc.org',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  // 교인/관리자 기능(로그인이 필요한 페이지)은 Cloudflare Workers 에서 서버 렌더링됩니다.
  // 나머지 페이지는 그대로 정적 파일로 빌드됩니다 (각 페이지의 `export const prerender = false` 로 구분).
  adapter: cloudflare({ imageService: 'passthrough' }),
  // 로그인 세션은 D1 에 직접 저장하므로 Astro 내장 세션(KV)은 쓰지 않습니다.
  session: false,
  // sitemap.xml 자동 생성 (검색엔진 등록용). 로그인 전용 페이지는 제외
  integrations: [sitemap({ filter: (page) => !/\/(thanks|404|login|members|manage|auth)(\/|$)/.test(page) })],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // Bootstrap 4는 오래된 Sass 문법을 사용하므로 경고를 숨깁니다.
          quietDeps: true,
          silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'slash-div', 'legacy-js-api', 'if-function'],
        },
      },
    },
  },
});
