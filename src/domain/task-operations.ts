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
