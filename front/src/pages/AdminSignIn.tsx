import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { useUser } from "@/contexts/UserContext";
import { config } from "@/config";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import CaptchaModal from "@/components/security/CaptchaModal";
import OtpVerificationStep from "@/components/auth/OtpVerificationStep";

type AuthUser = {
  token: string;
  id: string;
  name: string;
  email: string;
  joinedDate: string;
  isAdmin?: boolean;
  isOrganizer?: boolean;
};

const AdminSignIn = () => {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [challengeId, setChallengeId] = useState(0);
  const [expiresIn, setExpiresIn] = useState(120);
  const { setUser } = useUser();
  const navigate = useNavigate();

  const finishLogin = (data: AuthUser) => {
    if (!data.isAdmin) {
      toast.error("Доступ в админ-панель разрешен только администраторам");
      return;
    }
    localStorage.setItem("token", data.token);
    setUser({
      id: data.id,
      name: data.name,
      email: data.email,
      joinedDate: data.joinedDate,
      isAdmin: true,
      isOrganizer: data.isOrganizer || false,
    });
    toast.success("Успешный вход администратора!");
    navigate("/admin");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCaptchaOpen(true);
  };

  const submitWithCaptcha = async (captchaToken: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(config.endpoints.auth.loginStart, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, captchaToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Ошибка входа");
        return;
      }
      setChallengeId(data.challengeId);
      setExpiresIn(data.expiresInSec ?? 120);
      setStep("otp");
      toast.success("Код отправлен на почту");
    } catch {
      toast.error("Произошла ошибка при входе в систему");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (code: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(config.endpoints.auth.loginVerify, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Неверный код");
      finishLogin(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка подтверждения");
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (): Promise<number> => {
    const res = await fetch(config.endpoints.auth.loginResend, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    toast.success("Новый код отправлен");
    return data.expiresInSec ?? 120;
  };

  return (
    <Layout>
      <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-4 py-16 font-['Manrope'] overflow-hidden bg-[#050505]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6d28d9]/10 rounded-full blur-[120px] pointer-events-none z-0" />
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] w-[300px] h-[300px] bg-[#8b5cf6]/5 rounded-full blur-[80px] pointer-events-none z-0"
        />

        <div className="text-center mb-8 relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black mb-6 font-['Unbounded'] text-[#8b5cf6] tracking-tighter"
          >
            +Vibe
          </motion.h1>
          <h2 className="text-3xl font-bold mb-2 font-['Unbounded'] text-white tracking-tight">
            {step === "form" ? "Администратор" : "Почти готово"}
          </h2>
          <p className="text-white/40 text-sm font-medium">
            {step === "form" ? "Для входа используйте административные учетные данные" : "Осталось подтвердить код из письма"}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-[420px] bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10"
        >
          {error && (
            <div className="text-red-400 border border-red-500/20 bg-red-500/10 p-3 rounded-lg text-xs text-center mb-4">
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
                <Label htmlFor="email" className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-bold ml-1">
                  Электронная почта
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-[#8b5cf6] transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@admin.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="pl-11 bg-black/40 border-white/5 focus-visible:ring-1 focus-visible:ring-[#8b5cf6]/50 h-12 text-white placeholder:text-white/20 rounded-xl transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-bold ml-1">
                  Пароль
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-[#8b5cf6] transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pl-11 pr-11 bg-black/40 border-white/5 focus-visible:ring-1 focus-visible:ring-[#8b5cf6]/50 h-12 text-white placeholder:text-white/20 rounded-xl transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white h-12 font-bold text-sm rounded-xl mt-4 transition-all shadow-lg shadow-[#8b5cf6]/20 active:scale-[0.98]"
              >
                {isLoading ? "Проверка…" : "Войти как админ"}
              </Button>
            </form>
          )}

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
              <span className="bg-[#0f0f0f] px-4 text-white/20 font-bold">или</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-white/40 font-medium">
              Вернуться к обычному входу?{" "}
              <Link to="/signin" className="text-[#8b5cf6] hover:text-[#a78bfa] font-bold ml-1 transition-colors underline-offset-4 hover:underline">
                Обычный вход
              </Link>
            </p>
          </div>
        </motion.div>

        <CaptchaModal
          open={captchaOpen}
          onOpenChange={setCaptchaOpen}
          onVerified={(token) => void submitWithCaptcha(token)}
          title="Подтвердите вход"
          description="Перед входом в админ-панель пройдите проверку."
        />
      </div>
    </Layout>
  );
};

export default AdminSignIn;
