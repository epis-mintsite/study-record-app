'use client';

import { useMemo, useState } from 'react';
import { StudyRecord, TimeSlot, CATEGORY_COLORS, STANDARD_CATEGORIES, CustomCategory } from '@/lib/types';
import { formatDate } from '@/lib/mockData';

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];
const START_HOUR = 6;
const END_HOUR = 24;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2;

function timeToSlotIndex(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h - START_HOUR) * 2 + Math.floor(m / 30);
}

function slotIndexToTime(index: number): string {
  const totalMinutes = START_HOUR * 60 + index * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getCategoryStyle(category: string, customCategories: CustomCategory[]): { bgColor: string } {
  if (CATEGORY_COLORS[category]) return { bgColor: CATEGORY_COLORS[category].hex };
  const custom = customCategories.find((c) => c.name === category);
  return { bgColor: custom?.color ?? CATEGORY_COLORS['その他'].hex };
}

type MergedCell = { slotIndex: number; span: number; slot: TimeSlot };

function buildMergedCells(record: StudyRecord | undefined): MergedCell[] {
  if (!record) return [];
  const cells: MergedCell[] = [];
  for (const slot of record.timeSlots) {
    const startIdx = Math.max(0, timeToSlotIndex(slot.startTime));
    const endIdx = Math.min(TOTAL_SLOTS, timeToSlotIndex(slot.endTime));
    if (endIdx <= startIdx) continue;
    cells.push({ slotIndex: startIdx, span: endIdx - startIdx, slot });
  }
  return cells.sort((a, b) => a.slotIndex - b.slotIndex);
}

type EditModalProps = {
  slot: TimeSlot;
  onSave: (updated: TimeSlot) => void;
  onClose: () => void;
  customCategories: CustomCategory[];
};

function EditModal({ slot, onSave, onClose, customCategories }: EditModalProps) {
  const [startTime, setStartTime] = useState(slot.startTime);
  const [endTime, setEndTime] = useState(slot.endTime);
  const [category, setCategory] = useState(slot.category);
  const [note, setNote] = useState(slot.note || '');
  const allCategories = [...STANDARD_CATEGORIES, ...customCategories.map((c) => c.name)];

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.35)',
        zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '28px',
          width: '100%',
          maxWidth: '380px',
          boxShadow: 'rgba(0,0,0,0.01) 0px 1px 3px, rgba(0,0,0,0.02) 0px 3px 7px, rgba(0,0,0,0.02) 0px 7px 15px, rgba(0,0,0,0.04) 0px 14px 28px, rgba(0,0,0,0.05) 0px 23px 52px',
          border: '1px solid rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', margin: '0 0 20px' }}>
          学習内容を編集
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[['開始時刻', startTime, setStartTime], ['終了時刻', endTime, setEndTime]].map(([label, val, setter]) => (
              <div key={label as string}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#615d59', marginBottom: '5px' }}>
                  {label as string}
                </label>
                <input
                  type="time"
                  value={val as string}
                  onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                  style={{
                    width: '100%', border: '1px solid #dddddd', borderRadius: '4px',
                    padding: '7px 10px', fontSize: '14px', color: 'rgba(0,0,0,0.9)',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
              </div>
            ))}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#615d59', marginBottom: '5px' }}>科目</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%', border: '1px solid #dddddd', borderRadius: '4px',
                padding: '7px 10px', fontSize: '14px', color: 'rgba(0,0,0,0.9)',
                outline: 'none', fontFamily: 'inherit', background: '#fff',
              }}
            >
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#615d59', marginBottom: '5px' }}>メモ（任意）</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例：漢字ドリル"
              style={{
                width: '100%', border: '1px solid #dddddd', borderRadius: '4px',
                padding: '7px 10px', fontSize: '14px', color: 'rgba(0,0,0,0.9)',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px',
              padding: '8px 16px', fontSize: '14px', fontWeight: 500,
              color: '#615d59', background: 'transparent', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={() => onSave({
              ...slot, startTime, endTime, category,
              note: note || undefined,
              isCustomCategory: !STANDARD_CATEGORIES.includes(category as any),
            })}
            style={{
              flex: 1, border: 'none', borderRadius: '4px',
              padding: '8px 16px', fontSize: '14px', fontWeight: 600,
              color: '#ffffff', background: '#0075de', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

type Props = {
  weekDates: Date[];
  records: StudyRecord[];
  customCategories: CustomCategory[];
  onUpdateSlot?: (date: string, updated: TimeSlot, original: TimeSlot) => void;
};

export default function WeeklyGrid({ weekDates, records, customCategories, onUpdateSlot }: Props) {
  const [editTarget, setEditTarget] = useState<{ date: string; slot: TimeSlot } | null>(null);
  const [showMinutes, setShowMinutes] = useState(false);

  const recordByDate = useMemo(() => {
    const map: Record<string, StudyRecord> = {};
    for (const r of records) map[r.date] = r;
    return map;
  }, [records]);

  const mergedByDate = useMemo(() => {
    const map: Record<string, MergedCell[]> = {};
    for (const date of weekDates) {
      const key = formatDate(date);
      map[key] = buildMergedCells(recordByDate[key]);
    }
    return map;
  }, [weekDates, recordByDate]);

  const allUsedCategories = useMemo(() => {
    const cats = new Set<string>([...STANDARD_CATEGORIES]);
    for (const r of records) for (const s of r.timeSlots) cats.add(s.category);
    return Array.from(cats);
  }, [records]);

  function formatMinutes(min: number) {
    if (showMinutes) return `${min}分`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}時間${m > 0 ? m + '分' : ''}` : `${m}分`;
  }

  function getDailyTotal(date: string, category: string) {
    return recordByDate[date]?.dailyTotals?.[category] || 0;
  }

  function getWeeklyTotal(category: string) {
    return weekDates.reduce((s, d) => s + getDailyTotal(formatDate(d), category), 0);
  }

  function getDayGrandTotal(date: string) {
    return Object.values(recordByDate[date]?.dailyTotals || {}).reduce((s, v) => s + v, 0);
  }

  const weeklyGrandTotal = weekDates.reduce((s, d) => s + getDayGrandTotal(formatDate(d)), 0);

  const COL_TIME = 58;
  const borderWhisper = '1px solid rgba(0,0,0,0.08)';
  const borderHour = '1px solid rgba(0,0,0,0.14)';

  return (
    <div>
      {editTarget && (
        <EditModal
          slot={editTarget.slot}
          customCategories={customCategories}
          onClose={() => setEditTarget(null)}
          onSave={(updated) => {
            onUpdateSlot?.(editTarget.date, updated, editTarget.slot);
            setEditTarget(null);
          }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          onClick={() => setShowMinutes(v => !v)}
          style={{
            background: 'none', border: 'none', fontSize: '12px', fontWeight: 500,
            color: '#a39e98', cursor: 'pointer', padding: '2px 0',
            fontFamily: 'inherit', textDecoration: 'underline',
          }}
        >
          {showMinutes ? '時間表示に切替' : '分表示に切替'}
        </button>
      </div>

      <div
        className="weekly-grid-wrapper"
        style={{
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '12px',
          background: '#ffffff',
          boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.85px, rgba(0,0,0,0.02) 0px 0.8px 2.93px, rgba(0,0,0,0.01) 0px 0.175px 1.04px',
          overflow: 'hidden',
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `${COL_TIME}px repeat(7, 1fr)`,
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            background: '#ffffff',
            minWidth: '640px',
          }}
        >
          <div style={{ padding: '10px 8px', borderRight: borderWhisper }} />
          {weekDates.map((date, i) => {
            const key = formatDate(date);
            const isToday = key === formatDate(new Date());
            const isSat = i === 5;
            const isSun = i === 6;
            return (
              <div
                key={i}
                style={{
                  padding: '10px 4px',
                  textAlign: 'center',
                  borderRight: i < 6 ? borderWhisper : 'none',
                  background: isToday ? '#f2f9ff' : 'transparent',
                }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: isToday ? '#0075de' : isSun ? '#c0392b' : isSat ? '#2980b9' : 'rgba(0,0,0,0.95)',
                  letterSpacing: '-0.1px',
                }}>
                  {DAY_LABELS[i]}
                </div>
                <div style={{ fontSize: '11px', color: '#a39e98', marginTop: '1px' }}>
                  {date.getMonth() + 1}/{date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div style={{ minWidth: '640px' }}>
          {Array.from({ length: TOTAL_SLOTS }, (_, rowIdx) => {
            const timeLabel = slotIndexToTime(rowIdx);
            const isHour = rowIdx % 2 === 0;

            return (
              <div
                key={rowIdx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `${COL_TIME}px repeat(7, 1fr)`,
                  height: '32px',
                  borderBottom: isHour ? borderHour : borderWhisper,
                }}
              >
                {/* Time label */}
                <div
                  style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                    paddingRight: '8px', paddingTop: '3px',
                    borderRight: '1px solid rgba(0,0,0,0.1)',
                    fontSize: '10px', color: '#a39e98', fontWeight: 500,
                    userSelect: 'none',
                  }}
                >
                  {isHour ? timeLabel : ''}
                </div>

                {/* Day columns */}
                {weekDates.map((date, colIdx) => {
                  const dateKey = formatDate(date);
                  const cells = mergedByDate[dateKey] || [];
                  const covered = cells.find(c => c.slotIndex < rowIdx && c.slotIndex + c.span > rowIdx);
                  if (covered) return null;

                  const starting = cells.find(c => c.slotIndex === rowIdx);
                  if (starting) {
                    const { bgColor } = getCategoryStyle(starting.slot.category, customCategories);
                    return (
                      <div
                        key={colIdx}
                        onClick={() => setEditTarget({ date: dateKey, slot: starting.slot })}
                        style={{
                          gridRow: `span ${starting.span}`,
                          height: `${32 * starting.span}px`,
                          backgroundColor: bgColor,
                          borderRight: colIdx < 6 ? borderWhisper : 'none',
                          padding: '4px 6px',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          transition: 'filter 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.96)')}
                        onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(0,0,0,0.85)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {starting.slot.category}
                        </div>
                        {starting.slot.note && starting.span > 1 && (
                          <div style={{ fontSize: '10px', color: '#615d59', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {starting.slot.note}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={colIdx}
                      style={{ borderRight: colIdx < 6 ? borderWhisper : 'none', background: 'transparent' }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Totals section */}
        <div style={{ borderTop: '2px solid rgba(0,0,0,0.12)', minWidth: '640px' }}>
          {/* Sub-header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `${COL_TIME}px repeat(7, 1fr) 72px`,
              background: '#f6f5f4',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ padding: '7px 8px', fontSize: '11px', fontWeight: 600, color: '#615d59', borderRight: borderWhisper }}>科目</div>
            {DAY_LABELS.map((d, i) => (
              <div key={d} style={{ padding: '7px 4px', fontSize: '11px', fontWeight: 600, color: '#615d59', textAlign: 'center', borderRight: i < 6 ? borderWhisper : 'none' }}>{d}</div>
            ))}
            <div style={{ padding: '7px 4px', fontSize: '11px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', textAlign: 'center' }}>週計</div>
          </div>

          {/* Category rows */}
          {allUsedCategories.map((cat) => {
            const weeklyTotal = getWeeklyTotal(cat);
            if (weeklyTotal === 0) return null;
            const { bgColor } = getCategoryStyle(cat, customCategories);
            return (
              <div
                key={cat}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `${COL_TIME}px repeat(7, 1fr) 72px`,
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <div style={{
                  padding: '7px 8px', fontSize: '12px', fontWeight: 600,
                  color: 'rgba(0,0,0,0.85)', borderRight: borderWhisper,
                  background: bgColor,
                }}>
                  {cat}
                </div>
                {weekDates.map((d, i) => {
                  const min = getDailyTotal(formatDate(d), cat);
                  return (
                    <div key={i} style={{
                      padding: '7px 4px', fontSize: '12px', textAlign: 'center',
                      color: min > 0 ? 'rgba(0,0,0,0.85)' : 'transparent',
                      borderRight: i < 6 ? borderWhisper : 'none',
                      fontWeight: min > 0 ? 500 : 400,
                    }}>
                      {min > 0 ? formatMinutes(min) : '-'}
                    </div>
                  );
                })}
                <div style={{ padding: '7px 4px', fontSize: '12px', textAlign: 'center', fontWeight: 700, color: 'rgba(0,0,0,0.95)' }}>
                  {formatMinutes(weeklyTotal)}
                </div>
              </div>
            );
          })}

          {/* Grand total */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `${COL_TIME}px repeat(7, 1fr) 72px`,
              background: '#f6f5f4',
            }}
          >
            <div style={{ padding: '9px 8px', fontSize: '12px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', borderRight: borderWhisper }}>合計</div>
            {weekDates.map((d, i) => {
              const total = getDayGrandTotal(formatDate(d));
              return (
                <div key={i} style={{
                  padding: '9px 4px', fontSize: '12px', textAlign: 'center',
                  fontWeight: total > 0 ? 700 : 400,
                  color: total > 0 ? 'rgba(0,0,0,0.95)' : '#a39e98',
                  borderRight: i < 6 ? borderWhisper : 'none',
                }}>
                  {total > 0 ? formatMinutes(total) : '—'}
                </div>
              );
            })}
            <div style={{ padding: '9px 4px', fontSize: '12px', textAlign: 'center', fontWeight: 700, color: '#0075de' }}>
              {weeklyGrandTotal > 0 ? formatMinutes(weeklyGrandTotal) : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
