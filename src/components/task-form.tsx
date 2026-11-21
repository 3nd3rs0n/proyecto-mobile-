import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { TaskAttachments } from '../composition/task-dependencies';
import { cardShadow, colors, fontSize, radius } from '../constants/theme';
import type { DeviceResult } from '../types/device';
import type { Task, TaskInput, TaskLocation } from '../types/task';

type TaskFormProps = {
  onSubmit: (task: TaskInput) => Promise<boolean>;
  disabled?: boolean;
  /** Con una tarea, el formulario pasa a modo edición y se llena con sus datos. */
  editingTask?: Task | null;
  onCancelEdit?: () => void;
  attachments: TaskAttachments;
};

const describeDeviceError = (result: DeviceResult<unknown>): string => {
  switch (result.status) {
    case 'permission-denied':
      return result.permission === 'blocked'
        ? 'El permiso está bloqueado. Actívalo en los ajustes del teléfono.'
        : 'No se concedió el permiso.';
    case 'unavailable':
      return result.reason;
    case 'error':
      return result.message;
    default:
      return '';
  }
};

const locationLabel = (location: TaskLocation) =>
  location.address ?? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;

export function TaskForm({ onSubmit, editingTask = null, onCancelEdit, attachments, disabled = false }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [location, setLocation] = useState<TaskLocation | null>(null);
  const [originalImageUri, setOriginalImageUri] = useState<string | null>(null);
  const [originalLocation, setOriginalLocation] = useState<TaskLocation | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const [focused, setFocused] = useState(false);
  const titleRef = useRef<ComponentRef<typeof TextInput>>(null);
  const descriptionRef = useRef<ComponentRef<typeof TextInput>>(null);

  const isEditing = editingTask !== null;
  const canSubmit = !disabled && !attaching && title.trim().length > 0;
  const editingId = editingTask?.id;

  // Al elegir otra tarea para editar (o al salir de la edición) se cargan sus datos.
  useEffect(() => {
    const image = editingTask?.imageUri ?? null;
    const place = editingTask?.location ?? null;
    setTitle(editingTask?.title ?? '');
    setDescription(editingTask?.description ?? '');
    setImageUri(image);
    setLocation(place);
    setOriginalImageUri(image);
    setOriginalLocation(place);
    setAttachmentError('');
    if (editingTask) titleRef.current?.focus();
  }, [editingId]);

  const attachPhoto = async (source: 'camera' | 'library') => {
    if (disabled || attaching) return;
    setAttachmentError('');
    const result = source === 'camera'
      ? await attachments.camera.takePhoto()
      : await attachments.camera.pickFromLibrary();
    if (result.status === 'cancelled') return;
    if (result.status !== 'ok') {
      setAttachmentError(describeDeviceError(result));
      return;
    }
    setAttaching(true);
    try {
      const persisted = await attachments.photoStorage.persist(result.value.uri, attachments.createFileId());
      if (imageUri && imageUri !== originalImageUri) await attachments.photoStorage.remove(imageUri);
      setImageUri(persisted);
    } catch {
      setAttachmentError('No se pudo guardar la foto en el dispositivo.');
    } finally {
      setAttaching(false);
    }
  };

  const attachLocation = async () => {
    if (disabled || attaching) return;
    setAttachmentError('');
    setAttaching(true);
    try {
      const result = await attachments.location.getTaskLocation();
      if (result.status === 'cancelled') return;
      if (result.status !== 'ok') {
        setAttachmentError(describeDeviceError(result));
        return;
      }
      setLocation(result.value);
    } finally {
      setAttaching(false);
    }
  };

  const clearPhoto = async () => {
    if (!imageUri) return;
    const current = imageUri;
    setImageUri(originalImageUri);
    if (current !== originalImageUri) await attachments.photoStorage.remove(current);
  };

  const clearLocation = () => setLocation(originalLocation);

  const reset = () => {
    setTitle('');
    setDescription('');
    setImageUri(null);
    setLocation(null);
    setOriginalImageUri(null);
    setOriginalLocation(null);
    setAttachmentError('');
  };

  const submit = async () => {
    if (!canSubmit) return;
    const input: TaskInput = {
      title,
      description,
      ...(imageUri ? { imageUri } : {}),
      ...(location ? { location } : {}),
    };
    if (!await onSubmit(input)) return;
    if (isEditing && originalImageUri && originalImageUri !== imageUri)
      await attachments.photoStorage.remove(originalImageUri);
    reset();
  };

  const cancel = async () => {
    if (imageUri && imageUri !== originalImageUri) await attachments.photoStorage.remove(imageUri);
    reset();
    onCancelEdit?.();
  };

  const submitLabel = isEditing ? 'Guardar' : 'Añadir';
  let hint = canSubmit ? 'Listo para añadir' : 'Escribe un título para añadir';
  if (isEditing) hint = canSubmit ? 'Guarda o cancela los cambios' : 'El título no puede quedar vacío';

  return (
    <View style={[styles.card, (focused || isEditing) && styles.cardFocused]}>
      {isEditing && (
        <View style={styles.editingBanner}>
          <Text style={styles.editingLabel}>EDITANDO TAREA</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar edición"
            disabled={disabled}
            onPress={() => void cancel()}
            hitSlop={8}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      )}

      <TextInput
        ref={titleRef}
        editable={!disabled}
        accessibilityLabel="Título de la tarea"
        style={styles.titleInput}
        value={title}
        onChangeText={setTitle}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={() => descriptionRef.current?.focus()}
        submitBehavior="submit"
        placeholder="¿Qué necesitas hacer?"
        placeholderTextColor={colors.placeholder}
        returnKeyType="next"
        maxLength={120}
      />

      <View style={styles.divider} />

      <TextInput
        ref={descriptionRef}
        editable={!disabled}
        accessibilityLabel="Descripción de la tarea"
        style={styles.descriptionInput}
        value={description}
        onChangeText={setDescription}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Añade una descripción (opcional)"
        placeholderTextColor={colors.placeholder}
        multiline
        textAlignVertical="top"
        maxLength={300}
      />

      <View style={styles.attachments}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tomar una foto"
          disabled={disabled || attaching}
          onPress={() => void attachPhoto('camera')}
          style={styles.attachButton}
        >
          <Text style={styles.attachText}>Cámara</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Elegir una foto de la galería"
          disabled={disabled || attaching}
          onPress={() => void attachPhoto('library')}
          style={styles.attachButton}
        >
          <Text style={styles.attachText}>Galería</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={location ? 'Actualizar ubicación' : 'Adjuntar ubicación'}
          disabled={disabled || attaching}
          onPress={() => void attachLocation()}
          style={styles.attachButton}
        >
          <Text style={styles.attachText}>{location ? 'Actualizar ubicación' : 'Ubicación'}</Text>
        </Pressable>
      </View>

      {attaching && <Text style={styles.attachmentHint}>Procesando…</Text>}

      {imageUri && (
        <View style={styles.previewRow}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} accessibilityLabel="Foto adjunta a la tarea" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quitar foto"
            disabled={disabled || attaching}
            onPress={() => void clearPhoto()}
            style={styles.removeButton}
          >
            <Text style={styles.removeText}>Quitar foto</Text>
          </Pressable>
        </View>
      )}

      {location && (
        <View style={styles.locationRow}>
          <Text style={styles.locationText} numberOfLines={2}>{locationLabel(location)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quitar ubicación"
            disabled={disabled || attaching}
            onPress={clearLocation}
            style={styles.removeButton}
          >
            <Text style={styles.removeText}>Quitar</Text>
          </Pressable>
        </View>
      )}

      {!!attachmentError && <Text accessibilityRole="alert" style={styles.attachmentError}>{attachmentError}</Text>}

      <View style={styles.footer}>
        <Text style={styles.hint}>{hint}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Guardar cambios' : 'Añadir tarea'}
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.addButton,
            !canSubmit && styles.addButtonDisabled,
            pressed && styles.addButtonPressed,
          ]}
        >
          <Text style={styles.addButtonIcon}>{isEditing ? '✓' : '+'}</Text>
          <Text style={styles.addButtonText}>{submitLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md + 1,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  cardFocused: {
    borderColor: colors.primary,
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  editingLabel: {
    color: colors.primary,
    fontSize: fontSize.kicker,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  cancelButton: {
    minHeight: 32,
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  titleInput: {
    minHeight: 44,
    paddingHorizontal: 10,
    color: colors.text,
    fontSize: fontSize.input,
    fontWeight: '600',
    outlineWidth: 0,
  },
  divider: {
    height: 1,
    marginHorizontal: 10,
    backgroundColor: colors.borderSoft,
  },
  descriptionInput: {
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: colors.textBody,
    fontSize: fontSize.body,
    lineHeight: 20,
    outlineWidth: 0,
  },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 8,
  },
  attachButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primarySelected,
    backgroundColor: colors.primarySoft,
  },
  attachText: {
    color: colors.primaryText,
    fontSize: fontSize.body - 1,
    fontWeight: '600',
  },
  attachmentHint: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    color: colors.textSubtle,
    fontSize: fontSize.small,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.borderSoft,
  },
  removeButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  removeText: {
    color: colors.danger,
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  locationText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: fontSize.small,
    lineHeight: 18,
  },
  attachmentError: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    color: colors.danger,
    fontSize: fontSize.small,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingLeft: 10,
  },
  hint: {
    flex: 1,
    color: colors.textSubtle,
    fontSize: fontSize.small,
  },
  addButton: {
    minWidth: 104,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  addButtonDisabled: {
    backgroundColor: colors.primaryDisabled,
  },
  addButtonPressed: {
    opacity: 0.82,
  },
  addButtonIcon: {
    color: colors.white,
    fontSize: 20,
    lineHeight: 22,
  },
  addButtonText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
});
