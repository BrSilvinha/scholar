/**
 * Seed script — crea el perfil de Jhamir con ciclo, cursos y horario.
 * BORRA los datos existentes antes de recrear.
 * Uso: npx tsx scripts/seed.ts
 */

import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, cycles, courses, scheduleBlocks } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// Slots de 50 min desde las 08:00
// 0=08:00  1=08:50  2=09:40  3=10:30  4=11:20  5=12:10
// 6=13:00  7=13:50  8=14:40  9=15:30  10=16:20 11=17:10
// 12=18:00 13=18:50 14=19:40 15=20:30 16=21:20 17=22:10

async function seed() {
  console.log("🔐 Verificando usuario en Supabase Auth...");
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

  // ── 1. Borrar datos existentes (cascade automático) ───────────────
  console.log("🗑️  Borrando datos anteriores...");
  await db.delete(cycles).where(eq(cycles.userId, userId));
  console.log("✅ Datos anteriores eliminados");

  // ── 2. Perfil en tabla users ───────────────────────────────────────
  await db
    .insert(users)
    .values({
      id: userId,
      email: "sbalderajhamira@uss.edu.pe",
      fullName: "Jhamir Alexander Silva Baldera",
      career: "Ingeniería de Sistemas",
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { fullName: "Jhamir Alexander Silva Baldera" },
    });
  console.log("✅ Perfil actualizado");

  // ── 3. Ciclo 10 — 2026-I ──────────────────────────────────────────
  const [cycle] = await db
    .insert(cycles)
    .values({
      userId,
      name: "Ciclo 10 — 2026-I",
      cycleNumber: 10,
      semester: "2026-I",
      endDate: new Date("2026-07-31T23:59:59Z"),
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
          color: "#5b1f8a",
          professor: "PALACIOS ORMEÑO JULIO CÉSAR",
          room: "Laboratorio cómputo 12",
        },
        {
          cycleId: cycle.id,
          userId,
          name: "INVESTIGACIÓN II",
          credits: 4,
          color: "#7928a8",
          professor: "MEJIA CABRERA HEBER IVAN",
          room: "Clases Virtuales",
        },
        {
          cycleId: cycle.id,
          userId,
          name: "PRÁCTICAS PRE PROFESIONALES",
          credits: 1,
          color: "#3d1560",
          professor: "OLANO PAZ CARLOS OMAR",
          room: "Laboratorio cómputo 04",
        },
        {
          cycleId: cycle.id,
          userId,
          name: "TÓPICOS AVANZADOS EN ING. DE SISTEMAS",
          credits: 4,
          color: "#a8d400",
          professor: "CALDAS NUÑEZ JESUS MANUEL",
          room: "Clases Virtuales",
        },
        {
          cycleId: cycle.id,
          userId,
          name: "TRABAJO DE INVESTIGACIÓN",
          credits: 1,
          color: "#6d259a",
          professor: "MEJIA CABRERA HEBER IVAN",
          room: "Clases Virtuales",
        },
      ])
      .returning();
  console.log("✅ 5 cursos creados");

  // ── 5. Bloques de horario ─────────────────────────────────────────
  await db.insert(scheduleBlocks).values([
    // AUDITORÍA — Miércoles 08:00–09:40
    { courseId: auditoria.id, userId, dayOfWeek: "miercoles", startSlot: 0, endSlot: 2, room: "Laboratorio cómputo 12" },
    // INVESTIGACIÓN II — Miércoles 14:40–16:20 y 16:20–19:40
    { courseId: investigacionII.id, userId, dayOfWeek: "miercoles", startSlot: 8, endSlot: 10, room: "Clases Virtuales" },
    { courseId: investigacionII.id, userId, dayOfWeek: "miercoles", startSlot: 10, endSlot: 13, room: "Clases Virtuales" },
    // PRÁCTICAS — Martes 17:10–20:30 y 20:30–22:10
    { courseId: practicas.id, userId, dayOfWeek: "martes", startSlot: 11, endSlot: 15, room: "Laboratorio cómputo 04" },
    { courseId: practicas.id, userId, dayOfWeek: "martes", startSlot: 15, endSlot: 17, room: "Laboratorio cómputo 04" },
    // TÓPICOS — Sábado 08:00–11:20
    { courseId: topicos.id, userId, dayOfWeek: "sabado", startSlot: 0, endSlot: 4, room: "Clases Virtuales" },
    // TRABAJO INV. — Miércoles 13:00–14:40
    { courseId: trabajoInv.id, userId, dayOfWeek: "miercoles", startSlot: 6, endSlot: 8, room: "Clases Virtuales" },
  ]);
  console.log("✅ Horario creado");

  await client.end();
  console.log("\n🎉 Seed completado!");
  console.log("   Email:    sbalderajhamira@uss.edu.pe");
  console.log("   Password: 71749437Js");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
