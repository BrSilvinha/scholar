"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Check,
  Trash2,
  Calendar,
  List,
  Clock,
  BookOpen,
  FlaskConical,
  Package,
} from "lucide-react";
import {
  format,
  differenceInDays,
  isToday,
  isTomorrow,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  getDay,
  startOfWeek,
  addMonths,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import type { Task, Course } from "@/lib/db/schema";
import { ChevronLeft, ChevronRight } from "lucide-react";

type TaskWithCourse = Task & { course: Course | null };
type ViewMode = "lista" | "calendario";

const TYPE_ICONS = {
  examen: BookOpen,
  entrega: Package,
  laboratorio: FlaskConical,
  otro: Calendar,
} as const;

const TYPE_LABELS = {
  examen: "Examen",
  entrega: "Entrega",
  laboratorio: "Laboratorio",
  otro: "Otro",
};

interface TareasClientProps {
  tasks: TaskWithCourse[];
  courses: Course[];
  cycleId: string;
}

export function TareasClient({ tasks: initialTasks, courses, cycleId }: TareasClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<ViewMode>("lista");
  const [showForm, setShowForm] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [type, setType] = useState<Task["type"]>("otro");
  const [courseId, setCourseId] = useState<string>("");

  // ─── Crear tarea ──────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycleId,
        courseId: courseId || null,
        title,
        description: description || null,
        dueDate: new Date(dueDate).toISOString(),
        type,
      }),
    });

    if (res.ok) {
      const task = await res.json();
      // Adjuntar el curso si existe
      const course = courses.find((c) => c.id === task.courseId) ?? null;
      setTasks((prev) =>
        [...prev, { ...task, course }].sort(
          (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        )
      );

      // Programar notificaciones push vía API
      fetch("/api/notifications/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      }).catch(() => {}); // no bloquear UI

      setTitle("");
      setDescription("");
      setDueDate("");
      setType("otro");
      setCourseId("");
      setShowForm(false);
    }

    setSaving(false);
  }

  // ─── Completar tarea ──────────────────────────────────────────────────────

  async function handleComplete(taskId: string) {
    await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status: "completada" }),
    });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  // ─── Eliminar tarea ───────────────────────────────────────────────────────

  async function handleDelete(taskId: string) {
    await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  // ─── Urgencia ─────────────────────────────────────────────────────────────

  function urgencyBadge(dueDate: Date) {
    if (isToday(dueDate)) return { label: "HOY", color: "#dc2626", bg: "#fef2f2" };
    if (isTomorrow(dueDate)) return { label: "MAÑANA", color: "#ea580c", bg: "#fff7ed" };
    const days = differenceInDays(dueDate, new Date());
    if (days < 0) return { label: "VENCIDA", color: "#7f1d1d", bg: "#fee2e2" };
    return { label: `${days}d`, color: "var(--text-muted)", bg: "var(--bg-muted)" };
  }

  const pendingTasks = tasks.filter((t) => t.status === "pendiente");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
            Módulo 3
          </p>
          <h1 className="text-4xl" style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}>
            Tareas
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle de vista */}
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            {(["lista", "calendario"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 rounded-md text-xs transition-colors"
                style={{
                  background: view === v ? "var(--text-primary)" : "transparent",
                  color: view === v ? "var(--bg)" : "var(--text-muted)",
                  fontFamily: "var(--font-dm-mono)",
                }}
              >
                {v === "lista" ? <List size={14} /> : <Calendar size={14} />}
              </button>
            ))}
          </div>

          {/* Crear tarea */}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
            style={{
              background: "var(--text-primary)",
              color: "var(--bg)",
              fontFamily: "var(--font-dm-mono)",
            }}
          >
            <Plus size={14} />
            Nueva tarea
          </button>
        </div>
      </div>

      {/* Vista lista */}
      {view === "lista" && (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {pendingTasks.length === 0 ? (
              <div className="text-center py-16" style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                <Clock size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay tareas pendientes.</p>
              </div>
            ) : (
              pendingTasks.map((task) => {
                const due = new Date(task.dueDate);
                const badge = urgencyBadge(due);
                const Icon = TYPE_ICONS[task.type] ?? Calendar;

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 30, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-xl group"
                    style={{
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {/* Check button */}
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{
                        borderColor: task.course?.color ?? "var(--border)",
                        background: "transparent",
                      }}
                    >
                      <Check size={12} style={{ color: task.course?.color ?? "var(--text-muted)", opacity: 0 }}
                        className="group-hover:opacity-100 transition-opacity" />
                    </button>

                    {/* Ícono tipo */}
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{
                        background: (task.course?.color ?? "#6366f1") + "20",
                      }}
                    >
                      <Icon size={14} style={{ color: task.course?.color ?? "#6366f1" }} />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-mono)" }}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.course && (
                          <span className="text-xs" style={{ color: task.course.color, fontFamily: "var(--font-dm-mono)" }}>
                            {task.course.name}
                          </span>
                        )}
                        <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                          {TYPE_LABELS[task.type]}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                          · {format(due, "d MMM", { locale: es })}
                        </span>
                      </div>
                    </div>

                    {/* Badge urgencia */}
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: badge.bg,
                        color: badge.color,
                        fontFamily: "var(--font-dm-mono)",
                        border: `1px solid ${badge.bg}`,
                      }}
                    >
                      {badge.label}
                    </span>

                    {/* Eliminar */}
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Vista calendario */}
      {view === "calendario" && (
        <CalendarView
          tasks={pendingTasks}
          currentDate={calendarDate}
          onPrevMonth={() => setCalendarDate((d) => subMonths(d, 1))}
          onNextMonth={() => setCalendarDate((d) => addMonths(d, 1))}
        />
      )}

      {/* Modal: crear tarea */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
                <h2 className="text-xl" style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}>
                  Nueva tarea
                </h2>
              </div>

              <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                    Título
                  </label>
                  <input
                    type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                    required placeholder="Ej: Examen parcial de Auditoría"
                    className="w-full px-3 py-2.5 text-sm"
                    style={{ fontFamily: "var(--font-dm-mono)" }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1.5"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                      Tipo
                    </label>
                    <select
                      value={type} onChange={(e) => setType(e.target.value as Task["type"])}
                      className="w-full px-3 py-2.5 text-sm"
                      style={{ fontFamily: "var(--font-dm-mono)" }}
                    >
                      <option value="examen">Examen</option>
                      <option value="entrega">Entrega</option>
                      <option value="laboratorio">Laboratorio</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1.5"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                      Fecha límite
                    </label>
                    <input
                      type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                      required className="w-full px-3 py-2.5 text-sm"
                      style={{ fontFamily: "var(--font-dm-mono)" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                    Curso (opcional)
                  </label>
                  <select
                    value={courseId} onChange={(e) => setCourseId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm"
                    style={{ fontFamily: "var(--font-dm-mono)" }}
                  >
                    <option value="">Sin curso</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={description} onChange={(e) => setDescription(e.target.value)}
                    rows={2} placeholder="Notas adicionales..."
                    className="w-full px-3 py-2.5 text-sm resize-none"
                    style={{ fontFamily: "var(--font-dm-mono)" }}
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 rounded-lg text-sm"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-dm-mono)" }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 rounded-lg text-sm disabled:opacity-50"
                    style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-dm-mono)" }}>
                    {saving ? "Guardando..." : "Crear tarea"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Componente Calendario ────────────────────────────────────────────────────

function CalendarView({
  tasks,
  currentDate,
  onPrevMonth,
  onNextMonth,
}: {
  tasks: TaskWithCourse[];
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calcular offset para alinear con lunes
  const firstDayOfWeek = (getDay(monthStart) + 6) % 7; // 0=lun, 6=dom

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      {/* Navegación */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}
      >
        <button onClick={onPrevMonth} className="p-1.5 rounded-md"
          style={{ color: "var(--text-muted)" }}>
          <ChevronLeft size={16} />
        </button>
        <h3 className="text-base capitalize"
          style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}>
          {format(currentDate, "MMMM yyyy", { locale: es })}
        </h3>
        <button onClick={onNextMonth} className="p-1.5 rounded-md"
          style={{ color: "var(--text-muted)" }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Cabecera días */}
      <div className="grid grid-cols-7"
        style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
        {weekDays.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] uppercase tracking-wider"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7" style={{ background: "var(--bg)" }}>
        {/* Offset inicial */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[80px] border-r border-b"
            style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }} />
        ))}

        {days.map((day) => {
          const dayTasks = tasks.filter((t) => isSameDay(new Date(t.dueDate), day));
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className="min-h-[80px] p-2 border-r border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <p
                className="text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full"
                style={{
                  fontFamily: "var(--font-dm-mono)",
                  color: today ? "var(--bg)" : "var(--text-muted)",
                  background: today ? "var(--text-primary)" : "transparent",
                }}
              >
                {format(day, "d")}
              </p>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="text-[10px] px-1.5 py-0.5 rounded truncate"
                    style={{
                      background: (task.course?.color ?? "#6366f1") + "25",
                      color: task.course?.color ?? "#6366f1",
                      fontFamily: "var(--font-dm-mono)",
                    }}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                    +{dayTasks.length - 3} más
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
