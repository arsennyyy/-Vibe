import { config } from "@/config";

export async function fetchCaptchaChallenge(): Promise<string> {
  const res = await fetch(config.endpoints.captcha.challenge);
  if (!res.ok) throw new Error("Не удалось загрузить проверку");
  const data = (await res.json()) as { challengeId: string };
  return data.challengeId;
}

export async function verifyCaptcha(challengeId: string): Promise<string> {
  const res = await fetch(config.endpoints.captcha.verify, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId }),
  });
  const data = (await res.json().catch(() => ({}))) as { captchaToken?: string; message?: string };
  if (!res.ok) throw new Error(data.message || "Проверка не пройдена");
  if (!data.captchaToken) throw new Error("Нет токена проверки");
  return data.captchaToken;
}
