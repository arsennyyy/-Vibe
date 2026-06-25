export type NotificationRouteInput = {
  title: string;
  message?: string;
  type?: string;
  relatedEventId?: number | null;
  relatedTicketId?: number | null;
};

export type NotificationUserCtx = {
  isAdmin?: boolean;
  isOrganizer?: boolean;
};

/** Куда вести по клику на уведомление. */
export function resolveNotificationHref(
  n: NotificationRouteInput,
  user?: NotificationUserCtx
): string | null {
  const title = n.title.toLowerCase();
  const message = (n.message ?? "").toLowerCase();

  if (user?.isAdmin) {
    if (
      title.includes("заявка на возврат") ||
      (title.includes("возврат") && title.includes("билет") && !title.includes("одобрен") && !title.includes("отклонён") && !title.includes("отклонен"))
    ) {
      return "/admin?tab=ticket-refunds";
    }
    if (title.includes("отмену") || title.includes("отмена концерта") || message.includes("отмену концерта")) {
      return "/admin?tab=cancellations";
    }
    if (title.includes("перенос") && title.includes("запрос")) {
      return "/admin?tab=moderation";
    }
    if (title.includes("модерац") || title.includes("заявка на модерацию")) {
      return "/admin?tab=moderation";
    }
    if (title.includes("сообщен") || message.includes("с сайта")) {
      return "/admin?tab=messages";
    }
    if (title.includes("поддержк") || title.includes("чат")) {
      return "/admin?tab=support-chat";
    }
  }

  if (
    title.includes("возврат одобрен") ||
    title.includes("возврат отклон") ||
    title.includes("заявка на возврат") ||
    (title.includes("возврат") && n.relatedTicketId)
  ) {
    return "/profile?tab=tickets";
  }

  if (
    title.includes("передали билет") ||
    (title.includes("передач") && title.includes("билет"))
  ) {
    return "/profile?tab=tickets&incoming=1";
  }

  if (title.includes("билет") || title.includes("куплено") || n.relatedTicketId) {
    return "/profile?tab=tickets";
  }

  if (title.includes("ответ поддержки")) {
    return "/profile";
  }

  if (user?.isOrganizer && n.relatedEventId) {
    if (
      title.includes("одобрена") ||
      title.includes("отклонена") ||
      title.includes("администратора") ||
      title.includes("перенос") ||
      title.includes("отмена")
    ) {
      return `/organizer/events/${n.relatedEventId}/edit`;
    }
  }

  if (n.relatedEventId) {
    return `/event/${n.relatedEventId}`;
  }

  return null;
}
