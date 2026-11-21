import type { PermissionState } from '../types/device';

export type PermissionKind = 'camera' | 'mediaLibrary' | 'location';

/** Igual a lo que devuelven las librerías de Expo. */
export type PermissionResponse = { granted: boolean; canAskAgain: boolean };

export interface PermissionGateway {
  check(): Promise<PermissionResponse>;
  request(): Promise<PermissionResponse>;
}

export interface PermissionService {
  check(kind: PermissionKind): Promise<PermissionState>;
  /** Pregunta solo si no hay permiso y se puede preguntar. Si está bloqueado, no pregunta. */
  ensure(kind: PermissionKind): Promise<PermissionState>;
  openSettings(): Promise<void>;
}
