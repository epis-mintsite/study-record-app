'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, Plus, X, Loader2, Pencil, Trash2 } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import WeeklyGrid from '@/app/components/WeeklyGrid';
import { MOCK_RECORDS, getWeekDates, formatDate, computeDailyTotals } from '@/lib/mockData';
import { StudyRecord, TimeSlot, CustomCategory, CUSTOM_CATEGORY_PRESETS } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { getStudyRecords, upsertStudyRecord, getCustomCategories, saveCustomCategory, updateCustomCategory, deleteCustomCategory } from '@/lib/db';

const DEMO_CUSTOM_CATS: CustomCategory[] = [
  { id: '1', userId: 'demo', name: 'ピアノ', color: '#FEF9C3' },
  { id: '2', userId: 'demo', name: 'ダンス', color: '#FEE2E2' },
];

export default function WeeklyPage() {
  const { user, loading: authLoading } = useAuth();
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(DEMO_CUSTOM_CATS);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(CUSTOM_CATEGORY_PRESETS[0]);
  const [savingCat, setSavingCat] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(CUSTOM_CATEGORY_PRESETS[0]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const weekDates = getWeekDates(referenceDate);
  const isDemo = !user;

  // Load week data
  const loadWeekData = useCallback(async (dates: Date[]) => {
    if (isDemo) {
      // Demo mode: filter mock records
      setRecords(MOCK_RECORDS.filter(r => dates.some(d => formatDate(d) === r.date)));
      return;
    }
    setDataLoading(true);
    setDataError('');
    try {
      const dateStrings = dates.map(formatDate);
      const [weekRecords, cats] = await Promise.all([
        getStudyRecords(user.id, dateStrings),
        getCustomCategories(user.id),
      ]);
      setRecords(weekRecords);
      setCustomCategories(cats);
    } catch (e) {
      setDataError(e instanceof Error ? e.message : 'データの読み込みに失敗しました。');
    } finally {
      setDataLoading(false);
    }
  }, [user, isDemo]);

  useEffect(() => {
    if (!authLoading) loadWeekData(weekDates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, referenceDate, user]);

  function prevWeek() {
    const d = new Date(referenceDate); d.setDate(d.getDate() - 7); setReferenceDate(d);
  }
  function nextWeek() {
    const d = new Date(referenceDate); d.setDate(d.getDate() + 7); setReferenceDate(d);
  }
  function goToday() { setReferenceDate(new Date()); }

  function handleUpdateSlot(date: string, updated: TimeSlot, original: TimeSlot) {
    setRecords(prev => prev.map(r => {
      if (r.date !== date) return r;
      const newSlots = r.timeSlots.map(s => s === original ? updated : s);
      return { ...r, timeSlots: newSlots, dailyTotals: computeDailyTotals(newSlots) };
    }));
  }

  async function handleAddSlot(date: string, slot: TimeSlot) {
    const currentRecord = records.find(r => r.date === date);
    const updatedSlots = currentRecord ? [...currentRecord.timeSlots, slot] : [slot];
    const newDailyTotals = computeDailyTotals(updatedSlots);

    // ローカル state を即時更新
    setRecords(prev => {
      const exists = prev.some(r => r.date === date);
      if (exists) {
        return prev.map(r => r.date === date
          ? { ...r, timeSlots: updatedSlots, dailyTotals: newDailyTotals }
          : r
        );
      }
      return [...prev, { id: Date.now().toString(), userId: user?.id ?? 'demo', date, timeSlots: updatedSlots, dailyTotals: newDailyTotals }];
    });

    // Supabase に保存
    if (!isDemo && user) {
      try {
        await upsertStudyRecord(user.id, date, updatedSlots);
      } catch (e) {
        alert(e instanceof Error ? e.message : '保存に失敗しました。');
        loadWeekData(weekDates);
      }
    }
  }

  async function handleDownloadPDF() {
    if (!gridRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      // オフスクリーンにクローンを生成して全幅・全高をキャプチャ
      const clone = gridRef.current.cloneNode(true) as HTMLElement;
      Object.assign(clone.style, {
        position: 'fixed',
        top: '-99999px',
        left: '0',
        width: '900px',
        overflow: 'visible',
        zIndex: '-9999',
      });
      clone.querySelectorAll<HTMLElement>('*').forEach(el => {
        el.style.overflow = 'visible';
        el.style.overflowX = 'visible';
        el.style.overflowY = 'visible';
      });
      document.body.appendChild(clone);
      await new Promise(r => requestAnimationFrame(r));

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        windowWidth: 900,
      });
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/png');
      // グリッドは縦長 → A4縦向きに全体を収める
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 6;
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;
      const scale = Math.min(availW / canvas.width, availH / canvas.height);
      const drawW = canvas.width * scale;
      const drawH = canvas.height * scale;
      const x = margin + (availW - drawW) / 2;
      const y = margin + (availH - drawH) / 2;
      pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);

      const start = weekDates[0];
      pdf.save(`学習記録_${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日_週間.pdf`);
    } catch (e) {
      console.error(e);
      alert('PDFの生成に失敗しました。');
    }
  }

  async function addCustomCategory() {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      if (isDemo) {
        setCustomCategories(prev => [...prev, {
          id: Date.now().toString(), userId: 'demo',
          name: newCatName.trim(), color: newCatColor,
        }]);
      } else {
        await saveCustomCategory(user.id, newCatName.trim(), newCatColor);
        // 保存後にサーバーから全カテゴリを再取得（iOS Safari 対応）
        const cats = await getCustomCategories(user.id);
        setCustomCategories(cats);
      }
      setNewCatName('');
      setShowCategoryModal(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : '科目の保存に失敗しました。');
    } finally {
      setSavingCat(false);
    }
  }

  function openEditModal(cat: CustomCategory) {
    setEditTarget(cat);
    setEditName(cat.name);
    setEditColor(cat.color);
  }

  async function handleEditCategory() {
    if (!editTarget || !editName.trim()) return;
    setSavingCat(true);
    try {
      if (isDemo) {
        setCustomCategories(prev => prev.map(c =>
          c.id === editTarget.id ? { ...c, name: editName.trim(), color: editColor } : c
        ));
      } else {
        await updateCustomCategory(editTarget.id, editName.trim(), editColor);
        const cats = await getCustomCategories(user.id);
        setCustomCategories(cats);
      }
      setEditTarget(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : '科目の更新に失敗しました。');
    } finally {
      setSavingCat(false);
    }
  }

  async function handleDeleteCategory(cat: CustomCategory) {
    if (!window.confirm(`「${cat.name}」を削除しますか？`)) return;
    setDeletingId(cat.id);
    try {
      if (isDemo) {
        setCustomCategories(prev => prev.filter(c => c.id !== cat.id));
      } else {
        await deleteCustomCategory(cat.id);
        setCustomCategories(prev => prev.filter(c => c.id !== cat.id));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '科目の削除に失敗しました。');
    } finally {
      setDeletingId(null);
    }
  }

  const weekLabel = (() => {
    const s = weekDates[0], e = weekDates[6];
    return `${s.getFullYear()}年${s.getMonth() + 1}月${s.getDate()}日 〜 ${e.getMonth() + 1}月${e.getDate()}日`;
  })();

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <Loader2 size={24} color="#a39e98" className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '32px 24px 64px' }}>
        {/* Demo banner */}
        {isDemo && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#f6f5f4', border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '6px', padding: '10px 16px', marginBottom: '20px',
            fontSize: '13px', color: '#615d59', flexWrap: 'wrap', gap: '8px',
          }}>
            <span>デモモードで表示中。実際のデータを記録するには <a href="/login" style={{ color: '#0075de', textDecoration: 'none', fontWeight: 600 }}>ログイン</a> してください。</span>
          </div>
        )}

        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.625px', margin: '0 0 20px' }}>
          まなびログ
        </h1>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={prevWeek} aria-label="前の週" style={navBtnStyle}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
              {weekLabel}
            </span>
            <button onClick={nextWeek} aria-label="次の週" style={navBtnStyle}>
              <ChevronRight size={16} />
            </button>
            <button onClick={goToday} style={pillBtnStyle}>今週</button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowCategoryModal(true)} style={secondaryBtnStyle}>
              <Plus size={14} /> 科目追加
            </button>
            <button onClick={handleDownloadPDF} aria-label="PDFでダウンロード" style={primaryBtnStyle}>
              <Download size={14} /> PDF
            </button>
          </div>
        </div>

        {/* Category tags */}
        {customCategories.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
            {customCategories.map(c => (
              <span key={c.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 6px 3px 10px', borderRadius: '9999px',
                background: c.color, border: '1px solid rgba(0,0,0,0.08)',
                fontSize: '12px', fontWeight: 500, color: 'rgba(0,0,0,0.75)',
              }}>
                {c.name}
                <button onClick={() => openEditModal(c)} title="編集" style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                  display: 'flex', alignItems: 'center', color: 'rgba(0,0,0,0.4)',
                  borderRadius: '3px',
                }}>
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => handleDeleteCategory(c)}
                  disabled={deletingId === c.id}
                  title="削除"
                  style={{
                    background: 'none', border: 'none', cursor: deletingId === c.id ? 'default' : 'pointer',
                    padding: '2px', display: 'flex', alignItems: 'center', color: 'rgba(0,0,0,0.35)',
                    borderRadius: '3px',
                  }}
                >
                  {deletingId === c.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Error */}
        {dataError && (
          <div style={{
            background: '#fff5f5', border: '1px solid rgba(220,38,38,0.15)',
            borderRadius: '6px', padding: '10px 14px', marginBottom: '16px',
            fontSize: '13px', color: '#c0392b',
          }}>
            ⚠ {dataError}
          </div>
        )}

        {/* Grid */}
        {dataLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '10px', color: '#a39e98' }}>
            <Loader2 size={20} className="animate-spin" />
            <span style={{ fontSize: '14px' }}>読み込み中...</span>
          </div>
        ) : (
          <div ref={gridRef}>
            <WeeklyGrid
              weekDates={weekDates}
              records={records}
              customCategories={customCategories}
              onUpdateSlot={handleUpdateSlot}
              onAddSlot={handleAddSlot}
            />
          </div>
        )}
      </main>

      {/* Category modal */}
      {showCategoryModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={e => e.target === e.currentTarget && setShowCategoryModal(false)}
        >
          <div style={{
            background: '#ffffff', borderRadius: '12px', padding: '28px',
            width: '100%', maxWidth: '360px',
            boxShadow: 'rgba(0,0,0,0.01) 0px 1px 3px, rgba(0,0,0,0.02) 0px 3px 7px, rgba(0,0,0,0.04) 0px 14px 28px, rgba(0,0,0,0.05) 0px 23px 52px',
            border: '1px solid rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', margin: 0 }}>科目を追加</h3>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a39e98', padding: '2px' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>科目名</label>
                <input
                  type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  placeholder="例：ピアノ、ダンス、習字"
                  onKeyDown={e => e.key === 'Enter' && addCustomCategory()}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>色</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {CUSTOM_CATEGORY_PRESETS.map(color => (
                    <button key={color} onClick={() => setNewCatColor(color)} aria-label={`色 ${color}`} style={{
                      width: '28px', height: '28px', borderRadius: '50%', background: color, cursor: 'pointer',
                      border: newCatColor === color ? '2px solid #0075de' : '2px solid rgba(0,0,0,0.1)',
                      transform: newCatColor === color ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform 0.1s',
                    }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setShowCategoryModal(false)} style={{ flex: 1, border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px', padding: '8px 16px', fontSize: '14px', fontWeight: 500, color: '#615d59', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                キャンセル
              </button>
              <button onClick={addCustomCategory} disabled={savingCat} style={{ flex: 1, border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, color: '#ffffff', background: '#0075de', cursor: savingCat ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {savingCat ? <><Loader2 size={14} className="animate-spin" /> 保存中</> : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit category modal */}
      {editTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={e => e.target === e.currentTarget && setEditTarget(null)}
        >
          <div style={{
            background: '#ffffff', borderRadius: '12px', padding: '28px',
            width: '100%', maxWidth: '360px',
            boxShadow: 'rgba(0,0,0,0.01) 0px 1px 3px, rgba(0,0,0,0.02) 0px 3px 7px, rgba(0,0,0,0.04) 0px 14px 28px, rgba(0,0,0,0.05) 0px 23px 52px',
            border: '1px solid rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', margin: 0 }}>科目を編集</h3>
              <button onClick={() => setEditTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a39e98', padding: '2px' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>科目名</label>
                <input
                  type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEditCategory()}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>色</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {CUSTOM_CATEGORY_PRESETS.map(color => (
                    <button key={color} onClick={() => setEditColor(color)} aria-label={`色 ${color}`} style={{
                      width: '28px', height: '28px', borderRadius: '50%', background: color, cursor: 'pointer',
                      border: editColor === color ? '2px solid #0075de' : '2px solid rgba(0,0,0,0.1)',
                      transform: editColor === color ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform 0.1s',
                    }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setEditTarget(null)} style={{ flex: 1, border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px', padding: '8px 16px', fontSize: '14px', fontWeight: 500, color: '#615d59', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                キャンセル
              </button>
              <button onClick={handleEditCategory} disabled={savingCat} style={{ flex: 1, border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, color: '#ffffff', background: '#0075de', cursor: savingCat ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {savingCat ? <><Loader2 size={14} className="animate-spin" /> 保存中</> : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Shared styles
const navBtnStyle: React.CSSProperties = {
  width: '32px', height: '32px', borderRadius: '4px',
  border: '1px solid rgba(0,0,0,0.1)', background: '#ffffff',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#615d59',
};
const pillBtnStyle: React.CSSProperties = {
  padding: '3px 10px', borderRadius: '9999px', background: '#f2f9ff', border: 'none',
  fontSize: '12px', fontWeight: 600, color: '#097fe8', cursor: 'pointer',
  fontFamily: 'inherit', letterSpacing: '0.125px',
};
const primaryBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '7px 16px', borderRadius: '4px', border: 'none',
  background: '#0075de', fontSize: '14px', fontWeight: 600,
  color: '#ffffff', cursor: 'pointer', fontFamily: 'inherit',
};
const secondaryBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '7px 14px', borderRadius: '4px',
  border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.03)',
  fontSize: '14px', fontWeight: 500, color: 'rgba(0,0,0,0.75)',
  cursor: 'pointer', fontFamily: 'inherit',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 500, color: '#615d59', marginBottom: '6px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #dddddd', borderRadius: '4px',
  padding: '7px 10px', fontSize: '14px', color: 'rgba(0,0,0,0.9)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
