import { Calendar, Shield, Sparkles, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/lib/resolveAvatarUrl";
import { cn } from "@/lib/utils";

type ProfileAccountCardProps = {
  name: string;
  email: string;
  joinedDate: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  isOrganizer?: boolean;
};

export default function ProfileAccountCard({
  name,
  email,
  joinedDate,
  avatarUrl,
  isAdmin,
  isOrganizer,
}: ProfileAccountCardProps) {
  const role = isAdmin ? "Администратор" : isOrganizer ? "Организатор" : "Зритель";
  const roleStyle = isAdmin
    ? "border-violet-500/35 bg-violet-500/15 text-violet-200"
    : isOrganizer
      ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-200"
      : "border-border bg-muted text-muted-foreground";

  const memberSince = new Date(joinedDate).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const avatarSrc = resolveAvatarUrl(avatarUrl ?? undefined);

  const rows = [
    {
      icon: Shield,
      label: "Роль",
      value: role,
      iconWrap: "bg-violet-500/15 text-[#c4b5fd]",
    },
    {
      icon: Calendar,
      label: "С нами",
      value: memberSince,
      iconWrap: "bg-sky-500/10 text-sky-300",
    },
    {
      icon: User,
      label: "Email",
      value: email,
      iconWrap: "bg-white/5 text-white/50",
      truncate: true,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#8B5CF6]/30 bg-gradient-to-br from-violet-500/10 via-[var(--vibe-surface)] to-[var(--vibe-surface-elevated)] p-6 shadow-[0_0_48px_var(--vibe-glow-violet-soft)]">
      <div
        className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#8B5CF6]/25 blur-3xl pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-sky-500/10 blur-2xl pointer-events-none"
        aria-hidden
      />

      <div className="relative">
        <div className="flex items-center gap-4 mb-5">
          <div className="relative shrink-0">
            <Avatar className="h-16 w-16 rounded-2xl ring-2 ring-[#8B5CF6]/35 shadow-lg shadow-violet-600/20">
              {avatarSrc ? (
                <AvatarImage src={avatarSrc} alt={name} className="object-cover rounded-2xl" />
              ) : null}
              <AvatarFallback className="rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#5b21b6] text-2xl font-display font-black text-white">
                {name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-[#00e59b] border-2 border-[#14141c]"
              title="Активен"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#a78bfa] mb-1">
              Аккаунт
            </p>
            <p className="font-display font-bold text-foreground text-lg truncate">{name}</p>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border",
            roleStyle
          )}
        >
          {isOrganizer || isAdmin ? (
            <Sparkles className="h-3 w-3 opacity-80" />
          ) : (
            <User className="h-3 w-3 opacity-80" />
          )}
          {role}
        </span>

        <ul className="mt-6 space-y-2.5">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-3.5 py-3"
            >
              <div
                className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                  row.iconWrap
                )}
              >
                <row.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{row.label}</p>
                <p
                  className={cn(
                    "text-sm font-medium text-foreground mt-0.5",
                    row.truncate && "truncate"
                  )}
                >
                  {row.value}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
