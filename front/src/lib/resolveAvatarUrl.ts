import { resolveMediaUrl, toStorageMediaPath } from "@/lib/resolveMediaUrl";

export { toStorageMediaPath };

export function resolveAvatarUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const resolved = resolveMediaUrl(url);
  return resolved || undefined;
}
