import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AccountGate } from "@/components/account-gate";
import { errText, formatLongDate } from "@/lib/events/format";
import { getEvent } from "@/lib/events/server";
import type { EventRecord } from "@/lib/events/types";

export const Route = createFileRoute("/operator/$eventId")({ component: OperatorEventPage });

function OperatorEventPage() {
  const { eventId } = Route.useParams();
  return (
    <AccountGate role="operator">
      {() => <Spin eventId={eventId} />}
    </AccountGate>
  );
}

function Spin({ eventId }: { eventId: string }) {
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
        <p className="text-muted">Opening the 360…</p>
      </main>
    );
  }
  if (!event) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <p className="text-danger">{error}</p>
        <Link to="/operator" className="mt-4 inline-block text-accent">
          Back
        </Link>
      </main>
    );
  }

  const booth = event.details.booth360;
  const title = event.details.kind === "other" ? event.title : event.details.day.coupleNames || event.title;
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <Link to="/operator" className="safe-top text-sm text-faint">
        360
      </Link>
      <p className="mt-4 text-sm text-accent">{formatLongDate(event.eventDate)}</p>
      <h1 className="mt-1 font-display text-4xl">{title}</h1>
      <p className="text-muted">{event.venue}</p>
      {!booth.enabled ? (
        <p className="mt-8 text-muted">The 360 is off for this event.</p>
      ) : (
        <div className="mt-6 space-y-3">
          <Line label="When it runs" value={booth.when} />
          <Line label="Where it sits" value={booth.where} />
          <Line label="Start" value={booth.start} />
          <Line label="End" value={booth.end} />
          <Line label="Notes" value={booth.notes} />
        </div>
      )}
    </main>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <p className="text-sm text-faint">{label}</p>
      <p className="mt-1 whitespace-pre-wrap">{value.trim() || "—"}</p>
    </div>
  );
}
