import { useState } from "react";
import { motion } from "framer-motion";
import { Send, X, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
  busy?: boolean;
  eventTitle?: string;
  price?: number;
};

const TransferTicketDialog = ({ open, onClose, onSubmit, busy, eventTitle, price }: Props) => {
  const [email, setEmail] = useState("");

  const handleClose = () => {
    setEmail("");
    onClose();
  };

  if (!open) return null;

  return (
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
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e14] shadow-2xl shadow-sky-950/30"
      >
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-sky-500/20 via-[#8B5CF6]/10 to-transparent pointer-events-none" />
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 h-9 w-9 rounded-xl border border-white/10 bg-black/30 text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative px-6 pt-7 pb-2 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/30 to-[#4c1d95]/25 border border-sky-400/35 shadow-lg shadow-sky-900/25">
            <Send className="h-7 w-7 text-sky-200" />
          </div>
          <h3 className="font-display text-xl font-bold text-white mb-2">Передать билет</h3>
          <p className="text-sm text-white/45 leading-relaxed max-w-sm mx-auto">
            {eventTitle ? `«${eventTitle}»` : "Билет"} — друг оплатит{" "}
            <span className="text-white/80 font-semibold">{price != null ? `${price} BYN` : "по номиналу"}</span>.
            У него будет 10 минут на принятие.
          </p>
        </div>

        <div className="relative px-6 pb-6 space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-black/30 p-4 space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-white/35 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Email друга на +Vibe
            </label>
            <Input
              type="email"
              placeholder="friend@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-[#0a0a0a] border-white/12 text-white"
              autoComplete="email"
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-[11px] text-emerald-200/80 leading-snug">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400/80" />
            Перепродажа дороже номинала через +Vibe невозможна — только официальная цена билета.
          </div>

          <Button
            type="button"
            disabled={busy || !email.trim()}
            className={cn(
              "w-full h-12 rounded-xl font-semibold text-white",
              "bg-gradient-to-r from-sky-500 to-[#6366f1] hover:from-sky-400 hover:to-[#818cf8] shadow-lg shadow-sky-900/25"
            )}
            onClick={() => void onSubmit(email.trim())}
          >
            {busy ? "Отправляем…" : "Отправить приглашение"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default TransferTicketDialog;
