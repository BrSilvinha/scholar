"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { Plus, Trash2, AlertCircle, X, Monitor, Wifi, MapPin, Clock, LayoutGrid, List } from "lucide-react";
import type { ScheduleBlock, Course } from "@/lib/types";

type BlockWithCourse = ScheduleBlock & { course: Course };
type DayOfWeek = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "lunes",     label: "Lunes",     short: "LUN" },
  { key: "martes",    label: "Martes",    short: "MAR" },
  { key: "miercoles", label: "Miércoles", short: "MIÉ" },
  { key: "jueves",    label: "Jueves",    short: "JUE" },
  { key: "viernes",   label: "Viernes",   short: "VIE" },
  { key: "sabado",    label: "Sábado",    short: "SÁB" },
];

export function slotToTime(slot: number) {
  const totalMins = 8 * 60 + slot * 50;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

function getTodayKey(): DayOfWeek | null {
  const map: (DayOfWeek | null)[] = [null, "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  return map[new Date().getDay()] ?? null;
}

function getCurrentSlotFloat(): number | null {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const startMins = 8 * 60;
  const endMins = 8 * 60 + 18 * 50;
  if (mins < startMins || mins > endMins) return null;
  return (mins - startMins) / 50;
}

function getRoomType(room: string | null): "lab" | "virtual" | "aula" {
  if (!room) return "aula";
  const l = room.toLowerCase();
  if (l.includes("lab") || l.includes("computo") || l.includes("cómputo")) return "lab";
  if (l.includes("virtual")) return "virtual";
  return "aula";
}

/** Extracts just the numeric/alphanumeric code at the end of a room name.
 *  "Laboratorio Cómputo 04" → "04", "Lab. Sistemas 3B" → "3B" */
function getLabShortId(room: string | null): string {
  if (!room) return "";
  const short = room
    .replace(/laboratorio\s*/gi, "")
    .replace(/laborat\.\s*/gi, "")
    .replace(/lab\.?\s*/gi, "")
    .trim();
  return short || room;
}

function getLabCode(room: string | null): string {
  if (!room) return "";
  const match = room.match(/[\dA-Za-z]+$/);
  return match ? match[0] : getLabShortId(room);
}

function RoomBadge({ room }: { room: string | null }) {
  const type = getRoomType(room);
  const labCode = type === "lab" ? getLabCode(room) : "";
  const labLabel = labCode ? `LAB-${labCode}` : "LAB";

  if (type === "lab") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide flex-shrink-0"
      style={{ background: "#a8d400", color: "#1a2800", border: "1.5px solid #7aaa00", boxShadow: "0 0 8px rgba(168,212,0,0.5)" }}>
      <Monitor size={8} />
      {labLabel}
    </span>
  );
  if (type === "virtual") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide flex-shrink-0"
      style={{ background: "rgba(124,47,184,0.25)", color: "#d8b4fe", border: "1.5px solid rgba(168,100,255,0.7)", boxShadow: "0 0 8px rgba(168,100,255,0.3)" }}>
      <Wifi size={8} />
      VIRTUAL
    </span>
  );
  // aula — show nothing (no badge for regular classroom)
  return null;
}

const SLOTS = Array.from({ length: 18 }, (_, i) => i);
const SLOT_H = 52;

interface HorarioClientProps {
  initialBlocks: BlockWithCourse[];
  courses: Course[];
}

