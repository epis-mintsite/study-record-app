'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SetupPage() {
  const [role, setRole]               = useState<'student' | 'parent'>('student');
  const [name, setName]               = useState('');
  const [childEpisId, setChildEpisId] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/setup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          role,
          name:        name.trim() || undefined,
          childEpisId: role === 'parent' ? childEpisId.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '設定の保存に失敗しました。');
      }

      router.push(data.redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました。');
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
        width: '100%', maxWidth: '420px',
        background: '#ffffff', borderRadius: '12px',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: 'rgba(0,0,0,0.05) 0px 23px 52px',
        padding: '36px 32px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" fill="#0075de" />
            <rect x="7" y="8" width="10" height="1.5" rx="0.75" fill="white" />
            <rect x="7" y="11" width="7"  height="1.5" rx="0.75" fill="white" />
            <rect x="7" y="14" width="8"  height="1.5" rx="0.75" fill="white" />
          </svg>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.2px' }}>
            週間学習記録
          </div>
        </div>

        <p style={{ fontSize: '13px', color: '#a39e98', marginBottom: '28px' }}>
          はじめまして。初回設定を行います。
        </p>

        {error && (
          <div style={{
            background: '#fff5f5', border: '1px solid rgba(220,38,38,0.15)',
            borderRadius: '6px', padding: '10px 14px', marginBottom: '16px',
            fontSize: '13px', color: '#c0392b',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 役割選択 */}
          <div>
            <label style={labelStyle}>役割</label>
            <div style={{
              display: 'flex', background: '#f6f5f4', borderRadius: '6px',
              padding: '3px', border: '1px solid rgba(0,0,0,0.06)',
            }}>
              {([['student', '生徒'], ['parent', '保護者']] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRole(val)}
                  style={{
                    flex: 1, padding: '7px', borderRadius: '4px', cursor: 'pointer',
                    fontSize: '14px', fontWeight: role === val ? 600 : 500,
                    fontFamily: 'inherit', border: 'none',
                    background: role === val ? '#ffffff' : 'transparent',
                    color: role === val ? 'rgba(0,0,0,0.95)' : '#615d59',
                    boxShadow: role === val ? 'rgba(0,0,0,0.04) 0px 1px 6px' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* 氏名（任意） */}
          <div>
            <label htmlFor="name" style={labelStyle}>
              氏名　<span style={{ color: '#a39e98', fontWeight: 400 }}>（任意）</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="山家 創"
              style={inputStyle}
            />
            <p style={{ fontSize: '11px', color: '#a39e98', marginTop: '4px' }}>
              空欄の場合はエピスのユーザーIDが表示名になります
            </p>
          </div>

          {/* 保護者の場合：子どものエピスID */}
          {role === 'parent' && (
            <div style={{
              background: '#f6f8ff', border: '1px solid rgba(0,117,222,0.15)',
              borderRadius: '8px', padding: '16px',
            }}>
              <label htmlFor="childEpisId" style={{ ...labelStyle, color: '#0075de' }}>
                お子さまのエピスユーザーID　<span style={{ color: '#c0392b' }}>*</span>
              </label>
              <input
                id="childEpisId"
                type="text"
                value={childEpisId}
                onChange={e => setChildEpisId(e.target.value)}
                required={role === 'parent'}
                placeholder="例: taro123"
                style={inputStyle}
              />
              <p style={{ fontSize: '11px', color: '#615d59', marginTop: '6px', lineHeight: 1.5 }}>
                お子さまが先にこのアプリにログインしている必要があります。
              </p>
            </div>
          )}

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
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> 設定中...</>
              : '設定を完了する'}
          </button>
        </form>
      </div>
    </div>
  );
}
