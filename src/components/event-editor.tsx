import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { rid, alignSavedDetails } from "@/lib/events/defaults";
import { writePdfCache, clearPdfCache } from "@/lib/events/cache";
import { clearTimelinePdf, saveDetails, saveTimelinePdf } from "@/lib/events/server";
import { STATE_LABEL, scoreDetails } from "@/lib/events/completion";
import { errText, formatLongDate } from "@/lib/events/format";
import type { EventDetails, EventRecord, IntroPair, IntroPerson, NameLine, SectionId, SongCue, VendorLine } from "@/lib/events/types";
import { SECTIONS } from "@/lib/events/types";

const POLICY =
  "Song change requests made within 48 hours of the wedding day cannot be guaranteed. We will do everything possible to accommodate. Last-minute changes with multiple weddings in a weekend and not much turnaround time. We cannot always ensure that we can make changes last minute. Please be sure to text us if you have changed anything on this worksheet after our call a week before your wedding day. This page saves as you go, so we stay on the same page. Any questions, feel free to shoot us a text.";

function Text({
  label,
  value,
  onChange,
  area = false,
  short = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
  short?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      {area ? (
        <textarea className={short ? "field field-short" : "field"} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="field" value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

export function EventEditor({
  event,
  readOnly,
  onSaved,
}: {
  event: EventRecord;
  readOnly: boolean;
  onSaved: () => void;
}) {
  const [details, setDetails] = useState<EventDetails>(() => alignSavedDetails(event.details));
  const [active, setActive] = useState<SectionId | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const detailsRef = useRef(details);
  const sectionRef = useRef<SectionId>("day");
  const dirtyRef = useRef(false);
  detailsRef.current = details;
  dirtyRef.current = dirty;

  useEffect(() => {
    const next = alignSavedDetails(event.details);
    setDetails(next);
    setDirty(next !== event.details);
    setActive(null);
  }, [event.id]);

  useEffect(() => {
    const next = alignSavedDetails(detailsRef.current);
    if (next === detailsRef.current) return;
    setDetails(next);
    setDirty(true);
  }, [details]);

  useEffect(() => {
    if (!dirty || readOnly) return;
    const timer = window.setTimeout(() => {
      void persist(sectionRef.current);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [details, dirty, readOnly]);

  async function persist(section: SectionId) {
    if (readOnly || !dirtyRef.current) return;
    setSaveState("saving");
    const snapshot = detailsRef.current;
    try {
      await saveDetails({ data: { id: event.id, details: snapshot, section } });
      if (detailsRef.current === snapshot) {
        dirtyRef.current = false;
        setDirty(false);
        setSaveState("saved");
      }
      onSaved();
    } catch (error) {
      setSaveState("error");
      setSaveError(errText(error));
    }
  }

  function edit(section: SectionId, recipe: (current: EventDetails) => EventDetails) {
    sectionRef.current = section;
    setDetails((current) => recipe(current));
    setDirty(true);
    setSaveState("idle");
  }

  const score = scoreDetails(details, event.venue);
  const current = score.sections.find((section) => section.id === active);

  if (!active) {
    return (
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-4xl tabular-nums">{score.percent}%</p>
            <p className="text-sm text-muted">Planning complete</p>
          </div>
          <p className="text-sm text-faint">
            {readOnly ? "Locked" : saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Autosaves"}
          </p>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-accent" style={{ width: `${score.percent}%` }} />
        </div>
        <div className="space-y-2">
          {score.sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-4 text-left"
              onClick={() => setActive(section.id)}
            >
              <span className="text-base font-medium">{section.label}</span>
              <span className={section.state === "complete" ? "text-sm text-ok" : section.state === "progress" ? "text-sm text-accent" : "text-sm text-faint"}>
                {STATE_LABEL[section.state]}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="btn-line" onClick={() => setActive(null)}>
          <ChevronLeft className="size-4" /> Sections
        </button>
        <p className="text-sm text-faint">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Not saved" : current ? STATE_LABEL[current.state] : ""}
        </p>
      </div>
      <h2 className="font-display text-3xl">{SECTIONS.find((section) => section.id === active)?.label}</h2>
      {saveState === "error" && <p className="text-sm text-danger">{saveError}</p>}
      <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-70">
        {active === "day" && (
          <DayForm
            details={details}
            eventDate={event.eventDate}
            onChange={(day) => edit("day", (current) => ({ ...current, day }))}
          />
        )}
        {active === "ceremony" && (
          <CeremonyForm
            details={details}
            onChange={(ceremony) => edit("ceremony", (current) => ({ ...current, ceremony }))}
          />
        )}
        {active === "reception" && (
          <CeremonySongs
            rows={details.reception}
            onChange={(reception) => edit("reception", (current) => ({ ...current, reception }))}
          />
        )}
        {active === "toasts" && (
          <ToastList
            rows={details.toasts}
            linked={details.toasts.filter((row) => linkedToast(details, row.label)).map((row) => row.id)}
            onChange={(toasts) => edit("toasts", (current) => ({ ...current, toasts }))}
          />
        )}
        {active === "introductions" && (
          <IntroForm
            details={details}
            onChange={(introductions) => edit("introductions", (current) => ({ ...current, introductions }))}
          />
        )}
        {active === "taste" && (
          <TasteForm details={details} onChange={(taste) => edit("taste", (current) => ({ ...current, taste }))} />
        )}
        {active === "rest" && (
          <RestForm
            eventId={event.id}
            details={details}
            onChange={(rest) => edit("rest", (current) => ({ ...current, rest }))}
          />
        )}
      </fieldset>
      <button
        type="button"
        className="btn btn-block"
        onClick={() => {
          const index = SECTIONS.findIndex((section) => section.id === active);
          const next = SECTIONS[index + 1];
          void persist(active).then(() => setActive(next ? next.id : null));
        }}
      >
        Save and continue
      </button>
    </div>
  );
}

function DayForm({
  details,
  eventDate,
  onChange,
}: {
  details: EventDetails;
  eventDate: string | null;
  onChange: (day: EventDetails["day"]) => void;
}) {
  const day = details.day;
  const set = (key: keyof EventDetails["day"], value: string) => onChange({ ...day, [key]: value });
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Date of wedding · {formatLongDate(eventDate)}</p>
      <Text label="Couple" value={day.coupleNames} onChange={(value) => set("coupleNames", value)} />
      <Text label="Ceremony location" value={day.ceremonyLocation} onChange={(value) => set("ceremonyLocation", value)} />
      <Text label="Reception location" value={day.receptionLocation} onChange={(value) => set("receptionLocation", value)} />
      <Text label="Ceremony start time" value={day.ceremonyStart} onChange={(value) => set("ceremonyStart", value)} />
      <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm text-muted">Wedding coordinator, if you have one</p>
        <Text label="Name" value={day.coordinatorName} onChange={(value) => set("coordinatorName", value)} />
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Phone number</span>
          <input className="field" inputMode="tel" value={day.coordinatorPhone} onChange={(event) => set("coordinatorPhone", event.target.value)} />
        </label>
      </div>
      <Text label="Any live musicians" value={day.liveMusicians} onChange={(value) => set("liveMusicians", value)} />
    </div>
  );
}

function CeremonyForm({
  details,
  onChange,
}: {
  details: EventDetails;
  onChange: (ceremony: EventDetails["ceremony"]) => void;
}) {
  const ceremony = details.ceremony;
  return (
    <div className="space-y-5">
      <CeremonyNames rows={ceremony.family} onChange={(family) => onChange({ ...ceremony, family })} />
      <CeremonySongs split rows={ceremony.music} onChange={(music) => onChange({ ...ceremony, music })} />
    </div>
  );
}

function CeremonyNames({ rows, onChange }: { rows: NameLine[]; onChange: (rows: NameLine[]) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  return (
    <div>
      <p className="mb-2 text-sm text-muted">Parents and grandparents. Remove anyone who is not there.</p>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {rows.map((row, index) => (
          <div key={row.id} className="space-y-2 border-b border-line px-3 py-2 last:border-b-0">
            <input
              className="field"
              placeholder="Who"
              value={row.label}
              onChange={(event) => onChange(rows.map((item) => (item.id === row.id ? { ...item, label: event.target.value } : item)))}
            />
            <div className="flex items-center gap-2">
              <input
                ref={(node) => {
                  refs.current[index] = node;
                }}
                className="field"
                placeholder="Names"
                value={row.value}
                onChange={(event) => onChange(rows.map((item) => (item.id === row.id ? { ...item, value: event.target.value } : item)))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    refs.current[index + 1]?.focus();
                  }
                }}
              />
              <button type="button" className="text-faint" aria-label="Remove" onClick={() => onChange(rows.filter((item) => item.id !== row.id))}>
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn-line mt-2" onClick={() => onChange([...rows, { id: rid(), label: "", value: "" }])}>
        <Plus className="size-4" /> Add a name
      </button>
    </div>
  );
}

function linkedToast(details: EventDetails, label: string): boolean {
  const role = /maid of honor/i.test(label) ? /maid of honor/i : /best man/i.test(label) ? /best man/i : null;
  if (!role) return false;
  const intro = details.introductions;
  return (
    intro.pairs.some((pair) => (role.test(pair.leftRole) && pair.leftName.trim()) || (role.test(pair.rightRole) && pair.rightName.trim())) ||
    intro.names.some((row) => role.test(row.role) && row.name.trim())
  );
}

function ToastList({
  rows,
  linked,
  onChange,
}: {
  rows: NameLine[];
  linked: string[];
  onChange: (rows: NameLine[]) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const patch = (id: string, next: Partial<NameLine>) => onChange(rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  return (
    <div>
      <p className="mb-2 text-sm text-muted">Toasts, in the order they happen. Maid of honor and best man come from Introductions.</p>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {rows.map((row, index) => (
          <div key={row.id} className="flex items-center gap-2 border-b border-line px-3 py-2 last:border-b-0">
            <input className="field w-32 shrink-0" placeholder="Who" value={row.label} onChange={(event) => patch(row.id, { label: event.target.value })} />
            <input
              ref={(node) => {
                refs.current[index] = node;
              }}
              className="field"
              placeholder="Name"
              readOnly={linked.includes(row.id)}
              value={row.value}
              onChange={(event) => patch(row.id, { value: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  refs.current[index + 1]?.focus();
                }
              }}
            />
            <button type="button" className="text-faint" aria-label="Remove" onClick={() => onChange(rows.filter((item) => item.id !== row.id))}>
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-line mt-2" onClick={() => onChange([...rows, { id: rid(), label: "", value: "" }])}>
        <Plus className="size-4" /> Add a toast
      </button>
    </div>
  );
}

function CeremonySongs({ rows, onChange, split = false }: { rows: SongCue[]; onChange: (rows: SongCue[]) => void; split?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const patch = (id: string, next: Partial<SongCue>) => onChange(rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  return (
    <div>
      <p className="mb-2 text-sm text-muted">
        {split
          ? "Each moment has the song, the artist, and the link."
          : "Type the song and press enter for the next. Artist, the song link, and where to start sit on the open row."}
      </p>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {rows.map((row, index) => {
          const open = openId === row.id || Boolean(row.cue.trim() || (!split && (row.artist.trim() || row.link.trim())));
          return (
            <div key={row.id} className="border-b border-line px-3 py-2 last:border-b-0">
              <div className="flex items-center gap-2">
                <input
                  className="field"
                  placeholder="Moment"
                  value={row.label}
                  onChange={(event) => patch(row.id, { label: event.target.value })}
                />
                <button type="button" className="text-faint" aria-label="Remove" onClick={() => onChange(rows.filter((item) => item.id !== row.id))}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              {/^moonlight dance$/i.test(row.label.trim()) && (
                <p className="mt-1 text-sm text-muted">
                  A dance just between the bride and groom at the end of the night. Typical while everyone is going outside to line up for the exit.
                </p>
              )}
              {split ? (
                <>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <input
                      ref={(node) => {
                        refs.current[index] = node;
                      }}
                      className="field"
                      placeholder="Song"
                      value={row.song}
                      onChange={(event) => patch(row.id, { song: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          refs.current[index + 1]?.focus();
                        }
                      }}
                    />
                    <input className="field" placeholder="Artist" value={row.artist} onChange={(event) => patch(row.id, { artist: event.target.value })} />
                  </div>
                  <input className="field mt-2" placeholder="Song link" value={row.link} onChange={(event) => patch(row.id, { link: event.target.value })} />
                  <input className="field mt-2" placeholder="Start at" value={row.cue} onChange={(event) => patch(row.id, { cue: event.target.value })} />
                </>
              ) : (
                <input
                  ref={(node) => {
                    refs.current[index] = node;
                  }}
                  className="field mt-1"
                  placeholder="Song"
                  value={row.song}
                  onFocus={() => setOpenId(row.id)}
                  onChange={(event) => patch(row.id, { song: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      const next = refs.current[index + 1];
                      if (next) {
                        setOpenId(rows[index + 1]?.id ?? null);
                        next.focus();
                      }
                    }
                  }}
                />
              )}
              {open && !split && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input className="field" placeholder="Artist" value={row.artist} onChange={(event) => patch(row.id, { artist: event.target.value })} />
                  <input className="field" placeholder="Start at" value={row.cue} onChange={(event) => patch(row.id, { cue: event.target.value })} />
                  <input
                    className="field col-span-2"
                    placeholder="Song link"
                    value={row.link}
                    onChange={(event) => patch(row.id, { link: event.target.value })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="btn-line mt-2"
        onClick={() => onChange([...rows, { id: rid(), label: "", song: "", artist: "", link: "", cue: "" }])}
      >
        <Plus className="size-4" /> Add a song
      </button>
    </div>
  );
}

function IntroForm({
  details,
  onChange,
}: {
  details: EventDetails;
  onChange: (introductions: EventDetails["introductions"]) => void;
}) {
  const intro = details.introductions;
  const pairs = Array.isArray(intro.pairs) ? intro.pairs : [];
  const names = Array.isArray(intro.names) ? intro.names : [];
  const others = Array.isArray(intro.others) ? intro.others : [];
  const set = (next: Partial<EventDetails["introductions"]>) => onChange({ ...intro, pairs, names, others, ...next });
  const bridesmaids = partyCount(intro.bridesmaidCount);
  const groomsmen = partyCount(intro.groomsmanCount);
  const setCount = (key: "bridesmaidCount" | "groomsmanCount", raw: string) => {
    const clean = raw.replace(/[^\d]/g, "").slice(0, 2);
    const nextBridesmaids = partyCount(key === "bridesmaidCount" ? clean : intro.bridesmaidCount);
    const nextGroomsmen = partyCount(key === "groomsmanCount" ? clean : intro.groomsmanCount);
    const nextPairs = buildPairs(nextBridesmaids, nextGroomsmen, pairs);
    const nextNames =
      intro.style === "group" && intro.groupAnnounce === "names" ? buildNames(nextBridesmaids, nextGroomsmen, names, nextPairs) : names;
    set({ [key]: clean, pairs: intro.style === "couples" || pairs.length ? nextPairs : pairs, names: nextNames });
  };
  const pickCouples = () => {
    if (intro.style === "couples") {
      set({ style: "" });
      return;
    }
    const seeded = pairs.length ? pairs : pairsFrom(names);
    set({ style: "couples", pairs: buildPairs(bridesmaids, groomsmen, seeded) });
  };
  const pickGroup = (groupAnnounce: "names" | "title") => {
    if (intro.groupAnnounce === groupAnnounce) {
      set({ groupAnnounce: "" });
      return;
    }
    set({
      style: "group",
      groupAnnounce,
      names: groupAnnounce === "names" ? buildNames(bridesmaids, groomsmen, names, pairs) : names,
    });
  };
  const partyPairs = buildPairs(bridesmaids, groomsmen, pairs);
  const partyNames = buildNames(bridesmaids, groomsmen, names, partyPairs);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">How should the bridesmaids and groomsmen be introduced?</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={intro.style === "couples" ? "btn" : "btn-line"} onClick={pickCouples}>
          As couples
        </button>
        <button type="button" className={intro.style === "group" ? "btn" : "btn-line"} onClick={() => set({ style: intro.style === "group" ? "" : "group" })}>
          As a group
        </button>
      </div>
      {intro.style === "group" && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={intro.groupAnnounce === "names" ? "btn" : "btn-line"} onClick={() => pickGroup("names")}>
            Announce names
          </button>
          <button type="button" className={intro.groupAnnounce === "title" ? "btn" : "btn-line"} onClick={() => pickGroup("title")}>
            Just the group
          </button>
        </div>
      )}
      {intro.style === "group" && intro.groupAnnounce === "title" && (
        <Text label="Announce them as" value={intro.groupTitle} onChange={(groupTitle) => set({ groupTitle })} />
      )}
      <div className="grid grid-cols-2 gap-3">
        <CountField label="Bridesmaids" value={intro.bridesmaidCount || ""} onChange={(value) => setCount("bridesmaidCount", value)} />
        <CountField label="Groomsmen" value={intro.groomsmanCount || ""} onChange={(value) => setCount("groomsmanCount", value)} />
      </div>
      {intro.style === "couples" && <PairList locked rows={partyPairs} onChange={(next) => set({ pairs: next })} />}
      {intro.style === "group" && intro.groupAnnounce === "names" && <GroupNames rows={partyNames} onChange={(next) => set({ names: next })} />}
      <p className="pt-2 text-sm text-muted">Will the parents be introduced?</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={intro.parents === "yes" ? "btn" : "btn-line"} onClick={() => set({ parents: intro.parents === "yes" ? "" : "yes" })}>
          Yes
        </button>
        <button type="button" className={intro.parents === "no" ? "btn" : "btn-line"} onClick={() => set({ parents: intro.parents === "no" ? "" : "no" })}>
          No
        </button>
      </div>
      {intro.parents === "yes" && (
        <div className="space-y-3">
          <Text label="Parents of the bride" value={intro.brideParents} onChange={(brideParents) => set({ brideParents })} />
          <Text label="Parents of the groom" value={intro.groomParents} onChange={(groomParents) => set({ groomParents })} />
        </div>
      )}
      <PeopleList
        title="Also walking in"
        rows={others}
        addLabel="Add a person"
        onChange={(others) => set({ others })}
      />
      <Text label="How should the bride and groom be introduced?" value={intro.coupleAnnounce} onChange={(coupleAnnounce) => set({ coupleAnnounce })} />
    </div>
  );
}

function isHonorRole(role: string): boolean {
  return /maid of honor|best man/i.test(role);
}

function isHonorPair(row: IntroPair): boolean {
  return isHonorRole(row.leftRole) || isHonorRole(row.rightRole);
}

function findHonor(pairs: IntroPair[], names: IntroPerson[]): IntroPair {
  const pair = pairs.find(isHonorPair);
  if (pair) return { ...pair, leftRole: "Maid of honor", rightRole: "Best man" };
  return {
    id: rid(),
    leftRole: "Maid of honor",
    leftName: names.find((row) => /maid of honor/i.test(row.role))?.name || "",
    rightRole: "Best man",
    rightName: names.find((row) => /best man/i.test(row.role))?.name || "",
  };
}

function setHonor(
  pairs: IntroPair[],
  names: IntroPerson[],
  set: (next: Partial<EventDetails["introductions"]>) => void,
  side: "left" | "right",
  value: string,
) {
  const current = findHonor(pairs, names);
  const honor = side === "left" ? { ...current, leftName: value } : { ...current, rightName: value };
  const nextPairs = pairs.some((row) => row.id === honor.id) ? pairs.map((row) => (row.id === honor.id ? honor : row)) : [...pairs, honor];
  const nextNames = names.some((row) => isHonorRole(row.role))
    ? names.map((row) => {
        if (/maid of honor/i.test(row.role)) return { ...row, name: honor.leftName };
        if (/best man/i.test(row.role)) return { ...row, name: honor.rightName };
        return row;
      })
    : names;
  set({ pairs: nextPairs, names: nextNames });
}

function partyCount(value: string): number {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return 0;
  return Math.min(20, Math.floor(count));
}

function CountField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <input className="field" inputMode="numeric" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function blankPair(leftRole = "Bridesmaid", rightRole = "Groomsman"): IntroPair {
  return { id: rid(), leftRole, leftName: "", rightRole, rightName: "" };
}

function pairsFrom(names: IntroPerson[]): IntroPair[] {
  const moh = names.find((row) => /maid of honor/i.test(row.role));
  const best = names.find((row) => /best man/i.test(row.role));
  const brides = names.filter((row) => /bridesmaid/i.test(row.role));
  const grooms = names.filter((row) => /groomsman/i.test(row.role));
  const extra = Math.max(brides.length, grooms.length);
  return [
    ...Array.from({ length: extra }, (_, index) => ({
      id: rid(),
      leftRole: brides[index] ? "Bridesmaid" : "",
      leftName: brides[index]?.name || "",
      rightRole: grooms[index] ? "Groomsman" : "",
      rightName: grooms[index]?.name || "",
    })),
    { id: rid(), leftRole: "Maid of honor", leftName: moh?.name || "", rightRole: "Best man", rightName: best?.name || "" },
  ];
}

function buildPairs(bridesmaids: number, groomsmen: number, pairs: IntroPair[]): IntroPair[] {
  const honorIndex = pairs.findIndex(isHonorPair);
  const honor = honorIndex >= 0 ? pairs[honorIndex] : undefined;
  const rest = honorIndex >= 0 ? pairs.filter((_, index) => index !== honorIndex) : pairs.slice();
  const extra = Math.max(bridesmaids, groomsmen);
  return [
    ...Array.from({ length: extra }, (_, index) => ({
      id: rest[index]?.id || rid(),
      leftRole: index < bridesmaids ? "Bridesmaid" : "",
      leftName: index < bridesmaids ? rest[index]?.leftName || "" : "",
      rightRole: index < groomsmen ? "Groomsman" : "",
      rightName: index < groomsmen ? rest[index]?.rightName || "" : "",
    })),
    {
      id: honor?.id || rid(),
      leftRole: "Maid of honor",
      leftName: honor?.leftName || "",
      rightRole: "Best man",
      rightName: honor?.rightName || "",
    },
  ];
}

function buildNames(bridesmaids: number, groomsmen: number, names: IntroPerson[], pairs: IntroPair[]): IntroPerson[] {
  const source = names.length ? names : [];
  const pick = (role: RegExp) => source.filter((row) => role.test(row.role));
  const honor = pairs.find(isHonorPair);
  const rest = pairs.filter((row) => row !== honor);
  const line = (existing: IntroPerson | undefined, role: string, fallback = ""): IntroPerson => ({
    id: existing?.id || rid(),
    role,
    name: existing?.name || fallback,
    skip: false,
  });
  return [
    ...Array.from({ length: bridesmaids }, (_, index) => line(pick(/^bridesmaid$/i)[index], "Bridesmaid", rest[index]?.leftName || "")),
    ...Array.from({ length: groomsmen }, (_, index) => line(pick(/^groomsman$/i)[index], "Groomsman", rest[index]?.rightName || "")),
    line(pick(/maid of honor/i)[0], "Maid of honor", honor?.leftName || ""),
    line(pick(/best man/i)[0], "Best man", honor?.rightName || ""),
  ];
}

function PairList({ rows, onChange, locked = false }: { rows: IntroPair[]; onChange: (rows: IntroPair[]) => void; locked?: boolean }) {
  const patch = (id: string, next: Partial<IntroPair>) => onChange(rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.id} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <div className="grid grid-cols-2 gap-3">
            <Text label="Role" value={row.leftRole} onChange={(leftRole) => patch(row.id, { leftRole })} />
            <Text label="With" value={row.rightRole} onChange={(rightRole) => patch(row.id, { rightRole })} />
            <Text label="Name" value={row.leftName} onChange={(leftName) => patch(row.id, { leftName })} />
            <Text label="Name" value={row.rightName} onChange={(rightName) => patch(row.id, { rightName })} />
          </div>
          {!locked && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-line" disabled={index === 0} onClick={() => onChange(move(rows, index, -1))}>
                Up
              </button>
              <button type="button" className="btn-line" disabled={index === rows.length - 1} onClick={() => onChange(move(rows, index, 1))}>
                Down
              </button>
              <button type="button" className="btn-line" onClick={() => onChange(rows.filter((item) => item.id !== row.id))}>
                <Trash2 className="size-4" /> Remove
              </button>
            </div>
          )}
        </div>
      ))}
      {!locked && (
        <button type="button" className="btn-line btn-block" onClick={() => onChange([...rows, blankPair()])}>
          <Plus className="size-4" /> Add a couple
        </button>
      )}
    </div>
  );
}

function GroupNames({ rows, onChange }: { rows: IntroPerson[]; onChange: (rows: IntroPerson[]) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">Every person is listed. Type a name and press enter for the next.</p>
      {rows.map((row, index) => (
        <label key={row.id} className="flex items-center gap-2">
          <span className="w-32 shrink-0 text-sm text-muted">{row.role}</span>
          <input
            ref={(node) => {
              refs.current[index] = node;
            }}
            className="field"
            value={row.name}
            onChange={(event) => onChange(rows.map((item) => (item.id === row.id ? { ...item, name: event.target.value } : item)))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                refs.current[index + 1]?.focus();
              }
            }}
          />
        </label>
      ))}
    </div>
  );
}

function PeopleList({
  title,
  rows,
  addLabel,
  skip = true,
  locked = false,
  onChange,
}: {
  title?: string;
  rows: IntroPerson[];
  addLabel: string;
  skip?: boolean;
  locked?: boolean;
  onChange: (rows: IntroPerson[]) => void;
}) {
  const patch = (id: string, next: Partial<IntroPerson>) => onChange(rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  return (
    <div className="space-y-3">
      {title && <p className="pt-2 text-sm uppercase tracking-widest text-faint">{title}</p>}
      {rows.map((row, index) => (
        <div key={row.id} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <Text label="Role" value={row.role} onChange={(role) => patch(row.id, { role })} />
          <Text label="Name" value={row.name} onChange={(name) => patch(row.id, { name })} />
          {skip && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={row.skip} onChange={(event) => patch(row.id, { skip: event.target.checked })} />
              Do not announce
            </label>
          )}
          {!locked && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-line" disabled={index === 0} onClick={() => onChange(move(rows, index, -1))}>
                Up
              </button>
              <button type="button" className="btn-line" disabled={index === rows.length - 1} onClick={() => onChange(move(rows, index, 1))}>
                Down
              </button>
              <button type="button" className="btn-line" onClick={() => onChange(rows.filter((item) => item.id !== row.id))}>
                <Trash2 className="size-4" /> Remove
              </button>
            </div>
          )}
        </div>
      ))}
      {!locked && (
        <button type="button" className="btn-line btn-block" onClick={() => onChange([...rows, { id: rid(), role: "", name: "", skip: false }])}>
          <Plus className="size-4" /> {addLabel}
        </button>
      )}
    </div>
  );
}

function PlaylistForm({
  rows,
  onChange,
}: {
  rows: EventDetails["taste"]["playlists"];
  onChange: (rows: EventDetails["taste"]["playlists"]) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const patch = (id: string, next: Partial<EventDetails["taste"]["playlists"][number]>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  return (
    <div>
      <p className="mb-2 text-sm text-muted">Share with your Hitman. Any playlists you would like to send.</p>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {rows.map((row, index) => (
          <div key={row.id} className="space-y-2 border-b border-line px-3 py-2 last:border-b-0">
            <div className="flex items-center gap-2">
              <input className="field" placeholder="Playlist name, like cocktail/dinner or dance" value={row.name} onChange={(event) => patch(row.id, { name: event.target.value })} />
              <button type="button" className="text-faint" aria-label="Remove" onClick={() => onChange(rows.filter((item) => item.id !== row.id))}>
                <Trash2 className="size-4" />
              </button>
            </div>
            <input
              ref={(node) => {
                refs.current[index] = node;
              }}
              className="field"
              placeholder="Playlist link"
              value={row.link}
              onChange={(event) => patch(row.id, { link: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  refs.current[index + 1]?.focus();
                }
              }}
            />
          </div>
        ))}
      </div>
      <button type="button" className="btn-line mt-2" onClick={() => onChange([...rows, { id: rid(), name: "", link: "" }])}>
        <Plus className="size-4" /> Add a playlist
      </button>
    </div>
  );
}

function TasteForm({
  details,
  onChange,
}: {
  details: EventDetails;
  onChange: (taste: EventDetails["taste"]) => void;
}) {
  const taste = details.taste;
  const genres = [...taste.genres].sort((a, b) => {
    const ar = a.rank.trim();
    const br = b.rank.trim();
    if (!ar && !br) return 0;
    if (!ar) return 1;
    if (!br) return -1;
    return Number(ar) - Number(br);
  });
  const setGenres = (next: typeof genres) =>
    onChange({ ...taste, genres: next.map((genre, index) => ({ ...genre, rank: String(index + 1) })) });
  return (
    <div className="space-y-5">
      <PlaylistForm
        rows={taste.playlists ?? []}
        onChange={(playlists) => onChange({ ...taste, playlists })}
      />
      <Text label="Do not play" area value={taste.doNotPlay} onChange={(doNotPlay) => onChange({ ...taste, doNotPlay })} />
      <div className="grid grid-cols-2 gap-3">
        <Text label="Bride's artists" area short value={taste.brideArtists} onChange={(brideArtists) => onChange({ ...taste, brideArtists })} />
        <Text label="Groom's artists" area short value={taste.groomArtists} onChange={(groomArtists) => onChange({ ...taste, groomArtists })} />
        <Text label="Bride's grad year" value={taste.brideGrad} onChange={(brideGrad) => onChange({ ...taste, brideGrad })} />
        <Text label="Groom's grad year" value={taste.groomGrad} onChange={(groomGrad) => onChange({ ...taste, groomGrad })} />
      </div>
      <p className="pt-2 text-sm text-muted">Genres, most wanted at the top. Move a row instead of numbering it.</p>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {genres.map((genre, index) => (
          <div key={genre.id} className="flex items-center gap-2 border-b border-line px-3 py-2 last:border-b-0">
            <span className="w-5 tabular-nums text-sm text-faint">{index + 1}</span>
            <span className="min-w-0 flex-1 text-sm">{genre.label}</span>
            <button type="button" className="btn-line" disabled={index === 0} onClick={() => setGenres(move(genres, index, -1))}>
              Up
            </button>
            <button type="button" className="btn-line" disabled={index === genres.length - 1} onClick={() => setGenres(move(genres, index, 1))}>
              Down
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RestForm({
  eventId,
  details,
  onChange,
}: {
  eventId: string;
  details: EventDetails;
  onChange: (rest: EventDetails["rest"]) => void;
}) {
  const rest = details.rest;
  const set = (key: "longestMarried" | "exitPlan" | "alcohol" | "blessing" | "requests", value: string) =>
    onChange({ ...rest, [key]: value });
  return (
    <div className="space-y-5">
      <Text label="Longest married couple, with how many years" value={rest.longestMarried} onChange={(value) => set("longestMarried", value)} />
      <div className="space-y-2">
        <p className="text-sm text-muted">Sparkler or glow stick exit?</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={rest.exitPlan === "Sparkler" ? "btn" : "btn-line"} onClick={() => set("exitPlan", rest.exitPlan === "Sparkler" ? "" : "Sparkler")}>
            Sparkler
          </button>
          <button type="button" className={rest.exitPlan === "Glow sticks" ? "btn" : "btn-line"} onClick={() => set("exitPlan", rest.exitPlan === "Glow sticks" ? "" : "Glow sticks")}>
            Glow sticks
          </button>
        </div>
        {rest.exitPlan && rest.exitPlan !== "Sparkler" && rest.exitPlan !== "Glow sticks" && (
          <input className="field" value={rest.exitPlan} onChange={(event) => set("exitPlan", event.target.value)} />
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted">Will alcohol be served?</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={rest.alcohol === "Yes" ? "btn" : "btn-line"} onClick={() => set("alcohol", rest.alcohol === "Yes" ? "" : "Yes")}>
            Yes
          </button>
          <button type="button" className={rest.alcohol === "No" ? "btn" : "btn-line"} onClick={() => set("alcohol", rest.alcohol === "No" ? "" : "No")}>
            No
          </button>
        </div>
        {rest.alcohol && rest.alcohol !== "Yes" && rest.alcohol !== "No" && (
          <input className="field" value={rest.alcohol} onChange={(event) => set("alcohol", event.target.value)} />
        )}
      </div>
      <Text label="Who will say the blessing before dinner?" value={rest.blessing} onChange={(value) => set("blessing", value)} />
      <VendorList rows={rest.vendors} onChange={(vendors) => onChange({ ...rest, vendors })} />
      <Text label="Special requests" area value={rest.requests} onChange={(value) => set("requests", value)} />
      <TimelinePdf
        eventId={eventId}
        name={rest.timelinePdfName || ""}
        onName={(timelinePdfName) => onChange({ ...rest, timelinePdfName })}
      />
      <p className="text-sm text-muted">{POLICY}</p>
    </div>
  );
}

function VendorList({ rows, onChange }: { rows: VendorLine[]; onChange: (rows: VendorLine[]) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const patch = (id: string, next: Partial<VendorLine>) => onChange(rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  return (
    <div>
      <p className="mb-2 text-sm text-muted">Vendors. Type the name and press enter for the next.</p>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {rows.map((row, index) => (
          <div key={row.id} className="flex items-center gap-2 border-b border-line px-3 py-2 last:border-b-0">
            <input className="field w-32 shrink-0" placeholder="Vendor" value={row.role} onChange={(event) => patch(row.id, { role: event.target.value })} />
            <input
              ref={(node) => {
                refs.current[index] = node;
              }}
              className="field"
              placeholder="Name"
              value={row.name}
              onChange={(event) => patch(row.id, { name: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  refs.current[index + 1]?.focus();
                }
              }}
            />
            <button type="button" className="text-faint" aria-label="Remove" onClick={() => onChange(rows.filter((item) => item.id !== row.id))}>
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-line mt-2" onClick={() => onChange([...rows, { id: rid(), role: "", name: "" }])}>
        <Plus className="size-4" /> Add a vendor
      </button>
    </div>
  );
}

function TimelinePdf({
  eventId,
  name,
  onName,
}: {
  eventId: string;
  name: string;
  onName: (name: string) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const base64 = await fileToBase64(file);
      await saveTimelinePdf({ data: { id: eventId, name: file.name, base64 } });
      writePdfCache(eventId, file.name, base64);
      onName(file.name);
    } catch (reason) {
      setError(errText(reason));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await clearTimelinePdf({ data: { id: eventId } });
      clearPdfCache(eventId);
      onName("");
    } catch (reason) {
      setError(errText(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <label className={busy ? "btn-line pointer-events-none opacity-70" : "btn-line"}>
        Upload a PDF of your timeline
        <input
          className="sr-only"
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onFile(file);
          }}
        />
      </label>
      {name && (
        <p className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0 truncate">{name}</span>
          <button type="button" className="text-faint" onClick={() => void remove()} disabled={busy}>
            Remove
          </button>
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read that PDF"));
    reader.readAsDataURL(file);
  });
}

function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const next = index + dir;
  if (next < 0 || next >= list.length) return list;
  const copy = list.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}
