import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, HelpCircle, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmVariant = "danger" | "warning" | "success" | "default";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
};

type VariantUi = {
  Icon: LucideIcon;
  bar: string;
  iconWrap: string;
  icon: string;
  confirmBtn: string;
};

const VARIANTS: Record<ConfirmVariant, VariantUi> = {
  danger: {
    Icon: Trash2,
    bar: "via-rose-500/60",
    iconWrap: "bg-rose-500/15 border-rose-500/25",
    icon: "text-rose-400",
    confirmBtn: "bg-rose-600 hover:bg-rose-500 text-white",
  },
  warning: {
    Icon: AlertTriangle,
    bar: "via-amber-500/60",
    iconWrap: "bg-amber-500/15 border-amber-500/25",
    icon: "text-amber-400",
    confirmBtn: "bg-amber-600 hover:bg-amber-500 text-white",
  },
  success: {
    Icon: Sparkles,
    bar: "via-emerald-500/60",
    iconWrap: "bg-emerald-500/15 border-emerald-500/25",
    icon: "text-emerald-400",
    confirmBtn: "bg-emerald-600 hover:bg-emerald-500 text-white",
  },
  default: {
    Icon: HelpCircle,
    bar: "via-[#8B5CF6]/60",
    iconWrap: "bg-[#8B5CF6]/15 border-[#8B5CF6]/25",
    icon: "text-[#c4b5fd]",
    confirmBtn: "bg-[#8B5CF6] hover:bg-[#7c3aed] text-white",
  },
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(opts);
      setOpen(true);
    });
  }, []);

  const finish = (result: boolean) => {
    setOpen(false);
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.(result);
    if (!result) setTimeout(() => setOptions(null), 200);
    else setOptions(null);
  };

  const variant = options?.variant ?? "default";
  const ui = VARIANTS[variant];
  const Icon = ui.Icon;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={open} onOpenChange={(o) => !o && finish(false)}>
        <DialogContent
          className={cn(
            "max-w-md p-0 gap-0 overflow-hidden rounded-2xl border border-white/10",
            "bg-[#121218] text-white shadow-[0_32px_80px_rgba(0,0,0,0.65)]",
            "[&>button]:text-white/40 [&>button]:hover:text-white [&>button]:hover:bg-white/10 [&>button]:rounded-lg"
          )}
        >
          <div className={cn("h-1 w-full bg-gradient-to-r from-transparent to-transparent", ui.bar)} />
          <DialogHeader className="px-6 pt-6 pb-2 space-y-3">
            <div
              className={cn(
                "h-12 w-12 rounded-2xl border flex items-center justify-center",
                ui.iconWrap
              )}
            >
              <Icon className={cn("h-6 w-6", ui.icon)} />
            </div>
            <DialogTitle className="font-display text-xl font-bold tracking-tight text-left">
              {options?.title}
            </DialogTitle>
            <p className="text-sm text-white/55 leading-relaxed text-left whitespace-pre-line">
              {options?.message}
            </p>
          </DialogHeader>
          <DialogFooter className="px-6 py-4 border-t border-white/[0.08] bg-[#0d0d10] gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl h-10 text-white/55 hover:text-white hover:bg-white/10"
              onClick={() => finish(false)}
            >
              {options?.cancelLabel ?? "Отмена"}
            </Button>
            <Button
              type="button"
              className={cn("font-semibold rounded-xl h-10 px-5", ui.confirmBtn)}
              onClick={() => finish(true)}
            >
              {options?.confirmLabel ?? "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}
