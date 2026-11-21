import { useEffect, useRef, useState } from 'react';

import { createTaskSession } from '../repositories/user-task-repository';
import { authTiming } from '../domain/auth-service';
import type { TaskIdFactory } from '../domain/task-operations';
import { selectTasks, summarizeTasks } from '../domain/task-selectors';
import type { TaskRepository } from '../repositories/task-repository';
import type { Task, TaskFilter, TaskInput } from '../types/task';

/** El contenedor usa key=user.id: cada montaje tiene su propia sesión. */
export function useTasks(repository: TaskRepository, createId: TaskIdFactory, userId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sessionRef = useRef<ReturnType<typeof createTaskSession> | null>(null);
  const pending = useRef(false);

  useEffect(() => {
    const session = createTaskSession(repository, userId, createId);
    sessionRef.current = session;
    let mounted = true;
    setTasks([]);
    setReady(false);
    void authTiming.measure('tareas_carga_inicial', () => session.load()).then((loaded) => {
      if (mounted) { setTasks(loaded); setReady(true); }
    }).catch(() => {
      if (mounted) setError('No se pudieron cargar tus tareas. Reintenta para proteger los datos guardados.');
    });
    return () => {
      mounted = false;
      sessionRef.current = null;
      void session.close();
    };
  }, [repository, createId, userId]);

  useEffect(() => {
    if (ready) authTiming.mark('tareas_mostradas');
  }, [ready]);

  const perform = async (operation: (session: ReturnType<typeof createTaskSession>) => Promise<Task[]>) => {
    const session = sessionRef.current;
    if (!session || pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await operation(session);
      if (sessionRef.current !== session) return false;
      setTasks(result);
      setReady(true);
      return true;
    } catch {
      if (sessionRef.current === session) setError('No se pudo completar la operación. Tus cambios no se confirmaron; vuelve a intentarlo.');
      return false;
    } finally {
      pending.current = false;
      if (sessionRef.current === session) setBusy(false);
    }
  };

  return {
    tasks, ready, busy, error,
    visibleTasks: selectTasks(tasks, filter),
    filter,
    setFilter,
    ...summarizeTasks(tasks),
    retry: () => perform((session) => session.load()),
    addTask: (input: TaskInput) => perform((session) => session.add(input)),
    updateTask: (id: string, input: TaskInput) => perform((session) => session.update(id, input)),
    toggleTask: (id: string) => perform((session) => session.toggle(id)),
    deleteTask: (id: string) => perform((session) => session.delete(id)),
    clearCompleted: () => perform((session) => session.clearCompleted()),
    importLegacy: (importer: () => Promise<Task[]>) => perform((session) => session.importLegacy(importer)),
    flush: async () => { await sessionRef.current?.flush(); },
  };
}
