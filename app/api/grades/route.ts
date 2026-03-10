import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { grades } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { isValidGrade } from "@/lib/engine/grades";

const GradeSchema = z.object({
  evaluationId: z.string().uuid(),
  courseId: z.string().uuid(),
  value: z.number().min(0).max(20),
});

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// POST /api/grades — insertar o actualizar nota (upsert)
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = GradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!isValidGrade(parsed.data.value)) {
    return NextResponse.json(
      { error: "Nota inválida. Debe estar entre 0 y 20." },
      { status: 400 }
    );
  }

  const [grade] = await db
    .insert(grades)
    .values({ ...parsed.data, userId: user.id })
    .onConflictDoUpdate({
      target: grades.evaluationId,
      set: {
        value: parsed.data.value,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json(grade, { status: 201 });
}

// DELETE /api/grades?evaluationId=xxx — eliminar nota
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const evaluationId = req.nextUrl.searchParams.get("evaluationId");
  if (!evaluationId) return NextResponse.json({ error: "evaluationId requerido" }, { status: 400 });

  await db
    .delete(grades)
    .where(
      and(
        eq(grades.evaluationId, evaluationId),
        eq(grades.userId, user.id)
      )
    );

  return NextResponse.json({ ok: true });
}
