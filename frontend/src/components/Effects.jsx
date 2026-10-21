import { useEffect } from 'react';

export default function Effects() {
  useEffect(() => {
    let last = null;

    const reset = (card) => {
      if (!card) return;
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    };

    const onMove = (e) => {
      const root = document.documentElement;
      root.style.setProperty('--mx', `${e.clientX}px`);
      root.style.setProperty('--my', `${e.clientY}px`);

      const card = e.target.closest ? e.target.closest('.card') : null;
      if (card !== last) {
        reset(last);
        last = card;
      }
      // skip cards that contain forms or tables, so typing stays easy
      if (!card || card.querySelector('form, table, textarea, input')) return;

      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', `${x * 10}deg`);
      card.style.setProperty('--rx', `${-y * 10}deg`);
    };

    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div className="fx-layer">
      <div className="orb o1" />
      <div className="orb o2" />
      <div className="orb o3" />
      <div className="orb o4" />
      <div className="spotlight" />
    </div>
  );
}