import { CreditCard, Banknote, Smartphone, Receipt, CheckCircle2, Clock, Wallet } from "lucide-react";
import AdminMetricCard from "@/components/admin/AdminMetricCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/StatusIndicator";
import { getPaymentStatusUi, normalizePaymentStatus } from "@/lib/paymentStatus";
import { PriceText } from "@/lib/formatPrice";
import {
  adminTableWrap,
  adminTableHead,
  adminTableRow,
  adminTableCell,
  adminTableHeaderRow,
  adminEmpty,
} from "@/lib/adminUi";
import { cn } from "@/lib/utils";

function methodUi(method: string) {
  const m = method?.toLowerCase() ?? "";
  if (m.includes("card"))
    return { label: "Карта", Icon: CreditCard, className: "text-sky-300/90 bg-sky-500/10 border-sky-500/20" };
  if (m.includes("bank"))
    return { label: "Банк", Icon: Banknote, className: "text-amber-300/90 bg-amber-500/10 border-amber-500/20" };
  if (m.includes("wallet") || m.includes("e_wallet"))
    return { label: "Кошелёк", Icon: Smartphone, className: "text-violet-300/90 bg-violet-500/10 border-violet-500/20" };
  return { label: method || "—", Icon: Receipt, className: "text-white/50 bg-white/5 border-white/10" };
}

function formatOrderRef(raw: string) {
  if (!raw || raw === "—") return "—";
  if (raw.length <= 18) return raw;
  return `${raw.slice(0, 8)}…${raw.slice(-6)}`;
}

type AdminPaymentsTableProps = {
  payments: any[];
  commissionPercent?: number;
};

export default function AdminPaymentsTable({ payments, commissionPercent = 12 }: AdminPaymentsTableProps) {
  const completed = payments.filter((p) => normalizePaymentStatus(p.status ?? p.Status) === "completed");
  const pending = payments.filter((p) => normalizePaymentStatus(p.status ?? p.Status) === "pending");
  const gross = completed.reduce((s, p) => s + Number(p.grossAmount ?? p.GrossAmount ?? p.amount ?? p.Amount ?? 0), 0);
  const fees = completed.reduce(
    (s, p) =>
      s +
      Number(
        p.platformFee ??
          p.PlatformFee ??
          (Number(p.amount ?? p.Amount ?? 0) * commissionPercent) / 100
      ),
    0
  );

  if (payments.length === 0) {
    return (
      <div className={adminEmpty}>
        <Receipt className="h-10 w-10 text-white/15 mb-3" />
        <p>Платежей пока нет</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminMetricCard
          label="Оплачено"
          value={completed.length}
          sub="Успешные платежи"
          icon={CheckCircle2}
          accent="from-emerald-500/20 to-transparent border-emerald-500/20"
          iconBg="bg-emerald-500/15 text-emerald-300"
        />
        <AdminMetricCard
          label="В ожидании"
          value={pending.length}
          sub="Ожидают подтверждения"
          icon={Clock}
          accent="from-amber-500/15 to-transparent border-amber-500/20"
          iconBg="bg-amber-500/15 text-amber-300"
        />
        <AdminMetricCard
          label={`Комиссия (${commissionPercent}%)`}
          value={<PriceText amount={fees} decimals={2} className="text-2xl md:text-[1.65rem] font-display font-bold text-white" />}
          sub={`Оборот ${gross.toFixed(2)} · комиссия ${commissionPercent}%`}
          icon={Wallet}
          accent="from-[#8B5CF6]/25 to-transparent border-[#8B5CF6]/25"
          iconBg="bg-[#8B5CF6]/15 text-[#c4b5fd]"
        />
      </div>

      <div className={adminTableWrap}>
        <Table>
          <TableHeader>
            <TableRow className={adminTableHeaderRow}>
              <TableHead className={cn(adminTableHead, "w-14")}>ID</TableHead>
              <TableHead className={adminTableHead}>Заказ</TableHead>
              <TableHead className={adminTableHead}>Событие</TableHead>
              <TableHead className={adminTableHead}>Сумма</TableHead>
              <TableHead className={adminTableHead}>Комиссия</TableHead>
              <TableHead className={adminTableHead}>Способ</TableHead>
              <TableHead className={adminTableHead}>Статус</TableHead>
              <TableHead className={adminTableHead}>Покупатель</TableHead>
              <TableHead className={cn(adminTableHead, "text-right")}>Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const statusUi = getPaymentStatusUi(payment.status ?? payment.Status);
              const amount = Number(payment.amount ?? payment.Amount ?? 0);
              const fee = Number(
                payment.platformFee ??
                  payment.PlatformFee ??
                  (amount * commissionPercent) / 100
              );
              const method = methodUi(payment.paymentMethod ?? payment.PaymentMethod ?? "");
              const MethodIcon = method.Icon;
              const created = payment.createdAt ?? payment.CreatedAt;
              const orderNum =
                payment.order?.orderNumber ?? payment.order?.OrderNumber ?? payment.orderId ?? "—";
              const eventTitle = payment.order?.eventTitle ?? payment.order?.EventTitle ?? "—";
              const seat = payment.order?.seatLabel ?? payment.order?.SeatLabel;

              return (
                <TableRow key={payment.id ?? payment.Id} className={adminTableRow}>
                  <TableCell className={cn(adminTableCell, "font-mono text-xs text-white/40")}>
                    {payment.id ?? payment.Id}
                  </TableCell>
                  <TableCell className={cn(adminTableCell, "font-mono text-xs text-white/55 max-w-[120px]")}>
                    <span title={String(orderNum)}>{formatOrderRef(String(orderNum))}</span>
                  </TableCell>
                  <TableCell className={cn(adminTableCell, "max-w-[200px]")}>
                    <p className="font-medium text-white truncate">{eventTitle}</p>
                    {seat ? <p className="text-xs text-white/40 mt-0.5">Место {seat}</p> : null}
                  </TableCell>
                  <TableCell className={adminTableCell}>
                    {amount > 0 ? (
                      <PriceText amount={amount} decimals={2} className="font-semibold text-white tabular-nums" />
                    ) : (
                      <span className="text-white/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className={adminTableCell}>
                    {normalizePaymentStatus(payment.status ?? payment.Status) === "completed" ? (
                      <span className="text-sm text-emerald-400/90 tabular-nums font-medium">
                        +{fee.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-sm text-white/25">—</span>
                    )}
                  </TableCell>
                  <TableCell className={adminTableCell}>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium",
                        method.className
                      )}
                    >
                      <MethodIcon className="h-3.5 w-3.5 shrink-0" />
                      {method.label}
                    </span>
                  </TableCell>
                  <TableCell className={adminTableCell}>
                    <StatusPill
                      dotClassName={statusUi.dotClassName}
                      label={statusUi.label}
                      labelClassName={statusUi.labelClassName}
                      pillClassName={statusUi.pillClassName}
                    />
                  </TableCell>
                  <TableCell className={cn(adminTableCell, "text-white/50 text-xs max-w-[180px] truncate")}>
                    {payment.user?.email ?? payment.user?.Email ?? "—"}
                  </TableCell>
                  <TableCell className={cn(adminTableCell, "text-right text-white/40 text-xs tabular-nums whitespace-nowrap")}>
                    {created
                      ? new Date(created).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
