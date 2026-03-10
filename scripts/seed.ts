/**
 * Seed script — crea el perfil de Jhamira con ciclo, cursos y horario.
 * Uso: npx tsx scripts/seed.ts
 */

import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, cycles, courses, scheduleBlocks } from "../lib/db/schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// Slots: 0=08:00, 1=08:50, 2=09:40, 3=10:30, 4=11:20, 5=12:10,
//        6=13:00, 7=13:50, 8=14:40, 9=15:30, 10=16:20, 11=17:10,
//        12=18:00, 13=18:50, 14=19:40, 15=20:30, 16=21:20, 17=22:10

async function seed() {
  // ── 1. Crear usuario en Supabase Auth ─────────────────────────────
  console.log("🔐 Creando usuario en Supabase Auth...");
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: "sbalderajhamira@uss.edu.pe",
      password: "71749437Js",
      email_confirm: true,
    });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      console.log("⚠️  Usuario ya existe en Auth, obteniendo ID...");
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existing = listData?.users.find(
        (u) => u.email === "sbalderajhamira@uss.edu.pe"
      );
      if (!existing) {
        console.error("No se pudo obtener el usuario existente");
        process.exit(1);
      }
      return runSeed(existing.id);
    }
    console.error("Error Auth:", authError.message);
    process.exit(1);
  }

  await runSeed(authData.user.id);
}

async function runSeed(userId: string) {
  console.log("✅ User ID:", userId);

  // ── 2. Perfil en tabla users ───────────────────────────────────────
  await db
    .insert(users)
    .values({
      id: userId,
      email: "sbalderajhamira@uss.edu.pe",
      fullName: "Jhamira Baldera",
      career: "Ingeniería de Sistemas",
    })
    .onConflictDoNothing();
  console.log("✅ Perfil creado");

  // ── 3. Ciclo 10 ───────────────────────────────────────────────────
  const [cycle] = await db
    .insert(cycles)
    .values({
      userId,
      name: "Ciclo 10 — 2025-I",
      cycleNumber: 10,
      semester: "2025-I",
      endDate: new Date("2025-07-31T23:59:59Z"),
      isCurrent: true,
    })
    .returning();
  console.log("✅ Ciclo creado");

  // ── 4. Cursos ─────────────────────────────────────────────────────
  const [auditoria, investigacionII, practicas, topicos, trabajoInv] =
    await db
      .insert(courses)
      .values([
        {
          cycleId: cycle.id,
          userId,
          name: "AUDITORÍA DE TECNOLOGÍAS DE INFORMACIÓN",
          credits: 3,
          color: "#5b21b6", // USS purple
          professor: "PALACIOS ORMEÑO JULIO CÉSAR",
          room: "Laboratorio cómputo 12",
        },
        {
          cycleId: cycle.id,
          userId,
          name: "INVESTIGACIÓN II",
          credits: 4,
          color: "#7c3aed", // purple claro
          professor: "MEJIA CABRERA HEBER IVAN",
          room: "Clases Virtuales",
        },
        {
          cycleId: cycle.id,
          userId,
          name: "PRÁCTICAS PRE PROFESIONALES",
          credits: 1,
          color: "#4f46e5", // índigo
          professor: "OLANO PAZ CARLOS OMAR",
          room: "Laboratorio cómputo 04",
        },
        {
          cycleId: cycle.id,
          userId,
          name: "TÓPICOS AVANZADOS EN INGENIERÍA DE SISTEMAS",
          credits: 4,
          color: "#84cc16", // lime USS
          professor: "CALDAS NUÑEZ JESUS MANUEL",
          room: "Clases Virtuales",
        },
        {
          cycleId: cycle.id,
          userId,
          name: "TRABAJO DE INVESTIGACIÓN",
          credits: 1,
          color: "#9333ea", // violeta
          professor: "MEJIA CABRERA HEBER IVAN",
          room: "Clases Virtuales",
        },
      ])
      .returning();
  console.log("✅ 5 cursos creados");

  // ── 5. Bloques de horario ─────────────────────────────────────────
  await db.insert(scheduleBlocks).values([
    // AUDITORÍA — Miércoles 08:00–09:40 (slots 0–1)
    { courseId: auditoria.id, userId, dayOfWeek: "miercoles", startSlot: 0, endSlot: 1, room: "Laboratorio cómputo 12" },
    // AUDITORÍA — Miércoles 09:40–11:20 (slots 2–3)
    { courseId: auditoria.id, userId, dayOfWeek: "miercoles", startSlot: 2, endSlot: 3, room: "Laboratorio cómputo 12" },

    // INVESTIGACIÓN II — Miércoles 14:40–16:20 (slots 8–9)
    { courseId: investigacionII.id, userId, dayOfWeek: "miercoles", startSlot: 8, endSlot: 9, room: "Clases Virtuales" },
    // INVESTIGACIÓN II — Miércoles 16:20–19:40 (slots 10–13)
    { courseId: investigacionII.id, userId, dayOfWeek: "miercoles", startSlot: 10, endSlot: 13, room: "Clases Virtuales" },

    // PRÁCTICAS — Martes 17:10–20:30 (slots 11–14)
    { courseId: practicas.id, userId, dayOfWeek: "martes", startSlot: 11, endSlot: 14, room: "Laboratorio cómputo 04" },
    // PRÁCTICAS — Martes 20:30–22:10 (slots 15–16)
    { courseId: practicas.id, userId, dayOfWeek: "martes", startSlot: 15, endSlot: 16, room: "Laboratorio cómputo 04" },

    // TÓPICOS — Sábado 08:00–11:20 (slots 0–3)
    { courseId: topicos.id, userId, dayOfWeek: "sabado", startSlot: 0, endSlot: 3, room: "Clases Virtuales" },

    // TRABAJO DE INVESTIGACIÓN — Miércoles 13:00–14:40 (slots 6–7)
    { courseId: trabajoInv.id, userId, dayOfWeek: "miercoles", startSlot: 6, endSlot: 7, room: "Clases Virtuales" },
  ]);
  console.log("✅ Horario creado");

  await client.end();
  console.log("\n🎉 Seed completado! Ya puedes iniciar sesión con:");
  console.log("   Email:    sbalderajhamira@uss.edu.pe");
  console.log("   Password: 71749437Js");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
