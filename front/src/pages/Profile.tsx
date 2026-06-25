import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Settings,
  LogOut,
  Ticket,
  Eye,
  EyeOff,
  Trash2,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Wallet,
  TrendingUp,
  Percent,
  Mail,
  Shield,
  Sparkles,
  Bell,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import ProfileAccountCard from "@/components/profile/ProfileAccountCard";
import {
  profileCard,
  profileMuted,
  profileInput,
  profileSectionTitle,
  profileSidebar,
  profileNavActive,
  profileNavIdle,
} from "@/components/profile/profileUi";
import ProfileAvatarPicker from "@/components/profile/ProfileAvatarPicker";
import { Label } from "@/components/ui/label";
import { useUser } from "@/contexts/UserContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import MyTickets from "@/components/MyTickets";
import { config } from '@/config';
import { cn } from "@/lib/utils";
import { normalizeApiItem } from "@/lib/apiNormalize";
import { getOrganizerStatusUi, resolveOrganizerDisplayStatus } from "@/lib/organizerEventStatus";
import { StatusPill } from "@/components/StatusIndicator";
import { resolveEventImage } from "@/lib/resolveMediaUrl";
import { PriceText } from "@/lib/formatPrice";
import { pluralTickets } from "@/lib/pluralRu";

const NOTIF_KEY = "vibe_notification_prefs";

