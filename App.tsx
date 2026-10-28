import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type Task = {
  id: string;
  title: string;
  completed: boolean;
};

type TaskFilter = 'all' | 'active' | 'completed';

const STORAGE_KEY = 'paso-a-paso.tasks';

const STARTER_TASKS: Task[] = [
  { id: 'demo-1', title: 'Planificar la semana', completed: true },
  { id: 'demo-2', title: 'Preparar una lista de compras', completed: false },
  { id: 'demo-3', title: 'Terminar el proyecto de clase', completed: false },
];

function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const task = value as Partial<Task>;
  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    typeof task.completed === 'boolean'
  );
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(STARTER_TASKS);
  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadTasks = async () => {
      try {
        const savedTasks = await AsyncStorage.getItem(STORAGE_KEY);
        const parsedTasks: unknown = savedTasks === null ? STARTER_TASKS : JSON.parse(savedTasks);
        if (mounted) {
          setTasks(Array.isArray(parsedTasks) ? parsedTasks.filter(isTask) : STARTER_TASKS);
        }
      } catch {
        if (mounted) {
          setTasks(STARTER_TASKS);
        }
      } finally {
        if (mounted) {
          setStorageReady(true);
        }
      }
    };

    void loadTasks();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {
      // La app sigue funcionando aunque el dispositivo no permita guardar datos.
    });
  }, [tasks, storageReady]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingCount = tasks.length - completedCount;
  const completionPercent = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);
  const todayLabel = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const filters: { id: TaskFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Todas', count: tasks.length },
    { id: 'active', label: 'Pendientes', count: pendingCount },
    { id: 'completed', label: 'Hechas', count: completedCount },
  ];

  const visibleTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  const addTask = () => {
    const title = newTask.trim();
    if (!title) return;

    setTasks((currentTasks) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        completed: false,
      },
      ...currentTasks,
    ]);
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)),
    );
  };

  const deleteTask = (id: string) => {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
  };

  const clearCompleted = () => {
    setTasks((currentTasks) => currentTasks.filter((task) => !task.completed));
  };

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
            <View style={styles.topbar}>
              <View style={styles.brand}>
                <View style={styles.brandMark}>
                  <Text style={styles.brandCheck}>✓</Text>
                </View>
                <Text style={styles.brandName}>paso a paso</Text>
              </View>
              <View style={styles.saveIndicator}>
                <View style={styles.saveDot} />
                <Text style={styles.saveText}>Guardado automático</Text>
              </View>
            </View>

            <View style={styles.hero}>
              <Text style={styles.dateLabel}>{todayLabel}</Text>
              <Text style={styles.heroTitle}>
                Lo que toca,{ '\n' }
                <Text style={styles.heroAccent}>sin prisa.</Text>
              </Text>
              <Text style={styles.heroCopy}>Un paso a la vez. Haz espacio para lo que importa.</Text>
            </View>

            <View style={styles.progressCard}>
              <View style={styles.progressHeading}>
                <View style={styles.progressIcon}>
                  <Text style={styles.progressIconText}>✓</Text>
                </View>
                <View style={styles.progressCopy}>
                  <Text style={styles.progressKicker}>TU PROGRESO</Text>
                  <Text style={styles.progressSummary}>
                    {`${completedCount} de ${tasks.length} ${tasks.length === 1 ? 'tarea completada' : 'tareas completadas'}`}
                  </Text>
                </View>
                <Text style={styles.progressPercent}>{completionPercent}%</Text>
              </View>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="Tareas completadas"
                accessibilityValue={{ min: 0, max: 100, now: completionPercent }}
                style={styles.progressTrack}
              >
                <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
              </View>
            </View>

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

              <View style={styles.taskForm}>
                <TextInput
                  accessibilityLabel="Escribe una nueva tarea"
                  style={styles.taskInput}
                  value={newTask}
                  onChangeText={setNewTask}
                  onSubmitEditing={addTask}
                  placeholder="¿Qué necesitas hacer?"
                  placeholderTextColor="#A09EAF"
                  returnKeyType="done"
                  maxLength={120}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Añadir tarea"
                  disabled={!newTask.trim()}
                  onPress={addTask}
                  style={({ pressed }) => [
                    styles.addButton,
                    !newTask.trim() && styles.addButtonDisabled,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.addButtonIcon}>+</Text>
                  <Text style={styles.addButtonText}>Añadir</Text>
                </Pressable>
              </View>

              <View style={styles.filterBar}>
                <View style={styles.filterPills}>
                  {filters.map((option) => {
                    const selected = filter === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setFilter(option.id)}
                        style={[styles.filterButton, selected && styles.filterButtonSelected]}
                      >
                        <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                          {option.label}
                        </Text>
                        <Text style={[styles.filterCount, selected && styles.filterTextSelected]}>
                          {option.count}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {completedCount > 0 && (
                  <Pressable accessibilityRole="button" onPress={clearCompleted} style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>Limpiar hechas</Text>
                  </Pressable>
                )}
              </View>

              {visibleTasks.length > 0 ? (
                <View style={styles.taskList}>
                  {visibleTasks.map((task) => (
                    <View
                      key={task.id}
                      style={[styles.taskCard, task.completed && styles.taskCardCompleted]}
                    >
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityLabel={
                          task.completed ? `Marcar ${task.title} como pendiente` : `Completar ${task.title}`
                        }
                        accessibilityState={{ checked: task.completed }}
                        onPress={() => toggleTask(task.id)}
                        style={styles.taskToggle}
                      >
                        <View style={[styles.checkbox, task.completed && styles.checkboxCompleted]}>
                          {task.completed && <Text style={styles.checkboxCheck}>✓</Text>}
                        </View>
                      </Pressable>
                      <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                        {task.title}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Eliminar ${task.title}`}
                        onPress={() => deleteTask(task.id)}
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteButtonText}>×</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Text style={styles.emptyIconText}>✓</Text>
                  </View>
                  <Text style={styles.emptyTitle}>
                    {tasks.length === 0 ? 'Tu lista está despejada' : 'No hay tareas por aquí'}
                  </Text>
                  <Text style={styles.emptyCopy}>
                    {tasks.length === 0
                      ? 'Añade tu primera tarea arriba para empezar.'
                      : 'Prueba otro filtro o disfruta de un momento libre.'}
                  </Text>
                </View>
              )}
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
    backgroundColor: '#F6F5FB',
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
  topbar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#6256D9',
    shadowColor: '#6256D9',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  brandCheck: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  brandName: {
    color: '#28263A',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  saveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#42A98C',
  },
  saveText: {
    color: '#77758A',
    fontSize: 11,
    fontWeight: '500',
  },
  hero: {
    marginTop: 43,
    marginBottom: 24,
  },
  dateLabel: {
    marginBottom: 13,
    color: '#6256D9',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'capitalize',
  },
  heroTitle: {
    color: '#28263A',
    fontSize: 49,
    fontWeight: '800',
    letterSpacing: -2.2,
    lineHeight: 53,
  },
  heroAccent: {
    color: '#6256D9',
  },
  heroCopy: {
    maxWidth: 310,
    marginTop: 13,
    color: '#77758A',
    fontSize: 14,
    lineHeight: 21,
  },
  progressCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(98, 86, 217, 0.08)',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#322C5E',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  progressHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  progressIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#F0EFFF',
  },
  progressIconText: {
    color: '#6256D9',
    fontSize: 22,
    fontWeight: '700',
  },
  progressCopy: {
    flex: 1,
  },
  progressKicker: {
    marginBottom: 4,
    color: '#77758A',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  progressSummary: {
    color: '#37354B',
    fontSize: 13,
    fontWeight: '600',
  },
  progressPercent: {
    color: '#6256D9',
    fontSize: 18,
    fontWeight: '700',
  },
  progressTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#EFEDF7',
  },
  progressFill: {
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#7569E2',
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
    color: '#77758A',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  sectionTitle: {
    color: '#28263A',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  pendingBadge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E8E5F5',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  pendingBadgeText: {
    color: '#706E83',
    fontSize: 11,
    fontWeight: '600',
  },
  taskForm: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: '#EAE8F2',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#322C5E',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  taskInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    paddingHorizontal: 10,
    color: '#28263A',
    fontSize: 14,
  },
  addButton: {
    minWidth: 92,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#6256D9',
  },
  addButtonDisabled: {
    backgroundColor: '#AAA4E6',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  addButtonIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 22,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  filterBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 7,
    marginBottom: 2,
  },
  filterPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  filterButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    borderRadius: 10,
  },
  filterButtonSelected: {
    backgroundColor: '#EAE8FB',
  },
  filterText: {
    color: '#77758A',
    fontSize: 11,
    fontWeight: '600',
  },
  filterTextSelected: {
    color: '#554ACB',
  },
  filterCount: {
    color: '#9B99AA',
    fontSize: 10,
    fontWeight: '700',
  },
  clearButton: {
    paddingVertical: 8,
    paddingLeft: 3,
  },
  clearButtonText: {
    color: '#8B879C',
    fontSize: 10,
    fontWeight: '600',
  },
  taskList: {
    gap: 9,
  },
  taskCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingLeft: 11,
    paddingRight: 9,
    borderWidth: 1,
    borderColor: '#EEECF3',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    shadowColor: '#322C5E',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  taskCardCompleted: {
    borderColor: '#EEECF3',
  },
  taskToggle: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#B5B2C5',
    borderRadius: 12,
  },
  checkboxCompleted: {
    borderColor: '#58A58F',
    backgroundColor: '#58A58F',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 17,
  },
  taskTitle: {
    flex: 1,
    color: '#39374B',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  taskTitleCompleted: {
    color: '#A09EAF',
    textDecorationLine: 'line-through',
  },
  deleteButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  deleteButtonText: {
    color: '#AAA7B7',
    fontSize: 23,
    fontWeight: '300',
    lineHeight: 27,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 34,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#DCD9EA',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  emptyIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
    borderRadius: 15,
    backgroundColor: '#EEECFB',
  },
  emptyIconText: {
    color: '#7167D7',
    fontSize: 21,
    fontWeight: '700',
  },
  emptyTitle: {
    color: '#39374B',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyCopy: {
    marginTop: 7,
    color: '#898698',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 30,
  },
  footerCheck: {
    color: '#6256D9',
    fontSize: 15,
    fontWeight: '700',
  },
  footerText: {
    color: '#9592A3',
    fontSize: 11,
  },
});
