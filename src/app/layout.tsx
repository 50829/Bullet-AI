// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Sidebar } from './components/layout/Sidebar'; // Using '@/' alias for cleaner imports

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BulletAI - Record Your Soul',
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
        <div className="flex h-screen bg-gray-50 font-sans">
          <Sidebar />
          <main className="flex-1 p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}