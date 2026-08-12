'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { createClient } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function EpisLoginPage() {
  const [userId, setUserId]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const router = useRouter();
  const supabase = createClient();

  // バリデーション（エピスミントサイトと同じルール）
  function validate(): string | null {
    if (/\s/.test(userId))              return 'スペースは使用できません。';
    if (!/^[a-zA-Z0-9]+$/.test(userId)) return 'アルファベットと数字のみ使用できます。';
    if (/\s/.test(password))            return 'パスワードにスペースは使用できません。';
    if (password.length < 6)            return 'パスワードは6文字以上で入力してください。';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');

    try {
      // Step 1: エピスミントサイトと同じ形式でFirebase認証
      const firebaseEmail = `${userId}@example.com`;
      const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(), firebaseEmail, password,
      );
      const idToken = await credential.user.getIdToken();

      // Step 2: サーバーAPIでSupabaseセッションを発行
      const res = await fetch('/api/auth/epis-login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ログインに失敗しました。');
      }

      // Step 3: マジックリンクトークンをセッションに交換
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: data.hashed_token,
        type:       'email',
      });
      if (otpError) throw new Error('セッションの確立に失敗しました。');

      // リダイレクト先を決定
      if (data.role === 'admin') {
        router.push('/admin');
      } else if (data.is_new_user) {
        router.push('/setup');
      } else if (data.role === 'parent') {
        router.push('/parent');
      } else {
        router.push('/weekly');
      }
    } catch (err: unknown) {
      // パスワードが変わっていた場合（再同期）は自動リトライ
      if (err instanceof Error && err.message.includes('auth/wrong-password')) {
        setError('パスワードが変更されています。正しいパスワードを入力してください。');
      } else {
        setError(err instanceof Error ? err.message : 'ログインに失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #dddddd', borderRadius: '4px',
    padding: '8px 12px', fontSize: '14px', color: 'rgba(0,0,0,0.9)',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    background: '#ffffff',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 500,
    color: '#615d59', marginBottom: '6px',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f6f5f4', padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        background: '#ffffff', borderRadius: '12px',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: 'rgba(0,0,0,0.05) 0px 23px 52px',
        padding: '36px 32px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
          <img src="/wordmark.png" alt="まなびログ" style={{ height: '28px', width: 'auto', display: 'block' }} />
        </div>

        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(0,0,0,0.85)', marginBottom: '20px' }}>
          ログイン
        </h2>

        {error && (
          <div style={{
            background: '#fff5f5', border: '1px solid rgba(220,38,38,0.15)',
            borderRadius: '6px', padding: '10px 14px', marginBottom: '16px',
            fontSize: '13px', color: '#c0392b',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="userId" style={labelStyle}>ユーザーID</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              required
              placeholder="アルファベット・数字で記入"
              autoComplete="username"
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="password" style={labelStyle}>パスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="6文字以上"
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px 16px', borderRadius: '4px', border: 'none',
              background: loading ? '#a39e98' : '#0075de', color: '#ffffff',
              fontSize: '15px', fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px', marginTop: '4px',
            }}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> 処理中...</>
            ) : 'ログイン'}
          </button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: '20px', fontSize: '12px',
          color: '#a39e98', paddingTop: '20px',
          borderTop: '1px solid rgba(0,0,0,0.06)',
        }}>
          エピスミントサイトと同じID・パスワードでログインできます
        </p>
      </div>
    </div>
  );
}
