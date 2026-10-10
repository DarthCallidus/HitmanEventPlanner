import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AccountGate } from "@/components/account-gate";
import { EventEditor } from "@/components/event-editor";
import { errText, formatLongDate } from "@/lib/events/format";
import { getEvent } from "@/lib/events/server";
import type { EventRecord } from "@/lib/events/types";

export const Route = createFileRoute("/dj/$eventId")({ component: DjEventPage });

function DjEventPage() {
  const { eventId } = Route.useParams();
  return (
    <AccountGate role="dj">
      {() => <Gig eventId={eventId} />}
    </AccountGate>
  );
}

function Gig({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getEvent({ data: { id: eventId } })
      .then(setEvent)
      .catch((reason) => setError(errText(reason)));
  }, [eventId]);

  if (!event && !error) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-muted">Opening the wedding…</p>
      </main>
    );
  }
  if (!event) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <p className="text-danger">{error}</p>
        <Link to="/dj" className="mt-4 inline-block text-accent">
          Back
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <Link to="/dj" className="text-sm text-faint">
        Your gigs
      </Link>
      <h1 className="mt-2 font-display text-4xl">{event.details.day.coupleNames || event.title}</h1>
      <p className="text-muted">
        {formatLongDate(event.eventDate)}
        {event.venue ? ` · ${event.venue}` : ""}
      </p>
      <Link to="/booth/$eventId" params={{ eventId }} className="btn btn-block mt-4">
        Step Into The Booth
      </Link>
      <p className="mt-4 text-sm text-muted">Read only. Ask the admin if something needs to change.</p>
      <div className="mt-6">
        <EventEditor event={event} readOnly onSaved={() => undefined} />
      </div>
    </main>
  );
}
