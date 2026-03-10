"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Save,
  Check,
  AlertCircle,
  GripVertical,
  Pencil,
} from "lucide-react";
import type { EvaluationWithGrade } from "@/lib/types";
import { validateWeights } from "@/lib/engine/grades";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface EvalRow {
  id: string | null; // null = nueva, no guardada
  name: string;
  weight: string; // string para el input
  isEditing: boolean;
}

interface EvaluationPanelProps {
  courseId: string;
  courseName: string;
  initialEvaluations: EvaluationWithGrade[];
  onClose: () => void;
  onSaved: () => void; // callback para refrescar el dashboard
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function EvaluationPanel({
  courseId,
  courseName,
  initialEvaluations,
  onClose,
  onSaved,
}: EvaluationPanelProps) {
  const [rows, setRows] = useState<EvalRow[]>(
    initialEvaluations.map((e) => ({
      id: e.id,
      name: e.name,
      weight: String(e.weight),
      isEditing: false,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const weights = rows.map((r) => parseFloat(r.weight) || 0);
  const { total, isValid, remaining } = validateWeights(weights);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: null, name: "", weight: "", isEditing: true },
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof EvalRow, value: string | boolean) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  // ─── Guardar ───────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    setSaveError(null);
    setSavedOk(false);

    try {
      // Determinar qué evaluaciones crear, actualizar y eliminar
      const originalIds = new Set(initialEvaluations.map((e) => e.id));
      const currentIds = new Set(rows.filter((r) => r.id).map((r) => r.id!));

      // Eliminar las que ya no están
      const toDelete = [...originalIds].filter((id) => !currentIds.has(id));
      await Promise.all(
        toDelete.map((id) =>
          fetch(`/api/evaluations?id=${id}`, { method: "DELETE" })
        )
      );

      // Crear o actualizar
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const weight = parseFloat(row.weight);

        if (row.id) {
          // Actualizar existente
          await fetch("/api/evaluations", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: row.id,
              name: row.name,
              weight,
              order: i,
            }),
          });
        } else {
          // Crear nueva
          const res = await fetch("/api/evaluations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              courseId,
              name: row.name,
              weight,
              order: i,
            }),
          });
          const created = await res.json();
          // Actualizar el id local
          setRows((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, id: created.id } : r))
          );
        }
      }

      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
      onSaved();
    } catch {
      setSaveError("Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  // ─── Color del indicador de peso ────────────────────────────────────────────

  function weightColor() {
    if (isValid) return "#16a34a";
    if (total > 100) return "#dc2626";
    return "#d97706";
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: "var(--font-dm-mono)" }}
    >
      {/* Header */}
      <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: "var(--text-muted)" }}>
          Configurar evaluaciones
        </p>
        <h2
          className="text-xl"
          style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}
        >
          {courseName}
        </h2>
      </div>

      {/* Indicador de peso total */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: "var(--bg-subtle)", borderBottom: `1px solid var(--border)` }}
      >
        <div>
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Peso acumulado
          </p>
          <p
            className="text-2xl font-medium mt-0.5 transition-colors duration-200"
            style={{ color: weightColor(), fontFamily: "var(--font-dm-mono)" }}
          >
            {total.toFixed(1)}%
            <span className="text-base ml-1" style={{ color: "var(--text-muted)" }}>
              / 100%
            </span>
          </p>
        </div>

        {/* Barra de progreso */}
        <div
          className="flex-1 mx-6 h-2 rounded-full overflow-hidden"
          style={{ background: "var(--bg-muted)" }}
        >
          <motion.div
            className="h-full rounded-full transition-colors duration-300"
            style={{ background: weightColor() }}
            animate={{ width: `${Math.min(total, 100)}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>

        {isValid ? (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#16a34a" }}>
            <Check size={14} />
            Listo
          </div>
        ) : (
          <div className="text-xs" style={{ color: weightColor() }}>
            {total < 100 ? `Faltan ${remaining.toFixed(1)}%` : `Exceso ${(total - 100).toFixed(1)}%`}
          </div>
        )}
      </div>

      {/* Lista de evaluaciones */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        <AnimatePresence initial={false}>
          {rows.map((row, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 p-3 rounded-lg group"
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
              }}
            >
              {/* Grip */}
              <GripVertical
                size={14}
                style={{ color: "var(--text-muted)", flexShrink: 0 }}
              />

              {/* Nombre */}
              <input
                type="text"
                value={row.name}
                onChange={(e) => updateRow(index, "name", e.target.value)}
                placeholder={`Evaluación ${index + 1}`}
                className="flex-1 px-3 py-1.5 text-sm rounded-md"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-dm-mono)",
                }}
              />

              {/* Porcentaje */}
              <div className="relative flex items-center">
                <input
                  type="number"
                  value={row.weight}
                  onChange={(e) => updateRow(index, "weight", e.target.value)}
                  placeholder="0"
                  min={0}
                  max={100}
                  step={0.5}
                  className="w-20 px-3 py-1.5 pr-7 text-sm rounded-md text-right"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-dm-mono)",
                  }}
                />
                <span
                  className="absolute right-2.5 text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  %
                </span>
              </div>

              {/* Eliminar */}
              <button
                onClick={() => removeRow(index)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md transition-opacity"
                style={{ color: "#dc2626" }}
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {rows.length === 0 && (
          <div
            className="text-center py-8 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Agrega al menos una evaluación para configurar este curso.
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-6 py-4 border-t space-y-3"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        {/* Botón agregar */}
        <button
          onClick={addRow}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors"
          style={{
            border: "1px dashed var(--border-strong)",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-dm-mono)",
          }}
        >
          <Plus size={14} />
          Agregar evaluación
        </button>

        {saveError && (
          <div
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-md"
            style={{
              background: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca",
            }}
          >
            <AlertCircle size={13} />
            {saveError}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-dm-mono)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-opacity disabled:opacity-40"
            style={{
              background: isValid ? "var(--text-primary)" : "var(--bg-muted)",
              color: isValid ? "var(--bg)" : "var(--text-muted)",
              fontFamily: "var(--font-dm-mono)",
            }}
          >
            {savedOk ? (
              <>
                <Check size={14} /> Guardado
              </>
            ) : saving ? (
              "Guardando..."
            ) : (
              <>
                <Save size={14} />
                {isValid ? "Guardar configuración" : `Falta ${remaining.toFixed(1)}%`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
