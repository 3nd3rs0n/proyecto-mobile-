import { type ComponentRef, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { cardShadow, colors, fontSize, radius } from '../constants/theme';
import type { TaskInput } from '../types/task';

type TaskFormProps = {
  onSubmit: (task: TaskInput) => void;
};

export function TaskForm({ onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [focused, setFocused] = useState(false);
  const descriptionRef = useRef<ComponentRef<typeof TextInput>>(null);

  const canSubmit = title.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({ title, description });
    setTitle('');
    setDescription('');
  };

  return (
    <View style={[styles.card, focused && styles.cardFocused]}>
      <TextInput
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

      <View style={styles.footer}>
        <Text style={styles.hint}>
          {canSubmit ? 'Listo para añadir' : 'Escribe un título para añadir'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Añadir tarea"
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={submit}
          style={({ pressed }) => [
            styles.addButton,
            !canSubmit && styles.addButtonDisabled,
            pressed && styles.addButtonPressed,
          ]}
        >
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>Añadir</Text>
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
