"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function LoginPage() {
  const { user, isAuthorized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && isAuthorized) {
      router.push("/");
    }
  }, [user, isAuthorized, router]);

  return <AuthGuard>{null}</AuthGuard>;
}
