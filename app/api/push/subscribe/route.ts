import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

// 購読登録
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const subscription = await req.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: '無効なサブスクリプション' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('push_subscriptions')
    .upsert({ user_id: user.id, subscription }, { onConflict: 'user_id' });

  if (error) {
    console.error('push subscribe error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// 購読解除
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const admin = createAdminClient();
  await admin.from('push_subscriptions').delete().eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}
