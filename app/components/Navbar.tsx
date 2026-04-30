'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Mic, Users, LogOut, BarChart2, NotebookPen } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { getUserRole } from '@/lib/db';
import { useState, useEffect } from 'react';

const studentNavItems = [
  { href: '/weekly', label: '週間表',   icon: BookOpen },
  { href: '/record', label: '記録する', icon: Mic },
  { href: '/tests',  label: '成績',     icon: BarChart2 },
  { href: '/review', label: '振返り',   icon: NotebookPen },
];

const parentNavItems = [
  { href: '/weekly', label: '週間表',   icon: BookOpen },
  { href: '/record', label: '記録する', icon: Mic },
  { href: '/tests',  label: '成績',     icon: BarChart2 },
  { href: '/review', label: '振返り',   icon: NotebookPen },
  { href: '/parent', label: '保護者',   icon: Users },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [role, setRole] = useState<'student' | 'parent' | null>(null);

  useEffect(() => {
    if (!user) { setRole(null); return; }
    getUserRole(user.id).then(r => setRole(r));
  }, [user]);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  const navItems = role === 'parent' ? parentNavItems : studentNavItems;

  return (
    <nav style={{ background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
      <div style={{
        maxWidth: '1200px', margin: '0 auto', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px',
      }}>
        {/* Logo */}
        <Link href="/weekly" style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          textDecoration: 'none', color: 'rgba(0,0,0,0.95)',
          fontWeight: 700, fontSize: '15px', letterSpacing: '-0.2px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" fill="#0075de" />
            <rect x="7" y="8" width="10" height="1.5" rx="0.75" fill="white" />
            <rect x="7" y="11" width="7" height="1.5" rx="0.75" fill="white" />
            <rect x="7" y="14" width="8" height="1.5" rx="0.75" fill="white" />
          </svg>
          学習記録
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '4px',
                fontSize: '14px', fontWeight: active ? 600 : 500,
                color: active ? 'rgba(0,0,0,0.95)' : '#615d59',
                background: active ? 'rgba(0,0,0,0.05)' : 'transparent',
                textDecoration: 'none', transition: 'background 0.1s, color 0.1s',
              }}>
                <Icon size={14} />
                {label}
              </Link>
            );
          })}

          {user && (
            <button
              onClick={handleSignOut}
              aria-label="サインアウト"
              title={user.email}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 10px', borderRadius: '4px', border: 'none',
                fontSize: '13px', fontWeight: 500, color: '#a39e98',
                background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                marginLeft: '4px',
              }}
            >
              <LogOut size={14} />
              ログアウト
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
