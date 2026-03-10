export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { CourseDetailClient } from "./CourseDetailClient";

interface PageProps {
  params: Promise<{ cursoId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { cursoId } = await params;
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, cursoId),
  });
  return { title: course?.name ?? "Curso" };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { cursoId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, cursoId), eq(courses.userId, user.id)),
    with: {
      evaluations: {
        with: { grade: true },
        orderBy: (e, { asc }) => [asc(e.order), asc(e.createdAt)],
      },
      scheduleBlocks: true,
    },
  });

  if (!course) notFound();

  return <CourseDetailClient course={course} />;
}
