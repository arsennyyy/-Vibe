import { test, expect } from "@playwright/test";
import { mockAuthenticatedUser, dismissCookieBanner } from "./helpers";

test.describe("Профиль — вкладки (mock user)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);

    await page.route("**/api/Seats/my-tickets", async (route) => {
      await route.fulfill({ status: 200, body: "[]" });
    });

    await page.route("**/api/user/notification-prefs", async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ emailEnabled: true, pushEnabled: true }) });
    });

    await page.goto("/profile");
    await dismissCookieBanner(page);
    await expect(page.getByText(/профиль|мои билеты/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("вкладка Мои билеты", async ({ page }) => {
    await page.getByRole("button", { name: "Мои билеты", exact: true }).click();
    await expect(page.getByText(/предстоящие|архив|билет/i).first()).toBeVisible();
  });

  test("вкладка Настройки", async ({ page }) => {
    await page.getByRole("button", { name: "Настройки", exact: true }).click();
    await expect(page.getByText(/уведомлен|email/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
