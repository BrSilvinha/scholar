export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { scheduleBlocks, courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { HorarioClient } from "./HorarioClient";

export const metadata = { title: "Horario" };

export default async function HorarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const blocks = await db.query.scheduleBlocks.findMany({
    where: eq(scheduleBlocks.userId, user.id),
    with: { course: true },
  });

  const allCourses = await db.query.courses.findMany({
    where: eq(courses.userId, user.id),
    orderBy: (c, { asc }) => [asc(c.name)],
  });

  return <HorarioClient initialBlocks={blocks} courses={allCourses} />;
}
