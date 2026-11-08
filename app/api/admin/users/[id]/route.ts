import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const ROLES = ['student', 'parent', 'admin'] as const;
type Role = typeof ROLES[number];

// 呼び出し元が管理者かを確認し、管理者のIDと service_role クライアントを返す
async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: '認証が必要です。' }, { status: 401 }) };

  const supabaseAdmin = createAdminClient();
  const { data: callerRow } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
  if (callerRow?.role !== 'admin') {
    return { error: NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 }) };
  }
  return { supabaseAdmin, callerId: user.id };
}

// 役割を変更する
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { supabaseAdmin, callerId } = auth;
    const { id } = await params;

    const { role } = await req.json() as { role: Role };
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: '役割が正しくありません。' }, { status: 400 });
    }
    if (id === callerId) {
      return NextResponse.json({ error: 'ご自身の役割は変更できません。' }, { status: 400 });
    }

    const { data: target } = await supabaseAdmin.from('users').select('id, role').eq('id', id).single();
    if (!target) {
      return NextResponse.json({ error: 'ユーザーが見つかりません。' }, { status: 404 });
    }
    if (target.role === role) {
      return NextResponse.json({ ok: true, id, role });
    }

    // 保護者でなくなる場合は、生徒との紐付けを解除
    const updateData: Record<string, unknown> = { role };
    if (role !== 'parent') updateData.linked_student_id = null;

    const { error: updateError } = await supabaseAdmin.from('users').update(updateData).eq('id', id);
    if (updateError) {
      console.error('user role update error:', updateError);
      return NextResponse.json({ error: '役割の変更に失敗しました。' }, { status: 500 });
    }

    // 生徒でなくなる場合は、その生徒に紐付いていた保護者の紐付けも解除
    if (target.role === 'student') {
      await supabaseAdmin.from('users').update({ linked_student_id: null }).eq('linked_student_id', id);
    }

    return NextResponse.json({ ok: true, id, role });

  } catch (err) {
    console.error('user role error:', err);
    return NextResponse.json({ error: '役割の変更に失敗しました。' }, { status: 500 });
  }
}

// ユーザーを削除する（まなびログ側のデータのみ。エピスミントサイト側のアカウントには影響しない）
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { supabaseAdmin, callerId } = auth;
    const { id } = await params;

    if (id === callerId) {
      return NextResponse.json({ error: 'ご自身のアカウントは削除できません。' }, { status: 400 });
    }

    const { data: target } = await supabaseAdmin.from('users').select('id, role').eq('id', id).single();
    if (!target) {
      return NextResponse.json({ error: 'ユーザーが見つかりません。' }, { status: 404 });
    }
    if (target.role === 'admin') {
      return NextResponse.json({ error: '管理者は削除できません。先に役割を変更してください。' }, { status: 400 });
    }

    // 紐付けの解除
    await supabaseAdmin.from('users').update({ linked_student_id: null }).eq('linked_student_id', id);

    // 本人のデータを削除（auth.users への参照が ON DELETE 指定なしのテーブルがあるため、先に消す）
    for (const table of [
      'study_records', 'categories', 'test_results', 'weekly_reviews',
      'past_exam_records', 'push_subscriptions',
    ]) {
      const { error } = await supabaseAdmin.from(table).delete().eq('user_id', id);
      if (error) {
        console.error(`user delete: ${table} error:`, error);
        return NextResponse.json({ error: `削除に失敗しました（${table}）。` }, { status: 500 });
      }
    }

    // ログイン情報を削除（public.users は連鎖して削除される）
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
      console.error('user delete: auth error:', authError);
      return NextResponse.json({ error: 'ユーザーの削除に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id });

  } catch (err) {
    console.error('user delete error:', err);
    return NextResponse.json({ error: 'ユーザーの削除に失敗しました。' }, { status: 500 });
  }
}
