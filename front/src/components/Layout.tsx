import React from "react";
import { motion } from "framer-motion";
import NavBar from "./NavBar";
import SupportChatWidget from "./SupportChatWidget";
import CookieConsentBanner from "./CookieConsentBanner";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { pageBg, pageBorder, pageMuted, pageText } from "@/lib/siteTheme";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout = ({ children, className }: LayoutProps) => {
  return (
    <div className={cn("flex flex-col min-h-screen", pageBg, pageText)}>
      <NavBar />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.35,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={cn("flex-1 pt-20", className)}
      >
        {children}
      </motion.main>

      <SupportChatWidget />

      <footer className={cn("border-t pt-16 pb-8 mt-auto relative z-10 shrink-0 bg-[#0a0a0a]", pageBorder)}>
        <div className="container px-6 mx-auto">
          <div className="flex flex-col lg:flex-row justify-between gap-12 mb-16">
            <div className="max-w-md">
              <Link
                to="/"
                className="text-3xl font-display font-black text-white inline-block mb-6 hover:text-[#8B5CF6] transition-colors"
              >
                +Vibe
              </Link>
              <p className={cn(pageMuted, "text-sm leading-relaxed mb-6")}>
                Ваш премиальный сервис для покупки билетов <br className="hidden md:block" />
                на лучшие концерты и мероприятия. <br className="hidden md:block" />
                Безопасно, быстро, с гарантией.
              </p>

              <div className={cn("flex items-center text-sm", pageMuted)}>
                <span className="w-2 h-2 rounded-full bg-[#00e59b] mr-3 shadow-[0_0_10px_rgba(0,229,155,0.5)]" />
                Продажи открыты
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-12 sm:gap-24 lg:gap-32">
              <div>
                <h4 className="font-display font-bold text-white text-sm tracking-wider uppercase mb-6">
                  Компания
                </h4>
                <ul className={cn("space-y-4 text-sm", pageMuted)}>
                  <li>
                    <Link to="/about" className="hover:text-[#8B5CF6] transition-colors">
                      О нас
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact" className="hover:text-[#8B5CF6] transition-colors">
                      Контакты
                    </Link>
                  </li>
                  <li>
                    <Link to="/faq" className="hover:text-[#8B5CF6] transition-colors">
                      FAQ
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-display font-bold text-white text-sm tracking-wider uppercase mb-6">
                  Правовая информация
                </h4>
                <ul className={cn("space-y-4 text-sm", pageMuted)}>
                  <li>
                    <Link to="/terms" className="hover:text-[#8B5CF6] transition-colors">
                      Условия использования
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" className="hover:text-[#8B5CF6] transition-colors">
                      Конфиденциальность
                    </Link>
                  </li>
                  <li>
                    <Link to="/cookies" className="hover:text-[#8B5CF6] transition-colors">
                      Политика Cookie
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className={cn("border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-6", pageBorder)}>
            <div className={cn("text-sm", pageMuted)}>
              © {new Date().getFullYear()} +Vibe. Все права защищены.
            </div>

            <div className="flex items-center text-sm font-display font-bold italic text-white/50">
              <div className="w-12 h-px bg-white/10 mr-4" />
              Premium Live Experience
            </div>
          </div>
        </div>
      </footer>
      <CookieConsentBanner />
    </div>
  );
};

export default Layout;
