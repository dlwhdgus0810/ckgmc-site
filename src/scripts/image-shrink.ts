/**
 * 올리기 전에 브라우저에서 사진을 줄입니다 (관리 화면 전용).
 * 휴대전화·카메라 원본(3~5MB, 4000px)이 그대로 저장소와 사이트에 올라가면 페이지가 느려지므로,
 * 긴 변을 2000px 로 줄이고 JPEG(품질 85)로 다시 저장합니다. 투명한 부분이 있는 PNG 는 PNG 로 둡니다.
 * 이미 작은 파일(400KB 이하), 움직이는 GIF, SVG, 줄여도 작아지지 않는 파일은 그대로 돌려줍니다.
 */
const MAX_SIDE = 2000;
const SKIP_BELOW = 400 * 1024;
const JPEG_QUALITY = 0.85;

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); // 휴대전화 사진의 회전 정보 반영
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch { /* 아래 <img> 방식으로 다시 시도 */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size <= SKIP_BELOW) return file;
  try {
    const img = await decode(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height);
    img.close();

    // 투명한 픽셀이 있으면 JPEG 로 바꾸지 않음 (배경이 검게 됨)
    let hasAlpha = false;
    if (file.type !== 'image/jpeg') {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < data.length; i += 4) if (data[i] < 250) { hasAlpha = true; break; }
    }
    const type = hasAlpha ? 'image/png' : 'image/jpeg';
    const blob = await toBlob(canvas, type, hasAlpha ? undefined : JPEG_QUALITY);
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + (hasAlpha ? '.png' : '.jpg');
    return new File([blob], name, { type, lastModified: file.lastModified });
  } catch {
    return file; // 줄이지 못하면 원본 그대로 올림
  }
}

const mb = (n: number) => (n / 1048576).toFixed(1) + 'MB';
/** "사진 3장을 줄였습니다 (9.8MB → 1.2MB)" — 줄어든 것이 없으면 빈 문자열 */
export function shrinkSummary(before: File[], after: File[]): string {
  const a = before.reduce((s, f) => s + f.size, 0);
  const b = after.reduce((s, f) => s + f.size, 0);
  const n = after.filter((f, i) => f !== before[i]).length;
  return n ? `사진 ${n}장의 크기를 줄였습니다 (${mb(a)} → ${mb(b)})` : '';
}
