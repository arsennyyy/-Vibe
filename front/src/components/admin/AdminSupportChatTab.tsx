import { useCallback, useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { config } from "@/config";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { adminFieldLabel, adminPrimaryBtn, adminShell, adminTextarea } from "@/lib/adminUi";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/StatusIndicator";
import FormattedChatText from "@/components/support/FormattedChatText";
import {
  SUPPORT_STATUS_OPTIONS,
  getSupportStatusUi,
  normalizeSupportStatus,
  supportSenderLabel,
  type SupportThreadStatusKey,
} from "@/lib/supportChatStatus";
import { Headphones, Mail, RefreshCw, Trash2, User } from "lucide-react";
import AdminTabHint from "@/components/admin/AdminTabHint";
import { useConfirm } from "@/contexts/ConfirmContext";

type Thread = {
  id: number;
  status: string;
  userRole: string;
  updatedAt?: string;
  user?: { name: string; email: string; isOrganizer?: boolean };
  lastMessage?: string;
};

type Msg = { id: number; senderRole: string; content: string; createdAt: string };

const AdminSupportChatTab = () => {
  const confirm = useConfirm();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusDraft, setStatusDraft] = useState<SupportThreadStatusKey>("ai");
  const scrollRef = useRef<HTMLDivElement>(null);

  const headers = (): HeadersInit => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  });

  const loadThreads = useCallback(async () => {
    const res = await fetch(`${config.endpoints.admin.supportThreads}`, { headers: headers() });
    if (res.ok) setThreads(await res.json());
  }, []);

  const loadMessages = useCallback(async (id: number) => {
    const res = await fetch(`${config.endpoints.admin.supportThreadMessages(id)}`, { headers: headers() });
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
    setStatusDraft(normalizeSupportStatus(data.status));
    setSelectedThread({
      id: data.id,
      status: data.status,
      userRole: data.userRole,
      user: data.user,
    });
  }, []);

  useEffect(() => {
    void loadThreads();
    const t = setInterval(() => void loadThreads(), 15000);
    return () => clearInterval(t);
  }, [loadThreads]);

  useEffect(() => {
    if (selected) void loadMessages(selected);
  }, [selected, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${config.endpoints.admin.supportThreadReply(selected)}`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ reply: reply.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ответ отправлен пользователю");
      setReply("");
      await loadMessages(selected);
      await loadThreads();
    } catch {
      toast.error("Не удалось отправить");
    } finally {
      setLoading(false);
    }
  };

  const saveStatus = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(config.endpoints.admin.supportThreadStatus(selected), {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ status: statusDraft }),
      });
      if (!res.ok) throw new Error();
      toast.success("Статус обновлён");
      await loadMessages(selected);
      await loadThreads();
    } catch {
      toast.error("Не удалось обновить статус");
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!selected) return;
    const ok = await confirm({
      title: "Удалить сообщение?",
      message: "Удалить это сообщение из чата? Действие нельзя отменить.",
      confirmLabel: "Удалить",
      variant: "danger",
    });
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(config.endpoints.admin.supportMessage(messageId), {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) throw new Error();
      toast.success("Сообщение удалено");
      await loadMessages(selected);
      await loadThreads();
    } catch {
      toast.error("Не удалось удалить");
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = (t: Thread) => {
    if (t.userRole === "organizer" || t.user?.isOrganizer) return "Организатор";
    return "Пользователь";
  };

  return (
    <div className={cn(adminShell, "p-4 md:p-5")}>
      <AdminTabHint title="Чат поддержки">
        Диалоги с ИИ-ассистентом и эскалации на оператора. Отвечайте пользователям, меняйте статус (ожидает → отвечено →
        решено) и удаляйте лишние сообщения при необходимости.
      </AdminTabHint>

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_1fr] min-h-[520px]">
        <div className="flex flex-col rounded-xl border border-white/[0.08] bg-[#0a0a0a]/60 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Диалоги</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/40 hover:text-white"
              onClick={() => void loadThreads()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[480px]">
            {threads.map((t) => {
              const ui = getSupportStatusUi(t.status);
              const active = selected === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-all",
                    active
                      ? "border-[#8B5CF6]/40 bg-[#8B5CF6]/10 shadow-[0_0_20px_rgba(139,92,246,0.08)]"
                      : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-medium text-white/40">{roleLabel(t)}</span>
                    <StatusPill
                      dotClassName={ui.dotClassName}
                      label={ui.label}
                      labelClassName={ui.labelClassName}
                      pillClassName={ui.pillClassName}
                      size="sm"
                    />
                  </div>
                  <p className="text-sm text-white font-medium truncate">{t.user?.name ?? "—"}</p>
                  <p className="text-xs text-white/45 truncate mt-0.5">{t.lastMessage ?? "—"}</p>
                  {t.updatedAt && (
                    <p className="text-[10px] text-white/25 mt-1">
                      {format(parseISO(t.updatedAt), "d MMM, HH:mm", { locale: ru })}
                    </p>
                  )}
                </button>
              );
            })}
            {threads.length === 0 && (
              <p className="text-white/40 text-sm text-center py-10">Обращений пока нет</p>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-white/[0.08] bg-gradient-to-b from-[#0c0c12]/80 to-[#0a0a0a]/60 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          {selected && selectedThread ? (
            <>
              <div className="border-b border-white/[0.06] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-[#c4b5fd]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{selectedThread.user?.name}</p>
                    <p className="text-xs text-white/45 flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      {selectedThread.user?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-end gap-2 flex-wrap">
                  <div>
                    <label className={adminFieldLabel}>Статус обращения</label>
                    <select
                      className="h-9 rounded-lg border border-white/12 bg-[#0a0a0a] px-2.5 text-xs text-white min-w-[140px]"
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value as SupportThreadStatusKey)}
                    >
                      {SUPPORT_STATUS_OPTIONS.map((key) => (
                        <option key={key} value={key}>
                          {getSupportStatusUi(key).label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 border-white/15 text-white hover:bg-white/10"
                    disabled={loading}
                    onClick={() => void saveStatus()}
                  >
                    Сохранить
                  </Button>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[340px]">
                {messages.map((m) => {
                  const isAdmin = m.senderRole === "admin";
                  const isUser = m.senderRole === "user";
                  return (
                    <div
                      key={m.id}
                      className={cn("group flex w-full", isAdmin ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm border",
                          isUser && "bg-white/[0.06] text-white border-white/10 rounded-bl-md",
                          isAdmin &&
                            "bg-gradient-to-br from-emerald-950/50 to-emerald-900/20 text-emerald-50 border-emerald-500/25 shadow-[0_0_24px_rgba(16,185,129,0.08)] rounded-br-md",
                          m.senderRole === "ai" &&
                            "bg-gradient-to-br from-violet-950/30 to-transparent text-white/85 border-violet-500/15 rounded-bl-md"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className="text-[10px] uppercase tracking-wide opacity-50">
                            {supportSenderLabel(m.senderRole)}
                          </span>
                          <span className="text-[10px] text-white/30">
                            {format(parseISO(m.createdAt), "HH:mm", { locale: ru })}
                          </span>
                        </div>
                        <FormattedChatText text={m.content} />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="absolute -top-2 -right-2 h-7 w-7 opacity-0 group-hover:opacity-100 bg-red-500/20 text-red-300 hover:bg-red-500/30 hover:text-red-200 border border-red-500/20"
                          onClick={() => void deleteMessage(m.id)}
                          title="Удалить сообщение"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-white/[0.06] p-4 space-y-2 bg-[#08080e]/50">
                <Textarea
                  className={adminTextarea}
                  placeholder="Ответ пользователю…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  disabled={loading}
                />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[11px] text-white/35 inline-flex items-center gap-1">
                    <Headphones className="h-3 w-3" />
                    Пользователь увидит ответ как «Поддержка»
                  </span>
                  <Button
                    className={adminPrimaryBtn}
                    disabled={loading || !reply.trim()}
                    onClick={() => void sendReply()}
                  >
                    Отправить ответ
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
              <Headphones className="h-10 w-10 text-white/15 mb-3" />
              <p className="text-white/50 text-sm">Выберите диалог слева</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportChatTab;
