import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, CreditCard, Send, ShieldCheck, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PriceText } from "@/lib/formatPrice";
import { toast } from "sonner";

export type TransferDetail = {
  id: number;
  status: string;
  price: number;
  recipientEmail?: string;
  senderName?: string;
  senderEmail?: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  ticketType?: string;
  seatRow?: string;
  seatNumber?: number;
  secondsLeft?: number;
};

type FieldErrors = { cardNumber?: string; expiry?: string; cvv?: string; holder?: string };

const digitInputClass =
  "mt-1.5 h-12 bg-[#0a0a0a] text-white text-lg tracking-[0.14em] tabular-nums font-mono";

const validateCardNumber = (digits: string) => {
  if (!digits) return "Введите номер карты";
  if (digits.length !== 16) return "Ровно 16 цифр";
  return undefined;
};

const validateExpiry = (val: string) => {
  if (!/^\d{2}\/\d{2}$/.test(val.trim())) return "Формат ММ/ГГ";
  return undefined;
};

const validateCvv = (val: string) => (!/^\d{3}$/.test(val) ? "3 цифры" : undefined);
const validateHolder = (val: string) => (val.trim().length < 2 ? "Имя на карте" : undefined);

type Props = {
  transfer: TransferDetail | null;
  open: boolean;
  onClose: () => void;
  onDecline: () => Promise<void>;
  onPay: () => Promise<void>;
  busy?: boolean;
};

const TransferAcceptDialog = ({ transfer, open, onClose, onDecline, onPay, busy }: Props) => {
  const [ttl, setTtl] = useState(0);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [holder, setHolder] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!open || !transfer) return;
    setTtl(transfer.secondsLeft ?? 600);
    setPaid(false);
    setCardNumber("");
    setExpiry("");
    setCvv("");
    setHolder("");
    setErrors({});
  }, [open, transfer?.id]);

  useEffect(() => {
    if (!open || paid) return;
    const t = setInterval(() => setTtl((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [open, paid]);

  const timerLabel = useMemo(() => {
    const m = String(Math.floor(ttl / 60)).padStart(2, "0");
    const s = String(ttl % 60).padStart(2, "0");
    return `${m}:${s}`;
  }, [ttl]);

  const formatCard = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ").trim();

  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
  };

  const handlePay = async () => {
    const next: FieldErrors = {
      cardNumber: validateCardNumber(cardNumber.replace(/\D/g, "")),
      expiry: validateExpiry(expiry),
      cvv: validateCvv(cvv),
      holder: validateHolder(holder),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      toast.error("Проверьте данные карты");
      return;
    }
    try {
      await onPay();
      setPaid(true);
    } catch {
      /* ошибка уже показана в onPay */
    }
  };

  if (!open || !transfer) return null;

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center p-4">
      <motion.button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0c0c12] shadow-2xl"
      >
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#8B5CF6]/25 via-sky-500/10 to-transparent pointer-events-none" />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 h-9 w-9 rounded-xl border border-white/10 bg-black/40 text-white/50 hover:text-white flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>

        {paid ? (
          <div className="relative p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
              <ShieldCheck className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-2">Билет ваш!</h2>
            <p className="text-white/50 text-sm mb-6">
              Оплата прошла. Билет на «{transfer.eventTitle}» уже в профиле — QR обновляется каждые 10 мин.
            </p>
            <Button onClick={onClose} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white">
              К моим билетам
            </Button>
          </div>
        ) : (
          <div className="relative p-6 md:p-8 space-y-5">
            <div className="flex items-start gap-3 pr-8">
              <div className="h-12 w-12 rounded-2xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0">
                <Send className="h-6 w-6 text-sky-300" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/35 mb-1">Передача билета</p>
                <h2 className="text-xl font-display font-bold text-white leading-tight">{transfer.eventTitle}</h2>
                <p className="text-sm text-white/45 mt-1">
                  От {transfer.senderName || transfer.senderEmail || "друга"} · Ряд {transfer.seatRow} · Место {transfer.seatNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
              <div className="flex items-center gap-2 text-amber-200/90 text-sm">
                <Clock className="h-4 w-4" />
                Осталось на оплату
              </div>
              <span className="font-mono text-lg font-bold text-amber-300 tabular-nums">{timerLabel}</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4 flex justify-between items-end">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/35">К оплате (номинал)</p>
                <PriceText amount={transfer.price} className="text-3xl font-display font-black text-white" />
              </div>
              <span className="text-xs text-white/35">Демо-оплата</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <CreditCard className="h-4 w-4 text-[#a78bfa]" />
                Банковская карта
              </div>
              <div>
                <Label className="text-white/45 text-xs uppercase">Номер карты</Label>
                <Input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCard(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  className={cn(digitInputClass, "border-white/12", errors.cardNumber && "border-rose-500/60")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/45 text-xs uppercase">Срок</Label>
                  <Input
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    placeholder="12/28"
                    className={cn(digitInputClass, "border-white/12", errors.expiry && "border-rose-500/60")}
                  />
                </div>
                <div>
                  <Label className="text-white/45 text-xs uppercase">CVV</Label>
                  <Input
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    placeholder="123"
                    className={cn(digitInputClass, "border-white/12", errors.cvv && "border-rose-500/60")}
                  />
                </div>
              </div>
              <div>
                <Label className="text-white/45 text-xs uppercase">Имя на карте</Label>
                <Input
                  value={holder}
                  onChange={(e) => setHolder(e.target.value.toUpperCase())}
                  placeholder="IVAN IVANOV"
                  className={cn(digitInputClass, "border-white/12 uppercase", errors.holder && "border-rose-500/60")}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="flex-1 h-12 rounded-xl border-white/15 bg-transparent text-white/70 hover:bg-white/5"
                onClick={() => void onDecline()}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Отклонить
              </Button>
              <Button
                type="button"
                disabled={busy || ttl <= 0}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-sky-600 text-white font-bold shadow-lg shadow-violet-900/30"
                onClick={() => void handlePay()}
              >
                {busy ? "Обработка…" : "Принять и оплатить"}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TransferAcceptDialog;
