export type Task = {
  id: string;
  title: string;
  done: boolean;
  date: string | null;
  time: string | null;
  createdAt: number;
  doneAt: number | null;
};

export type NewTask = Pick<Task, 'id' | 'title' | 'date' | 'time'>;
export type TaskPatch = Partial<Pick<Task, 'title' | 'done' | 'date' | 'time'>>;

class ApiError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// getRandomValues works on plain-http LAN origins, randomUUID does not.
export function newId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Mutations are idempotent server-side, so retrying network/5xx failures is safe.
async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;
      last = new ApiError(res.status);
      if (res.status < 500) throw last;
    } catch (e) {
      if (e instanceof ApiError && e.status < 500) throw e;
      last = e;
    }
    await sleep(400 * 2 ** attempt);
  }
  throw last;
}

export const api = {
  list: () => req<Task[]>('GET', '/api/tasks'),
  add: (t: NewTask) => req<Task>('POST', '/api/tasks', t),
  update: (id: string, p: TaskPatch) => req<Task>('PATCH', `/api/tasks/${id}`, p),
  remove: (id: string) => req<void>('DELETE', `/api/tasks/${id}`),
  clearDone: () => req<void>('DELETE', '/api/tasks/done'),
};
