import React, { useEffect, useRef, useState } from 'react';

export default function Timer({ totalSeconds, startSeconds, onExpire, questionKey }) {
  const [left, setLeft] = useState(startSeconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    setLeft(startSeconds);
    expiredRef.current = false;
    const interval = setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpire();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionKey]);

  const pct = Math.max(0, Math.min(100, (left / totalSeconds) * 100));
  const urgent = left <= 5;

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-1">
        <span className="tag-eyebrow text-ink-400">Time left</span>
        <span className={`font-display text-2xl tabular-nums ${urgent ? 'text-coral' : 'text-ink'}`}>{left}s</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-ink-50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${urgent ? 'bg-coral' : 'bg-gold'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
