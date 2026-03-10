import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Este módulo solo se usa en el servidor (API routes, server actions, cron jobs).

declare global {
  // eslint-disable-next-line no-var
  var _pgClient: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var _drizzle: ReturnType<typeof drizzle> | undefined;
}

function getDb() {
  if (globalThis._drizzle) return globalThis._drizzle;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes("[password]") || connectionString.includes("[project-ref]")) {
    throw new Error(
      "DATABASE_URL no está configurado. Completa las variables de entorno en .env.local"
    );
  }

  const client = globalThis._pgClient ?? postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis._pgClient = client;
  }

  const db = drizzle(client, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalThis._drizzle = db;
  }

  return db;
}

// Proxy lazy: el cliente DB se crea solo cuando se hace la primera query
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = getDb();
    const value = (instance as any)[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export type DB = typeof db;
