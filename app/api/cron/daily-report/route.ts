import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

// 分 → "X時間Y分" 形式に変換
function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}時間${m}分`;
  if (h > 0)          return `${h}時間`;
  return `${m}分`;
}

// JST の今日の日付を YYYY-MM-DD 形式で返す
function getTodayJST(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  // 1. セキュリティチェック（CRON_SECRET による認証）
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SLACK_WEBHOOK_URL) {
    return NextResponse.json({ error: 'SLACK_WEBHOOK_URL が設定されていません。' }, { status: 503 });
  }

  const todayJST = getTodayJST();
  const supabase = createAdminClient();

  // 2. 今日の学習記録を全生徒分取得
  const { data: records, error } = await supabase
    .from('study_records')
    .select(`
      daily_totals,
      users!study_records_user_id_fkey (
        id,
        name,
        role
      )
    `)
    .eq('date', todayJST);

  if (error) {
    console.error('daily-report DB error:', error);
    return NextResponse.json({ error: 'DB取得に失敗しました。' }, { status: 500 });
  }

  // 3. 生徒のみ抽出・合計時間を計算
  type UserRow   = { id: string; name: string; role: string };
  type RecordRow = { daily_totals: Record<string, number>; users: UserRow | UserRow[] | null };

  // Supabase の join は配列で返ることがあるため正規化
  const normalize = (u: UserRow | UserRow[] | null): UserRow | null =>
    Array.isArray(u) ? (u[0] ?? null) : u;

  const studentRecords = (records as RecordRow[])
    .map(r => ({ ...r, user: normalize(r.users) }))
    .filter(r => r.user?.role === 'student')
    .map(r => {
      const totals   = r.daily_totals ?? {};
      const totalMin = Object.values(totals).reduce((s, v) => s + v, 0);
      const subjects = Object.entries(totals)
        .filter(([, m]) => m > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, m]) => `${cat}：${fmtMin(m)}`)
        .join('　');
      return { name: r.user!.name, totalMin, subjects };
    })
    .filter(r => r.totalMin > 0)
    .sort((a, b) => b.totalMin - a.totalMin);

  // 4. Slack Block Kit メッセージを構築
  const dateLabel = (() => {
    const d = new Date(todayJST + 'T00:00:00+09:00');
    const week = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${week}）`;
  })();

  const blocks: object[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📚 学習記録日報　${dateLabel}`, emoji: true },
    },
    { type: 'divider' },
  ];

  if (studentRecords.length === 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '本日の学習記録はありません。' },
    });
  } else {
    for (const r of studentRecords) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${r.name}*　合計：${fmtMin(r.totalMin)}\n${r.subjects || '記録なし'}`,
        },
      });
      blocks.push({ type: 'divider' });
    }
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: '週間学習記録アプリより自動送信 | study-record-app-six.vercel.app',
      },
    ],
  });

  // 5. Slack に送信
  const slackRes = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ blocks }),
  });

  if (!slackRes.ok) {
    const body = await slackRes.text();
    console.error('Slack send error:', body);
    return NextResponse.json({ error: 'Slack送信に失敗しました。' }, { status: 500 });
  }

  return NextResponse.json({
    ok:               true,
    date:             todayJST,
    studentsReported: studentRecords.length,
  });
}
