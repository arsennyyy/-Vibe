import { ReactNode } from "react";

const AdminTabHint = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="mb-4 p-4 rounded-xl border border-[#8B5CF6]/15 bg-[#8B5CF6]/5 text-sm text-white/50 leading-relaxed">
    <p className="text-[#c4b5fd] font-medium mb-1 text-xs uppercase tracking-wider">{title}</p>
    {children}
  </div>
);

export default AdminTabHint;
