import { useMemo, useState } from 'react';
import type { Task } from '../api';
import { formatDay, formatMonth, monthGrid, parse, today } from '../dates';
import { NextIcon, PrevIcon } from '../icons';
import { byWhen, type RowActions } from './ListView';
import { TaskRow } from './TaskRow';

type Props = {
  tasks: Task[];
  selected: string;
  onSelect: (day: string) => void;
  actions: RowActions;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarView({ tasks, selected, onSelect, actions }: Props) {
  const sel = parse(selected);
  const [view, setView] = useState({ y: sel.getFullYear(), m: sel.getMonth() });
  const now = today();

  const byDay = useMemo(() => {
    const map = new Map<string, { open: number; all: Task[] }>();
    for (const t of tasks) {
      if (!t.date) continue;
      const e = map.get(t.date) ?? { open: 0, all: [] };
      e.all.push(t);
      if (!t.done) e.open++;
      map.set(t.date, e);
    }
    return map;
  }, [tasks]);

  const shift = (n: number) => {
    const next = new Date(view.y, view.m + n, 1);
    setView({ y: next.getFullYear(), m: next.getMonth() });
  };

  const dayTasks = [...(byDay.get(selected)?.all ?? [])].sort(byWhen).sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <div className="cal-layout">
      <section className="panel">
        <div className="sheet-head">
          <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
            <PrevIcon />
          </button>
          <button
            type="button"
            className="sheet-title title-btn"
            onClick={() => {
              const d = parse(now);
              setView({ y: d.getFullYear(), m: d.getMonth() });
              onSelect(now);
            }}
          >
            {formatMonth(view.y, view.m)}
          </button>
          <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next month">
            <NextIcon />
          </button>
        </div>
        <div className="grid weekdays">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid big">
          {monthGrid(view.y, view.m).map((s) => {
            const e = byDay.get(s);
            const other = parse(s).getMonth() !== view.m;
            return (
              <button
                type="button"
                key={s}
                className={`day${other ? ' other' : ''}${s === now ? ' today' : ''}${s === selected ? ' selected' : ''}`}
                onClick={() => onSelect(s)}
              >
                <span>{parse(s).getDate()}</span>
                {e && e.open > 0 && <span className="badge">{e.open}</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2>{formatDay(selected)}</h2>
        {dayTasks.length === 0 ? (
          <p className="empty small">Nothing planned. Add a task above to put it on this day.</p>
        ) : (
          <ul className="tasks">
            {dayTasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                showDate={false}
                onToggle={() => actions.onToggle(t)}
                onRename={(title) => actions.onRename(t, title)}
                onDelete={() => actions.onDelete(t)}
                onSchedule={() => actions.onSchedule(t)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