export function HorarioClient({ initialBlocks, courses }: HorarioClientProps) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [activeBlock, setActiveBlock] = useState<BlockWithCourse | null>(null);
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<number | null>(getCurrentSlotFloat());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const todayKey = getTodayKey();

  const [formCourseId, setFormCourseId] = useState("");
  const [formDay, setFormDay] = useState<DayOfWeek>("lunes");
  const [formStart, setFormStart] = useState("0");
  const [formEnd, setFormEnd] = useState("2");
  const [formRoom, setFormRoom] = useState("");
  const [formSection, setFormSection] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setCurrentSlot(getCurrentSlotFloat()), 60000);
    return () => clearInterval(interval);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const detectConflicts = useCallback((allBlocks: BlockWithCourse[]) => {
    const conflicted = new Set<string>();
    for (let i = 0; i < allBlocks.length; i++) {
      for (let j = i + 1; j < allBlocks.length; j++) {
        const a = allBlocks[i], b = allBlocks[j];
        if (a.dayOfWeek !== b.dayOfWeek || a.courseId === b.courseId) continue;
        if (a.startSlot < b.endSlot && b.startSlot < a.endSlot) { conflicted.add(a.id); conflicted.add(b.id); }
      }
    }
    return conflicted;
  }, []);

  function handleDragStart(e: DragStartEvent) {
    setActiveBlock(blocks.find((b) => b.id === e.active.id) ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveBlock(null);
    const { active, over } = e;
    if (!over) return;
    const block = blocks.find((b) => b.id === active.id);
    if (!block) return;
    const parts = String(over.id).split("-");
    const newSlot = parseInt(parts[parts.length - 1]);
    const newDay = parts.slice(0, -1).join("-") as DayOfWeek;
    if (isNaN(newSlot)) return;
    const dur = block.endSlot - block.startSlot;
    const newEnd = newSlot + dur;
    if (newEnd > 18) return;
    const updated = blocks.map((b) => b.id === block.id ? { ...b, dayOfWeek: newDay, startSlot: newSlot, endSlot: newEnd } : b);
    setBlocks(updated); setConflicts(detectConflicts(updated));
    await fetch("/api/schedule", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: block.id, dayOfWeek: newDay, startSlot: newSlot, endSlot: newEnd, room: block.room }) });
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true);
    const res = await fetch("/api/schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId: formCourseId, dayOfWeek: formDay, startSlot: parseInt(formStart), endSlot: parseInt(formEnd), room: formRoom || null, section: formSection || null }) });
    if (res.ok) {
      const nb = await res.json();
      const course = courses.find((c) => c.id === formCourseId)!;
      const updated = [...blocks, { ...nb, course }];
      setBlocks(updated); setConflicts(detectConflicts(updated)); setShowForm(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch("/api/schedule?id=" + id, { method: "DELETE" });
    const updated = blocks.filter((b) => b.id !== id);
    setBlocks(updated); setConflicts(detectConflicts(updated));
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-display)", color: "#a8d400" }}>
            Mi Horario
          </h1>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(168,212,0,0.12)", color: "#a8d400", border: "1px solid rgba(168,212,0,0.3)" }}>
              2026-I
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{blocks.length} bloque{blocks.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <button onClick={() => setViewMode("grid")} className="px-3 py-2 flex items-center gap-1.5 text-xs font-semibold transition-colors"
              style={{ background: viewMode === "grid" ? "#5b1f8a" : "var(--bg-subtle)", color: viewMode === "grid" ? "#fff" : "var(--text-muted)" }}>
              <LayoutGrid size={13} /> <span className="hidden sm:inline">Grilla</span>
            </button>
            <button onClick={() => setViewMode("list")} className="px-3 py-2 flex items-center gap-1.5 text-xs font-semibold transition-colors"
              style={{ background: viewMode === "list" ? "#5b1f8a" : "var(--bg-subtle)", color: viewMode === "list" ? "#fff" : "var(--text-muted)", borderLeft: "1px solid var(--border)" }}>
              <List size={13} /> <span className="hidden sm:inline">Lista</span>
            </button>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "#5b1f8a", color: "#fff" }}>
            <Plus size={14} /> Agregar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {([
          { Icon: Monitor, label: "LAB", bg: "#a8d400", color: "#1a2800", border: "#7aaa00", shadow: "0 0 8px rgba(168,212,0,0.4)" },
          { Icon: Wifi,    label: "VIRTUAL", bg: "rgba(124,47,184,0.25)", color: "#d8b4fe", border: "rgba(168,100,255,0.7)", shadow: "0 0 8px rgba(168,100,255,0.3)" },
        ] as { Icon: React.ElementType; label: string; bg: string; color: string; border: string; shadow: string }[]).map(({ Icon, label, bg, color, border, shadow }) => (
          <span key={label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black" style={{ background: bg, color, border: "1.5px solid " + border, boxShadow: shadow }}>
            <Icon size={11} /> {label}
          </span>
        ))}
        {todayKey && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ml-auto" style={{ background: "#a8d400", color: "#3d5000" }}>
            <Clock size={11} /> Hoy: {DAYS.find(d => d.key === todayKey)?.label}
          </span>
        )}
      </div>

      {conflicts.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4 text-sm" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
          <AlertCircle size={14} /> {Math.floor(conflicts.size / 2)} conflicto{conflicts.size / 2 > 1 ? "s" : ""} detectado{conflicts.size / 2 > 1 ? "s" : ""}
        </motion.div>
      )}

      {/* ── Vista Lista (mobile-first) ────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {DAYS.map((day) => {
            const dayBlocks = blocks
              .filter((b) => b.dayOfWeek === day.key)
              .sort((a, b) => a.startSlot - b.startSlot);
            if (dayBlocks.length === 0) return null;
            const isToday = day.key === todayKey;
            return (
              <div key={day.key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ background: isToday ? "#a8d400" : "var(--bg-muted)", color: isToday ? "#3d5000" : "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                    {day.label}
                  </span>
                  {isToday && <span className="text-[10px]" style={{ color: "#a8d400" }}>• HOY</span>}
                </div>
                <div className="space-y-2">
                  {dayBlocks.map((block) => {
                    const type = getRoomType(block.room);
                    const isLab = type === "lab";
                    const isVirtual = type === "virtual";
                    const accentColor = isLab ? "#a8d400" : isVirtual ? "#a855f7" : block.course.color;
                    const RoomIcon = isLab ? Monitor : isVirtual ? Wifi : MapPin;
                    return (
                      <motion.div key={block.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-stretch gap-0 rounded-xl overflow-hidden"
                        style={{ border: `1.5px solid ${isLab ? "#a8d400" : isVirtual ? "rgba(168,100,255,0.7)" : "var(--border)"}` }}>
                        {/* Accent strip */}
                        <div className="w-2 flex-shrink-0" style={{ background: accentColor }} />
                        <div className="flex-1 px-3 py-3"
                          style={{ background: isLab ? "rgba(168,212,0,0.09)" : isVirtual ? "rgba(91,31,138,0.07)" : "var(--bg-subtle)" }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {/* Lab / Virtual badge — always first, big and bold */}
                              {(isLab || isVirtual) && (
                                <div className="mb-2">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-black uppercase tracking-widest"
                                    style={{
                                      background: isLab ? "#a8d400" : "rgba(124,47,184,0.2)",
                                      color: isLab ? "#1a2800" : "#d8b4fe",
                                      border: isLab ? "2px solid #7aaa00" : "2px solid rgba(168,100,255,0.7)",
                                      boxShadow: isLab ? "0 2px 12px rgba(168,212,0,0.45)" : "0 2px 10px rgba(124,47,184,0.3)",
                                    }}>
                                    <RoomIcon size={13} />
                                    {isLab
                                      ? (getLabCode(block.room) ? `LAB-${getLabCode(block.room)}` : "LAB")
                                      : "VIRTUAL"
                                    }
                                  </span>
                                </div>
                              )}
                              <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                                {block.course.name}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap mt-0.5 mb-1">
                                {block.course.professor && (
                                  <p className="text-[11px] truncate" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                                    {block.course.professor}
                                  </p>
                                )}
                                {block.section && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                                    style={{ background: "rgba(168,212,0,0.15)", color: "#a8d400", border: "1px solid rgba(168,212,0,0.4)" }}>
                                    Sec. {block.section}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                                  <Clock size={10} /> {slotToTime(block.startSlot)}–{slotToTime(block.endSlot)}
                                </span>
                                {!isLab && !isVirtual && block.room && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                    style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                                    <MapPin size={9} /> {block.room}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button onClick={() => handleDelete(block.id)}
                              className="p-1.5 rounded-lg flex-shrink-0 opacity-40 hover:opacity-80 transition-opacity"
                              style={{ color: "var(--text-muted)" }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {blocks.length === 0 && (
            <p className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>Sin bloques de horario aún</p>
          )}
        </div>
      )}

      {/* ── Vista Grilla ──────────────────────────────────────────────── */}
      {viewMode === "grid" && <DndContext sensors={sensors} modifiers={[restrictToWindowEdges]} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border)" }}>
          <div style={{ minWidth: "680px" }}>
            <div className="grid" style={{ gridTemplateColumns: "56px repeat(6, 1fr)", background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
              <div className="py-3" />
              {DAYS.map((d) => {
                const isToday = d.key === todayKey;
                return (
                  <div key={d.key} className="py-3 text-center" style={{ borderLeft: "1px solid var(--border)", background: isToday ? "rgba(168,212,0,0.12)" : "transparent" }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isToday ? "#4a6000" : "var(--text-muted)" }}>{d.short}</p>
                    {isToday && <div className="w-1.5 h-1.5 rounded-full mx-auto mt-1" style={{ background: "#a8d400" }} />}
                  </div>
                );
              })}
            </div>

            {SLOTS.map((slot) => (
              <div key={slot} className="grid" style={{ gridTemplateColumns: "56px repeat(6, 1fr)", borderBottom: "1px solid var(--border)", minHeight: SLOT_H + "px" }}>
                <div className="flex items-start pt-1.5 px-1.5 text-[10px]" style={{ color: "var(--text-muted)", borderRight: "1px solid var(--border)" }}>
                  {slotToTime(slot)}
                </div>
                {DAYS.map((day) => {
                  const isToday = day.key === todayKey;
                  const blockHere = blocks.find((b) => b.dayOfWeek === day.key && b.startSlot === slot);
                  const showLine = isToday && currentSlot !== null && currentSlot >= slot && currentSlot < slot + 1;
                  return (
                    <DroppableCell key={day.key} id={day.key + "-" + slot} isToday={isToday}>
                      {showLine && (
                        <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: ((currentSlot! - slot) * SLOT_H) + "px", height: "2px", background: "#ef4444", boxShadow: "0 0 6px rgba(239,68,68,0.5)" }}>
                          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
                        </div>
                      )}
                      {blockHere && <DraggableBlock block={blockHere} hasConflict={conflicts.has(blockHere.id)} onDelete={() => handleDelete(blockHere.id)} />}
                    </DroppableCell>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeBlock && (
            <div className="rounded-xl px-3 py-2 shadow-2xl" style={{ background: activeBlock.course.color, color: "#fff", width: "110px", height: ((activeBlock.endSlot - activeBlock.startSlot) * SLOT_H) + "px", opacity: 0.9 }}>
              <p className="text-[10px] font-bold truncate">{activeBlock.course.name}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>}

      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }} />
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={{ type: "spring", stiffness: 380, damping: 32 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50 rounded-2xl overflow-hidden shadow-2xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ background: "#5b1f8a" }}>
                <h2 className="text-base font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Nuevo bloque</h2>
                <button onClick={() => setShowForm(false)} className="text-white opacity-70 hover:opacity-100"><X size={16} /></button>
              </div>
              <form onSubmit={handleCreate} className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Curso</label>
                  <select value={formCourseId} onChange={(e) => { setFormCourseId(e.target.value); const c = courses.find(x => x.id === e.target.value); if (c?.room) setFormRoom(c.room); }} required className="w-full px-3 py-2.5 text-sm">
                    <option value="">Selecciona un curso</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Día</label>
                  <select value={formDay} onChange={(e) => setFormDay(e.target.value as DayOfWeek)} className="w-full px-3 py-2.5 text-sm">
                    {DAYS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Desde</label>
                    <select value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full px-3 py-2.5 text-sm">
                      {SLOTS.map((s) => <option key={s} value={s}>{slotToTime(s)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Hasta</label>
                    <select value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full px-3 py-2.5 text-sm">
                      {SLOTS.filter(s => s > parseInt(formStart)).map((s) => <option key={s} value={s}>{slotToTime(s)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Aula / Modalidad</label>
                    <input type="text" value={formRoom} onChange={(e) => setFormRoom(e.target.value)} placeholder="Ej: Lab. Cómputo 04" className="w-full px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Sección</label>
                    <input type="text" value={formSection} onChange={(e) => setFormSection(e.target.value)} placeholder="Ej: A, B, C1..." className="w-full px-3 py-2.5 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: "#5b1f8a", color: "#fff" }}>{saving ? "Guardando..." : "Agregar"}</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DroppableCell({ id, isToday, children }: { id: string; isToday: boolean; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={{ borderLeft: "1px solid var(--border)", background: isOver ? "rgba(168,212,0,0.1)" : isToday ? "rgba(168,212,0,0.04)" : "transparent", transition: "background 0.1s", position: "relative", minHeight: SLOT_H + "px" }}>
      {children}
    </div>
  );
}

function DraggableBlock({ block, hasConflict, onDelete }: { block: BlockWithCourse; hasConflict: boolean; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: block.id });
  const height = (block.endSlot - block.startSlot) * SLOT_H - 4;
  const roomType = getRoomType(block.room);

  return (
    <div ref={setNodeRef} style={{
      position: "absolute", top: 2, left: 3, right: 3, height: height + "px",
      background: block.course.color + "14",
      borderRadius: "8px",
      borderLeft: "3px solid " + (hasConflict ? "#ef4444" : block.course.color),
      outline: hasConflict ? "1.5px solid #ef4444" : "1px solid " + block.course.color + "30",
      cursor: isDragging ? "grabbing" : "grab",
      overflow: "hidden", zIndex: isDragging ? 0 : 1, opacity: isDragging ? 0.3 : 1,
      transform: transform ? "translate(" + transform.x + "px," + transform.y + "px)" : undefined,
    }} {...listeners} {...attributes}>
      {roomType === "lab" && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "#a8d400" }} />}
      {roomType === "virtual" && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: block.course.color }} />}
      <div className="px-2 py-1.5 flex flex-col h-full">
        <div className="flex-1 min-h-0">
          <p className="text-[10px] font-bold leading-tight" style={{ color: block.course.color, fontFamily: "var(--font-display)" }}>
            {block.course.name.length > 30 ? block.course.name.slice(0, 30) + "…" : block.course.name}
          </p>
          {block.course.professor && height > 50 && (
            <p className="text-[9px] mt-0.5 leading-tight" style={{ color: "var(--text-secondary)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {block.course.professor.split(" ").slice(0, 3).join(" ")}
            </p>
          )}
          {block.section && height > 60 && (
            <span className="inline-block mt-0.5 px-1.5 py-0 rounded text-[8px] font-bold uppercase"
              style={{ background: "rgba(168,212,0,0.2)", color: "#a8d400" }}>
              Sec. {block.section}
            </span>
          )}
        </div>
        <div className="flex items-end justify-between mt-1 gap-1">
          {height > 40 && <RoomBadge room={block.room} />}
          <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 rounded opacity-40 hover:opacity-90 transition-opacity flex-shrink-0" style={{ color: "var(--text-muted)", cursor: "pointer" }}>
            <Trash2 size={9} />
          </button>
        </div>
      </div>
    </div>
  );
}
