import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { config } from "@/config";
import { toast } from "sonner";
import { Calendar, CalendarClock, Clock, MapPin, Info, ImageIcon, ArrowLeft, Check, X, Ban, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import SeatMap from "@/components/SeatMap";
import HallLayoutConstructor from "@/components/organizer/HallLayoutConstructor";
import VenueMapPreview from "@/components/VenueMapPreview";
import AddressSuggestInput from "@/components/AddressSuggestInput";
import {
  filterMinskAddressSuggestions,
  filterMinskVenueNameSuggestions,
  resolveVenueAddress,
} from "@/content/minskVenues";
import { getOrganizerEventStatusKey, getOrganizerStatusUi, resolveOrganizerDisplayStatus } from "@/lib/organizerEventStatus";
import { resolveMediaUrl, DEFAULT_EVENT_IMAGE, toStorageMediaPath } from "@/lib/resolveMediaUrl";
import { isValidDateOnly, isValidTime, sanitizeTimeInput } from "@/lib/formValidation";
import { cn } from "@/lib/utils";
import CoverCropDialog from "@/components/organizer/CoverCropDialog";
import { formatEventCoverRecommendation } from "@/lib/cropImage";
import ArtistLineupEditor from "@/components/organizer/ArtistLineupEditor";
import EventCatalogCardPreview from "@/components/organizer/EventCatalogCardPreview";
import OrganizerCancelEventDialog from "@/components/organizer/OrganizerCancelEventDialog";
import AdminAssignOrganizerDialog from "@/components/organizer/AdminAssignOrganizerDialog";
import { parseLineup, serializeLineup, type LineupArtist } from "@/lib/lineupTypes";
import { BelarusRuble } from "@/lib/formatPrice";
const COVER_MAX_BYTES = 5 * 1024 * 1024;
const COVER_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";

const sectionCard = "bg-[#161616] rounded-2xl border border-white/[0.08] p-6 md:p-8 space-y-5";
const sectionTitle = "text-lg font-display font-bold text-white tracking-tight";
const fieldLabel = "text-[11px] font-medium uppercase tracking-widest text-white/45 mb-2 block";
const fieldInput =
  "h-11 bg-[#0a0a0a] border-white/[0.12] text-white placeholder:text-white/25 focus-visible:border-white/25 focus-visible:ring-white/10 rounded-xl [color-scheme:dark]";
const fieldSelectTrigger = cn(
  fieldInput,
  "w-full border border-white/[0.12] focus:ring-white/10 focus:ring-1 focus:ring-offset-0"
);
const selectContentClass =
  "bg-[#0a0a0a] border-white/10 text-white z-[200]";
const fieldHint = "text-xs text-white/30 mt-1.5";

const OrganizerEventBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isModerationPreview = searchParams.get("moderation") === "1";
  const isAdminMode = searchParams.get("admin") === "1";
  const readOnlyModeration = isModerationPreview;
  const isEditMode = Boolean(id);
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("details");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventId, setEventId] = useState<number | null>(null);
  const [statusKey, setStatusKey] = useState("Draft");
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverDraftUrl, setCoverDraftUrl] = useState<string | null>(null);
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null);
  const [lineupArtists, setLineupArtists] = useState<LineupArtist[]>([]);
  const [form, setForm] = useState({
    title: "",
    image: "",
    dateOnly: "",
    time: "",
    location: "",
    address: "",
    price: "",
    category: "",
    genre: "",
    description: "",
  });
  const [reviewComment, setReviewComment] = useState<string | null>(null);
  const [scheduledPublishAt, setScheduledPublishAt] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishAtLocal, setPublishAtLocal] = useState("");
  const [unpublishAtLocal, setUnpublishAtLocal] = useState("");
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [reschedulePending, setReschedulePending] = useState(false);
  const [createdByAdmin, setCreatedByAdmin] = useState(false);
  const [adminOrganizerAccess, setAdminOrganizerAccess] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [cancellationPending, setCancellationPending] = useState(false);
  const [allowTicketTransfer, setAllowTicketTransfer] = useState(false);

  const readOnly = readOnlyModeration || (!isAdminMode && adminOrganizerAccess === "viewonly");
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [moderationBusy, setModerationBusy] = useState(false);
  const [venueAddressMap, setVenueAddressMap] = useState<Record<string, string>>({});
  const [venueId, setVenueId] = useState<number | null>(null);
  const [hallId, setHallId] = useState<number | null>(null);
  const [hallLayoutId, setHallLayoutId] = useState<number | null>(null);
  const [hallThemeJson, setHallThemeJson] = useState<string | null>(null);
  const [seatMapKey, setSeatMapKey] = useState(0);
  const [catalogGenres, setCatalogGenres] = useState<string[]>([]);
  const [catalogTypes, setCatalogTypes] = useState<string[]>(["Концерт"]);

  const handleLocationChange = (location: string) => {
    const addr = resolveVenueAddress(location, venueAddressMap);
    setForm((prev) => ({
      ...prev,
      location,
      ...(addr ? { address: addr } : {}),
    }));
  };
  const coverPreviewUrl = coverDraftUrl || (form.image ? resolveMediaUrl(form.image) : null);

  useEffect(() => {
    return () => {
      if (coverDraftUrl) URL.revokeObjectURL(coverDraftUrl);
    };
  }, [coverDraftUrl]);

  useEffect(() => {
    if (!user) {
      navigate("/signin");
      return;
    }
    if (!user.isOrganizer && !(user.isAdmin && (isModerationPreview || isAdminMode))) {
      navigate("/profile");
      return;
    }
    if (isModerationPreview && !user.isAdmin) {
      navigate("/admin");
    }
  }, [user, navigate, isModerationPreview]);

  useEffect(() => {
    const loadCatalogFilters = async () => {
      try {
        const res = await fetch(config.endpoints.catalogFilters);
        if (!res.ok) return;
        const data = await res.json();
        const genres = Array.isArray(data.genres) ? data.genres : [];
        const types = Array.isArray(data.types) ? data.types : [];
        if (genres.length) setCatalogGenres(genres);
        if (types.length) setCatalogTypes(types);
      } catch {
        /* каталог фильтров опционален */
      }
    };
    loadCatalogFilters();
  }, []);

  useEffect(() => {
    if (!user?.isOrganizer) return;
    const loadVenues = async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(config.endpoints.organizer.venues, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const list = await res.json();
      const map: Record<string, string> = {};
      for (const v of list || []) {
        const name = String(v.name ?? v.Name ?? "").trim();
        const addr = String(v.address ?? v.Address ?? "").trim();
        if (name && addr) map[name] = addr;
      }
      setVenueAddressMap(map);
    };
    loadVenues();
  }, [user?.isOrganizer]);

  useEffect(() => {
    if (!isEditMode || !id || !user) return;
    if (!user.isOrganizer && !(user.isAdmin && (isModerationPreview || isAdminMode))) return;

    const loadEvent = async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(config.endpoints.organizer.event(Number(id)), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        toast.error("Событие не найдено");
        navigate(isModerationPreview ? "/admin" : "/profile");
        return;
      }
      const target = await response.json();
      setEventId(target.id ?? target.Id);
      const forceDraft = Boolean((location.state as { forceDraftStatus?: boolean })?.forceDraftStatus);
      setStatusKey(forceDraft ? "Draft" : getOrganizerEventStatusKey(target));
      setReviewComment(target.reviewComment ?? target.ReviewComment ?? null);
      const sched = target.scheduledPublishAt ?? target.ScheduledPublishAt;
      setScheduledPublishAt(sched ? String(sched) : null);
      const parsedLineup = parseLineup(target.lineup ?? target.Lineup);
      const d = target.date ? new Date(target.date) : null;
      const valid = d && !Number.isNaN(d.getTime());
      setForm({
        title: target.title || "",
        image: target.image || "",
        dateOnly: valid ? d!.toISOString().slice(0, 10) : "",
        time: target.time ? String(target.time).slice(0, 5) : "",
        location: target.location || "",
        address: target.address || "",
        price: target.price || "",
        category: target.category || "",
        genre: target.genre ?? target.Genre ?? "",
        description: target.description || "",
      });
      setVenueId(target.venueId ?? target.VenueId ?? null);
      setHallId(target.hallId ?? target.HallId ?? null);
      setHallLayoutId(target.hallLayoutId ?? target.HallLayoutId ?? null);
      setHallThemeJson(target.hallThemeJson ?? target.HallThemeJson ?? null);
      setLineupArtists(parsedLineup.length ? parsedLineup : []);
      setCreatedByAdmin(Boolean(target.createdByAdmin ?? target.CreatedByAdmin));
      setAdminOrganizerAccess(target.adminOrganizerAccess ?? target.AdminOrganizerAccess ?? null);
      setAllowTicketTransfer(Boolean(target.allowTicketTransfer ?? target.AllowTicketTransfer));

      const rr = await fetch(config.endpoints.organizer.rescheduleRequest(Number(id)), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rr.ok) {
        const rrData = await rr.json();
        setReschedulePending(rrData.status === "pending");
      }

      const cr = await fetch(config.endpoints.organizer.cancellationRequest(Number(id)), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cr.ok) {
        const crData = await cr.json();
        setCancellationPending(crData.status === "pending");
      }
    };
    loadEvent();
  }, [id, isEditMode, navigate, user, isModerationPreview, isAdminMode, location.state]);

  const previewDate = useMemo(() => {
    if (!form.dateOnly) return "Дата";
    const [y, m, day] = form.dateOnly.split("-").map(Number);
    if (!y || !m || !day) return "Дата";
    return new Date(y, m - 1, day).toLocaleDateString("ru-RU");
  }, [form.dateOnly]);

  const applyCroppedCover = (blob: Blob) => {
    const file = new File([blob], "cover.jpg", { type: "image/jpeg" });
    setCoverFile(file);
    setCoverDraftUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const openCoverCrop = (file: File) => {
    if (file.size > COVER_MAX_BYTES) {
      toast.error("Файл больше 5 МБ — выберите другой");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Поддерживаются JPG, PNG, WEBP и GIF");
      return;
    }
    setCoverCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    openCoverCrop(f);
  };

  const handleReframeCover = () => {
    if (coverDraftUrl) {
      setCoverCropSrc(coverDraftUrl);
      return;
    }
    if (form.image) {
      setCoverCropSrc(resolveMediaUrl(form.image));
      return;
    }
    coverFileInputRef.current?.click();
  };

  const closeCoverCrop = () => {
    setCoverCropSrc((prev) => {
      if (prev && prev !== coverDraftUrl && prev !== resolveMediaUrl(form.image)) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  };

  const buildEventDateIso = () => {
    const timePart = form.time.trim().slice(0, 5);
    if (form.dateOnly && isValidTime(timePart)) {
      return new Date(`${form.dateOnly}T${timePart}:00`).toISOString();
    }
    if (form.dateOnly) {
      return new Date(`${form.dateOnly}T19:00:00`).toISOString();
    }
    return new Date().toISOString();
  };

  const validateForm = (strict: boolean): string | null => {
    if (!form.title.trim()) return "Укажите название мероприятия";
    if (!form.dateOnly) return "Выберите дату";
    if (!isValidDateOnly(form.dateOnly)) return "Некорректная дата";
    if (!form.time.trim()) return "Укажите время начала";
    if (!isValidTime(form.time)) return "Время: формат ЧЧ:ММ (например 19:30)";
    if (!form.location.trim()) return "Укажите название площадки";
    if (!form.address.trim()) return "Укажите адрес или ссылку Яндекс.Карт";
    if (!coverPreviewUrl && !coverFile) return "Загрузите обложку мероприятия";
    if (strict) {
      if (!form.description.trim()) return "Добавьте описание";
      if (!form.category.trim()) return "Укажите категорию";
      if (!form.genre.trim()) return "Выберите жанр концерта";
    }
    return null;
  };

  const payloadFromForm = (imageUrl: string) => {
    const lineupJson = serializeLineup(
      lineupArtists.filter((a) => a.name.trim()).length
        ? lineupArtists
        : [{ name: "Уточняется" }]
    );
    const priceFallback = "от 50";

    return {
      title: form.title.trim(),
      image: imageUrl,
      date: buildEventDateIso(),
      time: form.time.trim().slice(0, 5),
      location: form.location.trim(),
      address: form.address.trim(),
      price: form.price.trim() || priceFallback,
      category: form.category.trim() || "Концерт",
      genre: form.genre.trim() || null,
      description: form.description.trim() || "—",
      eventType: "Концерт",
      lineup: lineupJson,
      allowTicketTransfer,
      ticketTypes: [
        { name: "Стандарт", price: 50, available: true },
        { name: "VIP", price: 100, available: true },
      ],
    };
  };

  const uploadCoverIfNeeded = async (): Promise<string | null> => {
    if (!coverFile) return null;
    const token = localStorage.getItem("token");
    const fd = new FormData();
    fd.append("file", coverFile);
    const response = await fetch(config.endpoints.organizer.uploadCover, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      toast.error((err as { message?: string }).message || "Не удалось загрузить обложку");
      return null;
    }
    const data = await response.json();
    return (data.path as string) || toStorageMediaPath(data.url as string) || null;
  };

  const saveDraft = async () => {
    const err = validateForm(false);
    if (err) {
      toast.error(err);
      return null;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const actualId = eventId || (id ? Number(id) : null);

      let imageUrl = form.image ? toStorageMediaPath(form.image) : "";
      if (coverFile) {
        const uploaded = await uploadCoverIfNeeded();
        if (!uploaded) return null;
        imageUrl = uploaded;
      } else if (!imageUrl) {
        imageUrl = DEFAULT_EVENT_IMAGE;
      }

      const method = actualId ? "PUT" : "POST";
      const endpoint = actualId ? `${config.endpoints.organizer.events}/${actualId}` : config.endpoints.organizer.events;
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...payloadFromForm(imageUrl), ...(actualId ? { id: actualId } : {}) }),
      });

      if (!response.ok) {
        let detail = "Не удалось сохранить черновик";
        try {
          const errBody = await response.json();
          if (typeof errBody?.message === "string") detail = errBody.message;
        } catch {
          /* ignore */
        }
        toast.error(`${detail} (${response.status})`);
        return null;
      }

      const saved = await response.json();
      const savedId = saved.id ?? saved.Id;
      setEventId(savedId);
      setStatusKey(getOrganizerEventStatusKey(saved));
      setReviewComment(saved.reviewComment ?? saved.ReviewComment ?? null);
      if (method === "POST" && savedId != null) {
        navigate(`/organizer/events/${savedId}/edit${isAdminMode ? "?admin=1" : ""}`, {
          replace: true,
          state: { forceDraftStatus: true },
        });
      }
      setForm((p) => ({ ...p, image: imageUrl }));
      setCoverFile(null);
      setCoverDraftUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      toast.success("Черновик сохранен");
      return savedId as number;
    } finally {
      setIsSaving(false);
    }
  };

  const submitForModeration = async () => {
    const err = validateForm(true);
    if (err) {
      toast.error(err);
      return;
    }

    setIsSubmitting(true);
    try {
      let submitId = eventId;
      if (!submitId) submitId = await saveDraft();
      if (!submitId) return;

      const token = localStorage.getItem("token");
      const response = await fetch(config.endpoints.organizer.submit(submitId), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(
          typeof data.message === "string"
            ? data.message
            : "Не удалось отправить на модерацию"
        );
        return;
      }

      const data = await response.json().catch(() => ({}));
      setStatusKey(getOrganizerEventStatusKey({ status: data.status ?? "PendingReview" }));
      toast.success("Событие отправлено на модерацию");
      navigate("/profile?tab=organizer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModeration = async (action: "approve" | "reject") => {
    if (!eventId) return;
    if (action === "reject" && !rejectComment.trim()) {
      toast.error("Укажите причину отклонения");
      return;
    }
    setModerationBusy(true);
    try {
      const token = localStorage.getItem("token");
      const endpoint =
        action === "approve"
          ? config.endpoints.admin.approveEvent(eventId)
          : config.endpoints.admin.rejectEvent(eventId);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: action === "reject" ? JSON.stringify({ comment: rejectComment.trim() }) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Ошибка модерации");
        return;
      }
      toast.success(action === "approve" ? "Одобрено" : "Отклонено");
      setRejectOpen(false);
      navigate("/admin");
    } finally {
      setModerationBusy(false);
    }
  };

  const handleSchedulePublish = async () => {
    if (!eventId || !publishAtLocal || !unpublishAtLocal) {
      toast.error("Укажите дату публикации и дату снятия с витрины");
      return;
    }
    const publishDate = new Date(publishAtLocal);
    const unpublishDate = new Date(unpublishAtLocal);
    if (unpublishDate <= publishDate) {
      toast.error("Дата снятия должна быть позже даты публикации");
      return;
    }
    const token = localStorage.getItem("token");
    const res = await fetch(config.endpoints.organizer.schedulePublish(eventId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        scheduledPublishAt: publishDate.toISOString(),
        scheduledUnpublishAt: unpublishDate.toISOString(),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || "Не удалось запланировать");
      return;
    }
    const data = await res.json();
    setStatusKey(getOrganizerEventStatusKey({ status: data.status ?? data.Status }));
    setPublishOpen(false);
    toast.success(data.message || "Готово");
    navigate(isAdminMode ? "/admin?tab=events" : "/profile");
  };

  const openPublishDialog = () => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    const u = new Date(d);
    u.setDate(u.getDate() + 30);
    setPublishAtLocal(d.toISOString().slice(0, 16));
    setUnpublishAtLocal(u.toISOString().slice(0, 16));
    setPublishOpen(true);
  };

  if (!user || (!user.isOrganizer && !(user.isAdmin && (isModerationPreview || isAdminMode)))) {
    return null;
  }

  const canEdit =
    !readOnly &&
    statusKey !== "PendingReview" &&
    statusKey !== "Cancelled" &&
    (user.isOrganizer || isAdminMode);
  const canEditDateTime =
    canEdit && !["Published", "Approved", "Passed"].includes(statusKey);
  const showReschedule =
    !readOnly && user.isOrganizer && !isAdminMode && (statusKey === "Published" || statusKey === "Approved");
  const showPublish =
    !readOnly && statusKey === "Approved" && user.isOrganizer && !isAdminMode;
  const showAdminPublish =
    isAdminMode &&
    canEdit &&
    !["Published", "Cancelled", "PendingReview"].includes(statusKey);
  const showCancel =
    !readOnly &&
    user.isOrganizer &&
    !isAdminMode &&
    (statusKey === "Published" || statusKey === "Approved") &&
    !cancellationPending;
  const displayStatusKey = resolveOrganizerDisplayStatus(
    { status: statusKey, createdByAdmin },
    { cancellationPending }
  );
  const statusUi = getOrganizerStatusUi(displayStatusKey);

  const submitRescheduleRequest = async () => {
    if (!eventId || !rescheduleDate || !rescheduleTime || !rescheduleReason.trim()) {
      toast.error("Заполните новую дату, время и причину");
      return;
    }
    setRescheduleBusy(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(config.endpoints.organizer.requestReschedule(eventId), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          proposedDate: rescheduleDate,
          proposedTime: rescheduleTime,
          reason: rescheduleReason.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; detail?: string };
      if (!res.ok) {
        const parts = [data.message, data.detail].filter((s) => s && s.trim());
        throw new Error(parts.length ? parts.join(" — ") : "Не удалось отправить запрос");
      }
      toast.success(data.message ?? "Запрос отправлен");
      setReschedulePending(true);
      setRescheduleOpen(false);
      setRescheduleReason("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setRescheduleBusy(false);
    }
  };

  const heroTitle = form.title.trim() || "Название мероприятия";
  const heroCategory = form.category.trim() || "Категория";
  const heroGenre = form.genre.trim();
  const heroTime = form.time.trim() || "Время";
  const heroLocation = form.location.trim() || "Площадка";

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] pb-24">
        {statusKey === "Rejected" && reviewComment && !isModerationPreview ? (
          <div className="w-full max-w-[min(100%,92rem)] mx-auto px-4 sm:px-6 lg:px-8 pt-5">
            <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-950/40 via-[#161616] to-[#0a0a0a] p-5 md:p-6 shadow-[0_8px_32px_rgba(239,68,68,0.08)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative flex gap-4 items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/15">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-red-400/80 mb-1">Модерация</p>
                  <p className="text-base font-semibold text-red-200 mb-2">Заявка отклонена</p>
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3 mb-3">
                    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1.5">Комментарий администратора</p>
                    <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{reviewComment}</p>
                  </div>
                  <p className="text-xs text-white/40">
                    Исправьте замечания, сохраните черновик и нажмите «Отправить на модерацию» снова.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Hero / preview — как на странице мероприятия */}
        <div className="relative h-[calc(100dvh-5rem)] min-h-[480px] w-full overflow-hidden mb-10 border-b border-white/[0.06]">
          {coverPreviewUrl ? (
            <>
              <img src={coverPreviewUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-black/25 z-10" />
              <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/75 to-transparent z-10 pointer-events-none" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[#0c0c0c] flex flex-col items-center justify-center gap-3">
              <ImageIcon className="h-10 w-10 text-white/10" />
              <span className="text-4xl md:text-6xl font-display font-black text-white/[0.08] tracking-tight select-none">
                Обложка
              </span>
              <p className="text-sm text-white/25">Загрузите файл во вкладке «Детали»</p>
            </div>
          )}

          <div className="absolute bottom-10 md:bottom-14 left-0 right-0 z-20">
            <div className="container mx-auto px-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex px-3 py-1 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#e9d5ff] text-xs font-semibold backdrop-blur-md uppercase tracking-wider">
                  {heroCategory}
                </span>
                {heroGenre ? (
                  <span className="inline-flex px-3 py-1 rounded-full bg-black/40 border border-white/15 text-white/70 text-[10px] font-medium backdrop-blur-md uppercase tracking-widest">
                    {heroGenre}
                  </span>
                ) : null}
              </div>
              <h1
                className={cn(
                  "text-4xl md:text-6xl font-display font-black mb-5 leading-[1.05] tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]",
                  form.title.trim() ? "text-white" : "text-white/35"
                )}
              >
                {heroTitle}
              </h1>
              <div className="flex flex-wrap gap-3 text-sm font-medium">
                {[
                  { icon: Calendar, text: previewDate },
                  { icon: Clock, text: heroTime },
                  { icon: MapPin, text: heroLocation },
                ].map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-center bg-black/35 px-4 py-2.5 rounded-xl border border-white/10 text-white/90 backdrop-blur-md"
                  >
                    <Icon className="h-4 w-4 mr-2 text-[#c4b5fd]" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-[min(100%,92rem)] mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              "grid grid-cols-1 gap-8 xl:gap-12 items-start",
              "xl:grid-cols-[minmax(0,1fr)_min(520px,40vw)]"
            )}
          >
            <div>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-[#161616] border border-white/[0.08] p-1 rounded-xl mb-6 inline-flex h-auto w-full sm:w-auto">
                  {[
                    { v: "details", l: "Детали" },
                    { v: "venue", l: "Место проведения" },
                    { v: "hall", l: "Схема зала" },
                    { v: "tickets", l: "Карточка и билеты" },
                  ].map(({ v, l }) => (
                    <TabsTrigger
                      key={v}
                      value={v}
                      className="rounded-lg px-5 py-2.5 text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/45 flex-1 sm:flex-none"
                    >
                      {l}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="details" className="space-y-5 mt-0">
                  <div className={sectionCard}>
                    <h2 className={sectionTitle}>О мероприятии</h2>

                    <div>
                      <label className={fieldLabel}>Название</label>
                      <Input
                        className={fieldInput}
                        placeholder="Например: Концерт группы …"
                        value={form.title}
                        disabled={!canEdit}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className={fieldLabel}>Обложка</label>
                      <p className={fieldHint}>
                        Рекомендуем{" "}
                        <span className="text-white/55">{formatEventCoverRecommendation()}</span> — кадр как на странице
                        мероприятия (на весь экран под меню). JPG/PNG/WebP до 8 МБ.
                      </p>
                      <input
                        ref={coverFileInputRef}
                        type="file"
                        accept={COVER_ACCEPT}
                        className="hidden"
                        onChange={handleCoverChange}
                        disabled={!canEdit}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/15 bg-transparent text-white hover:bg-white/10"
                          disabled={!canEdit}
                          onClick={() => coverFileInputRef.current?.click()}
                        >
                          {coverPreviewUrl ? "Заменить файл" : "Выбрать файл"}
                        </Button>
                        {coverPreviewUrl && canEdit ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-[#a78bfa] hover:text-white hover:bg-[#8B5CF6]/10"
                            onClick={handleReframeCover}
                          >
                            Подогнать кадр
                          </Button>
                        ) : null}
                      </div>
                      {coverFile ? (
                        <p className="text-xs text-white/40 mt-2 truncate">{coverFile.name}</p>
                      ) : null}
                      <p className={fieldHint}>
                        JPG, PNG, WEBP · до 5 МБ · после выбора можно сдвинуть и масштабировать кадр
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={fieldLabel}>Дата</label>
                        <Input
                          type="date"
                          className={fieldInput}
                          value={form.dateOnly}
                          onChange={(e) => setForm({ ...form, dateOnly: e.target.value })}
                          disabled={!canEditDateTime}
                        />
                        <p className={fieldHint}>
                          {canEditDateTime ? "Формат: ДД.ММ.ГГГГ" : "Для опубликованных — через «Запросить перенос»"}
                        </p>
                      </div>
                      <div>
                        <label className={fieldLabel}>Время начала</label>
                        <Input
                          type="time"
                          step={60}
                          className={fieldInput}
                          placeholder="19:30"
                          value={form.time}
                          onChange={(e) => setForm({ ...form, time: sanitizeTimeInput(e.target.value) })}
                          disabled={!canEditDateTime}
                          onBlur={() => {
                            if (form.time && !isValidTime(form.time)) {
                              toast.error("Время: только ЧЧ:ММ (00:00 – 23:59)");
                            }
                          }}
                        />
                        <p className={fieldHint}>Формат: ЧЧ:ММ</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={fieldLabel}>Тип мероприятия</label>
                        <Select
                          value={form.category || catalogTypes[0] || "Концерт"}
                          disabled={!canEdit}
                          onValueChange={(v) => setForm({ ...form, category: v })}
                        >
                          <SelectTrigger className={fieldSelectTrigger}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={selectContentClass}>
                            {catalogTypes.map((t) => (
                              <SelectItem key={t} value={t} className="focus:bg-white/10 focus:text-white">
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className={fieldHint}>Отображается в каталоге и на карточке</p>
                      </div>
                      <div>
                        <label className={fieldLabel}>Жанр</label>
                        <Select
                          value={form.genre || "__none__"}
                          disabled={!canEdit}
                          onValueChange={(v) =>
                            setForm({ ...form, genre: v === "__none__" ? "" : v })
                          }
                        >
                          <SelectTrigger className={fieldSelectTrigger}>
                            <SelectValue placeholder="— выберите жанр —" />
                          </SelectTrigger>
                          <SelectContent className={selectContentClass}>
                            <SelectItem value="__none__" className="focus:bg-white/10 focus:text-white">
                              — выберите жанр —
                            </SelectItem>
                            {catalogGenres.map((g) => (
                              <SelectItem key={g} value={g} className="focus:bg-white/10 focus:text-white">
                                {g}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className={fieldHint}>Фильтр «жанры» на странице концертов</p>
                      </div>
                    </div>

                    <div>
                      <label className={fieldLabel}>Описание</label>
                      <textarea
                        className={cn(
                          "w-full min-h-[120px] rounded-xl bg-[#0a0a0a] border border-white/[0.12] text-white placeholder:text-white/25 p-3 text-sm",
                          "focus:outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10"
                        )}
                        placeholder="Расскажите о мероприятии: программа, особенности, возрастные ограничения…"
                        value={form.description}
                        disabled={!canEdit}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={sectionCard}>
                    <h3 className={sectionTitle}>Состав</h3>
                    <ArtistLineupEditor
                      artists={lineupArtists}
                      onChange={setLineupArtists}
                      disabled={!canEdit}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="venue" className="mt-0">
                  <div className={sectionCard}>
                    <h3 className={sectionTitle}>Место проведения</h3>

                    <div>
                      <label className={fieldLabel}>Название площадки</label>
                      <AddressSuggestInput
                        className={fieldInput}
                        placeholder="Дворец спорта, Prime Hall…"
                        value={form.location}
                        disabled={!canEdit}
                        suggestions={filterMinskVenueNameSuggestions}
                        onChange={handleLocationChange}
                      />
                    </div>

                    <div>
                      <label className={fieldLabel}>Адрес или ссылка Яндекс.Карт</label>
                      <AddressSuggestInput
                        className={fieldInput}
                        placeholder="г. Минск, пр-т Победителей… или ссылка Яндекс.Карт"
                        value={form.address}
                        disabled={!canEdit}
                        suggestions={filterMinskAddressSuggestions}
                        onChange={(v) => setForm({ ...form, address: v })}
                      />
                      <p className={fieldHint}>Подсказки по улицам Минска. Из ссылки ll=… карта покажет точку сразу.</p>
                    </div>

                    <div>
                      <label className={fieldLabel}>Предпросмотр на карте</label>
                      <VenueMapPreview venueName={form.location} address={form.address} className="h-80 md:h-[420px]" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="hall" className="mt-0">
                  <HallLayoutConstructor
                    eventId={eventId ?? (id ? Number(id) : null)}
                    canEdit={canEdit}
                    venueId={venueId}
                    hallId={hallId}
                    layoutId={hallLayoutId}
                    hallThemeJson={hallThemeJson}
                    onEnsureEventId={saveDraft}
                    onSaved={(payload) => {
                      setHallLayoutId(payload.hallLayoutId);
                      setHallThemeJson(payload.hallThemeJson);
                      setSeatMapKey((k) => k + 1);
                    }}
                  />
                </TabsContent>

                <TabsContent value="tickets" className="mt-0 space-y-5">
                  <div className={sectionCard}>
                    <h3 className={sectionTitle}>Карточка в каталоге</h3>
                    <p className="text-sm text-white/40 -mt-2">
                      Цены на билеты задаются в схеме зала. Здесь — только то, что увидит пользователь на карточке.
                    </p>

                    <div>
                      <label className={fieldLabel}>
                        Текст цены на карточке <BelarusRuble className="inline ml-0.5 opacity-70" />
                      </label>
                      <Input
                        className={fieldInput}
                        placeholder="от 50"
                        value={form.price}
                        disabled={!canEdit}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                      />
                      <p className={fieldHint}>
                        Например: «от 35» или «от 100» — символ рубля добавится автоматически в каталоге
                      </p>
                    </div>

                    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white flex items-center gap-2">
                          <Send className="h-4 w-4 text-sky-300" />
                          Передача билетов
                        </p>
                        <p className="text-xs text-white/45 leading-relaxed max-w-md">
                          Покупатели смогут передать билет другу по email — только зарегистрированному пользователю и только по номинальной цене. У друга 10 минут на оплату.
                        </p>
                      </div>
                      <Switch
                        checked={allowTicketTransfer}
                        disabled={!canEdit}
                        onCheckedChange={setAllowTicketTransfer}
                        className="data-[state=checked]:bg-sky-500 shrink-0 mt-1"
                      />
                    </div>

                  </div>

                  <EventCatalogCardPreview
                    title={form.title}
                    image={coverPreviewUrl}
                    date={previewDate}
                    time={form.time || "19:00"}
                    location={form.location}
                    category={form.category || "Концерт"}
                    genre={form.genre}
                    priceLabel={form.price || "от 50"}
                    description={form.description}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="xl:sticky xl:top-28 space-y-4">
              <div className="bg-[#161616] rounded-2xl border border-white/[0.08] p-5">
                <p className={fieldLabel}>Статус</p>
                <div
                  className={cn(
                    "inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5 mb-5",
                    statusKey === "Rejected"
                      ? "border-red-500/25 bg-red-500/10"
                      : statusKey === "PendingReview"
                        ? "border-amber-500/25 bg-amber-500/10"
                        : statusKey === "Approved" || statusKey === "Published"
                          ? "border-emerald-500/25 bg-emerald-500/10"
                          : "border-white/10 bg-white/[0.04]"
                  )}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", statusUi.dotClassName)} />
                  <span className={cn("text-sm font-semibold", statusUi.labelClassName)}>{statusUi.label}</span>
                </div>
                {scheduledPublishAt && statusKey === "Approved" ? (
                  <p className="text-xs text-white/40 mb-3">
                    Публикация запланирована:{" "}
                    {new Date(scheduledPublishAt).toLocaleString("ru-RU")}
                  </p>
                ) : null}

                {isModerationPreview ? (
                  <div className="space-y-2">
                    <Button
                      className="w-full h-11 bg-white text-black hover:bg-white/90"
                      disabled={moderationBusy}
                      onClick={() => handleModeration("approve")}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Одобрить
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full h-11"
                      disabled={moderationBusy}
                      onClick={() => setRejectOpen(true)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Отклонить…
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {canEdit ? (
                      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 mb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <p className="text-sm font-semibold text-white flex items-center gap-2">
                              <Send className="h-4 w-4 text-sky-300 shrink-0" />
                              Передача билетов
                            </p>
                            <p className="text-[11px] text-white/40 leading-snug">
                              Друг по email, номинальная цена, 10 мин на оплату
                            </p>
                          </div>
                          <Switch
                            checked={allowTicketTransfer}
                            disabled={!canEdit}
                            onCheckedChange={setAllowTicketTransfer}
                            className="data-[state=checked]:bg-sky-500 shrink-0 mt-0.5"
                          />
                        </div>
                      </div>
                    ) : null}
                    {canEdit ? (
                      <Button className="w-full h-11" onClick={saveDraft} disabled={isSaving || isSubmitting}>
                        {isSaving ? "Сохранение…" : isEditMode ? "Сохранить изменения" : "Сохранить черновик"}
                      </Button>
                    ) : null}
                    {showReschedule ? (
                      <Button
                        variant="outline"
                        className="w-full h-11 border-amber-500/30 bg-amber-500/5 text-amber-200 hover:bg-amber-500/15"
                        disabled={reschedulePending}
                        onClick={() => {
                          setRescheduleDate(form.dateOnly);
                          setRescheduleTime(form.time);
                          setRescheduleReason("");
                          setRescheduleOpen(true);
                        }}
                      >
                        <CalendarClock className="h-4 w-4 mr-2" />
                        {reschedulePending ? "Перенос на проверке" : "Запросить перенос даты"}
                      </Button>
                    ) : null}
                    {showCancel ? (
                      <Button
                        variant="outline"
                        className="w-full h-11 border-rose-500/35 bg-rose-500/5 text-rose-200 hover:bg-rose-500/15"
                        onClick={() => setCancelOpen(true)}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Отменить концерт
                      </Button>
                    ) : null}
                    {cancellationPending ? (
                      <div className="rounded-xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-transparent to-transparent px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-rose-300/80 mb-1">Отмена</p>
                        <p className="text-sm font-medium text-rose-200/95">Запрос на отмену на проверке</p>
                        <p className="text-xs text-white/40 mt-1">Администратор рассмотрит заявку и вернёт билеты при одобрении</p>
                      </div>
                    ) : null}
                    {isAdminMode && eventId ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11 border-violet-500/30 bg-violet-500/5 text-violet-200 hover:bg-violet-500/15"
                        onClick={() => setAssignOpen(true)}
                      >
                        Отправить организатору…
                      </Button>
                    ) : null}
                    {showPublish ? (
                      <Button
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white"
                        onClick={openPublishDialog}
                      >
                        Опубликовать в каталог
                      </Button>
                    ) : null}
                    {canEdit && statusKey !== "Approved" && !isAdminMode ? (
                      <Button
                        type="button"
                        className="w-full h-11 bg-white text-black hover:bg-white/90 hover:text-black border border-white/10 shadow-sm"
                        onClick={submitForModeration}
                        disabled={isSubmitting || isSaving || statusKey === "Published"}
                      >
                        {isSubmitting ? "Отправка…" : "Отправить на модерацию"}
                      </Button>
                    ) : null}
                    {showAdminPublish ? (
                      <Button
                        type="button"
                        className="w-full h-11 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold shadow-lg shadow-emerald-900/25"
                        onClick={openPublishDialog}
                      >
                        Опубликовать
                      </Button>
                    ) : null}
                    {statusKey === "PendingReview" ? (
                      <p className="text-xs text-white/40 text-center">Редактирование недоступно до решения модератора</p>
                    ) : null}
                  </div>
                )}
              </div>

              {eventId ? (
                <SeatMap
                  key={seatMapKey}
                  size="large"
                  readOnly
                  purchaseMode={false}
                  eventInfo={{
                    id: eventId,
                    title: form.title.trim() || "Мероприятие",
                    date: previewDate,
                  }}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-white/[0.1] bg-[#161616]/50 p-6 text-center">
                  <p className="text-sm text-white/35 leading-relaxed">
                    Сохраните черновик, чтобы открыть схему мест
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="bg-[#161616] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isAdminMode ? "Опубликовать мероприятие" : "Расписание витрины"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/50 leading-relaxed">
            Укажите дату и время появления в каталоге «Концерты» и когда снять с витрины.
          </p>
          <div className="space-y-4">
            <div>
              <label className={fieldLabel}>Публикация в каталоге</label>
              <Input
                type="datetime-local"
                className={fieldInput}
                value={publishAtLocal}
                onChange={(e) => setPublishAtLocal(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={fieldLabel}>Снять с витрины</label>
              <Input
                type="datetime-local"
                className={fieldInput}
                value={unpublishAtLocal}
                onChange={(e) => setUnpublishAtLocal(e.target.value)}
                min={publishAtLocal || undefined}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto"
              disabled={!publishAtLocal || !unpublishAtLocal}
              onClick={handleSchedulePublish}
            >
              {isAdminMode ? "Опубликовать" : "Сохранить расписание"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="bg-[#161616] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Запрос переноса даты</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/50 leading-relaxed">
            Укажите новую дату, время и причину. Администратор проверит запрос — после одобрения держатели билетов
            получат уведомление, билеты останутся действительными.
          </p>
          <div className="space-y-4">
            <div>
              <label className={fieldLabel}>Новая дата</label>
              <Input
                type="date"
                className={fieldInput}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div>
              <label className={fieldLabel}>Новое время</label>
              <Input
                type="time"
                className={fieldInput}
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(sanitizeTimeInput(e.target.value))}
              />
            </div>
            <div>
              <label className={fieldLabel}>Причина переноса</label>
              <Textarea
                className={cn(fieldInput, "min-h-[100px] h-auto py-3")}
                placeholder="Например: болезнь артиста, ремонт на площадке…"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/20" onClick={() => setRescheduleOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-500"
              disabled={rescheduleBusy || !rescheduleDate || !rescheduleTime || !rescheduleReason.trim()}
              onClick={() => void submitRescheduleRequest()}
            >
              Отправить администратору
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-[#161616] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Причина отклонения</DialogTitle>
          </DialogHeader>
          <Textarea
            className={cn(fieldInput, "min-h-[120px] h-auto py-3")}
            placeholder="Опишите, что нужно исправить организатору…"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" className="border-white/20" onClick={() => setRejectOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" disabled={moderationBusy} onClick={() => handleModeration("reject")}>
              Отклонить и отправить на почту
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {coverCropSrc ? (
        <CoverCropDialog
          open
          imageSrc={coverCropSrc}
          onClose={closeCoverCrop}
          onConfirm={(blob) => {
            applyCroppedCover(blob);
            closeCoverCrop();
          }}
        />
      ) : null}

      {eventId ? (
        <>
          <OrganizerCancelEventDialog
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            eventId={eventId}
            onSubmitted={() => setCancellationPending(true)}
          />
          <AdminAssignOrganizerDialog
            open={assignOpen}
            onOpenChange={setAssignOpen}
            eventId={eventId}
            eventTitle={form.title.trim() || "Мероприятие"}
          />
        </>
      ) : null}
    </Layout>
  );
};

export default OrganizerEventBuilder;
