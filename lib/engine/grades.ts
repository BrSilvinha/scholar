/**
 * Motor de cálculo de notas — Sistema vigesimal peruano (0–20)
 * Nota mínima aprobatoria: 10.5
 *
 * Función pura: no tiene efectos secundarios, solo recibe datos y devuelve resultados.
 * Se puede testear de forma independiente del framework.
 */

export const PASSING_GRADE = 10.5;
export const MAX_GRADE = 20;
export const MIN_GRADE = 0;

// ─── Tipos de entrada ─────────────────────────────────────────────────────────

export interface EvaluationInput {
  id: string;
  name: string;
  weight: number;       // 0–100 (porcentaje)
  grade: number | null; // null = sin nota todavía
}

// ─── Tipos de salida ──────────────────────────────────────────────────────────

export type CourseStatus =
  | "OCULTO"      // Los pesos no suman 100%
  | "APROBADO"    // Nota actual >= 10.5 y no quedan evaluaciones
  | "SEGURO"      // Imposible reprobar aunque saque 0 en lo restante
  | "EN_RIESGO"   // Puede pasar pero depende de notas futuras
  | "CRITICO"     // Necesita más de 15 promedio en restantes
  | "JALADO";     // Nota máxima alcanzable < 10.5

export interface GradeEngineResult {
  status: CourseStatus;
  totalWeight: number;           // suma de pesos (para indicador UI)
  isConfigured: boolean;         // totalWeight === 100

  // Solo válidos cuando isConfigured === true
  currentGrade: number;          // suma(nota_i * peso_i / 100) de evaluaciones con nota
  maxAchievableGrade: number;    // currentGrade + suma(20 * peso_j / 100) de sin nota
  neededGradeAverage: number;    // promedio necesario en evaluaciones pendientes para pasar
  neededPerEvaluation: NeededGrade[]; // distribución proporcional por evaluación pendiente

  // Estadísticas
  completedCount: number;        // evaluaciones con nota
  pendingCount: number;          // evaluaciones sin nota
  completedWeight: number;       // peso acumulado de evaluaciones con nota
  pendingWeight: number;         // peso acumulado de evaluaciones sin nota
}

export interface NeededGrade {
  evaluationId: string;
  evaluationName: string;
  weight: number;
  neededGrade: number; // 0–20, puede ser > 20 si ya está jalado (se muestra como "imposible")
  isPossible: boolean; // neededGrade <= 20
}

// ─── Función principal ────────────────────────────────────────────────────────

export function calculateCourseGrades(
  evaluations: EvaluationInput[]
): GradeEngineResult {
  // 1. Validar que hay evaluaciones
  if (!evaluations || evaluations.length === 0) {
    return emptyResult();
  }

  // 2. Calcular total de pesos
  const totalWeight = evaluations.reduce((sum, e) => sum + e.weight, 0);
  const isConfigured = Math.abs(totalWeight - 100) < 0.01; // tolerancia de float

  // Siempre devolvemos totalWeight para el indicador de progreso
  if (!isConfigured) {
    return {
      ...emptyResult(),
      totalWeight,
      isConfigured: false,
    };
  }

  // 3. Separar evaluaciones con y sin nota
  const withGrade = evaluations.filter((e) => e.grade !== null);
  const withoutGrade = evaluations.filter((e) => e.grade === null);

  const completedWeight = withGrade.reduce((s, e) => s + e.weight, 0);
  const pendingWeight = withoutGrade.reduce((s, e) => s + e.weight, 0);

  // 4. Nota actual = suma(nota_i * peso_i / 100) de evaluaciones con nota
  const currentGrade = withGrade.reduce(
    (sum, e) => sum + (e.grade! * e.weight) / 100,
    0
  );

  // 5. Nota máxima alcanzable = currentGrade + suma(20 * peso_j / 100) de sin nota
  const maxFromPending = withoutGrade.reduce(
    (sum, e) => sum + (MAX_GRADE * e.weight) / 100,
    0
  );
  const maxAchievableGrade = currentGrade + maxFromPending;

  // 6. Nota necesaria en pendientes
  const gradeNeededFromPending = PASSING_GRADE - currentGrade;

  // Distribución proporcional de la nota necesaria entre evaluaciones pendientes
  const neededPerEvaluation: NeededGrade[] = withoutGrade.map((e) => {
    // La contribución proporcional de esta evaluación al peso pendiente total
    const proportion = pendingWeight > 0 ? e.weight / pendingWeight : 0;
    // La nota que necesita sacar para cubrir su parte proporcional
    const neededContribution = gradeNeededFromPending * proportion;
    // Convertir contribución a nota en escala 0–20
    const neededGrade =
      e.weight > 0 ? (neededContribution * 100) / e.weight : 0;

    return {
      evaluationId: e.id,
      evaluationName: e.name,
      weight: e.weight,
      neededGrade: Math.max(0, neededGrade),
      isPossible: neededGrade <= MAX_GRADE,
    };
  });

  // Promedio simple necesario (para el display del estado)
  const neededGradeAverage =
    withoutGrade.length > 0
      ? neededPerEvaluation.reduce((s, e) => s + e.neededGrade, 0) /
        withoutGrade.length
      : 0;

  // 7. Determinar estado
  const status = determineStatus({
    currentGrade,
    maxAchievableGrade,
    neededGradeAverage,
    withoutGrade,
    evaluations,
  });

  return {
    status,
    totalWeight,
    isConfigured: true,
    currentGrade: roundGrade(currentGrade),
    maxAchievableGrade: roundGrade(maxAchievableGrade),
    neededGradeAverage: roundGrade(neededGradeAverage),
    neededPerEvaluation,
    completedCount: withGrade.length,
    pendingCount: withoutGrade.length,
    completedWeight: roundGrade(completedWeight),
    pendingWeight: roundGrade(pendingWeight),
  };
}

