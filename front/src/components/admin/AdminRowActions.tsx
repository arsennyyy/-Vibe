import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
};

/** Кнопки действий как во вкладке «События». */
export default function AdminRowActions({ onEdit, onDelete }: Props) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0 border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
        onClick={onEdit}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button type="button" size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
