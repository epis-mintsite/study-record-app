import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// 保護者と生徒の紐付けを設定・解除する（管理者のみ）
export async function POST(req: NextRequest) {
  try {
    // 1. 呼び出し元が管理者かチェック
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

    // 2. リクエスト値の取得・検証（studentId が null/空なら紐付けを解除）
    const { parentId, studentId } = await req.json() as {
      parentId:   string;
      studentId?: string | null;
    };
    if (!parentId) {
      return NextResponse.json({ error: '保護者を指定してください。' }, { status: 400 });
    }

    const { data: parentRow } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', parentId)
      .single();
    if (!parentRow || parentRow.role !== 'parent') {
      return NextResponse.json({ error: '保護者アカウントが見つかりません。' }, { status: 404 });
    }

    if (studentId) {
      const { data: studentRow } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .eq('id', studentId)
        .single();
      if (!studentRow || studentRow.role !== 'student') {
        return NextResponse.json({ error: '紐付け先の生徒アカウントが見つかりません。' }, { status: 404 });
      }
    }

    // 3. 紐付けを更新
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ linked_student_id: studentId || null })
      .eq('id', parentId);
    if (updateError) {
      console.error('link-parent update error:', updateError);
      return NextResponse.json({ error: '紐付けの更新に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, parentId, studentId: studentId || null });

  } catch (err) {
    console.error('link-parent error:', err);
    return NextResponse.json({ error: '紐付けの更新に失敗しました。' }, { status: 500 });
  }
}
