import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius } from '../constants/theme';
import type { Task } from '../types/task';
import { TaskItem } from './task-item';

type TaskListProps = {
  tasks: Task[];
  /** Total de tareas sin filtrar: sirve para elegir el mensaje cuando la lista está vacía. */
  totalCount: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

/** Lista de tareas (equivalente a ion-list), con un mensaje cuando no hay ninguna. */
export function TaskList({ tasks, totalCount, onToggle, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return <EmptyState listIsEmpty={totalCount === 0} />;
  }

  return (
    <View style={styles.list}>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </View>
  );
}

function EmptyState({ listIsEmpty }: { listIsEmpty: boolean }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>✓</Text>
      </View>
      <Text style={styles.emptyTitle}>
        {listIsEmpty ? 'Tu lista está despejada' : 'No hay tareas por aquí'}
      </Text>
      <Text style={styles.emptyCopy}>
        {listIsEmpty
          ? 'Añade tu primera tarea arriba para empezar.'
          : 'Prueba otro filtro o disfruta de un momento libre.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 34,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#DCD9EA',
    borderRadius: radius.md + 1,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  emptyIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  emptyIconText: {
    color: colors.primary,
    fontSize: 21,
    fontWeight: '700',
  },
  emptyTitle: {
    color: colors.textBody,
    fontSize: fontSize.input,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyCopy: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: fontSize.body - 1,
    lineHeight: 19,
    textAlign: 'center',
  },
});
