import { Suspense } from 'react';

import InsightView from '@/components/InsightView';

// A past day's history lives in ?d=2026-10-09 (static site, no dynamic routes).
export default function InsightPage() {
  return (
    <Suspense>
      <InsightView />
    </Suspense>
  );
}
