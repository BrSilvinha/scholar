"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Clock, Sun, Sunset, Moon, Monitor, Wifi,
  MapPin, Coffee, Sparkles, CalendarClock,
} from "lucide-react";
import type { CourseWithEvaluations, ScheduleBlock, Course, DayOfWeek } from "@/lib/types";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

const DAY_LABELS: Record<DayOfWeek, string> = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
  jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo",
};

const JS_TO_DAY: (DayOfWeek | null)[] = [
  null, "lunes", "martes", "miercoles", "jueves", "viernes", "sabado",
];

/** Start time of slot in minutes from midnight (08:00 + slot × 50 min) */
function slotToMins(slot: number) {
  return 8 * 60 + slot * 50;
}

function slotToTime(slot: number) {
  const totalMins = slotToMins(slot);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getRoomType(room: string | null): "lab" | "virtual" | "aula" {
  if (!room) return "aula";
  const l = room.toLowerCase();
  if (l.includes("lab") || l.includes("computo") || l.includes("cómputo")) return "lab";
  if (l.includes("virtual")) return "virtual";
  return "aula";
}

/**
 * Computes semester start date from a semester string like "2026-I" or "2026-II".
 * "I"  → first Monday of April of that year
 * "II" → first Monday of August of that year
 */
function getSemesterStart(semester: string): Date {
  const parts = semester.split("-");
  const year = parseInt(parts[0], 10);
  const period = parts[1]; // "I" or "II"
  const month = period === "I" ? 3 : 7; // 3 = April (0-indexed), 7 = August
  const d = new Date(year, month, 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1); // advance to Monday
  return d;
}

type BlockWithCourse = ScheduleBlock & { course: Course };

interface DailyScheduleModalProps {
  courses: CourseWithEvaluations[];
  semester: string;
}

export function DailyScheduleModal({ courses, semester }: DailyScheduleModalProps) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const shown = sessionStorage.getItem("scholar_daily_v2");
    if (!shown) {
      sessionStorage.setItem("scholar_daily_v2", "1");
      const t = setTimeout(() => setOpen(true), 700);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const semesterStart = getSemesterStart(semester);
  const semesterNotStarted = now < semesterStart;
  const daysUntilStart = differenceInDays(semesterStart, now);

  const currentMins = now.getHours() * 60 + now.getMinutes();

  const allBlocks: BlockWithCourse[] = courses.flatMap((c) =>
    c.scheduleBlocks.map((b) => ({ ...b, course: c }))
  );

  /**
   * Find the single next class starting from today, scanning up to 7 days ahead.
   * Returns { block, dayKey, isToday, isTomorrow }
   */
  function findNextBlock() {
    for (let offset = 0; offset < 7; offset++) {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      const dayKey = JS_TO_DAY[d.getDay()];
      if (!dayKey) continue; // skip Sunday

      const dayBlocks = allBlocks
        .filter((b) => b.dayOfWeek === dayKey)
        .sort((a, b) => a.startSlot - b.startSlot);

      for (const block of dayBlocks) {
        // On today: only blocks that haven't ended yet
        if (offset === 0 && slotToMins(block.endSlot) <= currentMins) continue;
        return { block, dayKey, isToday: offset === 0, isTomorrow: offset === 1 };
      }
    }
    return null;
  }

  const next = semesterNotStarted ? null : findNextBlock();

  const hour = now.getHours();
  const GreetIcon = hour < 12 ? Sun : hour < 19 ? Sunset : Moon;
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const isOngoing =
    next?.isToday &&
    slotToMins(next.block.startSlot) <= currentMins &&
    slotToMins(next.block.endSlot) > currentMins;

  // Derived display values for the next block
  const roomType = next ? getRoomType(next.block.room) : null;
  const RoomIcon = roomType === "lab" ? Monitor : roomType === "virtual" ? Wifi : MapPin;
  const accentColor =
    roomType === "lab" ? "#a8d400" : roomType === "virtual" ? "#a855f7" : next?.block.course.color ?? "#5b1f8a";
  const roomLabel =
    roomType === "lab" ? "LAB" : roomType === "virtual" ? "VIRTUAL" : next?.block.room ?? "Presencial";

  const dayLabel = next
    ? next.isToday
      ? "Hoy"
      : next.isTomorrow
      ? "Mañana"
      : DAY_LABELS[next.dayKey]
    : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm relative overflow-hidden rounded-2xl"
            style={{
              background: "var(--bg)",
              boxShadow: "0 32px 96px rgba(0,0,0,0.4), 0 0 0 1px var(--border)",
            }}
          >
            {/* Gradient accent bar */}
            <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #5b1f8a 0%, #7c2fb8 40%, #a8d400 100%)" }} />

            {/* Background decoration */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(168,212,0,0.08) 0%, transparent 70%)" }} />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(91,31,138,0.1) 0%, transparent 70%)" }} />

            {/* Header */}
            <div className="px-5 pt-4 pb-3 flex items-start justify-between relative">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <GreetIcon size={13} style={{ color: "#a8d400" }} strokeWidth={2.5} />
                  <p className="text-[11px] font-medium tracking-wide uppercase" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                    {greeting}
                  </p>
                </div>
                <h2 className="text-xl font-bold leading-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  {semesterNotStarted ? "¡Semestre próximo!" : next ? "Tu próxima clase" : "¡Sin clases esta semana!"}
                </h2>
                {semesterNotStarted && (
                  <div className="flex items-center gap-1 mt-1">
                    <CalendarClock size={10} style={{ color: "#a8d400" }} />
                    <p className="text-[11px]" style={{ color: "#a8d400", fontFamily: "var(--font-sans)" }}>
                      Faltan {daysUntilStart} día{daysUntilStart !== 1 ? "s" : ""} para el inicio
                    </p>
                  </div>
                )}
                {next && isOngoing && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
                    <p className="text-[11px]" style={{ color: "#ef4444", fontFamily: "var(--font-sans)" }}>En curso ahora mismo</p>
                  </div>
                )}
                {next && !isOngoing && next.isToday && (
                  <div className="flex items-center gap-1 mt-1">
                    <Sparkles size={10} style={{ color: "#a8d400" }} />
                    <p className="text-[11px]" style={{ color: "#a8d400", fontFamily: "var(--font-sans)" }}>
                      Comienza a las {slotToTime(next.block.startSlot)}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full transition-colors flex-shrink-0 mt-0.5"
                style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px" style={{ background: "var(--border)" }} />

            {/* Content */}
            <div className="px-5 pt-4 pb-5 relative">

              {/* Semester not started */}
              {semesterNotStarted ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "linear-gradient(135deg, #5b1f8a, #7c2fb8)" }}>
                    <CalendarClock size={28} style={{ color: "#a8d400" }} />
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                    Inicio el{" "}
                    <span style={{ color: "#a8d400" }}>{format(semesterStart, "d 'de' MMMM", { locale: es })}</span>
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                    Aprovecha para prepararte con anticipación
                  </p>
                  <div className="mt-4 px-4 py-3 rounded-xl w-full"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                    <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                      Cursos registrados
                    </p>
                    <div className="space-y-1.5">
                      {courses.slice(0, 4).map((c) => (
                        <div key={c.id} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                          <p className="text-[11px] truncate" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-sans)" }}>{c.name}</p>
                        </div>
                      ))}
                      {courses.length > 4 && (
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>+{courses.length - 4} más</p>
                      )}
                    </div>
                  </div>
                </div>

              ) : !next ? (
                /* No upcoming classes this week */
                <div className="flex flex-col items-center py-8 text-center">
                  <Coffee size={30} style={{ color: "var(--text-muted)", marginBottom: 10 }} strokeWidth={1.5} />
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Sin clases esta semana</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>Disfruta tu descanso 🎉</p>
                </div>

              ) : (
                /* Single next class card */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    border: `1.5px solid ${accentColor}60`,
                    background: isOngoing ? `${accentColor}12` : "var(--bg-subtle)",
                  }}
                >
                  {/* Top accent strip */}
                  <div className="h-1" style={{ background: accentColor }} />

                  <div className="p-4">
                    {/* Day badge + status */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{
                          background: next.isToday ? accentColor : "var(--bg-muted)",
                          color: next.isToday ? (roomType === "lab" ? "#2d3a00" : "#fff") : "var(--text-secondary)",
                        }}>
                        {dayLabel}
                      </span>
                      {isOngoing ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "#ef4444", color: "#fff" }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> EN CURSO
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                          PRÓXIMA
                        </span>
                      )}
                    </div>

                    {/* Course name */}
                    <p className="text-base font-bold leading-snug mb-1"
                      style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                      {next.block.course.name}
                    </p>

                    {/* Professor + Section */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {next.block.course.professor && (
                        <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                          {next.block.course.professor}
                        </p>
                      )}
                      {next.block.section && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                          style={{ background: "rgba(168,212,0,0.18)", color: "#a8d400", border: "1px solid rgba(168,212,0,0.45)" }}>
                          Sec. {next.block.section}
                        </span>
                      )}
                    </div>

                    {/* Time + Room row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5 text-xs font-semibold"
                        style={{ color: "var(--text-secondary)" }}>
                        <Clock size={11} />
                        {slotToTime(next.block.startSlot)} – {slotToTime(next.block.endSlot)}
                      </span>

                      {/* Room badge — always large and visible */}
                      {(roomType === "lab" || roomType === "virtual") && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-black uppercase tracking-widest"
                          style={{
                            background: roomType === "lab" ? "#a8d400" : "rgba(124,47,184,0.2)",
                            color: roomType === "lab" ? "#1a2800" : "#d8b4fe",
                            border: roomType === "lab" ? "2px solid #7aaa00" : "2px solid rgba(168,100,255,0.7)",
                            boxShadow: roomType === "lab" ? "0 2px 12px rgba(168,212,0,0.4)" : "0 2px 10px rgba(124,47,184,0.3)",
                          }}>
                          <RoomIcon size={13} />
                          {roomLabel}
                        </span>
                      )}
                      {roomType === "aula" && next?.block.room && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: "rgba(0,0,0,0.07)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                          <RoomIcon size={10} /> {next.block.room}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            {!semesterNotStarted && next && (
              <div className="px-5 pb-4 text-center" style={{ borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setOpen(false)}
                  className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: "#5b1f8a", color: "#fff" }}>
                  Entendido
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
