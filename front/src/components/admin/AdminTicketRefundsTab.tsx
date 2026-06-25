import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { config } from "@/config";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AdminTablePanel from "@/components/admin/AdminTablePanel";
import AdminTabHint from "@/components/admin/AdminTabHint";
import { cn } from "@/lib/utils";
import { Check, X, Clock, AlertTriangle, RotateCcw } from "lucide-react";
import { adminRefundUrgency } from "@/lib/ticketRefundStatus";
import { PriceText } from "@/lib/formatPrice";
import { formatEventDateTime } from "@/lib/formatEventDateTime";

type Row = {
  id: number;
  eventId?: number;
  userTicketId: number;
  userName?: string;
  userEmail?: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  ticketType?: string;
  price?: number;
  seatRow?: string;
  seatNumber?: number;
  reason?: string;
  status: string;
  createdAt: string;
  hoursUntilEvent?: number | null;
  reviewComment?: string;
};

type Props = {
  onChanged?: () => void;
  urgentCount?: number;
};

const AdminTicketRefundsTab = ({ onChanged, urgentCount = 0 }: Props) => {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${config.endpoints.admin.ticketRefundRequests}?status=${filter}`, {
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
      const res = await fetch(config.endpoints.admin.approveTicketRefund(id), {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Ошибка");
      toast.success(data.message || "Возврат одобрен");
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
      const res = await fetch(config.endpoints.admin.rejectTicketRefund(rejectId), {
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
    const map: Record<string, { cls: string; label: string; dot: string }> = {
      pending: {
        cls: "border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-transparent text-amber-100",
        label: "Ожидает решения",
        dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
      },
      approved: {
        cls: "border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 to-transparent text-emerald-100",
        label: "Возврат одобрен",
        dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
      },
      rejected: {
        cls: "border-rose-500/40 bg-gradient-to-r from-rose-500/15 to-transparent text-rose-100",
        label: "Отклонено",
        dot: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]",
      },
    };
    const ui = map[status] ?? { cls: "border-white/10 text-white/50", label: status, dot: "bg-white/40" };
    return (
      <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold", ui.cls)}>
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", ui.dot)} />
        {ui.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <AdminTabHint title="Возврат билетов">
        Заявки от пользователей. Список отсортирован по срочности: чем меньше времени до концерта, тем выше
        заявка. Одобрение освобождает место на схеме зала.
      </AdminTabHint>

      {urgentCount > 0 && filter === "pending" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-transparent px-4 py-3.5">
          <AlertTriangle className="h-5 w-5 text-orange-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-200">Требуют внимания: {urgentCount}</p>
            <p className="text-xs text-white/45 mt-0.5">
              До начала концерта осталось менее 72 часов — успейте обработать заявки, пока возврат ещё возможен.
            </p>
          </div>
        </div>
      ) : null}

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

      <AdminTablePanel empty={!loading && rows.length === 0} emptyLabel="Заявок на возврат нет">
        {loading ? (
          <p className="text-sm text-white/40 py-8 text-center">Загрузка…</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const urgency = adminRefundUrgency(row.hoursUntilEvent ?? null);
              return (
                <div
                  key={row.id}
                  className={cn(
                    "rounded-2xl border p-5 space-y-4 transition-all hover:border-white/[0.12]",
                    row.status === "pending" && (row.hoursUntilEvent ?? 999) <= 24
                      ? "border-rose-500/30 bg-gradient-to-br from-rose-500/[0.08] via-[#12121a] to-[#12121a] shadow-[0_0_40px_rgba(244,63,94,0.08)]"
                      : row.status === "pending" && (row.hoursUntilEvent ?? 999) <= 72
                        ? "border-orange-500/25 bg-gradient-to-br from-orange-500/[0.07] via-[#12121a] to-[#12121a]"
                        : row.status === "pending"
                          ? "border-amber-500/20 bg-gradient-to-br from-amber-500/[0.05] via-[#12121a] to-[#12121a]"
                          : row.status === "approved"
                            ? "border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.04] via-[#12121a] to-[#12121a]"
                            : "border-white/[0.08] bg-[#12121a]/80"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <RotateCcw className="h-4 w-4 text-[#c4b5fd] shrink-0" />
                        <p className="font-display font-semibold text-white truncate">
                          {row.eventTitle || `Событие #${row.eventId}`}
                        </p>
                      </div>
                      <p className="text-xs text-white/40">
                        {row.userName || row.userEmail} · {formatEventDateTime(row.eventDate, row.eventTime)}
                      </p>
                      <p className="text-xs text-white/35 mt-1">
                        {row.ticketType}
                        {row.seatRow ? ` · ряд ${row.seatRow}, место ${row.seatNumber}` : ""}
                        {row.price != null ? (
                          <>
                            {" · "}
                            <PriceText amount={row.price} className="inline text-xs" />
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {statusPill(row.status)}
                      {row.status === "pending" ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium",
                            urgency.pillClassName
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {urgency.label}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {row.reason ? (
                    <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-black/40 to-black/20 px-4 py-3.5">
                      <p className="text-[10px] uppercase tracking-widest text-[#c4b5fd]/60 mb-2 font-semibold">Причина возврата</p>
                      <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{row.reason}</p>
                    </div>
                  ) : null}

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
                        Одобрить возврат
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
              );
            })}
          </div>
        )}
      </AdminTablePanel>

      {filter === "pending" && pending.length > 0 ? (
        <p className="text-xs text-white/35 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          {pending.length} заявок ожидают решения · сортировка по срочности
        </p>
      ) : null}

      {rejectId != null ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121218] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-300">
              <X className="h-5 w-5" />
              <h3 className="font-display font-semibold text-white">Отклонить возврат</h3>
            </div>
            <Textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Причина для пользователя…"
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

export default AdminTicketRefundsTab;
