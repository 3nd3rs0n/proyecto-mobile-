import type { DeviceResult } from '../types/device';
import type { PermissionService } from './permission-service';

export type Photo = { uri: string; width: number; height: number };

export type PickerResult = { canceled: true } | { canceled: false; photo: Photo };

export interface CameraGateway {
  launchCamera(): Promise<PickerResult>;
  launchLibrary(): Promise<PickerResult>;
}

export type CameraServiceDeps = {
  camera: CameraGateway;
  permissions: PermissionService;
};

/** La foto devuelta es temporal: hay que guardarla con PhotoStorage. */
export interface CameraService {
  takePhoto(): Promise<DeviceResult<Photo>>;
  pickFromLibrary(): Promise<DeviceResult<Photo>>;
}
