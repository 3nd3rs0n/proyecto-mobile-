import type { Task, TaskInput } from '../types/task';

export type TaskIdFactory = () => string;

export function createTask(
  { title, description }: TaskInput,
  createId: TaskIdFactory,
): Task | null {
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;

  return {
    id: createId(),
    title: cleanTitle,
    description: description.trim(),
    completed: false,
  };
}

/**
 * Cambia el título y la descripción de una tarea; conserva su id, su estado y su posición.
 * Con un título vacío no cambia nada.
 */
export function updateTask(
  tasks: readonly Task[],
  id: string,
  { title, description }: TaskInput,
): Task[] {
  const cleanTitle = title.trim();
  if (!cleanTitle) return [...tasks];

  return tasks.map((task) =>
    task.id === id ? { ...task, title: cleanTitle, description: description.trim() } : task,
  );
}

export function toggleTask(tasks: readonly Task[], id: string): Task[] {
  return tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task,
  );
}

export function deleteTask(tasks: readonly Task[], id: string): Task[] {
  return tasks.filter((task) => task.id !== id);
}

export function clearCompletedTasks(tasks: readonly Task[]): Task[] {
  return tasks.filter((task) => !task.completed);
}
