import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// JST の日付文字列を返す (offset: 0=今日, -1=昨日)
function jstDateStr(offset = 0): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000 + offset * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

// 今週月曜〜今日 (JST) の日付配列
function currentWeekDatesJST(): string[] {
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const day = nowJST.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(nowJST);
  monday.setUTCDate(nowJST.getUTCDate() + diff);

  const dates: string[] = [];
  const todayStr = nowJST.toISOString().slice(0, 10);
  const cur = new Date(monday);
  while (cur.toISOString().slice(0, 10) <= todayStr) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export async function GET(req: NextRequest) {
  // 認証チェック
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get('type') ?? 'week';
  const dates = type === 'yesterday' ? [jstDateStr(-1)] : currentWeekDatesJST();

  const admin = createAdminClient();

  // 生徒一覧を取得
  const { data: students, error: usersError } = await admin
    .from('users')
    .select('id, name')
    .eq('role', 'student');

  if (usersError || !students?.length) {
    return NextResponse.json([]);
  }

  const studentIds = students.map(s => s.id);

  // 対象期間の学習記録を取得
  const { data: records } = await admin
    .from('study_records')
    .select('user_id, daily_totals')
    .in('user_id', studentIds)
    .in('date', dates);

  // ユーザーごとに合計分数を集計
  const totals: Record<string, number> = {};
  for (const r of records ?? []) {
    const mins = Object.values(r.daily_totals as Record<string, number>)
      .reduce((a, b) => a + b, 0);
    totals[r.user_id] = (totals[r.user_id] ?? 0) + mins;
  }

  // ランキング（降順）
  const ranking = students
    .map(s => ({
      userId: s.id,
      name: s.name || '名前未設定',
      totalMinutes: totals[s.id] ?? 0,
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  return NextResponse.json(ranking);
}
