import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Linking } from 'react-native';

import type { TaskIdFactory } from '../domain/task-operations';
import { authService } from '../hooks/use-auth';
import { createLegacyTaskMigration, createUserTaskRepository } from '../repositories/user-task-repository';
import { createCameraService, type CameraGateway, type PickerResult } from '../services/camera-service';
import { createLocationService, type Coordinates, type LocationGateway } from '../services/location-service';
import {
  createPermissionService,
  type PermissionGatewayMap,
  type PermissionResponse,
} from '../services/permission-service';
import { createPhotoStorage, type FileGateway } from '../services/photo-storage';

export const taskRepositoryFor = (userId: string) => {
  const sessionUser = authService.getUser();
  return createUserTaskRepository(AsyncStorage, userId,
    () => sessionUser?.id === userId && authService.getUser() === sessionUser);
};
export const legacyTaskMigration = createLegacyTaskMigration(AsyncStorage);

export const createTaskId: TaskIdFactory = Crypto.randomUUID;

const permissionGateways: PermissionGatewayMap = {
  camera: {
    check: (): Promise<PermissionResponse> => ImagePicker.getCameraPermissionsAsync(),
    request: (): Promise<PermissionResponse> => ImagePicker.requestCameraPermissionsAsync(),
  },
  mediaLibrary: {
    check: (): Promise<PermissionResponse> => ImagePicker.getMediaLibraryPermissionsAsync(),
    request: (): Promise<PermissionResponse> => ImagePicker.requestMediaLibraryPermissionsAsync(),
  },
  location: {
    check: (): Promise<PermissionResponse> => Location.getForegroundPermissionsAsync(),
    request: (): Promise<PermissionResponse> => Location.requestForegroundPermissionsAsync(),
  },
};

const permissions = createPermissionService(permissionGateways, () => Linking.openSettings());

const toPickerResult = (result: ImagePicker.ImagePickerResult): PickerResult => {
  const asset = result.canceled ? null : result.assets[0];
  return asset
    ? { canceled: false, photo: { uri: asset.uri, width: asset.width, height: asset.height } }
    : { canceled: true };
};

const cameraGateway: CameraGateway = {
  async launchCamera() {
    return toPickerResult(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 }));
  },
  async launchLibrary() {
    return toPickerResult(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 }));
  },
};

const toCoordinates = (position: Location.LocationObject): Coordinates => {
  const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords;
  return { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed, capturedAt: position.timestamp };
};

const locationGateway: LocationGateway = {
  servicesEnabled: () => Location.hasServicesEnabledAsync(),
  async getCurrent() {
    return toCoordinates(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  },
  async getLastKnown() {
    const position = await Location.getLastKnownPositionAsync();
    return position ? toCoordinates(position) : null;
  },
  async reverseGeocode(coordinates) {
    const [place] = await Location.reverseGeocodeAsync({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });
    if (!place) return null;
    const parts = [place.name, place.street, place.city, place.region, place.country]
      .filter((part): part is string => Boolean(part));
    return parts.length ? parts.join(', ') : place.formattedAddress ?? null;
  },
};

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
  camera: createCameraService({ camera: cameraGateway, permissions }),
  location: createLocationService({ location: locationGateway, permissions, timeoutMs: 8000, now: Date.now }),
  photoStorage: createPhotoStorage(fileGateway),
  createFileId: createTaskId,
};

export type TaskAttachments = typeof taskAttachments;
