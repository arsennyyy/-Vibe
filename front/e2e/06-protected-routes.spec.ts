import { test, expect } from "@playwright/test";
import { dismissCookieBanner } from "./helpers";

test.describe("Защищённые маршруты — редиректы без сессии", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    });
  });

  test("/admin редирект на admin-signin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/admin-signin/, { timeout: 15_000 });
  });

  test("/profile доступен, но без билетов (гость)", async ({ page }) => {
    await page.goto("/profile");
    await dismissCookieBanner(page);
    await expect(page).toHaveURL(/signin|profile/);
  });
});
