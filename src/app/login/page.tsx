"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthCard } from "../components/auth/AuthCard";
import { AuthInput } from "../components/auth/AuthInput";
import { OAuthButton } from "../components/auth/OAuthButton";
import { PasswordField } from "../components/auth/PasswordField";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage } from "../context/LanguageContext";
import { getPostLoginRedirect } from "../../lib/auth/getPostLoginRedirect";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const nextPath = getPostLoginRedirect(searchParams.get("next"));

  const getOrigin = () =>
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL ?? "");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage(t("pleaseEnterEmailAndPassword"));
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setMessage(`登录失败：${error.message}`);
      } else {
        router.replace(nextPath);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessage(`错误：${errorMsg}`);
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
        redirectTo: `${getOrigin()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        queryParams: provider === "github" ? { prompt: "login" } : undefined,
      },
    });
    if (error) {
      setLoading(false);
      setMessage(error.message);
    }
  };

  return (
    <AuthCard title={t("loginTitle")}>
      <OAuthButton
        onClick={() => signInWithProvider("google")}
        disabled={loading}
        label={t("googleLogin")}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
          </svg>
        }
      />

      <OAuthButton
        onClick={() => signInWithProvider("github")}
        disabled={loading}
        label={t("githubLogin")}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        }
      />

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-gray-500">{t("or")}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={handleLogin} className="mb-6 space-y-5 text-left">
        <div className="space-y-2">
          <label
            htmlFor="login-email"
            className="block text-sm text-[var(--color-text-primary)]"
          >
            {t("emailLabel")}
          </label>
          <AuthInput
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="login-password"
            className="block text-sm text-[var(--color-text-primary)]"
          >
            {t("passwordLabel")}
          </label>
          <PasswordField
            id="login-password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            disabled={loading}
            visible={showPassword}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
            onToggleVisible={() => setShowPassword((visible) => !visible)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2.5 font-bold text-[var(--color-text-on-primary)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t("loggingIn") : t("login")}
        </button>
      </form>

      <p className="text-sm">
        <Link
          href="/register"
          className="text-[var(--color-primary)] hover:underline"
        >
          {t("registerTip")}
        </Link>
      </p>

      {message && (
        <p className="mt-4 text-sm text-red-500" role="alert">
          {message}
        </p>
      )}
    </AuthCard>
  );
}
