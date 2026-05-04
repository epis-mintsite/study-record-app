import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json() as { idToken: string };

    if (!idToken) {
      return NextResponse.json({ error: 'idToken が必要です。' }, { status: 400 });
    }

    // 1. Firebase ID Token を検証 → email を取得 (例: taro123@example.com)
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const email = decoded.email;

    if (!email) {
      return NextResponse.json({ error: '認証情報が不正です。' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    // 2. Supabase に同メールのユーザーが存在するか確認
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    let supabaseUid: string;
    let isNewUser = false;

    if (existingUser) {
      // --- 既存ユーザー ---
      supabaseUid = existingUser.id;
    } else {
      // --- 初回ログイン：Supabase にユーザーを自動作成 ---
      // パスワードは Firebase 側で管理するため、ランダムな値をセット
      // public.users への挿入は handle_new_user トリガーが自動で行う
      const tempPassword = crypto.randomUUID() + crypto.randomUUID();

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password:      tempPassword,
        email_confirm: true,
      });

      if (createError || !newUser.user) {
        console.error('Supabase createUser error:', createError);
        return NextResponse.json({ error: 'ユーザー作成に失敗しました。' }, { status: 500 });
      }

      supabaseUid = newUser.user.id;
      isNewUser   = true;
    }

    // 3. マジックリンクトークンを発行（セッション確立用）
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type:  'magiclink',
        email,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('generateLink error:', linkError);
      return NextResponse.json(
        { error: 'セッション発行に失敗しました。管理者にお問い合わせください。' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      hashed_token: linkData.properties.hashed_token,
      is_new_user:  isNewUser,
    });

  } catch (err) {
    console.error('epis-login error:', err);
    return NextResponse.json(
      { error: 'IDまたはパスワードが正しくありません。' },
      { status: 401 },
    );
  }
}
