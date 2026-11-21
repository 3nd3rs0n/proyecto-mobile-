export type TaskLocation = {
  latitude: number;
  longitude: number;
  /** Metros; null si el GPS no la informa. */
  accuracy: number | null;
  address: string | null;
  /** Milisegundos desde 1970, igual que Date.now(). */
  capturedAt: number;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  photoUri?: string;
  location?: TaskLocation;
  createdAt?: number;
};

/** photoUri puede ser temporal (recién sacada de la cámara); useTasks la guarda. */
export type TaskInput = Pick<Task, 'title' | 'description' | 'photoUri' | 'location'>;

export type TaskFilter = 'all' | 'active' | 'completed';
