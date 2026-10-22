import { Temporal } from "@js-temporal/polyfill";

export class BirthInputError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "BirthInputError";
    this.code = code;
    this.details = details;
  }
}
const fail = (code) => {
  throw new BirthInputError(code);
};
export const timeResolverVersion = "nilaza-time-v1-temporal-0.5.1";

/** Portable input validation. No silent UTC, noon, date overflow, or DST choice. */
export function resolveBirthInput(input) {
  if (!input || typeof input !== "object") fail("input_required");
  if (!Number.isInteger(input.revision) || input.revision < 1)
    fail("revision_required");
  if (!["exact", "approximate", "unknown"].includes(input.precision))
    fail("precision_required");
  if (typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    fail("invalid_date");
  let date;
  try {
    date = Temporal.PlainDate.from(input.date, { overflow: "reject" });
  } catch {
    fail("invalid_date");
  }
  if (date.year < 1900 || date.year > 2100) fail("date_out_of_supported_range");
  const place = input.place;
  if (
    !place ||
    place.confirmed !== true ||
    typeof place.id !== "string" ||
    !place.id.trim() ||
    typeof place.source !== "string" ||
    !place.source.trim()
  )
    fail("place_confirmation_required");
  if (
    !Number.isFinite(place.latitude) ||
    Math.abs(place.latitude) > 90 ||
    !Number.isFinite(place.longitude) ||
    Math.abs(place.longitude) > 180
  )
    fail("invalid_coordinates");
  // A named zone must be supplied by a confirmed place. Offset-only zones cannot represent historical rules.
  if (
    typeof place.timezone !== "string" ||
    !/^(UTC|[A-Za-z_]+\/[A-Za-z_+\-/0-9]+)$/.test(place.timezone) ||
    place.timezone.startsWith("Etc/")
  )
    fail("iana_timezone_required");
  try {
    Temporal.Now.instant().toZonedDateTimeISO(place.timezone);
  } catch {
    fail("invalid_timezone");
  }
  if (
    input.occurrence !== undefined &&
    !["earlier", "later"].includes(input.occurrence)
  )
    fail("invalid_occurrence");
  const provenance = {
    resolver: timeResolverVersion,
    timezone: place.timezone,
    // This runtime-derived value must travel with any future persisted calculation.
    tzdata: globalThis.process?.versions?.tz ?? "runtime_version_unavailable",
    icu: globalThis.process?.versions?.icu ?? "runtime_version_unavailable",
  };
  const location = {
    id: place.id,
    source: place.source,
    latitude: place.latitude,
    longitude: place.longitude,
    confirmed: true,
  };
  const common = {
    revision: input.revision,
    precision: input.precision,
    location,
    provenance,
  };
  if (input.precision === "unknown") {
    if (input.time != null && input.time !== "")
      fail("unknown_time_must_be_empty");
    if (
      input.occurrence !== undefined ||
      input.uncertaintyMinutes !== undefined
    )
      fail("unknown_time_options_conflict");
    const start = date.toZonedDateTime(place.timezone);
    if (!start.toPlainDate().equals(date)) fail("nonexistent_local_date");
    const end = date.add({ days: 1 }).toZonedDateTime(place.timezone);
    return {
      ...common,
      birthTimeKnown: false,
      utc: null,
      range: {
        start: start.toInstant().toString(),
        endExclusive: end.toInstant().toString(),
      },
      offsetSeconds: null,
      occurrence: null,
    };
  }
  if (
    typeof input.time !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)
  )
    fail("invalid_time");
  const plain = date.toPlainDateTime(Temporal.PlainTime.from(input.time));
  const earlier = plain.toZonedDateTime(place.timezone, {
    disambiguation: "earlier",
  });
  const later = plain.toZonedDateTime(place.timezone, {
    disambiguation: "later",
  });
  const candidates = [earlier, later].filter(
    (z, i, list) =>
      z.toPlainDateTime().equals(plain) &&
      list.findIndex((v) => v.epochNanoseconds === z.epochNanoseconds) === i,
  );
  if (!candidates.length) fail("nonexistent_local_time");
  if (candidates.length > 1 && !input.occurrence)
    throw new BirthInputError("ambiguous_local_time", {
      candidates: candidates.map((z) => ({
        utc: z.toInstant().toString(),
        offset: z.offset,
      })),
    });
  if (candidates.length === 1 && input.occurrence !== undefined)
    fail("occurrence_not_applicable");
  const chosen =
    input.occurrence === "later"
      ? candidates[candidates.length - 1]
      : candidates[0];
  if (
    input.expectedOffsetSeconds !== undefined &&
    input.expectedOffsetSeconds !== chosen.offsetNanoseconds / 1e9
  )
    fail("offset_conflicts_with_timezone");
  let range = null;
  if (input.precision === "approximate") {
    if (
      !Number.isInteger(input.uncertaintyMinutes) ||
      input.uncertaintyMinutes < 1 ||
      input.uncertaintyMinutes > 180
    )
      fail("uncertainty_minutes_required");
    const instant = chosen.toInstant();
    range = {
      start: instant.subtract({ minutes: input.uncertaintyMinutes }).toString(),
      endExclusive: instant
        .add({ minutes: input.uncertaintyMinutes })
        .toString(),
    };
  } else if (input.uncertaintyMinutes !== undefined)
    fail("exact_time_uncertainty_conflict");
  return {
    ...common,
    birthTimeKnown: true,
    utc: chosen.toInstant().toString(),
    range,
    offsetSeconds: chosen.offsetNanoseconds / 1e9,
    occurrence: input.occurrence ?? null,
  };
}
