import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { evaluations, grades } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const EvaluationSchema = z.object({
  courseId: z.string().uuid(),
  name: z.string().min(1).max(100),
  weight: z.number().min(0.1).max(100),
  order: z.number().int().min(0).optional(),
});

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET /api/evaluations?courseId=xxx
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId requerido" }, { status: 400 });

  const evals = await db.query.evaluations.findMany({
    where: and(
      eq(evaluations.courseId, courseId),
      eq(evaluations.userId, user.id)
    ),
    with: { grade: true },
    orderBy: (e, { asc }) => [asc(e.order), asc(e.createdAt)],
  });

  return NextResponse.json(evals);
}

// POST /api/evaluations — crear evaluación
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = EvaluationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [evaluation] = await db
    .insert(evaluations)
    .values({ ...parsed.data, userId: user.id })
    .returning();

  return NextResponse.json(evaluation, { status: 201 });
}

// PUT /api/evaluations — actualizar evaluación
export async function PUT(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { id, name, weight, order } = body;

  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const [updated] = await db
    .update(evaluations)
    .set({
      name,
      weight,
      order,
      updatedAt: new Date(),
    })
    .where(and(eq(evaluations.id, id), eq(evaluations.userId, user.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  return NextResponse.json(updated);
}

// DELETE /api/evaluations?id=xxx
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  // Eliminar la nota asociada si existe (cascade lo hace, pero por claridad)
  await db.delete(grades).where(eq(grades.evaluationId, id));
  await db
    .delete(evaluations)
    .where(and(eq(evaluations.id, id), eq(evaluations.userId, user.id)));

  return NextResponse.json({ ok: true });
}
