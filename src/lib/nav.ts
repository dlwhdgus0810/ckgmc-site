import { getCollection } from 'astro:content';
import { sections, type NavItem, type NavSection } from '../data/nav';

/** 섹션 라벨을 "한국어 English" 형태로 */
export function sectionLabel(s: NavSection): string {
  return s.labelEn ? `${s.label} ${s.labelEn}` : s.label;
}

/** 페이지 컬렉션에서 메뉴 구조를 만듭니다 (섹션 정의는 src/data/nav.ts). */
export async function getNav(): Promise<NavSection[]> {
  const pages = await getCollection('pages', (p) => !p.data.hideFromNav);
  return sections.map((s) => {
    if (s.href) return { ...s, items: undefined };
    const items: NavItem[] = pages
      .filter((p) => p.id.includes('/') && p.id.split('/')[0] === s.key)
      .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title, 'ko'))
      .map((p) => ({
        label: p.data.menuTitle ?? (p.data.subtitle ? `${p.data.title} ${p.data.subtitle}` : p.data.title),
        href: '/' + p.id,
      }));
    return { ...s, items };
  });
}

const clean = (pathname: string) => pathname.replace(/\/$/, '') || '/';

/** URL 로 섹션 찾기. 예: '/about/staff' → about */
export function findSection(nav: NavSection[], pathname: string): NavSection | undefined {
  const key = clean(pathname).split('/').filter(Boolean)[0];
  return nav.find((s) => s.key === key && s.items);
}

/** URL 로 메뉴 항목 찾기 */
export function findNavItem(nav: NavSection[], pathname: string): { section: NavSection; item: NavItem } | undefined {
  const path = clean(pathname);
  for (const section of nav) {
    for (const item of section.items ?? []) if (item.href === path) return { section, item };
  }
  return undefined;
}
