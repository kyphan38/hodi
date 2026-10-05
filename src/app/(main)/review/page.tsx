import { Suspense } from 'react';

import ReviewView from '@/components/ReviewView';

// Kỳ review nằm ở ?p=2026-W40 / ?p=2026-10 (web tĩnh, không có route động).
export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewView />
    </Suspense>
  );
}
