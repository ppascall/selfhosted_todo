import { useEffect, useState } from 'react';
import { formatMonth, monthGrid, parse, today } from '../dates';
import { NextIcon, PrevIcon } from '../icons';

type Props = {
  date: string | null;
  time: string | null;
  onSave: (date: string | null, time: string | null) => void;
  onClose: () => void;
};

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function DatePicker({ date, time, onSave, onClose }: Props) {
  const [d, setD] = useState(date);
  const [t, setT] = useState(time);
  const base = parse(d ?? today());
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const shift = (n: number) => {
    const next = new Date(view.y, view.m + n, 1);
    setView({ y: next.getFullYear(), m: next.getMonth() });
  };

  const now = today();

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="sheet" role="dialog" aria-label="Pick date" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
            <PrevIcon />
          </button>
          <span className="sheet-title">{formatMonth(view.y, view.m)}</span>
          <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next month">
            <NextIcon />
          </button>
        </div>

        <div className="grid weekdays">
          {WEEKDAYS.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
        <div className="grid">
          {monthGrid(view.y, view.m).map((s) => {
            const other = parse(s).getMonth() !== view.m;
            return (
              <button
                type="button"
                key={s}
                className={`day${other ? ' other' : ''}${s === now ? ' today' : ''}${s === d ? ' selected' : ''}`}
                onClick={() => setD(s)}
              >
                {parse(s).getDate()}
              </button>
            );
          })}
        </div>

        <div className="time-row">
          <label htmlFor="time-input">Time</label>
          <input
            id="time-input"
            type="time"
            className="field"
            value={t ?? ''}
            disabled={!d}
            onChange={(e) => setT(e.target.value || null)}
          />
          {t && (
            <button type="button" className="chip" onClick={() => setT(null)}>
              No time
            </button>
          )}
        </div>

        <div className="sheet-actions">
          <button type="button" className="chip" onClick={() => onSave(null, null)}>
            Clear date
          </button>
          <button type="button" className="solid" onClick={() => onSave(d, d ? t : null)}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
