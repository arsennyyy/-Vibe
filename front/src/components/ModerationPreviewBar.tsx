import { Link } from "react-router-dom";
import { ArrowLeft, Eye, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ModerationPreviewBarProps = {
  className?: string;
};

export default function ModerationPreviewBar({ className }: ModerationPreviewBarProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[#8B5CF6]/25",
        "bg-gradient-to-r from-[#8B5CF6]/15 via-[#161616] to-[#0a0a0a]",
        "px-4 py-4 md:px-5 md:py-5 shadow-[0_12px_40px_rgba(139,92,246,0.12)]",
        className
      )}
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#8B5CF6]/20 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white/80 hover:border-[#8B5CF6]/40 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Админ-панель
        </Link>
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10">
            <Eye className="h-5 w-5 text-[#a78bfa]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#c4b5fd]">
                <Sparkles className="h-3 w-3" />
                Превью модерации
              </span>
            </div>
            <p className="text-sm text-white/55 leading-relaxed">
              Так увидят организатор и гости после публикации. Одобрение или отклонение — в блоке справа.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
