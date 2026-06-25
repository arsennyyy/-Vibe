import { ReactNode } from "react";

type LegalRevisionFooterProps = {
  updated: string;
  version?: string;
  children?: ReactNode;
};

const LegalRevisionFooter = ({ updated, version, children }: LegalRevisionFooterProps) => (
  <footer className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div className="text-xs text-white/35 space-y-1">
      <p>Редакция от {updated}</p>
      {version ? <p className="text-white/25">Версия {version}</p> : null}
    </div>
    {children ? <div className="text-sm text-white/45">{children}</div> : null}
  </footer>
);

export default LegalRevisionFooter;
