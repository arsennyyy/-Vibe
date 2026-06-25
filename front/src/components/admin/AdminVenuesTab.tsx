import { useMemo, useState } from "react";
import { toast } from "sonner";
import { config } from "@/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminInput,
  adminFieldLabel,
  adminTableWrap,
  adminTableHead,
  adminTableRow,
  adminTableCell,
  adminTableHeaderRow,
  adminPrimaryBtn,
  adminGhostBtn,
} from "@/lib/adminUi";
import AdminRowActions from "@/components/admin/AdminRowActions";
import { useConfirm } from "@/contexts/ConfirmContext";
import { filterMinskSuggestions } from "@/content/minskVenues";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type Venue = { id: number; name: string; city: string; address: string };

type Props = {
  venues: Venue[];
  getToken: () => string | null;
  onReload: () => void;
};

const SuggestField = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) => {
  const hints = useMemo(() => filterMinskSuggestions(value, 6), [value]);
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative flex-1 min-w-[140px]">
      <label className={adminFieldLabel}>{label}</label>
      <Input
        className={adminInput}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
      />
      {focused && hints.length > 0 && value.trim().length >= 1 ? (
        <ul className="absolute z-20 mt-1 w-full rounded-lg border border-white/10 bg-[#1a1a1a] shadow-lg max-h-40 overflow-auto">
          {hints.map((h) => (
            <li key={h}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/5"
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

const AdminVenuesTab = ({ venues, getToken, onReload }: Props) => {
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [city, setCity] = useState("Минск");
  const [address, setAddress] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const addVenue = async () => {
    if (!name.trim()) {
      toast.error("Укажите название площадки");
      return;
    }
    const token = getToken();
    const res = await fetch(config.endpoints.admin.venues, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: name.trim(),
        city: city.trim() || "Минск",
        address: address.trim(),
      }),
    });
    if (res.ok) {
      toast.success("Площадка добавлена");
      setName("");
      setAddress("");
      onReload();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { message?: string }).message || "Не удалось добавить");
    }
  };

  const startEdit = (v: Venue) => {
    setEditingId(v.id);
    setEditName(v.name);
    setEditCity(v.city);
    setEditAddress(v.address);
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const token = getToken();
    const res = await fetch(`${config.endpoints.admin.venues}/${editingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: editName.trim(),
        city: editCity.trim(),
        address: editAddress.trim(),
      }),
    });
    if (res.ok) {
      toast.success("Сохранено");
      setEditingId(null);
      onReload();
    } else {
      toast.error("Не удалось сохранить");
    }
  };

  const removeVenue = async (id: number) => {
    const ok = await confirm({
      title: "Удалить площадку?",
      message: "Удалить эту площадку из каталога? Действие нельзя отменить.",
      confirmLabel: "Удалить",
      variant: "danger",
    });
    if (!ok) return;
    const token = getToken();
    const res = await fetch(`${config.endpoints.admin.venues}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      toast.success("Удалено");
      onReload();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { message?: string }).message || "Не удалось удалить");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <div className="flex items-start gap-3 p-4 rounded-xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 text-sm text-white/55 max-w-2xl w-full">
          <MapPin className="h-5 w-5 text-[#8B5CF6] shrink-0 mt-0.5" />
          <p>
            Добавляйте и редактируйте площадки. Организатор выбирает их из каталога при создании события.
            Редактирование — по кнопке в строке таблицы.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end p-4 rounded-xl border border-white/[0.08] bg-[#111111]">
        <SuggestField label="Название" value={name} onChange={setName} placeholder="Минск-Арена…" />
        <SuggestField label="Город" value={city} onChange={setCity} placeholder="Минск" />
        <SuggestField label="Адрес" value={address} onChange={setAddress} placeholder="пр-т Независимости…" />
        <Button className={cn(adminPrimaryBtn, "h-11")} onClick={addVenue}>
          Добавить
        </Button>
      </div>

      <div className={adminTableWrap}>
        <Table>
          <TableHeader>
            <TableRow className={adminTableHeaderRow}>
              <TableHead className={adminTableHead}>ID</TableHead>
              <TableHead className={adminTableHead}>Название</TableHead>
              <TableHead className={adminTableHead}>Город</TableHead>
              <TableHead className={adminTableHead}>Адрес</TableHead>
              <TableHead className={cn(adminTableHead, "text-right")}>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {venues.map((v) => (
              <TableRow key={v.id} className={adminTableRow}>
                <TableCell className={cn(adminTableCell, "font-mono text-xs text-white/40")}>{v.id}</TableCell>
                {editingId === v.id ? (
                  <>
                    <TableCell className={adminTableCell}>
                      <Input className={adminInput} value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </TableCell>
                    <TableCell className={adminTableCell}>
                      <Input className={adminInput} value={editCity} onChange={(e) => setEditCity(e.target.value)} />
                    </TableCell>
                    <TableCell className={adminTableCell}>
                      <Input className={adminInput} value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
                    </TableCell>
                    <TableCell className={cn(adminTableCell, "text-right space-x-2")}>
                      <Button size="sm" className={adminPrimaryBtn} onClick={saveEdit}>
                        OK
                      </Button>
                      <Button size="sm" variant="ghost" className={adminGhostBtn} onClick={() => setEditingId(null)}>
                        Отмена
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className={cn(adminTableCell, "font-medium")}>{v.name}</TableCell>
                    <TableCell className={adminTableCell}>{v.city}</TableCell>
                    <TableCell className={cn(adminTableCell, "max-w-md truncate text-white/55")}>{v.address}</TableCell>
                    <TableCell className={cn(adminTableCell, "text-right")}>
                      <div className="flex justify-end">
                        <AdminRowActions onEdit={() => startEdit(v)} onDelete={() => removeVenue(v.id)} />
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminVenuesTab;
