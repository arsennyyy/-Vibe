import { useCallback, useEffect, useState } from "react";
import { config } from "@/config";
import AdminTablePanel from "@/components/admin/AdminTablePanel";
import AdminTabHint from "@/components/admin/AdminTabHint";
import { cn } from "@/lib/utils";
import { Cookie, Check, X } from "lucide-react";

type Row = {
  id: number;
  visitorId: string;
  userId?: number;
  userEmail?: string;
  userName?: string;
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  userAgent?: string;
  createdAt: string;
  updatedAt?: string;
};

const AdminCookieConsentsTab = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${config.endpoints.admin.cookieConsents}?limit=200`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      });
      const data = await res.json().catch(() => []);
      setRows(
        Array.isArray(data)
          ? data.map((r: Record<string, unknown>) => ({
              id: Number(r.id ?? r.Id),
              visitorId: String(r.visitorId ?? r.VisitorId ?? ""),
              userId: r.userId != null ? Number(r.userId) : r.UserId != null ? Number(r.UserId) : undefined,
              userEmail: r.userEmail ? String(r.userEmail) : r.UserEmail ? String(r.UserEmail) : undefined,
              userName: r.userName ? String(r.userName) : r.UserName ? String(r.UserName) : undefined,
              essential: Boolean(r.essential ?? r.Essential),
              analytics: Boolean(r.analytics ?? r.Analytics),
              marketing: Boolean(r.marketing ?? r.Marketing),
              userAgent: r.userAgent ? String(r.userAgent) : undefined,
              createdAt: String(r.createdAt ?? r.CreatedAt ?? ""),
              updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
            }))
          : []
      );
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const Bool = ({ ok }: { ok: boolean }) =>
    ok ? (
      <Check className="h-4 w-4 text-emerald-400" />
    ) : (
      <X className="h-4 w-4 text-white/20" />
    );

  return (
    <div className="space-y-6">
      <AdminTabHint title="Согласия на cookie">
        Журнал согласий с баннера на сайте: кто принял необходимые cookie, аналитику и маркетинг.
      </AdminTabHint>

      <AdminTablePanel empty={!loading && rows.length === 0} emptyLabel="Согласий пока нет">
        {loading ? (
          <p className="text-sm text-white/40 py-8 text-center">Загрузка…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-white/35 border-b border-white/[0.06]">
                  <th className="py-3 pr-4 font-semibold">Посетитель</th>
                  <th className="py-3 pr-4 font-semibold">Пользователь</th>
                  <th className="py-3 px-2 font-semibold text-center">Необх.</th>
                  <th className="py-3 px-2 font-semibold text-center">Аналит.</th>
                  <th className="py-3 px-2 font-semibold text-center">Маркет.</th>
                  <th className="py-3 pl-4 font-semibold">Обновлено</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Cookie className="h-4 w-4 text-[#c4b5fd] shrink-0" />
                        <span className="font-mono text-xs text-white/70 truncate max-w-[140px]">
                          {row.visitorId.slice(0, 8)}…
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-white/55">
                      {row.userEmail ? (
                        <div>
                          <div className="text-white/80">{row.userName || row.userEmail}</div>
                          <div className="text-xs text-white/35">{row.userEmail}</div>
                        </div>
                      ) : (
                        <span className="text-white/30">Гость</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Bool ok={row.essential} />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Bool ok={row.analytics} />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Bool ok={row.marketing} />
                    </td>
                    <td className="py-3 pl-4 text-xs text-white/40 tabular-nums whitespace-nowrap">
                      {new Date(row.updatedAt || row.createdAt).toLocaleString("ru-RU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminTablePanel>

      {!loading && rows.length > 0 ? (
        <p className={cn("text-xs text-white/35")}>{rows.length} записей в журнале согласий</p>
      ) : null}
    </div>
  );
};

export default AdminCookieConsentsTab;
