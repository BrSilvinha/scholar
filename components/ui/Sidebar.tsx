"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  Clock,
  FileText,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  GraduationCap,
} from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard",   icon: LayoutDashboard },
  { href: "/notas",     label: "Notas",        icon: ClipboardList },
  { href: "/tareas",    label: "Tareas",       icon: Calendar },
  { href: "/horario",   label: "Horario",      icon: Clock },
  { href: "/pdf",       label: "Resumen PDF",  icon: FileText },
];

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { theme, setTheme } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  const sidebarContent = (
    <>
      {/* Logo USS */}
      <div className="px-5 py-6 border-b" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#a8d400" }}
          >
            <GraduationCap size={18} style={{ color: "#2d0d47" }} />
          </div>
          <div>
            <p className="text-base font-bold leading-none" style={{ fontFamily: "var(--font-display)", color: "#ffffff" }}>
              Scholar
            </p>
            <p className="text-[11px] leading-none mt-1" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-sans)" }}>
              USS · Ciclo 10
            </p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
              style={{
                color:      isActive ? "#2d0d47"              : "rgba(255,255,255,0.7)",
                background: isActive ? "#a8d400"              : "transparent",
                fontFamily: "var(--font-sans)",
                fontWeight: isActive ? 600 : 400,
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(168,212,0,0.15)"; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active-bg"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: "#a8d400", zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-sans)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(168,212,0,0.15)"; (e.currentTarget as HTMLElement).style.color = "#ffffff"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; }}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          {theme === "dark" ? "Modo claro" : "Modo oscuro"}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-sans)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,80,80,0.15)"; (e.currentTarget as HTMLElement).style.color = "#ff8080"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; }}
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-dvh w-56 flex-col z-30"
        style={{ background: "var(--sidebar-bg)" }}
      >
        {sidebarContent}
      </aside>

      {/* ── Mobile: botón hamburguesa ────────────────── */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: "#5b1f8a", color: "#ffffff" }}
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={18} />
      </button>

      {/* ── Mobile: drawer overlay ───────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 40 }}
              className="md:hidden fixed left-0 top-0 h-dvh w-64 flex flex-col z-50"
              style={{ background: "#5b1f8a" }}
            >
              <button
                className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff" }}
                onClick={() => setMobileOpen(false)}
              >
                <X size={14} />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
