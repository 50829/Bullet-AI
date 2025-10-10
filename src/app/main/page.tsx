import { Suspense } from 'react';
import MainDashboardClient from './MainDashboardClient';
import { AppProvider } from '../../context/AppContext';

// Server component wrapper for /main to satisfy useSearchParams suspense requirement.
export const dynamic = 'force-dynamic';

export default function MainPage() {
  return (
    <AppProvider>
      <Suspense fallback={<div className="p-6 text-lg text-gray-500">空间准备中</div>}>
        <MainDashboardClient />
      </Suspense>
    </AppProvider>
  );
}