import { useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CaptchaModal from "@/components/security/CaptchaModal";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string, captchaToken: string) => Promise<void>;
  busy?: boolean;
};

const RefundRequestDialog = ({ open, onClose, onSubmit, busy }: Props) => {
  const [reason, setReason] = useState("");
  const [captchaOpen, setCaptchaOpen] = useState(false);

  const handleClose = () => {
    setReason("");
    setCaptchaOpen(false);
    onClose();
  };

  const handleSendClick = () => {
    setCaptchaOpen(true);
  };

  const handleCaptchaVerified = async (token: string) => {
    await onSubmit(reason.trim(), token);
    setReason("");
    setCaptchaOpen(false);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {!captchaOpen ? (
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
        <motion.button
          type="button"
          aria-label="Закрыть"
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleClose}
        />
        <motion.div
          role="dialog"
          aria-modal
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e14] shadow-2xl shadow-violet-950/40"
        >
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#8B5CF6]/25 via-[#6d28d9]/10 to-transparent pointer-events-none" />
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 h-9 w-9 rounded-xl border border-white/10 bg-black/30 text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative px-6 pt-7 pb-2 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6]/35 to-[#4c1d95]/25 border border-[#8B5CF6]/35 shadow-lg shadow-violet-900/30">
              <RotateCcw className="h-7 w-7 text-[#ddd6fe]" />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">Заявка на возврат</h3>
            <p className="text-sm text-white/45 leading-relaxed max-w-sm mx-auto">
              После одобрения средства вернутся на карту, место снова появится в продаже.
              Возврат недоступен менее чем за 24 часа до начала.
            </p>
          </div>

          <div className="relative px-6 pb-6 space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-black/30 p-4 space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
                Причина <span className="text-white/20">(необязательно)</span>
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Расскажите, почему не сможете прийти…"
                className="min-h-[88px] resize-none border-white/10 bg-[#0a0a0a] text-white placeholder:text-white/25 focus-visible:ring-[#8B5CF6]/40"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 rounded-xl border-white/12 bg-transparent hover:bg-white/5 text-white/70"
                onClick={handleClose}
                disabled={busy}
              >
                Отмена
              </Button>
              <Button
                className={cn(
                  "flex-1 rounded-xl font-semibold bg-gradient-to-r from-[#8B5CF6] to-[#7c3aed] hover:shadow-lg hover:shadow-violet-900/30"
                )}
                disabled={busy}
                onClick={handleSendClick}
              >
                {busy ? "Отправка…" : "Отправить заявку"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
      ) : null}

      <CaptchaModal
        open={captchaOpen}
        onOpenChange={setCaptchaOpen}
        onVerified={(token) => void handleCaptchaVerified(token)}
        title="Проверка перед отправкой"
        description="Подтвердите, что вы не робот — после этого заявка уйдёт администратору."
      />
    </>
  );
};

export default RefundRequestDialog;
