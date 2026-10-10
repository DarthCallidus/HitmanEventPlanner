import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { Splash } from "@/components/account-gate";
import { BrandLogo } from "@/components/brand-logo";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe } from "@/lib/events/server";
import type { Profile } from "@/lib/events/types";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    getMe()
      .then((next) => {
        if (!cancel) setProfile(next);
      })
      .catch(() => {
        if (!cancel) setFailed(true);
      });
    return () => {
      cancel = true;
    };
  }, [user]);

  if (isPending || (user && !profile && !failed)) return <Splash />;
  if (user && failed) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <p className="text-muted">Could not open your account. Reload and try again.</p>
      </main>
    );
  }
  if (user && profile?.role === "admin") return <Navigate to="/admin" />;
  if (user && profile?.role === "dj") return <Navigate to="/dj" />;
  if (user && profile) return <Navigate to="/portal" />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-3 px-5 py-4 md:grid md:max-w-5xl md:grid-cols-2 md:items-center md:gap-10 md:px-8 md:py-8">
      <section className="flex justify-center">
        <h1 className="sr-only">Hitman Entertainment</h1>
        <BrandLogo size="hero" />
      </section>
      <AuthForm />
    </main>
  );
}
