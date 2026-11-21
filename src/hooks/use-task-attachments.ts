import { useRef, useState } from 'react';

import { describeDeviceProblem, type DeviceNotice } from '../domain/device-notice';
import type { CameraService } from '../services/camera-service';
import type { LocationService } from '../services/location-service';
import type { PermissionService } from '../services/permission-service';
import type { TaskInput } from '../types/task';

export type DeviceServices = {
  camera: CameraService;
  location: LocationService;
  permissions: PermissionService;
};

type Attachments = Pick<TaskInput, 'photoUri' | 'location'>;

export type TaskAttachmentsState = ReturnType<typeof useTaskAttachments>;

/** Foto y ubicación del formulario, y el aviso cuando un periférico no se pudo usar. */
export function useTaskAttachments({ camera, location: locator, permissions }: DeviceServices) {
  const [photoUri, setPhotoUri] = useState<string>();
  const [location, setLocation] = useState<Attachments['location']>();
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<DeviceNotice | null>(null);
  // Cada búsqueda tiene un número; si el formulario se reinicia, la respuesta atrasada se ignora.
  const locationRequest = useRef(0);

  const choosePhoto = async (source: 'camera' | 'gallery') => {
    setNotice(null);
    const result = source === 'camera' ? await camera.takePhoto() : await camera.pickFromLibrary();
    if (result.status === 'ok') setPhotoUri(result.value.uri);
    setNotice(describeDeviceProblem(result, source));
  };

  const addLocation = async () => {
    const request = ++locationRequest.current;
    setNotice(null);
    setLocating(true);
    const result = await locator.getTaskLocation();
    if (request !== locationRequest.current) return;

    setLocating(false);
    if (result.status === 'ok') setLocation(result.value);
    setNotice(describeDeviceProblem(result, 'location'));
  };

  const removeLocation = () => {
    locationRequest.current += 1;
    setLocating(false);
    setLocation(undefined);
  };

  const reset = (initial: Attachments = {}) => {
    locationRequest.current += 1;
    setPhotoUri(initial.photoUri);
    setLocation(initial.location);
    setLocating(false);
    setNotice(null);
  };

  const openSettings = () => {
    permissions.openSettings().catch(() => {
      setNotice({ message: 'No se pudieron abrir los Ajustes.', canOpenSettings: false });
    });
  };

  return {
    photoUri,
    location,
    locating,
    notice,
    takePhoto: () => choosePhoto('camera'),
    pickPhoto: () => choosePhoto('gallery'),
    removePhoto: () => setPhotoUri(undefined),
    addLocation,
    removeLocation,
    openSettings,
    dismissNotice: () => setNotice(null),
    reset,
  };
}
