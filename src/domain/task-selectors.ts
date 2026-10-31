import type { Task, TaskFilter } from '../types/task';

const taskFilters: Record<TaskFilter, (task: Task) => boolean> = {
  all: () => true,
  active: (task) => !task.completed,
  completed: (task) => task.completed,
};

export function selectTasks(tasks: readonly Task[], filter: TaskFilter): Task[] {
  return tasks.filter(taskFilters[filter]);
}

export function summarizeTasks(tasks: readonly Task[]) {
  const completedCount = tasks.filter((task) => task.completed).length;

  return {
    completedCount,
    pendingCount: tasks.length - completedCount,
    completionPercent:
      tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100),
  };
}
