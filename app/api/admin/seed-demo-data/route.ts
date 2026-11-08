import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { currentYearMonthJST, seedDemoMonth } from '@/lib/demo-seed';

// 管理画面の「デモデータを挿入」ボタン用。
// body に { year, month } を渡すとその月、省略すると今月（日本時間）の分を挿入する。
export async function POST(req: NextRequest) {
  try {
    // 1. 管理者チェック
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }
    const supabaseAdmin = createAdminClient();
    const { data: callerRow } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (callerRow?.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 });
    }

    // 2. 対象月
    const body = await req.json().catch(() => ({})) as { year?: number; month?: number };
    const now = currentYearMonthJST();
    const year  = Number.isInteger(body.year)  ? body.year!  : now.year;
    const month = Number.isInteger(body.month) ? body.month! : now.month;
    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return NextResponse.json({ error: '年月が正しくありません。' }, { status: 400 });
    }

    // 3. 挿入
    const results = await seedDemoMonth(supabaseAdmin, { year, month, mode: 'manual' });
    return NextResponse.json({ ok: true, year, month, results });

  } catch (err) {
    console.error('seed-demo-data error:', err);
    return NextResponse.json({ error: 'シードデータの挿入に失敗しました。' }, { status: 500 });
  }
}
