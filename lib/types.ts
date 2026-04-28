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
