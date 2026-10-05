// ============================================================
// hodi - Đồng hồ dùng chung (chép từ fina/src/lib/clock.ts)
//
// React 19 cấm gọi Date.now() trong lúc render. Đọc giờ ở một chỗ, cập nhật
// mỗi phút và mỗi lần app quay lại foreground, trả về qua useSyncExternalStore.
// Nhờ vậy trang tự nhận ra đã sang ngày mới (04:00) dù app mở sẵn qua đêm.
// ============================================================

const TICK_MS = 60_000;

let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick() {
  now = Date.now();
  listeners.forEach((l) => l());
}

function onVisibility() {
  if (document.visibilityState === 'visible') tick();
}

export const clockStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    if (!timer) {
      timer = setInterval(tick, TICK_MS);
      document.addEventListener('visibilitychange', onVisibility);
    }
    return () => {
      listeners.delete(fn);
      if (listeners.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  },
  get: () => now,
  // Server không có "bây giờ" nào đúng cho client - trả 0, render sau khi
  // hydrate sẽ điền giá trị thật.
  getServer: () => 0,
};
