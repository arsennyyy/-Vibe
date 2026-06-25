import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { Archive, Ban, Calendar, Clock, RotateCcw, Send, Shield, Ticket as TicketIcon } from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatEventDateTime } from "@/lib/formatEventDateTime";
import { PriceText } from "@/lib/formatPrice";
import { getRefundUi } from "@/lib/ticketRefundStatus";
import { getTransferUi } from "@/lib/ticketTransferStatus";
import RefundStatusBadge from "@/components/profile/RefundStatusBadge";
import RefundRequestDialog from "@/components/profile/RefundRequestDialog";
import TransferTicketDialog from "@/components/profile/TransferTicketDialog";
import TransferAcceptDialog, { type TransferDetail } from "@/components/profile/TransferAcceptDialog";

interface Ticket {
  id?: number;
  Id?: number;
  isPast?: boolean;
  isCancelled?: boolean;
  isRefunded?: boolean;
  IsRefunded?: boolean;
  isUsed?: boolean;
  refundRequestStatus?: string | null;
  allowTicketTransfer?: boolean;
  isTransferredOut?: boolean;
  transferPending?: boolean;
  transferExpiresInSec?: number | null;
  transferRecipientEmail?: string | null;
  hoursUntilEvent?: number | null;
  eventStatus?: string | number;
  event?: { title: string; date: string; time?: string; image: string };
  Event?: { Title: string; Date: string; Time?: string; Image: string };
  seat?: { row: string; number: number };
  Seat?: { Row: string; Number: number };
  ticketType?: string;
  TicketType?: string;
  price?: number;
  Price?: number;
  qrCode?: string;
  QrCode?: string;
  qrExpiresInSec?: number;
  qrWindowMinutes?: number;
  eventDate?: string;
  EventDate?: string;
}

function ticketId(t: Ticket) {
  return t.id ?? t.Id ?? 0;
}

