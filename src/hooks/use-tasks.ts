import { useEffect, useState } from 'react';

import { STARTER_TASKS } from '../constants/starter-tasks';
import * as taskOperations from '../domain/task-operations';
import type { TaskIdFactory } from '../domain/task-operations';
import { selectTasks, summarizeTasks } from '../domain/task-selectors';
import type { TaskRepository } from '../repositories/task-repository';
import type { Task, TaskFilter, TaskInput } from '../types/task';

/** Mantener repository y createId estables durante el montaje. */
export function useTasks(repository: TaskRepository, createId: TaskIdFactory) {
  const [tasks, setTasks] = useState<Task[]>(STARTER_TASKS);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadTasks = async () => {
      try {
        const savedTasks = await repository.load();
        if (mounted) setTasks(savedTasks ?? STARTER_TASKS);
      } catch {
        if (mounted) setTasks(STARTER_TASKS);
      } finally {
        if (mounted) setStorageReady(true);
      }
    };

    void loadTasks();
    return () => {
      mounted = false;
    };
  }, [repository]);

  useEffect(() => {
    if (!storageReady) return;

    repository.save(tasks).catch(() => {
      // La app sigue funcionando aunque el dispositivo no permita guardar datos.
    });
  }, [tasks, storageReady, repository]);

  const addTask = (input: TaskInput) => {
    const task = taskOperations.createTask(input, createId);
    if (task === null) return;

    setTasks((currentTasks) => [task, ...currentTasks]);
  };

  const toggleTask = (id: string) => {
    setTasks((currentTasks) => taskOperations.toggleTask(currentTasks, id));
  };

  const deleteTask = (id: string) => {
    setTasks((currentTasks) => taskOperations.deleteTask(currentTasks, id));
  };

  const clearCompleted = () => {
    setTasks(taskOperations.clearCompletedTasks);
  };

  return {
    tasks,
    visibleTasks: selectTasks(tasks, filter),
    filter,
    setFilter,
    ...summarizeTasks(tasks),
    addTask,
    toggleTask,
    deleteTask,
    clearCompleted,
  };
}
