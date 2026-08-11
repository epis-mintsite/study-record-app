import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ExamCategory } from '@/lib/types';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: '認証が必要です。' }, { status: 401 }) };

  const supabaseAdmin = createAdminClient();
  const { data: callerRow } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
  if (callerRow?.role !== 'admin') {
    return { error: NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 }) };
  }
  return { supabaseAdmin };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json() as {
    schoolName?: string; examCategory?: ExamCategory; examYear?: number; subject?: string;
    passingScore?: number; maxScore?: number;
  };
  const { schoolName, examCategory, examYear, subject, passingScore, maxScore } = body;

  if (!schoolName || !examCategory || !examYear || !subject || passingScore == null) {
    return NextResponse.json({ error: '高校名・入試区分・年度・科目・合格最低点は必須です。' }, { status: 400 });
  }
  if (examCategory !== '一般' && examCategory !== '帰国') {
    return NextResponse.json({ error: '入試区分は「一般」または「帰国」を指定してください。' }, { status: 400 });
  }

  const { error } = await auth.supabaseAdmin.from('school_passing_scores').upsert(
    {
      school_name: schoolName,
      exam_category: examCategory,
      exam_year: examYear,
      subject,
      passing_score: passingScore,
      max_score: maxScore ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'school_name,exam_category,exam_year,subject' }
  );
  if (error) return NextResponse.json({ error: `保存エラー: ${error.message}` }, { status: 500 });

  return NextResponse.json({ ok: true });
}
