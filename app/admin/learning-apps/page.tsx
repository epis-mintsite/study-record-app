'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Trash2, Plus, Pencil, X, ExternalLink } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/lib/useAuth';
import { getUserRole, getAllLearningApps } from '@/lib/db';
import { LearningApp } from '@/lib/types';

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 500, color: '#615d59', marginBottom: '6px',
};
const inp: React.CSSProperties = {
  width: '100%', border: '1px solid #d1d5db', borderRadius: '6px',
  padding: '8px 10px', fontSize: '14px', color: 'rgba(0,0,0,0.9)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
const cardStyle: React.CSSProperties = {
  background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: '12px', padding: '24px',
  boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px',
};

const EMPTY_FORM = { id: '', name: '', url: '', description: '', icon: '', sortOrder: '0', isAvailable: true };

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export default function AdminLearningAppsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [apps, setApps] = useState<LearningApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    getUserRole(user.id).then(role => {
      if (role !== 'admin') { router.replace('/weekly'); return; }
      setReady(true);
    });
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setApps(await getAllLearningApps()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  function startEdit(app: LearningApp) {
    setForm({
      id: app.id, name: app.name, url: app.url,
      description: app.description ?? '', icon: app.icon ?? '',
      sortOrder: String(app.sortOrder), isAvailable: app.isAvailable,
    });
    setError('');
  }

  async function handleSave() {
    if (!form.name.trim() || !form.url.trim()) return;
    setSaving(true);
    setError('');
    const { ok, data } = await api('/api/admin/learning-apps', 'POST', {
      id: form.id || undefined,
      name: form.name.trim(),
      url: form.url.trim(),
      description: form.description.trim() || undefined,
      icon: form.icon.trim() || undefined,
      sortOrder: Number(form.sortOrder) || 0,
      isAvailable: form.isAvailable,
    });
    setSaving(false);
    if (!ok) { setError(data.error ?? '保存に失敗しました'); return; }
    setForm(EMPTY_FORM);
    await load();
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`「${name}」を削除しますか？`)) return;
    setDeletingId(id);
    const { ok, data } = await api(`/api/admin/learning-apps/${id}`, 'DELETE');
    setDeletingId(null);
    if (!ok) { setError(data.error ?? '削除に失敗しました'); return; }
    setApps(prev => prev.filter(a => a.id !== id));
  }

  if (authLoading || !ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
      <Loader2 size={24} color="#a39e98" className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', width: '100%', padding: '32px 24px 64px' }}>

        <div style={{ marginBottom: '28px' }}>
          <button
            onClick={() => router.push('/admin')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#615d59', fontFamily: 'inherit', padding: 0, marginBottom: '12px' }}
          >
            <ChevronLeft size={16} />
            管理者ダッシュボードに戻る
          </button>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.625px', margin: 0 }}>
            学習アプリの管理
          </h1>
          <p style={{ fontSize: '13px', color: '#a39e98', margin: '8px 0 0' }}>
            生徒の「学習アプリ」タブに表示する外部アプリを登録します。画面内にiframeで埋め込み表示されます。
          </p>
        </div>

        {error && (
          <div style={{ background: '#FFF5F5', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#C0392B' }}>
            {error}
          </div>
        )}

        {/* 登録フォーム */}
        <div style={{ ...cardStyle, marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.9)', margin: 0 }}>
              {form.id ? 'アプリを編集' : 'アプリを追加'}
            </h2>
            {form.id && (
              <button onClick={() => setForm(EMPTY_FORM)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#a39e98', fontFamily: 'inherit' }}>
                <X size={12} /> 新規に戻す
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={lbl}>アプリ名</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：今日の時事英語" style={inp} />
            </div>
            <div>
              <label style={lbl}>アイコン（絵文字・任意）</label>
              <input type="text" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="📰" style={inp} />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>URL</label>
            <input type="text" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://example.com" style={inp} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={lbl}>説明（任意）</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="例：最新のニュースで英語を学ぼう" style={inp} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', alignItems: 'end' }}>
            <div>
              <label style={lbl}>並び順（小さいほど上に表示）</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} style={inp} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#615d59', paddingBottom: '9px' }}>
              <input type="checkbox" checked={form.isAvailable} onChange={e => setForm(f => ({ ...f, isAvailable: e.target.checked }))} />
              生徒に公開する
            </label>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.url.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', borderRadius: '6px', border: 'none', background: '#0075de', fontSize: '14px', fontWeight: 600, color: '#ffffff', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving || !form.name.trim() || !form.url.trim() ? 0.7 : 1 }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {form.id ? '更新' : '登録'}
          </button>
        </div>

        {/* 一覧 */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#a39e98', gap: '10px' }}>
            <Loader2 size={20} className="animate-spin" />
            <span style={{ fontSize: '14px' }}>読み込み中...</span>
          </div>
        ) : apps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#a39e98', fontSize: '14px' }}>
            まだ登録されていません。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {apps.map(app => (
              <div key={app.id} style={{ ...cardStyle, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '8px', background: '#f2f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  {app.icon ?? '📘'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.9)' }}>{app.name}</span>
                    {!app.isAvailable && (
                      <span style={{ padding: '1px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: '#f6f5f4', color: '#a39e98' }}>非公開</span>
                    )}
                    <span style={{ fontSize: '11px', color: '#a39e98' }}>並び順 {app.sortOrder}</span>
                  </div>
                  <a href={app.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#0075de', textDecoration: 'none', marginTop: '2px' }}>
                    {app.url} <ExternalLink size={10} />
                  </a>
                </div>
                <button onClick={() => startEdit(app)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#615d59' }}>
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(app.id, app.name)}
                  disabled={deletingId === app.id}
                  style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#a39e98' }}
                >
                  {deletingId === app.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
