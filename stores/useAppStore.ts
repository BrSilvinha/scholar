import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task, Cycle, CourseWithEvaluations } from "@/lib/types";

interface AppState {
  // Tema
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;

  // Ciclo actual
  currentCycle: Cycle | null;
  setCurrentCycle: (cycle: Cycle | null) => void;

  // Cursos
  courses: CourseWithEvaluations[];
  setCourses: (courses: CourseWithEvaluations[]) => void;
  updateCourse: (course: CourseWithEvaluations) => void;

  // Tareas
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  updateTask: (task: Task) => void;
  removeTask: (taskId: string) => void;

  // Modal de bienvenida
  welcomeModalShown: boolean;
  setWelcomeModalShown: (shown: boolean) => void;

  // Permisos de push
  pushPermission: NotificationPermission | "default";
  setPushPermission: (permission: NotificationPermission) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),

      currentCycle: null,
      setCurrentCycle: (cycle) => set({ currentCycle: cycle }),

      courses: [],
      setCourses: (courses) => set({ courses }),
      updateCourse: (course) =>
        set((state) => ({
          courses: state.courses.map((c) =>
            c.id === course.id ? course : c
          ),
        })),

      tasks: [],
      setTasks: (tasks) => set({ tasks }),
      updateTask: (task) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
        })),
      removeTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
        })),

      welcomeModalShown: false,
      setWelcomeModalShown: (shown) => set({ welcomeModalShown: shown }),

      pushPermission: "default",
      setPushPermission: (permission) => set({ pushPermission: permission }),
    }),
    {
      name: "scholar-app-store",
      partialize: (state) => ({
        theme: state.theme,
        pushPermission: state.pushPermission,
      }),
    }
  )
);
