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

export function createCameraService({ camera, permissions }: CameraServiceDeps): CameraService {
  const pick = async (launch: () => Promise<PickerResult>): Promise<DeviceResult<Photo>> => {
    try {
      const result = await launch();
      return result.canceled ? { status: 'cancelled' } : { status: 'ok', value: result.photo };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'No se pudo obtener la foto',
      };
    }
  };

  return {
    async takePhoto() {
      const permission = await permissions.ensure('camera');
      if (permission !== 'granted') return { status: 'permission-denied', permission };
      return pick(() => camera.launchCamera());
    },
    // La galería del sistema solo entrega la foto elegida, así que no necesita permiso.
    pickFromLibrary() {
      return pick(() => camera.launchLibrary());
    },
  };
}
