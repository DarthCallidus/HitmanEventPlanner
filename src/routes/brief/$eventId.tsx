import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AccountGate } from "@/components/account-gate";
import { BrandLogo } from "@/components/brand-logo";
import { errText, formatLongDate } from "@/lib/events/format";
import { getEvent } from "@/lib/events/server";
import type { EventRecord } from "@/lib/events/types";

export const Route = createFileRoute("/brief/$eventId")({ component: BriefPage });

function BriefPage() {
  const { eventId } = Route.useParams();
  return (
    <AccountGate role="admin" theme="day">
      {() => <Brief eventId={eventId} />}
    </AccountGate>
  );
}

function Brief({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getEvent({ data: { id: eventId } })
      .then(setEvent)
      .catch((reason) => setError(errText(reason)));
  }, [eventId]);

  if (!event) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <p className="text-muted">{error || "Preparing the brief…"}</p>
      </main>
    );
  }

  const d = event.details;
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <div className="no-print mb-6 flex gap-2">
        <button type="button" className="btn" onClick={() => window.print()}>
          Save PDF
        </button>
        <Link to="/admin/$eventId" params={{ eventId }} className="btn-line">
          Back
        </Link>
      </div>
      <BrandLogo tone="day" size="header" />
      <h1 className="mt-4 font-display text-4xl">{d.day.coupleNames || event.title}</h1>
      <p className="text-muted">
        {formatLongDate(event.eventDate)} · {event.venue}
      </p>

      <Block title="The day">
        <Line label="Ceremony" value={d.day.ceremonyLocation} />
        <Line label="Start" value={d.day.ceremonyStart} />
        <Line label="Reception" value={d.day.receptionLocation} />
        <Line label="Coordinator" value={d.day.coordinatorName} />
        <Line label="Coordinator phone" value={d.day.coordinatorPhone} />
        <Line label="Live musicians" value={d.day.liveMusicians} />
      </Block>
      <Block title="Ceremony">
        {d.ceremony.family.map((row) => (
          <Line key={row.id} label={row.label} value={row.value} />
        ))}
        {d.ceremony.music.map((row) => (
          <Line key={row.id} label={row.label} value={songText(row)} />
        ))}
      </Block>
      <Block title="Toasts">
        {d.toasts.map((row) => (
          <Line key={row.id} label={row.label} value={row.value} />
        ))}
      </Block>
      <Block title="Reception songs">
        {d.reception.map((row) => (
          <Line key={row.id} label={row.label} value={songText(row)} />
        ))}
      </Block>
      <Block title="Introductions">
        <Line
          label="Wedding party"
          value={
            d.introductions.style === "couples"
              ? "As couples"
              : d.introductions.style === "group"
                ? d.introductions.groupAnnounce === "title"
                  ? d.introductions.groupTitle
                  : "As a group, announce names"
                : ""
          }
        />
        {d.introductions.pairs.map((row) => (
          <Line key={row.id} label={row.leftRole} value={`${row.leftName} with ${row.rightRole} ${row.rightName}`.trim()} />
        ))}
        {d.introductions.style === "group" &&
          d.introductions.groupAnnounce === "names" &&
          d.introductions.names.map((row) => <Line key={row.id} label={row.role} value={row.name} />)}
        <Line
          label="Parents"
          value={
            d.introductions.parents === "no"
              ? "Do not announce"
              : [d.introductions.brideParents && `Bride: ${d.introductions.brideParents}`, d.introductions.groomParents && `Groom: ${d.introductions.groomParents}`]
                  .filter(Boolean)
                  .join(" · ")
          }
        />
        {d.introductions.others.map((row) => (
          <Line key={row.id} label={row.role} value={row.skip ? "Do not announce" : row.name} />
        ))}
        <Line label="Couple" value={d.introductions.coupleAnnounce} />
      </Block>
      <Block title="Music taste">
        {(d.taste.playlists ?? []).map((row) => (
          <Line key={row.id} label={row.name || "Playlist"} value={row.link} />
        ))}
        <Line label="Do not play" value={d.taste.doNotPlay} />
        <Line label="Bride's artists" value={d.taste.brideArtists} />
        <Line label="Groom's artists" value={d.taste.groomArtists} />
        <Line label="Bride graduation" value={d.taste.brideGrad} />
        <Line label="Groom graduation" value={d.taste.groomGrad} />
        <Line
          label="Genres"
          value={d.taste.genres
            .filter((genre) => genre.rank.trim())
            .map((genre) => `${genre.label} ${genre.rank}`)
            .join(", ")}
        />
      </Block>
      <Block title="The rest">
        <Line label="Longest married" value={d.rest.longestMarried} />
        <Line label="Exit" value={d.rest.exitPlan} />
        <Line label="Alcohol" value={d.rest.alcohol} />
        <Line label="Blessing" value={d.rest.blessing} />
        {d.rest.vendors.map((row) => (
          <Line key={row.id} label={row.role} value={row.name} />
        ))}
        <p className="whitespace-pre-wrap">{d.rest.requests}</p>
      </Block>
      <Block title="Timeline">
        {d.rest.timelinePdfName && <Line label="PDF" value={d.rest.timelinePdfName} />}
        {d.rest.timeline.map((item) => (
          <p key={item.id}>
            <span className="tabular-nums">{item.time || "—"}</span> {item.label}
            {item.notes ? ` — ${item.notes}` : ""}
          </p>
        ))}
      </Block>
      {event.boothNotes && (
        <Block title="Booth notes">
          <p className="whitespace-pre-wrap">{event.boothNotes}</p>
        </Block>
      )}
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border-t border-line pt-4">
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-2 space-y-1 text-base">{children}</div>
    </section>
  );
}

function songText(row: { song: string; artist: string; cue: string; link: string }): string {
  return [row.song, row.artist, row.cue ? `Start at ${row.cue}` : "", row.link].filter(Boolean).join(" · ");
}

function Line({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <p>
      <span className="text-muted">{label}. </span>
      {value}
    </p>
  );
}
