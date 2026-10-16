import { useMemo, useState } from 'react';
import type { Task } from '../api';
import { today } from '../dates';
import { TaskRow } from './TaskRow';

export type RowActions = {
  onToggle: (t: Task) => void;
  onRename: (t: Task, title: string) => void;
  onDelete: (t: Task) => void;
  onSchedule: (t: Task) => void;
};

const sortKey = (t: Task) => `${t.date ?? '9999-99-99'} ${t.time ?? '99:99'} ${String(t.createdAt).padStart(15, '0')}`;
export const byWhen = (a: Task, b: Task) => (sortKey(a) < sortKey(b) ? -1 : 1);

function Section({ title, tasks, actions, showDate = true }: { title: string; tasks: Task[]; actions: RowActions; showDate?: boolean }) {
  if (!tasks.length) return null;
  return (
    <section className="panel">
      <h2>
        {title} <span className="count">{tasks.length}</span>
      </h2>
      <ul className="tasks">
        {tasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            showDate={showDate}
            onToggle={() => actions.onToggle(t)}
            onRename={(title) => actions.onRename(t, title)}
            onDelete={() => actions.onDelete(t)}
            onSchedule={() => actions.onSchedule(t)}
          />
        ))}
      </ul>
    </section>
  );
}

export function ListView({ tasks, actions, onClearDone }: { tasks: Task[]; actions: RowActions; onClearDone: () => void }) {
  const [showDone, setShowDone] = useState(false);
  const t0 = today();

  const groups = useMemo(() => {
    const open = tasks.filter((t) => !t.done).sort(byWhen);
    return {
      overdue: open.filter((t) => t.date && t.date < t0),
      today: open.filter((t) => t.date === t0),
      upcoming: open.filter((t) => t.date && t.date > t0),
      someday: open.filter((t) => !t.date),
      done: tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
    };
  }, [tasks, t0]);

  return (
    <>
      {!tasks.length && <p className="empty">Nothing to do. Type above and hit enter.</p>}
      <Section title="Overdue" tasks={groups.overdue} actions={actions} />
      <Section title="Today" tasks={groups.today} actions={actions} showDate={false} />
      <Section title="Upcoming" tasks={groups.upcoming} actions={actions} />
      <Section title="Someday" tasks={groups.someday} actions={actions} />
      {groups.done.length > 0 && (
        <section className="panel">
          <div className="done-head">
            <button type="button" className="h2-btn" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
              Done <span className="count">{groups.done.length}</span> <span className="caret">{showDone ? '–' : '+'}</span>
            </button>
            {showDone && (
              <button type="button" className="chip" onClick={onClearDone}>
                Clear all
              </button>
            )}
          </div>
          {showDone && (
            <ul className="tasks">
              {groups.done.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onToggle={() => actions.onToggle(t)}
                  onRename={(title) => actions.onRename(t, title)}
                  onDelete={() => actions.onDelete(t)}
                  onSchedule={() => actions.onSchedule(t)}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
