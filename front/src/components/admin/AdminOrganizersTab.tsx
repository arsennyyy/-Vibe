import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { config } from "@/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { adminInput, adminShell, adminFieldLabel } from "@/lib/adminUi";
import { resolveAvatarUrl } from "@/lib/resolveAvatarUrl";
import { UserMinus, UserPlus, Users, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type UserRow = {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  isOrganizer?: boolean;
};

type Props = {
  getToken: () => string | null;
};

function UserAvatar({ name, avatarUrl, className }: { name: string; avatarUrl?: string | null; className?: string }) {
  const src = resolveAvatarUrl(avatarUrl ?? undefined);
  return (
    <Avatar className={cn("h-10 w-10 shrink-0 ring-1 ring-white/10", className)}>
      {src ? <AvatarImage src={src} alt={name} className="object-cover" /> : null}
      <AvatarFallback className="bg-gradient-to-br from-[#8B5CF6]/40 to-[#6d28d9]/30 text-sm font-bold text-white">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

const AdminOrganizersTab = ({ getToken }: Props) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UserRow[]>([]);
  const [organizers, setOrganizers] = useState<UserRow[]>([]);
  const [openSuggest, setOpenSuggest] = useState(false);

  const mapUser = (u: Record<string, unknown>): UserRow => ({
    id: Number(u.id ?? u.Id),
    name: String(u.name ?? u.Name ?? ""),
    email: String(u.email ?? u.Email ?? ""),
    avatarUrl: (u.avatarUrl ?? u.AvatarUrl ?? null) as string | null,
    isOrganizer: Boolean(u.isOrganizer ?? u.IsOrganizer),
  });

  const loadOrganizers = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const res = await fetch(config.endpoints.admin.organizers, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setOrganizers((data || []).map(mapUser));
    }
  }, [getToken]);

  useEffect(() => {
    loadOrganizers();
  }, [loadOrganizers]);

  useEffect(() => {
    if (query.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      const token = getToken();
      if (!token) return;
      const res = await fetch(
        `${config.endpoints.admin.usersSearch}?q=${encodeURIComponent(query.trim())}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions((data || []).map(mapUser));
        setOpenSuggest(true);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query, getToken]);

  const setRole = async (userId: number, isOrganizer: boolean) => {
    const token = getToken();
    const res = await fetch(config.endpoints.admin.organizerRole, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, isOrganizer }),
    });
    if (res.ok) {
      toast.success(isOrganizer ? "Организатор назначен" : "Роль снята");
      setQuery("");
      setOpenSuggest(false);
      loadOrganizers();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || "Ошибка");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className={cn(adminShell, "p-6 space-y-4 overflow-visible")}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/25">
            <UserPlus className="h-5 w-5 text-[#c4b5fd]" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Назначить организатора</h3>
            <p className="text-sm text-white/45">Введите имя или email пользователя из базы</p>
          </div>
        </div>
        <div className="relative z-[120]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
          <Input
            className={cn(adminInput, "pl-10")}
            placeholder="Поиск: имя или email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpenSuggest(true)}
            onBlur={() => setTimeout(() => setOpenSuggest(false), 180)}
          />
          {openSuggest && suggestions.length > 0 ? (
            <ul className="absolute z-[400] mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#14141c] shadow-2xl shadow-black/60">
              {suggestions.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-white/5 flex items-center gap-3 transition-colors"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setRole(u.id, true)}
                  >
                    <UserAvatar name={u.name} avatarUrl={u.avatarUrl} />
                    <span className="min-w-0 flex-1">
                      <span className="text-white text-sm block font-medium truncate">{u.name}</span>
                      <span className="text-white/45 text-xs truncate block">{u.email}</span>
                    </span>
                    {u.isOrganizer ? (
                      <span className="text-xs text-[#8B5CF6] shrink-0 rounded-full bg-[#8B5CF6]/10 px-2 py-0.5">
                        уже организатор
                      </span>
                    ) : (
                      <UserPlus className="h-4 w-4 text-[#8B5CF6]/60 shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className={cn(adminShell, "overflow-hidden")}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
          <Users className="h-5 w-5 text-[#8B5CF6]/70" />
          <h3 className="text-white font-semibold">Текущие организаторы</h3>
          <span className="ml-auto rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/25 px-2.5 py-0.5 text-xs font-medium text-[#c4b5fd] tabular-nums">
            {organizers.length}
          </span>
        </div>
        {organizers.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-12">Пока никого не назначили</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {organizers.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={o.name} avatarUrl={o.avatarUrl} />
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{o.name}</p>
                    <p className="text-xs text-white/45 truncate">{o.email}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15 text-white/70 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/25 shrink-0 rounded-xl"
                  onClick={() => setRole(o.id, false)}
                >
                  <UserMinus className="h-3.5 w-3.5 mr-1.5" />
                  Снять роль
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminOrganizersTab;
