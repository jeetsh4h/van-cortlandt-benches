# Van Cortlandt Park benches

Map-first POC for viewing and adopting benches. Built with Next.js 16, Mapbox GL JS, Supabase, Tailwind CSS, and shadcn/ui conventions.

## Run

Set these in `.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
```

Then run:

```bash
pnpm install
pnpm supabase db push
pnpm dev
```

For deployment, add the same variables to the host and allow its URL in the Mapbox token restrictions.

## Data

- The 11 bench coordinates are [OpenStreetMap](https://www.openstreetmap.org/copyright) `amenity=bench` nodes retrieved on September 22, 2026 and checked against [NYC Parks property X092 geometry](https://data.cityofnewyork.us/Recreation/Parks-Properties/enfh-gkve). This is an incomplete public inventory and must be field-verified before real use.
- Bench IDs, area labels, adopter names, plaque messages, and the two initial adoptions are POC fixtures. They are not NYC Parks records.
- The three area images are AI-generated illustrations, not photographs of the mapped benches. Replace them with field-verified photos before launch.
- Source IDs remain in `benches.source_reference` for auditing.

## Contribution model

- The floor is $3,500 for an existing bench and the standard term is 10 years, following the [Van Cortlandt Park Alliance bench FAQ](https://vancortlandt.org/bench/). Its plaque limit is seven lines; this POC adds a 160-character limit and live line wrapping so the proof remains legible.
- Payment is mocked. Card, bank transfer, Zelle, check or money order, stock, and donor-advised fund are presentation options; no financial details or funds are collected. The broader transfer options are informed by the [Central Park Conservancy adoption flow](https://www.centralparknyc.org/giving/adopt-a-bench).
- Patrons may contribute more than the floor and hide their name publicly. Private contribution records are not readable through the anonymous API; the public bench query returns `Anonymous patron` instead.

## Behavior

- Adoption state is derived from `adoption_start` and `adoption_end`; there is no adopted flag.
- Dates use calendar intervals. The day is preserved when possible and otherwise clamped to the target month’s final day.
- Starting an adoption creates an atomic 10-minute hold. Other visitors see the hold within the 15-second availability refresh and cannot adopt through the database RPC.
- A separate, non-sensitive update table triggers Supabase Realtime refreshes without exposing contribution receipts.

## Before production

Connect a reviewed payment provider and define the offline fulfillment process before launch. Add moderation, abuse protection, an authoritative bench inventory, verified photography, and a reviewed privacy policy before collecting public submissions. Keep writes behind the existing RPC functions; direct anonymous table access is blocked by RLS.
