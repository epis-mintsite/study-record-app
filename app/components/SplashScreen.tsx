'use client';

import { useEffect, useRef, useState } from 'react';

const FADE_MS = 550;
const HOLD_MS = 1000;

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 20);
    const hideTimer = setTimeout(() => setVisible(false), FADE_MS + HOLD_MS);
    const doneTimer = setTimeout(() => onDoneRef.current(), FADE_MS * 2 + HOLD_MS);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f6f5f4',
      opacity: visible ? 1 : 0,
      transition: `opacity ${FADE_MS}ms ease`,
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px',
        transform: visible ? 'scale(1)' : 'scale(0.96)',
        transition: `transform ${FADE_MS}ms ease`,
      }}>
        <div style={{
          width: '84px', height: '84px', borderRadius: '20px', background: '#0075de',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: 'rgba(0,117,222,0.25) 0px 16px 36px',
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <rect x="7" y="8" width="10" height="1.5" rx="0.75" fill="white" />
            <rect x="7" y="11" width="7" height="1.5" rx="0.75" fill="white" />
            <rect x="7" y="14" width="8" height="1.5" rx="0.75" fill="white" />
          </svg>
        </div>

        <img src="/wordmark.png" alt="まなびログ" style={{ height: '34px', width: 'auto', display: 'block' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '16px', height: '1px', background: 'rgba(0,0,0,0.15)' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em' }}>
            <span style={{ color: '#0075de' }}>See.</span>{' '}
            <span style={{ color: '#F2994A' }}>Earn.</span>{' '}
            <span style={{ color: '#0E9F6E' }}>Grow.</span>
          </span>
          <span style={{ width: '16px', height: '1px', background: 'rgba(0,0,0,0.15)' }} />
        </div>
      </div>
    </div>
  );
}
