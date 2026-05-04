import { createClient } from '@supabase/supabase-js';

/**
 * サービスロールキーを使用する管理者クライアント。
 * RLSをバイパスするため、サーバー側の Route Handler 専用。
 * 'use client' ファイルや、クライアントに届くコードからは絶対にimportしないこと。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase admin env vars are not set (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  });
}
