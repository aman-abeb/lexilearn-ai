import { AdminEntry } from "@/components/admin-entry";
import { adminLoginConfigured } from "@/server/auth/admin";

export default function AdminPage() {
  return <AdminEntry loginReady={adminLoginConfigured()} />;
}
