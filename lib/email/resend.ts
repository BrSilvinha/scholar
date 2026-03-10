import { Resend } from "resend";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface TaskReminderEmailData {
  toEmail: string;
  toName: string;
  taskTitle: string;
  courseName: string;
  taskType: "examen" | "entrega" | "laboratorio" | "otro";
  dueDate: Date;
  daysLeft: number;
}

const TYPE_LABELS: Record<string, string> = {
  examen: "Examen",
  entrega: "Entrega",
  laboratorio: "Laboratorio",
  otro: "Tarea",
};

export async function sendTaskReminderEmail(data: TaskReminderEmailData) {
  const {
    toEmail,
    toName,
    taskTitle,
    courseName,
    taskType,
    dueDate,
    daysLeft,
  } = data;

  const firstName = toName.split(" ")[0];
  const dueDateFormatted = format(dueDate, "EEEE d 'de' MMMM", { locale: es });
  const typeLabel = TYPE_LABELS[taskType] ?? "Tarea";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Scholar — Recordatorio</title>
</head>
<body style="margin:0;padding:0;background:#fdfcf8;font-family:'Courier New',monospace;">
  <div style="max-width:520px;margin:40px auto;background:#f8f5ed;border:1px solid #e4d9c0;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <div style="padding:32px 32px 24px;border-bottom:1px solid #e4d9c0;">
      <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#87836f;">
        Scholar · Último Ciclo
      </p>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#0f0e0c;line-height:1.2;">
        Recordatorio
      </h1>
    </div>

    <!-- Cuerpo -->
    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;font-size:14px;color:#454238;line-height:1.6;">
        Hola, <strong style="color:#0f0e0c;">${firstName}</strong>.<br/>
        ${daysLeft === 1 ? "Mañana" : `En <strong>${daysLeft} días</strong>`} vence un ${typeLabel.toLowerCase()} de <strong style="color:#0f0e0c;">${courseName}</strong>.
      </p>

      <!-- Tarjeta de tarea -->
      <div style="background:#fff;border:1px solid #e4d9c0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#87836f;">
          ${typeLabel} · ${courseName}
        </p>
        <p style="margin:0 0 12px;font-size:18px;font-family:Georgia,serif;color:#0f0e0c;font-weight:400;">
          ${taskTitle}
        </p>
        <p style="margin:0;font-size:12px;color:#625e52;">
          Fecha límite: <strong style="color:#0f0e0c;">${dueDateFormatted}</strong>
        </p>
      </div>

      <p style="margin:0;font-size:12px;color:#87836f;line-height:1.6;">
        Este es un recordatorio automático de Scholar.<br/>
        Sigue adelante — estás en el último ciclo.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #e4d9c0;background:#f0ead8;">
      <p style="margin:0;font-size:11px;color:#aaa694;text-align:center;">
        Scholar · Sistema académico personal
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: toEmail,
      subject: `[Scholar] Recordatorio: ${taskTitle} — en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`,
      html,
    });
    return result;
  } catch (err) {
    console.error("[email] Error enviando recordatorio:", err);
    throw err;
  }
}
