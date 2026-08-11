import { createClient } from './supabase';
import { StudyRecord, CustomCategory, TimeSlot, TestType, TestScore, TestResult, WeeklyReview, PastExamRecord, PastExamScore, ExamCategory, SchoolPassingScore } from './types';
import { computeDailyTotals } from './mockData';

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return url.length > 0 && url !== 'your_supabase_project_url';
}

export async function getStudyRecords(userId: string, dates: string[]): Promise<StudyRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('study_records')
    .select('*')
    .eq('user_id', userId)
    .in('date', dates);
  if (error) throw new Error(`レコード取得エラー: ${error.message}`);
  return (data ?? []).map(row => ({
    id: row.id,
    userId: row.user_id,
    date: row.date,
    timeSlots: row.time_slots as TimeSlot[],
    dailyTotals: row.daily_totals as Record<string, number>,
  }));
}

export async function upsertStudyRecord(
  userId: string,
  date: string,
  timeSlots: TimeSlot[]
): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabaseが設定されていません。.env.local を確認してください。');
  const supabase = createClient();
  const { error } = await supabase
    .from('study_records')
    .upsert(
      { user_id: userId, date, time_slots: timeSlots, daily_totals: computeDailyTotals(timeSlots) },
      { onConflict: 'user_id,date' }
    );
  if (error) throw new Error(`保存エラー: ${error.message}`);
}

export async function getCustomCategories(userId: string): Promise<CustomCategory[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw new Error(`科目取得エラー: ${error.message}`);
  return (data ?? []).map(row => ({ id: row.id, userId: row.user_id, name: row.name, color: row.color }));
}

export async function saveCustomCategory(userId: string, name: string, color: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabaseが設定されていません。');
  const supabase = createClient();
  // iOS Safari で insert().select().single() が "Load failed" になるため
  // INSERT のみ実行し、呼び出し元で getCustomCategories() を使って再取得する
  const { error } = await supabase
    .from('categories')
    .insert({ user_id: userId, name, color });
  if (error) throw new Error(`科目保存エラー: ${error.message}`);
}

export async function updateCustomCategory(id: string, name: string, color: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabaseが設定されていません。');
  const supabase = createClient();
  const { error } = await supabase
    .from('categories')
    .update({ name, color })
    .eq('id', id);
  if (error) throw new Error(`科目更新エラー: ${error.message}`);
}

export async function deleteCustomCategory(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabaseが設定されていません。');
  const supabase = createClient();
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(`科目削除エラー: ${error.message}`);
}

export async function getLinkedStudentId(parentId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from('users')
    .select('linked_student_id')
    .eq('id', parentId)
    .single();
  if (error || !data) return null;
  return data.linked_student_id ?? null;
}

export async function getStudentProfile(studentId: string): Promise<{ name: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from('users')
    .select('name')
    .eq('id', studentId)
    .single();
  if (error || !data) return null;
  return { name: data.name };
}

export async function getUserRole(userId: string): Promise<'student' | 'parent' | 'admin' | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data?.role as 'student' | 'parent' | 'admin' | null;
}

// ---- Test Results ----

export async function getTestResults(userId: string): Promise<TestResult[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw new Error(`テスト取得エラー: ${error.message}`);
  return (data ?? []).map(row => ({
    id: row.id,
    userId: row.user_id,
    date: row.date,
    testType: row.test_type as TestType,
    testName: row.test_name,
    scores: row.scores as TestScore[],
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }));
}

export async function saveTestResult(
  userId: string,
  data: { date: string; testType: string; testName: string; scores: TestScore[]; notes?: string }
): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabaseが設定されていません。');
  const supabase = createClient();
  const { error } = await supabase.from('test_results').insert({
    user_id: userId,
    date: data.date,
    test_type: data.testType,
    test_name: data.testName,
    scores: data.scores,
    notes: data.notes ?? null,
  });
  if (error) throw new Error(`テスト保存エラー: ${error.message}`);
}

export async function deleteTestResult(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabaseが設定されていません。');
  const supabase = createClient();
  const { error } = await supabase.from('test_results').delete().eq('id', id);
  if (error) throw new Error(`テスト削除エラー: ${error.message}`);
}

// ---- Weekly Reviews ----

export async function getWeeklyReview(userId: string, weekStart: string): Promise<WeeklyReview | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from('weekly_reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    weekStart: data.week_start,
    studySnapshot: data.study_snapshot,
    reviewText: data.review_text,
    improvement: data.improvement,
    testStrategy: data.test_strategy,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function upsertWeeklyReview(
  userId: string,
  weekStart: string,
  payload: { studySnapshot: Record<string, number>; reviewText: string; improvement: string; testStrategy: string }
): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabaseが設定されていません。');
  const supabase = createClient();
  const { error } = await supabase.from('weekly_reviews').upsert(
    {
      user_id: userId,
      week_start: weekStart,
      study_snapshot: payload.studySnapshot,
      review_text: payload.reviewText,
      improvement: payload.improvement,
      test_strategy: payload.testStrategy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,week_start' }
  );
  if (error) throw new Error(`振返り保存エラー: ${error.message}`);
}

// ---- Past Exam Records（過去問演習） ----

export async function getPastExamRecords(userId: string): Promise<PastExamRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('past_exam_records')
    .select('*')
    .eq('user_id', userId)
    .order('attempt_date', { ascending: false });
  if (error) throw new Error(`過去問記録の取得エラー: ${error.message}`);
  return (data ?? []).map(row => ({
    id: row.id,
    userId: row.user_id,
    schoolName: row.school_name,
    examCategory: row.exam_category as ExamCategory,
    examYear: row.exam_year,
    attemptDate: row.attempt_date,
    scores: row.scores as PastExamScore[],
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function savePastExamRecord(
  userId: string,
  data: { schoolName: string; examCategory: ExamCategory; examYear: number; attemptDate: string; scores: PastExamScore[]; notes?: string }
): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabaseが設定されていません。');
  const supabase = createClient();
  const { error } = await supabase.from('past_exam_records').insert({
    user_id: userId,
    school_name: data.schoolName,
    exam_category: data.examCategory,
    exam_year: data.examYear,
    attempt_date: data.attemptDate,
    scores: data.scores,
    notes: data.notes ?? null,
  });
  if (error) throw new Error(`過去問記録の保存エラー: ${error.message}`);
}

export async function deletePastExamRecord(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabaseが設定されていません。');
  const supabase = createClient();
  const { error } = await supabase.from('past_exam_records').delete().eq('id', id);
  if (error) throw new Error(`過去問記録の削除エラー: ${error.message}`);
}

// ---- School Passing Scores（合格最低点・参考値。閲覧のみ。登録/編集は /api/admin/passing-scores） ----

export async function getPassingScores(): Promise<SchoolPassingScore[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('school_passing_scores')
    .select('*')
    .order('school_name');
  if (error) throw new Error(`合格最低点の取得エラー: ${error.message}`);
  return (data ?? []).map(row => ({
    id: row.id,
    schoolName: row.school_name,
    examCategory: row.exam_category as ExamCategory,
    examYear: row.exam_year,
    subject: row.subject,
    passingScore: row.passing_score,
    maxScore: row.max_score ?? undefined,
  }));
}
