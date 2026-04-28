import { StudyRecord, TimeSlot } from './types';

export const MOCK_RECORDS: StudyRecord[] = [
  {
    id: '1',
    userId: 'mock-user',
    date: '2026-04-21',
    timeSlots: [
      { startTime: '09:00', endTime: '10:00', category: '国語', isCustomCategory: false, note: '漢字ドリル' },
      { startTime: '10:00', endTime: '11:00', category: '数学', isCustomCategory: false, note: '方程式' },
      { startTime: '14:00', endTime: '15:30', category: '英語', isCustomCategory: false, note: '単語テスト' },
      { startTime: '20:00', endTime: '21:00', category: '理科', isCustomCategory: false },
    ],
    dailyTotals: { '国語': 60, '数学': 60, '英語': 90, '理科': 60 },
  },
  {
    id: '2',
    userId: 'mock-user',
    date: '2026-04-22',
    timeSlots: [
      { startTime: '09:30', endTime: '11:00', category: '数学', isCustomCategory: false, note: '図形' },
      { startTime: '16:00', endTime: '17:00', category: 'ピアノ', isCustomCategory: true },
      { startTime: '19:00', endTime: '20:00', category: '国語', isCustomCategory: false, note: '読解問題' },
    ],
    dailyTotals: { '数学': 90, 'ピアノ': 60, '国語': 60 },
  },
  {
    id: '3',
    userId: 'mock-user',
    date: '2026-04-23',
    timeSlots: [
      { startTime: '08:00', endTime: '09:00', category: '英語', isCustomCategory: false, note: 'リスニング' },
      { startTime: '10:00', endTime: '12:00', category: '社会', isCustomCategory: false, note: '歴史まとめ' },
      { startTime: '14:00', endTime: '15:00', category: '理科', isCustomCategory: false },
      { startTime: '19:30', endTime: '20:30', category: '数学', isCustomCategory: false },
    ],
    dailyTotals: { '英語': 60, '社会': 120, '理科': 60, '数学': 60 },
  },
  {
    id: '4',
    userId: 'mock-user',
    date: '2026-04-24',
    timeSlots: [
      { startTime: '10:00', endTime: '11:30', category: '英語', isCustomCategory: false, note: '英作文' },
      { startTime: '16:00', endTime: '17:00', category: 'ピアノ', isCustomCategory: true },
      { startTime: '20:00', endTime: '21:30', category: '国語', isCustomCategory: false, note: '作文' },
    ],
    dailyTotals: { '英語': 90, 'ピアノ': 60, '国語': 90 },
  },
  {
    id: '5',
    userId: 'mock-user',
    date: '2026-04-25',
    timeSlots: [
      { startTime: '09:00', endTime: '10:30', category: '数学', isCustomCategory: false },
      { startTime: '13:00', endTime: '14:00', category: '社会', isCustomCategory: false },
      { startTime: '15:00', endTime: '16:30', category: '理科', isCustomCategory: false, note: '実験レポート' },
    ],
    dailyTotals: { '数学': 90, '社会': 60, '理科': 90 },
  },
];

export function computeDailyTotals(timeSlots: TimeSlot[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const slot of timeSlots) {
    const [sh, sm] = slot.startTime.split(':').map(Number);
    const [eh, em] = slot.endTime.split(':').map(Number);
    const minutes = (eh * 60 + em) - (sh * 60 + sm);
    if (minutes > 0) {
      totals[slot.category] = (totals[slot.category] || 0) + minutes;
    }
  }
  return totals;
}

export function getWeekDates(referenceDate: Date): Date[] {
  const day = referenceDate.getDay();
  const monday = new Date(referenceDate);
  // Adjust to Monday (0=Sun, 1=Mon, ..., 6=Sat)
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(referenceDate.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
