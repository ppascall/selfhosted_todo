import { useEffect, useRef, useState } from 'react';
import { addDays, formatDay, formatTime, today } from '../dates';
import { CalendarIcon, CloseIcon, PlusIcon } from '../icons';

export type Draft = { date: string | null; time: string | null };

type Props = {
  draft: Draft;
  onDraft: (d: Draft) => void;
  onPick: () => void;
  onAdd: (title: string) => void;
};

export function AddBar({ draft, onDraft, onPick, onAdd }: Props) {
  const [title, setTitle] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) input.current?.focus();
  }, []);

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    onAdd(t);
    setTitle('');
    input.current?.focus();
  };

  const t0 = today();
  const t1 = addDays(t0, 1);
  const quick = (d: string) => onDraft({ date: draft.date === d ? null : d, time: draft.date === d ? null : draft.time });

  return (
    <div className="panel addbar">
      <div className="add-row">
        <input
          ref={input}
          className="field grow"
          placeholder="Add a task…"
          value={title}
          maxLength={500}
          enterKeyHint="done"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button type="button" className="solid square" onClick={submit} aria-label="Add task">
          <PlusIcon />
        </button>
      </div>
      <div className="chips">
        <button type="button" className={`chip${draft.date === t0 ? ' on' : ''}`} onClick={() => quick(t0)}>
          Today
        </button>
        <button type="button" className={`chip${draft.date === t1 ? ' on' : ''}`} onClick={() => quick(t1)}>
          Tomorrow
        </button>
        <button
          type="button"
          className={`chip${draft.date && draft.date !== t0 && draft.date !== t1 ? ' on' : ''}`}
          onClick={onPick}
        >
          <CalendarIcon />
          {draft.date && draft.date !== t0 && draft.date !== t1
            ? formatDay(draft.date)
            : 'Pick date'}
          {draft.time && ` · ${formatTime(draft.time)}`}
        </button>
        {draft.date && draft.time && (draft.date === t0 || draft.date === t1) && (
          <span className="meta">{formatTime(draft.time)}</span>
        )}
        {draft.date && (
          <button type="button" className="chip ghost" onClick={() => onDraft({ date: null, time: null })} aria-label="Clear date">
            <CloseIcon />
          </button>
        )}
      </div>
    </div>
  );
}
