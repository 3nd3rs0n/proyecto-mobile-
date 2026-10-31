import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TaskIdFactory } from '../domain/task-operations';
import { createStorageTaskRepository } from '../repositories/storage-task-repository';

export const taskRepository = createStorageTaskRepository(AsyncStorage, 'paso-a-paso.tasks');

export const createTaskId: TaskIdFactory = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;
