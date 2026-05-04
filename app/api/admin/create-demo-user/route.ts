import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

    // 2. リクエスト値の取得・バリデーション
    const { userId, password, role, name } = await req.json() as {
      userId:   string;
      password: string;
      role:     'student' | 'parent';
      name?:    string;
    };

    if (!userId || !/^[a-zA-Z0-9]+$/.test(userId)) {
      return NextResponse.json({ error: 'ユーザーIDはアルファベット・数字のみ使用できます。' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'パスワードは6文字以上で入力してください。' }, { status: 400 });
    }
    if (role !== 'student' && role !== 'parent') {
      return NextResponse.json({ error: '役割は student または parent を指定してください。' }, { status: 400 });
    }

    const email = `${userId}@example.com`;

    // 3. Firebase にユーザーを作成
    let firebaseUid: string;
    try {
      const fbUser = await getAdminAuth().createUser({ email, password });
      firebaseUid = fbUser.uid;
    } catch (err: unknown) {
      const fbErr = err as { code?: string };
      if (fbErr?.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: `ユーザーID「${userId}」はすでに使用されています。` }, { status: 409 });
      }
      throw err;
    }

    // 4. Supabase Auth にユーザーを作成
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password:      tempPassword,
      email_confirm: true,
    });
    if (createError || !newUser.user) {
      // Firebase だけ作成されてしまった場合はロールバック
      await getAdminAuth().deleteUser(firebaseUid).catch(() => {});
      console.error('Supabase createUser error:', createError);
      return NextResponse.json({ error: 'Supabase ユーザー作成に失敗しました。' }, { status: 500 });
    }

    const supabaseUid = newUser.user.id;

    // 5. users テーブルのロールと名前を設定
    await supabaseAdmin
      .from('users')
      .update({ role, name: name?.trim() || null })
      .eq('id', supabaseUid);

    return NextResponse.json({
      ok:     true,
      userId,
      role,
      name:   name?.trim() || null,
    });

  } catch (err) {
    console.error('create-demo-user error:', err);
    return NextResponse.json({ error: 'ユーザーの作成に失敗しました。' }, { status: 500 });
  }
}
