export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { NotasDashboardClient } from "./NotasDashboardClient";

export const metadata = { title: "Notas" };

export default async function NotasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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

  return <NotasDashboardClient courses={coursesData} />;
}
