// ============================================================
// hodi - Daily prompt questions
//
// Today's page shows one faint question, plus "another" and "free write".
// Typing answers it; "done" closes it and the next one appears. Answering is
// optional, nothing is counted. Goal: make it easy to be honest about feelings
// and face the facts - without pressure (too many questions make people quit).
//
// Short prompts, easy English: questions, lists ("List three ...") and
// sentences to finish. Add or remove freely; order does not matter because
// the day's question is picked by a hash of the date. Keep 200 at most: the
// AI function `daily` rejects a longer list.
// ============================================================

import { QUESTION_RE } from '@/lib/day';

export const QUESTIONS: readonly string[] = [
  // feelings
  'What are you feeling right now, in one honest word?',
  'What took most of your energy today?',
  'What gave you a little energy back today?',
  'When did you feel most like yourself today?',
  'What feeling did you push away today?',
  'What is sitting heavy in your chest right now?',
  'What made you smile, even a little?',
  'What emotion showed up most today, and when?',
  'What are you worried about that you have not said out loud?',
  'What do you need right now that you are not giving yourself?',
  'List three feelings you had today, from small to big.',
  'What feeling came up today that surprised you?',
  'What made you feel small today?',
  'What made you feel calm today, even for a moment?',
  'If your mood today were weather, what would it be?',
  'What are you carrying that is not yours to carry?',
  'When did you want to cry today?',
  'What are you tired of?',
  'Finish this sentence: Right now, I wish ...',
  // honesty
  'What did you avoid saying today?',
  'What are you pretending not to know?',
  'What would you say if no one would ever read this?',
  'What is one thing you did today that you are not proud of?',
  'Where did you say yes when you meant no?',
  'What story are you telling yourself that may not be true?',
  'What did you do today only to look good?',
  'What are you avoiding by staying busy?',
  'What do you keep saying you will do but never start?',
  'Where were you not honest with yourself today?',
  'List the things you complained about today. Which ones can you change?',
  'Finish this sentence: The truth is ...',
  'What did you do today that you would not want to explain?',
  'What do you know you should do, but do not want to?',
  'What excuse did you use today?',
  'Where did you act more sure than you felt?',
  'What do you want that you are shy to admit?',
  'What did you promise yourself lately, and did you keep it?',
  'Finish this sentence: I tell people I am fine, but ...',
  'Finish this sentence: What I really want is ...',
  // shadow
  'Who annoyed you today, and what does that say about you?',
  'What are you afraid people will find out about you?',
  'What are you jealous of right now?',
  'What part of yourself did you hide today?',
  'What are you still angry about?',
  'Which habit is quietly costing you the most?',
  'What do you criticize in others that you also do?',
  'What would you do if you were not afraid of looking stupid?',
  'List three things you blame others for. What was your part?',
  'What do you still feel guilty about?',
  'What kind words are hard for you to accept?',
  'What failure do you still not talk about?',
  'What do you need people to think about you?',
  'What did you try to control today?',
  'Who have you not forgiven yet?',
  'What do you do that you would not accept from a friend?',
  // body
  'How did your body feel today?',
  'Did you rest today, or only stop?',
  'Where in your body do you feel stress right now?',
  'How did you sleep, eat and move today?',
  'What does your body want more of this week?',
  'When did you feel most awake today?',
  'When did you last feel truly rested?',
  'What would help you sleep better tonight?',
  'How much time did you spend on your phone today, and how did it feel?',
  'When did you go outside today, and how did it feel?',
  // people
  'Who did you think about most today?',
  'What do you wish someone had asked you today?',
  'Who do you owe a message, an apology, or a thank you?',
  'When did you feel alone today?',
  'What did someone do today that you want to remember?',
  'Who made you feel safe today?',
  'Which conversation today is still on your mind?',
  'Who do you miss right now?',
  'List the people you talked to today, and one word for each.',
  'Who did you help today, even in a small way?',
  'Who helped you today, and do they know it?',
  'What do you want to tell your parents but have not?',
  'Who do you feel distant from lately?',
  'Which friend have you not talked to for too long?',
  'Who leaves you tired after you see them?',
  'Who brings out the best in you?',
  'When did you really listen to someone today?',
  'What did you learn about someone today?',
  'Think of one person. Finish this sentence: I wish you knew ...',
  // change
  'What is one small thing you can do differently tomorrow?',
  'What are you ready to stop doing?',
  'What truth do you need to accept to move forward?',
  'What did today teach you?',
  'If today happened again, what would you change?',
  'What are you waiting for permission to do?',
  'What would make tomorrow ten percent better?',
  'What do you want to be true one year from now?',
  'What decision have you been putting off?',
  'List three things you can let go of this week.',
  'List the top three things that matter tomorrow.',
  'Finish this sentence: Next time, I will ...',
  'What is the smallest next step on the thing you keep avoiding?',
  'What do you do now only because you always have?',
  'What did you do today that your future self will thank you for?',
  'What are you doing better than one year ago?',
  'What would you try if you knew it might fail?',
  'What is one thing you can say no to this week?',
  'What mistake do you keep making?',
  'Finish this sentence: This week, I will stop ...',
  // small joys
  'What was the best ten minutes of your day?',
  'What small thing are you grateful for today?',
  'What did you notice today that you usually miss?',
  'What are you looking forward to?',
  'What went better than you expected?',
  'What did you learn or read today that stayed with you?',
  'What made you laugh today?',
  'List three good things that happened today, however small.',
  'List five things around you that you like.',
  'List what you did today, from morning to night.',
  'Finish this sentence: Today I am glad that ...',
  'Write about today as if you were telling an old friend.',
  'What sound, smell or taste do you remember from today?',
  'What did you enjoy today that cost nothing?',
  'What was beautiful today?',
  'What made today different from yesterday?',
  'What did you do today only for fun?',
  'What are you enjoying now that will not last forever?',
  'List three things you have now that you once wished for.',
  'Describe one moment from today as if it were a photo.',
  // memories
  'What memory came back to you today?',
  'What did you love as a child that you stopped doing?',
  'What would you tell yourself from ten years ago?',
  'Which moment changed you the most?',
  'What place do you miss, and why?',
  'What did your family teach you that you still believe?',
  'What did your family teach you that you no longer believe?',
  'Who were you trying to be five years ago?',
  // meaning
  'What mattered most to you today?',
  'What did you spend time on today that did not matter?',
  'What do you want your life to be about?',
  'What will you regret not trying when you are old?',
  'What does a good day look like for you?',
  'What would be enough for you right now?',
  'When did you last feel proud of yourself?',
  'What do you believe now that you did not believe a year ago?',
  'Whose life do you admire, and which part of it do you want?',
  'Finish this sentence: I want to be someone who ...',
  // work and money
  'What did you work on today that felt worth it?',
  'What did you finish today?',
  'What part of your work drains you the most?',
  'What are you learning right now, and is it working?',
  'What did you spend money on today, and was it worth it?',
  'What worries you about money right now?',
  'What would you do with your time if money did not matter?',
  'What skill do you want to be better at one year from now?',
  // kindness to yourself
  'What did you do well today that no one noticed?',
  'What would you say to a friend who had your day?',
  'What are you being too hard on yourself about?',
  'What can you forgive yourself for today?',
  'What hard thing did you get through that you once thought you could not?',
  'What do you like about yourself today?',
  'What can wait until tomorrow?',
  'List three things you did right today.',
  'Finish this sentence: It is okay that ...',
  // time and attention
  'What did you do on autopilot today?',
  'What took longer than it should have today?',
  'When did time go fast today?',
  'What did you keep thinking about today?',
  'What would you cut from today if you could?',
  'What interrupted you most today?',
  'What did you read, watch or scroll today that you did not need?',
  'What deserves more of your attention this week?',
  // fear and courage
  'What scares you a little right now?',
  'What is the worst that could happen, and could you handle it?',
  'When were you brave today, even a little?',
  'What risk are you glad you took?',
  'What hard conversation do you need to have?',
  'What are you holding on to because it feels safe?',
  'Finish this sentence: I am afraid that ...',
  // love and closeness
  'How did you show love today?',
  'When did you last feel loved?',
  'What is hard to ask for from people close to you?',
  'What boundary do you need to set?',
  'Who do you want to spend more time with?',
  'What do people misunderstand about you?',
  'List three people you are lucky to know, and why.',
  // curiosity and imagination
  'What question has been on your mind lately?',
  'What do you want to understand better?',
  'What would a perfect ordinary Tuesday look like?',
  'If you had one free year, what would you do?',
  'What would you at fifty say about today?',
  'What did you change your mind about recently?',
  'What idea excited you lately?',
  'What would you do this weekend if no one expected anything from you?',
  'Write a short letter to yourself one year from now.',
  // home and daily life
  'What in your home makes you feel good?',
  'What small mess has been bothering you?',
  'What part of your routine is working well?',
  'What part of your day do you want to change?',
  'What did you eat or drink today that you want to remember?',
  'What did you see on the way somewhere today?',
  'What small thing did you fix this week?',
  'Where do you feel most at home?',
  'List what you want more of and less of next week.',
];

/** Simple string hash (FNV-1a 32-bit) - spreads evenly, same day same question. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The question for a day. `skip` goes up each time "another" is pressed. */
export function questionFor(day: string, skip = 0): string {
  const n = QUESTIONS.length;
  return QUESTIONS[(hash(day) + skip) % n];
}

/** Questions already in the page ("› …" lines). */
export function askedIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (QUESTION_RE.test(t)) out.add(t.slice(2));
  }
  return out;
}

/**
 * The next question (from `skip` on) not yet answered today. `picks` (AI: a
 * follow-up on a promise, then the day's chosen question) come first, then the
 * usual order; "another" moves one step along.
 */
export function nextQuestion(
  day: string,
  asked: Set<string>,
  skip: number,
  picks: readonly string[] = [],
): { question: string; skip: number } {
  const at = (i: number) => (i < picks.length ? picks[i] : questionFor(day, i - picks.length));
  const total = picks.length + QUESTIONS.length;
  for (let i = 0; i < total; i++) {
    const q = at(skip + i);
    if (!asked.has(q)) return { question: q, skip: skip + i };
  }
  return { question: at(skip), skip };
}
