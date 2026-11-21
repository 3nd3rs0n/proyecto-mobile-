import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { TaskAttachments as TaskAttachmentServices } from '../composition/task-dependencies';
import { cardShadow, colors, fontSize, radius } from '../constants/theme';
import { useTaskAttachments } from '../hooks/use-task-attachments';
import type { Task, TaskInput } from '../types/task';
import { TaskAttachments } from './task-attachments';

type TaskFormProps = {
  onSubmit: (task: TaskInput) => Promise<boolean>;
  disabled?: boolean;
  /** Con una tarea, el formulario pasa a modo edición y se llena con sus datos. */
  editingTask?: Task | null;
  onCancelEdit?: () => void;
  attachments: TaskAttachmentServices;
};

export function TaskForm({ onSubmit, editingTask = null, onCancelEdit, attachments, disabled = false }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [focused, setFocused] = useState(false);
  const titleRef = useRef<ComponentRef<typeof TextInput>>(null);
  const descriptionRef = useRef<ComponentRef<typeof TextInput>>(null);
  const files = useTaskAttachments(attachments);

  const isEditing = editingTask !== null;
  const canSubmit = !disabled && !files.savingPhoto && title.trim().length > 0;
  const editingId = editingTask?.id;

  // Al elegir otra tarea para editar (o al salir de la edición) se cargan sus datos.
  useEffect(() => {
    setTitle(editingTask?.title ?? '');
    setDescription(editingTask?.description ?? '');
    files.reset({ imageUri: editingTask?.imageUri, location: editingTask?.location });
    if (editingTask) titleRef.current?.focus();
  }, [editingId]);

  const reset = () => {
    setTitle('');
    setDescription('');
    files.reset();
  };

  const submit = async () => {
    if (!canSubmit) return;
    const saved = await onSubmit({
      title,
      description,
      imageUri: files.imageUri,
      location: files.location,
    });
    if (!saved) return;
    await files.commit();
    reset();
  };

  const cancel = async () => {
    await files.discard();
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

      <TaskAttachments {...files} disabled={disabled} />

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
