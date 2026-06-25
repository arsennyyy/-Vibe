import { expect } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

export const PUBLIC_ROUTES = [
  { path: "/", title: /Vibe|вечер|концерт/i },
  { path: "/concerts", title: /мероприятия|концерт/i },
  { path: "/about", title: /о нас|\+Vibe/i },
  { path: "/contact", title: /контакт|связ/i },
  { path: "/faq", title: /faq|вопрос/i },
  { path: "/terms", title: /условия|использован/i },
  { path: "/privacy", title: /конфиденциальн|privacy/i },
  { path: "/cookies", title: /cookie/i },
  { path: "/signin", title: /войти|вход/i },
  { path: "/signup", title: /регистрац/i },
  { path: "/admin-signin", title: /админ|вход/i },
  { path: "/verify", title: /проверк|билет|verify/i },
] as const;

export const HEADER_LINKS = [
  { label: "Концерты", path: "/concerts" },
  { label: "О нас", path: "/about" },
  { label: "Контакты", path: "/contact" },
  { label: "FAQ", path: "/faq" },
] as const;

export async function dismissCookieBanner(page: Page) {
  const accept = page.getByRole("button", { name: /принять|согласен|ok|понятно/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

export async function fetchFirstEventId(request: APIRequestContext): Promise<number | null> {
  const res = await request.get("/api/events");
  if (!res.ok()) return null;
  const data = await res.json();
  const list = Array.isArray(data) ? data : [];
  const first = list[0];
  const id = first?.id ?? first?.Id;
  return id != null ? Number(id) : null;
}

export async function mockAuthenticatedUser(page: Page, opts: { isAdmin?: boolean; isOrganizer?: boolean } = {}) {
  const user = {
    id: "999",
    name: "E2E User",
    email: "e2e@vibe.test",
    joinedDate: new Date().toISOString(),
    isAdmin: opts.isAdmin ?? false,
    isOrganizer: opts.isOrganizer ?? false,
    avatarUrl: null,
  };

  await page.addInitScript((u) => {
    localStorage.setItem("token", "e2e-mock-token");
    localStorage.setItem("user", JSON.stringify(u));
  }, user);

  await page.route("**/api/user/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 999,
        name: user.name,
        email: user.email,
        joinedDate: user.joinedDate,
        isAdmin: user.isAdmin,
        isOrganizer: user.isOrganizer,
        avatarUrl: null,
      }),
    });
  });

  await page.route("**/api/auth/qr-session", async (route) => {
    await route.fulfill({ status: 200, body: "{}" });
  });

  await page.route("**/api/notifications**", async (route) => {
    if (route.request().url().includes("unread-count")) {
      await route.fulfill({ status: 200, body: JSON.stringify({ count: 0 }) });
      return;
    }
    await route.fulfill({ status: 200, body: "[]" });
  });
}

export async function clickHeaderLink(page: Page, label: string) {
  const link = page.locator("header").getByRole("link", { name: label, exact: true });
  await expect(link).toBeVisible();
  await link.click();
}
