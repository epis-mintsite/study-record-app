'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'parent'>('student');
  const [linkedEmail, setLinkedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/weekly');
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          let linkedStudentId: string | null = null;
          if (role === 'parent' && linkedEmail) {
            const { data: linked } = await supabase.from('users').select('id').eq('email', linkedEmail).single();
            if (linked) linkedStudentId = linked.id;
          }
          await supabase.from('users').insert({ id: data.user.id, name, role, linked_student_id: linkedStudentId });
        }
        setMessage('確認メールを送りました。メールをご確認ください。');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
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
    display: 'block', fontSize: '12px', fontWeight: 500, color: '#615d59', marginBottom: '6px',
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
        boxShadow: 'rgba(0,0,0,0.01) 0px 1px 3px, rgba(0,0,0,0.02) 0px 3px 7px, rgba(0,0,0,0.02) 0px 7px 15px, rgba(0,0,0,0.04) 0px 14px 28px, rgba(0,0,0,0.05) 0px 23px 52px',
        padding: '36px 32px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" fill="#0075de" />
            <rect x="7" y="8" width="10" height="1.5" rx="0.75" fill="white" />
            <rect x="7" y="11" width="7" height="1.5" rx="0.75" fill="white" />
            <rect x="7" y="14" width="8" height="1.5" rx="0.75" fill="white" />
          </svg>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.2px', lineHeight: 1 }}>
              週間学習記録
            </div>
            <div style={{ fontSize: '12px', color: '#a39e98', marginTop: '2px' }}>
              音声で記録する学習管理アプリ
            </div>
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{
          display: 'flex', background: '#f6f5f4', borderRadius: '6px', padding: '3px',
          marginBottom: '24px', border: '1px solid rgba(0,0,0,0.06)',
        }}>
          {(['login', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '7px', borderRadius: '4px', cursor: 'pointer',
                fontSize: '14px', fontWeight: mode === m ? 600 : 500, fontFamily: 'inherit',
                border: 'none',
                background: mode === m ? '#ffffff' : 'transparent',
                color: mode === m ? 'rgba(0,0,0,0.95)' : '#615d59',
                boxShadow: mode === m ? 'rgba(0,0,0,0.04) 0px 1px 6px' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {m === 'login' ? 'ログイン' : '新規登録'}
            </button>
          ))}
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            background: '#fff5f5', border: '1px solid rgba(220,38,38,0.15)',
            borderRadius: '6px', padding: '10px 14px', marginBottom: '16px',
            fontSize: '13px', color: '#c0392b',
          }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{
            background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.2)',
            borderRadius: '6px', padding: '10px 14px', marginBottom: '16px',
            fontSize: '13px', color: '#15803d',
          }}>
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mode === 'signup' && (
            <>
              <div>
                <label htmlFor="name" style={labelStyle}>名前</label>
                <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="山家 創" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>役割</label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  {[['student', '生徒'], ['parent', '保護者']].map(([val, lbl]) => (
                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '14px', color: 'rgba(0,0,0,0.85)' }}>
                      <input type="radio" name="role" value={val} checked={role === val} onChange={() => setRole(val as any)}
                        style={{ accentColor: '#0075de' }} />
                      {lbl}
                    </label>
                  ))}
                </div>
              </div>
              {role === 'parent' && (
                <div>
                  <label htmlFor="linkedEmail" style={labelStyle}>お子さまのメールアドレス</label>
                  <input id="linkedEmail" type="email" value={linkedEmail} onChange={e => setLinkedEmail(e.target.value)} placeholder="child@example.com" style={inputStyle} />
                </div>
              )}
            </>
          )}
          <div>
            <label htmlFor="email" style={labelStyle}>メールアドレス</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="password" style={labelStyle}>パスワード</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="6文字以上" style={inputStyle} />
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-label={mode === 'login' ? 'ログインする' : 'アカウントを作成する'}
            style={{
              width: '100%', padding: '10px 16px', borderRadius: '4px', border: 'none',
              background: loading ? '#a39e98' : '#0075de', color: '#ffffff',
              fontSize: '15px', fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '4px',
            }}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> 処理中...</>
            ) : mode === 'login' ? 'ログイン' : 'アカウント作成'}
          </button>
        </form>

        {/* Guide link */}
        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <Link href="/guide" style={{ fontSize: '13px', color: '#0075de', textDecoration: 'none', fontWeight: 500 }}>
            📖 使い方ガイドを確認する →
          </Link>
        </div>
      </div>
    </div>
  );
}
