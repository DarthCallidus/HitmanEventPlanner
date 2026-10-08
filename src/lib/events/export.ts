import type { EventRecord } from "./types";
import { formatLongDate, slugify } from "./format";

function cell(value: string): string {
  const clean = value.replace(/\r?\n/g, " ").trim();
  if (/[",]/.test(clean)) return `"${clean.replace(/"/g, '""')}"`;
  return clean;
}

function rowsFor(event: EventRecord): Array<[string, string, string]> {
  const d = event.details;
  const rows: Array<[string, string, string]> = [
    ["Event", "Title", event.title],
    ["Event", "Date", formatLongDate(event.eventDate)],
    ["Event", "Venue", event.venue],
    ["Event", "Status", event.status],
    ["The day", "Couple", d.day.coupleNames],
    ["The day", "Ceremony location", d.day.ceremonyLocation],
    ["The day", "Reception location", d.day.receptionLocation],
    ["The day", "Ceremony start", d.day.ceremonyStart],
    ["The day", "Coordinator", d.day.coordinatorName],
    ["The day", "Coordinator phone", d.day.coordinatorPhone],
    ["The day", "Live musicians", d.day.liveMusicians],
  ];
  d.ceremony.family.forEach((row) => rows.push(["Ceremony", row.label, row.value]));
  d.ceremony.music.forEach((row) => {
    rows.push(["Ceremony", row.label, [row.song, row.artist, row.cue ? `Start at ${row.cue}` : "", row.link].filter(Boolean).join(" ")]);
  });
  d.toasts.forEach((row) => rows.push(["Toasts", row.label, row.value]));
  d.reception.forEach((row) => {
    rows.push(["Reception", row.label, [row.song, row.artist, row.cue ? `Start at ${row.cue}` : "", row.link].filter(Boolean).join(" ")]);
  });
  rows.push(["Introductions", "Bridesmaids", d.introductions.bridesmaidCount]);
  rows.push(["Introductions", "Groomsmen", d.introductions.groomsmanCount]);
  if (d.introductions.style === "group") {
    rows.push(["Introductions", "Group", d.introductions.groupAnnounce === "title" ? d.introductions.groupTitle : "Announce names"]);
  }
  d.introductions.pairs.forEach((row, index) => {
    rows.push([
      "Introductions",
      `${index + 1}. Couple`,
      `${row.leftRole} ${row.leftName} / ${row.rightRole} ${row.rightName}`.trim(),
    ]);
  });
  d.introductions.names.forEach((row, index) => {
    rows.push(["Introductions", `${index + 1}. ${row.role}`, row.name]);
  });
  rows.push(["Introductions", "Parents introduced", d.introductions.parents]);
  rows.push(["Introductions", "Parents of the bride", d.introductions.brideParents]);
  rows.push(["Introductions", "Parents of the groom", d.introductions.groomParents]);
  d.introductions.others.forEach((row) => {
    rows.push(["Introductions", row.role, row.skip ? "Do not announce" : row.name]);
  });
  rows.push(["Introductions", "Couple", d.introductions.coupleAnnounce]);
  rows.push(["Music taste", "Do not play", d.taste.doNotPlay]);
  rows.push(["Music taste", "Bride's artists", d.taste.brideArtists]);
  rows.push(["Music taste", "Groom's artists", d.taste.groomArtists]);
  rows.push(["Music taste", "Bride graduation", d.taste.brideGrad]);
  rows.push(["Music taste", "Groom graduation", d.taste.groomGrad]);
  d.taste.genres.forEach((genre) => rows.push(["Genres", genre.label, genre.rank]));
  (d.taste.playlists ?? []).forEach((row) => rows.push(["Music taste", row.name || "Playlist", row.link]));
  rows.push(["The rest", "Longest married", d.rest.longestMarried]);
  rows.push(["The rest", "Exit", d.rest.exitPlan]);
  rows.push(["The rest", "Alcohol", d.rest.alcohol]);
  rows.push(["The rest", "Blessing", d.rest.blessing]);
  d.rest.vendors.forEach((row) => rows.push(["Vendors", row.role, row.name]));
  rows.push(["The rest", "Requests", d.rest.requests]);
  if (d.rest.timelinePdfName) rows.push(["Timeline", "PDF", d.rest.timelinePdfName]);
  d.rest.timeline.forEach((item, index) => rows.push(["Timeline", `${index + 1}. ${item.time}`, `${item.label}. ${item.notes}`.trim()]));
  rows.push(["Notes", "Booth", event.boothNotes]);
  return rows;
}

export function eventToCsv(event: EventRecord): string {
  const lines = [["Section", "Field", "Value"].join(",")];
  for (const row of rowsFor(event)) lines.push(row.map(cell).join(","));
  return lines.join("\n");
}

export function eventToJson(event: EventRecord): string {
  return JSON.stringify(event, null, 2);
}

export function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function fileBase(event: EventRecord): string {
  const date = event.eventDate ?? "undated";
  return `${slugify(event.title)}-${date}`;
}
