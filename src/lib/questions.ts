// ============================================================
// hodi - Câu hỏi gợi ý của ngày
//
// Mỗi ngày tối đa MỘT câu, hiện như chữ mờ trong trang trống, gõ là biến mất.
// Không bắt buộc trả lời. Mục tiêu: dễ thành thật với cảm xúc và dám nhìn
// thẳng sự thật - nhưng không tạo áp lực (nhiều câu quá là dễ bỏ cuộc).
//
// Câu ngắn, tiếng Anh dễ đọc. Thêm/bớt thoải mái; thứ tự không quan trọng
// vì câu của ngày được chọn bằng hash của ngày.
// ============================================================

export const QUESTIONS: readonly string[] = [
  // feelings
  'What are you feeling right now, in one honest word?',
  'What took most of your energy today?',
  'What gave you a little energy back today?',
  'When did you feel most like yourself today?',
  'What feeling did you push away today?',
  'What is sitting heavy in your chest right now?',
  'What made you smile, even a little?',
  // honesty
  'What did you avoid saying today?',
  'What are you pretending not to know?',
  'What would you say if no one would ever read this?',
  'What is one thing you did today that you are not proud of?',
  'Where did you say yes when you meant no?',
  'What story are you telling yourself that may not be true?',
  'What did you do today only to look good?',
  // shadow
  'Who annoyed you today, and what does that say about you?',
  'What are you afraid people will find out about you?',
  'What are you jealous of right now?',
  'What part of yourself did you hide today?',
  'What are you still angry about?',
  'Which habit is quietly costing you the most?',
  // body
  'How did your body feel today?',
  'Did you rest today, or only stop?',
  // people
  'Who did you think about most today?',
  'What do you wish someone had asked you today?',
  'Who do you owe a message, an apology, or a thank you?',
  'When did you feel alone today?',
  'What did someone do today that you want to remember?',
  // change
  'What is one small thing you can do differently tomorrow?',
  'What are you ready to stop doing?',
  'What truth do you need to accept to move forward?',
  'What did today teach you?',
  'If today happened again, what would you change?',
  'What are you waiting for permission to do?',
  'What would make tomorrow ten percent better?',
  // small joys
  'What was the best ten minutes of your day?',
  'What small thing are you grateful for today?',
  'What did you notice today that you usually miss?',
  'What are you looking forward to?',
  'What went better than you expected?',
  'Write about today as if you were telling an old friend.',
];

/** Hash chuỗi đơn giản (FNV-1a 32-bit) - đủ để rải đều, cùng ngày cùng câu. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Câu hỏi của một ngày. `skip` tăng mỗi lần bấm "another". */
export function questionFor(day: string, skip = 0): string {
  const n = QUESTIONS.length;
  return QUESTIONS[(hash(day) + skip) % n];
}
