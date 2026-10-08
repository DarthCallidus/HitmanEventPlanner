import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { formatLongDate, relativeTime, timelineFocus } from "@/lib/events/format";
import { openPdf } from "@/lib/events/cache";
import {
  clearPendingNotes,
  readCache,
  readChecks,
  readPendingNotes,
  readPdfCache,
  writeCache,
  writeChecks,
  writePdfCache,
  writePendingNotes,
} from "@/lib/events/cache";
import { getTimelinePdf, saveBoothNotes } from "@/lib/events/server";
import type { EventRecord } from "@/lib/events/types";

type Tab = "today" | "ceremony" | "reception" | "timeline" | "music" | "notes";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "today", label: "Today" },
  { id: "ceremony", label: "Ceremony" },
  { id: "reception", label: "Reception" },
  { id: "timeline", label: "Timeline" },
  { id: "music", label: "Music" },
  { id: "notes", label: "Notes" },
];

async function openTimelinePdf(event: EventRecord) {
  try {
    const file = await getTimelinePdf({ data: { id: event.id } });
    if (file.base64) {
      writePdfCache(event.id, file.name, file.base64);
      openPdf(file.base64, file.name);
      return;
    }
  } catch {
    const cached = readPdfCache(event.id);
    if (cached?.base64) openPdf(cached.base64, cached.name);
  }
}

