import { useRef } from "react";
import { GoogleLogin, useGoogleOAuth, type CredentialResponse } from "@react-oauth/google";
import { cn } from "@/lib/utils";

type Props = {
  onSuccess: (credential: string) => void;
  onError?: () => void;
  text?: "signin_with" | "signup_with" | "continue_with";
  disabled?: boolean;
};

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const labelFor = (text: Props["text"]) => {
  if (text === "signup_with") return "Регистрация через Google";
  if (text === "signin_with") return "Войти через Google";
  return "Продолжить с Google";
};

const GoogleSignInButton = ({ onSuccess, onError, text = "continue_with", disabled }: Props) => {
  const hiddenRef = useRef<HTMLDivElement>(null);
  const googleOAuth = useGoogleOAuth();
  const clientId = googleOAuth?.clientId?.trim();

  if (!clientId) {
    return (
      <p className="text-center text-xs text-white/35 py-2">
        Google-вход: запустите бэкенд или задайте VITE_GOOGLE_CLIENT_ID
      </p>
    );
  }

  const openGoogle = () => {
    if (disabled) return;
    const googleBtn = hiddenRef.current?.querySelector('div[role="button"]') as HTMLElement | null;
    googleBtn?.click();
  };

  return (
    <>
      <button
        type="button"
        onClick={openGoogle}
        disabled={disabled}
        className={cn(
          "w-full h-12 rounded-xl border border-white/12",
          "bg-gradient-to-b from-white/[0.08] to-white/[0.03]",
          "hover:from-white/[0.12] hover:to-white/[0.06] hover:border-white/22",
          "active:scale-[0.99] transition-all duration-200",
          "flex items-center justify-center gap-3 text-sm font-semibold text-white/90",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5">
          <GoogleIcon />
        </span>
        {labelFor(text)}
      </button>

      {/* SDK Google — вне экрана, клик проксируется с кастомной кнопки */}
      <div
        ref={hiddenRef}
        className="fixed left-0 top-0 h-px w-px overflow-hidden opacity-0 pointer-events-none"
        aria-hidden
        tabIndex={-1}
      >
        <GoogleLogin
          onSuccess={(res: CredentialResponse) => {
            if (res.credential) onSuccess(res.credential);
            else onError?.();
          }}
          onError={() => onError?.()}
          theme="outline"
          size="large"
          width={200}
          text={text}
          shape="rectangular"
          locale="ru"
        />
      </div>
    </>
  );
};

export default GoogleSignInButton;
