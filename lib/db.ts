import { createClient } from './supabase';
import { StudyRecord, CustomCategory, TimeSlot } from './types';
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

export async function getUserRole(userId: string): Promise<'student' | 'parent' | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data?.role as 'student' | 'parent' | null;
}
