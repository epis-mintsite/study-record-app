'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Save, Loader2, Sparkles } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/lib/useAuth';
import { getWeekDates, formatDate } from '@/lib/mockData';
import { getStudyRecords, getWeeklyReview, upsertWeeklyReview } from '@/lib/db';
import { StudyRecord } from '@/lib/types';

export default function ReviewPage() {
  const { user, loading: authLoading } = useAuth();
  const isDemo = !user;

  const [referenceDate, setReferenceDate] = useState(new Date());
  const weekDates = getWeekDates(referenceDate);
  const weekStart  = formatDate(weekDates[0]);

  const [reviewText,   setReviewText]   = useState('');
  const [improvement,  setImprovement]  = useState('');
  const [testStrategy, setTestStrategy] = useState('');
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [aiLoading,    setAiLoading]    = useState<string | null>(null);

  const weekLabel = (() => {
    const s = weekDates[0], e = weekDates[6];
    return `${s.getFullYear()}年${s.getMonth() + 1}月${s.getDate()}日 〜 ${e.getMonth() + 1}月${e.getDate()}日`;
  })();

  const load = useCallback(async () => {
    if (isDemo || !user) return;
    setLoading(true);
    try {
      const dateStrings = weekDates.map(formatDate);
      const [records, review] = await Promise.all([
        getStudyRecords(user.id, dateStrings),
        getWeeklyReview(user.id, weekStart),
      ]);
      setStudyRecords(records);
      setReviewText(review?.reviewText ?? '');
      setImprovement(review?.improvement ?? '');
      setTestStrategy(review?.testStrategy ?? '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isDemo, weekStart]);

  useEffect(() => {
    setSaved(false);
    if (!authLoading) load();
  }, [authLoading, load]);

  // study summary
  const summary: Record<string, number> = {};
  for (const r of studyRecords) {
    for (const [cat, min] of Object.entries(r.dailyTotals ?? {})) {
      summary[cat] = (summary[cat] ?? 0) + min;
    }
  }
  const totalMin   = Object.values(summary).reduce((s, v) => s + v, 0);
  const topSubjects = Object.entries(summary).sort((a, b) => b[1] - a[1]).slice(0, 5);

  function fmt(min: number) {
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}時間${m > 0 ? m + '分' : ''}` : `${m}分`;
  }

  async function handleAI(section: 'review' | 'improvement' | 'testStrategy') {
    setAiLoading(section);
    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, studySummary: summary, totalMin, weekLabel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI生成に失敗しました。');
      if (section === 'review')       setReviewText(data.text);
      if (section === 'improvement')  setImprovement(data.text);
      if (section === 'testStrategy') setTestStrategy(data.text);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'AI生成に失敗しました。');
    } finally {
      setAiLoading(null);
    }
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await upsertWeeklyReview(user.id, weekStart, {
        studySnapshot: summary,
        reviewText,
        improvement,
        testStrategy,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  // ---- styles ----
  const navBtn: React.CSSProperties = {
    width: '32px', height: '32px', borderRadius: '4px',
    border: '1px solid rgba(0,0,0,0.12)', background: '#ffffff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#615d59',
  };
  const cardStyle: React.CSSProperties = {
    background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)',
    borderRadius: '12px', padding: '24px',
    boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px',
  };
  const textareaStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #d1d5db', borderRadius: '8px',
    padding: '12px 14px', fontSize: '14px', color: 'rgba(0,0,0,0.9)',
    outline: 'none', fontFamily: 'inherit', resize: 'vertical',
    lineHeight: 1.7, boxSizing: 'border-box', minHeight: '120px',
    background: isDemo ? '#fafafa' : '#ffffff',
  };
  const aiBtn = (section: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '4px 10px', borderRadius: '6px',
    border: '1px solid rgba(0,0,0,0.12)',
    background: aiLoading === section ? '#EFF6FF' : '#FAFAFA',
    fontSize: '12px',
    color: aiLoading === section ? '#2563EB' : '#6B7280',
    cursor: aiLoading ? 'default' : 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.1s',
  });

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} color="#a39e98" className="animate-spin" />
    </div>
  );

  const sections: { key: 'review' | 'improvement' | 'testStrategy'; label: string; value: string; setter: (v: string) => void; placeholder: string }[] = [
    {
      key: 'review', label: '📊 今週の振返り',
      value: reviewText, setter: setReviewText,
      placeholder: '今週の学習を振り返って書きましょう。\n例：数学と英語に集中できた。理科が少なかったので来週は増やしたい。',
    },
    {
      key: 'improvement', label: '💡 来週への改善案',
      value: improvement, setter: setImprovement,
      placeholder: '来週取り組みたいことや改善点を書きましょう。\n例：\n1. 毎日理科を30分確保する\n2. 数学の応用問題を週3回解く',
    },
    {
      key: 'testStrategy', label: '📝 テスト対策',
      value: testStrategy, setter: setTestStrategy,
      placeholder: '直近のテストや検定に向けた対策を書きましょう。\n例：中間テストまで3週間。数学の計算問題を毎日練習し、英語は長文読解を週2回する。',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: '760px', margin: '0 auto', width: '100%', padding: '32px 24px 64px' }}>

        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.625px', margin: '0 0 24px' }}>
          週間振返り
        </h1>

        {isDemo && (
          <div style={{ background: '#f6f5f4', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '10px 16px', marginBottom: '20px', fontSize: '13px', color: '#615d59' }}>
            デモモードで表示中。振返りを保存するには <a href="/login" style={{ color: '#0075de', fontWeight: 600, textDecoration: 'none' }}>ログイン</a> してください。
          </div>
        )}

        {/* week nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <button onClick={() => { const d = new Date(referenceDate); d.setDate(d.getDate() - 7); setReferenceDate(d); }} style={navBtn} aria-label="前の週">
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.2px' }}>{weekLabel}</span>
          <button onClick={() => { const d = new Date(referenceDate); d.setDate(d.getDate() + 7); setReferenceDate(d); }} style={navBtn} aria-label="次の週">
            <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#a39e98', gap: '10px' }}>
            <Loader2 size={20} className="animate-spin" />
            <span style={{ fontSize: '14px' }}>読み込み中...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* study summary */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.9)', margin: '0 0 14px' }}>今週の学習サマリー</h2>
              {totalMin === 0 ? (
                <p style={{ fontSize: '13px', color: '#a39e98', margin: 0 }}>この週の学習記録はありません。</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                  <div style={{ padding: '8px 16px', borderRadius: '8px', background: '#F0F7FF', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 500, marginBottom: '2px' }}>合計</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#1D4ED8' }}>{fmt(totalMin)}</div>
                  </div>
                  {topSubjects.map(([cat, min]) => (
                    <div key={cat} style={{ padding: '8px 14px', borderRadius: '8px', background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.08)' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500, marginBottom: '2px' }}>{cat}</div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>{fmt(min)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* text sections */}
            {sections.map(sec => (
              <div key={sec.key} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.9)', margin: 0 }}>{sec.label}</h2>
                  {!isDemo && (
                    <button
                      onClick={() => handleAI(sec.key)}
                      disabled={aiLoading !== null}
                      style={aiBtn(sec.key)}
                    >
                      {aiLoading === sec.key
                        ? <><Loader2 size={12} className="animate-spin" /> 生成中...</>
                        : <><Sparkles size={12} /> AIに下書きを作ってもらう</>
                      }
                    </button>
                  )}
                </div>
                <textarea
                  value={sec.value}
                  onChange={e => sec.setter(e.target.value)}
                  placeholder={sec.placeholder}
                  style={textareaStyle}
                  disabled={isDemo}
                />
              </div>
            ))}

            {/* save */}
            {!isDemo && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
                {saved && (
                  <span style={{ fontSize: '13px', color: '#065F46', fontWeight: 500 }}>✓ 保存しました</span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', borderRadius: '6px', border: 'none', background: '#0075de', fontSize: '14px', fontWeight: 600, color: '#ffffff', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}
                >
                  {saving
                    ? <><Loader2 size={14} className="animate-spin" />保存中</>
                    : <><Save size={14} />この週を保存</>}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
