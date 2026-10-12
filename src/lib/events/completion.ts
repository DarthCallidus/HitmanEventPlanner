import type { EventDetails, SectionId, SectionState } from "./types";
import { SECTIONS } from "./types";

export type SectionScore = {
  id: SectionId;
  label: string;
  state: SectionState;
};

function hasText(...values: string[]): boolean {
  return values.some((value) => value.trim().length > 0);
}

function stateOf(active: boolean, done: boolean): SectionState {
  if (done) return "complete";
  if (active) return "progress";
  return "empty";
}

export function scoreDetails(details: EventDetails, venue = ""): {
  percent: number;
  sections: SectionScore[];
  missing: string[];
} {
  const other = details.kind === "other";
  const day = details.day;
  const dayState = other
    ? stateOf(
        hasText(day.coupleNames, day.ceremonyLocation, day.ceremonyStart, day.endTime, day.coordinatorName, day.coordinatorPhone, venue),
        hasText(day.coupleNames) && hasText(day.ceremonyStart, day.ceremonyLocation, venue),
      )
    : stateOf(
        hasText(day.coupleNames, day.ceremonyLocation, day.receptionLocation, day.ceremonyStart, day.coordinatorName, day.coordinatorPhone, day.liveMusicians, venue),
        hasText(day.coupleNames) && hasText(day.ceremonyStart) && hasText(day.ceremonyLocation, venue),
      );

  const ceremony = stateOf(
    details.ceremony.family.some((row) => hasText(row.value)) || details.ceremony.music.some((row) => hasText(row.song, row.link)),
    details.ceremony.music.some((row) => hasText(row.song, row.link)),
  );

  const reception = stateOf(
    details.reception.some((row) => hasText(row.song, row.artist, row.link)),
    details.reception.filter((row) => hasText(row.song, row.link)).length >= 2,
  );

  const intro = details.introductions;
  const introFilled =
    intro.style === "couples"
      ? intro.pairs.some((row) => hasText(row.leftName, row.rightName))
      : intro.style === "group" && intro.groupAnnounce === "names"
        ? intro.names.some((row) => hasText(row.name))
        : intro.style === "group" && intro.groupAnnounce === "title" && hasText(intro.groupTitle);
  const introductions = stateOf(
    Boolean(intro.style) || hasText(intro.coupleAnnounce) || intro.others.some((row) => hasText(row.name)),
    Boolean(introFilled) && hasText(intro.coupleAnnounce),
  );

  const toasts = stateOf(
    details.toasts.some((row) => hasText(row.label, row.value)),
    details.toasts.some((row) => hasText(row.value)),
  );

  const taste = details.taste;
  const lists = taste.playlists ?? [];
  const tasteState = other
    ? stateOf(
        hasText(taste.doNotPlay, taste.brideArtists) || taste.genres.some((genre) => hasText(genre.rank)) || lists.some((row) => hasText(row.name, row.link)),
        hasText(taste.doNotPlay, taste.brideArtists) || taste.genres.some((genre) => hasText(genre.rank)) || lists.some((row) => hasText(row.link)),
      )
    : stateOf(
        hasText(taste.doNotPlay, taste.brideArtists, taste.groomArtists, taste.brideGrad, taste.groomGrad) ||
          taste.genres.some((genre) => hasText(genre.rank)) ||
          lists.some((row) => hasText(row.name, row.link)),
        (hasText(taste.brideArtists, taste.groomArtists) && taste.genres.some((genre) => hasText(genre.rank))) || lists.some((row) => hasText(row.link)),
      );

  const rest = details.rest;
  const restState = other
    ? stateOf(hasText(rest.requests, rest.timelinePdfName ?? ""), hasText(rest.requests) || hasText(rest.timelinePdfName ?? ""))
    : stateOf(
        hasText(rest.longestMarried, rest.exitPlan, rest.alcohol, rest.blessing, rest.requests, rest.timelinePdfName ?? "") ||
          rest.vendors.some((row) => hasText(row.name)) ||
          rest.timeline.some((row) => hasText(row.label, row.time)),
        rest.timeline.filter((row) => hasText(row.label) && hasText(row.time)).length >= 3 || hasText(rest.timelinePdfName ?? ""),
      );

  const booth = details.booth360;
  const booth360 = stateOf(
    hasText(booth.when, booth.where, booth.start, booth.end, booth.notes),
    hasText(booth.where) && hasText(booth.start, booth.when),
  );

  const byId: Record<SectionId, SectionState> = {
    day: dayState,
    ceremony,
    reception,
    introductions,
    toasts,
    taste: tasteState,
    rest: restState,
    booth360,
  };

  const sections: SectionScore[] = SECTIONS.filter((section) => {
    if (section.id === "booth360") return details.booth360.enabled;
    if (other) return section.id === "day" || section.id === "taste" || section.id === "rest";
    return true;
  }).map((section) => ({
    id: section.id,
    label: other && section.id === "taste" ? "Music" : other && section.id === "rest" ? "Timeline and notes" : section.label,
    state: byId[section.id],
  }));
  const done = sections.filter((section) => section.state === "complete").length;
  const half = sections.filter((section) => section.state === "progress").length;
  const percent = Math.round(((done + half * 0.5) / sections.length) * 100);
  const missing = sections.filter((section) => section.state !== "complete").map((section) => section.label);
  return { percent, sections, missing };
}

export const STATE_LABEL: Record<SectionState, string> = {
  empty: "Not started",
  progress: "In progress",
  complete: "Complete",
};
