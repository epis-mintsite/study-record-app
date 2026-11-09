import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  getStudyRecords, getCustomCategories, getStudentProfile,
  getTestResults, getWeeklyReview, getPastExamRecords,
} from '@/lib/db';

// 管理者が生徒の学習データを閲覧するためのAPI（管理者のみ）。
// 各テーブルの RLS は「本人」と「紐付いた保護者」しか読めないため、
// 管理画面の生徒詳細ページは service_role を使うこのAPI経由で取得する。
//   GET /api/admin/students/{id}?kind=profile
//   GET /api/admin/students/{id}?kind=records&dates=2026-11-01,2026-11-02,...
//   GET /api/admin/students/{id}?kind=categories | tests | exams
//   GET /api/admin/students/{id}?kind=review&weekStart=2026-11-02
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: callerRow } = await admin.from('users').select('role').eq('id', user.id).single();
    if (callerRow?.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 });
    }

    const { studentId } = await params;
    const q = req.nextUrl.searchParams;
    const kind = q.get('kind');

    switch (kind) {
      case 'profile':
        return NextResponse.json({ profile: await getStudentProfile(studentId, admin) });

      case 'records': {
        const dates = (q.get('dates') ?? '').split(',').filter(Boolean);
        if (dates.length === 0 || dates.length > 62 || !dates.every(d => DATE_RE.test(d))) {
          return NextResponse.json({ error: '日付が正しくありません。' }, { status: 400 });
        }
        return NextResponse.json({ records: await getStudyRecords(studentId, dates, admin) });
      }

      case 'categories':
        return NextResponse.json({ categories: await getCustomCategories(studentId, admin) });

      case 'tests':
        return NextResponse.json({ tests: await getTestResults(studentId, admin) });

      case 'review': {
        const weekStart = q.get('weekStart') ?? '';
        if (!DATE_RE.test(weekStart)) {
          return NextResponse.json({ error: '日付が正しくありません。' }, { status: 400 });
        }
        return NextResponse.json({ review: await getWeeklyReview(studentId, weekStart, admin) });
      }

      case 'exams':
        return NextResponse.json({ exams: await getPastExamRecords(studentId, admin) });

      default:
        return NextResponse.json({ error: 'kind が正しくありません。' }, { status: 400 });
    }
  } catch (err) {
    console.error('admin student data error:', err);
    return NextResponse.json({ error: 'データの取得に失敗しました。' }, { status: 500 });
  }
}
