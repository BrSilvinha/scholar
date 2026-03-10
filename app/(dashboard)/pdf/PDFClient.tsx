"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Check, BookOpen, FlaskConical, Package, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell,
} from "recharts";
import type { Cycle, CourseWithEvaluations, Task, Course } from "@/lib/types";
import {
  calculateCourseGrades,
  calculateCycleGPA,
  STATUS_LABELS,
  STATUS_COLORS,
  formatGrade,
  type EvaluationInput,
} from "@/lib/engine/grades";
import { generateCyclePDF } from "@/lib/pdf/generatePDF";

type TaskWithCourse = Task & { course: Course | null };

interface PDFClientProps {
  cycle: Cycle;
  courses: CourseWithEvaluations[];
  completedTasks: TaskWithCourse[];
  userName: string;
  career: string;
}

const TASK_ICONS = {
  examen: BookOpen,
  entrega: Package,
  laboratorio: FlaskConical,
  otro: Calendar,
} as const;

export function PDFClient({
  cycle,
  courses,
  completedTasks,
  userName,
  career,
}: PDFClientProps) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Calcular resultados por curso
  const courseResults = courses.map((c) => {
    const inputs: EvaluationInput[] = c.evaluations.map((e) => ({
      id: e.id, name: e.name, weight: e.weight, grade: e.grade[0]?.value ?? null,
    }));
    const result = calculateCourseGrades(inputs);
    return { course: c, result };
  });

  // Promedio ponderado del ciclo (solo cursos con nota final)
  const finishedCourses = courseResults
    .filter((cr) => cr.result.status === "APROBADO" || cr.result.status === "JALADO")
    .map((cr) => ({
      credits: cr.course.credits,
      finalGrade: cr.result.currentGrade,
    }));

  const gpa = calculateCycleGPA(finishedCourses);

  const chartData = courseResults.map((cr) => ({
    name: cr.course.name.length > 14 ? cr.course.name.slice(0, 14) + "…" : cr.course.name,
    nota: cr.result.currentGrade,
    color: cr.course.color,
    status: cr.result.status,
  }));

  async function handleGenerate() {
    setGenerating(true);
    try {
      await generateCyclePDF({
        userName,
        career,
        cycleLabel: cycle.name,
        semester: cycle.semester,
        endDate: new Date(cycle.endDate),
        elementId: "pdf-content",
        filename: `Scholar_Ciclo${cycle.cycleNumber}_${cycle.semester.replace("-", "")}.pdf`,
      });
      setGenerated(true);
      setTimeout(() => setGenerated(false), 3000);
    } catch (err) {
      console.error("Error generando PDF:", err);
    }
    setGenerating(false);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
            Módulo 5
          </p>
          <h1 className="text-4xl" style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}>
            Resumen de Ciclo
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}>
            {cycle.name}
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
          style={{
            background: "var(--text-primary)",
            color: "var(--bg)",
            fontFamily: "var(--font-dm-mono)",
          }}
        >
          {generated ? (
            <><Check size={14} /> Descargado</>
          ) : generating ? (
            "Generando PDF..."
          ) : (
            <><Download size={14} /> Descargar PDF</>
          )}
        </button>
      </div>

      {/* Contenido capturado por html2canvas */}
      <div
        id="pdf-content"
        style={{
          background: "#fdfcf8",
          padding: "48px",
          fontFamily: "'Courier New', monospace",
        }}
      >
        {/* ── Portada ─────────────────────────────────────────────────────── */}
        <div
          style={{
            borderBottom: "2px solid #0f0e0c",
            paddingBottom: "32px",
            marginBottom: "32px",
          }}
        >
          <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#87836f", margin: "0 0 8px" }}>
            Scholar · Sistema Académico Personal
          </p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "36px", fontWeight: 400, color: "#0f0e0c", margin: "0 0 4px", lineHeight: 1.2 }}>
            {cycle.name}
          </h1>
          <p style={{ fontSize: "14px", color: "#625e52", margin: "0 0 24px" }}>
            {userName} · {career}
          </p>
          <div style={{ display: "flex", gap: "32px" }}>
            <div>
              <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#87836f", margin: "0 0 2px" }}>
                Fecha de egreso
              </p>
              <p style={{ fontSize: "14px", color: "#0f0e0c", margin: 0 }}>
                {format(new Date(cycle.endDate), "d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#87836f", margin: "0 0 2px" }}>
                Generado el
              </p>
              <p style={{ fontSize: "14px", color: "#0f0e0c", margin: 0 }}>
                {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
            {gpa > 0 && (
              <div>
                <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#87836f", margin: "0 0 2px" }}>
                  Promedio ponderado
                </p>
                <p style={{ fontSize: "24px", fontWeight: 600, color: gpa >= 10.5 ? "#16a34a" : "#dc2626", margin: 0 }}>
                  {gpa.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabla de cursos ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "20px", fontWeight: 400, color: "#0f0e0c", margin: "0 0 16px" }}>
            Cursos del ciclo
          </h2>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e4d9c0" }}>
                {["Curso", "Créditos", "Evaluaciones", "Nota Final", "Estado"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#87836f",
                    fontWeight: 400,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courseResults.map(({ course, result }, idx) => (
                <tr
                  key={course.id}
                  style={{
                    borderBottom: "1px solid #f0ead8",
                    background: idx % 2 === 0 ? "#fdfcf8" : "#f8f5ed",
                  }}
                >
                  <td style={{ padding: "10px 12px", color: "#0f0e0c", fontWeight: 500 }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: course.color, marginRight: 8 }} />
                    {course.name}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#454238" }}>{course.credits}</td>
                  <td style={{ padding: "10px 12px", color: "#454238" }}>{course.evaluations.length}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: result.currentGrade >= 10.5 ? "#16a34a" : "#dc2626" }}>
                    {result.isConfigured ? formatGrade(result.currentGrade) : "—"}
                  </td>
                  <td style={{ padding: "10px 12px", color: STATUS_COLORS[result.status] }}>
                    {STATUS_LABELS[result.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Gráfico de barras ────────────────────────────────────────────── */}
        {chartData.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "20px", fontWeight: 400, color: "#0f0e0c", margin: "0 0 16px" }}>
              Notas por curso
            </h2>
            <div style={{ background: "#f8f5ed", borderRadius: 12, padding: "24px", border: "1px solid #e4d9c0" }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4d9c0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "monospace", fill: "#87836f" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 20]} ticks={[0, 5, 10, 10.5, 15, 20]} tick={{ fontSize: 9, fontFamily: "monospace", fill: "#87836f" }} axisLine={false} tickLine={false} />
                  <Bar dataKey="nota" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.nota >= 10.5 ? "#16a34a" : "#dc2626"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Tareas completadas ───────────────────────────────────────────── */}
        {completedTasks.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "20px", fontWeight: 400, color: "#0f0e0c", margin: "0 0 16px" }}>
              Tareas completadas ({completedTasks.length})
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    background: "#f8f5ed",
                    border: "1px solid #e4d9c0",
                    borderRadius: 8,
                    padding: "10px 14px",
                  }}
                >
                  <p style={{ margin: "0 0 2px", fontSize: 13, color: "#0f0e0c", fontWeight: 500 }}>{task.title}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#87836f" }}>
                    {task.course?.name ?? "Sin curso"} · {task.type} · {format(new Date(task.dueDate), "d MMM", { locale: es })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer del PDF ───────────────────────────────────────────────── */}
        <div style={{ borderTop: "1px solid #e4d9c0", paddingTop: 20, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: "#aaa694", margin: 0 }}>
            Scholar · Sistema académico personal · Generado el {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
          <p style={{ fontSize: 11, color: "#ccc9bc", margin: "4px 0 0" }}>
            Fecha de egreso: {format(new Date(cycle.endDate), "d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
      </div>
    </div>
  );
}
