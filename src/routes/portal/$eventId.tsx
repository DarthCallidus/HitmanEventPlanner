import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AccountGate } from "@/components/account-gate";
import { EventEditor } from "@/components/event-editor";
import { openPdf } from "@/lib/events/cache";
import { errText, formatLongDate } from "@/lib/events/format";
import { getContractPdf, getEvent } from "@/lib/events/server";
import type { EventRecord } from "@/lib/events/types";

export const Route = createFileRoute("/portal/$eventId")({ component: PortalEventPage });

async function openContract(id: string) {
  const file = await getContractPdf({ data: { id } });
  if (file.base64) openPdf(file.base64, file.name);
}

function PortalEventPage() {
  const { eventId } = Route.useParams();
  return (
    <AccountGate role="client">
      {() => <Planner eventId={eventId} />}
    </AccountGate>
  );
}

function Planner({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [error, setError] = useState("");

  function reload() {
    getEvent({ data: { id: eventId } })
      .then(setEvent)
      .catch((reason) => setError(errText(reason)));
  }

  useEffect(() => {
    reload();
  }, [eventId]);

  if (!event && !error) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-muted">Opening your wedding…</p>
      </main>
    );
  }
  if (!event) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <p className="text-danger">{error}</p>
        <Link to="/portal" className="mt-4 inline-block text-accent">
          Back
        </Link>
      </main>
    );
  }

  const locked = event.status === "locked";

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <Link to="/portal" className="text-sm text-faint">
        Your wedding
      </Link>
      <h1 className="mt-2 font-display text-4xl">{event.details.day.coupleNames || event.title}</h1>
      <p className="text-muted">
        {formatLongDate(event.eventDate)}
        {event.venue ? ` · ${event.venue}` : ""}
      </p>
      {locked ? (
        <p className="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm">
          Your DJ locked this wedding. You can still read everything. Ask them if something needs to change.
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted">Work one section at a time. It saves as you go.</p>
      )}
      {event.contractPdfName && (
        <button type="button" className="btn mt-4" onClick={() => void openContract(event.id)}>
          {event.contractPdfName}
        </button>
      )}
      <div className="mt-6">
        <EventEditor event={event} readOnly={locked} onSaved={reload} />
      </div>
    </main>
  );
}
