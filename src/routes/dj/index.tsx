import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { AccountGate } from "@/components/account-gate";
import { BrandLogo } from "@/components/brand-logo";
import { daysLabel, errText, formatLongDate } from "@/lib/events/format";
import { listEvents } from "@/lib/events/server";
import type { EventSummary } from "@/lib/events/types";

export const Route = createFileRoute("/dj/")({ component: DjHomePage });

function DjHomePage() {
  return (
    <AccountGate role="dj">
      {(profile) => <DjHome name={profile.displayName} />}
    </AccountGate>
  );
}

function DjHome({ name }: { name: string }) {
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listEvents()
      .then(setEvents)
      .catch((reason) => setError(errText(reason)));
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <header className="safe-top space-y-4">
        <div className="flex justify-end">
          <UserButton />
        </div>
        <div className="flex justify-center">
          <BrandLogo size="header" />
        </div>
        <div className="text-center">
          <h1 className="font-display text-4xl">Your gigs</h1>
          <p className="text-muted">{name}</p>
        </div>
      </header>
      {error && <p className="mt-6 text-danger">{error}</p>}
      {!events && !error && <p className="mt-8 text-muted">Loading…</p>}
      {events && events.length === 0 && (
        <p className="mt-8 text-muted">Nothing is assigned to this login yet.</p>
      )}
      <div className="mt-6 space-y-3">
        {events?.map((event) => (
          <Link
            key={event.id}
            to="/dj/$eventId"
            params={{ eventId: event.id }}
            className="block rounded-2xl border border-line bg-surface p-4"
          >
            <p className="text-sm text-accent">{formatLongDate(event.eventDate)}</p>
            <h2 className="mt-1 font-display text-3xl">{event.couple || event.title}</h2>
            <p className="text-muted">{event.venue}</p>
            <p className="mt-3 text-sm text-faint">{daysLabel(event.eventDate)}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
