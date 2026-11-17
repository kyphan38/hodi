import { Suspense } from 'react';

import PrintView from '@/components/PrintView';

// The year lives in ?y= (static site). useSearchParams needs a Suspense boundary.
export default function PrintPage() {
  return (
    <Suspense>
      <PrintView />
    </Suspense>
  );
}
