import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { config } from "@/config";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ExternalLink,
  Users,
  CalendarDays,
  ShoppingBag,
  CreditCard,
  MessageSquare,
  Shield,
  MapPin,
  LayoutDashboard,
  Tags,
  Ban,
  Headphones,
  Cookie,
  RotateCcw,
  Send,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import AdminSupportChatTab from "@/components/admin/AdminSupportChatTab";
import AdminReschedulePanel from "@/components/admin/AdminReschedulePanel";
import AdminCancellationsTab from "@/components/admin/AdminCancellationsTab";
import AdminTicketRefundsTab from "@/components/admin/AdminTicketRefundsTab";
import AdminCookieConsentsTab from "@/components/admin/AdminCookieConsentsTab";
import AdminCatalogFiltersTab from "@/components/admin/AdminCatalogFiltersTab";
import { StatusPill } from "@/components/StatusIndicator";
import { getOrderStatusUi } from "@/lib/orderStatus";
import {
  CONTACT_STATUS_OPTIONS,
  getContactStatusUi,
  normalizeContactStatus,
} from "@/lib/contactMessageStatus";
import { cn } from "@/lib/utils";
import { PriceText, PriceLabel } from "@/lib/formatPrice";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import {
  adminInput,
  adminTextarea,
  adminSelect,
  adminShell,
  adminTableHead,
  adminTableRow,
  adminTableCell,
  adminPrimaryBtn,
  adminGhostBtn,
  adminFieldLabel,
  adminFormStack,
  adminCheckbox,
  adminTableHeaderRow,
  adminTabsList,
  adminTabsTrigger,
} from "@/lib/adminUi";
import AdminFormDialog from "@/components/admin/AdminFormDialog";
import AdminRowActions from "@/components/admin/AdminRowActions";
import AdminOrganizersTab from "@/components/admin/AdminOrganizersTab";
import AdminGaCapacityTab from "@/components/admin/AdminGaCapacityTab";
import AdminVenuesTab from "@/components/admin/AdminVenuesTab";
import AdminTabHint from "@/components/admin/AdminTabHint";
import AdminStatCards from "@/components/admin/AdminStatCards";
import AdminTabBar, { type AdminTabItem } from "@/components/admin/AdminTabBar";
import { getOrganizerEventStatusKey, getOrganizerStatusUi } from "@/lib/organizerEventStatus";
import AdminTablePanel from "@/components/admin/AdminTablePanel";
import AdminPaymentsTable from "@/components/admin/AdminPaymentsTable";

