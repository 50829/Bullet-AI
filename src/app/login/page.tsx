"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

// 翻译内容
const translations = {
  loginTitle: {
    en: "Login to BulletAI",
    zh: "登录 BulletAI",
  },
  loginDesc: {
    en: "Use email verification code or third-party account to log in. After logging in, you will be redirected to the task panel.",
    zh: "使用邮箱验证码或第三方账号登录，登录后将跳转到任务面板",
  },
  emailLabel: {
    en: "Email",
    zh: "邮箱",
  },
  emailPlaceholder: {
    en: "you@example.com",
    zh: "you@example.com",
  },
  sendCode: {
    en: "Send Verification Code",
    zh: "发送验证码",
  },
  sending: {
    en: "Sending...",
    zh: "发送中…",
  },
  codeLabel: {
    en: "Verification Code",
    zh: "验证码",
  },
  codePlaceholder: {
    en: "Enter verification code",
    zh: "请输入验证码",
  },
  verifyAndLogin: {
    en: "Verify and Login",
    zh: "验证并登录",
  },
  verifying: {
    en: "Verifying...",
    zh: "验证中…",
  },
  resendCode: {
    en: "Resend Verification Code",
    zh: "返回重新发送验证码",
  },
  or: {
    en: "or",
    zh: "或",
  },
  githubLogin: {
    en: "Login with GitHub",
    zh: "使用 GitHub 登录",
  },
  googleLogin: {
    en: "Login with Google",
    zh: "使用 Google 登录",
  },
  back: {
    en: "← Back",
    zh: "← 返回",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [language, setLanguage] = useState<"en" | "zh">("en"); // 默认英文

  const t = (key: keyof typeof translations) => translations[key][language];

  const getOrigin = () =>
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage(language === "en" ? "Please enter your email address" : "请输入邮箱地址");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${getOrigin()}/auth/callback` },
      });
      if (error) {
        setMessage(
          language === "en"
            ? `Failed to send verification code: ${error.message}`
            : `发送验证码失败：${error.message}`
        );
      } else {
        setMessage(
          language === "en"
            ? "Verification code sent. Please check your email."
            : "验证码已发送，请检查您的邮箱"
        );
        setStep("code");
      }
    } catch (e) {
      const errorMsg =
        e instanceof Error ? e.message : String(e);
      setMessage(
        language === "en"
          ? `An error occurred: ${errorMsg}`
          : `发生错误：${errorMsg}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setMessage(language === "en" ? "Please enter the verification code" : "请输入验证码");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error) {
        setMessage(
          language === "en"
            ? `Verification failed: ${error.message}`
            : `验证码验证失败：${error.message}`
        );
      } else if (data.session) {
        setMessage(
          language === "en"
            ? "Login successful, redirecting…"
            : "登录成功，正在跳转…"
        );
        window.location.href = "/task-ai";
      } else {
        setMessage(
          language === "en"
            ? "Session not found. Please try again."
            : "未获取到会话，请重试"
        );
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setMessage(
        language === "en"
          ? `An error occurred: ${errorMsg}`
          : `发生错误：${errorMsg}`
      );
    } finally {
      setLoading(false);
    }
  };

  const signInWithProvider = async (provider: "google" | "github") => {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${getOrigin()}/auth/callback`,
        queryParams: provider === "github" ? { prompt: "login" } : undefined,
      },
    });
    if (error) {
      setLoading(false);
      setMessage(error.message);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--surface-soft)] text-[var(--text-primary)] relative">
      {/* 语言切换按钮 */}
      <div className="absolute top-6 right-6 flex gap-2">
        <button
          onClick={() => setLanguage("en")}
          className={`px-3 py-1 rounded text-sm ${language === "en" ? "bg-[#c9b8a1] text-white" : "bg-gray-200"}`}
        >
          EN
        </button>
        <button
          onClick={() => setLanguage("zh")}
          className={`px-3 py-1 rounded text-sm ${language === "zh" ? "bg-[#c9b8a1] text-white" : "bg-gray-200"}`}
        >
          中文
        </button>
      </div>

      <button
        onClick={() => router.push("/")}
        className="absolute top-6 left-6 rounded-lg bg-white px-4 py-2 shadow hover:bg-gray-50 text-sm text-gray-700"
      >
        {t("back")}
      </button>

      <div className="bg-white rounded-2xl shadow-lg p-10 text-center w-full max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{t("loginTitle")}</h1>
        <p className="text-gray-600 mb-6">{t("loginDesc")}</p>

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-3 mb-6 text-left">
            <label className="block text-sm text-gray-700">{t("emailLabel")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)] text-black"
              placeholder={t("emailPlaceholder")}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-4 py-2 rounded-xl bg-[var(--brand-color)] text-white hover:bg-[var(--brand-color-hover)] disabled:opacity-60"
            >
              {loading ? t("sending") : t("sendCode")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-3 mb-6 text-left">
            <label className="block text-sm text-gray-700">{t("codeLabel")}</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)] text-black"
              placeholder={t("codePlaceholder")}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-4 py-2 rounded-xl bg-[var(--brand-color)] text-white hover:bg-[var(--brand-color-hover)] disabled:opacity-60"
            >
              {loading ? t("verifying") : t("verifyAndLogin")}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full mt-2 text-blue-500 hover:underline"
              disabled={loading}
            >
              {t("resendCode")}
            </button>
          </form>
        )}

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-500">{t("or")}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="grid gap-3">
          <button
            onClick={() => signInWithProvider("github")}
            disabled={loading}
            className="w-full px-4 py-2 rounded-xl border hover:bg-gray-50 text-black flex items-center justify-center gap-3"
          >
            <img src="/github.svg" alt="GitHub" className="w-5 h-5" />
            {t("githubLogin")}
          </button>
          <button
            onClick={() => signInWithProvider("google")}
            disabled={loading}
            className="w-full px-4 py-2 rounded-xl border hover:bg-gray-50 text-black flex items-center justify-center gap-3"
          >
            <img src="/google.svg" alt="Google" className="w-5 h-5" />
            {t("googleLogin")}
          </button>
        </div>

        {message && <p className="text-sm text-red-500 mt-4">{message}</p>}
      </div>
    </main>
  );
}