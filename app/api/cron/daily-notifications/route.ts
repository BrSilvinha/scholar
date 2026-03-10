import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, users, pushSubscriptions } from "@/lib/db/schema";
import { eq, and, isNull, gte, lte, ne } from "drizzle-orm";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { sendTaskReminderEmail } from "@/lib/email/resend";
import { sendPushNotification } from "@/lib/push/webpush";

// Este endpoint es llamado por el cron job de Vercel cada día a las 07:50
// Detecta tareas cuya fecha límite es exactamente en 3 días y envía notificaciones.

export async function GET(req: NextRequest) {
  // Verificar el header de autorización del cron de Vercel
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const targetDate = addDays(now, 3);
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  // Buscar tareas que vencen en 3 días exactos y aún no tienen notificación enviada
  const tasksDue = await db.query.tasks.findMany({
    where: and(
      ne(tasks.status, "completada"),
      ne(tasks.status, "cancelada"),
      gte(tasks.dueDate, dayStart),
      lte(tasks.dueDate, dayEnd),
      isNull(tasks.emailNotificationSentAt)
    ),
    with: {
      course: true,
      user: true,
    },
  });

  let emailsSent = 0;
  let pushSent = 0;
  let errors = 0;

  for (const task of tasksDue) {
    const taskUser = task.user as any;
    if (!taskUser) continue;

    // 1. Email via Resend
    try {
      await sendTaskReminderEmail({
        toEmail: taskUser.email,
        toName: taskUser.fullName || taskUser.email,
        taskTitle: task.title,
        courseName: task.course?.name ?? "Sin curso",
        taskType: task.type,
        dueDate: new Date(task.dueDate),
        daysLeft: 3,
      });

      // Marcar email enviado
      await db
        .update(tasks)
        .set({ emailNotificationSentAt: new Date() })
        .where(eq(tasks.id, task.id));

      emailsSent++;
    } catch {
      errors++;
    }

    // 2. Push notifications
    const subs = await db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, taskUser.id),
    });

    for (const sub of subs) {
      const success = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        {
          title: `Scholar — ${task.course?.name ?? "Tarea"}`,
          body: `${task.title} vence en 3 días`,
          icon: "/icons/icon-192.png",
          url: "/tareas",
        }
      );

      if (!success) {
        // Suscripción inválida — eliminar
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, sub.id));
      } else {
        pushSent++;
      }
    }

    // Marcar push enviado
    await db
      .update(tasks)
      .set({ pushNotificationSentAt: new Date() })
      .where(eq(tasks.id, task.id));
  }

  return NextResponse.json({
    processed: tasksDue.length,
    emailsSent,
    pushSent,
    errors,
    timestamp: now.toISOString(),
  });
}
