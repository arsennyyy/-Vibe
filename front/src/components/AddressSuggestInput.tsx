import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  suggestions: (query: string) => string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

const AddressSuggestInput = ({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  disabled,
}: Props) => {
  const hints = useMemo(() => suggestions(value), [value, suggestions]);
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative">
      <Input
        className={className}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {focused && hints.length > 0 && !disabled ? (
        <ul
          className={cn(
            "absolute z-30 mt-1 w-full max-h-48 overflow-auto rounded-lg",
            "border border-white/10 bg-[#1a1a1a] shadow-xl"
          )}
        >
          {hints.map((h) => (
            <li key={h}>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm text-white/80 hover:bg-white/5"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChange(h)}
              >
                {h}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default AddressSuggestInput;
