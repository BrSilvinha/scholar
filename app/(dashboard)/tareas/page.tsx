export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { tasks, courses, cycles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { TareasClient } from "./TareasClient";

export const metadata = { title: "Tareas" };

export default async function TareasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cycle = await db.query.cycles.findFirst({
    where: and(eq(cycles.userId, user.id), eq(cycles.isCurrent, true)),
  });

  if (!cycle) redirect("/register");

  const allTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, user.id),
      eq(tasks.cycleId, cycle.id)
    ),
    with: { course: true },
    orderBy: (t, { asc }) => [asc(t.dueDate)],
  });

  const allCourses = await db.query.courses.findMany({
    where: eq(courses.userId, user.id),
    orderBy: (c, { asc }) => [asc(c.name)],
  });

  return (
    <TareasClient
      tasks={allTasks}
      courses={allCourses}
      cycleId={cycle.id}
    />
  );
}
