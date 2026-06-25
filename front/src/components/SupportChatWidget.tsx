import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Headphones, Sparkles, ShieldCheck, Bot } from "lucide-react";
import { toast } from "sonner";
import ButtonCaptcha from "@/components/security/ButtonCaptcha";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useUser } from "@/contexts/UserContext";
import { config } from "@/config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SupportChatIcon from "@/components/support/SupportChatIcon";
import FormattedChatText from "@/components/support/FormattedChatText";
import { getSupportStatusUi } from "@/lib/supportChatStatus";

type ChatMsg = { id?: number; senderRole: string; content: string; createdAt?: string };

const LAST_SEEN_KEY = "vibe_support_last_seen_id";

function getLastSeenId(): number {
  return Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0);
}

function setLastSeenId(id: number) {
  localStorage.setItem(LAST_SEEN_KEY, String(id));
}

function countUnreadAdmin(messages: ChatMsg[]): number {
  const lastSeen = getLastSeenId();
  return messages.filter((m) => m.senderRole === "admin" && (m.id ?? 0) > lastSeen).length;
}

function maxMessageId(messages: ChatMsg[]): number {
  return messages.reduce((max, m) => Math.max(max, m.id ?? 0), 0);
}

const SupportChatWidget = () => {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState("ai");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingProblem, setAwaitingProblem] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [pendingEscalate, setPendingEscalate] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaKey((k) => k + 1);
  };

  const needsCaptcha = messages.length === 0 || pendingEscalate;

  const authHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem("token");
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }, []);

  const applyThread = useCallback((data: Record<string, unknown>, markRead: boolean) => {
    const msgs = (data.messages ?? []) as ChatMsg[];
    setMessages(msgs);
    setStatus(String(data.status ?? "ai"));
    setAwaitingProblem(data.status === "awaiting_admin");

    const unreadCount = countUnreadAdmin(msgs);
    setUnread(unreadCount);
    if (unreadCount > 0 && !markRead) setShowPopup(true);

    if (markRead && msgs.length > 0) {
      setLastSeenId(maxMessageId(msgs));
      setUnread(0);
      setShowPopup(false);
    }
  }, []);

  const loadThread = useCallback(
    async (markRead = false) => {
      if (!user) return;
      const res = await fetch(`${config.apiUrl}/api/support/thread`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      applyThread(data, markRead);
    },
    [user, authHeaders, applyThread]
  );

  useEffect(() => {
    if (!user) return;
    void loadThread(open);
  }, [open, user, loadThread]);

  useEffect(() => {
    if (!user) return;
    const interval = open ? 12000 : 20000;
    const t = setInterval(() => void loadThread(open), interval);
    return () => clearInterval(t);
  }, [user, open, loadThread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const escalateToSupport = useCallback(async () => {
    if (!user || loading) return;
    if (!captchaToken) {
      setPendingEscalate(true);
      toast.error("Пройдите проверку «Я не робот» для связи с поддержкой");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/api/support/escalate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: " ", escalate: true, captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Не удалось связаться с поддержкой");
        resetCaptcha();
        return;
      }
      if (data.aiReply) setMessages((m) => [...m, { senderRole: "ai", content: data.aiReply }]);
      if (data.threadStatus) {
        setStatus(data.threadStatus);
        setAwaitingProblem(data.threadStatus === "awaiting_admin");
      }
      setPendingEscalate(false);
      resetCaptcha();
      await loadThread(true);
    } finally {
      setLoading(false);
    }
  }, [user, loading, captchaToken, authHeaders, loadThread]);

  useEffect(() => {
    if (pendingEscalate && captchaToken && !loading) {
      void escalateToSupport();
    }
  }, [pendingEscalate, captchaToken, loading, escalateToSupport]);

  const send = async () => {
    if (!user || !input.trim() || loading) return;
    const isFirst = messages.length === 0;
    if (isFirst && !captchaToken) {
      toast.error("Пройдите проверку «Я не робот» перед первым сообщением");
      return;
    }
    setLoading(true);
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { senderRole: "user", content: text }]);
    try {
      const res = await fetch(`${config.apiUrl}/api/support/message`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          content: text,
          escalate: false,
          captchaToken: isFirst ? captchaToken : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Не удалось отправить сообщение");
        setMessages((m) => m.slice(0, -1));
        if (isFirst) resetCaptcha();
        return;
      }
      if (data.aiReply) {
        setMessages((m) => [...m, { senderRole: "ai", content: data.aiReply }]);
      }
      if (data.threadStatus) {
        setStatus(data.threadStatus);
        setAwaitingProblem(data.threadStatus === "awaiting_admin");
      }
      if (isFirst) resetCaptcha();
      await loadThread(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = () => {
    setOpen((v) => {
      const next = !v;
      if (next) void loadThread(true);
      return next;
    });
  };

  if (!user) return null;

  const statusUi = getSupportStatusUi(status);

  return (
    <>
      {showPopup && unread > 0 && !open && (
        <button
          type="button"
          onClick={() => toggleOpen()}
          className="fixed bottom-[5.5rem] right-6 z-50 max-w-[220px] animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-emerald-500/30 bg-[#0f1a14]/95 px-4 py-3 text-left shadow-xl shadow-emerald-900/20 backdrop-blur-md"
        >
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold mb-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Поддержка ответила
          </div>
          <p className="text-[11px] text-white/55 leading-snug">Новый ответ в чате — нажмите, чтобы открыть</p>
        </button>
      )}

      <button
        type="button"
        onClick={() => toggleOpen()}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl text-white transition-all duration-300",
          "bg-gradient-to-br from-[#8B5CF6] to-[#6d28d9] shadow-lg shadow-violet-900/40 hover:shadow-violet-700/50 hover:scale-[1.03]",
          open && "rotate-0 rounded-full"
        )}
        aria-label="Чат поддержки"
      >
        <SupportChatIcon open={open} />
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white shadow-md ring-2 ring-[#12121a]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[min(480px,calc(100vh-8rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c12]/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="relative border-b border-white/10 px-4 py-3.5 bg-gradient-to-r from-[#8B5CF6]/10 to-transparent">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#c4b5fd]" />
                  <p className="font-semibold text-white text-sm">Помощь +Vibe</p>
                </div>
                <p className="text-xs text-white/45 mt-0.5">Билеты, возвраты, мероприятия</p>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  statusUi.pillClassName,
                  statusUi.labelClassName
                )}
              >
                {statusUi.label}
              </span>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
            {messages.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
                <Bot className="h-8 w-8 text-[#8B5CF6]/60 mx-auto mb-2" />
                <p className="text-sm text-white/60">Спросите про билеты, QR-код, возврат или схему зала.</p>
              </div>
            )}
            {messages.map((m, i) => {
              const isUser = m.senderRole === "user";
              const isAdmin = m.senderRole === "admin";
              const isAi = m.senderRole === "ai";
              const time = m.createdAt
                ? format(parseISO(m.createdAt), "HH:mm", { locale: ru })
                : null;

              return (
                <div
                  key={m.id ?? i}
                  className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}
                >
                  {!isUser && (
                    <span
                      className={cn(
                        "text-[10px] font-medium uppercase tracking-wide px-1",
                        isAdmin ? "text-emerald-400" : "text-violet-400/80"
                      )}
                    >
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Ответ поддержки
                        </span>
                      ) : (
                        "ИИ-ассистент"
                      )}
                    </span>
                  )}
                  <div
                    className={cn(
                      "max-w-[92%] rounded-2xl px-3.5 py-2.5",
                      isUser && "rounded-br-md bg-gradient-to-br from-[#8B5CF6]/35 to-[#7c3aed]/25 text-white border border-violet-500/20",
                      isAdmin && "rounded-bl-md bg-emerald-950/40 text-emerald-50 border border-emerald-500/25 shadow-[0_0_24px_rgba(16,185,129,0.08)]",
                      isAi && "rounded-bl-md bg-white/[0.04] text-white/85 border border-white/[0.06]"
                    )}
                  >
                    <FormattedChatText text={m.content} />
                    {isAi && status !== "awaiting_admin" && !awaitingProblem && i === messages.length - 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2.5 h-7 text-xs text-violet-300 hover:text-white hover:bg-violet-500/15 px-2 -ml-1"
                        onClick={() => void escalateToSupport()}
                      >
                        <Headphones className="h-3 w-3 mr-1" />
                        Связь с поддержкой
                      </Button>
                    )}
                  </div>
                  {time && (
                    <span className={cn("text-[10px] text-white/30 px-1", isUser && "text-right")}>{time}</span>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-white/40 pl-1">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                </span>
                Печатает…
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-3 bg-[#08080e]/80 space-y-2">
            {needsCaptcha && (
              <ButtonCaptcha
                key={captchaKey}
                embedded
                onVerified={setCaptchaToken}
                onReset={() => setCaptchaToken(null)}
              />
            )}
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#8B5CF6]/40 focus:ring-1 focus:ring-[#8B5CF6]/20 transition-colors"
                placeholder={awaitingProblem ? "Опишите проблему подробнее…" : "Ваш вопрос…"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send()}
                disabled={loading}
              />
              <Button
                type="button"
                size="icon"
                className="shrink-0 h-10 w-10 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] shadow-md shadow-violet-900/30"
                disabled={loading || !input.trim()}
                onClick={() => void send()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChatWidget;
