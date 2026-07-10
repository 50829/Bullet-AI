// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LanguageProvider } from "../shared/i18n/LanguageContext";
import { Suspense } from "react";
import { LoadingState } from "../shared/components/ui/LoadingState";
import { ToastProvider } from "../shared/components/ui/Toast";
import { PreferencesProvider } from "../lib/profile/PreferencesContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bullet-AI",
  description: "以 Today 为入口的个人记录、目标与习惯工作区",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Suspense fallback={<LoadingState />}>
          <PreferencesProvider>
            <LanguageProvider>
              <ToastProvider>{children}</ToastProvider>
            </LanguageProvider>
          </PreferencesProvider>
        </Suspense>
      </body>
    </html>
  );
}
