'use client';

import { useEffect, useRef, useState } from 'react';

const FADE_IN_MS = 1000;
const HOLD_MS = 1000;
const FADE_OUT_MS = 550;

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'shown' | 'exit'>('enter');
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const showTimer = setTimeout(() => setPhase('shown'), 20);
    const hideTimer = setTimeout(() => setPhase('exit'), FADE_IN_MS + HOLD_MS);
    const doneTimer = setTimeout(() => onDoneRef.current(), FADE_IN_MS + HOLD_MS + FADE_OUT_MS);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  const visible = phase === 'shown';
  const duration = phase === 'exit' ? FADE_OUT_MS : FADE_IN_MS;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f6f5f4',
      opacity: visible ? 1 : 0,
      transition: `opacity ${duration}ms ease`,
    }}>
      <div style={{
        transform: visible ? 'scale(1)' : 'scale(0.96)',
        transition: `transform ${duration}ms ease`,
      }}>
        <img src="/logo-lockup.png" alt="まなびログ — See. Earn. Grow." style={{ height: '190px', width: 'auto', display: 'block' }} />
      </div>
    </div>
  );
}
