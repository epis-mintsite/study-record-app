'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, PenLine, Users, LogOut, BarChart2, NotebookPen, Trophy, GraduationCap } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { getUserRole } from '@/lib/db';
import { useState, useEffect } from 'react';

const studentNavItems = [
  { href: '/weekly',     label: '週間表',      icon: BookOpen },
  { href: '/record',     label: '記録する',    icon: PenLine },
  { href: '/tests',      label: '成績',        icon: BarChart2 },
  { href: '/past-exams', label: '過去問',      icon: GraduationCap },
  { href: '/review',     label: '振返り',      icon: NotebookPen },
  { href: '/ranking',    label: 'ランキング',  icon: Trophy },
];

const parentNavItems = [
  { href: '/weekly',     label: '週間表',      icon: BookOpen },
  { href: '/record',     label: '記録する',    icon: PenLine },
  { href: '/tests',      label: '成績',        icon: BarChart2 },
  { href: '/past-exams', label: '過去問',      icon: GraduationCap },
  { href: '/review',     label: '振返り',      icon: NotebookPen },
  { href: '/ranking',    label: 'ランキング',  icon: Trophy },
  { href: '/parent',     label: '保護者',      icon: Users },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [role, setRole] = useState<'student' | 'parent' | 'admin' | null>(null);

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
    <>
      <style>{`
        .navbar-desktop-items { display: flex; }
        .navbar-bottom { display: none; }
        @media (max-width: 640px) {
          .navbar-desktop-items { display: none; }
          .navbar-bottom { display: flex; }
          .navbar-main-padding { padding: 0 16px !important; }
        }
      `}</style>

      {/* Top bar */}
      <nav style={{ background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="navbar-main-padding" style={{
          maxWidth: '1200px', margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px',
        }}>
          {/* Logo */}
          <Link href="/weekly" style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            textDecoration: 'none', color: 'rgba(0,0,0,0.95)',
            fontWeight: 700, fontSize: '15px', letterSpacing: '-0.2px', flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" fill="#0075de" />
              <rect x="7" y="8" width="10" height="1.5" rx="0.75" fill="white" />
              <rect x="7" y="11" width="7" height="1.5" rx="0.75" fill="white" />
              <rect x="7" y="14" width="8" height="1.5" rx="0.75" fill="white" />
            </svg>
            学習記録
          </Link>

          {/* Desktop nav items */}
          <div className="navbar-desktop-items" style={{ alignItems: 'center', gap: '4px' }}>
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
                  whiteSpace: 'nowrap',
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
                  marginLeft: '4px', whiteSpace: 'nowrap',
                }}
              >
                <LogOut size={14} />
                ログアウト
              </button>
            )}
          </div>

          {/* Mobile: logout only in top bar */}
          {user && (
            <button
              onClick={handleSignOut}
              className="navbar-desktop-items"
              aria-label="サインアウト"
              style={{
                display: 'none', alignItems: 'center', gap: '4px',
                padding: '6px 8px', borderRadius: '4px', border: 'none',
                fontSize: '12px', fontWeight: 500, color: '#a39e98',
                background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="navbar-bottom" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: '#ffffff', borderTop: '1px solid rgba(0,0,0,0.1)',
        alignItems: 'center', justifyContent: 'space-around',
        height: '60px', paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '3px', padding: '6px 8px', borderRadius: '8px',
              textDecoration: 'none', flex: 1,
              color: active ? '#0075de' : '#a39e98',
              transition: 'color 0.1s',
            }}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: '10px', fontWeight: active ? 700 : 500, lineHeight: 1 }}>
                {label}
              </span>
            </Link>
          );
        })}
        {user && (
          <button onClick={handleSignOut} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '3px', padding: '6px 8px', border: 'none',
            background: 'transparent', cursor: 'pointer', flex: 1,
            color: '#a39e98', fontFamily: 'inherit',
          }}>
            <LogOut size={22} strokeWidth={1.8} />
            <span style={{ fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>ログアウト</span>
          </button>
        )}
      </nav>

      {/* Bottom bar spacer for mobile */}
      <style>{`
        @media (max-width: 640px) {
          body { padding-bottom: 60px; }
        }
      `}</style>
    </>
  );
}
