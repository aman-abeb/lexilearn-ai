import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export default function CoursesLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
