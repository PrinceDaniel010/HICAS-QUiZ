import { useEffect } from 'react';

// Deters casual copying of questions: disables text selection, right-click,
// common copy/print/devtools shortcuts, and blurs the tab when it loses focus.
// This is a deterrent, not a guarantee - the real protection is that the
// server only ever sends ONE question at a time and never sends answer keys.
export default function AntiCopyGuard({ onTabHidden }) {
  useEffect(() => {
    document.body.classList.add('quiz-lockdown');

    const blockContextMenu = (e) => e.preventDefault();
    const blockCopy = (e) => e.preventDefault();
    const blockKeys = (e) => {
      const key = e.key.toLowerCase();
      const blockedCombo =
        (e.ctrlKey || e.metaKey) && ['c', 'x', 'u', 'p', 's'].includes(key);
      const devTools = key === 'f12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key));
      if (blockedCombo || devTools) e.preventDefault();
    };
    const handleVisibility = () => {
      if (document.hidden && onTabHidden) onTabHidden();
    };

    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('copy', blockCopy);
    document.addEventListener('cut', blockCopy);
    document.addEventListener('keydown', blockKeys);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.body.classList.remove('quiz-lockdown');
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('copy', blockCopy);
      document.removeEventListener('cut', blockCopy);
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [onTabHidden]);

  return null;
}
