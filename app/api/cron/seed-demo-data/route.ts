import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { currentYearMonthJST, seedDemoMonth } from '@/lib/demo-seed';

// 毎月1日に、その月のデモデータ（democ3・democ2・democ1）を自動で挿入する。
// vercel.json の crons から呼ばれる。
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { year, month } = currentYearMonthJST();
    const results = await seedDemoMonth(createAdminClient(), { year, month, mode: 'cron' });
    console.log(`[seed-demo-data] ${year}-${String(month).padStart(2, '0')}`, JSON.stringify(results));
    return NextResponse.json({ ok: true, year, month, results });
  } catch (err) {
    console.error('cron seed-demo-data error:', err);
    return NextResponse.json({ error: 'デモデータの挿入に失敗しました。' }, { status: 500 });
  }
}
