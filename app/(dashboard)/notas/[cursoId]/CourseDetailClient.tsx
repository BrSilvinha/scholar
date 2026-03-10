"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  X,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { CourseWithEvaluations, EvaluationWithGrade } from "@/lib/types";
import {
  calculateCourseGrades,
  STATUS_LABELS,
  STATUS_COLORS,
  formatGrade,
  isValidGrade,
  type EvaluationInput,
} from "@/lib/engine/grades";

interface CourseDetailClientProps {
  course: CourseWithEvaluations;
}

export function CourseDetailClient({ course }: CourseDetailClientProps) {
  const [evaluations, setEvaluations] = useState(course.evaluations);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Calcular métricas en tiempo real
  const inputs: EvaluationInput[] = evaluations.map((e) => ({
    id: e.id,
    name: e.name,
    weight: e.weight,
    grade: e.grade[0]?.value ?? null,
  }));

  const result = calculateCourseGrades(inputs);

  // ─── Guardar nota ──────────────────────────────────────────────────────────

  async function saveGrade(evaluationId: string) {
    const numValue = parseFloat(inputValue.replace(",", "."));
    if (!isValidGrade(numValue)) {
      setEditingId(null);
      return;
    }

    setSaving(true);
    const res = await fetch("/api/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evaluationId,
        courseId: course.id,
        value: numValue,
      }),
    });

    if (res.ok) {
      const savedGrade = await res.json();
      setEvaluations((prev) =>
        prev.map((e) =>
          e.id === evaluationId
            ? { ...e, grade: savedGrade ? [savedGrade] : [] }
            : e
        )
      );
    }

    setSaving(false);
    setEditingId(null);
    setInputValue("");
  }

  async function removeGrade(evaluationId: string) {
    await fetch(`/api/grades?evaluationId=${evaluationId}`, { method: "DELETE" });
    setEvaluations((prev) =>
      prev.map((e) =>
        e.id === evaluationId ? { ...e, grade: [] } : e
      )
    );
  }

  function startEdit(evaluation: EvaluationWithGrade) {
    setEditingId(evaluation.id);
    setInputValue(evaluation.grade[0]?.value?.toString() ?? "");
  }

  // ─── Datos del gráfico ─────────────────────────────────────────────────────

  const chartData = evaluations.map((e) => ({
    name: e.name.length > 12 ? e.name.slice(0, 12) + "…" : e.name,
    nota: e.grade[0]?.value ?? null,
    peso: e.weight,
  }));

  const statusColor = STATUS_COLORS[result.status];

  // ─── Tooltip personalizado ─────────────────────────────────────────────────

  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="px-3 py-2 rounded-lg text-xs shadow-lg"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          fontFamily: "var(--font-dm-mono)",
        }}
      >
        <p style={{ color: "var(--text-primary)" }} className="font-medium">{label}</p>
        <p style={{ color: "var(--text-muted)" }}>
          Nota: {payload[0]?.value !== null ? payload[0].value : "—"}
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href="/notas"
        className="flex items-center gap-2 text-sm mb-8 w-fit"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}
      >
        <ArrowLeft size={14} />
        Volver a Notas
      </Link>

      {/* Header del curso */}
      <div className="mb-8 flex items-start gap-4">
        <div
          className="w-3 h-16 rounded-full flex-shrink-0 mt-1"
          style={{ background: course.color }}
        />
        <div>
          <h1
            className="text-4xl leading-tight"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}
          >
            {course.name}
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}
          >
            {course.credits} crédito{course.credits !== 1 ? "s" : ""}
            {course.room && ` · ${course.room}`}
          </p>
        </div>
      </div>

      {/* Métricas principales */}
      {result.isConfigured && (
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-5 rounded-xl"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
        >
          {/* Estado */}
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
              Estado
            </p>
            <p className="text-lg font-medium"
              style={{ color: statusColor, fontFamily: "var(--font-dm-mono)" }}>
              {STATUS_LABELS[result.status]}
            </p>
          </div>

          {/* Nota actual */}
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
              Nota actual
            </p>
            <p className="text-3xl font-medium"
              style={{
                color: result.currentGrade >= 10.5 ? "#16a34a" : "var(--text-primary)",
                fontFamily: "var(--font-dm-mono)",
              }}>
              {formatGrade(result.currentGrade)}
            </p>
          </div>

          {/* Máxima alcanzable */}
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
              Máx. alcanzable
            </p>
            <p className="text-3xl font-medium"
              style={{ fontFamily: "var(--font-dm-mono)", color: "var(--text-primary)" }}>
              {formatGrade(result.maxAchievableGrade)}
            </p>
          </div>

          {/* Nota necesaria */}
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
              Necesitas sacar
            </p>
            <p className="text-3xl font-medium"
              style={{
                color: result.neededGradeAverage > 15 ? "#ea580c" : "var(--text-primary)",
                fontFamily: "var(--font-dm-mono)",
              }}>
              {result.pendingCount > 0 ? formatGrade(result.neededGradeAverage) : "—"}
            </p>
            {result.pendingCount > 0 && (
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                prom. en {result.pendingCount} evaluac.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabla de evaluaciones */}
      <div className="mb-8">
        <h2 className="text-xl mb-4" style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}>
          Evaluaciones
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          {/* Cabecera */}
          <div
            className="grid grid-cols-12 px-4 py-2.5 text-[10px] uppercase tracking-widest"
            style={{
              background: "var(--bg-subtle)",
              borderBottom: "1px solid var(--border)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-dm-mono)",
            }}
          >
            <div className="col-span-5">Evaluación</div>
            <div className="col-span-2 text-right">Peso</div>
            <div className="col-span-3 text-right">Nota</div>
            <div className="col-span-2 text-right">Aporte</div>
          </div>

          {/* Filas */}
          {evaluations.map((evaluation, index) => {
            const isEditing = editingId === evaluation.id;
            const gradeValue = evaluation.grade[0]?.value ?? null;
            const contribution =
              gradeValue !== null ? (gradeValue * evaluation.weight) / 100 : null;
            const needed = result.neededPerEvaluation.find(
              (n) => n.evaluationId === evaluation.id
            );

            return (
              <motion.div
                key={evaluation.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-12 px-4 py-3 items-center group"
                style={{
                  borderBottom:
                    index < evaluations.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                  background:
                    index % 2 === 0 ? "var(--bg)" : "var(--bg-subtle)",
                }}
              >
                {/* Nombre */}
                <div className="col-span-5">
                  <p className="text-sm" style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-mono)" }}>
                    {evaluation.name}
                  </p>
                  {/* Nota necesaria (si no tiene nota y el curso está configurado) */}
                  {!gradeValue && needed && result.isConfigured && (
                    <p
                      className="text-[10px] mt-0.5"
                      style={{
                        color: needed.isPossible ? "var(--text-muted)" : "#dc2626",
                        fontFamily: "var(--font-dm-mono)",
                      }}
                    >
                      Necesitas ≥ {needed.neededGrade.toFixed(1)}
                    </p>
                  )}
                </div>

                {/* Peso */}
                <div
                  className="col-span-2 text-right text-sm"
                  style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}
                >
                  {evaluation.weight}%
                </div>

                {/* Nota (editable) */}
                <div className="col-span-3 text-right">
                  {isEditing ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveGrade(evaluation.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        min={0}
                        max={20}
                        step={0.5}
                        autoFocus
                        className="w-16 px-2 py-1 text-sm text-right rounded"
                        style={{
                          background: "var(--bg-muted)",
                          border: "1px solid var(--text-primary)",
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-dm-mono)",
                        }}
                      />
                      <button onClick={() => saveGrade(evaluation.id)}
                        className="p-1 rounded" style={{ color: "#16a34a" }}>
                        <Check size={12} />
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="p-1 rounded" style={{ color: "var(--text-muted)" }}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(evaluation)}
                      className="text-sm px-2 py-0.5 rounded transition-colors"
                      style={{
                        color: gradeValue !== null
                          ? (gradeValue >= 10.5 ? "#16a34a" : "#dc2626")
                          : "var(--text-muted)",
                        background: "transparent",
                        fontFamily: "var(--font-dm-mono)",
                      }}
                    >
                      {gradeValue !== null ? gradeValue.toFixed(2) : "— ingresar"}
                    </button>
                  )}
                </div>

                {/* Aporte */}
                <div
                  className="col-span-2 text-right text-sm"
                  style={{
                    color: contribution !== null ? "var(--text-primary)" : "var(--text-muted)",
                    fontFamily: "var(--font-dm-mono)",
                  }}
                >
                  {contribution !== null ? contribution.toFixed(2) : "—"}
                </div>
              </motion.div>
            );
          })}

          {/* Totales */}
          {result.isConfigured && (
            <div
              className="grid grid-cols-12 px-4 py-3 items-center"
              style={{
                background: "var(--bg-muted)",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div className="col-span-5 text-xs uppercase tracking-wider"
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                Total
              </div>
              <div className="col-span-2 text-right text-xs"
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
                100%
              </div>
              <div className="col-span-3" />
              <div
                className="col-span-2 text-right text-base font-medium"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-mono)" }}
              >
                {formatGrade(result.currentGrade)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gráfico de barras */}
      {result.isConfigured && chartData.some((d) => d.nota !== null) && (
        <div>
          <h2 className="text-xl mb-4 flex items-center gap-2"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}>
            <TrendingUp size={18} style={{ color: "var(--text-muted)" }} />
            Rendimiento por evaluación
          </h2>
          <div
            className="p-5 rounded-xl"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fontFamily: "var(--font-dm-mono)", fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 20]}
                  ticks={[0, 5, 10, 10.5, 15, 20]}
                  tick={{ fontSize: 10, fontFamily: "var(--font-dm-mono)", fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={10.5}
                  stroke="#dc2626"
                  strokeDasharray="4 2"
                  label={{ value: "10.5", fill: "#dc2626", fontSize: 10 }}
                />
                <Bar dataKey="nota" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.nota === null
                          ? "var(--border)"
                          : entry.nota >= 10.5
                          ? "#16a34a"
                          : "#dc2626"
                      }
                      opacity={entry.nota === null ? 0.3 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs shadow-lg"
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        fontFamily: "var(--font-dm-mono)",
        color: "var(--text-primary)",
      }}
    >
      <p className="font-medium mb-0.5">{label}</p>
      <p style={{ color: "var(--text-muted)" }}>
        {payload[0]?.value !== null ? `Nota: ${payload[0].value}` : "Sin nota"}
      </p>
    </div>
  );
}
