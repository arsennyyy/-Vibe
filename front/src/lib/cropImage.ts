export type CropArea = { x: number; y: number; width: number; height: number };

export type CropImageOptions = {
  maxWidth?: number;
  mimeType?: string;
  quality?: number;
};

export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: CropArea,
  options?: CropImageOptions
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const mimeType = options?.mimeType ?? "image/jpeg";
  const quality = options?.quality ?? 0.92;

  let outW = Math.round(pixelCrop.width);
  let outH = Math.round(pixelCrop.height);
  const maxWidth = options?.maxWidth;
  if (maxWidth && outW > maxWidth) {
    const scale = maxWidth / outW;
    outW = maxWidth;
    outH = Math.round(outH * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Не удалось обрезать"))),
      mimeType,
      quality
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

export const EVENT_HERO_MIN_HEIGHT_PX = 480;
const EVENT_NAV_HEIGHT_PX = 80; // h-20 = 5rem

/** Измеряет 100dvh — как в Tailwind на Event.tsx, а не window.innerHeight. */
function measureDvhPx(): number {
  if (typeof document === "undefined") return 900;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;height:100dvh;width:0;visibility:hidden;pointer-events:none;";
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  document.body.removeChild(probe);
  return h > 0 ? h : window.innerHeight;
}

/** Как Event.tsx: w-full × h-[calc(100dvh-5rem)], min-h 480px */
export function getEventCoverAspect(): number {
  if (typeof window === "undefined") return 16 / 9;
  const viewportWidth = window.innerWidth;
  const heroHeight = Math.max(measureDvhPx() - EVENT_NAV_HEIGHT_PX, EVENT_HERO_MIN_HEIGHT_PX);
  return viewportWidth / heroHeight;
}

export function getEventCoverExportDimensions(aspect = getEventCoverAspect()) {
  const width = 1920;
  return { width, height: Math.round(width / aspect) };
}

export function formatEventCoverRecommendation(): string {
  const { width, height } = getEventCoverExportDimensions();
  return `${width}×${height} px`;
}

/** @deprecated используйте getEventCoverAspect() */
export const EVENT_COVER_ASPECT = 1920 / 1000;
