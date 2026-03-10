"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";

export function usePushNotifications() {
  const { pushPermission, setPushPermission } = useAppStore();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    // Registrar service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        const currentPermission = Notification.permission;
        setPushPermission(currentPermission);

        if (currentPermission === "granted") {
          await subscribeUser(reg);
        }
      })
      .catch((err) =>
        console.warn("[SW] Error registrando service worker:", err)
      );
  }, []);

  async function requestPermission() {
    if (!("Notification" in window)) return;

    const permission = await Notification.requestPermission();
    setPushPermission(permission);

    if (permission === "granted") {
      const reg = await navigator.serviceWorker.ready;
      await subscribeUser(reg);
    }

    return permission;
  }

  return { pushPermission, requestPermission };
}

async function subscribeUser(registration: ServiceWorkerRegistration) {
  try {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    });

    const sub = subscription.toJSON();

    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        p256dh: sub.keys?.p256dh,
        auth: sub.keys?.auth,
      }),
    });
  } catch (err) {
    console.warn("[push] Error suscribiendo:", err);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
