import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const TaskSchema = z.object({
  cycleId: z.string().uuid(),
  courseId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  dueDate: z.string().datetime(),
  type: z.enum(["examen", "entrega", "laboratorio", "otro"]),
});

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET /api/tasks?cycleId=xxx
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const data = await db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, user.id),
      eq(tasks.status, "pendiente")
    ),
    with: { course: true },
    orderBy: (t, { asc }) => [asc(t.dueDate)],
  });

  return NextResponse.json(data);
}

// POST /api/tasks — crear tarea
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = TaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [task] = await db
    .insert(tasks)
    .values({
      ...parsed.data,
      userId: user.id,
      dueDate: new Date(parsed.data.dueDate),
    })
    .returning();

  return NextResponse.json(task, { status: 201 });
}

// PUT /api/tasks — actualizar tarea
export async function PUT(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { id, status, title, description, dueDate, type, courseId } = body;

  const [updated] = await db
    .update(tasks)
    .set({
      status,
      title,
      description,
      type,
      courseId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      completedAt: status === "completada" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning();

  return NextResponse.json(updated);
}

// DELETE /api/tasks?id=xxx
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  return NextResponse.json({ ok: true });
}
