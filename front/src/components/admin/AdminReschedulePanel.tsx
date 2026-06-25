import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowRight, CalendarClock, Check, Sparkles, X } from "lucide-react";
import { config } from "@/config";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { adminGhostBtn, adminPrimaryBtn, adminShell, adminTextarea } from "@/lib/adminUi";
import { cn } from "@/lib/utils";
import AdminTabHint from "@/components/admin/AdminTabHint";

type RescheduleReq = {
  id: number;
  eventId: number;
  status: string;
  reason: string;
  originalDate: string;
  originalTime: string;
  proposedDate: string;
  proposedTime: string;
  createdAt: string;
  eventTitle?: string;
  organizer?: { name: string; email: string };
};

const AdminReschedulePanel = () => {
  const [items, setItems] = useState<RescheduleReq[]>([]);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [approveTarget, setApproveTarget] = useState<RescheduleReq | null>(null);
  const [busy, setBusy] = useState(false);

  const headers = (): HeadersInit => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  });

  const load = useCallback(async () => {
    const res = await fetch(`${config.endpoints.admin.rescheduleRequests}?status=pending`, {
      headers: headers(),
    });
    if (res.ok) setItems(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async () => {
    if (!approveTarget) return;
    setBusy(true);
    try {
      const res = await fetch(config.endpoints.admin.approveReschedule(approveTarget.id), {
        method: "POST",
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message ?? "Перенос одобрен");
      setApproveTarget(null);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!rejectId || !rejectComment.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(config.endpoints.admin.rejectReschedule(rejectId), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ comment: rejectComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success("Запрос отклонён");
      setRejectId(null);
      setRejectComment("");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const fmtDate = (date: string) => {
    try {
      return format(parseISO(date.slice(0, 10)), "d MMMM yyyy", { locale: ru });
    } catch {
      return date;
    }
  };

  const fmtTime = (time: string) => (time ?? "").trim().slice(0, 5);

  return (
    <div className={cn(adminShell, "p-4 md:p-5 mt-4 relative overflow-hidden")}>
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-500/8 blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/35 to-transparent" />

      <AdminTabHint title="Запросы на перенос даты">
        Организатор предлагает новую дату и время с указанием причины. После одобрения билеты остаются действительными,
        держателям приходит уведомление и письмо.
      </AdminTabHint>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
          <CalendarClock className="h-8 w-8 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">Нет ожидающих запросов на перенос</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <div
              key={r.id}
              className="relative rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] via-[#121218] to-[#0d0d10] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
            >
              <div className="flex flex-col lg:flex-row lg:items-stretch gap-5">
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 shrink-0 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                      <CalendarClock className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-lg text-white truncate">
                        {r.eventTitle ?? `Событие #${r.eventId}`}
                      </p>
                      <p className="text-xs text-white/45 mt-0.5">
                        {r.organizer?.name} · {r.organizer?.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                    <div className="rounded-xl border border-white/8 bg-black/30 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-white/35 mb-1">Было</p>
                      <p className="text-sm font-medium text-white/75">
                        {fmtDate(r.originalDate)}
                      </p>
                      <p className="text-lg font-display font-bold text-white/90">{fmtTime(r.originalTime)}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-amber-400/70 mx-auto hidden sm:block" />
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-emerald-400/70 mb-1">Станет</p>
                      <p className="text-sm font-medium text-emerald-200/90">{fmtDate(r.proposedDate)}</p>
                      <p className="text-lg font-display font-bold text-emerald-300">{fmtTime(r.proposedTime)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-white/35 mb-1.5">Причина</p>
                    <p className="text-sm text-white/65 italic leading-relaxed">«{r.reason}»</p>
                  </div>
                </div>

                <div className="flex lg:flex-col gap-2 shrink-0 lg:justify-center lg:min-w-[148px]">
                  <Button
                    className={cn(adminPrimaryBtn, "h-10 w-full")}
                    disabled={busy}
                    onClick={() => setApproveTarget(r)}
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Одобрить
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 w-full border-rose-500/30 text-rose-300 hover:bg-rose-500/10 bg-transparent"
                    disabled={busy}
                    onClick={() => {
                      setRejectId(r.id);
                      setRejectComment("");
                    }}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Отклонить
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={approveTarget != null} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-2xl border border-white/10 bg-[#121218] text-white shadow-[0_32px_80px_rgba(0,0,0,0.65)]">
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
          <DialogHeader className="px-6 pt-6 pb-2 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-emerald-400" />
            </div>
            <DialogTitle className="font-display text-xl font-bold tracking-tight text-left">
              Подтвердить перенос?
            </DialogTitle>
            <p className="text-sm text-white/55 leading-relaxed text-left">
              Вы точно хотите изменить дату и время мероприятия{" "}
              <span className="text-white font-medium">«{approveTarget?.eventTitle}»</span>?
              Все держатели билетов получат уведомление на сайте и письмо на email.
            </p>
            {approveTarget ? (
              <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm space-y-1">
                <p className="text-white/45">
                  {fmtDate(approveTarget.originalDate)} {fmtTime(approveTarget.originalTime)}
                  <ArrowRight className="inline h-3.5 w-3.5 mx-2 text-emerald-400" />
                  <span className="text-emerald-300">
                    {fmtDate(approveTarget.proposedDate)} {fmtTime(approveTarget.proposedTime)}
                  </span>
                </p>
              </div>
            ) : null}
          </DialogHeader>
          <DialogFooter className="px-6 py-4 border-t border-white/[0.08] bg-[#0d0d10] gap-2">
            <Button type="button" variant="ghost" className={adminGhostBtn} onClick={() => setApproveTarget(null)}>
              Отмена
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl h-10 px-5"
              disabled={busy}
              onClick={() => void approve()}
            >
              Да, изменить дату
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rejectId != null && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 space-y-3">
          <p className="text-sm font-medium text-white/80">Причина отклонения для организатора</p>
          <Textarea
            className={adminTextarea}
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Например: новая дата совпадает с другим мероприятием на площадке"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" className="text-white/50" onClick={() => setRejectId(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectComment.trim() || busy}
              onClick={() => void reject()}
            >
              Отклонить запрос
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReschedulePanel;
