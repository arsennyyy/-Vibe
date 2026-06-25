import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ButtonCaptcha from "@/components/security/ButtonCaptcha";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: (token: string) => void;
  title?: string;
  description?: string;
};

const CaptchaModal = ({
  open,
  onOpenChange,
  onVerified,
  title = "Проверка безопасности",
  description = "Нажмите кнопку ниже, чтобы подтвердить, что вы не робот.",
}: Props) => {
  const [captchaKey, setCaptchaKey] = useState(0);

  const handleOpenChange = (next: boolean) => {
    if (!next) setCaptchaKey((k) => k + 1);
    onOpenChange(next);
  };

  const handleVerified = (token: string) => {
    onVerified(token);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[400px] border-white/10 bg-[#12121a] p-0 gap-0 overflow-hidden shadow-2xl shadow-violet-950/40 [&>button]:text-white/45 [&>button]:hover:text-white [&>button]:hover:bg-white/10 [&>button]:rounded-lg">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>

        <div className="relative px-6 pt-6 pb-2">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#8b5cf6]/20 to-transparent pointer-events-none" />
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="relative text-center space-y-2 mb-5"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6]/30 to-[#6d28d9]/20 border border-[#8b5cf6]/30 shadow-lg shadow-violet-900/30">
                  <ShieldCheck className="h-7 w-7 text-[#c4b5fd]" />
                </div>
                <h3 className="text-lg font-bold text-white font-display">{title}</h3>
                <p className="text-sm text-white/50 leading-relaxed px-2">{description}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-6 pb-6">
          <ButtonCaptcha key={captchaKey} embedded onVerified={handleVerified} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CaptchaModal;
