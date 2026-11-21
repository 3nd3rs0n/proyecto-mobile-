/**
 * - granted: hay permiso.
 * - denied: no hay permiso, pero se puede volver a preguntar.
 * - blocked: lo rechazó para siempre; solo se activa desde Ajustes.
 */
export type PermissionState = 'granted' | 'denied' | 'blocked';

export type DeviceResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'cancelled' }
  | { status: 'permission-denied'; permission: Exclude<PermissionState, 'granted'> }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; message: string };
