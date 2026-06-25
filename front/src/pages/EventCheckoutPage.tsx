import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { config } from "@/config";
import { PriceText } from "@/lib/formatPrice";
import {
  remainingSeconds,
  clearReservationTimer,
  getReservationDeadline,
} from "@/lib/seatReservationTimer";
import { Clock, CreditCard, ShieldCheck, ArrowLeft } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CheckoutPayload = {
  eventId: number;
  title: string;
  seats: { id: number; label: string; price: number; type: string }[];
  total: number;
};

type FieldErrors = {
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
  holder?: string;
};

const STORAGE_KEY = "vibe_checkout_payload";

const digitInputClass =
  "mt-1.5 h-12 bg-[#0a0a0a] text-white text-lg tracking-[0.14em] tabular-nums font-[family-name:ui-monospace,'Cascadia_Mono','Segoe_UI_Mono',Consolas,monospace]";

const fieldErrorClass = "border-rose-500/70 ring-1 ring-rose-500/30 focus-visible:border-rose-500/70";

const validateCardNumber = (digits: string): string | undefined => {
  if (!digits) return "Введите номер карты";
  if (!/^\d+$/.test(digits)) return "Только цифры";
  if (digits.length !== 16) return "Номер карты: ровно 16 цифр";
  return undefined;
};

const validateExpiry = (val: string): string | undefined => {
  if (!val.trim()) return "Укажите срок ММ/ГГ";
  const m = val.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return "Формат: ММ/ГГ";
  const month = parseInt(m[1], 10);
  const year = 2000 + parseInt(m[2], 10);
  if (month < 1 || month > 12) return "Месяц: от 01 до 12";
  const now = new Date();
  const exp = new Date(year, month, 0, 23, 59, 59);
  if (exp < new Date(now.getFullYear(), now.getMonth(), 1)) return "Срок истёк";
  return undefined;
};

const validateCvv = (val: string): string | undefined => {
  if (!val) return "Введите CVV";
  if (!/^\d{3}$/.test(val)) return "CVV: 3 цифры";
  return undefined;
};

const validateHolder = (val: string): string | undefined => {
  if (val.trim().length < 2) return "Укажите имя на карте (мин. 2 символа)";
  return undefined;
};

const EventCheckoutPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payload, setPayload] = useState<CheckoutPayload | null>(null);
  const [ttl, setTtl] = useState(0);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [holder, setHolder] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      navigate(`/event/${id}`, { replace: true });
      return;
    }
    try {
      const p = JSON.parse(raw) as CheckoutPayload;
      if (String(p.eventId) !== String(id)) {
        navigate(`/event/${id}`, { replace: true });
        return;
      }
      setPayload(p);
    } catch {
      navigate(`/event/${id}`, { replace: true });
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!payload || paid || paying) return;

    const tick = () => {
      const deadline = getReservationDeadline(payload.eventId);
      if (!deadline) {
        setTtl(0);
        return;
      }
      const sec = remainingSeconds(payload.eventId);
      setTtl(sec);
      if (sec <= 0) {
        toast.error("Время брони истекло");
        clearReservationTimer(payload.eventId);
        sessionStorage.removeItem(STORAGE_KEY);
        navigate(`/event/${id}`, { replace: true });
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [payload, id, navigate, paid, paying]);

  useEffect(() => {
    if (!paid) return;
    setRedirectCountdown(5);
    const tick = window.setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(tick);
          navigate("/profile?tab=tickets", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [paid, navigate]);

  const timerLabel = useMemo(() => {
    const m = String(Math.floor(ttl / 60)).padStart(2, "0");
    const s = String(ttl % 60).padStart(2, "0");
    return `${m}:${s}`;
  }, [ttl]);

  const formatCard = (v: string) =>
    v
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, "$1 ")
      .trim();

  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    if (d.length <= 2) return d;
    return `${d.slice(0, 2)}/${d.slice(2)}`;
  };

  const runValidation = (): FieldErrors => {
    const digits = cardNumber.replace(/\D/g, "");
    return {
      cardNumber: validateCardNumber(digits),
      expiry: validateExpiry(expiry),
      cvv: validateCvv(cvv),
      holder: validateHolder(holder),
    };
  };

  const pay = async () => {
    if (!payload) return;
    const nextErrors = runValidation();
    const hasErrors = Object.values(nextErrors).some(Boolean);
    setErrors(nextErrors);
    if (hasErrors) {
      const first = nextErrors.cardNumber || nextErrors.expiry || nextErrors.cvv || nextErrors.holder;
      toast.error(first || "Проверьте поля формы");
      return;
    }

    setPaying(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Войдите в аккаунт");

      await axios.post(
        config.endpoints.seatsCheckout,
        {
          eventId: payload.eventId,
          seats: payload.seats.map((seat) => ({
            seatId: seat.id,
            ticketType: seat.type,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPaid(true);
      clearReservationTimer(payload.eventId);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: unknown }; message?: string };
      toast.error(
        typeof ax.response?.data === "string"
          ? ax.response.data
          : ax.message || "Ошибка оплаты"
      );
    } finally {
      setPaying(false);
    }
  };

  const clearError = (key: keyof FieldErrors) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  if (!payload) return null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link
          to={`/event/${id}`}
          className="inline-flex items-center gap-2 text-sm text-white/45 hover:text-white mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к мероприятию
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h1 className="text-2xl font-display font-bold text-white">Оплата заказа</h1>
            <div className="rounded-2xl border border-white/10 bg-[#161616] p-5 space-y-4">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Событие</p>
                <p className="text-white font-medium">{payload.title}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Билеты</p>
                <ul className="max-h-52 overflow-y-auto overscroll-contain space-y-1.5 text-sm text-white/75 pr-1">
                  {payload.seats.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2">
                      <span>{s.label}</span>
                      <PriceText amount={s.price} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-end justify-between pt-3 border-t border-white/10">
                <span className="text-white/50">Итого</span>
                <PriceText amount={payload.total} className="text-2xl font-bold text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
              <Clock className="h-4 w-4 shrink-0" />
              Завершите оплату за <span className="font-mono font-bold tabular-nums">{timerLabel}</span>
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-[#121218] p-6 md:p-8">
            <div className="flex items-center gap-2 mb-2 text-white/70">
              <CreditCard className="h-5 w-5" />
              <span className="font-semibold">Банковская карта</span>
              <span className="text-xs text-white/35 ml-auto">Демо-оплата</span>
            </div>
            <p className="text-xs text-white/35 mb-6">
              Проверяется только формат полей — подойдёт любой номер из 16 цифр.
            </p>
            <div className="space-y-4">
              <div>
                <Label className="text-white/50 text-xs uppercase tracking-wider">Номер карты</Label>
                <Input
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => {
                    setCardNumber(formatCard(e.target.value));
                    clearError("cardNumber");
                  }}
                  className={cn(
                    digitInputClass,
                    "border-white/12",
                    errors.cardNumber && fieldErrorClass
                  )}
                  maxLength={19}
                  aria-invalid={Boolean(errors.cardNumber)}
                />
                {errors.cardNumber ? (
                  <p className="mt-1.5 text-xs text-rose-400">{errors.cardNumber}</p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/50 text-xs uppercase tracking-wider">Срок ММ/ГГ</Label>
                  <Input
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="12/28"
                    value={expiry}
                    onChange={(e) => {
                      setExpiry(formatExpiry(e.target.value));
                      clearError("expiry");
                    }}
                    className={cn(digitInputClass, "border-white/12", errors.expiry && fieldErrorClass)}
                    maxLength={5}
                    aria-invalid={Boolean(errors.expiry)}
                  />
                  {errors.expiry ? (
                    <p className="mt-1.5 text-xs text-rose-400">{errors.expiry}</p>
                  ) : null}
                </div>
                <div>
                  <Label className="text-white/50 text-xs uppercase tracking-wider">CVV</Label>
                  <Input
                    inputMode="numeric"
                    type="password"
                    autoComplete="cc-csc"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => {
                      setCvv(e.target.value.replace(/\D/g, "").slice(0, 3));
                      clearError("cvv");
                    }}
                    className={cn(digitInputClass, "border-white/12", errors.cvv && fieldErrorClass)}
                    maxLength={3}
                    aria-invalid={Boolean(errors.cvv)}
                  />
                  {errors.cvv ? (
                    <p className="mt-1.5 text-xs text-rose-400">{errors.cvv}</p>
                  ) : null}
                </div>
              </div>
              <div>
                <Label className="text-white/50 text-xs uppercase tracking-wider">Имя на карте</Label>
                <Input
                  autoComplete="cc-name"
                  placeholder="IVAN IVANOV"
                  value={holder}
                  onChange={(e) => {
                    setHolder(e.target.value.toUpperCase().slice(0, 40));
                    clearError("holder");
                  }}
                  className={cn(
                    "mt-1.5 h-12 bg-[#0a0a0a] border-white/12 text-white uppercase tracking-wide",
                    errors.holder && fieldErrorClass
                  )}
                  aria-invalid={Boolean(errors.holder)}
                />
                {errors.holder ? (
                  <p className="mt-1.5 text-xs text-rose-400">{errors.holder}</p>
                ) : null}
              </div>
              <Button
                className="w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white font-bold"
                disabled={paying || paid}
                onClick={() => void pay()}
              >
                {paying ? "Обработка…" : "Оплатить"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {paid ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full rounded-3xl border border-emerald-500/35 bg-[#121218] p-8 text-center shadow-2xl"
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
              <ShieldCheck className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-2">Оплата успешна</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-4">
              Билеты на «{payload.title}» сохранены в профиле.
            </p>
            <p className="text-xs text-white/35 mb-2">Переход в профиль через</p>
            <p className="text-5xl font-mono font-bold tabular-nums text-emerald-400/90">
              {redirectCountdown}
            </p>
          </motion.div>
        </div>
      ) : null}
    </Layout>
  );
};

export default EventCheckoutPage;
export { STORAGE_KEY as CHECKOUT_STORAGE_KEY };
export type { CheckoutPayload };
