"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, ChevronRight, FileText, BookMarked } from "lucide-react";
import type { Cycle, CourseWithEvaluations, Task, Course } from "@/lib/db/schema";
import { calculateCourseGrades, type EvaluationInput } from "@/lib/engine/grades";
import { CountdownBanner } from "@/components/dashboard/CountdownBanner";
import { CourseStatusCard } from "@/components/dashboard/CourseStatusCard";
import { EvaluationPanel } from "@/components/grades/EvaluationPanel";
import { WelcomeModal } from "@/components/dashboard/WelcomeModal";
import Link from "next/link";

interface DashboardClientProps {
  cycle: Cycle;
  courses: CourseWithEvaluations[];
  upcomingTasks: (Task & { course: Course | null })[];
  userName: string;
}

export function DashboardClient({
  cycle,
  courses,
  upcomingTasks,
  userName,
}: DashboardClientProps) {
  const [coursesState, setCoursesState] = useState(courses);
  const [configuringCourse, setConfiguringCourse] = useState<CourseWithEvaluations | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [panelKey, setPanelKey] = useState(0);

  // Mostrar modal de bienvenida si hay tareas próximas
  useEffect(() => {
    const sessionKey = "scholar_welcome_shown";
    if (upcomingTasks.length > 0 && !sessionStorage.getItem(sessionKey)) {
      setShowWelcome(true);
      sessionStorage.setItem(sessionKey, "1");
    }
  }, [upcomingTasks]);

  // Separar cursos: configurados vs pendientes
  const configuredCourses = coursesState.filter((c) => {
    const inputs: EvaluationInput[] = c.evaluations.map((e) => ({
      id: e.id,
      name: e.name,
      weight: e.weight,
      grade: e.grade[0]?.value ?? null,
    }));
    const result = calculateCourseGrades(inputs);
    return result.isConfigured;
  });

  const pendingCourses = coursesState.filter((c) => {
    const inputs: EvaluationInput[] = c.evaluations.map((e) => ({
      id: e.id,
      name: e.name,
      weight: e.weight,
      grade: e.grade[0]?.value ?? null,
    }));
    const result = calculateCourseGrades(inputs);
    return !result.isConfigured;
  });

  const approvedCount = configuredCourses.filter((c) => {
    const inputs: EvaluationInput[] = c.evaluations.map((e) => ({
      id: e.id,
      name: e.name,
      weight: e.weight,
      grade: e.grade[0]?.value ?? null,
    }));
    return calculateCourseGrades(inputs).status === "APROBADO";
  }).length;

  async function refreshCourses() {
    const res = await fetch("/api/courses");
    if (res.ok) {
      const data = await res.json();
      setCoursesState(data);
    }
    setPanelKey((k) => k + 1);
  }

  const firstName = userName.split(" ")[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Saludo */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="text-sm mb-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
          {greeting},
        </p>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          {firstName} 👋
        </h1>
      </motion.div>

      {/* Countdown */}
      <div className="mb-6">
        <CountdownBanner
          endDate={new Date(cycle.endDate)}
          approvedCourses={approvedCount}
          totalCourses={coursesState.length}
        />
      </div>

      {/* Acciones rápidas */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/notas"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "#5b1f8a", color: "#ffffff", fontFamily: "var(--font-sans)" }}
        >
          <BookMarked size={14} />
          Ver notas
        </Link>
        <Link
          href="/horario"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "#a8d400", color: "#2d0d47", fontFamily: "var(--font-sans)" }}
        >
          <ChevronRight size={14} />
          Mi horario
        </Link>
        <Link
          href="/pdf"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-sans)" }}
        >
          <FileText size={14} />
          Generar PDF
        </Link>
      </div>

      {/* Cursos configurados */}
      {configuredCourses.length > 0 && (
        <section className="mb-8">
          <h2
            className="text-lg mb-4"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
            }}
          >
            Estado de cursos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {configuredCourses.map((course) => (
                <CourseStatusCard
                  key={course.id}
                  course={course}
                  onConfigure={() => setConfiguringCourse(course)}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Cursos pendientes de configurar */}
      {pendingCourses.length > 0 && (
        <section>
          <h2
            className="text-lg mb-1"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
            }}
          >
            Pendientes de configurar
          </h2>
          <p
            className="text-xs mb-4"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Estos cursos no aparecen en el dashboard hasta que sus pesos de
            evaluación sumen 100%.
          </p>
          <div className="space-y-2">
            {pendingCourses.map((course) => {
              const inputs: EvaluationInput[] = course.evaluations.map((e) => ({
                id: e.id,
                name: e.name,
                weight: e.weight,
                grade: e.grade[0]?.value ?? null,
              }));
              const { totalWeight } = calculateCourseGrades(inputs);

              return (
                <motion.div
                  key={course.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between px-4 py-3 rounded-lg"
                  style={{
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Dot de color del curso */}
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: course.color }}
                    />
                    <div>
                      <p
                        className="text-sm"
                        style={{
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        {course.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}
                      >
                        {totalWeight.toFixed(0)}% / 100% configurado
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfiguringCourse(course)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors"
                    style={{
                      background: "var(--bg-muted)",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    <Settings size={12} />
                    Configurar
                  </button>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Panel lateral de configuración de evaluaciones */}
      <AnimatePresence>
        {configuringCourse && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfiguringCourse(null)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.4)" }}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 40 }}
              className="fixed right-0 top-0 h-full w-full max-w-md z-50 overflow-y-auto"
              style={{
                background: "var(--bg)",
                borderLeft: "1px solid var(--border)",
              }}
            >
              <EvaluationPanel
                key={`${configuringCourse.id}-${panelKey}`}
                courseId={configuringCourse.id}
                courseName={configuringCourse.name}
                initialEvaluations={configuringCourse.evaluations}
                onClose={() => setConfiguringCourse(null)}
                onSaved={async () => {
                  await refreshCourses();
                  setConfiguringCourse(null);
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de bienvenida */}
      <WelcomeModal
        isOpen={showWelcome}
        tasks={upcomingTasks}
        onClose={() => setShowWelcome(false)}
      />
    </div>
  );
}
