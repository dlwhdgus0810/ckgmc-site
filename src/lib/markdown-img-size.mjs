/**
 * 마크다운(그리고 그 안의 순수 HTML) 본문의 <img> 에 실제 픽셀 크기(width/height)를 채우는 Sätteri hast 플러그인.
 * 사진이 로딩되기 전에도 자리를 잡아 두어 아래 내용이 밀리지 않게 합니다 (CLS 방지).
 * 이미 width 나 height 가 있는 태그, public/ 밖의 이미지(외부 URL·data:)는 그대로 둡니다.
 * alt 속성이 없는 <img> 에는 빈 alt 도 넣습니다 (설명이 필요한 사진은 글에서 alt 를 직접 적어 주세요).
 * astro.config.mjs → markdown.processor: satteri({ features: { rawHtml: true }, hastPlugins: [imgSizePlugin] })
 */
import { imageSize } from './image-size.mjs';

/** @type {import('satteri').HastPluginDefinition} */
export const imgSizePlugin = {
  name: 'ckgmc-img-size',
  element: {
    filter: ['img'],
    async visit(node, ctx) {
      const p = node.properties ?? {};
      // 옮겨온 글의 사진에는 alt 가 없는 경우가 많습니다. alt 가 아예 없으면 화면 낭독기가 파일 이름을 읽으므로 빈 alt 를 넣습니다
      if (p.alt === undefined || p.alt === null) ctx.setProperty(node, 'alt', '');
      if (p.width || p.height) return;
      const size = await imageSize(p.src);
      if (!size) return;
      ctx.setProperty(node, 'width', String(size.width));
      ctx.setProperty(node, 'height', String(size.height));
    },
  },
};
