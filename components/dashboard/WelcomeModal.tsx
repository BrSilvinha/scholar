"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, FlaskConical, BookOpen, Package } from "lucide-react";
import { differenceInDays, isToday, isTomorrow, format } from "date-fns";
import { es } from "date-fns/locale";
import type { Task, Course } from "@/lib/db/schema";

type TaskWithCourse = Task & { course: Course | null };

interface WelcomeModalProps {
  isOpen: boolean;
  tasks: TaskWithCourse[];
  onClose: () => void;
}

const TASK_TYPE_ICONS = {
  examen: BookOpen,
  entrega: Package,
  laboratorio: FlaskConical,
  otro: Calendar,
} as const;

function getUrgencyBadge(dueDate: Date) {
  if (isToday(dueDate)) {
    return {
      label: "HOY",
      bg: "#fef2f2",
      color: "#dc2626",
      border: "#fecaca",
    };
  }
  if (isTomorrow(dueDate)) {
    return {
      label: "MAÑANA",
      bg: "#fff7ed",
      color: "#ea580c",
      border: "#fed7aa",
    };
  }
  const days = differenceInDays(dueDate, new Date());
  return {
    label: `${days} DÍAS`,
    bg: "var(--bg-muted)",
    color: "var(--text-secondary)",
    border: "var(--border)",
  };
}

export function WelcomeModal({ isOpen, tasks, onClose }: WelcomeModalProps) {
  // Ordenar por urgencia (más próximas primero)
  const sorted = [...tasks].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Header */}
            <div
              className="px-6 py-5 flex items-start justify-between border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div>
                <p
                  className="text-xs uppercase tracking-widest mb-1"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-dm-mono)",
                  }}
                >
                  Próximos 7 días
                </p>
                <h2
                  className="text-xl"
                  style={{
                    fontFamily: "var(--font-playfair)",
                    color: "var(--text-primary)",
                  }}
                >
                  {sorted.length === 1
                    ? "Tienes 1 tarea pendiente"
                    : `Tienes ${sorted.length} tareas pendientes`}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md mt-0.5"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Lista de tareas */}
            <div className="px-6 py-4 space-y-3 max-h-80 overflow-y-auto">
              {sorted.map((task) => {
                const due = new Date(task.dueDate);
                const badge = getUrgencyBadge(due);
                const Icon = TASK_TYPE_ICONS[task.type] ?? Calendar;

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {/* Ícono del tipo */}
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{
                        background: task.course?.color
                          ? task.course.color + "20"
                          : "var(--bg-muted)",
                      }}
                    >
                      <Icon
                        size={14}
                        style={{
                          color: task.course?.color ?? "var(--text-muted)",
                        }}
                      />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-dm-mono)",
                        }}
                      >
                        {task.title}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-dm-mono)",
                        }}
                      >
                        {task.course?.name ?? "Sin curso"} ·{" "}
                        {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-dm-mono)",
                        }}
                      >
                        {format(due, "d 'de' MMMM", { locale: es })}
                      </p>
                    </div>

                    {/* Badge de urgencia */}
                    <span
                      className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        fontFamily: "var(--font-dm-mono)",
                      }}
                    >
                      {badge.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              className="px-6 py-4 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg text-sm font-medium"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg)",
                  fontFamily: "var(--font-dm-mono)",
                }}
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
