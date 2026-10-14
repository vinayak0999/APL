import { isAdmin } from "@/lib/auth";
import AdminLogin from "./AdminLogin";
import AdminConsole from "./AdminConsole";

// reads the admin auth cookie on every request — must render per-request
export const instant = false;

export default async function AdminPage() {
  const ok = await isAdmin();
  if (!ok) return <AdminLogin />;
  return <AdminConsole />;
}
