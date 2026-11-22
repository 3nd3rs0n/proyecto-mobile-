import { useRef, useState } from 'react';

import type { TaskAttachments } from '../composition/task-dependencies';
import { describeDeviceProblem, type DeviceNotice } from '../domain/device-notice';
import type { TaskInput } from '../types/task';

type Attachments = Pick<TaskInput, 'imageUri' | 'location'>;

export type TaskAttachmentsState = ReturnType<typeof useTaskAttachments>;

/**
 * Foto y ubicación del formulario, y el aviso cuando un periférico no se pudo usar.
 * La foto se copia a la carpeta permanente apenas se elige; las fotos que no se guardan se borran.
 */
export function useTaskAttachments({
  camera,
  location: locator,
  permissions,
  photoStorage,
  createFileId,
}: TaskAttachments) {
  const [imageUri, setImageUri] = useState<string>();
  const [location, setLocation] = useState<Attachments['location']>();
  const [original, setOriginal] = useState<Attachments>({});
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<DeviceNotice | null>(null);
  // Cada búsqueda tiene un número; si el formulario se reinicia, la respuesta atrasada se ignora.
  const locationRequest = useRef(0);

  /** Borra la foto actual si se adjuntó en este formulario (no la de la tarea guardada). */
  const discardNewPhoto = async (uri = imageUri) => {
    if (uri && uri !== original.imageUri) await photoStorage.remove(uri);
  };

  const choosePhoto = async (source: 'camera' | 'gallery') => {
    setNotice(null);
    const result = source === 'camera' ? await camera.takePhoto() : await camera.pickFromLibrary();
    setNotice(describeDeviceProblem(result, source));
    if (result.status !== 'ok') return;

    setSavingPhoto(true);
    try {
      const saved = await photoStorage.persist(result.value.uri, createFileId());
      await discardNewPhoto();
      setImageUri(saved);
    } catch {
      setNotice({ message: 'No se pudo guardar la foto en el teléfono.', canOpenSettings: false });
    } finally {
      setSavingPhoto(false);
    }
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

  // Una tarea guardada no puede quedar sin foto o sin ubicación: "Quitar" vuelve a la original.
  const removePhoto = async () => {
    await discardNewPhoto();
    setImageUri(original.imageUri);
  };

  const removeLocation = () => {
    locationRequest.current += 1;
    setLocating(false);
    setLocation(original.location);
  };

  const reset = (initial: Attachments = {}) => {
    locationRequest.current += 1;
    setOriginal(initial);
    setImageUri(initial.imageUri);
    setLocation(initial.location);
    setLocating(false);
    setNotice(null);
  };

  /** Después de guardar la tarea: la foto reemplazada ya no se usa. */
  const commit = async () => {
    if (original.imageUri && original.imageUri !== imageUri) await photoStorage.remove(original.imageUri);
  };

  /** Al cancelar: la foto nueva no se usó. */
  const discard = () => discardNewPhoto();

  const openSettings = () => {
    permissions.openSettings().catch(() => {
      setNotice({ message: 'No se pudieron abrir los Ajustes.', canOpenSettings: false });
    });
  };

  return {
    imageUri,
    location,
    savingPhoto,
    locating,
    notice,
    canRemovePhoto: imageUri !== undefined && imageUri !== original.imageUri,
    canRemoveLocation: location !== undefined && location !== original.location,
    takePhoto: () => choosePhoto('camera'),
    pickPhoto: () => choosePhoto('gallery'),
    removePhoto,
    addLocation,
    removeLocation,
    openSettings,
    dismissNotice: () => setNotice(null),
    reset,
    commit,
    discard,
  };
}
