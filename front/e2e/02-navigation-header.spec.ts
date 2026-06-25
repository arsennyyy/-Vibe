import { test, expect } from "@playwright/test";
import { HEADER_LINKS, dismissCookieBanner, clickHeaderLink, fetchFirstEventId } from "./helpers";

test.describe("Хедер — кликабельность и навигация", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);
  });

  for (const link of HEADER_LINKS) {
    test(`ссылка «${link.label}» кликабельна с главной`, async ({ page }) => {
      await clickHeaderLink(page, link.label);
      await expect(page).toHaveURL(new RegExp(`${link.path}(\\?.*)?$`));
    });
  }

  test("логотип +Vibe ведёт на главную", async ({ page }) => {
    await page.goto("/concerts");
    await page.locator("header").getByRole("link", { name: "+Vibe" }).click();
    await expect(page).toHaveURL("/");
  });

  test("хедер кликабелен на странице мероприятия", async ({ page, request }) => {
    const eventId = await fetchFirstEventId(request);
    test.skip(!eventId, "Нет опубликованных событий в API");

    await page.goto(`/event/${eventId}`);
    await dismissCookieBanner(page);
    await clickHeaderLink(page, "Концерты");
    await expect(page).toHaveURL(/\/concerts/);
  });
});
