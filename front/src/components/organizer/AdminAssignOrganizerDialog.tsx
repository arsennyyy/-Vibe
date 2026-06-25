import { useEffect, useState } from "react";
import { toast } from "sonner";
import { config } from "@/config";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Send, UserRound, Shield, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

type OrganizerOption = { id: number; name: string; email: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  eventTitle: string;
};

const fieldLabel = "text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold";

const AdminAssignOrganizerDialog = ({ open, onOpenChange, eventId, eventTitle }: Props) => {
  const [organizers, setOrganizers] = useState<OrganizerOption[]>([]);
  const [organizerId, setOrganizerId] = useState("");
  const [accessMode, setAccessMode] = useState<"editable" | "viewonly">("editable");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(config.endpoints.admin.organizers, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setOrganizers(Array.isArray(data) ? data : []))
      .catch(() => setOrganizers([]));
  }, [open]);

  const assign = async () => {
    if (!organizerId) {
      toast.error("Выберите организатора");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(config.endpoints.organizer.assignOrganizer(eventId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
        body: JSON.stringify({ organizerId: Number(organizerId), accessMode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Ошибка");
      toast.success(data.message || "Готово");
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/event/${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const selectedOrganizer = organizers.find((o) => String(o.id) === organizerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#121218] border-white/10 text-white sm:max-w-lg overflow-hidden p-0 gap-0">
        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/12 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-left">Передать организатору</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/50 mt-2 leading-relaxed">
            <span className="text-white/80 font-medium">«{eventTitle}»</span> — выберите организатора и режим
            доступа к конструктору.
          </p>
        </div>

        <div className="relative px-6 py-5 space-y-5">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-4">
            <div>
              <label className={cn(fieldLabel, "flex items-center gap-1.5")}>
                <UserRound className="h-3.5 w-3.5" />
                Организатор
              </label>
              <Select value={organizerId} onValueChange={setOrganizerId}>
                <SelectTrigger className="mt-2 h-11 bg-[#0a0a0a] border-white/10 text-white">
                  <SelectValue placeholder="Выберите из списка" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                  {organizers.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name || o.email} ({o.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOrganizer ? (
                <p className="text-xs text-white/35 mt-2">{selectedOrganizer.email}</p>
              ) : null}
            </div>

            <div>
              <label className={cn(fieldLabel, "flex items-center gap-1.5")}>
                <Shield className="h-3.5 w-3.5" />
                Режим доступа
              </label>
              <Select value={accessMode} onValueChange={(v) => setAccessMode(v as "editable" | "viewonly")}>
                <SelectTrigger className="mt-2 h-11 bg-[#0a0a0a] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                  <SelectItem value="editable">Может редактировать и отправить на модерацию</SelectItem>
                  <SelectItem value="viewonly">Только просмотр страницы</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void copyLink()}
            className="w-full flex items-center gap-3 rounded-xl border border-dashed border-white/12 bg-[#0a0a0a]/60 px-4 py-3 text-left text-sm text-white/55 hover:border-violet-500/30 hover:text-white/80 transition-colors"
          >
            <Link2 className="h-4 w-4 shrink-0 text-violet-300/80" />
            <span className="flex-1 truncate">Скопировать публичную ссылку на мероприятие</span>
            <Copy className="h-4 w-4 shrink-0 opacity-60" />
          </button>
        </div>

        <DialogFooter className="relative px-6 py-4 border-t border-white/[0.06] bg-black/20 gap-2 sm:gap-3">
          <Button variant="outline" className="border-white/15 bg-transparent flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            className="flex-1 sm:flex-none bg-gradient-to-r from-[#8B5CF6] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#6d28d9] shadow-lg shadow-violet-900/25"
            disabled={loading || !organizerId}
            onClick={() => void assign()}
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? "Отправка…" : "Отправить организатору"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminAssignOrganizerDialog;
