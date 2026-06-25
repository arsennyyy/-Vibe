import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { KeyRound, Mail, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  email: string;
  challengeId: number;
  expiresInSec: number;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<number>;
  busy?: boolean;
  className?: string;
  /** Только цифры (код отмены концерта) */
  numericOnly?: boolean;
};

const SLOT_CLASS =
  "!rounded-xl !border !border-white/12 !border-l bg-[#0c0c10] text-white " +
  "h-[3.25rem] w-[2.75rem] sm:w-12 text-xl font-bold uppercase tracking-wide font-display " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_16px_rgba(0,0,0,0.25)] " +
  "transition-all duration-200 first:!rounded-xl last:!rounded-xl " +
  "data-[active=true]:!border-[#8b5cf6]/70 data-[active=true]:!ring-2 data-[active=true]:!ring-[#8b5cf6]/30 " +
  "data-[active=true]:!bg-[#14101f]";

const OtpVerificationStep = ({
  email,
  challengeId,
  expiresInSec: initialTtl,
  onVerify,
  onResend,
  busy,
  className,
  numericOnly = false,
}: Props) => {
  const [code, setCode] = useState("");
  const [ttl, setTtl] = useState(initialTtl);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendError, setResendError] = useState("");
  const verifyingRef = useRef(false);

  useEffect(() => setTtl(initialTtl), [initialTtl, challengeId]);
  useEffect(() => {
    setCode("");
    verifyingRef.current = false;
  }, [challengeId]);

  useEffect(() => {
    if (ttl <= 0) return;
    const t = setInterval(() => setTtl((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [ttl, challengeId]);

  const mm = String(Math.floor(ttl / 60)).padStart(2, "0");
  const ss = String(ttl % 60).padStart(2, "0");
  const canResend = ttl === 0;
  const progress = initialTtl > 0 ? (ttl / initialTtl) * 100 : 0;

  const submitCode = async (value: string) => {
    if (value.length !== 6 || busy || ttl === 0 || verifyingRef.current) return;
    verifyingRef.current = true;
    try {
      await onVerify(value);
    } finally {
      verifyingRef.current = false;
    }
  };

  const handleResend = async () => {
    if (!canResend || resendBusy) return;
    setResendBusy(true);
    setResendError("");
    try {
      const newTtl = await onResend();
      setTtl(newTtl);
      setCode("");
    } catch (e: unknown) {
      setResendError(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-6", className)}
    >
      <div className="text-center space-y-4">
        <div className="mx-auto relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-[#8b5cf6]/20 blur-xl" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6]/25 to-[#4c1d95]/20 border border-[#8b5cf6]/35">
            <Mail className="h-6 w-6 text-[#ddd6fe]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-white font-display tracking-tight">Код из письма</h3>
          <p className="text-sm text-white/55 leading-relaxed">
            Отправили 6 символов на
            <br />
            <span className="text-white/90 font-medium">{email}</span>
          </p>
        </div>

        <div className="mx-auto max-w-[220px] space-y-2">
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                ttl > 30 ? "bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa]" : "bg-gradient-to-r from-amber-500 to-rose-500"
              )}
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-white/40">
            {ttl > 0 ? (
              <>
                Код действует{" "}
                <span className="tabular-nums font-semibold text-[#c4b5fd]">
                  {mm}:{ss}
                </span>
              </>
            ) : (
              <span className="text-rose-400 font-medium">Время вышло — запросите новый код</span>
            )}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-5">
        <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/35 font-semibold">
          <KeyRound className="h-3.5 w-3.5" />
          Введите код
        </div>

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(v) =>
              setCode(numericOnly ? v.replace(/\D/g, "") : v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            onComplete={(v) => void submitCode(v)}
            disabled={busy || ttl === 0}
            containerClassName="gap-2 sm:gap-2.5"
          >
            <InputOTPGroup className="gap-2 sm:gap-2.5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} className={SLOT_CLASS} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          type="button"
          disabled={code.length !== 6 || busy || ttl === 0}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#6d28d9] text-white font-bold shadow-lg shadow-violet-900/30 border-0"
          onClick={() => void submitCode(code)}
        >
          {busy ? "Проверяем…" : "Подтвердить"}
        </Button>
      </div>

      <div className="text-center space-y-2">
        <button
          type="button"
          disabled={!canResend || resendBusy}
          onClick={() => void handleResend()}
          className={cn(
            "inline-flex items-center gap-2 text-sm font-medium transition-colors",
            canResend && !resendBusy
              ? "text-[#c4b5fd] hover:text-white"
              : "text-white/25 cursor-not-allowed"
          )}
        >
          <RotateCcw className={cn("h-3.5 w-3.5", resendBusy && "animate-spin")} />
          {resendBusy ? "Отправляем…" : "Отправить код ещё раз"}
        </button>
        {resendError ? <p className="text-xs text-rose-400">{resendError}</p> : null}
        <p className="text-[10px] text-white/28">Не более 5 повторных отправок в сутки</p>
      </div>
    </motion.div>
  );
};

export default OtpVerificationStep;
