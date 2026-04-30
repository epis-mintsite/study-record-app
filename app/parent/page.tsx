'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import WeeklyGrid from '@/app/components/WeeklyGrid';
import { MOCK_RECORDS, getWeekDates, formatDate } from '@/lib/mockData';
import { CustomCategory } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { getUserRole } from '@/lib/db';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const CUSTOM_CATS: CustomCategory[] = [
  { id: '1', userId: 'mock-user', name: 'ピアノ', color: '#FEF9C3' },
  { id: '2', userId: 'mock-user', name: 'ダンス', color: '#FEE2E2' },
];

const CHART_COLORS: Record<string, string> = {
  '国語': '#C084FC', '数学': '#38BDF8', '英語': '#F472B6',
  '理科': '#4ADE80', '社会': '#FB923C',
};

function buildMonthlyChartData() {
  return Array.from({ length: 4 }, (_, w) => {
    const entry: Record<string, number | string> = { name: `第${w + 1}週` };
    Object.keys(CHART_COLORS).forEach(cat => {
      entry[cat] = Math.floor(Math.random() * 180 + 60);
    });
    return entry;
  });
}

export default function ParentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [roleChecked, setRoleChecked] = useState(false);
  const [referenceDate, setReferenceDate] = useState(new Date());
  const weekDates = getWeekDates(referenceDate);
  const [chartData] = useState(buildMonthlyChartData);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    getUserRole(user.id).then(role => {
      if (role !== 'parent') {
        router.replace('/weekly');
      } else {
        setRoleChecked(true);
      }
    });
  }, [user, authLoading, router]);

  function prevWeek() { const d = new Date(referenceDate); d.setDate(d.getDate() - 7); setReferenceDate(d); }
  function nextWeek() { const d = new Date(referenceDate); d.setDate(d.getDate() + 7); setReferenceDate(d); }

  const weekLabel = (() => {
    const s = weekDates[0], e = weekDates[6];
    return `${s.getFullYear()}年${s.getMonth() + 1}月${s.getDate()}日 〜 ${e.getMonth() + 1}月${e.getDate()}日`;
  })();

  const filteredRecords = MOCK_RECORDS.filter(r => weekDates.some(d => formatDate(d) === r.date));

  if (authLoading || !roleChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <Loader2 size={24} color="#a39e98" className="animate-spin" />
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '12px', padding: '24px',
    boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.85px, rgba(0,0,0,0.02) 0px 0.8px 2.93px',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '32px 24px 64px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: '9999px',
                background: '#f2f9ff', fontSize: '12px', fontWeight: 600, color: '#097fe8',
                letterSpacing: '0.125px',
              }}>
                閲覧専用
              </span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.625px', margin: 0 }}>
              保護者ダッシュボード
            </h1>
          </div>
        </div>

        {/* Monthly chart */}
        <div style={{ ...cardStyle, marginBottom: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(0,0,0,0.95)', margin: '0 0 20px', letterSpacing: '-0.2px' }}>
            月間科目別学習時間
            <span style={{ fontSize: '12px', fontWeight: 400, color: '#a39e98', marginLeft: '8px' }}>（分）</span>
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#615d59', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a39e98', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
                  boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px',
                  fontSize: '12px', fontFamily: 'inherit',
                }}
                formatter={(v) => [`${v}分`]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'inherit', color: '#615d59' }} />
              {Object.entries(CHART_COLORS).map(([cat, color]) => (
                <Bar key={cat} dataKey={cat} fill={color} stackId="a" radius={[0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={prevWeek} aria-label="前の週"
            style={{
              width: '32px', height: '32px', borderRadius: '4px',
              border: '1px solid rgba(0,0,0,0.1)', background: '#ffffff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#615d59',
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.2px' }}>
            {weekLabel}
          </span>
          <button
            onClick={nextWeek} aria-label="次の週"
            style={{
              width: '32px', height: '32px', borderRadius: '4px',
              border: '1px solid rgba(0,0,0,0.1)', background: '#ffffff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#615d59',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <WeeklyGrid
          weekDates={weekDates}
          records={filteredRecords}
          customCategories={CUSTOM_CATS}
        />
      </main>
    </div>
  );
}
