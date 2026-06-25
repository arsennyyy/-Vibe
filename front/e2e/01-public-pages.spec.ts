import { test, expect } from "@playwright/test";
import { PUBLIC_ROUTES, dismissCookieBanner } from "./helpers";

test.describe("Публичные страницы — загрузка и контент", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`GET ${route.path} отображается без ошибки`, async ({ page }) => {
      await page.goto(route.path);
      await dismissCookieBanner(page);
      await expect(page.locator("body")).toBeVisible();
      await expect(page).toHaveURL(new RegExp(route.path.replace("/", "\\/") + "(\\?.*)?$"));
      const heading = page.getByRole("heading").first();
      await expect(heading).toBeVisible({ timeout: 20_000 });
    });
  }

  test("404 — неизвестный маршрут", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-xyz");
    await expect(page.getByText(/не найден|404|not found/i)).toBeVisible({ timeout: 15_000 });
  });
});
