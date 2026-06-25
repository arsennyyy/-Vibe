import { cn } from "@/lib/utils";

const RUBLE_ICON = "/currency/byn-ico.png";

/** Знак белорусского рубля — byn-ico.png (прозрачный фон), белый на тёмном UI. */
export function BelarusRuble({ className, withSpace = false }: { className?: string; withSpace?: boolean }) {
  return (
    <>
      {withSpace ? "\u00A0" : null}
      <img
        src={RUBLE_ICON}
        alt=""
        draggable={false}
        aria-label="белорусский рубль"
        title="белорусский рубль"
        className={cn(
          "inline-block shrink-0 object-contain select-none pointer-events-none",
          "h-[0.82em] w-[0.82em] align-[-0.06em]",
          "brightness-0 invert",
          className
        )}
      />
    </>
  );
}

export function formatPriceNumber(amount: number, decimals = 0): string {
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString("ru-RU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

type PriceTextProps = {
  amount: number | string;
  decimals?: number;
  className?: string;
  symbolClassName?: string;
};

export function PriceText({ amount, decimals = 0, className, symbolClassName }: PriceTextProps) {
  const n = typeof amount === "string" ? parseFloat(amount.replace(/\s/g, "").replace(",", ".")) : amount;
  const safe = Number.isFinite(n) ? n : 0;
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>
      {formatPriceNumber(safe, decimals)}
      <BelarusRuble className={symbolClassName} withSpace />
    </span>
  );
}

/** Убирает текстовые суффиксы валюты из legacy-строк. */
export function replaceBynInText(text: string): string {
  return text
    .replace(/\s*(?:BYN|Br)\b/gi, "")
    .replace(/\s*Б\s*$/u, "")
    .trim();
}

/** Отображение произвольной ценовой строки каталога с символом рубля */
export function PriceLabel({ text, className }: { text: string; className?: string }) {
  const raw = text.trim();
  const m = raw.match(/^(от\s+)?(\d[\d\s.,]*)\s*(?:BYN|Br|₽|руб\.?|Б)?$/iu);
  if (m) {
    const n = parseFloat(m[2].replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(n)) {
      return (
        <span className={cn("whitespace-nowrap tabular-nums", className)}>
          {m[1] ? <>от{"\u00A0"}</> : null}
          <PriceText amount={n} className="inline" />
        </span>
      );
    }
  }
  const cleaned = replaceBynInText(raw);
  if (!cleaned && !raw.match(/\d/)) {
    return <span className={className}>{raw}</span>;
  }
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>
      {cleaned || raw}
      {/\d/.test(cleaned || raw) ? <BelarusRuble withSpace /> : null}
    </span>
  );
}
