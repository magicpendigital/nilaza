# Nilaza local astrology core — review candidate

This package calculates chart geometry deterministically, without an AI or paid vendor call. It is not a certified astrology report service. `chart.schema.json` v0.2.0 and `validate.mjs` are the executable contract. The older `docs/A1_ASTROLOGY_CHART_CONTRACT_2026-09-20.json` remains a historical draft for the synthetic geometry fixture only; it is not the current calculator contract.

## Reproduce

From repository root after `npm ci --ignore-scripts`:

```sh
npm run astrology:contract:check
npm run astrology:core:test
npm run astrology:accuracy:check
npm run astrology:grid:check
npm run validate:astrology
```

Schema/time-table changes require `node scripts/generate-astrology-contract.mjs`. The generated ES module contains no dynamic compilation or Node runtime dependency and is consumed by Node, Metro and Hermes. AJV is a pinned build dependency. Do not edit the generated validator by hand.

## Conventions and evidence

- Astronomy Engine 2.1.19 (MIT); Temporal polyfill 0.5.1 (ISC). Preserve dependency license notices in distributed packages.
- Tropical zodiac, apparent geocentric true ecliptic of date, Whole Sign houses. ASC is the eastern horizon root and MC the upper meridian root; MC need not be the tenth-house cusp. Major aspects use unrounded longitudes and a versioned fixed orb policy.
- UTC birth input resolves with IANA timezone rules available to the runtime. No fixed modern offset is substituted for historical rules. Gaps fail; overlaps require earlier/later. Unknown time spans the actual local day, including 23/25-hour days. Approximate time retains an explicit interval. Uncertain inputs produce 15-minute sampled possibilities, not fabricated noon placements or rigorous interval bounds.
- `CivilAstroTime` applies USNO TAI−UTC history plus 32.184 seconds for TT from 1961 onward, preserving the policy during light-time iterations. Earlier dates use the engine's historical Delta-T model. UT1 is approximated by UTC; future leap seconds are held at the last published value. No global engine settings are mutated.
- Cached JPL Horizons references: 500 body longitudes at 50 UTC instants, 1900–2099, maximum observed difference **0.0050897315°**, threshold **0.01°**. This is sampled longitude evidence, not universal accuracy or a full-chart vendor certification. Raw responses and hashes are in `fixtures`; `accuracy-report.json` records the result.
- Separate scalar sidereal/obliquity cross-check: 50 charts across ten geographies, maximum ASC/MC difference **0.0208721016°**, threshold **0.1°**. This is an independent calculation method, not an external certified full-chart dataset. See `chart-grid-report.json`.
- Every runtime chart stays `candidate`, with approximate confidence and no per-chart accuracy certification. The conservative `independent_accuracy_not_verified` code refers to the individual/full chart; the reference suite does not certify arbitrary input.

## Place data

`places.json` contains 34,146 populated places from GeoNames cities15000, snapshot 2026-09-22, CC BY 4.0. Attribution appears in the input flow. Coordinates are settlement centers. Users confirm the selected place and timezone; an absent village or a timezone boundary is not silently guessed. Region names come from GeoNames admin1 codes.

Rebuild with `scripts/build-astrology-places.mjs` using the documented input paths in that script; do not replace the snapshot without checking the source hash and historical timezone behavior. GeoNames' Hanoi zone is `Asia/Bangkok`; it represents the catalog's zone assignment, not the user's current location. Pre-1970 regional history needs additional review. The app displays a historical-data caveat.

## Persistence and integration

The mobile flow saves acknowledged account-scoped local revisions. Input, UTC/range, coordinates and provenance travel together; edits create a new revision. Corrupt/inconsistent data is not silently overwritten. If a runtime timezone database update changes a historical resolution, the saved item is quarantined for export/review rather than silently recalculated. Export includes sensitive birth information only after the user's explicit action; the feature does not send it to analytics or AI.

Chat handoff has a narrow whitelist: Sun/Moon/Rising signs and reflective questions, no date/time/place/coordinates. Unknown/approximate input does not gain invented exact placements. Cloud persistence, authenticated endpoint/quota integration, native performance and store release remain separate gates. The blocked Supabase migration ledger has not been bypassed.

## Primary references

- [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- [USNO terrestrial time](https://aa.usno.navy.mil/faq/TT)
- [USNO TAI−UTC history](https://maia.usno.navy.mil/ser7/tai-utc.dat)
- [USNO sidereal-time formula](https://aa.usno.navy.mil/faq/GAST)
- [GeoNames data/license/field documentation](https://download.geonames.org/export/dump/readme.txt)

Astronomical position accuracy does not validate astrological interpretations as scientific predictions.
