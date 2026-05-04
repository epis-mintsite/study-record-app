import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { role, childEpisId, name } = await req.json() as {
      role:         'student' | 'parent';
      childEpisId?: string;   // 保護者の場合：子どものエピスユーザーID
      name?:        string;   // 表示名（任意）
    };

    // 1. 現在のセッションからログインユーザーを取得
    const supabaseServer = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '未認証です。ログインし直してください。' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    let linkedStudentId: string | null = null;

    // 2. 保護者の場合：子どものエピスIDからSupabase UIDを検索
    if (role === 'parent') {
      if (!childEpisId) {
        return NextResponse.json(
          { error: 'お子さまのユーザーIDを入力してください。' },
          { status: 400 },
        );
      }

      const childEmail = `${childEpisId.trim()}@example.com`;

      // auth.users から子どものアカウントを検索
      const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
      const childAuthUser = allUsers?.users.find(u => u.email === childEmail);

      if (!childAuthUser) {
        return NextResponse.json(
          { error: `ユーザーID「${childEpisId}」の生徒アカウントが見つかりません。お子さまが先にログインしているか確認してください。` },
          { status: 404 },
        );
      }

      linkedStudentId = childAuthUser.id;
    }

    // 3. public.users を更新（ロール・氏名・紐付け）
    const updateData: Record<string, unknown> = { role };
    if (name?.trim()) updateData.name = name.trim();
    if (linkedStudentId)  updateData.linked_student_id = linkedStudentId;

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('users update error:', updateError);
      return NextResponse.json({ error: '設定の保存に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({
      ok:   true,
      role,
      redirect: role === 'parent' ? '/parent' : '/weekly',
    });

  } catch (err) {
    console.error('setup error:', err);
    return NextResponse.json({ error: '予期しないエラーが発生しました。' }, { status: 500 });
  }
}
