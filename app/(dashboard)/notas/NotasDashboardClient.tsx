"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Settings } from "lucide-react";
import type { CourseWithEvaluations } from "@/lib/types";
import { calculateCourseGrades, type EvaluationInput } from "@/lib/engine/grades";
import { CourseStatusCard } from "@/components/dashboard/CourseStatusCard";
import { EvaluationPanel } from "@/components/grades/EvaluationPanel";
import Link from "next/link";

interface Props {
  courses: CourseWithEvaluations[];
}

export function NotasDashboardClient({ courses }: Props) {
  const [coursesState, setCoursesState] = useState(courses);
  const [configuringCourse, setConfiguringCourse] = useState<CourseWithEvaluations | null>(null);
  const [panelKey, setPanelKey] = useState(0);

  const configured = coursesState.filter((c) => {
    const inputs: EvaluationInput[] = c.evaluations.map((e) => ({
      id: e.id, name: e.name, weight: e.weight, grade: e.grade[0]?.value ?? null,
    }));
    return calculateCourseGrades(inputs).isConfigured;
  });

  const pending = coursesState.filter((c) => {
    const inputs: EvaluationInput[] = c.evaluations.map((e) => ({
      id: e.id, name: e.name, weight: e.weight, grade: e.grade[0]?.value ?? null,
    }));
    return !calculateCourseGrades(inputs).isConfigured;
  });

  async function refreshCourses() {
    const res = await fetch("/api/courses");
    if (res.ok) setCoursesState(await res.json());
    setPanelKey((k) => k + 1);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
          Módulo 2
        </p>
        <h1 className="text-4xl" style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}>
          Notas
        </h1>
      </div>

      {/* Cursos configurados */}
      {configured.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg mb-4" style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}>
            Cursos activos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configured.map((course) => (
              <Link key={course.id} href={`/notas/${course.id}`}>
                <CourseStatusCard
                  course={course}
                  onConfigure={(e?: React.MouseEvent) => {
                    e?.preventDefault();
                    setConfiguringCourse(course);
                  }}
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Cursos pendientes */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-lg mb-1" style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}>
            Pendientes de configurar
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
            Define los pesos de evaluación para ver los cálculos.
          </p>
          <div className="space-y-2">
            {pending.map((course) => {
              const inputs: EvaluationInput[] = course.evaluations.map((e) => ({
                id: e.id, name: e.name, weight: e.weight, grade: e.grade[0]?.value ?? null,
              }));
              const { totalWeight } = calculateCourseGrades(inputs);

              return (
                <div
                  key={course.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: course.color }} />
                    <div>
                      <p className="text-sm" style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-mono)" }}>
                        {course.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                        {course.evaluations.length} evaluación{course.evaluations.length !== 1 ? "es" : ""} · {totalWeight.toFixed(0)}% configurado
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfiguringCourse(course)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs"
                    style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", fontFamily: "var(--font-dm-mono)" }}
                  >
                    <Settings size={12} />
                    Configurar
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {coursesState.length === 0 && (
        <div className="text-center py-16" style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
          <p className="text-sm">No hay cursos registrados.</p>
        </div>
      )}

      {/* Panel de configuración */}
      <AnimatePresence>
        {configuringCourse && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfiguringCourse(null)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.4)" }}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 40 }}
              className="fixed right-0 top-0 h-full w-full max-w-md z-50 overflow-y-auto"
              style={{ background: "var(--bg)", borderLeft: "1px solid var(--border)" }}
            >
              <EvaluationPanel
                key={`${configuringCourse.id}-${panelKey}`}
                courseId={configuringCourse.id}
                courseName={configuringCourse.name}
                initialEvaluations={configuringCourse.evaluations}
                onClose={() => setConfiguringCourse(null)}
                onSaved={async () => { await refreshCourses(); setConfiguringCourse(null); }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
