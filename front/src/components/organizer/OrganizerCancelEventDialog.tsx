import { useEffect, useState } from "react";
import { toast } from "sonner";
import { config } from "@/config";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CaptchaModal from "@/components/security/CaptchaModal";
import OtpVerificationStep from "@/components/auth/OtpVerificationStep";
import { useUser } from "@/contexts/UserContext";
import { Ban } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  onSubmitted: () => void;
};

const fieldLabel = "text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold";

const OrganizerCancelEventDialog = ({ open, onOpenChange, eventId, onSubmitted }: Props) => {
  const { user } = useUser();
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [challengeId, setChallengeId] = useState<number | null>(null);
  const [expiresInSec, setExpiresInSec] = useState(120);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason("");
      setStep("form");
      setChallengeId(null);
      setExpiresInSec(120);
    }
  }, [open]);

  const requestCode = async (captchaToken: string) => {
    setLoading(true);
    try {
      const res = await fetch(config.endpoints.organizer.cancellationRequestCode(eventId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
        body: JSON.stringify({ reason: reason.trim(), captchaToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Не удалось отправить код");
      setChallengeId(data.challengeId ?? null);
      setExpiresInSec(data.expiresInSec ?? 120);
      setStep("code");
      toast.success("Код отправлен на вашу почту");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const submitCancellation = async (code: string) => {
    if (!challengeId) return;
    setLoading(true);
    try {
      const res = await fetch(config.endpoints.organizer.cancellationSubmit(eventId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
        body: JSON.stringify({ challengeId, code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Не удалось отправить заявку");
      toast.success("Запрос на отмену отправлен администратору");
      onSubmitted();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!challengeId) throw new Error("Запрос не найден");
    const res = await fetch(config.endpoints.organizer.cancellationResend(eventId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
      },
      body: JSON.stringify({ challengeId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Не удалось отправить код");
    return data.expiresInSec ?? 120;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#121218] border-white/10 text-white sm:max-w-md overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10">
                <Ban className="h-5 w-5 text-rose-300" />
              </div>
              <DialogTitle className="font-display text-xl">Отменить концерт</DialogTitle>
            </div>
          </DialogHeader>

          {step === "form" ? (
            <div className="space-y-4 relative">
              <p className="text-sm text-white/50 leading-relaxed">
                Укажите причину отмены. После подтверждения кода заявка уйдёт администратору. При одобрении
                держателям билетов придёт письмо о возврате средств.
              </p>
              <div>
                <label className={fieldLabel}>Причина отмены</label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Например: болезнь артиста, форс-мажор на площадке…"
                  className={cn(
                    "mt-2 min-h-[120px] bg-[#0a0a0a] border-white/10 text-white resize-none",
                    "focus-visible:border-rose-500/40 focus-visible:ring-rose-500/20"
                  )}
                />
              </div>
            </div>
          ) : challengeId ? (
            <OtpVerificationStep
              email={user?.email ?? "вашу почту"}
              challengeId={challengeId}
              expiresInSec={expiresInSec}
              numericOnly
              busy={loading}
              onVerify={submitCancellation}
              onResend={resendCode}
            />
          ) : null}

          {step === "form" ? (
            <DialogFooter className="gap-2 sm:gap-0 relative">
              <Button variant="outline" className="border-white/15 bg-transparent" onClick={() => onOpenChange(false)}>
                Закрыть
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-500"
                disabled={loading || reason.trim().length < 10}
                onClick={() => setCaptchaOpen(true)}
              >
                {loading ? "Отправка…" : "Отправить код"}
              </Button>
            </DialogFooter>
          ) : (
            <div className="flex justify-end relative">
              <Button variant="outline" className="border-white/15 bg-transparent" onClick={() => onOpenChange(false)}>
                Закрыть
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CaptchaModal
        open={captchaOpen}
        onOpenChange={setCaptchaOpen}
        onVerified={(token) => void requestCode(token)}
      />
    </>
  );
};

export default OrganizerCancelEventDialog;
