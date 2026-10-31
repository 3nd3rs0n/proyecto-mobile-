export type Task = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
};

export type TaskInput = Pick<Task, 'title' | 'description'>;

export type TaskFilter = 'all' | 'active' | 'completed';
