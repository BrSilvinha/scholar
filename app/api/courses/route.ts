import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, and } from "drizzle-orm";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET /api/courses — obtener todos los cursos del ciclo actual con evaluaciones
export async function GET(_req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const data = await db.query.courses.findMany({
    where: eq(courses.userId, user.id),
    with: {
      evaluations: {
        with: { grade: true },
        orderBy: (e, { asc }) => [asc(e.order), asc(e.createdAt)],
      },
      scheduleBlocks: true,
    },
    orderBy: (c, { asc }) => [asc(c.name)],
  });

  return NextResponse.json(data);
}

// POST /api/courses — crear nuevo curso
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { cycleId, name, credits, color, room, professor } = body;

  if (!cycleId || !name) {
    return NextResponse.json({ error: "cycleId y name son requeridos" }, { status: 400 });
  }

  const [course] = await db
    .insert(courses)
    .values({ cycleId, userId: user.id, name, credits: credits ?? 3, color: color ?? "#6366f1", room, professor })
    .returning();

  return NextResponse.json(course, { status: 201 });
}

// PUT /api/courses — actualizar curso
export async function PUT(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { id, name, credits, color, room, professor } = body;

  const [updated] = await db
    .update(courses)
    .set({ name, credits, color, room, professor, updatedAt: new Date() })
    .where(and(eq(courses.id, id), eq(courses.userId, user.id)))
    .returning();

  return NextResponse.json(updated);
}

// DELETE /api/courses?id=xxx
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  await db.delete(courses).where(and(eq(courses.id, id), eq(courses.userId, user.id)));

  return NextResponse.json({ ok: true });
}
