// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeInitializer } from './components/ThemeInitializer';
import { Suspense } from 'react';
import { LoadingState } from './components/ui/LoadingState';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BulletAI',
  description: '利用BulletAI，活成自己梦想中的样子',
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
        <Suspense fallback={<LoadingState label="Loading" />}>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </Suspense>
      </body>
    </html>
  );
}
