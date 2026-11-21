import { StatusBar } from 'expo-status-bar';
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from './src/components/app-header';
import { AuthScreen } from './src/components/auth-screen';
import { FilterBar } from './src/components/filter-bar';
import { ProgressCard } from './src/components/progress-card';
import { TaskForm } from './src/components/task-form';
import { TaskList } from './src/components/task-list';
import { createTaskId, taskAttachments, taskRepositoryFor, legacyTaskMigration } from './src/composition/task-dependencies';
import { colors, fontSize, radius } from './src/constants/theme';
import { useTasks } from './src/hooks/use-tasks';
import { useAuth } from './src/hooks/use-auth';
import { authTiming, type User } from './src/domain/auth-service';
import type { TaskFilter, TaskInput } from './src/types/task';

export default function App() {
  const auth = useAuth();
  return <SafeAreaProvider>
    <StatusBar style="dark" />
    {auth.loading ? <SafeAreaView style={styles.loading}>
      {auth.error ? <>
        <Text accessibilityRole="alert" style={styles.error}>{auth.error}</Text>
        <Pressable accessibilityRole="button" style={styles.sessionButton} onPress={() => void auth.restore()}><Text style={styles.sessionAction}>Reintentar</Text></Pressable>
      </> : <><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.footerText}>Recuperando tu sesión…</Text></>}
    </SafeAreaView> : auth.user ?
      <TasksScreen key={auth.user.id} user={auth.user} onLogout={auth.logout} authError={auth.error} /> :
      <AuthScreen auth={auth} />}
  </SafeAreaProvider>;
}

