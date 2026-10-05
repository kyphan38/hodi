/** users/{uid}/entries/{YYYY-MM-DD} - một ngày là một doc. */
export type Entry = {
  date: string;
  /** 'MM-DD', cho "On this day". */
  md: string;
  text: string;
  words: number;
  /** Câu hỏi đang hiện khi bắt đầu viết trang này (null = không dùng). */
  prompt: string | null;
  createdAt: number;
  updatedAt: number;
};

/** users/{uid}/reviews/{'2026-W40' | '2026-10'}. */
export type Review = {
  kind: 'week' | 'month';
  period: string;
  text: string;
  words: number;
  createdAt: number;
  updatedAt: number;
};

/** Trạng thái lưu, hiện bằng một chấm nhỏ.
 *  idle: chưa có gì để lưu · local: đã lưu trên máy, chưa lên cloud · synced: đã lên cloud. */
export type SaveStatus = 'idle' | 'local' | 'synced';
