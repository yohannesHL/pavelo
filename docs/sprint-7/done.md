# Sprint 7 — Visual Intelligence Components — Done

## Summary

Sprint 7 delivers the full Visual Intelligence layer for Pavelo: 6 external data API wrappers, 8 interactive visualization components (4 maps + 4 charts), standalone intelligence pages, and 4 LangGraph agent tools that emit visual payloads into the chat.

## Deliverables

### Phase 1: External Data API Wrappers (S7-09) ✅
| Service | File | Data Source | Cache TTL |
|---------|------|-------------|-----------|
| Base utilities | `base.ts` | — | — |
| Police UK | `police.ts` | data.police.uk (real API) | 72hr |
| Ofsted | `ofsted.ts` | GIAS (deterministic mock) | 72hr |
| Land Registry | `land-registry.ts` | HM Land Registry (deterministic mock) | 48hr |
| ONS Census | `ons.ts` | ONS (deterministic mock) | 72hr |
| TravelTime | `traveltime.ts` | TravelTime API (real if key, else approx) | 24hr |
| Google Places | `places.ts` | Google Places (real if key, else mock) | 24hr |

All wrappers include:
- Typed response interfaces
- Exponential backoff with jitter (rate limiting)
- Redis caching with configurable TTL
- Graceful degradation with stale data notice
- tRPC endpoints via `intelligenceRouter`

### Phase 2: Map-Based Visuals (S7-01, S7-04, S7-05, S7-06) ✅
| Component | Task | Key Features |
|-----------|------|-------------|
| MapContainer | Shared | Dark-navy themed base, legend, controls, theme toggle |
| CrimeMap | S7-01 | Choropleth density, category filters, time range selector |
| SchoolMap | S7-04 | Ofsted rating pins, detail popup, type filter, catchment circles |
| TransportIsochrone | S7-05 | SVG polygon overlays, mode selector, time band labels |
| AmenityMap | S7-06 | Category clusters, POI popups with ratings, radius selector |

### Phase 3: Charts & Data Visuals (S7-02, S7-03, S7-07, S7-08) ✅
| Component | Task | Key Features |
|-----------|------|-------------|
| PriceHeatmap | S7-02 | Density dots with radial glow, price/sqft toggle |
| AreaDashboard | S7-03 | SVG radar chart, score bars, deprivation index, demographics |
| PriceHistoryChart | S7-07 | SVG area chart with gradient fill, YoY change, sales list |
| MarketTrendDashboard | S7-08 | Multi-series line chart, forecast band, index cards |

### Phase 4: Agent Visual Tools (S7-10) ✅
| Tool | API Endpoint | Visual Payload |
|------|-------------|----------------|
| `get_area_stats` | `intelligence.areaStats` | `area_dashboard` |
| `get_crime_data` | `intelligence.crime` | `crime_map` |
| `get_school_ratings` | `intelligence.schools` | `school_map` |
| `get_transport_links` | `intelligence.isochrones` | `transport_isochrone` |

### Standalone Pages ✅
- `/intelligence/crime` — Crime map with demo data
- `/intelligence/area/[postcode]` — Area statistics dashboard
- `/intelligence/market` — Market trend dashboard

### Visual Payload Integration ✅
All 8 new visual types are integrated into the `VisualPayloadRenderer`, enabling inline rendering in the chat interface when the agent emits visual directives.

## Design Decisions

1. **SVG charts over Recharts**: Used pure SVG for all charts (area, line, radar) to avoid adding a new dependency. Architecture supports easy swap to Recharts when installed.
2. **Deterministic mock data**: For APIs without free/public endpoints (Ofsted, Land Registry, ONS), we generate realistic data deterministically from location coordinates. This provides consistent demo experiences and falls through to real APIs when credentials are available.
3. **Graceful degradation**: All external wrappers use a cache-first strategy with stale data fallback. If an API fails and cached data exists (even expired), it's returned with a `stale: true` flag.
4. **Compact mode**: All visual components support a `compact` prop for inline chat rendering (smaller height, fewer details) vs standalone page rendering (full height, all details).

## Files Changed

### New Files (28)
- `apps/api/src/services/external/` — 7 files (base, police, ofsted, land-registry, ons, traveltime, places, index)
- `apps/api/src/routes/intelligence.ts` — tRPC router
- `apps/web/src/components/intelligence/` — 9 files (map-container, crime-map, school-map, transport-isochrone, amenity-map, price-heatmap, area-dashboard, price-history-chart, market-trend-dashboard, index)
- `apps/web/src/app/intelligence/` — 3 pages (crime, area/[postcode], market)
- `services/agent/src/tools/` — 4 files (get_area_stats, get_crime_data, get_school_ratings, get_transport_links)
- `docs/sprint-7/` — 2 files (progress.md, done.md)

### Modified Files (4)
- `apps/api/src/router.ts` — wired intelligence router
- `packages/shared/src/types/agent.ts` — 8 new VisualPayloadType values
- `apps/web/src/components/chat/visual-payload-renderer.tsx` — handles all S7 visual types
- `services/agent/src/tools/__init__.py` — exports S7 tools
