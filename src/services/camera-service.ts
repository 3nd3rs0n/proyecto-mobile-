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

const toResult = (result: PickerResult): DeviceResult<Photo> =>
  result.canceled ? { status: 'cancelled' } : { status: 'ok', value: result.photo };

const failure = (error: unknown): DeviceResult<Photo> => ({
  status: 'error',
  message: error instanceof Error ? error.message : 'No se pudo obtener la foto.',
});

export function createCameraService({ camera, permissions }: CameraServiceDeps): CameraService {
  return {
    async takePhoto() {
      try {
        const permission = await permissions.ensure('camera');
        if (permission !== 'granted') return { status: 'permission-denied', permission };
        return toResult(await camera.launchCamera());
      } catch (error) {
        return failure(error);
      }
    },
    async pickFromLibrary() {
      try {
        return toResult(await camera.launchLibrary());
      } catch (error) {
        return failure(error);
      }
    },
  };
}
