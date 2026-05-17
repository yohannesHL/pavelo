# Pavelo API Documentation

## Base URL

- **Development:** `http://localhost:4000`
- **tRPC prefix:** `/trpc`

## Authentication

All protected endpoints require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <supabase-jwt>
```

## Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "version": "0.3.0",
  "uptime": 12345.67,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## tRPC Routes

### Search

#### `search.query` (Public)

Hybrid property search — semantic + structured filters.

**Input:**
```typescript
{
  query: string;           // Natural language search query
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    minBedrooms?: number;
    maxBedrooms?: number;
    propertyType?: "detached" | "semi_detached" | "terraced" | "flat" | "bungalow" | "cottage" | "mansion";
    city?: string;
    postcode?: string;
    status?: "for_sale" | "under_offer" | "sold_stc" | "sold" | "withdrawn";
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  };
  topK?: number;           // Results per page (1-100, default: 20)
  cursor?: number;         // Offset for pagination
  sortBy?: "relevance" | "price_asc" | "price_desc" | "newest" | "bedrooms";
  excludeIds?: string[];
}
```

**Response:**
```typescript
{
  items: Property[];
  nextCursor: number | null;
  total: number;
  query: string;
  filtersApplied: Record<string, unknown>;
}
```

---

### Property

#### `property.list` (Public)

List properties with filters and pagination.

**Input:**
```typescript
{
  limit?: number;          // 1-50, default: 20
  cursor?: string;         // UUID cursor for pagination
  query?: string;          // Text search
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  minBedrooms?: number;
  maxBedrooms?: number;
  city?: string;
  postcode?: string;
  status?: string;
  sortBy?: "price" | "createdAt" | "bedrooms" | "squareFeet";
  sortOrder?: "asc" | "desc";
}
```

#### `property.get` (Public)

Get a single property by ID.

**Input:** `{ id: string }` (UUID)

#### `property.create` (Protected)

Create a new property listing.

#### `property.update` (Protected)

Update a property (owner only).

#### `property.delete` (Protected)

Soft-delete a property (owner only).

---

### Conversation

#### `conversation.create` (Protected)

Create a new chat conversation.

#### `conversation.list` (Protected)

List user's conversations.

#### `conversation.sendMessage` (Protected)

Send a message in a conversation.

---

### Voice

#### `voice.createSession` (Protected)

Create a LiveKit voice session with room token.

#### `voice.getMetrics` (Protected)

Get voice session metrics (TTFB, turn count, etc.).

---

### Agency

#### `agency.dashboard` (Protected)

Agency KPIs, leads, conversations.

#### `agency.leads.*`

Lead pipeline CRUD — create, update, list, delete.

#### `agency.analytics`

Conversation analytics — volume, intents, satisfaction.

---

### Other Routes

| Route | Description |
|---|---|
| `memory.getProfile` | Get consolidated user preferences |
| `viewing.book` | Book a property viewing |
| `viewing.list` | List viewing slots |
| `savedProperty.save` | Save property to board |
| `savedProperty.list` | List saved properties |
| `intelligence.crimeData` | Area crime statistics |
| `intelligence.schoolData` | School catchment data |
| `billing.createCheckout` | Stripe checkout session |
| `billing.getSubscription` | Current subscription |
| `push.subscribe` | Push notification subscription |

---

## REST Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service health check |
| GET | `/api/v1/metrics` | Observability metrics |
| GET | `/api/v1/search/cache-metrics` | Search cache performance |
| POST | `/api/v1/memory/profile` | Update user profile (internal) |
| GET | `/api/v1/viewings/slots` | Available viewing slots |
| POST | `/api/v1/viewings/book` | Book a viewing (internal) |
| POST | `/api/upload/image` | Image upload |

---

## Error Format

All tRPC errors follow this format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": -32004,
    "data": {
      "code": "NOT_FOUND",
      "httpStatus": 404,
      "path": "property.get"
    }
  }
}
```

## Rate Limiting

- **Global:** 100 requests/minute
- **Auth endpoints:** 10 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067260
```
