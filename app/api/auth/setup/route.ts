import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, cycles, courses, scheduleBlocks } from "@/lib/db/schema";

// Cursos precargados del Ciclo 10 — 2025-I
const PRECARGA_CURSOS = [
  {
    name: "Auditoría de TI",
    credits: 3,
    color: "#6366f1",
    room: "Lab. Cómputo 12",
    schedule: [{ day: "miercoles" as const, startSlot: 0, endSlot: 3 }], // 08:00–11:20
  },
  {
    name: "Investigación II",
    credits: 4,
    color: "#0891b2",
    room: "Virtual",
    schedule: [{ day: "miercoles" as const, startSlot: 8, endSlot: 13 }], // 14:40–19:40
  },
  {
    name: "Prácticas Pre-Profesionales",
    credits: 8,
    color: "#059669",
    room: "Lab. Cómputo 04",
    schedule: [{ day: "martes" as const, startSlot: 11, endSlot: 17 }], // 17:10–22:10
  },
  {
    name: "Tópicos Avanzados",
    credits: 4,
    color: "#d97706",
    room: "Virtual",
    schedule: [{ day: "sabado" as const, startSlot: 0, endSlot: 3 }], // 08:00–11:20
  },
  {
    name: "Trabajo de Investigación",
    credits: 1,
    color: "#9333ea",
    room: "Virtual",
    schedule: [{ day: "miercoles" as const, startSlot: 6, endSlot: 8 }], // 13:00–14:40
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, fullName, career, cycleEndDate } = body;

    if (!userId || !email || !fullName || !career || !cycleEndDate) {
      return NextResponse.json(
        { error: "Faltan campos requeridos." },
        { status: 400 }
      );
    }

    // 1. Crear usuario en nuestra tabla
    await db
      .insert(users)
      .values({ id: userId, email, fullName, career })
      .onConflictDoNothing();

    // 2. Crear el ciclo actual
    const [cycle] = await db
      .insert(cycles)
      .values({
        userId,
        name: "Ciclo 10 — 2025-I",
        cycleNumber: 10,
        semester: "2025-I",
        endDate: new Date(cycleEndDate),
        isCurrent: true,
      })
      .returning();

    // 3. Crear cursos precargados con sus bloques de horario
    for (const curso of PRECARGA_CURSOS) {
      const [course] = await db
        .insert(courses)
        .values({
          cycleId: cycle.id,
          userId,
          name: curso.name,
          credits: curso.credits,
          color: curso.color,
          room: curso.room,
        })
        .returning();

      // Insertar bloques de horario
      for (const bloque of curso.schedule) {
        await db.insert(scheduleBlocks).values({
          courseId: course.id,
          userId,
          dayOfWeek: bloque.day,
          startSlot: bloque.startSlot,
          endSlot: bloque.endSlot,
          room: curso.room,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[setup]", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
