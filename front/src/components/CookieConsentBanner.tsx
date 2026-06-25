import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ShieldCheck, BarChart3 } from "lucide-react";
import { config } from "@/config";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "vibe_cookie_consent";
const VISITOR_KEY = "vibe_visitor_id";

type StoredConsent = {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  savedAt: string;
};

function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

async function persistConsent(payload: StoredConsent) {
  const token = localStorage.getItem("token");
  await fetch(config.endpoints.cookies.consent, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      essential: payload.essential,
      analytics: payload.analytics,
      marketing: payload.marketing,
    }),
  }).catch(() => {
    /* офлайн — сохраним только локально */
  });
}

export default function CookieConsentBanner() {
  const { isAuthenticated } = useUser();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const t = window.setTimeout(() => setVisible(true), 800);
      return () => window.clearTimeout(t);
    }
  }, []);

  const save = async (analytics: boolean, marketing: boolean) => {
    const payload: StoredConsent = {
      essential: true,
      analytics,
      marketing,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    await persistConsent(payload);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-4 left-4 right-4 z-[250] flex justify-center pointer-events-none"
        >
          <div
            className={cn(
              "pointer-events-auto w-full max-w-2xl rounded-2xl border border-white/10",
              "bg-[#121218]/95 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.55)]",
              "overflow-hidden"
            )}
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/60 to-transparent" />
            <div className="p-5 md:p-6">
              <div className="flex gap-4 items-start">
                <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8b5cf6]/15 border border-[#8b5cf6]/30">
                  <Cookie className="h-5 w-5 text-[#c4b5fd]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white mb-1">Мы используем cookie</p>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Необходимые файлы нужны для входа и покупки билетов. Аналитические — чтобы улучшать +Vibe.
                    Подробнее в{" "}
                    <Link to="/cookies" className="text-[#c4b5fd] hover:text-white underline-offset-2 hover:underline">
                      политике Cookie
                    </Link>
                    .
                  </p>

                  {expanded ? (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        Необходимые — всегда включены
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <BarChart3 className="h-3.5 w-3.5 text-sky-400" />
                        Аналитика — помогает понять, как пользуются сайтом
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-5 justify-end">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="text-xs text-white/40 hover:text-white/70 px-2 py-2"
                >
                  {expanded ? "Скрыть" : "Подробнее"}
                </button>
                <button
                  type="button"
                  onClick={() => void save(false, false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-white/15 text-white/70 hover:bg-white/5"
                >
                  Только необходимые
                </button>
                <button
                  type="button"
                  onClick={() => void save(true, false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg shadow-violet-900/30"
                >
                  Принять все
                </button>
              </div>
              {isAuthenticated ? (
                <p className="text-[10px] text-white/25 mt-3 text-right">Согласие привязано к вашему аккаунту</p>
              ) : null}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
