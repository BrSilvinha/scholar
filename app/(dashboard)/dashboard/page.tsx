export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { cycles, courses, tasks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Ciclo actual
  const cycle = await db.query.cycles.findFirst({
    where: and(eq(cycles.userId, user.id), eq(cycles.isCurrent, true)),
  });

  if (!cycle) redirect("/register");

  // Cursos con evaluaciones y notas
  const coursesData = await db.query.courses.findMany({
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

  // Tareas de los próximos 7 días
  const now = new Date();
  const in7days = new Date();
  in7days.setDate(now.getDate() + 7);

  const upcomingTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, user.id),
      eq(tasks.status, "pendiente")
    ),
    with: { course: true },
    orderBy: (t, { asc }) => [asc(t.dueDate)],
  });

  const tasksNext7 = upcomingTasks.filter((t) => {
    const due = new Date(t.dueDate);
    return due >= now && due <= in7days;
  });

  // Datos del usuario
  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <DashboardClient
      cycle={cycle}
      courses={coursesData}
      upcomingTasks={tasksNext7}
      userName={profile?.full_name ?? user.email ?? ""}
    />
  );
}
