export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { cycles, courses, tasks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PDFClient } from "./PDFClient";

export const metadata = { title: "Resumen de Ciclo" };

export default async function PDFPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cycle = await db.query.cycles.findFirst({
    where: and(eq(cycles.userId, user.id), eq(cycles.isCurrent, true)),
  });

  if (!cycle) redirect("/register");

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

  const completedTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, user.id),
      eq(tasks.cycleId, cycle.id),
      eq(tasks.status, "completada")
    ),
    with: { course: true },
    orderBy: (t, { asc }) => [asc(t.dueDate)],
  });

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, career")
    .eq("id", user.id)
    .single();

  return (
    <PDFClient
      cycle={cycle}
      courses={coursesData}
      completedTasks={completedTasks}
      userName={profile?.full_name ?? user.email ?? ""}
      career={profile?.career ?? ""}
    />
  );
}
