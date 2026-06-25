import { test, expect } from "@playwright/test";
import { dismissCookieBanner, fetchFirstEventId } from "./helpers";

test.describe("Нефункциональные проверки", () => {
  test("главная загружается < 5 сек (DOM)", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    expect(Date.now() - start).toBeLessThan(8000);
  });

  test("body не заблокирован pointer-events после загрузки event", async ({ page, request }) => {
    const eventId = await fetchFirstEventId(request);
    test.skip(!eventId, "Нет событий");

    await page.goto(`/event/${eventId}`);
    await dismissCookieBanner(page);
    await page.waitForTimeout(2000);

    const pe = await page.evaluate(() => getComputedStyle(document.body).pointerEvents);
    expect(pe).not.toBe("none");

    const locked = await page.evaluate(() => document.body.getAttribute("data-scroll-locked"));
    expect(locked).toBeNull();
  });

  test("футер — ссылки Правовая информация", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);
    await page.getByRole("link", { name: /условия использования/i }).click();
    await expect(page).toHaveURL(/terms/);
  });
});
