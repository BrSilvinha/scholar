import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  uuid,
  index,
  uniqueIndex,
  check,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const courseStatusEnum = pgEnum("course_status", [
  "OCULTO",
  "EN_RIESGO",
  "SEGURO",
  "CRITICO",
  "JALADO",
  "APROBADO",
]);

export const taskTypeEnum = pgEnum("task_type", [
  "examen",
  "entrega",
  "laboratorio",
  "otro",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pendiente",
  "completada",
  "cancelada",
]);

export const dayOfWeekEnum = pgEnum("day_of_week", [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
]);

// ─── users ────────────────────────────────────────────────────────────────────
// Sincronizado con auth.users de Supabase.
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // mismo id que auth.users
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull().default(""),
  career: text("career").notNull().default(""),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── cycles ───────────────────────────────────────────────────────────────────
export const cycles = pgTable("cycles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // ej: "Ciclo 10 — 2025-I"
  cycleNumber: integer("cycle_number").notNull().default(10),
  semester: text("semester").notNull().default("2025-I"),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  isCurrent: boolean("is_current").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── courses ──────────────────────────────────────────────────────────────────
export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => cycles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    credits: integer("credits").notNull().default(3),
    color: text("color").notNull().default("#6366f1"), // hex color
    professor: text("professor"),
    room: text("room"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("courses_cycle_idx").on(t.cycleId)]
);

// ─── scheduleBlocks ───────────────────────────────────────────────────────────
// Un curso puede tener múltiples bloques por semana (lunes + miércoles, etc.)
export const scheduleBlocks = pgTable(
  "schedule_blocks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
    // Slots de 50 min. slot 0 = 08:00, slot 1 = 08:50, etc.
    startSlot: integer("start_slot").notNull(), // 0–17
    endSlot: integer("end_slot").notNull(),     // 0–17, must be > startSlot
    room: text("room"),
    section: text("section"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("schedule_blocks_course_idx").on(t.courseId),
    index("schedule_blocks_user_day_idx").on(t.userId, t.dayOfWeek),
  ]
);

// ─── evaluations ──────────────────────────────────────────────────────────────
export const evaluations = pgTable(
  "evaluations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),       // ej: "Parcial 1"
    weight: real("weight").notNull(),   // porcentaje: 0.0 – 100.0
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("evaluations_course_idx").on(t.courseId)]
);

// ─── grades ───────────────────────────────────────────────────────────────────
// Una nota por evaluación. Si no existe la fila, la evaluación no tiene nota.
export const grades = pgTable(
  "grades",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => evaluations.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: real("value").notNull(), // 0.0 – 20.0
    enteredAt: timestamp("entered_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("grades_evaluation_unique").on(t.evaluationId),
    index("grades_course_idx").on(t.courseId),
  ]
);

// ─── tasks ────────────────────────────────────────────────────────────────────
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .references(() => courses.id, { onDelete: "set null" }),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => cycles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    type: taskTypeEnum("type").notNull().default("otro"),
    status: taskStatusEnum("status").notNull().default("pendiente"),
    // Notificaciones programadas
    emailNotificationSentAt: timestamp("email_notification_sent_at", {
      withTimezone: true,
    }),
    pushNotificationSentAt: timestamp("push_notification_sent_at", {
      withTimezone: true,
    }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("tasks_user_idx").on(t.userId),
    index("tasks_due_date_idx").on(t.dueDate),
    index("tasks_cycle_idx").on(t.cycleId),
  ]
);

// ─── pushSubscriptions ────────────────────────────────────────────────────────
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("push_subscriptions_endpoint_unique").on(t.endpoint),
    index("push_subscriptions_user_idx").on(t.userId),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  cycles: many(cycles),
  courses: many(courses),
  tasks: many(tasks),
  pushSubscriptions: many(pushSubscriptions),
}));

export const cyclesRelations = relations(cycles, ({ one, many }) => ({
  user: one(users, { fields: [cycles.userId], references: [users.id] }),
  courses: many(courses),
  tasks: many(tasks),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  cycle: one(cycles, { fields: [courses.cycleId], references: [cycles.id] }),
  user: one(users, { fields: [courses.userId], references: [users.id] }),
  scheduleBlocks: many(scheduleBlocks),
  evaluations: many(evaluations),
  grades: many(grades),
  tasks: many(tasks),
}));

export const scheduleBlocksRelations = relations(scheduleBlocks, ({ one }) => ({
  course: one(courses, {
    fields: [scheduleBlocks.courseId],
    references: [courses.id],
  }),
}));

export const evaluationsRelations = relations(evaluations, ({ one, many }) => ({
  course: one(courses, {
    fields: [evaluations.courseId],
    references: [courses.id],
  }),
  grade: many(grades),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  evaluation: one(evaluations, {
    fields: [grades.evaluationId],
    references: [evaluations.id],
  }),
  course: one(courses, {
    fields: [grades.courseId],
    references: [courses.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  course: one(courses, { fields: [tasks.courseId], references: [courses.id] }),
  cycle: one(cycles, { fields: [tasks.cycleId], references: [cycles.id] }),
}));

export const pushSubscriptionsRelations = relations(
  pushSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [pushSubscriptions.userId],
      references: [users.id],
    }),
  })
);

// ─── TypeScript types exportados ──────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Cycle = typeof cycles.$inferSelect;
export type NewCycle = typeof cycles.$inferInsert;

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;

export type ScheduleBlock = typeof scheduleBlocks.$inferSelect;
export type NewScheduleBlock = typeof scheduleBlocks.$inferInsert;

export type Evaluation = typeof evaluations.$inferSelect;
export type NewEvaluation = typeof evaluations.$inferInsert;

export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;

// ─── Tipos compuestos para la UI ──────────────────────────────────────────────

// Drizzle ORM retorna array para relaciones many().
// Acceder con: e.grade[0] ?? null
export type EvaluationWithGrade = Evaluation & {
  grade: Grade[];
};

export type CourseWithEvaluations = Course & {
  evaluations: EvaluationWithGrade[];
  scheduleBlocks: ScheduleBlock[];
};

export type TaskWithCourse = Task & {
  course: Course | null;
};

export type CourseStatus =
  | "OCULTO"
  | "APROBADO"
  | "SEGURO"
  | "EN_RIESGO"
  | "CRITICO"
  | "JALADO";

export type DayOfWeek =
  | "lunes"
  | "martes"
  | "miercoles"
  | "jueves"
  | "viernes"
  | "sabado"
  | "domingo";
