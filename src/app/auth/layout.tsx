"use client";

import type { ReactNode } from "react";
import { AuthScreen } from "@/components/auth-screen";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthScreen>{children}</AuthScreen>;
}
