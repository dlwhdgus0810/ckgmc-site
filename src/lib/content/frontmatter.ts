/** 마크다운 파일의 프런트매터(YAML) 읽기/쓰기 */
import { parse, stringify } from 'yaml';

export function parseFrontmatter(text: string): { data: Record<string, unknown>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { data: {}, body: text };
  const parsed = parse(m[1]);
  const data = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  return { data, body: m[2].replace(/^\r?\n/, '') };
}

export function serializeFrontmatter(data: Record<string, unknown>, body: string): string {
  const yamlText = stringify(data, { lineWidth: 0 });
  return `---\n${yamlText}---\n\n${body.trim()}\n`;
}
