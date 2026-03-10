import webpush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
}

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (
    !subject || !publicKey || !privateKey ||
    publicKey.includes("your_") || privateKey.includes("your_")
  ) {
    throw new Error(
      "VAPID keys no configuradas. Completa VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en .env.local"
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  try {
    ensureVapid();

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return false; // suscripción inválida → borrar
    }
    console.error("[push] Error enviando notificación:", err.message);
    return false;
  }
}
