import { Sidebar } from "@/components/ui/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main
        className="flex-1 md:ml-56 min-h-dvh page-in pt-16 md:pt-0"
        style={{ background: "var(--bg)" }}
      >
        {children}
      </main>
    </div>
  );
}
