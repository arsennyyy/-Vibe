import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { config } from "@/config";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AdminTablePanel from "@/components/admin/AdminTablePanel";
import AdminTabHint from "@/components/admin/AdminTabHint";
import { cn } from "@/lib/utils";
import { Check, X, Ban, Clock } from "lucide-react";

type Row = {
  id: number;
  eventId: number;
  eventTitle: string;
  eventDate?: string;
  organizerEmail: string;
  organizerName: string;
  status: string;
  reason: string;
  createdAt: string;
  reviewedAt?: string;
  reviewComment?: string;
};

type Props = {
  onChanged?: () => void;
};

const AdminCancellationsTab = ({ onChanged }: Props) => {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${config.endpoints.admin.cancellationRequests}?status=${filter}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      });
      const data = await res.json().catch(() => []);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);

  const approve = async (id: number) => {
    setBusyId(id);
    try {
      const res = await fetch(config.endpoints.admin.approveCancellation(id), {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Ошибка");
      toast.success(data.message || "Концерт отменён, письма отправлены");
      onChanged?.();
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async () => {
    if (!rejectId || !rejectComment.trim()) {
      toast.error("Укажите причину отклонения");
      return;
    }
    setBusyId(rejectId);
    try {
      const res = await fetch(config.endpoints.admin.rejectCancellation(rejectId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
        body: JSON.stringify({ comment: rejectComment.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Ошибка");
      toast.success("Заявка отклонена");
      setRejectId(null);
      setRejectComment("");
      onChanged?.();
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  };

  const statusPill = (status: string) => {
    const map: Record<string, { cls: string; label: string; Icon: typeof Clock }> = {
      pending: {
        cls: "border-amber-500/35 bg-amber-500/12 text-amber-200",
        label: "Ожидает",
        Icon: Clock,
      },
      approved: {
        cls: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200",
        label: "Одобрено",
        Icon: Check,
      },
      rejected: {
        cls: "border-rose-500/35 bg-rose-500/12 text-rose-200",
        label: "Отклонено",
        Icon: X,
      },
    };
    const ui = map[status] ?? { cls: "border-white/10 text-white/50", label: status, Icon: Ban };
    const { cls, label, Icon } = ui;
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold", cls)}>
        <Icon className="h-3 w-3 shrink-0" />
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <AdminTabHint title="Отмена события">
        Заявки организаторов на полную отмену концерта с возвратом всем покупателям.
        Организатор отправляет заявку с причиной и кодом из почты. При одобрении концерт отменяется, билеты
        возвращаются, держателям уходит письмо на email.
      </AdminTabHint>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["pending", "Актуальные"],
            ["approved", "Одобренные"],
            ["rejected", "Отклонённые"],
            ["all", "Все"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              filter === value
                ? "border-[#8B5CF6]/40 bg-[#8B5CF6]/15 text-white"
                : "border-white/10 text-white/50 hover:text-white/80"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <AdminTablePanel empty={!loading && rows.length === 0} emptyLabel="Заявок нет">
        {loading ? (
          <p className="text-sm text-white/40 py-8 text-center">Загрузка…</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  "rounded-2xl border p-5 space-y-3 transition-colors",
                  row.status === "pending"
                    ? "border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] via-[#12121a] to-[#12121a]"
                    : "border-white/[0.08] bg-[#12121a]"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-white truncate">{row.eventTitle || `Событие #${row.eventId}`}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {row.organizerName || row.organizerEmail} · {new Date(row.createdAt).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  {statusPill(row.status)}
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1.5">Причина</p>
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{row.reason}</p>
                </div>
                {row.reviewComment ? (
                  <p className="text-xs text-white/35 border-t border-white/[0.06] pt-3">
                    Комментарий: {row.reviewComment}
                  </p>
                ) : null}
                {row.status === "pending" ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/20"
                      disabled={busyId === row.id}
                      onClick={() => void approve(row.id)}
                    >
                      <Check className="h-4 w-4 mr-1.5" />
                      Одобрить и вернуть билеты
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                      disabled={busyId === row.id}
                      onClick={() => {
                        setRejectId(row.id);
                        setRejectComment("");
                      }}
                    >
                      <X className="h-4 w-4 mr-1.5" />
                      Отклонить
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </AdminTablePanel>

      {filter === "pending" && pending.length > 0 ? (
        <p className="text-xs text-white/35 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          {pending.length} заявок ожидают решения
        </p>
      ) : null}

      {rejectId != null ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121218] p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-300">
              <Ban className="h-5 w-5" />
              <h3 className="font-display font-semibold text-white">Отклонить заявку</h3>
            </div>
            <Textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Причина для организатора…"
              className="min-h-[100px] bg-[#0a0a0a] border-white/10 text-white"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-white/15" onClick={() => setRejectId(null)}>
                Отмена
              </Button>
              <Button className="bg-rose-600 hover:bg-rose-500" onClick={() => void reject()}>
                Отклонить
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminCancellationsTab;
