// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LanguageProvider } from "../shared/i18n/LanguageContext";
import { Suspense } from "react";
import { LoadingState } from "../shared/components/ui/LoadingState";
import { ToastProvider } from "../shared/components/ui/Toast";
import { ProfileProvider } from "../lib/profile/ProfileContext";
import { PreferencesProvider } from "../lib/profile/PreferencesContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BulletAI",
  description: "利用BulletAI，活成自己梦想中的样子",
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
          <ProfileProvider>
            <PreferencesProvider>
              <LanguageProvider>
                <ToastProvider>{children}</ToastProvider>
              </LanguageProvider>
            </PreferencesProvider>
          </ProfileProvider>
        </Suspense>
      </body>
    </html>
  );
}
