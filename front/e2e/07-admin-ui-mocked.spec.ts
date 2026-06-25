import { test, expect } from "@playwright/test";
import { mockAuthenticatedUser, dismissCookieBanner } from "./helpers";

const ADMIN_TABS = [
  "Пользователи",
  "События",
  "Заказы",
  "Платежи",
  "Сообщения",
  "Чат поддержки",
  "Организаторы",
  "Модерация",
  "Отмена события",
  "Возврат билетов",
  "Площадки",
  "Танцпол",
  "Фильтры",
  "Cookie",
];

test.describe("Админ-панель — вкладки (mock admin)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page, { isAdmin: true });

    await page.route("**/api/admin/statistics", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          totalUsers: 1,
          totalEvents: 1,
          totalOrders: 0,
          totalPayments: 0,
          pendingMessages: 0,
          pendingSupportThreads: 0,
          totalOrganizers: 0,
          pendingModeration: 0,
          pendingCancellations: 0,
          pendingTicketRefundRequests: 0,
          totalVenues: 0,
          totalCatalogFilters: 0,
        }),
      });
    });

    await page.route("**/api/admin/**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, body: "[]" });
        return;
      }
      await route.continue();
    });

    await page.goto("/admin");
    await dismissCookieBanner(page);
    await expect(page.getByText(/админ|панель|пользователи/i).first()).toBeVisible({ timeout: 20_000 });
  });

  for (const tab of ADMIN_TABS) {
    test(`вкладка «${tab}» открывается`, async ({ page }) => {
      const btn = page
        .locator("div.flex.flex-wrap.gap-1\\.5")
        .getByRole("button", { name: tab, exact: true });
      await expect(btn).toBeVisible();
      await btn.click();
      await expect(btn).toHaveClass(/8B5CF6|violet|bg-\[#8B5CF6\]/i);
    });
  }
});
