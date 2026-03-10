// Las páginas de auth son dinámicas porque dependen de Supabase
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
