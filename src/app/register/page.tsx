"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthCard } from "../components/auth/AuthCard";
import { AuthInput } from "../components/auth/AuthInput";
import { PasswordField } from "../components/auth/PasswordField";
import { isPasswordStrong } from "../../lib/auth/passwordValidation";
import { supabase } from "../../lib/supabase/client";
import { useLanguage } from "../../shared/i18n/LanguageContext";

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

    if (
      !email ||
      !password ||
      !confirmPassword ||
      !passwordIsStrong ||
      !passwordsMatch
    ) {
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
    <AuthCard title={t("registerTitle")}>
      <form onSubmit={handleRegister} className="mb-6 space-y-5 text-left">
        <div className="space-y-2">
          <label htmlFor="register-email" className="block text-sm">
            {t("setEmail")}
          </label>
          <AuthInput
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("confirmEmailPlaceholder")}
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="register-password" className="block text-sm">
            {t("setPassword")}
          </label>
          <PasswordField
            id="register-password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onBlur={() => setPasswordTouched(true)}
            aria-invalid={showPasswordError}
            aria-describedby={showPasswordError ? "password-error" : undefined}
            invalid={showPasswordError}
            placeholder={t("setPasswordPlaceholder")}
            disabled={loading}
            required
            visible={showPassword}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
            onToggleVisible={() => setShowPassword((visible) => !visible)}
          />
          {showPasswordError && (
            <p
              id="password-error"
              className="flex items-start gap-1.5 text-xs leading-5 text-red-500"
              role="alert"
            >
              <CircleAlert
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>{t("passwordTooWeak")}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="register-confirm-password" className="block text-sm">
            {t("confirmPassword")}
          </label>
          <AuthInput
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
            invalid={showConfirmPasswordError}
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
        {t("alreadyAccount")}{" "}
        <Link
          href="/login"
          className="text-[var(--color-primary)] hover:underline"
        >
          {t("login")}
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
