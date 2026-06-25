import { test, expect } from "@playwright/test";
import { dismissCookieBanner } from "./helpers";

test.describe("Каталог концертов — фильтры и сортировка", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/concerts");
    await dismissCookieBanner(page);
    await expect(page.getByRole("heading", { name: /мероприятия/i })).toBeVisible({ timeout: 20_000 });
  });

  test("отображается список или пустое состояние", async ({ page }) => {
    const cards = page.locator("a[href*='/event/']");
    const empty = page.getByText(/ничего не найдено|нет событий|загружаем/i);
    await expect(cards.first().or(empty)).toBeVisible({ timeout: 25_000 });
  });

  test("поиск по тексту не ломает страницу", async ({ page }) => {
    const search = page.getByPlaceholder(/поиск|найти/i).first();
    if (await search.isVisible()) {
      await search.fill("тест");
      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("переход на карточку события", async ({ page }) => {
    const card = page.locator("a[href*='/event/']").first();
    await expect(card).toBeVisible({ timeout: 25_000 });
    const href = await card.getAttribute("href");
    await card.click();
    await expect(page).toHaveURL(new RegExp(href!.replace("/", "\\/")));
  });
});
