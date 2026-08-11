import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase-admin';
import { isMondayJST, buildWeeklyTrendStats, generateWeeklyTrendText } from '@/lib/weekly-trend';

// 分 → "X時間Y分" 形式に変換
function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}時間${m}分`;
  if (h > 0)          return `${h}時間`;
  return `${m}分`;
}

// JST の日付を YYYY-MM-DD で返す（offset: 0=今日, -1=昨日）
function getJSTDate(offset = 0): string {
  return new Date(Date.now() + (9 * 60 * 60 * 1000) + (offset * 86_400_000))
    .toISOString()
    .slice(0, 10);
}

// web-push の初期化
function initWebPush() {
  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email      = process.env.VAPID_EMAIL;
  if (!publicKey || !privateKey || !email) return false;
  webpush.setVapidDetails(email, publicKey, privateKey);
  return true;
}

export async function GET(req: NextRequest) {
  // 1. セキュリティチェック
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase      = createAdminClient();
  const yesterdayJST  = getJSTDate(-1);   // 昨日（Slackと通知どちらも昨日分）
  const todayLabel    = (() => {
    const d    = new Date(yesterdayJST + 'T00:00:00+09:00');
    const week = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${week}）`;
  })();

  // 2. 昨日の学習記録を全生徒分取得
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
    .eq('date', yesterdayJST);

  if (error) {
    console.error('daily-report DB error:', error);
    return NextResponse.json({ error: 'DB取得に失敗しました。' }, { status: 500 });
  }

  // 3. 生徒のみ抽出・合計時間を計算・降順ソート
  type UserRow   = { id: string; name: string; role: string };
  type RecordRow = { daily_totals: Record<string, number>; users: UserRow | UserRow[] | null };

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

  // 4. Slack Block Kit メッセージを構築・送信
  let slackOk = false;
  let weeklyTrendOk: boolean | null = null; // null=月曜以外で未実行, true/false=月曜に実行した結果
  if (process.env.SLACK_WEBHOOK_URL) {
    const blocks: object[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `📚 学習記録日報　${todayLabel}`, emoji: true },
      },
      { type: 'divider' },
    ];

    if (studentRecords.length === 0) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: '昨日の学習記録はありません。' },
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

    // 4.5 週次学習トレンド（月曜のみ・Claudeが分析して同じ日報に追記）
    if (isMondayJST()) {
      try {
        const stats = await buildWeeklyTrendStats();
        const trendText = await generateWeeklyTrendText(stats);
        blocks.push({
          type: 'section',
          text: { type: 'mrkdwn', text: trendText },
        });
        blocks.push({ type: 'divider' });
        weeklyTrendOk = true;
      } catch (e) {
        console.error('weekly-trend error:', e);
        weeklyTrendOk = false;
      }
    }

    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '週間学習記録アプリより自動送信 | study-record-app-six.vercel.app' }],
    });

    const slackRes = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ blocks }),
    });
    slackOk = slackRes.ok;
    if (!slackRes.ok) console.error('Slack send error:', await slackRes.text());
  }

  // 5. Web Push 通知を全購読者に送信
  let pushSent = 0;
  let pushFailed = 0;

  if (initWebPush()) {
    // push_subscriptions テーブルから全件取得
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription');

    if (subs && subs.length > 0) {
      // 通知本文を作成
      const top3 = studentRecords.slice(0, 3);
      const bodyLines = top3.map((r, i) => {
        const medal = ['🥇', '🥈', '🥉'][i];
        return `${medal} ${r.name}（${fmtMin(r.totalMin)}）`;
      });

      const payload = JSON.stringify({
        title: `📊 ${todayLabel} ランキング`,
        body:  studentRecords.length === 0
          ? '昨日の学習記録がありません。今日から頑張ろう！'
          : bodyLines.join('\n'),
        url: '/ranking',
      });

      // 全購読者に並列送信
      const results = await Promise.allSettled(
        subs.map(row =>
          webpush.sendNotification(
            row.subscription as webpush.PushSubscription,
            payload
          )
        )
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          pushSent++;
        } else {
          pushFailed++;
          // 410 Gone = 購読が無効（ブラウザが削除済み）→ DBから削除
          const err = result.reason as { statusCode?: number };
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', subs[i].user_id);
          }
          console.error(`push failed for user ${subs[i].user_id}:`, err?.statusCode);
        }
      }
    }
  }

  return NextResponse.json({
    ok:               true,
    date:             yesterdayJST,
    studentsReported: studentRecords.length,
    slackOk,
    weeklyTrendOk,
    pushSent,
    pushFailed,
  });
}
