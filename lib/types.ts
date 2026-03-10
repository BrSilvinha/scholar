// Tipos planos para uso en el cliente (sin dependencia de drizzle-orm)
// Deben mantenerse sincronizados con lib/db/schema.ts

export type DayOfWeek =
  | "lunes" | "martes" | "miercoles" | "jueves"
  | "viernes" | "sabado" | "domingo";

export type CourseStatus =
  | "OCULTO" | "EN_RIESGO" | "SEGURO" | "CRITICO" | "JALADO" | "APROBADO";

export type TaskType = "examen" | "entrega" | "laboratorio" | "otro";
export type TaskStatus = "pendiente" | "completada" | "cancelada";

export interface Cycle {
  id: string;
  userId: string;
  name: string;
  cycleNumber: number;
  semester: string;
  endDate: Date;
  isCurrent: boolean;
  createdAt: Date;
}

export interface Course {
  id: string;
  cycleId: string;
  userId: string;
  name: string;
  credits: number;
  color: string;
  professor: string | null;
  room: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleBlock {
  id: string;
  courseId: string;
  userId: string;
  dayOfWeek: DayOfWeek;
  startSlot: number;
  endSlot: number;
  room: string | null;
  section: string | null;
  createdAt: Date;
}

export interface Evaluation {
  id: string;
  courseId: string;
  userId: string;
  name: string;
  weight: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Grade {
  id: string;
  evaluationId: string;
  courseId: string;
  userId: string;
  value: number;
  enteredAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  userId: string;
  courseId: string | null;
  cycleId: string;
  title: string;
  description: string | null;
  dueDate: Date;
  type: TaskType;
  status: TaskStatus;
  emailNotificationSentAt: Date | null;
  pushNotificationSentAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluationWithGrade extends Evaluation {
  grade: Grade[];
}

export interface CourseWithEvaluations extends Course {
  evaluations: EvaluationWithGrade[];
  scheduleBlocks: ScheduleBlock[];
}
