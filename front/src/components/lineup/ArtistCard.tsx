import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/resolveMediaUrl";
import type { LineupArtist } from "@/lib/lineupTypes";
import { resolveGeniusUrl, getGeniusProfileKind } from "@/lib/lineupTypes";

type Props = {
  artist: LineupArtist;
  preview?: boolean;
  className?: string;
};

const ArtistCard = ({ artist, preview, className }: Props) => {
  const geniusUrl = resolveGeniusUrl(artist);
  const hasLink = Boolean(geniusUrl);
  const profileKind = geniusUrl ? getGeniusProfileKind(geniusUrl) : null;
  const avatar = artist.avatarUrl ? resolveMediaUrl(artist.avatarUrl) : null;
  const initial = artist.name.charAt(0).toUpperCase() || "?";

  const inner = (
    <>
      <div className="relative">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="h-20 w-20 rounded-2xl object-cover border border-white/10 shadow-lg"
          />
        ) : (
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/30 to-[#1a1a22] border border-white/10 flex items-center justify-center">
            <span className="font-display text-2xl font-bold text-white/80">{initial}</span>
          </div>
        )}
        {hasLink ? (
          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#8b5cf6] border-2 border-[#121218] shadow-md">
            <ExternalLink className="h-3.5 w-3.5 text-white" />
          </span>
        ) : null}
      </div>
      <div className="text-center space-y-1.5 w-full">
        <h4 className="font-semibold text-white text-sm leading-tight">{artist.name}</h4>
        {hasLink ? (
          <p className="text-[11px] text-[#c4b5fd]/90 leading-snug px-1">
            {preview
              ? profileKind === "artist"
                ? "Артист Genius — нажмите для профиля"
                : "Профиль начинающего артиста Genius"
              : profileKind === "artist"
                ? "Верифицированный артист на Genius"
                : "Профиль начинающего артиста на Genius"}
          </p>
        ) : (
          <p className="text-[11px] text-white/30">Участник мероприятия</p>
        )}
      </div>
    </>
  );

  if (hasLink && !preview) {
    return (
      <a
        href={geniusUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group flex flex-col items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-5",
          "hover:border-[#8b5cf6]/45 hover:bg-[#8b5cf6]/[0.06] transition-all duration-200",
          className
        )}
      >
        {inner}
      </a>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-5",
        preview && hasLink && "ring-1 ring-[#8b5cf6]/30",
        className
      )}
    >
      {inner}
    </div>
  );
};

export default ArtistCard;
