import React from "react";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { cardClass, pageBg, pageMuted, pageText } from "@/lib/siteTheme";

export const pageCard = `${cardClass} p-6 md:p-8 shadow-sm`;
export const pageCardTitle = "text-lg font-display font-bold text-white mb-3";
export const pageBody = "text-white/55 leading-relaxed text-[15px]";
export const pageLabel =
  "text-[11px] font-medium uppercase tracking-widest text-white/40 mb-2 block";

type StaticPageLayoutProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: React.ReactNode;
  narrow?: boolean;
};

const StaticPageLayout = ({
  title,
  subtitle,
  eyebrow,
  children,
  narrow = false,
}: StaticPageLayoutProps) => (
  <Layout>
    <section className={cn("relative border-b border-white/10 overflow-hidden", pageBg)}>
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(139,92,246,0.18),transparent)]"
        aria-hidden
      />
      <div className="relative w-full max-w-[min(100%,92rem)] mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#a78bfa] mb-4">{eyebrow}</p>
        ) : null}
        <h1 className={cn("text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight", pageText)}>
          {title}
        </h1>
        {subtitle ? (
          <p className={cn("mt-4 text-base md:text-lg max-w-2xl leading-relaxed", pageMuted)}>{subtitle}</p>
        ) : null}
      </div>
    </section>

    <section className={cn("py-10 md:py-14 pb-24", pageBg)}>
      <div
        className={cn(
          "w-full mx-auto px-4 sm:px-6 lg:px-8",
          narrow ? "max-w-3xl" : "max-w-[min(100%,92rem)]"
        )}
      >
        {children}
      </div>
    </section>
  </Layout>
);

export default StaticPageLayout;
