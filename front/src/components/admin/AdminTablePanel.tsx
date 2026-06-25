import { ReactNode } from "react";
import { adminEmpty, adminTableWrap } from "@/lib/adminUi";
import { Inbox } from "lucide-react";

type AdminTablePanelProps = {
  children: ReactNode;
  empty?: boolean;
  emptyLabel?: string;
  hint?: ReactNode;
};

export default function AdminTablePanel({
  children,
  empty,
  emptyLabel = "Нет данных",
  hint,
}: AdminTablePanelProps) {
  return (
    <div className="space-y-4">
      {hint}
      {empty ? (
        <div className={adminEmpty}>
          <Inbox className="h-10 w-10 text-white/15 mb-3" />
          <p>{emptyLabel}</p>
        </div>
      ) : (
        <div className={adminTableWrap}>{children}</div>
      )}
    </div>
  );
}
