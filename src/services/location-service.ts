import type { DeviceResult } from '../types/device';
import type { TaskLocation } from '../types/task';
import type { PermissionService } from './permission-service';

export type Coordinates = Omit<TaskLocation, 'address'> & { accuracy: number | null };

export interface LocationGateway {
  /** false si el GPS está apagado. */
  servicesEnabled(): Promise<boolean>;
  getCurrent(): Promise<Coordinates>;
  getLastKnown(): Promise<Coordinates | null>;
  reverseGeocode(coordinates: Coordinates): Promise<string | null>;
}

export type LocationServiceDeps = {
  location: LocationGateway;
  permissions: PermissionService;
  timeoutMs: number;
  now: () => number;
};

/**
 * Si el GPS tarda más de timeoutMs, usa la última ubicación conocida.
 * Si falla la dirección, la ubicación se guarda igual con address: null.
 */
export interface LocationService {
  getTaskLocation(): Promise<DeviceResult<TaskLocation>>;
}
