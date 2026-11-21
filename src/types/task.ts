export type TaskLocation = {
  latitude: number;
  longitude: number;

  /** Metros; null si el GPS no la informa. */
  accuracy?: number | null;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;

  address?: string | null;

  /** Milisegundos desde 1970, igual que Date.now(). */
  capturedAt?: number;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  completed: boolean;

  /** Ausente solamente en datos heredados de Unidad 1. */
  userId?: string;

  /** Propiedad única; photoUri antiguo se convierte al leer el almacenamiento. */
  imageUri?: string;

  location?: TaskLocation;

  /** ISO 8601 en UTC; ausente si la tarea heredada no tenía fecha. */
  createdAt?: string;
};

export type TaskInput = Pick<Task, 'title' | 'description'> &
  Partial<Pick<Task, 'imageUri' | 'location'>>;

export type TaskFilter = 'all' | 'active' | 'completed';
