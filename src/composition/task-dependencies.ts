import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

import type { TaskIdFactory } from '../domain/task-operations';
import { authService } from '../hooks/use-auth';
import { createLegacyTaskMigration, createUserTaskRepository } from '../repositories/user-task-repository';
import { createPhotoStorage, type FileGateway } from '../services/photo-storage';
import { deviceServices } from './device-dependencies';

export const taskRepositoryFor = (userId: string) => {
  const sessionUser = authService.getUser();
  return createUserTaskRepository(AsyncStorage, userId,
    () => sessionUser?.id === userId && authService.getUser() === sessionUser);
};
export const legacyTaskMigration = createLegacyTaskMigration(AsyncStorage);

export const createTaskId: TaskIdFactory = Crypto.randomUUID;

const fileGateway: FileGateway = {
  get documentDirectory() {
    return FileSystem.documentDirectory;
  },
  copy: (from, to) => FileSystem.copyAsync({ from, to }),
  delete: (uri) => FileSystem.deleteAsync(uri, { idempotent: true }),
  async exists(uri) {
    return (await FileSystem.getInfoAsync(uri)).exists;
  },
  async makeDirectory(uri) {
    if (!(await FileSystem.getInfoAsync(uri)).exists)
      await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
  },
};

export const taskAttachments = {
  ...deviceServices,
  photoStorage: createPhotoStorage(fileGateway),
  createFileId: createTaskId,
};

export type TaskAttachments = typeof taskAttachments;
