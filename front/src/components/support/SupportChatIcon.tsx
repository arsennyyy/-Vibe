import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  open?: boolean;
};

/** Иконка «билет + чат» — специфика +Vibe. */
export default function SupportChatIcon({ className, open }: Props) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={cn("h-6 w-6", className)} aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("h-6 w-6", className)} aria-hidden>
      <path
        d="M5 8.5C5 7.12 6.12 6 7.5 6h9c1.38 0 2.5 1.12 2.5 2.5v5c0 1.38-1.12 2.5-2.5 2.5H14l-2.2 2.2c-.55.55-1.45.16-1.45-.62V16H7.5C6.12 16 5 14.88 5 13.5v-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 9.5h8M8 12h5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M16.5 4.5 18 3l1.5 1.5L21 3l1 1-1.5 1.5L21 7l-1.5-1.5L18 7l-1-1 1.5-1.5L18 3l-1.5 1.5Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}
