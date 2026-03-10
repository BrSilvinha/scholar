"use client";

import { motion } from "framer-motion";
import { Settings, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { CourseWithEvaluations } from "@/lib/db/schema";
import {
  calculateCourseGrades,
  STATUS_LABELS,
  STATUS_COLORS,
  formatGrade,
  type EvaluationInput,
} from "@/lib/engine/grades";

interface CourseStatusCardProps {
  course: CourseWithEvaluations;
  onConfigure?: () => void;
}

export function CourseStatusCard({ course, onConfigure }: CourseStatusCardProps) {
  // Preparar inputs para el motor
  const inputs: EvaluationInput[] = course.evaluations.map((e) => ({
    id: e.id,
    name: e.name,
    weight: e.weight,
    grade: e.grade[0]?.value ?? null,
  }));

  const result = calculateCourseGrades(inputs);
  const statusColor = STATUS_COLORS[result.status];
  const statusLabel = STATUS_LABELS[result.status];

  const isConfigured = result.isConfigured;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl overflow-hidden"
      style={{
        border: "1px solid var(--border)",
        background: "var(--bg-subtle)",
      }}
    >
      {/* Banda de color del curso */}
      <div
        className="h-1.5"
        style={{ background: course.color }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {/* Dot de estado */}
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: statusColor }}
              />
              <span
                className="text-[10px] uppercase tracking-widest"
                style={{
                  color: statusColor,
                  fontFamily: "var(--font-dm-mono)",
                }}
              >
                {statusLabel}
              </span>
            </div>
            <h3
              className="text-base leading-tight"
              style={{
                fontFamily: "var(--font-playfair)",
                color: "var(--text-primary)",
              }}
            >
              {course.name}
            </h3>
            <p
              className="text-xs mt-0.5"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-dm-mono)",
              }}
            >
              {course.credits} crédito{course.credits !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Acciones */}
          <div className="flex gap-1">
            {onConfigure && (
              <button
                onClick={onConfigure}
                className="p-1.5 rounded-md transition-colors"
                style={{
                  color: "var(--text-muted)",
                  background: "transparent",
                }}
                title="Configurar evaluaciones"
              >
                <Settings size={14} />
              </button>
            )}
            {isConfigured && (
              <Link
                href={`/notas/${course.id}`}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* Métricas (solo si está configurado) */}
        {isConfigured ? (
          <div className="grid grid-cols-3 gap-2">
            <MetricItem
              label="Actual"
              value={formatGrade(result.currentGrade)}
              highlight={result.currentGrade >= 10.5}
            />
            <MetricItem
              label="Máx. alcanz."
              value={formatGrade(result.maxAchievableGrade)}
            />
            <MetricItem
              label="Necesita"
              value={
                result.pendingCount > 0
                  ? formatGrade(result.neededGradeAverage)
                  : "—"
              }
              danger={result.neededGradeAverage > 15}
            />
          </div>
        ) : (
          // No configurado — indicador de progreso de pesos
          <div>
            <div className="flex justify-between text-xs mb-1.5"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
              <span>Pesos configurados</span>
              <span>{result.totalWeight.toFixed(0)}% / 100%</span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--bg-muted)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(result.totalWeight, 100)}%`,
                  background: result.totalWeight > 100 ? "#dc2626" : "#d97706",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MetricItem({
  label,
  value,
  highlight = false,
  danger = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  const color = danger
    ? "#ea580c"
    : highlight
    ? "#16a34a"
    : "var(--text-primary)";

  return (
    <div
      className="px-2 py-2 rounded-lg text-center"
      style={{ background: "var(--bg-muted)" }}
    >
      <p
        className="text-[10px] uppercase tracking-wider mb-0.5"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}
      >
        {label}
      </p>
      <p
        className="text-lg font-medium leading-none"
        style={{ color, fontFamily: "var(--font-dm-mono)" }}
      >
        {value}
      </p>
    </div>
  );
}
