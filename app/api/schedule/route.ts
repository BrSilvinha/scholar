import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scheduleBlocks } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const BlockSchema = z.object({
  courseId: z.string().uuid(),
  dayOfWeek: z.enum(["lunes","martes","miercoles","jueves","viernes","sabado","domingo"]),
  startSlot: z.number().int().min(0).max(17),
  endSlot: z.number().int().min(0).max(17),
  room: z.string().optional().nullable(),
});

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET /api/schedule — todos los bloques del usuario
export async function GET(_req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const blocks = await db.query.scheduleBlocks.findMany({
    where: eq(scheduleBlocks.userId, user.id),
    with: { course: true },
    orderBy: (b, { asc }) => [asc(b.dayOfWeek), asc(b.startSlot)],
  });

  return NextResponse.json(blocks);
}

// POST /api/schedule — crear bloque
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = BlockSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.endSlot <= parsed.data.startSlot) {
    return NextResponse.json({ error: "endSlot debe ser mayor que startSlot" }, { status: 400 });
  }

  const [block] = await db
    .insert(scheduleBlocks)
    .values({ ...parsed.data, userId: user.id })
    .returning();

  return NextResponse.json(block, { status: 201 });
}

// PUT /api/schedule — mover bloque (drag & drop)
export async function PUT(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, dayOfWeek, startSlot, endSlot, room } = await req.json();

  const [updated] = await db
    .update(scheduleBlocks)
    .set({ dayOfWeek, startSlot, endSlot, room })
    .where(and(eq(scheduleBlocks.id, id), eq(scheduleBlocks.userId, user.id)))
    .returning();

  return NextResponse.json(updated);
}

// DELETE /api/schedule?id=xxx
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  await db
    .delete(scheduleBlocks)
    .where(and(eq(scheduleBlocks.id, id), eq(scheduleBlocks.userId, user.id)));

  return NextResponse.json({ ok: true });
}