const Admin = () => {
  const { user, setUser, logout, isLoading } = useUser();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("users");
  const [catalogGenres, setCatalogGenres] = useState<string[]>([]);
  const [catalogTypes, setCatalogTypes] = useState<string[]>(["Концерт"]);
  const [statistics, setStatistics] = useState<any>(null);

  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [eventsSegment, setEventsSegment] = useState<"current" | "past">("current");
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [moderationEvents, setModerationEvents] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    const tab = searchParams.get("tab");
    const valid = new Set([
      "users", "events", "orders", "payments", "messages", "support-chat",
      "organizers", "moderation", "cancellations", "ticket-refunds", "venues", "ga-capacity", "filters", "cookies",
    ]);
    if (tab && valid.has(tab)) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user?.isAdmin) {
      navigate("/admin-signin");
      return;
    }
    loadStatistics();
    loadCatalogFilters();
    loadData();
  }, [navigate, user?.isAdmin]);

  useEffect(() => {
    loadData();
    if (activeTab === "support-chat" || activeTab === "moderation" || activeTab === "cancellations" || activeTab === "ticket-refunds") {
      loadStatistics();
    }
  }, [activeTab]);

  const getToken = () => localStorage.getItem("token");

  const loadCatalogFilters = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(config.endpoints.admin.catalogFilters, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data) ? data : [];
        setCatalogGenres(
          rows.filter((r: { kind?: string }) => r.kind === "genre").map((r: { label?: string }) => r.label || "")
        );
        setCatalogTypes(
          rows.filter((r: { kind?: string }) => r.kind === "type").map((r: { label?: string }) => r.label || "")
        );
      }
    } catch {
      /* ignore */
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch(config.endpoints.admin.statistics, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStatistics({
          totalUsers: data.totalUsers ?? data.TotalUsers,
          totalEvents: data.totalEvents ?? data.TotalEvents,
          totalOrders: data.totalOrders ?? data.TotalOrders,
          paidOrders: data.paidOrders ?? data.PaidOrders,
          totalPayments: data.totalPayments ?? data.TotalPayments,
          completedPayments: data.completedPayments ?? data.CompletedPayments,
          platformRevenue: data.platformRevenue ?? data.PlatformRevenue,
          totalRevenue: data.totalRevenue ?? data.TotalRevenue,
          totalGrossSales: data.totalGrossSales ?? data.TotalGrossSales,
          commissionPercent: data.commissionPercent ?? data.CommissionPercent,
          pendingModerationEvents: data.pendingModerationEvents ?? data.PendingModerationEvents,
          pendingMessages: data.pendingMessages ?? data.PendingMessages,
          pendingSupportThreads: data.pendingSupportThreads ?? data.PendingSupportThreads,
          pendingRescheduleRequests: data.pendingRescheduleRequests ?? data.PendingRescheduleRequests,
          pendingCancellationRequests:
            data.pendingCancellationRequests ?? data.PendingCancellationRequests,
          pendingTicketRefundRequests:
            data.pendingTicketRefundRequests ?? data.PendingTicketRefundRequests,
          urgentTicketRefundRequests:
            data.urgentTicketRefundRequests ?? data.UrgentTicketRefundRequests,
          pendingReviews: data.pendingReviews ?? data.PendingReviews,
          totalOrganizers: data.totalOrganizers ?? data.TotalOrganizers,
          totalVenues: data.totalVenues ?? data.TotalVenues,
          totalCatalogFilters: data.totalCatalogFilters ?? data.TotalCatalogFilters,
        });
      }
    } catch (error) {
      console.error("Error loading statistics:", error);
    }
  };

  const loadData = async () => {
    const token = getToken();
    if (!token) return;

    try {
      let endpoint = "";
      switch (activeTab) {
        case "users":
          endpoint = config.endpoints.admin.users;
          break;
        case "events":
          endpoint = config.endpoints.admin.events;
          break;
        case "orders":
          endpoint = config.endpoints.admin.orders;
          break;
        case "payments":
          endpoint = config.endpoints.admin.payments;
          break;
        case "messages":
          endpoint = config.endpoints.admin.contactMessages;
          break;
        case "moderation":
          endpoint = config.endpoints.admin.moderationEvents;
          break;
        case "venues":
          endpoint = config.endpoints.admin.venues;
          break;
        case "organizers":
        case "filters":
        case "support-chat":
          return;
      }

      if (!endpoint) return;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Нормализуем данные - конвертируем заглавные буквы в строчные
        const normalizeData = (items: any[]) => {
          return items.map((item: any) => {
            const normalized: any = {};
            for (const key in item) {
              // Конвертируем первую букву в строчную
              const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
              normalized[normalizedKey] = item[key];
            }
            return normalized;
          });
        };
        
        switch (activeTab) {
          case "users":
            setUsers(Array.isArray(data) ? normalizeData(data) : []);
            break;
          case "events":
            setEvents(Array.isArray(data) ? normalizeData(data) : []);
            break;
          case "orders":
            setOrders(Array.isArray(data) ? normalizeData(data) : []);
            break;
          case "payments":
            setPayments(Array.isArray(data) ? normalizeData(data) : []);
            break;
          case "messages":
            setContactMessages(Array.isArray(data) ? normalizeData(data) : []);
            break;
          case "moderation":
            setModerationEvents(Array.isArray(data) ? normalizeData(data) : []);
            break;
          case "venues":
            setVenues(Array.isArray(data) ? normalizeData(data) : []);
            break;
        }
      } else if (response.status === 403) {
        toast.error("Доступ запрещен");
        logout();
        navigate("/signin");
      } else {
        const errorText = await response.text();
        console.error(`Error loading ${activeTab}:`, response.status, errorText);
        toast.error(`Ошибка загрузки данных: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error loading ${activeTab}:`, error);
      toast.error("Ошибка загрузки данных");
    }
  };

  const handleDelete = async (id: number, type: string) => {
    const ok = await confirm({
      title: "Удалить элемент?",
      message: "Вы уверены, что хотите удалить этот элемент? Это действие нельзя отменить.",
      confirmLabel: "Удалить",
      variant: "danger",
    });
    if (!ok) return;

    const token = getToken();
    let endpoint = "";
    switch (type) {
      case "users":
        endpoint = `${config.endpoints.admin.users}/${id}`;
        break;
      case "events":
        endpoint = `${config.endpoints.admin.events}/${id}`;
        break;
      case "orders":
        endpoint = `${config.endpoints.admin.orders}/${id}`;
        break;
      case "messages":
        endpoint = `${config.endpoints.admin.contactMessages}/${id}`;
        break;
    }

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Элемент удален");
        loadData();
        loadStatistics();
      } else {
        toast.error("Ошибка удаления");
      }
    } catch (error) {
      toast.error("Ошибка удаления");
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setDialogMode("edit");
    setFormData({
      ...item,
      allowTicketTransfer: Boolean(item.allowTicketTransfer ?? item.AllowTicketTransfer),
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    if (activeTab === "events") {
      navigate("/organizer/new-event?admin=1");
      return;
    }
    setEditingItem(null);
    setDialogMode("create");
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const token = getToken();
    if (!token) return;

    try {
      let endpoint = "";
      let method = "POST";
      let body: Record<string, unknown> = { ...formData };

      switch (activeTab) {
        case "users":
          endpoint = dialogMode === "create"
            ? config.endpoints.admin.users
            : `${config.endpoints.admin.users}/${editingItem.id}`;
          method = dialogMode === "create" ? "POST" : "PUT";
          break;
        case "events": {
          endpoint = dialogMode === "create"
            ? config.endpoints.admin.events
            : `${config.endpoints.admin.events}/${editingItem.id ?? editingItem.Id}`;
          method = dialogMode === "create" ? "POST" : "PUT";
          const eventId = editingItem?.id ?? editingItem?.Id;
          body = {
            id: eventId,
            title: formData.title,
            image: formData.image,
            date: formData.date,
            time: formData.time,
            location: formData.location,
            address: formData.address,
            price: formData.price,
            category: formData.category,
            genre: formData.genre ?? "",
            description: formData.description,
            eventType: formData.eventType || editingItem?.eventType || "Концерт",
            lineup: formData.lineup ?? editingItem?.lineup ?? "[]",
            isFeatured: Boolean(formData.isFeatured),
            allowTicketTransfer: Boolean(formData.allowTicketTransfer),
            status: editingItem?.status ?? editingItem?.Status ?? 4,
          };
          break;
        }
        case "orders":
          endpoint = `${config.endpoints.admin.orders}/${editingItem.id}`;
          method = "PUT";
          break;
        case "messages":
          endpoint = `${config.endpoints.admin.contactMessages}/${editingItem.id}`;
          method = "PUT";
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(dialogMode === "create" ? "Элемент создан" : "Элемент обновлен");
        setIsDialogOpen(false);
        loadData();
        loadStatistics();
      } else {
        const error = await response.json();
        toast.error(error.message || "Ошибка сохранения");
      }
    } catch (error) {
      toast.error("Ошибка сохранения");
    }
  };

  const handleModeration = async (eventId: number, action: "approve" | "reject") => {
    const token = getToken();
    const endpoint = action === "approve"
      ? config.endpoints.admin.approveEvent(eventId)
      : config.endpoints.admin.rejectEvent(eventId);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: action === "reject" ? JSON.stringify({ comment: "Требуется доработка" }) : undefined,
    });
    if (response.ok) {
      toast.success(action === "approve" ? "Событие одобрено" : "Событие отклонено");
      loadData();
      loadStatistics();
    } else {
      toast.error("Ошибка модерации");
    }
  };

  const renderUsersTable = () => (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-white/[0.06]">
          <TableHead className={adminTableHead}>ID</TableHead>
          <TableHead className={adminTableHead}>Имя</TableHead>
          <TableHead className={adminTableHead}>Email</TableHead>
          <TableHead className={adminTableHead}>Админ</TableHead>
          <TableHead className={adminTableHead}>Подтверждён</TableHead>
          <TableHead className={adminTableHead}>Регистрация</TableHead>
          <TableHead className={adminTableHead}>Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id || user.Id} className={adminTableRow}>
            <TableCell className={cn(adminTableCell, "text-white/40 font-mono text-xs")}>{user.id || user.Id}</TableCell>
            <TableCell className={cn(adminTableCell, "font-medium text-white")}>{user.name || user.Name}</TableCell>
            <TableCell className={cn(adminTableCell, "text-white/60")}>{user.email || user.Email}</TableCell>
            <TableCell className={adminTableCell}>
              {(user.isAdmin || user.IsAdmin) ? (
                <StatusPill
                  dotClassName="bg-[#8B5CF6] shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                  label="Админ"
                  labelClassName="text-[#c4b5fd]"
                  pillClassName="border-[#8B5CF6]/30 bg-[#8B5CF6]/10"
                />
              ) : (
                <span className="text-xs text-white/30">Пользователь</span>
              )}
            </TableCell>
            <TableCell className={adminTableCell}>
              {(user.emailVerified || user.EmailVerified) ? (
                <StatusPill
                  dotClassName="bg-emerald-400"
                  label="Да"
                  labelClassName="text-emerald-300"
                  pillClassName="border-emerald-500/25 bg-emerald-500/10"
                />
              ) : (
                <StatusPill
                  dotClassName="bg-white/25"
                  label="Нет"
                  labelClassName="text-white/40"
                  pillClassName="border-white/10 bg-white/[0.03]"
                />
              )}
            </TableCell>
            <TableCell className={cn(adminTableCell, "text-white/45 text-xs")}>
              {(user.createdAt || user.CreatedAt) ? new Date(user.createdAt || user.CreatedAt).toLocaleDateString('ru-RU') : '-'}
            </TableCell>
            <TableCell className={adminTableCell}>
              <AdminRowActions
                onEdit={() => handleEdit(user)}
                onDelete={() => handleDelete(user.id || user.Id, "users")}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const getEventStatusKey = (event: { status?: unknown; Status?: unknown }) => {
    const raw = event.status ?? event.Status;
    if (typeof raw === "number") {
      const map = ["Draft", "PendingReview", "Approved", "Rejected", "Published", "Passed", "Cancelled"];
      return map[raw] ?? String(raw);
    }
    const s = String(raw ?? "");
    const aliases: Record<string, string> = {
      draft: "Draft",
      pendingreview: "PendingReview",
      approved: "Approved",
      rejected: "Rejected",
      published: "Published",
      passed: "Passed",
      cancelled: "Cancelled",
    };
    return aliases[s.toLowerCase()] ?? s;
  };

  const isEventCancelled = (event: { status?: unknown; Status?: unknown }) =>
    getEventStatusKey(event) === "Cancelled";

  const isEventPast = (event: { date?: string; status?: unknown; Status?: unknown }) => {
    if (getEventStatusKey(event) === "Passed") return true;
    if (isEventCancelled(event)) return true;
    if (!event.date) return false;
    const d = new Date(event.date);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return end.getTime() < Date.now();
  };

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const past = isEventPast(e);
      return eventsSegment === "past" ? past : !past;
    });
  }, [events, eventsSegment]);

  const renderEventsTable = () => (
    <Table>
      <TableHeader>
        <TableRow className={adminTableHeaderRow}>
          <TableHead className={adminTableHead}>ID</TableHead>
          <TableHead className={adminTableHead}>Название</TableHead>
          <TableHead className={adminTableHead}>Дата</TableHead>
          <TableHead className={adminTableHead}>Место</TableHead>
          <TableHead className={adminTableHead}>Цена</TableHead>
          <TableHead className={adminTableHead}>Главное</TableHead>
          <TableHead className={adminTableHead}>Статус</TableHead>
          <TableHead className={cn(adminTableHead, "text-right")}>Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredEvents.map((event) => (
          <TableRow key={event.id} className={adminTableRow}>
            <TableCell className={cn(adminTableCell, "font-mono text-xs text-white/40")}>{event.id}</TableCell>
            <TableCell className={cn(adminTableCell, "max-w-xs truncate font-medium")}>{event.title}</TableCell>
            <TableCell className={adminTableCell}>
              {event.date ? new Date(event.date).toLocaleDateString("ru-RU") : "—"}
            </TableCell>
            <TableCell className={cn(adminTableCell, "max-w-xs truncate text-white/55")}>{event.location}</TableCell>
            <TableCell className={adminTableCell}>
              <PriceLabel text={String(event.price ?? "")} />
            </TableCell>
            <TableCell className={adminTableCell}>
              <Badge
                variant={event.isFeatured ? "default" : "secondary"}
                className={event.isFeatured ? "bg-[#8B5CF6]/20 text-[#c4b5fd] border-[#8B5CF6]/30" : "bg-white/5 text-white/45 border-white/10"}
              >
                {event.isFeatured ? "Да" : "Нет"}
              </Badge>
            </TableCell>
            <TableCell className={adminTableCell}>
              {(() => {
                const ui = getOrganizerStatusUi(getOrganizerEventStatusKey(event));
                return (
                  <StatusPill
                    dotClassName={ui.dotClassName}
                    label={ui.label}
                    labelClassName={ui.labelClassName}
                    pillClassName={ui.pillClassName}
                    size="sm"
                  />
                );
              })()}
            </TableCell>
            <TableCell className={adminTableCell}>
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-xl border-white/15 bg-white/5 text-white/70 hover:text-white text-xs font-medium px-3"
                  asChild
                >
                  <Link to={`/organizer/events/${event.id}/edit?admin=1`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Конструктор
                  </Link>
                </Button>
                <AdminRowActions
                  onEdit={() => handleEdit(event)}
                  onDelete={() => handleDelete(event.id, "events")}
                />
                {isEventCancelled(event) ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300/90">
                    <Ban className="h-3.5 w-3.5" />
                    Возвраты выполнены
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl border-rose-500/35 bg-rose-500/5 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 text-xs font-medium px-3"
                    onClick={() => void handleCancelEventRefundAll(event.id, event.title)}
                  >
                    <Ban className="h-3.5 w-3.5 mr-1.5" />
                    Отменить + возврат
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderOrdersTable = () => (
    <Table>
      <TableHeader>
        <TableRow className={adminTableHeaderRow}>
          <TableHead className={adminTableHead}>ID</TableHead>
          <TableHead className={adminTableHead}>Номер заказа</TableHead>
          <TableHead className={adminTableHead}>Событие</TableHead>
          <TableHead className={adminTableHead}>Место</TableHead>
          <TableHead className={adminTableHead}>Пользователь</TableHead>
          <TableHead className={adminTableHead}>Сумма</TableHead>
          <TableHead className={adminTableHead}>Статус</TableHead>
          <TableHead className={adminTableHead}>Дата создания</TableHead>
          <TableHead className={adminTableHead}>Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id || order.Id} className={adminTableRow}>
            <TableCell className={cn(adminTableCell, "font-mono text-xs text-white/40")}>{order.id || order.Id}</TableCell>
            <TableCell className={cn(adminTableCell, "font-mono text-xs text-white/55")}>
              {order.orderNumber || order.OrderNumber}
            </TableCell>
            <TableCell className={cn(adminTableCell, "max-w-[160px] truncate font-medium")}>
              {order.eventTitle || order.EventTitle || "—"}
            </TableCell>
            <TableCell className={adminTableCell}>{order.seatLabel || order.SeatLabel || "—"}</TableCell>
            <TableCell className={cn(adminTableCell, "text-white/55")}>
              {(order.user?.name || order.user?.Name) || (order.user?.email || order.user?.Email)}
            </TableCell>
            <TableCell className={cn(adminTableCell, "font-semibold tabular-nums")}>
              <PriceText amount={Number(order.totalAmount ?? order.TotalAmount ?? 0)} decimals={2} />
            </TableCell>
            <TableCell className={adminTableCell}>
              {(() => {
                const ui = getOrderStatusUi(order.status ?? order.Status);
                return (
                  <StatusPill
                    dotClassName={ui.dotClassName}
                    label={ui.label}
                    labelClassName={ui.labelClassName}
                    pillClassName={ui.pillClassName}
                  />
                );
              })()}
            </TableCell>
            <TableCell className={cn(adminTableCell, "text-white/45 text-xs")}>
              {(order.createdAt || order.CreatedAt)
                ? new Date(order.createdAt || order.CreatedAt).toLocaleDateString("ru-RU")
                : "—"}
            </TableCell>
            <TableCell className={adminTableCell}>
              <AdminRowActions
                onEdit={() => handleEdit(order)}
                onDelete={() => handleDelete(order.id || order.Id, "orders")}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderMessagesTable = () => (
    <Table>
      <TableHeader>
        <TableRow className={adminTableHeaderRow}>
          <TableHead className={adminTableHead}>ID</TableHead>
          <TableHead className={adminTableHead}>Имя</TableHead>
          <TableHead className={adminTableHead}>Email</TableHead>
          <TableHead className={adminTableHead}>Сообщение</TableHead>
          <TableHead className={adminTableHead}>Статус</TableHead>
          <TableHead className={adminTableHead}>Дата</TableHead>
          <TableHead className={adminTableHead}>Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contactMessages.map((message) => (
          <TableRow key={message.id || message.Id} className={adminTableRow}>
            <TableCell className={cn(adminTableCell, "font-mono text-xs text-white/40")}>{message.id || message.Id}</TableCell>
            <TableCell className={cn(adminTableCell, "font-medium")}>{message.name || message.Name}</TableCell>
            <TableCell className={cn(adminTableCell, "text-white/55")}>{message.email || message.Email}</TableCell>
            <TableCell className={cn(adminTableCell, "max-w-xs truncate text-white/55")}>
              {message.message || message.Message}
            </TableCell>
            <TableCell className={adminTableCell}>
              {(() => {
                const ui = getContactStatusUi(message.status ?? message.Status);
                return (
                  <StatusPill
                    dotClassName={ui.dotClassName}
                    label={ui.label}
                    labelClassName={ui.labelClassName}
                    pillClassName={ui.pillClassName}
                  />
                );
              })()}
            </TableCell>
            <TableCell className={cn(adminTableCell, "text-white/45 text-xs")}>
              {(message.createdAt || message.CreatedAt)
                ? new Date(message.createdAt || message.CreatedAt).toLocaleDateString("ru-RU")
                : "—"}
            </TableCell>
            <TableCell className={adminTableCell}>
              <AdminRowActions
                onEdit={() => handleEdit(message)}
                onDelete={() => handleDelete(message.id || message.Id, "messages")}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderModerationTable = () => (
    <Table>
      <TableHeader>
        <TableRow className={adminTableHeaderRow}>
          <TableHead className={adminTableHead}>ID</TableHead>
          <TableHead className={adminTableHead}>Событие</TableHead>
          <TableHead className={adminTableHead}>Организатор</TableHead>
          <TableHead className={adminTableHead}>Дата отправки</TableHead>
          <TableHead className={adminTableHead}>Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {moderationEvents.map((item) => (
          <TableRow key={item.id} className={adminTableRow}>
            <TableCell className={cn(adminTableCell, "font-mono text-xs text-white/40")}>{item.id}</TableCell>
            <TableCell className={adminTableCell}>
              <Link
                to={`/organizer/events/${item.id}/edit?moderation=1`}
                className="text-[#a78bfa] hover:text-white font-medium transition-colors"
              >
                {item.title}
              </Link>
            </TableCell>
            <TableCell className={cn(adminTableCell, "text-white/55")}>{item.organizer?.email || "—"}</TableCell>
            <TableCell className={cn(adminTableCell, "text-white/45 text-xs")}>
              {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString("ru-RU") : "—"}
            </TableCell>
            <TableCell className={adminTableCell}>
              <Button size="sm" variant="outline" className="border-white/15 text-white hover:bg-white/10" asChild>
                <Link to={`/organizer/events/${item.id}/edit?moderation=1`}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Открыть
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const dialogTitle = (() => {
    if (activeTab === "users") return dialogMode === "create" ? "Создать пользователя" : "Редактировать пользователя";
    if (activeTab === "events") return dialogMode === "create" ? "Создать событие" : "Редактировать событие";
    if (activeTab === "orders") return "Редактировать заказ";
    if (activeTab === "messages") return "Сообщение с сайта";
    return "Редактирование";
  })();

  const renderDialogBody = () => {
    if (activeTab === "users") {
      return (
          <div className={adminFormStack}>
            <div>
              <label className={adminFieldLabel}>Имя</label>
              <Input
                className={adminInput}
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className={adminFieldLabel}>Email</label>
              <Input
                className={adminInput}
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            {dialogMode === "create" && (
              <div>
                <label className={adminFieldLabel}>Пароль</label>
                <Input
                  className={adminInput}
                  type="password"
                  value={formData.password || ""}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <input
                type="checkbox"
                className={adminCheckbox}
                checked={formData.isAdmin || false}
                onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
              />
              <span className="text-sm font-medium text-white">Администратор</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <input
                type="checkbox"
                className={adminCheckbox}
                checked={formData.emailVerified || false}
                onChange={(e) => setFormData({ ...formData, emailVerified: e.target.checked })}
              />
              <span className="text-sm font-medium text-white">Email подтверждён</span>
            </label>
          </div>
      );
    }

    if (activeTab === "events") {
      return (
          <div className={adminFormStack}>
            <div>
              <label className={adminFieldLabel}>Название</label>
              <Input
                className={adminInput}
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className={adminFieldLabel}>Изображение (URL)</label>
              <Input
                className={adminInput}
                value={formData.image || ""}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              />
            </div>
            <div>
              <label className={adminFieldLabel}>Дата</label>
              <Input
                className={cn(adminInput, "[color-scheme:dark]")}
                type="datetime-local"
                value={formData.date ? new Date(formData.date).toISOString().slice(0, 16) : ""}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className={adminFieldLabel}>Время</label>
              <Input
                className={adminInput}
                value={formData.time || ""}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
            <div>
              <label className={adminFieldLabel}>Место</label>
              <Input
                className={adminInput}
                value={formData.location || ""}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <label className={adminFieldLabel}>Адрес</label>
              <Input
                className={adminInput}
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <label className={adminFieldLabel}>Цена</label>
              <Input
                className={adminInput}
                value={formData.price || ""}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div>
              <label className={adminFieldLabel}>Тип (фильтр каталога)</label>
              <select
                className={adminSelect}
                value={formData.category || catalogTypes[0] || "Концерт"}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {catalogTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={adminFieldLabel}>Жанр (фильтр каталога)</label>
              <select
                className={adminSelect}
                value={formData.genre || ""}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              >
                <option value="">— не указан —</option>
                {catalogGenres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={adminFieldLabel}>Описание</label>
              <textarea
                className={adminTextarea}
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <Send className="h-5 w-5 shrink-0 mt-0.5 text-sky-300" />
                  <label htmlFor="allowTicketTransfer" className="text-sm cursor-pointer min-w-0">
                    <span className="font-semibold text-white block">Передача билетов</span>
                    <span className="text-white/50 text-xs mt-1 block leading-relaxed">
                      Покупатели смогут передать билет другу по email по номинальной цене. У получателя 10 минут на оплату.
                    </span>
                  </label>
                </div>
                <Switch
                  id="allowTicketTransfer"
                  checked={Boolean(formData.allowTicketTransfer)}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowTicketTransfer: checked })}
                  className="data-[state=checked]:bg-sky-500 shrink-0 mt-1"
                />
              </div>
            </div>
            <div className="rounded-xl border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="isFeatured"
                  className={cn(adminCheckbox, "mt-1")}
                  checked={formData.isFeatured || false}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                />
                <label htmlFor="isFeatured" className="text-sm cursor-pointer">
                  <span className="font-semibold text-white block">Главное на каталоге</span>
                  <span className="text-white/50 text-xs mt-1 block">
                    Большой блок «Главное» на странице «Концерты». Обычно одно событие с этой галочкой.
                  </span>
                </label>
              </div>
            </div>
          </div>
      );
    }

    if (activeTab === "orders") {
      return (
          <div className={adminFormStack}>
            <div>
              <label className={adminFieldLabel}>Статус</label>
              <select
                className={adminSelect}
                value={formData.status || ""}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="pending">Ожидает оплаты</option>
                <option value="paid">Оплачен</option>
                <option value="cancelled">Отменен</option>
                <option value="refunded">Возвращен</option>
              </select>
            </div>
          </div>
      );
    }

    if (activeTab === "messages") {
      const currentStatus = normalizeContactStatus(formData.status);
      return (
          <div className={adminFormStack}>
            {(editingItem?.name || editingItem?.Name) ? (
              <p className="text-sm text-white/45 -mt-1">
                {(editingItem.name || editingItem.Name)} · {editingItem.email || editingItem.Email}
              </p>
            ) : null}
            {(editingItem?.message || editingItem?.Message) ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-white/35 mb-2">Сообщение пользователя</p>
                <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
                  {editingItem.message || editingItem.Message}
                </p>
              </div>
            ) : null}
            <div>
              <label className={adminFieldLabel}>Статус</label>
              <div className="flex flex-wrap gap-2">
                {CONTACT_STATUS_OPTIONS.map((key) => {
                  const ui = getContactStatusUi(key);
                  const selected = currentStatus === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: key })}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        selected
                          ? cn(ui.pillClassName, "ring-1 ring-white/20")
                          : "border-white/10 bg-transparent text-white/40 hover:border-white/20 hover:text-white/60"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", ui.dotClassName)} />
                      {ui.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={adminFieldLabel}>Ответ пользователю</label>
              <p className="text-xs text-white/35 mb-2">
                При сохранении ответ уйдёт на email отправителя (оформленное письмо).
              </p>
              <textarea
                className={adminTextarea}
                placeholder="Напишите ответ службы поддержки…"
                value={formData.response || ""}
                onChange={(e) => setFormData({ ...formData, response: e.target.value })}
                rows={5}
              />
            </div>
          </div>
      );
    }

    return null;
  };

  const token = localStorage.getItem("token");
  if (!token || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/50 text-sm">
        Перенаправление…
      </div>
    );
  }

  const handleCancelEventRefundAll = async (eventId: number, title?: string) => {
    const ok = await confirm({
      title: "Отменить мероприятие?",
      message: `Отменить «${title ?? "мероприятие"}» и вернуть деньги всем покупателям? Схема зала будет очищена.`,
      confirmLabel: "Отменить и вернуть",
      variant: "warning",
    });
    if (!ok) return;
    try {
      const res = await fetch(config.endpoints.admin.cancelEventRefundAll(eventId), {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Мероприятие отменено администратором." }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Возвращено заказов: ${data.ordersRefunded ?? 0}`);
      loadData();
      loadStatistics();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка отмены");
    }
  };

  const adminTabs: AdminTabItem[] = [
    { value: "users", label: "Пользователи", icon: Users, badge: statistics?.totalUsers },
    { value: "events", label: "События", icon: CalendarDays, badge: statistics?.totalEvents },
    { value: "orders", label: "Заказы", icon: ShoppingBag, badge: statistics?.totalOrders },
    { value: "payments", label: "Платежи", icon: CreditCard, badge: statistics?.totalPayments },
    { value: "messages", label: "Сообщения", icon: MessageSquare, badge: statistics?.pendingMessages },
    { value: "support-chat", label: "Чат поддержки", icon: Headphones, badge: statistics?.pendingSupportThreads },
    { value: "organizers", label: "Организаторы", icon: Users, badge: statistics?.totalOrganizers },
    {
      value: "moderation",
      label: "Модерация",
      icon: Shield,
      badge:
        (statistics?.pendingModerationEvents ?? 0) + (statistics?.pendingRescheduleRequests ?? 0) || undefined,
    },
    {
      value: "cancellations",
      label: "Отмена события",
      icon: Ban,
      badge: statistics?.pendingCancellationRequests || undefined,
    },
    {
      value: "ticket-refunds",
      label: "Возврат билетов",
      icon: RotateCcw,
      badge: statistics?.pendingTicketRefundRequests || undefined,
    },
    { value: "venues", label: "Площадки", icon: MapPin, badge: statistics?.totalVenues },
    { value: "ga-capacity", label: "Танцпол", icon: MapPin },
    { value: "filters", label: "Фильтры", icon: Tags, badge: statistics?.totalCatalogFilters },
    { value: "cookies", label: "Cookie", icon: Cookie },
  ];

  return (
    <Layout>
      <div className="w-full max-w-[min(100%,1680px)] mx-auto px-3 sm:px-5 lg:px-6 pt-20 md:pt-24 pb-12">
        <div className={cn(adminShell, "p-5 md:p-7 lg:p-8")}>
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#8B5CF6]/8 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#c4b5fd] mb-3">
                <LayoutDashboard className="h-3 w-3" />
                Admin
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
                Панель администратора
              </h1>
              <p className="text-white/50 mt-2 text-sm max-w-lg">
                Пользователи, модерация, платежи и площадки — всё в одном месте.
              </p>
            </div>
          </div>

          {statistics ? <AdminStatCards statistics={statistics} /> : null}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
            <AdminTabBar tabs={adminTabs} activeTab={activeTab} onChange={setActiveTab} />
            {(activeTab === "users" || activeTab === "events") && (
              <Button onClick={handleCreate} className={cn(adminPrimaryBtn, "shrink-0 self-start sm:self-center")}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить
              </Button>
            )}
          </div>

          <TabsContent value="users" className="mt-0 outline-none">
            <AdminTablePanel empty={users.length === 0}>
              {renderUsersTable()}
            </AdminTablePanel>
          </TabsContent>

          <TabsContent value="events" className="mt-0 outline-none space-y-4">
            <Tabs value={eventsSegment} onValueChange={(v) => setEventsSegment(v as "current" | "past")}>
              <TabsList className={adminTabsList}>
                <TabsTrigger value="current" className={adminTabsTrigger}>
                  Актуальные ({events.filter((e) => !isEventPast(e)).length})
                </TabsTrigger>
                <TabsTrigger value="past" className={adminTabsTrigger}>
                  Прошедшие ({events.filter(isEventPast).length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <AdminTablePanel empty={filteredEvents.length === 0}>{renderEventsTable()}</AdminTablePanel>
          </TabsContent>

          <TabsContent value="orders" className="mt-0 outline-none">
            <AdminTablePanel empty={orders.length === 0}>{renderOrdersTable()}</AdminTablePanel>
          </TabsContent>

          <TabsContent value="payments" className="mt-0 outline-none">
            <AdminPaymentsTable
              payments={payments}
              commissionPercent={statistics?.commissionPercent ?? 12}
            />
          </TabsContent>

          <TabsContent value="support-chat" className="mt-0 outline-none">
            <AdminSupportChatTab />
          </TabsContent>

          <TabsContent value="messages" className="mt-0 outline-none">
            <AdminTablePanel
              empty={contactMessages.length === 0}
              hint={
                <AdminTabHint title="Зачем нужны сообщения">
                  Все обращения с формы «Контакты» сохраняются здесь. Меняйте статус (новое → в работе → решено) и
                  фиксируйте ответ поддержки — так команда видит очередь обращений без потери писем в почте.
                </AdminTabHint>
              }
            >
              {renderMessagesTable()}
            </AdminTablePanel>
          </TabsContent>

          <TabsContent value="organizers" className="mt-0 outline-none">
            <AdminOrganizersTab getToken={getToken} />
          </TabsContent>

          <TabsContent value="moderation" className="mt-0 outline-none space-y-0">
            <AdminReschedulePanel />
            <AdminTablePanel
              empty={moderationEvents.length === 0}
              emptyLabel="Нет событий на модерации"
            >
              {renderModerationTable()}
            </AdminTablePanel>
          </TabsContent>

          <TabsContent value="cancellations" className="mt-0 outline-none">
            <AdminCancellationsTab onChanged={loadStatistics} />
          </TabsContent>

          <TabsContent value="ticket-refunds" className="mt-0 outline-none">
            <AdminTicketRefundsTab
              onChanged={loadStatistics}
              urgentCount={statistics?.urgentTicketRefundRequests ?? 0}
            />
          </TabsContent>

          <TabsContent value="venues" className="mt-0 outline-none">
            <AdminVenuesTab venues={venues} getToken={getToken} onReload={loadData} />
          </TabsContent>

          <TabsContent value="ga-capacity" className="mt-0 outline-none">
            <AdminGaCapacityTab getToken={getToken} />
          </TabsContent>

          <TabsContent value="filters" className="mt-0 outline-none">
            <AdminCatalogFiltersTab getToken={getToken} onChanged={loadCatalogFilters} />
          </TabsContent>

          <TabsContent value="cookies" className="mt-0 outline-none">
            <AdminCookieConsentsTab />
          </TabsContent>

        </Tabs>

        <AdminFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={dialogTitle}
          onSave={handleSave}
        >
          {renderDialogBody()}
        </AdminFormDialog>
        </div>
      </div>
    </Layout>
  );
};

export default Admin;

