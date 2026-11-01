import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cardShadow, colors, fontSize, radius, touchTarget } from '../constants/theme';
import type { Task } from '../types/task';

type TaskItemProps = {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  /** Resalta la tarjeta mientras su tarea está en el formulario. */
  isEditing?: boolean;
};

export function TaskItem({ task, onToggle, onDelete, onEdit, isEditing = false }: TaskItemProps) {
  return (
    <View style={[styles.card, isEditing && styles.cardEditing]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={
          task.completed ? `Marcar ${task.title} como pendiente` : `Completar ${task.title}`
        }
        accessibilityState={{ checked: task.completed }}
        onPress={() => onToggle(task.id)}
        style={styles.toggle}
      >
        <View style={[styles.checkbox, task.completed && styles.checkboxCompleted]}>
          {task.completed && <Text style={styles.checkboxCheck}>✓</Text>}
        </View>
      </Pressable>

      <View style={styles.content}>
        <Text style={[styles.title, task.completed && styles.titleCompleted]}>
          {task.title}
        </Text>
        {task.description.length > 0 && (
          <Text style={[styles.description, task.completed && styles.descriptionCompleted]}>
            {task.description}
          </Text>
        )}

        {/* Botones con ícono y texto para que se entienda qué hace cada uno. */}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Editar ${task.title}`}
            accessibilityState={{ selected: isEditing }}
            onPress={() => onEdit(task.id)}
            hitSlop={4}
            style={({ pressed }) => [
              styles.actionButton,
              styles.editButton,
              isEditing && styles.editButtonActive,
              pressed && styles.actionPressed,
            ]}
          >
            <Text style={[styles.actionIcon, styles.editLabel, isEditing && styles.editLabelActive]}>
              ✎
            </Text>
            <Text style={[styles.actionLabel, styles.editLabel, isEditing && styles.editLabelActive]}>
              {isEditing ? 'Editando…' : 'Editar'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Eliminar ${task.title}`}
            onPress={() => onDelete(task.id)}
            hitSlop={4}
            style={({ pressed }) => [
              styles.actionButton,
              styles.deleteButton,
              pressed && styles.actionPressed,
            ]}
          >
            <Text style={[styles.actionIcon, styles.deleteLabel]}>×</Text>
            <Text style={[styles.actionLabel, styles.deleteLabel]}>Eliminar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingLeft: 8,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  cardEditing: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  toggle: {
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#B5B2C5',
    borderRadius: 12,
  },
  checkboxCompleted: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  checkboxCheck: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 17,
  },
  content: {
    flex: 1,
    gap: 3,
    paddingTop: 10,
  },
  title: {
    color: colors.textBody,
    fontSize: fontSize.task,
    fontWeight: '600',
    lineHeight: 21,
  },
  titleCompleted: {
    color: colors.placeholder,
    textDecorationLine: 'line-through',
  },
  description: {
    color: colors.textMuted,
    fontSize: fontSize.body - 1,
    lineHeight: 19,
  },
  descriptionCompleted: {
    color: colors.placeholder,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionIcon: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 18,
  },
  actionLabel: {
    fontSize: fontSize.body - 1,
    fontWeight: '600',
  },
  editButton: {
    borderColor: colors.primarySelected,
    backgroundColor: colors.primarySoft,
  },
  editButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  editLabel: {
    color: colors.primaryText,
  },
  editLabelActive: {
    color: colors.white,
  },
  deleteButton: {
    borderColor: '#F6D3D9',
    backgroundColor: colors.dangerSoft,
  },
  deleteLabel: {
    color: colors.danger,
  },
});
