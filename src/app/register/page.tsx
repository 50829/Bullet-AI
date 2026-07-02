"use client";

import { CircleAlert, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { isPasswordStrong } from "../../lib/auth/passwordValidation";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage } from "../context/LanguageContext";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-muted)] px-4 py-2 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

const passwordInputClassName =
  "w-full rounded-lg border border-[var(--color-border-muted)] py-2 pl-4 pr-12 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

const invalidInputClassName =
  "w-full rounded-lg border border-red-500 px-4 py-2 text-[var(--color-text-primary)] focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500";

const invalidPasswordInputClassName =
  "w-full rounded-lg border border-red-500 py-2 pl-4 pr-12 text-[var(--color-text-primary)] focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const passwordIsStrong = isPasswordStrong(password);
  const passwordsMatch = password === confirmPassword;
  const showPasswordError =
    (passwordTouched || submitted) && password.length > 0 && !passwordIsStrong;
  const showConfirmPasswordError =
    (confirmPasswordTouched || submitted) &&
    confirmPassword.length > 0 &&
    !passwordsMatch;

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setMessage(null);

    if (!email || !password || !confirmPassword || !passwordIsStrong || !passwordsMatch) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Registration error:", error);
        setMessage(t("registrationFailedGeneric"));
        return;
      }

      if (data.user?.identities?.length === 0) {
        setMessage(t("emailAlreadyRegistered"));
        return;
      }

      router.push("/login");
    } catch (error) {
      console.error("Unexpected registration error:", error);
      setMessage(t("registrationFailedGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4 py-8 text-[var(--color-text-primary)]">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-8 text-center shadow-sm">
        <h1 className="mb-6 text-3xl font-bold text-[var(--color-text-primary)]">
          {t("registerTitle")}
        </h1>

        <form onSubmit={handleRegister} className="mb-6 space-y-5 text-left">
          <div className="space-y-2">
            <label htmlFor="register-email" className="block text-sm">
              {t("setEmail")}
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClassName}
              placeholder={t("confirmEmailPlaceholder")}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="register-password" className="block text-sm">
              {t("setPassword")}
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setPasswordTouched(true)}
                aria-invalid={showPasswordError}
                aria-describedby={showPasswordError ? "password-error" : undefined}
                className={
                  showPasswordError
                    ? invalidPasswordInputClassName
                    : passwordInputClassName
                }
                placeholder={t("setPasswordPlaceholder")}
                disabled={loading}
                required
              />
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                title={showPassword ? t("hidePassword") : t("showPassword")}
                disabled={loading}
              >
                {showPassword ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
              </button>
            </div>
            {showPasswordError && (
              <p
                id="password-error"
                className="flex items-start gap-1.5 text-xs leading-5 text-red-500"
                role="alert"
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{t("passwordTooWeak")}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="register-confirm-password" className="block text-sm">
              {t("confirmPassword")}
            </label>
            <input
              id="register-confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={() => setConfirmPasswordTouched(true)}
              aria-invalid={showConfirmPasswordError}
              aria-describedby={
                showConfirmPasswordError ? "confirm-password-error" : undefined
              }
              className={showConfirmPasswordError ? invalidInputClassName : inputClassName}
              placeholder={t("confirmPasswordPlaceholder")}
              disabled={loading}
              required
            />
            {showConfirmPasswordError && (
              <p
                id="confirm-password-error"
                className="flex items-center gap-1.5 text-xs leading-5 text-red-500"
                role="alert"
              >
                <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                <span>{t("passwordMismatch")}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2.5 font-bold text-[var(--color-text-on-primary)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t("registering") : t("register")}
          </button>
        </form>

        <p className="text-sm">
          {t("alreadyAccount")} {" "}
          <Link href="/login" className="text-[var(--color-primary)] hover:underline">
            {t("login")}
          </Link>
        </p>

        {message && (
          <p className="mt-4 text-sm text-red-500" role="alert">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
