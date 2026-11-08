import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// 登録ユーザー一覧を返す（管理者のみ）
// users テーブルの RLS は「自分の行」と「保護者→紐付け生徒」しか読めないため、
// 管理画面の一覧は service_role を使うこのAPI経由で取得する。
export async function GET() {
  try {
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

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('admin users list error:', error);
      return NextResponse.json({ error: 'ユーザー取得に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({ users: data ?? [] });

  } catch (err) {
    console.error('admin users error:', err);
    return NextResponse.json({ error: 'ユーザー取得に失敗しました。' }, { status: 500 });
  }
}
