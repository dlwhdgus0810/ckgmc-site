// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // 실제 배포 도메인으로 바꿔주세요 (sitemap, canonical URL 등에 사용)
  site: 'https://ckgmc.org',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
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
