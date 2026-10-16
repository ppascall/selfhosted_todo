import { useEffect, useRef, useState } from 'react';
import { formatDay, formatTime, today } from '../dates';
import type { Task } from '../api';
import { CheckIcon, CloseIcon } from '../icons';

type Props = {
  task: Task;
  showDate?: boolean;
  onToggle: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onSchedule: () => void;
};

export function TaskRow({ task, showDate = true, onToggle, onRename, onDelete, onSchedule }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(task.title);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  const commit = () => {
    const t = text.trim();
    setEditing(false);
    if (t && t !== task.title) onRename(t);
    else setText(task.title);
  };

  const overdue = !task.done && task.date !== null && task.date < today();
  const label = task.date
    ? [showDate ? formatDay(task.date) : null, task.time ? formatTime(task.time) : null].filter(Boolean).join(' · ')
    : '';

  return (
    <li className={`task${task.done ? ' done' : ''}`}>
      <button
        type="button"
        className="check"
        onClick={onToggle}
        aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
        aria-pressed={task.done}
      >
        {task.done && <CheckIcon />}
      </button>

      {editing ? (
        <input
          ref={input}
          className="field edit grow"
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setText(task.title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="title grow"
          onClick={() => {
            setText(task.title);
            setEditing(true);
          }}
        >
          {task.title}
        </button>
      )}

      {label && (
        <button type="button" className={`meta-btn${overdue ? ' overdue' : ''}`} onClick={onSchedule}>
          {label}
        </button>
      )}
      {!task.date && !task.done && (
        <button type="button" className="meta-btn faint" onClick={onSchedule}>
          + date
        </button>
      )}

      <button type="button" className="icon-btn" onClick={onDelete} aria-label="Delete task">
        <CloseIcon />
      </button>
    </li>
  );
}
