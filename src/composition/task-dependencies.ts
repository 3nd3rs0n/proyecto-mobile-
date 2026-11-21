import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import type { TaskIdFactory } from '../domain/task-operations';
import { createLegacyTaskMigration, createUserTaskRepository } from '../repositories/user-task-repository';
import { authService } from '../hooks/use-auth';

export const taskRepositoryFor = (userId: string) => {
  const sessionUser = authService.getUser();
  return createUserTaskRepository(AsyncStorage, userId,
    () => sessionUser?.id === userId && authService.getUser() === sessionUser);
};
export const legacyTaskMigration = createLegacyTaskMigration(AsyncStorage);

export const createTaskId: TaskIdFactory = Crypto.randomUUID;
