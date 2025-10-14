// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { LanguageProvider } from './context/LanguageContext';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BulletAI - Your Private Recording Space',
  description: '每一个灵魂，都值得被记录',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Suspense fallback={<div className="p-4 text-sm text-gray-500">Loading…</div>}>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </Suspense>
      </body>
    </html>
  );
}