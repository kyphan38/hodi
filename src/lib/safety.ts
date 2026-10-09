// ============================================================
// hodi - Signs of self-harm in today's text
//
// Runs on the device only, nothing is sent anywhere, and it works with AI off.
// A match shows one quiet line on the page. Phrases are long on purpose:
// unaccented Vietnamese is ambiguous ("tu tu" is usually "từ từ").
// Pure file.
// ============================================================

import type { AiLang } from '@/lib/prefs';

const PHRASES: readonly string[] = [
  // English
  'kill myself',
  'killing myself',
  'suicide',
  'suicidal',
  'end my life',
  'want to die',
  'wanna die',
  'self-harm',
  'self harm',
  'hurt myself',
  'cut myself',
  'no reason to live',
  'better off dead',
  // Vietnamese
  'tự tử',
  'tự sát',
  'muốn chết',
  'muon chet',
  'không muốn sống',
  'khong muon song',
  'chết đi cho xong',
  'kết thúc cuộc đời',
  'kết liễu',
  'tự làm hại',
  'tự làm đau',
  'rạch tay',
  'không còn lý do để sống',
];

export function needsSupport(text: string): boolean {
  const t = text.normalize('NFC').toLowerCase();
  return PHRASES.some((p) => t.includes(p));
}

// 115 = Vietnam emergency medical line.
export const SUPPORT_LINE: Record<AiLang, string> = {
  vi: 'Nếu bạn đang nghĩ đến việc làm hại bản thân, hãy gọi 115 hoặc nói với một người bạn tin ngay bây giờ.',
  en: 'If you are thinking about hurting yourself, call 115 or talk to someone you trust now.',
};