function eventDateOf(t: Ticket): Date | null {
  const raw = t.EventDate ?? t.eventDate ?? t.Event?.Date ?? t.event?.date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isRefundedTicket(t: Ticket): boolean {
  return t.isRefunded === true || t.IsRefunded === true;
}

function isEventCancelled(t: Ticket): boolean {
  if (t.isCancelled === true) return true;
  const st = t.eventStatus ?? (t.Event as { Status?: unknown })?.Status ?? (t.event as { status?: unknown })?.status;
  if (typeof st === "number") return st === 6;
  return String(st ?? "").toLowerCase() === "cancelled";
}

function isTransferredOutTicket(t: Ticket): boolean {
  return t.isTransferredOut === true;
}

function isPastTicket(t: Ticket): boolean {
  if (isTransferredOutTicket(t)) return true;
  if (isEventCancelled(t) && !isRefundedTicket(t)) return true;
  if (t.isPast === true) return true;
  const d = eventDateOf(t);
  if (!d) return false;
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}

function ticketEventTime(t: Ticket): string | undefined {
  return t.Event?.Time ?? t.event?.time;
}

function ticketEventDateRaw(t: Ticket): string | undefined {
  return t.Event?.Date ?? t.event?.date ?? t.eventDate ?? t.EventDate;
}

function formatCountdown(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const TicketCard = ({
  ticket,
  idx,
  countdown,
  past,
  cancelled,
  refunded,
  transferred,
  transferPending,
  onRefundClick,
  onTransferClick,
}: {
  ticket: Ticket;
  idx: number;
  countdown: number;
  past: boolean;
  cancelled: boolean;
  refunded: boolean;
  transferred: boolean;
  transferPending: boolean;
  onRefundClick?: () => void;
  onTransferClick?: () => void;
}) => {
  const qrValue = ticket.qrCode || ticket.QrCode || "";
  const title = ticket.Event?.Title || ticket.event?.title || "Неизвестное событие";
  const dateLabel = formatEventDateTime(ticketEventDateRaw(ticket), ticketEventTime(ticket));
  const row = ticket.Seat?.Row || ticket.seat?.row || "-";
  const number = ticket.Seat?.Number || ticket.seat?.number || "-";
  const type = ticket.ticketType || ticket.TicketType || "Стандарт";
  const priceAmount = Number(ticket.price ?? ticket.Price ?? 0);
  const windowMin = ticket.qrWindowMinutes ?? 10;

  const refundUi = getRefundUi({
    isRefunded: refunded,
    isUsed: ticket.isUsed,
    isCancelled: cancelled && !refunded,
    isPast: past && !cancelled && !transferred,
    refundRequestStatus: ticket.refundRequestStatus,
    hoursUntil: ticket.hoursUntilEvent,
  });

  const transferUi = getTransferUi({
    allowTicketTransfer: ticket.allowTicketTransfer,
    isTransferredOut: transferred,
    transferPending,
    transferRecipientEmail: ticket.transferRecipientEmail,
    isPast: past,
    isCancelled: cancelled,
    isRefunded: refunded,
    isUsed: ticket.isUsed,
    refundRequestStatus: ticket.refundRequestStatus,
  });

  const badgeLabel = cancelled
    ? "Отменено"
    : refunded
      ? "Возврат"
      : transferred
        ? transferUi.label
        : transferPending
          ? transferUi.label
          : past
            ? "Архив"
            : type;

  const badgeClass = cancelled
    ? "bg-rose-500/15 text-rose-400 border-rose-500/20"
    : refunded
      ? "bg-violet-500/15 text-violet-300 border-violet-500/25"
      : transferred
        ? transferUi.badgeClass
        : transferPending
          ? transferUi.badgeClass
          : "bg-accent text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08 }}
      className={cn(
        "relative flex flex-col md:flex-row rounded-2xl border overflow-hidden shadow-xl",
        past
          ? "bg-muted/50 border-border opacity-80"
          : "bg-[var(--vibe-surface)] border-border shadow-md"
      )}
    >
      <div className="flex-1 p-6 md:p-8 flex flex-col justify-between relative">
        <div
          className={cn(
            "absolute top-0 right-0 border-b border-l border-border px-4 py-1.5 rounded-bl-xl text-xs font-medium uppercase tracking-wider",
            badgeClass
          )}
        >
          {badgeLabel}
        </div>
        <div className="mb-8 pr-12">
          <h3 className={cn("font-display text-2xl md:text-3xl font-bold mb-3 leading-tight text-foreground", past && "opacity-70")}>
            {title}
          </h3>
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2 opacity-70" />
            {dateLabel}
          </div>
        </div>
        <div className="flex items-end justify-between mt-auto pt-6 border-t border-border border-dashed gap-4 flex-wrap">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Место</div>
            <div className="text-xl md:text-2xl font-display font-bold text-foreground">
              Ряд {row} <span className="text-muted-foreground mx-1">•</span> Место {number}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Стоимость</div>
            <PriceText amount={priceAmount} className="text-lg font-medium text-foreground" />
          </div>
        </div>

        {!past && !cancelled && !refunded && !transferred ? (
          <div className="mt-5 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1.5">
              {transferPending ? (
                <p className="text-xs text-amber-300/90 font-medium">{transferUi.hint}</p>
              ) : null}
              <RefundStatusBadge ui={refundUi} />
              {refundUi.hint && !transferPending ? (
                <p className="text-[11px] text-muted-foreground max-w-xs leading-snug pl-0.5">{refundUi.hint}</p>
              ) : null}
              {transferUi.canTransfer && transferUi.hint ? (
                <p className="text-[11px] text-sky-400/70 max-w-xs leading-snug">{transferUi.hint}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {ticket.allowTicketTransfer && !transferPending ? (
                transferUi.canTransfer && onTransferClick ? (
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl bg-gradient-to-r from-sky-500/20 to-indigo-500/15 border border-sky-400/35 text-sky-100 hover:from-sky-500/30 hover:text-white shadow-sm shadow-sky-900/20"
                    onClick={onTransferClick}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Передать
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled
                    className="rounded-xl border border-white/10 bg-white/[0.03] text-white/35 line-through decoration-white/30 decoration-2 cursor-not-allowed opacity-80"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5 opacity-50" />
                    Передать
                  </Button>
                )
              ) : null}
              {refundUi.canRequest && onRefundClick ? (
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl bg-gradient-to-r from-[#8B5CF6]/20 to-[#6d28d9]/15 border border-[#8B5CF6]/35 text-[#e9d5ff] hover:from-[#8B5CF6]/30 hover:to-[#6d28d9]/25 hover:text-white shadow-sm shadow-violet-900/20"
                    onClick={onRefundClick}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Возврат
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled
                    className="rounded-xl border border-white/10 bg-white/[0.03] text-white/35 line-through decoration-white/30 decoration-2 cursor-not-allowed opacity-80"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5 opacity-50" />
                    Возврат
                  </Button>
                )}
            </div>
          </div>
        ) : transferred ? (
          <div className="mt-5 pt-4 border-t border-border/60">
            <p className="text-sm font-medium text-sky-300">{transferUi.hint}</p>
            <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
              Билет больше не действителен у вас — передача зафиксирована на +Vibe
            </p>
          </div>
        ) : !past && refunded ? (
          <div className="mt-5 pt-4 border-t border-border/60">
            <RefundStatusBadge ui={refundUi} />
            <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
              Средства вернутся на карту в течение 3–14 рабочих дней
            </p>
          </div>
        ) : null}
      </div>

      <div className="hidden md:flex flex-col items-center relative w-8 shrink-0">
        <div className="absolute -top-3 w-6 h-6 rounded-full bg-background border-b border-border" />
        <div className="h-full w-px border-l-2 border-dashed border-border" />
        <div className="absolute -bottom-3 w-6 h-6 rounded-full bg-background border-t border-border" />
      </div>

      <div className="md:hidden w-full h-8 relative flex items-center justify-between px-4 overflow-hidden">
        <div className="absolute -left-3 w-6 h-6 rounded-full bg-background border-r border-border z-10" />
        <div className="w-full h-px border-t-2 border-dashed border-border" />
        <div className="absolute -right-3 w-6 h-6 rounded-full bg-background border-l border-border z-10" />
      </div>

      <div className="bg-[var(--vibe-surface-elevated)] p-6 md:p-8 flex flex-col items-center justify-center shrink-0 min-w-[220px]">
        {cancelled ? (
          <>
            <div className="w-[110px] h-[110px] rounded-xl border border-dashed border-rose-500/25 flex items-center justify-center mb-3 bg-rose-500/5">
              <Ban className="h-10 w-10 text-rose-400/60" />
            </div>
            <p className="text-sm font-medium text-rose-400 text-center">Концерт отменён</p>
            <p className="text-[10px] text-muted-foreground text-center mt-2 max-w-[200px] leading-snug">
              Деньги вернутся на карту в течение 7 дней. QR-код недействителен.
            </p>
          </>
        ) : refunded ? (
          <>
            <div className="w-[110px] h-[110px] rounded-xl border border-dashed border-violet-500/30 flex items-center justify-center mb-3 bg-violet-500/10">
              <RotateCcw className="h-10 w-10 text-violet-300/70" />
            </div>
            <p className="text-sm font-medium text-violet-300 text-center">Возврат оформлен</p>
            <p className="text-[10px] text-muted-foreground text-center mt-2 max-w-[200px] leading-snug">
              Деньги вернутся на карту. QR-код недействителен.
            </p>
          </>
        ) : transferred ? (
          <>
            <div className="w-[110px] h-[110px] rounded-xl border border-dashed border-sky-500/30 flex items-center justify-center mb-3 bg-sky-500/10">
              <Send className="h-10 w-10 text-sky-300/70" />
            </div>
            <p className="text-sm font-medium text-sky-300 text-center">Билет передан</p>
            <p className="text-[10px] text-muted-foreground text-center mt-2 max-w-[200px] leading-snug">
              {ticket.transferRecipientEmail ? `Получатель: ${ticket.transferRecipientEmail}` : "Друг оплатил билет по номиналу"}
            </p>
          </>
        ) : transferPending ? (
          <>
            <div className="w-[110px] h-[110px] rounded-xl border border-dashed border-amber-500/30 flex items-center justify-center mb-3 bg-amber-500/8">
              <Clock className="h-10 w-10 text-amber-300/70" />
            </div>
            <p className="text-sm font-medium text-amber-300 text-center">Ожидает друга</p>
            <p className="text-[10px] text-muted-foreground text-center mt-2 max-w-[200px] leading-snug">
              QR приостановлен до принятия или отмены передачи
            </p>
          </>
        ) : past ? (
          <>
            <div className="w-[110px] h-[110px] rounded-xl border border-dashed border-border flex items-center justify-center mb-3 bg-muted/30">
              <Archive className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground text-center">Мероприятие прошло</p>
            <p className="text-[10px] text-muted-foreground/80 text-center mt-2 max-w-[180px] leading-snug">
              QR и таймер отключены — билет сохранён для истории
            </p>
          </>
        ) : (
          <>
            <div className="bg-white p-3 rounded-xl shadow-lg mb-3">
              {qrValue ? <QRCodeSVG value={qrValue} size={110} level="M" /> : null}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#7c3aed] dark:text-violet-300 mb-1">
              <Shield className="h-3.5 w-3.5" />
              <span>Динамический QR · {windowMin} мин</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-mono text-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {formatCountdown(countdown)}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2 max-w-[180px] leading-snug">
              Обновляется после входа — защита от перепродажи
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
};

const MyTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [countdowns, setCountdowns] = useState<Record<number, number>>({});
  const [refundTicketId, setRefundTicketId] = useState<number | null>(null);
  const [refundBusy, setRefundBusy] = useState(false);
  const [transferTicket, setTransferTicket] = useState<Ticket | null>(null);
  const [transferBusy, setTransferBusy] = useState(false);
  const [incoming, setIncoming] = useState<TransferDetail[]>([]);
  const [activeIncoming, setActiveIncoming] = useState<TransferDetail | null>(null);
  const [incomingBusy, setIncomingBusy] = useState(false);

  const fetchIncoming = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(config.endpoints.ticketTransfers.incoming, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as TransferDetail[];
      setIncoming(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(config.endpoints.myTickets, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = (Array.isArray(res.data) ? res.data : []) as Ticket[];
      setTickets(list);
      const map: Record<number, number> = {};
      list.forEach((t) => {
        if (!isPastTicket(t)) {
          const id = ticketId(t);
          const sec = t.qrExpiresInSec ?? (t as { qrExpiresInSec?: number }).qrExpiresInSec;
          if (sec) map[id] = sec;
        }
      });
      setCountdowns(map);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string })?.message ||
          (typeof err.response?.data === "string" ? err.response.data : null);
        setError(msg || `Ошибка ${err.response?.status ?? ""}`.trim() || "Ошибка при загрузке билетов");
      } else {
        setError("Ошибка при загрузке билетов");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTickets();
    void fetchIncoming();
  }, [fetchTickets, fetchIncoming]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("incoming") === "1" && incoming.length > 0) {
      setActiveIncoming(incoming[0]);
    }
  }, [incoming]);

  const upcoming = useMemo(() => tickets.filter((t) => !isPastTicket(t)), [tickets]);
  const past = useMemo(() => tickets.filter(isPastTicket), [tickets]);
  const list = tab === "upcoming" ? upcoming : past;

  useEffect(() => {
    if (tab !== "upcoming" || upcoming.length === 0) return;
    const tick = setInterval(() => {
      setCountdowns((prev) => {
        const next = { ...prev };
        let refetch = false;
        for (const id of Object.keys(next)) {
          const n = Number(id);
          if (next[n] <= 1) refetch = true;
          else next[n] -= 1;
        }
        if (refetch) fetchTickets();
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [fetchTickets, tab, upcoming.length]);

  const submitRefund = async (reason: string, captchaToken: string) => {
    if (!refundTicketId) return;
    setRefundBusy(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(config.endpoints.ticketRefundRequest(refundTicketId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ reason: reason || undefined, captchaToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Не удалось отправить заявку");
      toast.success("Заявка на возврат отправлена");
      setRefundTicketId(null);
      await fetchTickets();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setRefundBusy(false);
    }
  };

  const submitTransfer = async (email: string) => {
    if (!transferTicket) return;
    setTransferBusy(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(config.endpoints.ticketTransfers.initiate(ticketId(transferTicket)), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ recipientEmail: email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Не удалось отправить");
      toast.success("Приглашение отправлено — у друга 10 минут на оплату");
      setTransferTicket(null);
      await fetchTickets();
      await fetchIncoming();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setTransferBusy(false);
    }
  };

  const declineIncoming = async () => {
    if (!activeIncoming) return;
    setIncomingBusy(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(config.endpoints.ticketTransfers.decline(activeIncoming.id), {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Ошибка");
      toast.success("Передача отклонена");
      setActiveIncoming(null);
      await fetchIncoming();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setIncomingBusy(false);
    }
  };

  const payIncoming = async () => {
    if (!activeIncoming) return;
    setIncomingBusy(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(config.endpoints.ticketTransfers.pay(activeIncoming.id), {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Ошибка оплаты");
      await fetchTickets();
      await fetchIncoming();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
      throw e;
    } finally {
      setIncomingBusy(false);
    }
  };

  return (
    <div className="w-full min-h-[60vh] pb-20">
      <div className="mb-6">
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">Мои билеты</h2>
        <p className="text-muted-foreground text-sm max-w-2xl">
          QR-код обновляется каждые 10 минут с момента покупки билета. Покажите актуальный код на входе с телефона —
          в Беларуси такой защиты от перепродажи пока нет ни у кого.
        </p>
      </div>

      {incoming.length > 0 ? (
        <div className="mb-6 rounded-2xl border border-sky-500/25 bg-gradient-to-r from-sky-500/10 via-[#8B5CF6]/8 to-transparent p-4 md:p-5">
          <p className="text-sm font-semibold text-sky-200 mb-2">Входящие передачи билетов</p>
          <div className="space-y-2">
            {incoming.map((tr) => (
              <button
                key={tr.id}
                type="button"
                onClick={() => setActiveIncoming(tr)}
                className="w-full text-left rounded-xl border border-white/10 bg-black/25 px-4 py-3 hover:border-sky-400/40 hover:bg-sky-500/5 transition-colors"
              >
                <p className="text-white font-medium text-sm">{tr.eventTitle}</p>
                <p className="text-xs text-white/45 mt-0.5">
                  от {tr.senderName || tr.senderEmail} · {tr.price} BYN · {Math.floor((tr.secondsLeft ?? 0) / 60)}:
                  {String((tr.secondsLeft ?? 0) % 60).padStart(2, "0")} осталось
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v as "upcoming" | "past")} className="mb-6">
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="upcoming">Актуальные ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Прошедшие ({past.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">{error}</div>
      )}

      {!loading && list.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--vibe-surface)] rounded-2xl border border-border border-dashed">
          <TicketIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            {tab === "upcoming" ? "Нет актуальных билетов" : "Нет прошедших билетов"}
          </h3>
          <p className="text-muted-foreground text-sm">
            {tab === "upcoming" ? "Выберите мероприятие и оформите покупку" : "Здесь появятся билеты после даты концерта"}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {list.map((ticket, idx) => (
          <TicketCard
            key={`${ticketId(ticket)}-${idx}`}
            ticket={ticket}
            idx={idx}
            countdown={countdowns[ticketId(ticket)] ?? 600}
            past={tab === "past" || isPastTicket(ticket)}
            cancelled={isEventCancelled(ticket)}
            refunded={isRefundedTicket(ticket)}
            transferred={isTransferredOutTicket(ticket)}
            transferPending={ticket.transferPending === true}
            onRefundClick={
              tab === "upcoming" && !isEventCancelled(ticket) && !isRefundedTicket(ticket) && !isTransferredOutTicket(ticket)
                ? () => setRefundTicketId(ticketId(ticket))
                : undefined
            }
            onTransferClick={
              tab === "upcoming" &&
              ticket.allowTicketTransfer &&
              !ticket.transferPending &&
              !isTransferredOutTicket(ticket) &&
              !isRefundedTicket(ticket) &&
              !isEventCancelled(ticket)
                ? () => setTransferTicket(ticket)
                : undefined
            }
          />
        ))}
      </div>

      <RefundRequestDialog
        open={refundTicketId != null}
        onClose={() => setRefundTicketId(null)}
        onSubmit={submitRefund}
        busy={refundBusy}
      />

      <TransferTicketDialog
        open={transferTicket != null}
        onClose={() => setTransferTicket(null)}
        onSubmit={submitTransfer}
        busy={transferBusy}
        eventTitle={transferTicket?.Event?.Title || transferTicket?.event?.title}
        price={Number(transferTicket?.price ?? transferTicket?.Price ?? 0)}
      />

      <TransferAcceptDialog
        transfer={activeIncoming}
        open={activeIncoming != null}
        onClose={() => {
          setActiveIncoming(null);
          void fetchTickets();
        }}
        onDecline={declineIncoming}
        onPay={payIncoming}
        busy={incomingBusy}
      />
    </div>
  );
};

export default MyTickets;
