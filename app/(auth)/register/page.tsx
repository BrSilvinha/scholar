"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Calendar, GraduationCap, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step,         setStep]         = useState<1 | 2>(1);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [fullName,     setFullName]     = useState("");
  const [career,       setCareer]       = useState("");
  const [cycleEndDate, setCycleEndDate] = useState("");

  async function handleRegister(e: React.SyntheticEvent) {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }

    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, career, cycle_end_date: cycleEndDate } },
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Error al crear la cuenta.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: data.user.id, email, fullName, career, cycleEndDate }),
    });

    if (!res.ok) { setError("Error al configurar tu perfil."); setLoading(false); return; }

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
        {/* Círculos decorativos */}
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
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "#a8d400" }}>
            <GraduationCap size={36} style={{ color: "#5b1f8a" }} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3"
            style={{ fontFamily: "var(--font-display)" }}>
            Scholar
          </h1>
          <p className="text-base opacity-70 text-white"
            style={{ fontFamily: "var(--font-sans)" }}>
            Registra tu cuenta y comienza a gestionar tu último ciclo universitario.
          </p>

          {/* Paso actual */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {[1, 2].map((s) => (
              <div
                key={s}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: s === step ? "32px" : "12px",
                  background: s <= step ? "#a8d400" : "rgba(255,255,255,0.25)",
                }}
              />
            ))}
          </div>
          <p className="text-xs mt-2 opacity-50 text-white" style={{ fontFamily: "var(--font-sans)" }}>
            Paso {step} de 2
          </p>
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
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-bold mb-1"
                style={{ fontFamily: "var(--font-display)", color: "#5b1f8a" }}>
                {step === 1 ? "Crea tu cuenta" : "Perfil académico"}
              </h2>
              <p className="text-sm mb-8"
                style={{ color: "rgba(91,31,138,0.55)", fontFamily: "var(--font-sans)" }}>
                {step === 1 ? "El inicio de tu último ciclo." : "Configura tu información académica."}
              </p>
            </motion.div>
          </AnimatePresence>

          <form onSubmit={handleRegister} className="space-y-4">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: "#5b1f8a", fontFamily: "var(--font-sans)" }}>
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: "rgba(91,31,138,0.4)" }} />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        required className="w-full pl-9 pr-4 py-2.5 text-sm" placeholder="tu@uss.edu.pe" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: "#5b1f8a", fontFamily: "var(--font-sans)" }}>
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: "rgba(91,31,138,0.4)" }} />
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        required minLength={8} className="w-full pl-9 pr-4 py-2.5 text-sm" placeholder="Mínimo 8 caracteres" />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: "#5b1f8a", fontFamily: "var(--font-sans)" }}>
                      Nombre completo
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: "rgba(91,31,138,0.4)" }} />
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                        required className="w-full pl-9 pr-4 py-2.5 text-sm" placeholder="Tu nombre completo" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: "#5b1f8a", fontFamily: "var(--font-sans)" }}>
                      Carrera
                    </label>
                    <div className="relative">
                      <GraduationCap size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: "rgba(91,31,138,0.4)" }} />
                      <input type="text" value={career} onChange={(e) => setCareer(e.target.value)}
                        required className="w-full pl-9 pr-4 py-2.5 text-sm" placeholder="Ingeniería de Sistemas" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: "#5b1f8a", fontFamily: "var(--font-sans)" }}>
                      Fecha de fin del ciclo
                    </label>
                    <div className="relative">
                      <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: "rgba(91,31,138,0.4)" }} />
                      <input type="date" value={cycleEndDate} onChange={(e) => setCycleEndDate(e.target.value)}
                        required className="w-full pl-9 pr-4 py-2.5 text-sm" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="text-xs px-3 py-2.5 rounded-lg"
                style={{ background: "rgba(91,31,138,0.08)", color: "#5b1f8a", border: "1px solid rgba(91,31,138,0.2)" }}>
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
              style={{ background: "#5b1f8a", color: "#ffffff", fontFamily: "var(--font-sans)" }}>
              {step === 1 ? <><span>Continuar</span><ArrowRight size={15} /></> : loading ? "Creando cuenta..." : "Empezar mi último ciclo"}
            </button>
          </form>

          {step === 1 && (
            <p className="text-center text-xs mt-6"
              style={{ color: "rgba(91,31,138,0.5)", fontFamily: "var(--font-sans)" }}>
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="font-semibold underline underline-offset-2"
                style={{ color: "#5b1f8a" }}>
                Ingresa
              </Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
