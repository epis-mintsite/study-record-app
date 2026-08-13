import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;

  const { error } = await auth.supabaseAdmin.from('learning_apps').delete().eq('id', id);
  if (error) return NextResponse.json({ error: `削除エラー: ${error.message}` }, { status: 500 });

  return NextResponse.json({ ok: true });
}
