import { test, expect } from "@playwright/test";
import { dismissCookieBanner, fetchFirstEventId } from "./helpers";

test.describe("Страница мероприятия — вкладки и схема зала", () => {
  let eventId: number | null;

  test.beforeAll(async ({ request }) => {
    eventId = await fetchFirstEventId(request);
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!eventId, "Нет событий в API");
    await page.goto(`/event/${eventId}`);
    await dismissCookieBanner(page);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 25_000 });
  });

  test("вкладки Детали / Место / Билеты переключаются", async ({ page }) => {
    const tabs = ["Детали", "Место проведения", "Билеты"];
    for (const tab of tabs) {
      await page.getByRole("tab", { name: tab }).click();
      await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("data-state", "active");
    }
  });

  test("блок схемы зала отображается", async ({ page }) => {
    await expect(page.getByText(/выберите места|схема зала/i)).toBeVisible({ timeout: 20_000 });
  });

  test("нет лавины ошибок в консоли (60 сек)", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) errors.push(msg.text());
    });
    await page.waitForTimeout(3000);
    const postMessageSpam = errors.filter((e) => e.includes("postMessage")).length;
    expect(postMessageSpam, "postMessage flood — возможен цикл ререндеров").toBeLessThan(5);
    expect(errors.length, errors.join("\n")).toBeLessThan(10);
  });
});
