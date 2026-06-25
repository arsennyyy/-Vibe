import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/lib/resolveAvatarUrl";
import { config } from "@/config";
import { toast } from "sonner";
import AvatarCropDialog from "./AvatarCropDialog";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  avatarUrl?: string;
  onAvatarChange: (url: string | undefined) => void;
  className?: string;
};

export default function ProfileAvatarPicker({ name, avatarUrl, onAvatarChange, className }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickFile = () => fileRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropSrc(url);
  };

  const uploadBlob = async (blob: Blob) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "avatar.jpg");
      const res = await fetch(config.endpoints.user.avatar, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || `Ошибка ${res.status}`);
      }
      const data = await res.json();
      onAvatarChange(data.avatarUrl as string);
      toast.success("Аватар обновлён");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось загрузить");
    } finally {
      setUploading(false);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
  };

  const deleteAvatar = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setUploading(true);
    try {
      const res = await fetch(`${config.endpoints.user.avatar}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Не удалось удалить");
      onAvatarChange(undefined);
      toast.success("Аватар удалён");
    } catch {
      toast.error("Не удалось удалить аватар");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFile}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={uploading}>
          <button
            type="button"
            className={cn(
              "group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 mb-4",
              className
            )}
            aria-label="Управление аватаром"
          >
            <Avatar className="h-24 w-24 ring-2 ring-white/10 ring-offset-4 ring-offset-[#161616]">
              {avatarUrl ? (
                <AvatarImage src={resolveAvatarUrl(avatarUrl)} alt={name} className="object-cover" />
              ) : null}
              <AvatarFallback className="font-display text-2xl bg-white/10 text-white">
                {name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="bg-[#161616] border-white/10 text-white w-48">
          <DropdownMenuItem className="cursor-pointer focus:bg-white/10" onClick={pickFile}>
            <Camera className="mr-2 h-4 w-4" />
            Сменить аватар
          </DropdownMenuItem>
          {avatarUrl ? (
            <DropdownMenuItem
              className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400"
              onClick={deleteAvatar}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить аватар
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {cropSrc ? (
        <AvatarCropDialog
          open
          imageSrc={cropSrc}
          onClose={() => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          onConfirm={uploadBlob}
        />
      ) : null}
    </>
  );
}
