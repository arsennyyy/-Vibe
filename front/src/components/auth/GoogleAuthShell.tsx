import { useEffect, useState, type ReactNode } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { config } from "@/config";

const envClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? "";

type Props = { children: ReactNode };

/** Подключает Google OAuth: сначала .env, иначе Client ID с бэкенда. */
export default function GoogleAuthShell({ children }: Props) {
  const [clientId, setClientId] = useState(envClientId);

  useEffect(() => {
    if (envClientId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(config.endpoints.auth.googleConfig);
        if (!res.ok) return;
        const data = (await res.json()) as { clientId?: string | null };
        if (!cancelled && data.clientId?.trim()) setClientId(data.clientId.trim());
      } catch {
        /* бэкенд недоступен — кнопка Google скрыта */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!clientId) return <>{children}</>;

  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}

export function useResolvedGoogleClientId(): string {
  const [clientId, setClientId] = useState(envClientId);
  useEffect(() => {
    if (envClientId) return;
    fetch(config.endpoints.auth.googleConfig)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.clientId?.trim()) setClientId(d.clientId.trim());
      })
      .catch(() => {});
  }, []);
  return clientId;
}
