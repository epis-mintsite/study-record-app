import { TimeSlot, StandardCategory } from './types';

const CATEGORY_DICTIONARY: Record<StandardCategory, string[]> = {
  '国語': ['国語', '漢字', '古文', '現代文', '読解', '作文', '読書'],
  '数学': ['数学', '算数', '計算', '方程式', '図形'],
  '英語': ['英語', 'English', '英単語', '英文法', 'リスニング', '英作文'],
  '理科': ['理科', '物理', '化学', '生物', '地学', '実験'],
  '社会': ['社会', '歴史', '地理', '公民', '日本史', '世界史'],
  'その他': ['勉強', '宿題', '復習', '予習'],
};

// Time regex: \d{1,2}時 but NOT followed by 間 (to avoid matching "1時" in "1時間")
const TIME_REGEX = /(?:(朝|午前|昼|お昼|午後|夕方|夜|晩))?\s*(\d{1,2})時(?!間)(?:(\d{1,2})分|(半))?/g;

function normalizeTime(raw: string): string | null {
  const match = raw.match(/(?:(朝|午前|昼|お昼|午後|夕方|夜|晩))?\s*(\d{1,2})時(?!間)(?:(\d{1,2})分|(半))?/);
  if (!match) return null;

  const prefix = match[1] || '';
  let hour = parseInt(match[2], 10);
  let minute = 0;

  if (match[3]) {
    minute = parseInt(match[3], 10);
  } else if (match[4] === '半') {
    minute = 30;
  }

  if (prefix === '朝' || prefix === '午前') {
    if (hour === 12) hour = 0;
  } else if (prefix === '昼' || prefix === 'お昼') {
    if (hour < 12) hour = 12;
  } else if (prefix === '午後' || prefix === '夕方') {
    if (hour < 12) hour += 12;
  } else if (prefix === '夜' || prefix === '晩') {
    if (hour <= 7) hour += 12;
    if (hour < 18) hour += 12;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseDuration(text: string): number | null {
  const hoursMinutes = text.match(/(\d+)時間(\d+)分/);
  if (hoursMinutes) return parseInt(hoursMinutes[1]) * 60 + parseInt(hoursMinutes[2]);

  const hoursHalf = text.match(/(\d+)時間半/);
  if (hoursHalf) return parseInt(hoursHalf[1]) * 60 + 30;

  const hoursOnly = text.match(/(\d+)時間/);
  if (hoursOnly) return parseInt(hoursOnly[1]) * 60;

  // Match "30分" but NOT inside "9時30分" (i.e., not preceded by 時)
  const minutesOnly = text.match(/(?<!時)(\d+)分/);
  if (minutesOnly) return parseInt(minutesOnly[1]);

  return null;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function detectCategory(
  text: string,
  customCategories: string[]
): { category: string; isCustomCategory: boolean; matchedKeyword: string } {
  for (const custom of customCategories) {
    if (text.includes(custom)) {
      return { category: custom, isCustomCategory: true, matchedKeyword: custom };
    }
  }

  for (const [cat, keywords] of Object.entries(CATEGORY_DICTIONARY)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        return { category: cat as StandardCategory, isCustomCategory: false, matchedKeyword: kw };
      }
    }
  }

  return { category: 'その他', isCustomCategory: false, matchedKeyword: '' };
}

function extractNote(text: string, category: string, matchedKeyword: string): string | undefined {
  let note = text
    // Remove time expressions (including duration patterns)
    .replace(/(?:朝|午前|昼|お昼|午後|夕方|夜|晩)?\s*\d{1,2}時(?!間)(?:\d{1,2}分|半)?/g, '')
    .replace(/\d+時間(?:\d+分|半)?/g, '')
    .replace(/(?<!時)\d+分/g, '')
    // Remove structural particles and verbs
    .replace(/から|まで|に|を|で|の|しました|やりました|勉強しました|行いました|やる|する/g, '')
    // Remove the category name and the matched keyword only (not all keywords)
    .replace(new RegExp(category, 'g'), '')
    .replace(new RegExp(matchedKeyword, 'g'), '')
    .trim();

  return note.length > 0 ? note : undefined;
}

export function parseVoiceInput(text: string, customCategories: string[]): TimeSlot[] {
  const results: TimeSlot[] = [];

  const segments = text
    .split(/[、。]|その後|次に|それから/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let previousEndTime: string | null = null;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // Reset regex state and find all time matches
    const timeMatches = [...seg.matchAll(new RegExp(TIME_REGEX.source, 'g'))];

    // Case A: at least one explicit time
    if (timeMatches.length >= 1) {
      const startRaw = timeMatches[0][0];
      const startTime = normalizeTime(startRaw);
      if (!startTime) {
        console.warn(`[parseVoiceInput] 時刻の正規化に失敗しました: "${startRaw}"`);
        continue;
      }

      let endTime: string | null = null;

      // Explicit end time
      if (timeMatches.length >= 2) {
        endTime = normalizeTime(timeMatches[1][0]);
      }

      // Duration expression
      if (!endTime) {
        const duration = parseDuration(seg);
        if (duration) {
          endTime = addMinutes(startTime, duration);
        }
      }

      // Next segment's start time
      if (!endTime && i + 1 < segments.length) {
        const nextMatches = [...segments[i + 1].matchAll(new RegExp(TIME_REGEX.source, 'g'))];
        if (nextMatches.length > 0) {
          endTime = normalizeTime(nextMatches[0][0]);
        }
      }

      if (!endTime) {
        console.warn(`[parseVoiceInput] 終了時刻を検出できませんでした: "${seg}"`);
        continue;
      }

      const { category, isCustomCategory, matchedKeyword } = detectCategory(seg, customCategories);
      const note = extractNote(seg, category, matchedKeyword);

      results.push({ startTime, endTime, category, isCustomCategory, note });
      previousEndTime = endTime;

    // Case B: no explicit time but there's a duration and a previous end time
    } else {
      const duration = parseDuration(seg);
      if (duration && previousEndTime) {
        const startTime = previousEndTime;
        const endTime = addMinutes(startTime, duration);
        const { category, isCustomCategory, matchedKeyword } = detectCategory(seg, customCategories);
        const note = extractNote(seg, category, matchedKeyword);
        results.push({ startTime, endTime, category, isCustomCategory, note });
        previousEndTime = endTime;
      } else {
        console.warn(`[parseVoiceInput] 時刻を検出できませんでした: "${seg}"`);
      }
    }
  }

  return results;
}
