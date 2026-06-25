import { test, expect } from "@playwright/test";
import { dismissCookieBanner } from "./helpers";

test.describe("Авторизация — UI форм", () => {
  test("SignIn — поля и кнопка входа", async ({ page }) => {
    await page.goto("/signin");
    await dismissCookieBanner(page);
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Войти", exact: true })).toBeVisible();
  });

  test("SignUp — поля регистрации", async ({ page }) => {
    await page.goto("/signup");
    await dismissCookieBanner(page);
    await expect(page.getByLabel(/электронная почта/i)).toBeVisible();
    await expect(page.getByLabel(/^пароль$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Создать аккаунт", exact: true })).toBeVisible();
  });

  test("AdminSignIn — отдельная форма", async ({ page }) => {
    await page.goto("/admin-signin");
    await dismissCookieBanner(page);
    await expect(page.getByRole("button", { name: "Войти как админ", exact: true })).toBeVisible();
  });

  test("SignIn — пустая отправка блокируется HTML-валидацией", async ({ page }) => {
    await page.goto("/signin");
    await page.getByRole("button", { name: "Войти", exact: true }).click();
    const invalid = await page.locator("#email:invalid").count();
    expect(invalid).toBeGreaterThan(0);
  });
});
