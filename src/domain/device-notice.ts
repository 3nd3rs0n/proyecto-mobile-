import type { DeviceResult } from '../types/device';

export type DeviceFeature = 'camera' | 'gallery' | 'location';

export type DeviceNotice = { message: string; canOpenSettings: boolean };

const FEATURE_NAMES: Record<DeviceFeature, string> = {
  camera: 'la cámara',
  gallery: 'la galería',
  location: 'tu ubicación',
};

/** Mensaje para el usuario según el resultado de un periférico; null si no hay nada que avisar. */
export function describeDeviceProblem(
  result: DeviceResult<unknown>,
  feature: DeviceFeature,
): DeviceNotice | null {
  const name = FEATURE_NAMES[feature];
  switch (result.status) {
    case 'ok':
    case 'cancelled':
      return null;
    case 'permission-denied':
      return result.permission === 'blocked'
        ? { message: `No tenemos permiso para usar ${name}. Puedes activarlo en Ajustes.`, canOpenSettings: true }
        : { message: `Sin permiso para usar ${name}. Vuelve a tocar el botón si cambias de opinión.`, canOpenSettings: false };
    case 'unavailable':
      return { message: result.reason, canOpenSettings: false };
    case 'error':
      return { message: `No se pudo usar ${name}. Intenta de nuevo.`, canOpenSettings: false };
  }
}
