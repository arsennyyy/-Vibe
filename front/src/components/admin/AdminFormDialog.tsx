import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { adminGhostBtn, adminPrimaryBtn } from "@/lib/adminUi";
import { Sparkles } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  onSave: () => void;
  saveLabel?: string;
  maxWidth?: string;
};

export default function AdminFormDialog({
  open,
  onOpenChange,
  title,
  children,
  onSave,
  saveLabel = "Сохранить",
  maxWidth = "max-w-2xl",
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          maxWidth,
          "p-0 gap-0 overflow-hidden rounded-2xl border border-white/[0.12]",
          "bg-[#0e0e14]/95 text-white backdrop-blur-xl",
          "shadow-[0_40px_100px_rgba(0,0,0,0.75),0_0_0_1px_rgba(139,92,246,0.08)]",
          "[&>button]:text-white/40 [&>button]:hover:text-white [&>button]:hover:bg-white/10 [&>button]:rounded-lg"
        )}
      >
        <div className="relative h-1.5 w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6]/0 via-[#8B5CF6] to-[#c4b5fd]/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
        </div>
        <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-[#8B5CF6]/20 blur-3xl" />
        <DialogHeader className="relative px-6 pt-5 pb-3 space-y-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/25">
              <Sparkles className="h-4 w-4 text-[#c4b5fd]" />
            </div>
            <DialogTitle className="font-display text-xl font-bold text-white tracking-tight">
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="relative px-6 py-4 max-h-[min(65vh,560px)] overflow-y-auto admin-dialog-scroll">
          {children}
        </div>
        <DialogFooter className="relative px-6 py-4 border-t border-white/[0.08] bg-gradient-to-t from-[#0a0a10] to-[#0d0d12] gap-2 sm:gap-3">
          <Button type="button" variant="ghost" className={adminGhostBtn} onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            className={cn(adminPrimaryBtn, "shadow-[0_8px_32px_rgba(139,92,246,0.35)] hover:shadow-[0_12px_40px_rgba(139,92,246,0.45)]")}
            onClick={onSave}
          >
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
