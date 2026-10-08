import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe } from "@/lib/events/server";
import type { Profile } from "@/lib/events/types";
import { BrandLogo } from "@/components/brand-logo";
import { errText } from "@/lib/events/format";
import { lockDayTheme, unlockDayTheme } from "@/lib/theme";

export function Splash() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <BrandLogo size="splash" />
    </main>
  );
}

export function AccountGate({
  role,
  theme = "night",
  children,
}: {
  role?: Profile["role"];
  theme?: "night" | "day";
  children: (profile: Profile) => ReactNode;
}) {
  const { user, isPending } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (theme !== "day") return;
    lockDayTheme();
    return () => unlockDayTheme();
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    getMe()
      .then((next) => {
        if (!cancel) setProfile(next);
      })
      .catch((reason) => {
        if (!cancel) setError(errText(reason));
      });
    return () => {
      cancel = true;
    };
  }, [user]);

  if (isPending || (user && !profile && !error)) return <Splash />;
  if (!user) return <RedirectToSignIn />;
  if (error || !profile) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <p className="max-w-sm text-muted">{error ?? "Could not load your account"}</p>
      </main>
    );
  }
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === "admin" ? "/admin" : "/portal"} />;
  }
  return <>{children(profile)}</>;
}
