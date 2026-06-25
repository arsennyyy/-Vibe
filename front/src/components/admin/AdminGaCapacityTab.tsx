import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { config } from "@/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminFieldLabel,
  adminInput,
  adminPrimaryBtn,
  adminShell,
} from "@/lib/adminUi";
import { Loader2, Music2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type LayoutRow = { id: number; name: string; hallId: number };
type HallRow = { id: number; name: string; venueId: number };
type GaSector = { sector: string; capacity: number; price: number };

type Props = {
  getToken: () => string | null;
};

const AdminGaCapacityTab = ({ getToken }: Props) => {
  const [halls, setHalls] = useState<HallRow[]>([]);
  const [layouts, setLayouts] = useState<LayoutRow[]>([]);
  const [hallId, setHallId] = useState<number | "">("");
  const [layoutId, setLayoutId] = useState<number | "">("");
  const [sectors, setSectors] = useState<GaSector[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const headers = useCallback(() => {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [getToken]);

  useEffect(() => {
    const load = async () => {
      const hres = await fetch(config.endpoints.admin.halls, { headers: headers() });
      if (hres.ok) setHalls(await hres.json());
    };
    void load();
  }, [headers]);

  useEffect(() => {
    if (!hallId) {
      setLayouts([]);
      setLayoutId("");
      return;
    }
    const load = async () => {
      const res = await fetch(`${config.endpoints.admin.layouts}?hallId=${hallId}`, { headers: headers() });
      if (res.ok) {
        const list = await res.json();
        setLayouts(list);
        if (list.length === 1) setLayoutId(list[0].id);
      }
    };
    void load();
  }, [hallId, headers]);

  const loadGa = useCallback(async () => {
    if (!layoutId) return;
    setLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/api/admin/layouts/${layoutId}/ga-sectors`, {
        headers: headers(),
      });
      if (!res.ok) throw new Error("Не удалось загрузить GA-зоны");
      const data = (await res.json()) as GaSector[];
      setSectors(data);
      const next: Record<string, string> = {};
      data.forEach((s) => {
        next[s.sector] = String(s.capacity);
      });
      setDraft(next);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
      setSectors([]);
    } finally {
      setLoading(false);
    }
  }, [layoutId, headers]);

  useEffect(() => {
    void loadGa();
  }, [loadGa]);

  const saveSector = async (sector: string) => {
    if (!layoutId) return;
    const cap = parseInt(draft[sector] ?? "0", 10);
    if (!Number.isFinite(cap) || cap < 0 || cap > 10000) {
      toast.error("Вместимость: число от 0 до 10000");
      return;
    }
    setSaving(sector);
    try {
      const res = await fetch(`${config.apiUrl}/api/admin/layouts/${layoutId}/ga-capacity`, {
        method: "PUT",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ sector, capacity: cap }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Ошибка сохранения");
      toast.success(`«${sector}»: ${cap} мест`);
      await loadGa();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className={cn(adminShell, "p-6 md:p-8 space-y-6")}>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6]/25 to-[#6d28d9]/10 border border-[#8B5CF6]/30">
            <Music2 className="h-6 w-6 text-[#c4b5fd]" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Вместимость танцпола</h2>
            <p className="text-sm text-white/45 mt-1 leading-relaxed">
              Выберите зал и схему, затем задайте количество билетов на танцпол или GA-зону.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={adminFieldLabel}>Зал</label>
            <select
              className={adminInput + " w-full"}
              value={hallId}
              onChange={(e) => {
                setHallId(e.target.value ? Number(e.target.value) : "");
                setLayoutId("");
              }}
            >
              <option value="">— выберите зал —</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={adminFieldLabel}>Схема</label>
            <select
              className={adminInput + " w-full"}
              value={layoutId}
              disabled={!hallId}
              onChange={(e) => setLayoutId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">— выберите схему —</option>
              {layouts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-white/40 text-sm py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[#8B5CF6]/60" />
            Загрузка зон…
          </div>
        ) : sectors.length === 0 && layoutId ? (
          <div className="rounded-xl border border-dashed border-white/10 py-12 text-center text-sm text-white/40">
            В этой схеме нет GA-зон (танцпол).
          </div>
        ) : (
          <div className="space-y-3">
            {sectors.map((s) => (
              <div
                key={s.sector}
                className="flex flex-wrap items-end gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-5"
              >
                <div className="flex-1 min-w-[140px]">
                  <p className="text-base font-semibold text-white">{s.sector}</p>
                  <p className="text-xs text-white/40 mt-0.5">Цена в схеме: {s.price} ₿</p>
                </div>
                <div className="w-32">
                  <label className={adminFieldLabel}>Мест</label>
                  <Input
                    className={adminInput}
                    inputMode="numeric"
                    value={draft[s.sector] ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [s.sector]: e.target.value.replace(/\D/g, "").slice(0, 5) }))
                    }
                  />
                </div>
                <Button
                  className={cn(adminPrimaryBtn, "min-w-[120px]")}
                  disabled={saving === s.sector}
                  onClick={() => void saveSector(s.sector)}
                >
                  {saving === s.sector ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1.5" />
                      Сохранить
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGaCapacityTab;
