import { useRef, useState } from "react";
import { Plus, Trash2, Link2, Loader2, ImageIcon, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { config } from "@/config";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { LineupArtist } from "@/lib/lineupTypes";
import { isGeniusProfileUrl } from "@/lib/lineupTypes";
import ArtistCard from "@/components/lineup/ArtistCard";

const fieldInput =
  "h-11 bg-[#0a0a0a] border-white/[0.12] text-white placeholder:text-white/25 focus-visible:border-white/25 focus-visible:ring-white/10 [color-scheme:dark]";
const fieldLabel = "text-[11px] font-medium uppercase tracking-widest text-white/45 mb-2 block";

type Props = {
  artists: LineupArtist[];
  onChange: (next: LineupArtist[]) => void;
  disabled?: boolean;
};

const ArtistLineupEditor = ({ artists, onChange, disabled }: Props) => {
  const [fetchingIdx, setFetchingIdx] = useState<number | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const update = (idx: number, patch: Partial<LineupArtist>) => {
    onChange(artists.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const addArtist = () => onChange([...artists, { name: "" }]);

  const removeArtist = (idx: number) => onChange(artists.filter((_, i) => i !== idx));

  const fetchGeniusProfile = async (idx: number) => {
    const link = artists[idx]?.geniusUrl?.trim();
    if (!link || !isGeniusProfileUrl(link)) {
      toast.error("Ссылка Genius: genius.com/artists/… или genius.com/имя_пользователя");
      return;
    }
    setFetchingIdx(idx);
    try {
      const res = await fetch(
        `${config.apiUrl}/api/organizer/genius-preview?url=${encodeURIComponent(link)}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Не удалось загрузить профиль");
      update(idx, {
        name: data.name?.trim() || artists[idx].name,
        avatarUrl: data.avatarUrl?.trim() || artists[idx].avatarUrl,
        geniusUrl: data.geniusUrl?.trim() || link,
        avatarSyncedAt: data.avatarSyncedAt || new Date().toISOString(),
        bandLink: undefined,
      });
      toast.success("Профиль Genius подтянут");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка Genius");
    } finally {
      setFetchingIdx(null);
    }
  };

  const uploadAvatar = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(config.endpoints.organizer.uploadLineupAvatar, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Не удалось загрузить");
      update(idx, { avatarUrl: data.path || data.url, avatarSyncedAt: new Date().toISOString() });
      toast.success("Фото артиста загружено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploadingIdx(null);
    }
  };

  return (
    <div className="space-y-5">
      {artists.length === 0 ? (
        <p className="text-sm text-white/35">
          Добавьте артиста — имя и ссылку Genius (артист или профиль пользователя)
        </p>
      ) : null}

      {artists.map((artist, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white/50">Артист {idx + 1}</span>
            {!disabled ? (
              <button
                type="button"
                onClick={() => removeArtist(idx)}
                className="p-1.5 rounded-lg text-white/35 hover:text-rose-400 hover:bg-white/5"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div>
            <label className={fieldLabel}>Имя на афише</label>
            <Input
              className={fieldInput}
              placeholder="Markul"
              value={artist.name}
              disabled={disabled}
              onChange={(e) => update(idx, { name: e.target.value })}
            />
          </div>

          <div>
            <label className={fieldLabel}>
              Профиль Genius{" "}
              <span className="text-white/25 normal-case tracking-normal">
                (артист /artists/… или пользователь /username)
              </span>
            </label>
            <div className="flex gap-2">
              <Input
                className={cn(fieldInput, "flex-1")}
                placeholder="https://genius.com/artists/Markul или genius.com/illicitmiracle"
                value={artist.geniusUrl ?? ""}
                disabled={disabled}
                onChange={(e) => update(idx, { geniusUrl: e.target.value, bandLink: undefined })}
              />
              {!disabled ? (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 border-white/15 bg-transparent text-white hover:bg-white/5"
                  disabled={fetchingIdx === idx}
                  onClick={() => void fetchGeniusProfile(idx)}
                >
                  {fetchingIdx === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                </Button>
              ) : null}
            </div>
          </div>

          <div>
            <label className={fieldLabel}>Фото артиста</label>
            <div className="flex flex-wrap gap-2">
              {!disabled ? (
                <>
                  <input
                    ref={(el) => {
                      fileRefs.current[idx] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadAvatar(idx, file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/15 bg-transparent text-white hover:bg-white/5"
                    disabled={uploadingIdx === idx}
                    onClick={() => fileRefs.current[idx]?.click()}
                  >
                    {uploadingIdx === idx ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    С компьютера
                  </Button>
                </>
              ) : null}
            </div>
            <div className="relative mt-2">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                className={cn(fieldInput, "pl-10")}
                placeholder="Подтянется с Genius или загрузите файл"
                value={artist.avatarUrl ?? ""}
                disabled={disabled}
                onChange={(e) => update(idx, { avatarUrl: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}

      {!disabled ? (
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed border-white/15 bg-transparent text-white/70 hover:bg-white/5"
          onClick={addArtist}
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить артиста
        </Button>
      ) : null}

      {artists.some((a) => a.name.trim()) ? (
        <div className="space-y-3 pt-2">
          <p className={fieldLabel}>Как увидит зритель (карточка артиста)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {artists
              .filter((a) => a.name.trim())
              .map((a, i) => (
                <ArtistCard key={`${a.name}-${i}`} artist={a} preview />
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ArtistLineupEditor;
