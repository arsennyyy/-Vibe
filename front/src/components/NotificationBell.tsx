import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Trash2, X, ChevronRight } from "lucide-react";
import axios from "axios";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { config } from "@/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/contexts/UserContext";
import { resolveNotificationHref } from "@/lib/notificationRoutes";

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  relatedEventId?: number | null;
  relatedTicketId?: number | null;
};

function groupLabel(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return "Сегодня";
  if (isYesterday(d)) return "Вчера";
  return format(d, "d MMMM yyyy", { locale: ru });
}

function timeLabel(iso: string): string {
  return format(parseISO(iso), "HH:mm", { locale: ru });
}

export default function NotificationBell() {
  const { isAuthenticated, user } = useUser();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [listRes, countRes] = await Promise.all([
        axios.get(`${config.endpoints.notifications}?limit=50`, { headers: authHeaders() }),
        axios.get(`${config.endpoints.notifications}/unread-count`, { headers: authHeaders() }),
      ]);
      setItems(
        (listRes.data ?? []).map((n: Record<string, unknown>) => ({
          id: Number(n.id ?? n.Id),
          title: String(n.title ?? n.Title ?? ""),
          message: String(n.message ?? n.Message ?? ""),
          type: String(n.type ?? n.Type ?? "info"),
          isRead: Boolean(n.isRead ?? n.IsRead),
          createdAt: String(n.createdAt ?? n.CreatedAt ?? ""),
          relatedEventId:
            n.relatedEventId != null
              ? Number(n.relatedEventId)
              : n.RelatedEventId != null
                ? Number(n.RelatedEventId)
                : null,
          relatedTicketId:
            n.relatedTicketId != null
              ? Number(n.relatedTicketId)
              : n.RelatedTicketId != null
                ? Number(n.RelatedTicketId)
                : null,
        }))
      );
      setUnread(Number(countRes.data?.count ?? 0));
    } catch {
      /* ignore */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const n of items) {
      const key = n.createdAt ? groupLabel(n.createdAt) : "Без даты";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    return Array.from(map.entries());
  }, [items]);

  if (!isAuthenticated) return null;

  const markRead = async (id: number) => {
    await axios.put(`${config.apiUrl}/api/notifications/${id}/read`, null, { headers: authHeaders() });
    load();
  };

  const deleteOne = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await axios.delete(`${config.apiUrl}/api/notifications/${id}`, { headers: authHeaders() });
    load();
  };

  const deleteAll = async () => {
    await axios.delete(`${config.apiUrl}/api/notifications`, { headers: authHeaders() });
    load();
  };

  const handleClick = (n: NotificationItem) => {
    if (!n.isRead) void markRead(n.id);
    const href = resolveNotificationHref(n, {
      isAdmin: user?.isAdmin,
      isOrganizer: user?.isOrganizer,
    });
    if (href) {
      setOpen(false);
      navigate(href);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-violet-500 text-[10px] font-bold text-white flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        collisionPadding={16}
        className="w-[min(100vw-2rem,380px)] max-h-[min(70vh,520px)] overflow-hidden flex flex-col p-0 bg-[#161616] border-white/10 text-white z-[350]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Уведомления</p>
          {items.length > 0 ? (
            <button
              type="button"
              onClick={deleteAll}
              className="text-[11px] text-white/40 hover:text-red-400 flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Очистить
            </button>
          ) : null}
        </div>

        <div className="overflow-y-auto flex-1">
          {items.length === 0 ? (
            <p className="px-4 py-10 text-sm text-white/40 text-center">Пока пусто</p>
          ) : (
            grouped.map(([label, group]) => (
              <div key={label}>
                <p className="sticky top-0 z-10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#a78bfa]/90 bg-[#161616]/95 backdrop-blur border-b border-white/5">
                  {label}
                </p>
                <ul className="divide-y divide-white/[0.06]">
                  {group.map((n) => {
                    const href = resolveNotificationHref(n, {
                      isAdmin: user?.isAdmin,
                      isOrganizer: user?.isOrganizer,
                    });
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={cn(
                            "w-full text-left px-4 py-3 pr-10 relative transition-colors group",
                            href ? "hover:bg-white/[0.06] cursor-pointer" : "hover:bg-white/[0.03]",
                            !n.isRead && "bg-violet-500/10"
                          )}
                          onClick={() => handleClick(n)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium text-white leading-snug pr-1">{n.title}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] text-white/35 tabular-nums">
                                {n.createdAt ? timeLabel(n.createdAt) : ""}
                              </span>
                              {href ? (
                                <ChevronRight className="h-3.5 w-3.5 text-white/20 group-hover:text-[#c4b5fd] transition-colors" />
                              ) : null}
                            </div>
                          </div>
                          <span className="text-xs text-white/50 line-clamp-2 mt-1 block">{n.message}</span>
                          <button
                            type="button"
                            aria-label="Удалить"
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10"
                            onClick={(e) => deleteOne(e, n.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
