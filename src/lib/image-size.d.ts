export function imageSize(src: unknown, publicDir?: string): Promise<{ width: number; height: number } | null>;
export function imageSizeMap(dir: string, publicDir?: string): Promise<Record<string, { width: number; height: number }>>;