export function BoothView({
  event,
  initialSync,
}: {
  event: EventRecord;
  initialSync: "synced" | "offline" | "unsynced" | "local";
}) {
  const [tab, setTab] = useState<Tab>("today");
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [sync, setSync] = useState(initialSync);
  const [notes, setNotes] = useState(readPendingNotes(event.id) ?? event.boothNotes);
  const [checks, setChecks] = useState<string[]>(() => readChecks(event.id));
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setSync(initialSync);
  }, [initialSync]);

  useEffect(() => {
    writeCache(event);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const clock = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.clearInterval(clock);
    };
  }, [event]);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/booth-sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    const pending = readPendingNotes(event.id);
    if (pending == null || !online) return;
    let cancel = false;
    saveBoothNotes({ data: { id: event.id, boothNotes: pending } })
      .then(() => {
        if (cancel) return;
        clearPendingNotes(event.id);
        setSync("synced");
      })
      .catch(() => {
        if (!cancel) setSync("unsynced");
      });
    return () => {
      cancel = true;
    };
  }, [event.id, online]);

  const focus = useMemo(
    () => timelineFocus(event.details.rest.timeline, event.eventDate, now),
    [event, now],
  );

  function toggleCheck(id: string) {
    setChecks((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      writeChecks(event.id, next);
      return next;
    });
  }

  function onNotes(value: string) {
    setNotes(value);
    writePendingNotes(event.id, value);
    setSync(online ? "unsynced" : "offline");
    if (!online) return;
    saveBoothNotes({ data: { id: event.id, boothNotes: value } })
      .then(() => {
        clearPendingNotes(event.id);
        setSync("synced");
      })
      .catch(() => setSync("unsynced"));
  }

  const syncLabel =
    sync === "local"
      ? "Saved copy"
      : !online || sync === "offline"
        ? "Offline · saved copy"
        : sync === "unsynced"
          ? "Online · unsynced"
          : "Online · synced";

  const couple = event.details.day.coupleNames || event.title;
  const cached = readCache(event.id);

  return (
    <div className="booth-pad mx-auto min-h-screen max-w-lg">
      <header className="safe-top sticky top-0 z-10 border-b border-line bg-bg px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link to="/admin/$eventId" params={{ eventId: event.id }} className="text-sm text-faint">
            Desk
          </Link>
          <p className="text-sm text-accent">{syncLabel}</p>
        </div>
      </header>
      <div className="px-4 py-5">
        {tab === "today" && (
          <div className="space-y-5">
            <div>
              <p className="text-sm uppercase tracking-widest text-faint">
                {focus.live ? "Live" : formatLongDate(event.eventDate)}
              </p>
              <h1 className="mt-1 font-display text-4xl">{couple}</h1>
              <p className="mt-1 text-muted">{event.venue || "Venue not set"}</p>
            </div>
            <CueCard
              kicker={focus.live ? (focus.next ? "Next" : "That's the night") : "First cue"}
              time={focus.next?.time || focus.current?.time || "—"}
              label={focus.next?.label || focus.current?.label || "No timeline yet"}
              notes={focus.next?.notes || focus.current?.notes || ""}
            />
            {focus.current && focus.live && (
              <p className="text-sm text-muted">
                Now / last: {focus.current.time} {focus.current.label}
              </p>
            )}
            <section className="space-y-2">
              <h2 className="text-sm uppercase tracking-widest text-faint">Up next</h2>
              {focus.rest.length === 0 && <p className="text-muted">Nothing else on the timeline.</p>}
              {focus.rest.map((item) => (
                <div key={item.id} className="flex gap-3 border-b border-line py-3">
                  <p className="w-20 shrink-0 tabular-nums text-accent">{item.time || "—"}</p>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    {item.notes && <p className="text-sm text-muted">{item.notes}</p>}
                  </div>
                </div>
              ))}
            </section>
            <section className="space-y-3">
              <h2 className="text-sm uppercase tracking-widest text-faint">Reception songs</h2>
              {event.details.reception
                .filter((row) => row.song || row.link)
                .map((row) => (
                  <SongLine key={row.id} label={row.label} value={row.song} artist={row.artist} link={row.link} cue={row.cue} />
                ))}
            </section>
            <Phones event={event} />
            {event.details.rest.requests && (
              <section>
                <h2 className="text-sm uppercase tracking-widest text-faint">Special requests</h2>
                <p className="mt-2 whitespace-pre-wrap text-base">{event.details.rest.requests}</p>
              </section>
            )}
            <p className="text-sm text-faint">
              {cached ? `On this phone ${relativeTime(cached.savedAt)}` : "Not saved on this phone yet"}
            </p>
          </div>
        )}

        {tab === "ceremony" && (
          <div className="space-y-4">
            <h1 className="font-display text-4xl">Ceremony</h1>
            <CueCard
              kicker="Start"
              time={event.details.day.ceremonyStart || "—"}
              label={event.details.day.ceremonyLocation || event.venue}
              notes={[event.details.day.coordinatorName, event.details.day.coordinatorPhone].filter(Boolean).join(" · ") ? `Coordinator · ${[event.details.day.coordinatorName, event.details.day.coordinatorPhone].filter(Boolean).join(" · ")}` : ""}
            />
            {event.details.day.liveMusicians && (
              <p className="text-sm text-muted">Live musicians · {event.details.day.liveMusicians}</p>
            )}
            {event.details.ceremony.family.map((row) => (
              <SongLine key={row.id} label={row.label} value={row.value} />
            ))}
            {event.details.ceremony.music.map((row) => (
              <SongLine key={row.id} label={row.label} value={row.song} artist={row.artist} link={row.link} cue={row.cue} />
            ))}
          </div>
        )}

        {tab === "reception" && (
          <div className="space-y-6">
            <h1 className="font-display text-4xl">Reception</h1>
            <section className="space-y-3">
              <h2 className="text-sm uppercase tracking-widest text-faint">Toasts</h2>
              {event.details.toasts.map((row) => (
                <div key={row.id} className="border-b border-line py-3">
                  <p className="text-sm text-faint">{row.label}</p>
                  <p className="font-display text-2xl">{row.value || "Name not set"}</p>
                </div>
              ))}
            </section>
            <section className="space-y-3">
              <h2 className="text-sm uppercase tracking-widest text-faint">Songs</h2>
              {event.details.reception.map((row) => (
                <SongLine key={row.id} label={row.label} value={row.song} artist={row.artist} link={row.link} cue={row.cue} />
              ))}
            </section>
            <section className="space-y-3">
              <h2 className="text-sm uppercase tracking-widest text-faint">Introductions</h2>
              {(event.details.introductions.bridesmaidCount || event.details.introductions.groomsmanCount) && (
                <p className="text-sm text-muted">
                  {event.details.introductions.bridesmaidCount || "0"} bridesmaids · {event.details.introductions.groomsmanCount || "0"} groomsmen, plus maid of honor and best man
                </p>
              )}
              {event.details.introductions.style === "group" && event.details.introductions.groupAnnounce === "title" && (
                <p className="font-display text-3xl">Announce {event.details.introductions.groupTitle}</p>
              )}
              {event.details.introductions.style === "couples" &&
                event.details.introductions.pairs.map((pair, index) => (
                  <div key={pair.id} className="border-b border-line py-3">
                    <p className="text-sm text-faint">{index + 1}. Couple</p>
                    <p className="font-display text-2xl">
                      {[pair.leftName, pair.rightName].filter(Boolean).join(" and ") || "Names not set"}
                    </p>
                    <p className="text-sm text-muted">
                      {pair.leftRole}
                      {pair.rightRole ? ` with ${pair.rightRole}` : ""}
                    </p>
                  </div>
                ))}
              {event.details.introductions.style === "group" &&
                event.details.introductions.groupAnnounce === "names" &&
                event.details.introductions.names.map((person, index) => (
                  <div key={person.id} className="border-b border-line py-3">
                    <p className="text-sm text-faint">
                      {index + 1}. {person.role}
                    </p>
                    <p className="font-display text-2xl">{person.name || "Name not set"}</p>
                  </div>
                ))}
              {event.details.introductions.parents === "no" && (
                <p className="text-sm text-muted">Parents are not announced</p>
              )}
              {event.details.introductions.parents === "yes" && event.details.introductions.brideParents && (
                <div className="border-b border-line py-3">
                  <p className="text-sm text-faint">Parents of the bride</p>
                  <p className="font-display text-2xl">{event.details.introductions.brideParents}</p>
                </div>
              )}
              {event.details.introductions.parents === "yes" && event.details.introductions.groomParents && (
                <div className="border-b border-line py-3">
                  <p className="text-sm text-faint">Parents of the groom</p>
                  <p className="font-display text-2xl">{event.details.introductions.groomParents}</p>
                </div>
              )}
              {event.details.introductions.others.map((person) => (
                <div key={person.id} className="border-b border-line py-3">
                  <p className="text-sm text-faint">{person.role}</p>
                  <p className={person.skip ? "font-display text-2xl text-faint line-through" : "font-display text-2xl"}>
                    {person.skip ? "Do not announce" : person.name || "Name not set"}
                  </p>
                </div>
              ))}
              <div className="rounded-2xl border border-accent bg-surface p-4">
                <p className="text-sm text-accent">Announce the couple</p>
                <p className="font-display text-3xl">{event.details.introductions.coupleAnnounce || "Introduction not set"}</p>
              </div>
            </section>
            {event.details.rest.blessing && (
              <p className="text-muted">Blessing · {event.details.rest.blessing}</p>
            )}
          </div>
        )}

        {tab === "timeline" && (
          <div className="space-y-2">
            <h1 className="mb-3 font-display text-4xl">Timeline</h1>
            {event.details.rest.timelinePdfName && (
              <button type="button" className="btn mb-3 w-full" onClick={() => void openTimelinePdf(event)}>
                {event.details.rest.timelinePdfName}
              </button>
            )}
            {event.details.rest.timeline.map((item) => {
              const done = checks.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleCheck(item.id)}
                  className="flex w-full gap-3 rounded-2xl border border-line bg-surface px-4 py-4 text-left"
                >
                  <span className={done ? "mt-1 size-4 shrink-0 rounded-full bg-accent" : "mt-1 size-4 shrink-0 rounded-full border border-line"} />
                  <span>
                    <span className="block text-sm tabular-nums text-accent">{item.time || "—"}</span>
                    <span className={done ? "block font-display text-2xl text-faint line-through" : "block font-display text-2xl"}>
                      {item.label || "Untitled"}
                    </span>
                    {item.notes && <span className="block text-sm text-muted">{item.notes}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {tab === "music" && (
          <div className="space-y-6">
            <h1 className="font-display text-4xl">Music</h1>
            {event.details.taste.playlists?.filter((row) => row.link.trim() || row.name.trim()).map((row) => (
              <section key={row.id}>
                <h2 className="text-sm uppercase tracking-widest text-faint">{row.name || "Playlist"}</h2>
                {row.link.trim() && (
                  <a href={row.link} target="_blank" rel="noreferrer" className="mt-2 block text-lg underline">
                    {row.link}
                  </a>
                )}
              </section>
            ))}
            {event.details.taste.doNotPlay && (
              <section>
                <h2 className="text-sm uppercase tracking-widest text-danger">Do not play</h2>
                <p className="mt-2 whitespace-pre-wrap">{event.details.taste.doNotPlay}</p>
              </section>
            )}
            {event.details.taste.brideArtists && (
              <section>
                <h2 className="text-sm uppercase tracking-widest text-faint">Bride's artists</h2>
                <p className="mt-2 whitespace-pre-wrap">{event.details.taste.brideArtists}</p>
              </section>
            )}
            {event.details.taste.groomArtists && (
              <section>
                <h2 className="text-sm uppercase tracking-widest text-faint">Groom's artists</h2>
                <p className="mt-2 whitespace-pre-wrap">{event.details.taste.groomArtists}</p>
              </section>
            )}
            <p className="text-sm text-muted">
              {[
                event.details.taste.brideGrad && `Bride ${event.details.taste.brideGrad}`,
                event.details.taste.groomGrad && `Groom ${event.details.taste.groomGrad}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-sm text-muted">
              {event.details.taste.genres
                .filter((genre) => genre.rank.trim())
                .sort((a, b) => Number(a.rank) - Number(b.rank))
                .map((genre) => `${genre.rank}. ${genre.label}`)
                .join(" · ")}
            </p>
          </div>
        )}

        {tab === "notes" && (
          <div className="space-y-4">
            <h1 className="font-display text-4xl">Notes</h1>
            {event.details.rest.requests && (
              <p className="whitespace-pre-wrap rounded-2xl border border-line bg-surface p-4 text-base">
                {event.details.rest.requests}
              </p>
            )}
            {(event.details.rest.exitPlan || event.details.rest.alcohol) && (
              <p className="text-muted">
                {[event.details.rest.exitPlan && `Exit · ${event.details.rest.exitPlan}`, event.details.rest.alcohol && `Alcohol · ${event.details.rest.alcohol}`]
                  .filter(Boolean)
                  .join("\n")}
              </p>
            )}
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Booth notes · stay on this phone if the room drops</span>
              <textarea className="field" value={notes} onChange={(e) => onNotes(e.target.value)} />
            </label>
            <Phones event={event} />
          </div>
        )}
      </div>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface">
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === tab ? "min-h-14 px-1 text-xs text-accent" : "min-h-14 px-1 text-xs text-faint"}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function CueCard({
  kicker,
  time,
  label,
  notes,
}: {
  kicker: string;
  time: string;
  label: string;
  notes: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm uppercase tracking-widest text-accent">{kicker}</p>
      <p className="mt-2 font-display text-5xl tabular-nums">{time}</p>
      <p className="mt-1 font-display text-2xl">{label}</p>
      {notes && <p className="mt-2 text-muted">{notes}</p>}
    </div>
  );
}

function SongLine({
  label,
  value,
  artist = "",
  link = "",
  cue = "",
}: {
  label: string;
  value: string;
  artist?: string;
  link?: string;
  cue?: string;
}) {
  const href = link.trim();
  if (!value.trim() && !artist.trim() && !href && !cue.trim()) return null;
  const title = [value.trim(), artist.trim()].filter(Boolean).join(" — ");
  const url = /^https?:\/\//i.test(href) ? href : href ? `https://${href}` : "";
  return (
    <div>
      <p className="text-sm text-faint">{label}</p>
      {title && <p className="font-display text-2xl">{title}</p>}
      {cue.trim() && <p className="text-sm text-muted">Start at {cue.trim()}</p>}
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="text-sm underline">
          Song link
        </a>
      )}
    </div>
  );
}

function Phones({ event }: { event: EventRecord }) {
  const phone = event.details.day.coordinatorPhone;
  const dial = phone.replace(/[^\d+]/g, "");
  if (!event.details.day.coordinatorName && !phone) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm uppercase tracking-widest text-faint">Call</h2>
      <div>
        <p className="text-sm text-faint">Coordinator</p>
        {event.details.day.coordinatorName && <p>{event.details.day.coordinatorName}</p>}
        {dial && (
          <a className="text-lg text-accent" href={`tel:${dial}`}>
            {phone}
          </a>
        )}
      </div>
    </section>
  );
}
