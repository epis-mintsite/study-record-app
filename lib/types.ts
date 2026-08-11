export type StandardCategory = '国語' | '数学' | '英語' | '理科' | '社会' | 'その他';

export type TimeSlot = {
  startTime: string;
  endTime: string;
  category: StandardCategory | string;
  isCustomCategory: boolean;
  note?: string;
};

export type StudyRecord = {
  id: string;
  userId: string;
  date: string;
  timeSlots: TimeSlot[];
  dailyTotals: Record<string, number>;
};

export type CustomCategory = {
  id: string;
  userId: string;
  name: string;
  color: string;
};

export type UserProfile = {
  id: string;
  name: string;
  role: 'student' | 'parent';
  linkedStudentId?: string;
};

export const STANDARD_CATEGORIES: StandardCategory[] = ['国語', '数学', '英語', '理科', '社会', 'その他'];

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  '国語': { bg: 'bg-purple-100', text: 'text-purple-900', hex: '#F3E8FF' },
  '数学': { bg: 'bg-sky-100', text: 'text-sky-900', hex: '#E0F2FE' },
  '英語': { bg: 'bg-pink-100', text: 'text-pink-900', hex: '#FCE7F3' },
  '理科': { bg: 'bg-green-100', text: 'text-green-900', hex: '#DCFCE7' },
  '社会': { bg: 'bg-orange-100', text: 'text-orange-900', hex: '#FFEDD5' },
  'その他': { bg: 'bg-gray-100', text: 'text-gray-700', hex: '#F3F4F6' },
};

export const CUSTOM_CATEGORY_PRESETS = [
  '#FEF9C3', '#FEE2E2', '#D1FAE5', '#DBEAFE', '#EDE9FE', '#FCE7F3', '#FFF7ED', '#F0FDF4',
];

// ---- Test Results ----

export type TestType = '日本人学校' | 'epis' | '模試' | '検定' | 'その他';

export const TEST_TYPE_NAMES: Record<string, string[]> = {
  '日本人学校': ['中間テスト', '期末テスト', '単元テスト', '実力テスト'],
  'epis':       ['月例テスト', 'ハイレベルテスト', '漢字テスト', '英単語テスト'],
  '模試':       [],
  '検定':       ['英検', '漢検', 'TOEFL', 'IELTS', 'HSK'],
  'その他':     [],
};

export const TEST_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  '日本人学校': { bg: '#DBEAFE', text: '#1D4ED8' },
  'epis':       { bg: '#D1FAE5', text: '#065F46' },
  '模試':       { bg: '#FEF3C7', text: '#92400E' },
  '検定':       { bg: '#EDE9FE', text: '#5B21B6' },
  'その他':     { bg: '#F3F4F6', text: '#374151' },
};

export type TestScore = {
  subject: string;
  score?: number;
  maxScore?: number;
  grade?: string;
  passed?: boolean;
};

export type TestResult = {
  id: string;
  userId: string;
  date: string;
  testType: TestType;
  testName: string;
  scores: TestScore[];
  notes?: string;
  createdAt: string;
};

// ---- Past Exam Records（過去問演習） ----

export type ExamCategory = '一般' | '帰国';
export const EXAM_CATEGORIES: ExamCategory[] = ['一般', '帰国'];

export type PastExamScore = { subject: string; score: number; maxScore?: number };

export type PastExamRecord = {
  id: string;
  userId: string;
  schoolName: string;
  examCategory: ExamCategory;
  examYear: number;
  attemptDate: string;
  scores: PastExamScore[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

// 学校×入試区分×年度×科目の合格最低点（参考値・全校共有の参照データ）
export type SchoolPassingScore = {
  id: string;
  schoolName: string;
  examCategory: ExamCategory;
  examYear: number;
  subject: string;
  passingScore: number;
  maxScore?: number;
};

// ---- Weekly Review ----

export type WeeklyReview = {
  id: string;
  userId: string;
  weekStart: string;
  studySnapshot: Record<string, number>;
  reviewText: string;
  improvement: string;
  testStrategy: string;
  createdAt: string;
  updatedAt: string;
};
