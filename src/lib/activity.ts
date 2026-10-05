// ============================================================
// hodi - Đang gõ hay không
//
// Chỉ sống trong RAM. Dùng cho hai việc:
// - typingStore: các link góc trên mờ đi khi đang gõ.
// - lastInputAt: Today chỉ tự sang ngày mới khi đã lâu không gõ.
// ============================================================

import { memoryStore } from '@/lib/store';

export const typingStore = memoryStore(false);

let lastInput = 0;

export function markInput(): void {
  lastInput = Date.now();
  typingStore.set(true);
}

export function lastInputAt(): number {
  return lastInput;
}
