import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortMode } from "@/lib/concertsCatalog";

const labels: Record<SortMode, string> = {
  soon: "Скоро",
  "price-asc": "Цена ↑",
  "price-desc": "Цена ↓",
  title: "По названию",
};

type Props = {
  value: SortMode;
  onChange: (v: SortMode) => void;
};

export default function ConcertsSortSelect({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortMode)}>
      <SelectTrigger className="w-[168px] h-10 bg-[#0a0a0a] border-white/10 text-white rounded-xl focus:ring-[#8B5CF6]/30">
        <SelectValue placeholder="Сортировка" />
      </SelectTrigger>
      <SelectContent className="bg-[#161616] border-white/10 text-white z-[100]">
        {(Object.keys(labels) as SortMode[]).map((mode) => (
          <SelectItem
            key={mode}
            value={mode}
            className="focus:bg-white/10 focus:text-white cursor-pointer"
          >
            {labels[mode]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
