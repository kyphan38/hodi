'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import GrowText from '@/components/GrowText';

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Snapshot đầu tiên đã về: lúc này mới đặt con trỏ về cuối. */
  loaded: boolean;
  /** Đặt con trỏ ở cuối bài khi mở trang. */
  focusOnLoad?: boolean;
  label: string;
  /** Hiện ngay dưới chữ (vd: "done"). */
  below?: ReactNode;
};

/**
 * Sửa cả một trang thô (ngày cũ khi bấm Edit, review). Phần đệm lớn phía dưới
 * để dòng đang gõ luôn kéo lên được trên bàn phím iPhone; chạm vào đó là focus
 * về cuối bài. Trang hôm nay dùng các khối riêng (TodayView), không dùng cái này.
 */
export default function Editor({ value, onChange, placeholder, loaded, focusOnLoad, label, below }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const focusedOnce = useRef(false);

  const focusEnd = () => {
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  };

  // Mở ra → con trỏ ở cuối bài, cuộn sẵn tới đó. (iOS không bật bàn phím khi
  // focus không do chạm - khi đó chạm vào chỗ trống là xong.)
  useEffect(() => {
    if (!loaded || !focusOnLoad || focusedOnce.current) return;
    focusedOnce.current = true;
    focusEnd();
    const doc = document.documentElement;
    if (doc.scrollHeight > window.innerHeight * 1.6) window.scrollTo({ top: doc.scrollHeight });
  }, [loaded, focusOnLoad]);

  return (
    <div
      className="page-text min-h-[50dvh] cursor-text pb-[45dvh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) focusEnd();
      }}
    >
      <GrowText value={value} onChange={onChange} placeholder={placeholder} label={label} textareaRef={ref} />
      {below}
    </div>
  );
}
