import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cardShadow, colors, fontSize, radius, touchTarget } from '../constants/theme';
import type { Task } from '../types/task';

type TaskItemProps = {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

/**
 * Una tarea de la lista (equivalente a ion-item):
 * casilla para completar, título, descripción y botón para eliminar.
 */
export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <View style={styles.card}>
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
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Eliminar ${task.title}`}
        onPress={() => onDelete(task.id)}
        hitSlop={4}
        style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
      >
        <Text style={styles.deleteText}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...cardShadow,
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
  deleteButton: {
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  deleteButtonPressed: {
    backgroundColor: colors.dangerSoft,
  },
  deleteText: {
    color: colors.textSubtle,
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 28,
  },
});
