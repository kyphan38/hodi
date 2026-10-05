// ============================================================
// hodi - Allowlist phía client
//
// Chỉ là lớp chặn sớm cho dễ hiểu ("account not authorized"). Lớp bảo vệ thật
// là firestore.rules - client thì ai cũng sửa được.
// ============================================================

import type { User } from 'firebase/auth';

import { USE_EMULATORS } from '@/lib/firebase-client';

/** Email dùng với emulator khi chưa có .env.local - khớp scripts/rules.mjs --emu. */
export const DEV_EMAIL = 'dev@hodi.test';

/** Email được phép, đã chuẩn hoá ('' = chưa cấu hình). */
export const allowedEmail = (
  process.env.NEXT_PUBLIC_ALLOWED_USER_EMAIL || (USE_EMULATORS ? DEV_EMAIL : '')
)
  .trim()
  .toLowerCase();

export function hasAllowlist(): boolean {
  return allowedEmail !== '';
}

export function isAllowedUser(user: User | null): boolean {
  if (!user?.email || !allowedEmail) return false;
  return user.email.trim().toLowerCase() === allowedEmail;
}
