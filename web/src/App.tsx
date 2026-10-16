import { useCallback, useEffect, useRef, useState } from 'react';
import { api, newId, type Task, type TaskPatch } from './api';
import { today } from './dates';
import { AddBar, type Draft } from './components/AddBar';
import { CalendarView } from './components/CalendarView';
import { DatePicker } from './components/DatePicker';
import { ListView, type RowActions } from './components/ListView';

type View = 'list' | 'calendar';
type Scheduling = { kind: 'draft' } | { kind: 'task'; id: string } | null;

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<View>(() => (localStorage.getItem('view') === 'calendar' ? 'calendar' : 'list'));
  const [selected, setSelected] = useState(today());
  const [draft, setDraft] = useState<Draft>({ date: null, time: null });
  const [scheduling, setScheduling] = useState<Scheduling>(null);

  // Guards against a stale poll overwriting optimistic state.
  const version = useRef(0);
  const inflight = useRef(0);

  const refresh = useCallback(async () => {
    const v = version.current;
    try {
      const list = await api.list();
      setOnline(true);
      setLoaded(true);
      if (v === version.current && inflight.current === 0) setTasks(list);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  const run = useCallback(
    async (optimistic: (t: Task[]) => Task[], call: () => Promise<unknown>, failMsg: string) => {
      version.current++;
      inflight.current++;
      setTasks(optimistic);
      try {
        await call();
      } catch {
        setToast(failMsg);
        inflight.current--;
        version.current++;
        refresh();
        return;
      }
      inflight.current--;
      version.current++;
    },
    [refresh],
  );

  const add = (title: string) => {
    const task: Task = { id: newId(), title, done: false, date: draft.date, time: draft.time, createdAt: Date.now(), doneAt: null };
    run((t) => [...t, task], () => api.add(task), `Could not save "${title}"`);
    setDraft(view === 'calendar' ? { date: draft.date, time: null } : { date: null, time: null });
  };

  const patch = (task: Task, p: TaskPatch, failMsg = 'Could not save change') => {
    const doneAt = p.done === undefined ? task.doneAt : p.done ? Date.now() : null;
    run((t) => t.map((x) => (x.id === task.id ? { ...x, ...p, doneAt } : x)), () => api.update(task.id, p), failMsg);
  };

  const actions: RowActions = {
    onToggle: (t) => patch(t, { done: !t.done }),
    onRename: (t, title) => patch(t, { title }),
    onDelete: (t) => run((l) => l.filter((x) => x.id !== t.id), () => api.remove(t.id), 'Could not delete task'),
    onSchedule: (t) => setScheduling({ kind: 'task', id: t.id }),
  };

  const clearDone = () => run((l) => l.filter((x) => !x.done), () => api.clearDone(), 'Could not clear tasks');

  const changeView = (v: View) => {
    setView(v);
    localStorage.setItem('view', v);
    if (v === 'calendar') setDraft((d) => ({ ...d, date: selected }));
  };

  const selectDay = (day: string) => {
    setSelected(day);
    setDraft((d) => ({ ...d, date: day }));
  };

  const target = scheduling?.kind === 'task' ? tasks.find((t) => t.id === scheduling.id) : undefined;
  const pickerValue = scheduling?.kind === 'draft' ? draft : target ?? { date: null, time: null };

  const savePicker = (date: string | null, time: string | null) => {
    if (scheduling?.kind === 'draft') setDraft({ date, time });
    else if (target) patch(target, { date, time });
    setScheduling(null);
  };

  return (
    <div className="app">
      <header className="top">
        <h1>TODO</h1>
        <nav className="tabs" aria-label="View">
          <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => changeView('list')}>
            List
          </button>
          <button type="button" className={view === 'calendar' ? 'on' : ''} onClick={() => changeView('calendar')}>
            Calendar
          </button>
        </nav>
      </header>

      <AddBar draft={draft} onDraft={setDraft} onPick={() => setScheduling({ kind: 'draft' })} onAdd={add} />

      {!online && <div className="banner">Offline. Retrying…</div>}

      {!loaded ? (
        <p className="empty">Loading…</p>
      ) : view === 'list' ? (
        <ListView tasks={tasks} actions={actions} onClearDone={clearDone} />
      ) : (
        <CalendarView tasks={tasks} selected={selected} onSelect={selectDay} actions={actions} />
      )}

      {scheduling && (scheduling.kind === 'draft' || target) && (
        <DatePicker date={pickerValue.date} time={pickerValue.time} onSave={savePicker} onClose={() => setScheduling(null)} />
      )}

      {toast && (
        <div className="toast" role="alert">
          {toast}
        </div>
      )}
    </div>
  );
}
