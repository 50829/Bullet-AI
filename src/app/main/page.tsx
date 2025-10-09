import { Suspense } from 'react';
import MainDashboardClient from './MainDashboardClient';

// Server component wrapper for /main to satisfy useSearchParams suspense requirement.
export const dynamic = 'force-dynamic';

export default function MainPage() {
  return (
    <Suspense fallback={<div className="p-6 text-lg text-gray-500">空间准备中</div>}>
      <MainDashboardClient />
    </Suspense>
  );
}