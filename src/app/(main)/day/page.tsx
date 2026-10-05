import { Suspense } from 'react';

import DayView from '@/components/DayView';

// Ngày nằm ở ?d=… vì web tĩnh không có route động tuỳ ý.
// useSearchParams cần một Suspense boundary khi prerender.
export default function DayPage() {
  return (
    <Suspense>
      <DayView />
    </Suspense>
  );
}
