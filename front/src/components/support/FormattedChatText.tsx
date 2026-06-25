import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
};

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Простое форматирование: абзацы, списки, **жирный**. */
export default function FormattedChatText({ text, className }: Props) {
  const lines = text.split(/\r?\n/);

  return (
    <div className={cn("space-y-1.5 text-sm leading-relaxed", className)}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        const bullet = trimmed.match(/^[-•*]\s+(.+)$/);
        if (bullet) {
          return (
            <div key={idx} className="flex gap-2 pl-1">
              <span className="text-[#a78bfa] shrink-0">•</span>
              <span>{renderInline(bullet[1])}</span>
            </div>
          );
        }

        const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
        if (numbered) {
          const num = trimmed.match(/^(\d+)/)?.[1];
          return (
            <div key={idx} className="flex gap-2 pl-1">
              <span className="text-[#a78bfa] shrink-0 font-medium tabular-nums">{num}.</span>
              <span>{renderInline(numbered[1])}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}