// ─── Determinar estado del curso ──────────────────────────────────────────────

function determineStatus({
  currentGrade,
  maxAchievableGrade,
  neededGradeAverage,
  withoutGrade,
  evaluations,
}: {
  currentGrade: number;
  maxAchievableGrade: number;
  neededGradeAverage: number;
  withoutGrade: EvaluationInput[];
  evaluations: EvaluationInput[];
}): CourseStatus {
  const allCompleted = withoutGrade.length === 0;

  // APROBADO: nota final >= 10.5 y ya no quedan evaluaciones
  if (allCompleted && currentGrade >= PASSING_GRADE) {
    return "APROBADO";
  }

  // JALADO: nota máxima alcanzable < 10.5 (matemáticamente imposible aprobar)
  if (maxAchievableGrade < PASSING_GRADE) {
    return "JALADO";
  }

  // JALADO también: todas completadas y no pasó
  if (allCompleted && currentGrade < PASSING_GRADE) {
    return "JALADO";
  }

  // SEGURO: incluso sacando 0 en todo lo restante, ya pasó
  // Esto ocurre cuando currentGrade >= PASSING_GRADE y hay pendientes
  if (currentGrade >= PASSING_GRADE) {
    return "SEGURO";
  }

  // CRITICO: necesita más de 15 promedio en lo que queda
  if (neededGradeAverage > 15) {
    return "CRITICO";
  }

  // EN_RIESGO: puede pasar pero depende de notas futuras
  return "EN_RIESGO";
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function roundGrade(value: number): number {
  return Math.round(value * 100) / 100;
}

function emptyResult(): GradeEngineResult {
  return {
    status: "OCULTO",
    totalWeight: 0,
    isConfigured: false,
    currentGrade: 0,
    maxAchievableGrade: 0,
    neededGradeAverage: 0,
    neededPerEvaluation: [],
    completedCount: 0,
    pendingCount: 0,
    completedWeight: 0,
    pendingWeight: 0,
  };
}

// ─── Helpers para la UI ───────────────────────────────────────────────────────

export const STATUS_LABELS: Record<CourseStatus, string> = {
  OCULTO: "Sin configurar",
  APROBADO: "Aprobado",
  SEGURO: "Seguro",
  EN_RIESGO: "En riesgo",
  CRITICO: "Crítico",
  JALADO: "Jalado",
};

export const STATUS_COLORS: Record<CourseStatus, string> = {
  OCULTO: "#6b7280",
  APROBADO: "#16a34a",
  SEGURO: "#2563eb",
  EN_RIESGO: "#d97706",
  CRITICO: "#ea580c",
  JALADO: "#dc2626",
};

export const STATUS_BG: Record<CourseStatus, string> = {
  OCULTO: "bg-gray-100 dark:bg-gray-800",
  APROBADO: "bg-green-50 dark:bg-green-950",
  SEGURO: "bg-blue-50 dark:bg-blue-950",
  EN_RIESGO: "bg-amber-50 dark:bg-amber-950",
  CRITICO: "bg-orange-50 dark:bg-orange-950",
  JALADO: "bg-red-50 dark:bg-red-950",
};

/**
 * Calcula el promedio ponderado del ciclo completo.
 * Solo incluye cursos con estado APROBADO o JALADO (todos los cursos finalizados).
 */
export function calculateCycleGPA(
  courses: Array<{
    credits: number;
    finalGrade: number;
  }>
): number {
  if (courses.length === 0) return 0;
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  if (totalCredits === 0) return 0;
  const weightedSum = courses.reduce(
    (s, c) => s + c.finalGrade * c.credits,
    0
  );
  return roundGrade(weightedSum / totalCredits);
}

/**
 * Formatea una nota vigesimal para mostrar en pantalla.
 * Si es null, devuelve "—"
 */
export function formatGrade(grade: number | null): string {
  if (grade === null) return "—";
  return grade.toFixed(2);
}

/**
 * Valida si una nota es válida en el sistema vigesimal.
 */
export function isValidGrade(value: unknown): value is number {
  if (typeof value !== "number") return false;
  return value >= MIN_GRADE && value <= MAX_GRADE && !isNaN(value);
}

/**
 * Valida que los pesos de un conjunto de evaluaciones sumen 100%.
 */
export function validateWeights(weights: number[]): {
  total: number;
  isValid: boolean;
  remaining: number;
} {
  const total = weights.reduce((s, w) => s + w, 0);
  const isValid = Math.abs(total - 100) < 0.01;
  return {
    total: roundGrade(total),
    isValid,
    remaining: roundGrade(100 - total),
  };
}
