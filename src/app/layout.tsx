// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LanguageProvider } from "../shared/i18n/LanguageContext";
import { ThemeInitializer } from "./components/ThemeInitializer";
import { Suspense } from "react";
import { LoadingState } from "../shared/components/ui/LoadingState";
import { ToastProvider } from "../shared/components/ui/Toast";

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
        <ThemeInitializer />
        <Suspense fallback={<LoadingState />}>
          <LanguageProvider>
            <ToastProvider>{children}</ToastProvider>
          </LanguageProvider>
        </Suspense>
      </body>
    </html>
  );
}
