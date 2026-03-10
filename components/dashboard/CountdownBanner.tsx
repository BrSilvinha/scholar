"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flag, Trophy, Zap, GraduationCap } from "lucide-react";
import { differenceInDays, isToday, format } from "date-fns";
import { es } from "date-fns/locale";

interface CountdownBannerProps {
  endDate: Date;
  approvedCourses: number;
  totalCourses: number;
  cycleName?: string;
}

type CountdownState = "normal" | "lastMonth" | "finalStretch" | "today";

export function CountdownBanner({ endDate, approvedCourses, totalCourses, cycleName }: CountdownBannerProps) {
  const [daysLeft, setDaysLeft]   = useState(0);
  const [state, setState]         = useState<CountdownState>("normal");

  useEffect(() => {
    function update() {
      const days = differenceInDays(endDate, new Date());
      setDaysLeft(Math.max(0, days));
      if (isToday(endDate))   setState("today");
      else if (days <= 7)     setState("finalStretch");
      else if (days <= 30)    setState("lastMonth");
      else                    setState("normal");
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [endDate]);

  const progress = totalCourses > 0 ? (approvedCourses / totalCourses) * 100 : 0;

  const stateConfig = {
    normal: {
      icon: GraduationCap,
      tag: cycleName ?? "Ciclo actual",
      label: `${daysLeft} días para terminar`,
      gradient: "linear-gradient(135deg, #5b1f8a 0%, #8b44c8 100%)",
      accentColor: "#a8d400",
    },
    lastMonth: {
      icon: Flag,
      tag: "Último mes",
      label: `${daysLeft} días restantes`,
      gradient: "linear-gradient(135deg, #7326b0 0%, #5b1f8a 100%)",
      accentColor: "#bcdd33",
    },
    finalStretch: {
      icon: Zap,
      tag: "Recta final",
      label: `Solo ${daysLeft} días`,
      gradient: "linear-gradient(135deg, #3e1163 0%, #5b1f8a 100%)",
      accentColor: "#a8d400",
    },
    today: {
      icon: Trophy,
      tag: "Día de egreso",
      label: "¡Lo lograste!",
      gradient: "linear-gradient(135deg, #7ba000 0%, #a8d400 100%)",
      accentColor: "#ffffff",
    },
  }[state];

  const Icon = stateConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-2xl p-6 overflow-hidden relative"
      style={{ background: stateConfig.gradient }}
    >
      {/* Círculo decorativo de fondo */}
      <div
        className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
        style={{ background: stateConfig.accentColor }}
      />
      <div
        className="absolute -bottom-12 -right-4 w-56 h-56 rounded-full opacity-5"
        style={{ background: stateConfig.accentColor }}
      />

      <div className="relative flex items-start justify-between gap-4 flex-wrap gap-y-4">
        {/* Izquierda */}
        <div className="flex items-center gap-4">
          <motion.div
            animate={state === "finalStretch" ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: stateConfig.accentColor }}
          >
            <Icon size={24} style={{ color: state === "today" ? "#ffffff" : "#2d0d47" }} />
          </motion.div>

          <div>
            <span
              className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full mb-2 font-semibold"
              style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-sans)" }}
            >
              {stateConfig.tag}
            </span>
            <motion.p
              key={daysLeft}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold leading-none text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {stateConfig.label}
            </motion.p>
            <p className="text-sm mt-2 opacity-70 text-white" style={{ fontFamily: "var(--font-sans)" }}>
              {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </div>

        {/* Derecha — progreso de cursos */}
        <div
          className="flex-shrink-0 px-5 py-4 rounded-2xl min-w-[120px]"
          style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
        >
          <p
            className="text-3xl font-bold leading-none text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {approvedCourses}
            <span className="text-lg font-normal opacity-60 ml-0.5 text-white">/{totalCourses}</span>
          </p>
          <p className="text-[10px] uppercase tracking-wider mt-1 opacity-60 text-white" style={{ fontFamily: "var(--font-sans)" }}>
            aprobados
          </p>
          {/* Barra de progreso */}
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: stateConfig.accentColor }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
