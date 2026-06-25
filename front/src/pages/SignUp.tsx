import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "../components/Layout";
import { config } from "@/config";
import { toast } from "sonner";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import CaptchaModal from "@/components/security/CaptchaModal";
import OtpVerificationStep from "@/components/auth/OtpVerificationStep";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

type AuthUser = {
  token: string;
  id: string;
  name: string;
  email: string;
  joinedDate: string;
  isAdmin?: boolean;
  isOrganizer?: boolean;
  avatarUrl?: string;
};

const SignUp = () => {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [challengeId, setChallengeId] = useState(0);
  const [expiresIn, setExpiresIn] = useState(120);
  const { setUser } = useUser();
  const navigate = useNavigate();

  const applyAuth = (data: AuthUser) => {
    localStorage.setItem("token", data.token);
    setUser({
      id: data.id,
      name: data.name,
      email: data.email,
      joinedDate: data.joinedDate,
      isAdmin: data.isAdmin || false,
      isOrganizer: data.isOrganizer || false,
      avatarUrl: data.avatarUrl,
    });
    toast.success("Добро пожаловать в +Vibe!");
    navigate(data.isAdmin ? "/admin" : "/profile");
  };

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return "Пароль должен содержать минимум 8 символов";
    if (!/^[a-zA-Z0-9]+$/.test(pass)) return "Пароль должен содержать только латинские буквы и цифры";
    if (!/[a-zA-Z]/.test(pass)) return "Пароль должен содержать хотя бы одну букву";
    if (!/[0-9]/.test(pass)) return "Пароль должен содержать хотя бы одну цифру";
    return "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setCaptchaOpen(true);
  };

  const submitWithCaptcha = async (captchaToken: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(config.endpoints.auth.registerStart, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword: password,
          captchaToken,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Ошибка регистрации");
        return;
      }
      const id = Number(data.challengeId ?? data.ChallengeId);
      if (!Number.isFinite(id) || id <= 0) {
        setError("Сервер не вернул идентификатор проверки. Попробуйте ещё раз.");
        return;
      }
      setChallengeId(id);
      setExpiresIn(data.expiresInSec ?? 120);
      setStep("otp");
      toast.success("Код отправлен на почту");
    } catch {
      setError("Ошибка соединения с сервером.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (code: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(config.endpoints.auth.registerVerify, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code: code.trim().toUpperCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Неверный код");
      applyAuth(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка подтверждения");
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (): Promise<number> => {
    const res = await fetch(config.endpoints.auth.registerResend, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    toast.success("Новый код отправлен");
    return data.expiresInSec ?? 120;
  };

  const googleLogin = async (credential: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(config.endpoints.auth.google, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      applyAuth(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка Google");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-4 py-16 overflow-hidden bg-background">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-400/25 dark:bg-[#6d28d9]/10 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="text-center mb-8 relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black mb-6 font-['Unbounded'] text-[#8b5cf6] tracking-tighter"
          >
            +Vibe
          </motion.h1>
          <h2 className="text-3xl font-bold mb-2 font-display text-foreground tracking-tight">
            {step === "form" ? "Создать аккаунт" : "Почти готово"}
          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            {step === "form" ? "Присоединитесь и получайте лучшие билеты" : "Осталось подтвердить код из письма"}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[420px] bg-[var(--vibe-surface)] backdrop-blur-xl border border-border rounded-3xl p-8 shadow-xl relative z-10"
        >
          {error && (
            <div className="text-red-400 border border-red-500/20 bg-red-500/10 p-3 rounded-lg text-xs text-center font-medium mb-4">
              {error}
            </div>
          )}

          {step === "otp" ? (
            <OtpVerificationStep
              email={email}
              challengeId={challengeId}
              expiresInSec={expiresIn}
              onVerify={verifyOtp}
              onResend={resendOtp}
              busy={isLoading}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold ml-1">
                  Ваше имя
                </Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Иван Иванов"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="pl-11 bg-[#0a0a0a] border-white/12 h-12 text-white rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold ml-1">
                  Электронная почта
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="pl-11 bg-[#0a0a0a] border-white/12 h-12 text-white rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold ml-1">
                  Пароль
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Минимум 8 символов"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pl-11 pr-11 bg-[#0a0a0a] border-white/12 h-12 text-white rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white h-12 font-bold rounded-xl"
              >
                {isLoading ? "Отправка…" : "Создать аккаунт"}
              </Button>
            </form>
          )}

          {step === "form" && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
                  <span className="bg-[#0f0f0f] px-4 text-muted-foreground font-bold">или</span>
                </div>
              </div>
              <GoogleSignInButton text="signup_with" onSuccess={(c) => void googleLogin(c)} />
            </>
          )}

          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground font-medium">
              Уже есть аккаунт?{" "}
              <Link to="/signin" className="text-[#8b5cf6] font-bold hover:underline">
                Войти
              </Link>
            </p>
          </div>
        </motion.div>

        <CaptchaModal
          open={captchaOpen}
          onOpenChange={setCaptchaOpen}
          onVerified={(token) => void submitWithCaptcha(token)}
          title="Подтвердите регистрацию"
          description="Перед созданием аккаунта пройдите короткую проверку."
        />
      </div>
    </Layout>
  );
};

export default SignUp;
