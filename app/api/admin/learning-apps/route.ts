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

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json() as {
    id?: string; name?: string; url?: string; description?: string;
    icon?: string; isAvailable?: boolean; sortOrder?: number;
  };
  const { id, name, url, description, icon, isAvailable, sortOrder } = body;

  if (!name?.trim() || !url?.trim()) {
    return NextResponse.json({ error: 'アプリ名とURLは必須です。' }, { status: 400 });
  }
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'URLの形式が正しくありません。' }, { status: 400 });
  }

  const row = {
    name: name.trim(),
    url: url.trim(),
    description: description?.trim() || null,
    icon: icon?.trim() || null,
    is_available: isAvailable ?? true,
    sort_order: sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };

  const { error } = id
    ? await auth.supabaseAdmin.from('learning_apps').update(row).eq('id', id)
    : await auth.supabaseAdmin.from('learning_apps').insert(row);
  if (error) return NextResponse.json({ error: `保存エラー: ${error.message}` }, { status: 500 });

  return NextResponse.json({ ok: true });
}
