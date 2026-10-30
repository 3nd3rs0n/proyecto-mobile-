import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from './src/components/app-header';
import { FilterBar } from './src/components/filter-bar';
import { ProgressCard } from './src/components/progress-card';
import { TaskForm } from './src/components/task-form';
import { TaskList } from './src/components/task-list';
import { colors, fontSize, radius } from './src/constants/theme';
import { useTasks } from './src/hooks/use-tasks';
import type { TaskFilter } from './src/types/task';

/**
 * Pantalla principal (equivalente a ion-content).
 * Solo arma la interfaz: la lógica vive en useTasks() y cada sección es un componente.
 */
export default function App() {
  const {
    tasks,
    visibleTasks,
    filter,
    setFilter,
    completedCount,
    pendingCount,
    completionPercent,
    addTask,
    toggleTask,
    deleteTask,
    clearCompleted,
  } = useTasks();

  const filters: { id: TaskFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Todas', count: tasks.length },
    { id: 'active', label: 'Pendientes', count: pendingCount },
    { id: 'completed', label: 'Hechas', count: completedCount },
  ];

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AppHeader />

            <ProgressCard
              completed={completedCount}
              total={tasks.length}
              percent={completionPercent}
            />

            <View style={styles.tasksSection}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionKicker}>TU DÍA, A TU MANERA</Text>
                  <Text style={styles.sectionTitle}>Mis tareas</Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>
                    {pendingCount} {pendingCount === 1 ? 'pendiente' : 'pendientes'}
                  </Text>
                </View>
              </View>

              <TaskForm onSubmit={addTask} />

              <FilterBar
                options={filters}
                selected={filter}
                onSelect={setFilter}
                completedCount={completedCount}
                onClearCompleted={clearCompleted}
              />

              <TaskList
                tasks={visibleTasks}
                totalCount={tasks.length}
                onToggle={toggleTask}
                onDelete={deleteTask}
              />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerCheck}>✓</Text>
              <Text style={styles.footerText}>Tus tareas se guardan en este dispositivo</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
  },
  tasksSection: {
    marginTop: 34,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  sectionKicker: {
    marginBottom: 6,
    color: colors.textMuted,
    fontSize: fontSize.kicker,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.section,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  pendingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  pendingBadgeText: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 30,
  },
  footerCheck: {
    color: colors.primary,
    fontSize: fontSize.input,
    fontWeight: '700',
  },
  footerText: {
    color: colors.textSubtle,
    fontSize: fontSize.small,
  },
});
