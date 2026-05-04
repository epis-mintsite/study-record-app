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

    // エピスミントサイトのユーザーID（@example.com を除いた部分）
    const episUserId = email.replace('@example.com', '');

    const supabaseAdmin = createAdminClient();

    // 2. Supabase に同メールのユーザーが存在するか確認
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    let supabaseUid: string;

    if (existingUser) {
      // --- 既存ユーザー ---
      supabaseUid = existingUser.id;
    } else {
      // --- 初回ログイン：Supabase にユーザーを自動作成 ---
      // パスワードは Firebase 側で管理するため、ランダムな値をセット
      const tempPassword = crypto.randomUUID() + crypto.randomUUID();

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password:      tempPassword,
        email_confirm: true,   // メール確認不要
      });

      if (createError || !newUser.user) {
        console.error('Supabase createUser error:', createError);
        return NextResponse.json({ error: 'ユーザー作成に失敗しました。' }, { status: 500 });
      }

      supabaseUid = newUser.user.id;

      // public.users にも初期レコードを作成
      await supabaseAdmin.from('users').insert({
        id:   supabaseUid,
        name: episUserId,   // 初期値としてユーザーIDをセット（後から変更可）
        role: 'student',
      });
    }

    // 3. マジックリンクトークンを発行（createSession の代替）
    //    クライアントが verifyOtp でこのトークンを交換してセッションを取得する
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
    });

  } catch (err) {
    console.error('epis-login error:', err);
    // Firebase Token 検証失敗（IDまたはパスワードが間違い）
    return NextResponse.json(
      { error: 'IDまたはパスワードが正しくありません。' },
      { status: 401 },
    );
  }
}
