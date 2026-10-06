import { Suspense } from 'react';

import DayView from '@/components/DayView';

// The day lives in ?d=… because a static site has no dynamic routes.
// useSearchParams needs a Suspense boundary when prerendering.
export default function DayPage() {
  return (
    <Suspense>
      <DayView />
    </Suspense>
  );
}
