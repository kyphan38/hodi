import { Suspense } from 'react';

import ReviewView from '@/components/ReviewView';

// The review period lives in ?p=2026-W40 / ?p=2026-10 (static site, no dynamic routes).
export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewView />
    </Suspense>
  );
}
