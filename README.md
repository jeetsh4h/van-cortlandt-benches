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

- The 11 bench coordinates are [OpenStreetMap](https://www.openstreetmap.org/copyright) `amenity=bench` nodes retrieved on September 22, 2026 and checked against the [Van Cortlandt Park boundary](https://www.arcgis.com/home/item.html?id=e4b99c9fc23b417781faaa908e6d7bee). This is an incomplete public inventory and must be field-verified before real use.
- The [VCPA bench inventory](https://www.arcgis.com/home/item.html?id=406d8f819d3f4733981a3566eefd0152) has point, adoption, plaque, and two-sided bench fields, but public record queries are disabled. Ask VCPA for an authorized export before production; no restricted records were copied.
- NYC Parks' inspection inventory confirms bench types across many X092 sub-sites, but its rows are feature types rather than individual benches and have no point coordinates. Do not convert those rows or site centroids into bench locations.
- Bench IDs, area labels, adopter names, plaque messages, adoption dates, contribution amounts, payment methods, and receipts are POC fixtures. None are represented as VCPA or NYC Parks records. The reseed migration intentionally removes all earlier POC submissions.
- The three area images are AI-generated illustrations, not photographs of the mapped benches. Replace them with field-verified photos before launch.
- The favicon and header mark use the [Van Cortlandt Park Alliance site icon](https://vancortlandt.org/wp-content/uploads/2019/10/cropped-site-icon-270x270.png) for this POC; confirm brand permission before launch.
- Source IDs remain in `benches.source_reference` for auditing.

## Contribution model

- The floor is $3,500 for 10 years, following the [Van Cortlandt Park Alliance bench FAQ](https://vancortlandt.org/bench/). Terms run from 10–99 years; each additional year adds $350 to the minimum. Optional donations are recorded separately. The FAQ’s seven-line plaque limit is paired with a 160-character limit and live wrapping in this POC.
- Payment is mocked. Card, bank transfer, Zelle, check or money order, stock, and donor-advised fund are presentation options; no financial details or funds are collected. The broader transfer options are informed by the [Central Park Conservancy adoption flow](https://www.centralparknyc.org/giving/adopt-a-bench).
- Patrons may contribute more than the floor and hide their name publicly. Private contribution records are not readable through the anonymous API; the public bench query returns `Anonymous patron` instead.

## Behavior

- Adoption state is derived from `adoption_start` and `adoption_end`; there is no adopted flag.
- Terms use whole years. The adoption end keeps the start month and day, clamping leap-day adoptions when needed.
- Starting an adoption creates an atomic 10-minute hold. Other visitors see the hold within the 15-second availability refresh and cannot adopt through the database RPC.
- A separate, non-sensitive update table triggers Supabase Realtime refreshes without exposing contribution receipts.
- An expired hold replaces the form with a short status transition, then returns the visitor to the bench details.

## Before production

Connect a reviewed payment provider and define the offline fulfillment process before launch. Add moderation, abuse protection, an authoritative bench inventory, verified photography, and a reviewed privacy policy before collecting public submissions. Keep writes behind the existing RPC functions; direct anonymous table access is blocked by RLS.