function TasksScreen({ user, onLogout, authError }: { user: User; onLogout: () => Promise<boolean>; authError: string }) {
  useEffect(() => { authTiming.mark('pantalla_principal_montada'); }, []);
  const taskRepository = useMemo(() => taskRepositoryFor(user.id), [user.id]);
  const {
    tasks,
    visibleTasks,
    filter,
    setFilter,
    completedCount,
    pendingCount,
    completionPercent,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    clearCompleted,
    ready, busy, error, retry, importLegacy, flush,
  } = useTasks(taskRepository, createTaskId, user.id);
  const [leaving, setLeaving] = useState(false);
  const [legacyCount, setLegacyCount] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [legacyError, setLegacyError] = useState('');
  useEffect(() => {
    if (!ready) return;
    let mounted = true;
    void authTiming.measure('tareas_antiguas_revision', () => legacyTaskMigration.available(user.id)).then((value) => {
      if (mounted) setLegacyCount(value);
    }).catch(() => {
      if (mounted) setLegacyError('No se pudieron revisar las tareas antiguas. El respaldo permanece intacto.');
    });
    return () => { mounted = false; };
  }, [user.id, ready]);

  const confirmLegacyImport = async () => {
    if (await importLegacy(() => legacyTaskMigration.importInto(user.id, taskRepository))) {
      setLegacyCount(0);
      setConfirming(false);
    }
  };
  const logoutLock = useRef(false);
  const logout = async () => {
    if (logoutLock.current) return;
    logoutLock.current = true;
    setLeaving(true);
    await flush();
    if (!await onLogout()) {
      setLeaving(false);
      logoutLock.current = false;
    }
  };

  // Tarea que está en el formulario. Si se elimina, el formulario vuelve a "Añadir".
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingTask = tasks.find((task) => task.id === editingId) ?? null;

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const sectionY = useRef(0);
  const formY = useRef(0);

  const startEditing = (id: string) => {
    setEditingId(id);
    // Sube hasta el formulario, que está sobre la lista.
    scrollRef.current?.scrollTo({ y: Math.max(sectionY.current + formY.current - 16, 0), animated: true });
  };

  const submitTask = async (input: TaskInput) => {
    if (editingTask) {
      const saved = await updateTask(editingTask.id, input);
      if (saved) setEditingId(null);
      return saved;
    } else {
      return addTask(input);
    }
  };

  const removeTask = async (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!await deleteTask(id)) return;
    if (task?.imageUri) await taskAttachments.photoStorage.remove(task.imageUri);
  };

  const clearDone = async () => {
    const photos = tasks
      .filter((task) => task.completed && task.imageUri)
      .map((task) => task.imageUri as string);
    if (!await clearCompleted()) return;
    await Promise.all(photos.map((uri) => taskAttachments.photoStorage.remove(uri)));
  };

  const filters: { id: TaskFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Todas', count: tasks.length },
    { id: 'active', label: 'Pendientes', count: pendingCount },
    { id: 'completed', label: 'Hechas', count: completedCount },
  ];

  return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AppHeader />

            <View style={styles.sessionBar}>
              <Text style={styles.sessionName}>Hola, {user.name}</Text>
              <Pressable accessibilityRole="button" disabled={busy || leaving} style={styles.sessionButton} onPress={() => void logout()}>
                <Text style={styles.sessionAction}>{leaving ? 'Cerrando sesión…' : 'Cerrar sesión'}</Text>
              </Pressable>
            </View>
            {!!authError && <Text accessibilityRole="alert" style={styles.error}>{authError}</Text>}
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            {!ready && (error ?
              <Pressable accessibilityRole="button" disabled={busy || leaving} style={styles.sessionButton} onPress={() => void retry()}><Text style={styles.sessionAction}>Reintentar carga</Text></Pressable> :
              <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando tareas" />)}
            {busy && <ActivityIndicator color={colors.primary} accessibilityLabel="Guardando tareas" />}
            {ready && !!legacyError && <Text accessibilityRole="alert" style={styles.error}>{legacyError}</Text>}
            {ready && !legacyError && legacyCount > 0 && (
              <View style={styles.legacyCard}>
                <Text style={styles.legacyText}>{confirming
                  ? 'Estas tareas no tienen propietario. Confirma solo si son tuyas: quedarán vinculadas a esta cuenta. Se conservará el respaldo original.'
                  : `Hay ${legacyCount} tareas de la Unidad 1 sin propietario.`}</Text>
                <Pressable accessibilityRole="button" disabled={busy || leaving} style={styles.sessionButton} onPress={() => confirming ? void confirmLegacyImport() : setConfirming(true)}>
                  <Text style={styles.sessionAction}>{confirming ? 'Confirmar: son mis tareas' : 'Importar tareas antiguas'}</Text>
                </Pressable>
                {confirming && <Pressable accessibilityRole="button" disabled={busy || leaving} style={styles.sessionButton} onPress={() => setConfirming(false)}>
                  <Text style={styles.legacyText}>Cancelar</Text>
                </Pressable>}
              </View>)}

            {ready && <>
            <ProgressCard
              completed={completedCount}
              total={tasks.length}
              percent={completionPercent}
            />

            <View
              style={styles.tasksSection}
              pointerEvents={busy || leaving ? 'none' : 'auto'}
              accessibilityElementsHidden={leaving}
              onLayout={(event) => {
                sectionY.current = event.nativeEvent.layout.y;
              }}
            >
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

              <View
                onLayout={(event) => {
                  formY.current = event.nativeEvent.layout.y;
                }}
              >
                <TaskForm
                  disabled={busy || leaving}
                  onSubmit={submitTask}
                  editingTask={editingTask}
                  onCancelEdit={() => setEditingId(null)}
                  attachments={taskAttachments}
                />
              </View>

              <FilterBar
                disabled={busy || leaving}
                options={filters}
                selected={filter}
                onSelect={setFilter}
                completedCount={completedCount}
                onClearCompleted={clearDone}
              />

              <TaskList
                disabled={busy || leaving}
                tasks={visibleTasks}
                totalCount={tasks.length}
                onToggle={toggleTask}
                onDelete={removeTask}
                onEdit={startEditing}
                editingId={editingTask?.id ?? null}
              />
            </View>
            </>}

            <View style={styles.footer}>
              <Text style={styles.footerCheck}>✓</Text>
              <Text style={styles.footerText}>Tus tareas se guardan para esta cuenta</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  legacyCard: { padding: 16, borderRadius: radius.md, backgroundColor: colors.primarySoft, marginTop: 16 },
  legacyText: { color: colors.textBody, lineHeight: 21 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16, backgroundColor: colors.background },
  sessionBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
  sessionName: { flexShrink: 1, color: colors.textBody, fontSize: fontSize.body, fontWeight: '600' },
  sessionButton: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  sessionAction: { color: colors.primary, fontSize: fontSize.body, fontWeight: '700' },
  error: { color: colors.danger, fontSize: fontSize.body, lineHeight: 21, marginBottom: 12 },
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
