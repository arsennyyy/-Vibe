import { test, expect } from "@playwright/test";

const PUBLIC_API = [
  { path: "/api/events", minStatus: 200 },
  { path: "/api/faq", minStatus: 200 },
  { path: "/api/catalog-filters", minStatus: 200 },
  { path: "/api/captcha/challenge", minStatus: 200 },
];

test.describe("API — доступность публичных эндпоинтов", () => {
  for (const ep of PUBLIC_API) {
    test(`${ep.path} отвечает ${ep.minStatus}+`, async ({ request }) => {
      const res = await request.get(ep.path);
      expect(res.status()).toBeGreaterThanOrEqual(ep.minStatus);
      expect(res.status()).toBeLessThan(500);
    });
  }

  test("captcha verify — выдаёт токен после задержки", async ({ request }) => {
    const challenge = await request.get("/api/captcha/challenge");
    expect(challenge.ok()).toBeTruthy();
    const { challengeId } = await challenge.json();
    await new Promise((r) => setTimeout(r, 700));
    const verify = await request.post("/api/captcha/verify", {
      data: { challengeId },
    });
    expect(verify.ok()).toBeTruthy();
    const body = await verify.json();
    expect(body.captchaToken).toBeTruthy();
  });
});
