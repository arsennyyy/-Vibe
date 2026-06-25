import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import StaticPageLayout from "@/components/StaticPageLayout";
import { cn } from "@/lib/utils";
import {
  Ticket,
  CreditCard,
  Sparkles,
  LifeBuoy,
  MessageCircle,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FAQ_CATEGORIES } from "@/content/faqContent";

const ICONS: Record<string, LucideIcon> = {
  buy: Ticket,
  pay: CreditCard,
  org: Sparkles,
  help: LifeBuoy,
};

const ACCENTS: Record<string, string> = {
  buy: "from-sky-500/15 to-transparent border-sky-500/20",
  pay: "from-emerald-500/15 to-transparent border-emerald-500/20",
  org: "from-[#8B5CF6]/20 to-transparent border-[#8B5CF6]/25",
  help: "from-amber-500/15 to-transparent border-amber-500/20",
};

const FAQPage = () => {
  const categories = FAQ_CATEGORIES;
  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);

  return (
    <StaticPageLayout
      eyebrow="Помощь"
      title="Частые вопросы"
      subtitle="Всё о билетах, оплате и работе платформы — по разделам, без лишней воды."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { n: `${totalItems}+`, label: "ответов в базе" },
          { n: "24/7", label: "доступ к каталогу" },
          { n: "1 мин", label: "среднее время ответа в чате" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-white/10 bg-[#161616] px-5 py-4 text-center"
          >
            <p className="text-2xl font-display font-black text-white">{s.n}</p>
            <p className="text-xs text-white/45 mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="space-y-8">
        {categories.map((cat, ci) => {
          const Icon = ICONS[cat.id] || LifeBuoy;
          const accent = ACCENTS[cat.id] || ACCENTS.help;
          return (
            <motion.section
              key={cat.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: ci * 0.05 }}
            >
              <div className={cn("rounded-2xl border bg-gradient-to-br p-5 md:p-6 mb-4", accent)}>
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                    <Icon className="h-6 w-6 text-[#a78bfa]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-white">{cat.title}</h2>
                    <p className="text-sm text-white/50 mt-1">{cat.description}</p>
                  </div>
                </div>
              </div>

              <Accordion type="single" collapsible className="space-y-2">
                {cat.items.map((faq, index) => (
                  <AccordionItem
                    key={`${cat.id}-${index}`}
                    value={`${cat.id}-${index}`}
                    className="border-0 rounded-xl border border-white/10 bg-[#161616] overflow-hidden data-[state=open]:border-[#8B5CF6]/30"
                  >
                    <AccordionTrigger className="px-5 py-4 text-left text-[15px] font-medium text-white/90 hover:no-underline hover:bg-white/5">
                      <span className="pr-4">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 pt-0 text-sm text-white/55 leading-relaxed border-t border-white/10">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.section>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-12 relative overflow-hidden rounded-2xl border border-[#8B5CF6]/25 bg-gradient-to-r from-[#8B5CF6]/15 via-[#161616] to-[#0a0a0a] p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6"
      >
        <div className="absolute -right-12 -top-12 h-40 w-40 bg-[#8B5CF6]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex gap-4 items-start">
          <div className="h-11 w-11 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center shrink-0">
            <MessageCircle className="h-5 w-5 text-[#c4b5fd]" />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-white">Не нашли ответ?</h3>
            <p className="text-sm text-white/50 mt-1 max-w-md">
              Напишите в поддержку — обычно отвечаем в рабочие часы в течение дня.
            </p>
          </div>
        </div>
        <Button asChild className="relative h-11 px-8 bg-[#8B5CF6] hover:bg-[#7c3aed] text-white shrink-0">
          <Link to="/contact">
            Связаться с нами
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </motion.div>
    </StaticPageLayout>
  );
};

export default FAQPage;
