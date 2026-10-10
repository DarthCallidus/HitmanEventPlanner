import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AccountGate } from "@/components/account-gate";
import { BoothView } from "@/components/booth-view";
import { clearEventCache, readCache, readPendingNotes, writeCache } from "@/lib/events/cache";
import { errText } from "@/lib/events/format";
import { getEvent } from "@/lib/events/server";
import type { EventRecord } from "@/lib/events/types";

export const Route = createFileRoute("/booth/$eventId")({ component: BoothPage });

function BoothPage() {
  const { eventId } = Route.useParams();
  return (
    <AccountGate roles={["admin", "dj"]}>
      {() => <BoothLoader key={eventId} eventId={eventId} />}
    </AccountGate>
  );
}

function BoothLoader({ eventId }: { eventId: string }) {
  const cached = readCache(eventId);
  const [event, setEvent] = useState<EventRecord | null>(cached?.event ?? null);
  const [sync, setSync] = useState<"synced" | "offline" | "unsynced" | "local">(
    readPendingNotes(eventId) ? "unsynced" : cached ? "local" : "synced",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    getEvent({ data: { id: eventId } })
      .then((next) => {
        if (cancel) return;
        const pending = readPendingNotes(eventId);
        if (pending != null) next.boothNotes = pending;
        setEvent(next);
        writeCache(next);
        setSync(pending != null ? "unsynced" : "synced");
      })
      .catch((reason) => {
        if (cancel) return;
        const message = errText(reason);
        if (message.toLowerCase().includes("not found")) {
          clearEventCache(eventId);
          setEvent(null);
          setError("This event was deleted.");
          return;
        }
        if (cached?.event) setSync("offline");
        else setError(message);
      });
    return () => {
      cancel = true;
    };
  }, [eventId]);

  if (!event && !error) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <p className="font-display text-3xl">Opening The Booth…</p>
      </main>
    );
  }
  if (!event) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <p className="text-danger">{error}</p>
        <p className="mt-2 text-muted">Open this wedding once while you have service so Booth can keep a copy.</p>
        <Link to="/admin" className="mt-4 inline-block text-accent">
          Back to the book
        </Link>
      </main>
    );
  }

  return <BoothView event={event} initialSync={sync} />;
}
