'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return url.length > 0 && url !== 'your_supabase_project_url' && url.startsWith('http');
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Demo mode: no auth
      setLoading(false);
      return;
    }

    let unsubscribe = () => {};

    (async () => {
      const { createClient } = await import('./supabase');
      const supabase = createClient();

      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      unsubscribe = () => subscription.unsubscribe();
    })();

    return () => unsubscribe();
  }, []);

  async function signOut() {
    if (!isSupabaseConfigured()) return;
    const { createClient } = await import('./supabase');
    await createClient().auth.signOut();
  }

  return { user, loading, signOut };
}