const Profile = () => {
  const { user, logout, setUser } = useUser();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabFromUrl && ["profile", "tickets", "settings", "organizer", "earnings"].includes(tabFromUrl)
      ? tabFromUrl
      : "profile"
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["profile", "tickets", "settings", "organizer", "earnings"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "profile") {
      searchParams.delete("tab");
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ tab }, { replace: true });
    }
  };
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [notifySite, setNotifySite] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
    if (user?.avatarUrl) setAvatarUrl(user.avatarUrl);
  }, [user?.name, user?.avatarUrl]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(config.endpoints.user.me, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (typeof data.notifyOrderEmail === "boolean") setNotifyEmail(data.notifyOrderEmail);
        if (typeof data.notifyOrganizerEvents === "boolean") setNotifyEvents(data.notifyOrganizerEvents);
        if (typeof data.notifySite === "boolean") setNotifySite(data.notifySite);
        if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        if (data.name) {
          setDisplayName(data.name);
          const stored = localStorage.getItem("user");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setUser({
                ...parsed,
                name: data.name,
                avatarUrl: data.avatarUrl ?? parsed.avatarUrl,
              });
            } catch {
              /* ignore */
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  const saveName = async () => {
    const name = displayName.trim();
    if (!name) {
      toast.error("Укажите имя");
      return;
    }
    if (!user) return;

    setSavingName(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(config.endpoints.user.profile, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Не удалось сохранить имя");

      const savedName = data.name?.trim() || name;
      setDisplayName(savedName);
      setUser({ ...user, name: savedName });
      toast.success("Имя сохранено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить имя");
    } finally {
      setSavingName(false);
    }
  };

  const saveNotifPrefs = async (patch: Partial<{ email: boolean; events: boolean; site: boolean }>) => {
    const next = {
      email: patch.email ?? notifyEmail,
      events: patch.events ?? notifyEvents,
      site: patch.site ?? notifySite,
    };
    setNotifyEmail(next.email);
    setNotifyEvents(next.events);
    setNotifySite(next.site);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch(config.endpoints.user.notificationPrefs, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notifyOrderEmail: next.email,
          notifyOrganizerEvents: next.events,
          notifySite: next.site,
        }),
      });
    } catch {
      toast.error("Не удалось сохранить настройки");
    }
  };

  
  // Состояния для паролей
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  
  // Состояния для видимости паролей (глазики)
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  // Ошибки и успех
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [organizerEvents, setOrganizerEvents] = useState<any[]>([]);
  const [organizerEarnings, setOrganizerEarnings] = useState<any | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);

  useEffect(() => {
    if (!user?.isOrganizer || activeTab !== "organizer") return;
    const loadOrganizerEvents = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(config.endpoints.organizer.events, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const rawList = Array.isArray(data) ? data : [];
          setOrganizerEvents(normalizeApiItem(rawList));
        }
      } catch {
        /* бэкенд недоступен — не ломаем профиль */
      }
    };
    loadOrganizerEvents();
  }, [activeTab, user?.isOrganizer]);

  useEffect(() => {
    if (!user?.isOrganizer || activeTab !== "earnings") return;
    const loadEarnings = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      setEarningsLoading(true);
      try {
        const res = await fetch(config.endpoints.organizer.earnings, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setOrganizerEarnings(await res.json());
      } catch {
        /* ignore */
      } finally {
        setEarningsLoading(false);
      }
    };
    loadEarnings();
  }, [activeTab, user?.isOrganizer]);
  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Вы успешно вышли из системы");
  };

  if (!user) {
    navigate("/signin");
    return null;
  }

  return (
    <Layout>
      {/* Добавили pt-32 md:pt-40 чтобы контент точно начинался ниже хедера */}
      <div className="w-full max-w-[min(100%,90rem)] mx-auto px-4 sm:px-6 lg:px-10 pt-28 md:pt-32 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,300px)_1fr] gap-8 lg:gap-10 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className={profileSidebar}
          >
            <div className="flex flex-col items-center pb-6 border-b border-white/10 mb-6">
              <ProfileAvatarPicker
                name={user.name}
                avatarUrl={avatarUrl}
                onAvatarChange={(url) => {
                  setAvatarUrl(url);
                  if (user) setUser({ ...user, avatarUrl: url });
                }}
              />
              <h2 className="text-xl font-display font-bold text-center mb-1 text-foreground">
                {user.name}
              </h2>
              <div className="flex flex-wrap justify-center gap-1.5 mb-2">
                {user.isAdmin ? (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300">
                    Админ
                  </span>
                ) : null}
                {user.isOrganizer ? (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    Организатор
                  </span>
                ) : null}
              </div>
              <p className={cn("text-xs text-center uppercase tracking-wider", profileMuted)}>
                Участник с {new Date(user.joinedDate).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            
            <nav className="space-y-2">
              {[
                { icon: <User className="h-4 w-4 mr-3" />, label: "Мой профиль", value: "profile" },
                { icon: <Ticket className="h-4 w-4 mr-3" />, label: "Мои билеты", value: "tickets" },
                { icon: <Settings className="h-4 w-4 mr-3" />, label: "Настройки", value: "settings" },
                ...(user.isOrganizer
                  ? [
                      { icon: <Ticket className="h-4 w-4 mr-3" />, label: "Организатор", value: "organizer" },
                      { icon: <Wallet className="h-4 w-4 mr-3" />, label: "Доходы", value: "earnings" },
                    ]
                  : []),
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleTabChange(item.value)}
                  className={cn(
                    "w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    activeTab === item.value ? profileNavActive : profileNavIdle
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              
              <div className="h-px my-4 bg-white/5"></div>
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Выйти
              </button>
            </nav>
          </motion.div>

          {/* --- MAIN CONTENT --- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsContent value="profile" className="mt-0 outline-none">
                <div className={profileCard}>
                  <div className="mb-8 pb-6 border-b border-white/5">
                    <h3 className={profileSectionTitle}>Личная информация</h3>
                    <p className={cn("text-sm", profileMuted)}>
                      Имя, контакты и статус аккаунта
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,340px)_1fr] gap-8">
                    <ProfileAccountCard
                      name={user.name}
                      email={user.email}
                      joinedDate={user.joinedDate}
                      avatarUrl={user.avatarUrl}
                      isAdmin={user.isAdmin}
                      isOrganizer={user.isOrganizer}
                    />

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label className={cn("text-xs uppercase tracking-wider", profileMuted)}>
                          Полное имя
                        </Label>
                        <input
                          id="name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className={profileInput}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className={cn("text-xs uppercase tracking-wider", profileMuted)}>
                          Email
                        </Label>
                        <div className="relative">
                          <Mail
                            className={cn(
                              "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                              profileMuted
                            )}
                          />
                          <input
                            type="email"
                            value={user.email}
                            disabled
                            className={cn(profileInput, "pl-10 opacity-70 cursor-not-allowed")}
                          />
                        </div>
                        <p className={cn("text-xs", profileMuted)}>
                          Email меняется через поддержку — так безопаснее.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      type="button"
                      onClick={saveName}
                      disabled={savingName}
                      className="bg-[#8B5CF6] hover:bg-[#7c3aed] disabled:opacity-60 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
                    >
                      {savingName ? "Сохранение…" : "Сохранить"}
                    </button>
                  </div>
                </div>
              </TabsContent>

              {/* Вкладка: Мои билеты */}
              <TabsContent value="tickets" className="mt-0 outline-none">
                <MyTickets />
              </TabsContent>

              <TabsContent value="settings" className="mt-0 outline-none space-y-6">
                <div className={profileCard}>
                  <div className="mb-6 pb-5 border-b border-border">
                    <h3 className={profileSectionTitle}>Уведомления</h3>
                    <p className={cn("text-sm", profileMuted)}>
                      Сохраняются в аккаунте
                    </p>
                  </div>
                  <div className="space-y-4">
                    {[
                      {
                        key: "email" as const,
                        icon: Mail,
                        title: "Письма о заказах",
                        desc: "Подтверждение покупки — билет в профиле, без PDF",
                        checked: notifyEmail,
                        set: (v: boolean) => saveNotifPrefs({ email: v }),
                        show: true,
                      },
                      {
                        key: "site" as const,
                        icon: Bell,
                        title: "Уведомления на сайте",
                        desc: user.isAdmin
                          ? "Модерация, обращения, покупки — колокольчик в шапке"
                          : "Покупки и статусы заказов в колокольчике",
                        checked: notifySite,
                        set: (v: boolean) => saveNotifPrefs({ site: v }),
                        show: true,
                      },
                      {
                        key: "events" as const,
                        icon: Sparkles,
                        title: "Статусы событий",
                        desc: "Модерация и публикация ваших заявок",
                        checked: notifyEvents,
                        set: (v: boolean) => saveNotifPrefs({ events: v }),
                        show: Boolean(user.isOrganizer),
                      },
                    ]
                      .filter((row) => row.show)
                      .map((row) => (
                      <div
                        key={row.key}
                        className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <row.icon className="h-4 w-4 text-[#a78bfa]" />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {row.title}
                            </p>
                            <p className={cn("text-xs", profileMuted)}>{row.desc}</p>
                          </div>
                        </div>
                        <Switch checked={row.checked} onCheckedChange={row.set} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className={profileCard}>
                  <div className="mb-8 pb-6 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-[#a78bfa]" />
                      <div>
                        <h3 className={profileSectionTitle}>Безопасность</h3>
                        <p className={cn("text-sm", profileMuted)}>Смена пароля аккаунта</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 max-w-lg">
                    
                    {/* Старый пароль */}
                    <div className="space-y-3">
                      <Label htmlFor="old-password" className={cn("text-xs uppercase tracking-wider", profileMuted)}>
                        Старый пароль
                      </Label>
                      <div className="relative">
                        <input
                          id="old-password"
                          type={showOldPassword ? "text" : "password"}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className={cn(profileInput, "pr-12")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                        >
                          {showOldPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Новый пароль */}
                    <div className="space-y-3">
                      <Label htmlFor="new-password" className={cn("text-xs uppercase tracking-wider", profileMuted)}>
                        Новый пароль
                      </Label>
                      <div className="relative">
                        <input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={cn(profileInput, "pr-12")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                        >
                          {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Повторите пароль */}
                    <div className="space-y-3">
                      <Label htmlFor="repeat-password" className={cn("text-xs uppercase tracking-wider", profileMuted)}>
                        Повторите пароль
                      </Label>
                      <div className="relative">
                        <input
                          id="repeat-password"
                          type={showRepeatPassword ? "text" : "password"}
                          value={repeatPassword}
                          onChange={(e) => setRepeatPassword(e.target.value)}
                          className={cn(profileInput, "pr-12")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                        >
                          {showRepeatPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                  </div>

                  {passwordError && (
                    <div className="mt-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="mt-6 bg-[#00e59b]/10 border border-[#00e59b]/20 text-[#00e59b] p-4 rounded-xl text-sm">
                      {passwordSuccess}
                    </div>
                  )}

                  <div className="mt-8 flex justify-start">
                    <button
                      type="button"
                      className="bg-[#8B5CF6] hover:bg-[#7c3aed] text-white font-semibold py-3 px-8 rounded-xl transition-colors"
                      onClick={async () => {
                        setPasswordError(""); setPasswordSuccess("");
                        if (!oldPassword || !newPassword || !repeatPassword) {
                          setPasswordError("Заполните все поля"); return;
                        }
                        if (newPassword !== repeatPassword) {
                          setPasswordError("Пароли не совпадают"); return;
                        }
                        try {
                          const token = localStorage.getItem('token');
                          const res = await fetch(`${config.apiUrl}/api/Auth/change-password`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ OldPassword: oldPassword, NewPassword: newPassword })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setPasswordSuccess("Пароль успешно изменён");
                            setOldPassword(""); setNewPassword(""); setRepeatPassword("");
                          } else {
                            setPasswordError(data.message || "Ошибка смены пароля");
                          }
                        } catch (e) {
                          setPasswordError("Ошибка соединения с сервером");
                        }
                      }}
                    >
                      Сменить пароль
                    </button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="organizer" className="mt-0 outline-none">
                <div className={profileCard}>
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className={profileSectionTitle}>Организатор</h3>
                      <p className={cn(profileMuted, "text-sm")}>Создавай мероприятия и отслеживай статус модерации.</p>
                    </div>
                    <button
                      onClick={() => navigate("/organizer/new-event")}
                      className="bg-[#8B5CF6] hover:bg-[#7c3aed] text-white font-bold py-2.5 px-5 rounded-xl transition-colors shadow-md"
                    >
                      Создать мероприятие
                    </button>
                  </div>

                  {organizerEvents.length === 0 ? (
                    <div className="rounded-xl border border-border bg-muted/40 p-6 text-muted-foreground text-sm">
                      Вы пока не создавали событий.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {organizerEvents.map((evt, index) => {
                        const statusKey = resolveOrganizerDisplayStatus(evt);
                        const statusUi = getOrganizerStatusUi(statusKey);
                        const evtId = evt.id ?? evt.Id;
                        const canDelete = true;
                        const dateStr = evt.date ? new Date(evt.date).toLocaleDateString("ru-RU") : "—";
                        const timeStr = evt.time ? String(evt.time) : "";
                        const locationStr = evt.location ? String(evt.location) : "";
                        const cover = resolveEventImage(evt.image, evtId);

                        return (
                          <motion.div
                            key={evtId}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: index * 0.04 }}
                            className="group relative"
                          >
                            <button
                              type="button"
                              onClick={() => navigate(`/organizer/events/${evtId}/edit`)}
                              className={cn(
                                "w-full text-left rounded-2xl border border-border bg-background/80",
                                "p-4 md:p-5 flex items-center gap-4 md:gap-5",
                                "transition-all duration-300",
                                "hover:border-[#8B5CF6]/30 hover:bg-accent/50 hover:shadow-md",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/30",
                                canDelete && "pr-14 md:pr-16"
                              )}
                            >
                              <div className="relative h-14 w-14 md:h-16 md:w-16 shrink-0 rounded-xl overflow-hidden border border-border bg-muted">
                                <img
                                  src={cover}
                                  alt=""
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="text-base md:text-lg font-display font-semibold text-foreground truncate transition-colors">
                                  {evt.title || "Без названия"}
                                </h4>
                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="h-3 w-3 opacity-60" />
                                    {dateStr}
                                  </span>
                                  {timeStr ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3 opacity-60" />
                                      {timeStr}
                                    </span>
                                  ) : null}
                                  {locationStr ? (
                                    <span className="inline-flex items-center gap-1 max-w-[180px] truncate">
                                      <MapPin className="h-3 w-3 opacity-60 shrink-0" />
                                      {locationStr}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-3 pl-2">
                                <StatusPill
                                  dotClassName={statusUi.dotClassName}
                                  label={statusUi.label}
                                  labelClassName={statusUi.labelClassName}
                                  pillClassName={statusUi.pillClassName}
                                  size="sm"
                                />
                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                              </div>
                            </button>

                            {canDelete ? (
                              <button
                                type="button"
                                title="Удалить"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const isActiveSale =
                                    statusKey === "Published" ||
                                    statusKey === "Approved" ||
                                    statusKey === "PendingReview";
                                  const ok = await confirm({
                                    title: "Удалить мероприятие?",
                                    message: isActiveSale
                                      ? "Если есть активные продажи билетов, удаление будет заблокировано. Для отмены с возвратом обратитесь к администратору."
                                      : "Удалить это событие из списка? Архивные и отменённые мероприятия удаляются без ограничений.",
                                    confirmLabel: "Удалить",
                                    variant: "danger",
                                  });
                                  if (!ok) return;
                                  const token = localStorage.getItem("token");
                                  const del = await fetch(config.endpoints.organizer.deleteEvent(Number(evtId)), {
                                    method: "DELETE",
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  if (!del.ok) {
                                    try {
                                      const body = await del.json();
                                      toast.error(
                                        body.message ||
                                          (del.status === 500
                                            ? "Ошибка сервера при удалении"
                                            : "Не удалось удалить")
                                      );
                                    } catch {
                                      toast.error(
                                        del.status === 500
                                          ? "Ошибка сервера при удалении"
                                          : "Не удалось удалить"
                                      );
                                    }
                                    return;
                                  }
                                  toast.success("Событие удалено");
                                  setOrganizerEvents((prev) =>
                                    prev.filter((e) => Number(e.id ?? e.Id) !== Number(evtId))
                                  );
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted-foreground/70 hover:text-red-500 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="earnings" className="mt-0 outline-none">
                <div className={profileCard}>
                  <div className="mb-8">
                    <h3 className={profileSectionTitle}>Доходы организатора</h3>
                    <p className={cn(profileMuted, "text-sm")}>
                      Комиссия площадки +Vibe — {organizerEarnings?.commissionPercent ?? 12}% (типично 10–15% на рынке билетных агрегаторов).
                      На руки вам остаётся {(100 - (organizerEarnings?.commissionPercent ?? 12))}% от продаж.
                    </p>
                  </div>

                  {earningsLoading ? (
                    <p className={cn(profileMuted, "text-sm")}>Загрузка…</p>
                  ) : organizerEarnings ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <div className="relative overflow-hidden rounded-2xl border p-5 bg-gradient-to-br from-emerald-500/20 to-transparent border-emerald-500/20">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400/80 mb-2">
                                Ваш доход
                              </p>
                              <PriceText
                                amount={Number(organizerEarnings.organizerPayout ?? 0)}
                                decimals={2}
                                className="text-2xl md:text-[1.65rem] font-display font-bold text-white tracking-tight"
                              />
                            </div>
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                              <Wallet className="h-5 w-5" />
                            </div>
                          </div>
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border p-5 bg-gradient-to-br from-sky-500/20 to-transparent border-sky-500/20">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-400/80 mb-2">
                                Продажи билетов
                              </p>
                              <PriceText
                                amount={Number(organizerEarnings.totalGrossSales ?? 0)}
                                decimals={2}
                                className="text-2xl md:text-[1.65rem] font-display font-bold text-white tracking-tight"
                              />
                            </div>
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
                              <TrendingUp className="h-5 w-5" />
                            </div>
                          </div>
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border p-5 bg-gradient-to-br from-[#8B5CF6]/25 to-transparent border-[#8B5CF6]/25">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c4b5fd]/80 mb-2">
                                Комиссия площадки
                              </p>
                              <PriceText
                                amount={Number(organizerEarnings.platformFees ?? 0)}
                                decimals={2}
                                className="text-2xl md:text-[1.65rem] font-display font-bold text-white tracking-tight"
                              />
                            </div>
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#c4b5fd]">
                              <Percent className="h-5 w-5" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {Array.isArray(organizerEarnings.events) && organizerEarnings.events.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs uppercase tracking-widest text-white/40 mb-2">По мероприятиям</p>
                          {organizerEarnings.events.map((ev: any) => (
                            <div
                              key={ev.eventId}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-white truncate">{ev.title}</p>
                                <p className="text-xs text-white/45 mt-1">
                                  {pluralTickets(Number(ev.ticketsSold) || 0)}
                                </p>
                              </div>
                              <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                                <p className="text-sm font-semibold text-emerald-400 tabular-nums whitespace-nowrap">
                                  +<PriceText amount={Number(ev.organizerPayout)} decimals={2} />
                                </p>
                                <p className="flex items-center gap-2 text-xs text-white/45 whitespace-nowrap">
                                  <span>оборот</span>
                                  <PriceText
                                    amount={Number(ev.grossSales)}
                                    decimals={2}
                                    className="text-xs text-white/55"
                                  />
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-white/45 rounded-xl border border-dashed border-white/10 p-6 text-center">
                          Пока нет оплаченных билетов по вашим событиям.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className={cn(profileMuted, "text-sm")}>Не удалось загрузить данные.</p>
                  )}
                </div>
              </TabsContent>

            </Tabs>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;