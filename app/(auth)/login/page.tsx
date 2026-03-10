"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, LogIn, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError("Correo o contraseña incorrectos."); setLoading(false); return; }
    router.push("/dashboard");
    router.refresh();
  }


  return (
    <div className="min-h-dvh flex flex-col md:flex-row">

      {/* ── Panel izquierdo (purple) ─────────────────── */}
      <div
        className="relative flex flex-col items-center justify-center px-10 py-16 md:w-1/2 overflow-hidden"
        style={{ background: "#5b1f8a" }}
      >
        {/* Círculos decorativos USS */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-10"
          style={{ border: "2px solid #a8d400" }} />
        <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full opacity-15"
          style={{ border: "2px solid #a8d400" }} />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full opacity-10"
          style={{ border: "2px solid #a8d400" }} />
        <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full opacity-15"
          style={{ border: "2px solid #ffffff" }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-center max-w-xs"
        >
          {/* Logo */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "#a8d400" }}
          >
            <GraduationCap size={36} style={{ color: "#5b1f8a" }} />
          </div>

          <h1
            className="text-4xl font-bold text-white mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Scholar
          </h1>
          <p className="text-base opacity-70 text-white mb-6"
            style={{ fontFamily: "var(--font-sans)" }}>
            Tu plataforma académica personal para conquistar el último ciclo.
          </p>

          {/* Chips decorativos */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {["Horario", "Notas", "Tareas", "Egreso"].map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ background: "rgba(168,212,0,0.2)", color: "#a8d400", fontFamily: "var(--font-sans)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Panel derecho (white / form) ─────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 md:px-12"
        style={{ background: "#ffffff" }}>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-sm"
        >
          <h2
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-display)", color: "#5b1f8a" }}
          >
            Bienvenido, Jhamir
          </h2>
          <p className="text-sm mb-8" style={{ color: "rgba(91,31,138,0.55)", fontFamily: "var(--font-sans)" }}>
            Ingresa para continuar tu ciclo 10.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#5b1f8a", fontFamily: "var(--font-sans)" }}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(91,31,138,0.4)" }} />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required className="w-full pl-9 pr-4 py-2.5 text-sm"
                  placeholder="tu@uss.edu.pe" autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#5b1f8a", fontFamily: "var(--font-sans)" }}>
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(91,31,138,0.4)" }} />
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required className="w-full pl-9 pr-4 py-2.5 text-sm"
                  placeholder="••••••••" autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="text-xs px-3 py-2.5 rounded-lg"
                style={{ background: "rgba(91,31,138,0.08)", color: "#5b1f8a", border: "1px solid rgba(91,31,138,0.2)" }}
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
              style={{ background: "#5b1f8a", color: "#ffffff", fontFamily: "var(--font-sans)" }}
            >
              <LogIn size={15} />
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

        </motion.div>
      </div>
    </div>
  );
}
