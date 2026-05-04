import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { createAdminClient } from '@/lib/supabase-admin';

// エピスAPIからuserTypeを取得
async function getEpisUserType(episUserId: string, idToken: string): Promise<string | null> {
  const apiUrl = process.env.EPIS_API_URL;
  console.log('[epis-login] EPIS_API_URL:', apiUrl ? 'set' : 'NOT SET');
  if (!apiUrl) return null;

  try {
    const url = `${apiUrl}/users/${episUserId}`;
    console.log('[epis-login] fetching:', url);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    console.log('[epis-login] epis API status:', res.status);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.log('[epis-login] epis API error body:', text.slice(0, 200));
      return null;
    }
    const json = await res.json();
    console.log('[epis-login] epis API json:', JSON.stringify(json).slice(0, 300));
    const result = json?.data?.userType?.enUsertypeName ?? null;
    console.log('[epis-login] enUsertypeName:', result);
    return result;
  } catch (e) {
    console.error('[epis-login] epis API fetch error:', e);
    return null;
  }
}

// userType → Supabase role に変換
function toRole(enUserTypeName: string | null): 'student' | 'parent' | 'admin' {
  switch (enUserTypeName) {
    case 'Teacher':   return 'admin';
    case 'Parent':    return 'parent';
    default:          return 'student';
  }
}

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
    let isNewUser = false;
    let role: 'student' | 'parent' | 'admin';

    if (existingUser) {
      // --- 既存ユーザー ---
      supabaseUid = existingUser.id;

      // DBの既存ロールを取得
      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', supabaseUid)
        .single();
      const existingRole = dbUser?.role as 'student' | 'parent' | 'admin' | undefined;

      // エピスAPIでuserTypeを取得（取得できた場合のみ上書き）
      const enUserTypeName = await getEpisUserType(episUserId, idToken);
      if (enUserTypeName) {
        // エピスAPIから取得できた場合はロールを更新
        role = toRole(enUserTypeName);
        await supabaseAdmin
          .from('users')
          .update({ role })
          .eq('id', supabaseUid);
        console.log('[epis-login] role from epis API:', role);
      } else {
        // エピスAPI失敗 → DBのロールをそのまま使用
        role = existingRole ?? 'student';
        console.log('[epis-login] role from DB (epis API unavailable):', role);
      }

    } else {
      // --- 初回ログイン：Supabase にユーザーを自動作成 ---
      const enUserTypeName = await getEpisUserType(episUserId, idToken);
      role = toRole(enUserTypeName); // 取得できなければ 'student'

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

      // トリガーは role='student' で作成するため、正しいロールに上書き
      await supabaseAdmin
        .from('users')
        .update({ role })
        .eq('id', supabaseUid);
    }

    // 4. マジックリンクトークンを発行（セッション確立用）
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
      role,
    });

  } catch (err) {
    console.error('epis-login error:', err);
    return NextResponse.json(
      { error: 'IDまたはパスワードが正しくありません。' },
      { status: 401 },
    );
  }
}
