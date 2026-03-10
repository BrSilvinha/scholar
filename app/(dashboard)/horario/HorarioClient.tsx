"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { Plus, Trash2, AlertCircle, X } from "lucide-react";
import type { ScheduleBlock, Course } from "@/lib/db/schema";

type BlockWithCourse = ScheduleBlock & { course: Course };

type DayOfWeek = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "lunes", label: "Lun" },
  { key: "martes", label: "Mar" },
  { key: "miercoles", label: "Mié" },
  { key: "jueves", label: "Jue" },
  { key: "viernes", label: "Vie" },
  { key: "sabado", label: "Sáb" },
  { key: "domingo", label: "Dom" },
];

// 18 slots de 50 min: 08:00 → 23:00
function slotToTime(slot: number) {
  const totalMins = 8 * 60 + slot * 50;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const SLOTS = Array.from({ length: 18 }, (_, i) => i);
const SLOT_HEIGHT = 48; // px por slot

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

  // Form state
  const [formCourseId, setFormCourseId] = useState("");
  const [formDay, setFormDay] = useState<DayOfWeek>("lunes");
  const [formStart, setFormStart] = useState("0");
  const [formEnd, setFormEnd] = useState("3");
  const [formRoom, setFormRoom] = useState("");

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ─── Detección de conflictos ───────────────────────────────────────────────

  function detectConflicts(allBlocks: BlockWithCourse[]): Set<string> {
    const conflicted = new Set<string>();

    for (let i = 0; i < allBlocks.length; i++) {
      for (let j = i + 1; j < allBlocks.length; j++) {
        const a = allBlocks[i];
        const b = allBlocks[j];
        if (a.dayOfWeek !== b.dayOfWeek) continue;
        if (a.courseId === b.courseId) continue;

        // Overlap: a.start < b.end && b.start < a.end
        if (a.startSlot < b.endSlot && b.startSlot < a.endSlot) {
          conflicted.add(a.id);
          conflicted.add(b.id);
        }
      }
    }

    return conflicted;
  }

  // ─── DnD handlers ─────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const block = blocks.find((b) => b.id === event.active.id);
    if (block) setActiveBlock(block);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveBlock(null);

    const { active, over } = event;
    if (!over) return;

    const block = blocks.find((b) => b.id === active.id);
    if (!block) return;

    // El droppable id tiene formato "day-slot": "lunes-3"
    const [newDay, newSlotStr] = String(over.id).split("-");
    const newSlot = parseInt(newSlotStr);
    if (isNaN(newSlot)) return;

    const duration = block.endSlot - block.startSlot;
    const newEnd = newSlot + duration;
    if (newEnd > 18) return;

    const newDayTyped = newDay as DayOfWeek;

    const updated = blocks.map((b) =>
      b.id === block.id
        ? { ...b, dayOfWeek: newDayTyped, startSlot: newSlot, endSlot: newEnd }
        : b
    );

    setBlocks(updated);
    setConflicts(detectConflicts(updated));

    // Persistir
    await fetch("/api/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: block.id,
        dayOfWeek: newDayTyped,
        startSlot: newSlot,
        endSlot: newEnd,
        room: block.room,
      }),
    });
  }

  // ─── Crear bloque ──────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: formCourseId,
        dayOfWeek: formDay,
        startSlot: parseInt(formStart),
        endSlot: parseInt(formEnd),
        room: formRoom || null,
      }),
    });

    if (res.ok) {
      const newBlock = await res.json();
      const course = courses.find((c) => c.id === formCourseId)!;
      const withCourse = { ...newBlock, course };
      const updated = [...blocks, withCourse];
      setBlocks(updated);
      setConflicts(detectConflicts(updated));
      setShowForm(false);
    }

    setSaving(false);
  }

  // ─── Eliminar bloque ───────────────────────────────────────────────────────

  async function handleDelete(blockId: string) {
    await fetch(`/api/schedule?id=${blockId}`, { method: "DELETE" });
    const updated = blocks.filter((b) => b.id !== blockId);
    setBlocks(updated);
    setConflicts(detectConflicts(updated));
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
            Módulo 1
          </p>
          <h1 className="text-4xl" style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}>
            Horario
          </h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-dm-mono)" }}
        >
          <Plus size={14} />
          Agregar bloque
        </button>
      </div>

      {/* Aviso de conflictos */}
      {conflicts.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 text-sm"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            fontFamily: "var(--font-dm-mono)",
          }}
        >
          <AlertCircle size={14} />
          Hay {Math.floor(conflicts.size / 2)} conflicto{conflicts.size / 2 > 1 ? "s" : ""} de horario detectado{conflicts.size / 2 > 1 ? "s" : ""}.
        </motion.div>
      )}

      {/* Grid de horario */}
      <DndContext
        sensors={sensors}
        modifiers={[restrictToWindowEdges]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              border: "1px solid var(--border)",
              minWidth: "700px",
            }}
          >
            {/* Cabecera de días */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: "64px repeat(7, 1fr)",
                background: "var(--bg-subtle)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div />
              {DAYS.map((d) => (
                <div
                  key={d.key}
                  className="py-3 text-center text-xs uppercase tracking-widest"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-dm-mono)",
                    borderLeft: "1px solid var(--border)",
                  }}
                >
                  {d.label}
                </div>
              ))}
            </div>

            {/* Filas de slots */}
            {SLOTS.map((slot) => (
              <div
                key={slot}
                className="grid"
                style={{
                  gridTemplateColumns: "64px repeat(7, 1fr)",
                  borderBottom: "1px solid var(--border)",
                  minHeight: `${SLOT_HEIGHT}px`,
                }}
              >
                {/* Etiqueta de tiempo */}
                <div
                  className="flex items-start pt-1.5 px-2 text-[10px]"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-dm-mono)",
                    borderRight: "1px solid var(--border)",
                  }}
                >
                  {slotToTime(slot)}
                </div>

                {/* Celdas por día */}
                {DAYS.map((day) => {
                  // Encontrar bloques que empiezan en este slot/día
                  const blockHere = blocks.find(
                    (b) => b.dayOfWeek === day.key && b.startSlot === slot
                  );

                  return (
                    <DroppableCell
                      key={day.key}
                      id={`${day.key}-${slot}`}
                      slot={slot}
                      day={day.key}
                    >
                      {blockHere && (
                        <DraggableBlock
                          block={blockHere}
                          hasConflict={conflicts.has(blockHere.id)}
                          onDelete={() => handleDelete(blockHere.id)}
                        />
                      )}
                    </DroppableCell>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Overlay del bloque arrastrado */}
        <DragOverlay>
          {activeBlock && (
            <div
              className="rounded-md px-2 py-1 text-xs font-medium shadow-lg opacity-90"
              style={{
                background: activeBlock.course.color,
                color: "#fff",
                height: `${(activeBlock.endSlot - activeBlock.startSlot) * SLOT_HEIGHT}px`,
                width: "100px",
                fontFamily: "var(--font-dm-mono)",
              }}
            >
              {activeBlock.course.name}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Modal: agregar bloque */}
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
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50 rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <div className="px-6 py-5 border-b flex items-center justify-between"
                style={{ borderColor: "var(--border)" }}>
                <h2 className="text-xl" style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}>
                  Agregar bloque
                </h2>
                <button onClick={() => setShowForm(false)} style={{ color: "var(--text-muted)" }}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                    Curso
                  </label>
                  <select
                    value={formCourseId}
                    onChange={(e) => {
                      setFormCourseId(e.target.value);
                      const course = courses.find((c) => c.id === e.target.value);
                      if (course?.room) setFormRoom(course.room);
                    }}
                    required
                    className="w-full px-3 py-2.5 text-sm"
                    style={{ fontFamily: "var(--font-dm-mono)" }}
                  >
                    <option value="">Selecciona un curso</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                    Día
                  </label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value as DayOfWeek)}
                    className="w-full px-3 py-2.5 text-sm"
                    style={{ fontFamily: "var(--font-dm-mono)" }}
                  >
                    {DAYS.map((d) => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1.5"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                      Desde
                    </label>
                    <select
                      value={formStart}
                      onChange={(e) => setFormStart(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm"
                      style={{ fontFamily: "var(--font-dm-mono)" }}
                    >
                      {SLOTS.map((s) => (
                        <option key={s} value={s}>{slotToTime(s)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1.5"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                      Hasta
                    </label>
                    <select
                      value={formEnd}
                      onChange={(e) => setFormEnd(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm"
                      style={{ fontFamily: "var(--font-dm-mono)" }}
                    >
                      {SLOTS.filter((s) => s > parseInt(formStart)).map((s) => (
                        <option key={s} value={s}>{slotToTime(s)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                    Aula / Modalidad
                  </label>
                  <input
                    type="text" value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    placeholder="Ej: Lab. Cómputo 12 / Virtual"
                    className="w-full px-3 py-2.5 text-sm"
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
                    {saving ? "Guardando..." : "Agregar"}
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

// ─── Droppable Cell ───────────────────────────────────────────────────────────

function DroppableCell({
  id,
  children,
}: {
  id: string;
  slot: number;
  day: DayOfWeek;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        borderLeft: "1px solid var(--border)",
        background: isOver ? "color-mix(in srgb, var(--text-primary) 5%, transparent)" : "transparent",
        transition: "background 0.1s ease",
        position: "relative",
        minHeight: "48px",
      }}
    >
      {children}
    </div>
  );
}

// ─── Draggable Block ──────────────────────────────────────────────────────────

function DraggableBlock({
  block,
  hasConflict,
  onDelete,
}: {
  block: BlockWithCourse;
  hasConflict: boolean;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
  });

  const height = (block.endSlot - block.startSlot) * SLOT_HEIGHT - 4;

  const style = {
    position: "absolute" as const,
    top: 2,
    left: 2,
    right: 2,
    height: `${height}px`,
    background: block.course.color,
    borderRadius: "6px",
    opacity: isDragging ? 0.4 : 1,
    border: hasConflict ? "2px solid #dc2626" : "none",
    cursor: "grab",
    overflow: "hidden",
    zIndex: isDragging ? 0 : 1,
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div className="px-2 py-1.5 flex items-start justify-between h-full">
        <div className="flex-1 min-w-0">
          <p
            className="text-[11px] font-medium leading-tight truncate"
            style={{ color: "#fff", fontFamily: "var(--font-dm-mono)" }}
          >
            {block.course.name}
          </p>
          {block.room && (
            <p
              className="text-[10px] mt-0.5 opacity-75 truncate"
              style={{ color: "#fff", fontFamily: "var(--font-dm-mono)" }}
            >
              {block.room}
            </p>
          )}
          {hasConflict && (
            <p className="text-[10px] mt-0.5" style={{ color: "#fecaca" }}>
              Conflicto
            </p>
          )}
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="ml-1 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "#fff", cursor: "pointer" }}
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}
