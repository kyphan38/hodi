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
// the day's question is picked by a hash of the date. The AI function `daily`
// takes 200 questions at most, so it gets a window of the list (aiCandidates).
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
  // work
  'What did you do at work today that you are proud of?',
  'What problem at work is still on your mind?',
  'Who at work made your day easier?',
  'Who at work is hard for you, and why?',
  'What did you say yes to at work that you should have said no to?',
  'What would you change about your job if you could?',
  'When did you feel in flow at work today?',
  'What are you avoiding at work?',
  'What feedback did you get lately, and what is true in it?',
  'What do you want your boss to know?',
  'What part of your work would you do even without pay?',
  'Where do you want to be in your work in three years?',
  'What did you learn at work this week?',
  'What meeting or task felt like a waste of time?',
  'How did you take care of yourself during work today?',
  'Right now, do you work to live, or live to work?',
  'What is one task you can hand off or drop?',
  'What would make tomorrow at work easier?',
  'What are you good at that your work does not use?',
  'List three wins at work this week, big or small.',
  'Finish this sentence: At work, I wish I could ...',
  // family
  'Who in your family did you think about today?',
  'When did you last call your parents, and how did it feel?',
  'What do you love most about your family?',
  'What is hard about your family right now?',
  'What did your parents give up for you?',
  'What habit did you get from your mother or father?',
  'What family moment do you want to remember forever?',
  'What do you wish your family understood about you?',
  'What old family hurt are you still carrying?',
  'How are you like your parents, and how are you different?',
  'What can you do this week for someone in your family?',
  'What family tradition do you want to keep?',
  'What would you like to ask your grandparents?',
  'What do you need to forgive in your family?',
  'What did home feel like when you were a child?',
  'What kind of family do you want to build?',
  'What do you share with your brothers, sisters or cousins?',
  'What did you argue about at home lately, and what was under it?',
  'List three things your family did for you this year.',
  'Finish this sentence: To my family, I want to say ...',
  // friends
  'Which friend made you laugh the most this year?',
  'Which friend could you call at 2 a.m.?',
  'What kind of friend have you been lately?',
  'Which friendship gives you energy, and which one takes it?',
  'Which friend have you lost touch with, and why?',
  'What did a friend teach you without knowing it?',
  'Who do you want to be closer friends with?',
  'When did a friend show up for you?',
  'When did you show up for a friend?',
  'What do you hide from your friends?',
  'Which friendship has changed, and how do you feel about it?',
  'What would you like to do with friends this month?',
  'Which friend do you envy, and what does it show you?',
  'What makes a good friend, for you?',
  'What memory with a friend still makes you smile?',
  'Do you feel more like yourself with old friends or new ones?',
  'List your closest friends, and one thing you love about each.',
  'Finish this sentence: A friend I miss is ...',
  // society and the world
  'What news stayed with you today?',
  'What in the world worries you right now?',
  'What in the world gives you hope right now?',
  'What kindness from a stranger did you see lately?',
  'How did you help someone you do not know?',
  'What problem in your city do you care about?',
  'What do you think is unfair in society?',
  'Where do you feel you belong?',
  'What community are you part of, and what does it give you?',
  'What do you believe that most people around you do not?',
  'How does social media make you feel lately?',
  'What would you change in your country if you could?',
  'What did you learn from someone very different from you?',
  'What small thing can you do for your neighborhood?',
  'Who do you look up to in public life, and why?',
  'When did you follow the crowd when you did not want to?',
  'What kind of world do you want to leave behind?',
  'Finish this sentence: The world needs more ...',
  // love
  'What do you need from a partner that you rarely say?',
  'When did you last feel close to someone you love?',
  'What does love look like in small daily things?',
  'What did you learn from your past relationships?',
  'What are you afraid of in love?',
  'How do you like to be loved?',
  'What fight keeps coming back, and what is it really about?',
  'What do you want love to feel like?',
  'What do you give in love, and what do you hope to get?',
  'What part of you do you hide from someone you love?',
  'Finish this sentence: I feel loved when ...',
  // money
  'What did money make easy or hard this week?',
  'What do you buy to feel better?',
  'How much money would be enough for you, and why?',
  'What did your family teach you about money?',
  'What money habit do you want to change?',
  'What would you save for if you could save more?',
  'What is worth paying more for in your life?',
  'What spending do you regret this month?',
  'How do you feel when you check your bank account?',
  'List what you spend on that truly makes you happy.',
  // learning and growth
  'What are you curious to learn next?',
  'What did you get better at this month?',
  'What book, video or talk changed how you think lately?',
  'What habit are you building, and how is it going?',
  'What did you fail at, and what did it teach you?',
  'Who do you want to learn from?',
  'What skill would change your life if you learned it?',
  'What did you stop doing that made life better?',
  'What are you practicing, even when it is boring?',
  'Finish this sentence: This month, I learned that ...',
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

/** Most questions the AI function `daily` accepts (checkCandidates). */
export const AI_MAX = 200;

/** The questions sent to AI for a day: 200 in a row, from a spot set by the date. */
export function aiCandidates(day: string): readonly string[] {
  const n = QUESTIONS.length;
  if (n <= AI_MAX) return QUESTIONS;
  const start = hash(day) % n;
  return Array.from({ length: AI_MAX }, (_, i) => QUESTIONS[(start + i) % n]);
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
