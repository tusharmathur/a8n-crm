# A8N CRM — Architecture Overview

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Auth | NextAuth v5 beta (JWT, Credentials provider) |
| Database | Airtable REST API |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Notifications | Slack Web API + Incoming Webhooks |
| Charts | Recharts |
| Testing | Vitest + React Testing Library |
| Deployment | Vercel |

---

## Directory Structure

```
a8n-crm/
├── app/
│   ├── (protected)/          # Auth-gated pages (layout enforces session)
│   │   ├── accounts/
│   │   ├── campaigns/
│   │   ├── meetings/
│   │   ├── dashboard/
│   │   └── admin/
│   ├── api/                  # API routes
│   │   ├── accounts/
│   │   ├── campaigns/
│   │   ├── meetings/
│   │   ├── users/
│   │   ├── audit/
│   │   ├── client/           # Public, token-protected
│   │   ├── generate-background/
│   │   └── slack/
│   ├── client/               # Public client dashboard pages (token-protected)
│   ├── accounts/             # Public shareable account page
│   ├── login/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── dashboard/
│   ├── forms/
│   ├── layout/
│   ├── meetings/
│   ├── tables/
│   └── ui/
├── lib/                      # Utilities
│   ├── airtable.ts
│   ├── audit.ts
│   ├── slack.ts
│   ├── token.ts
│   └── utils.ts
├── types/
│   └── index.ts
├── __tests__/
├── proxy.ts                  # Auth middleware (named proxy, not middleware)
├── auth.ts                   # NextAuth config
└── Documentation/
```

---

## Data Model

All data lives in Airtable. There is no local database. The app communicates with Airtable via its REST API using a Personal Access Token.

**Base ID:** `appPpY4aZ9bOR8JVC`

### Tables

#### Accounts
Represents a client company that A8N is running campaigns for.

| Field | Type | Notes |
|---|---|---|
| Name | Text | Required |
| Status | Select | `Current` or `Past` |
| Website | URL | |
| Account Owner | Text | A8N team member responsible |
| Main Contact Name | Text | Primary contact at client |
| Address | Text | |
| Engagement Goals | Long text | |
| Dashboard Link | URL | Auto-generated with token on creation |
| Slack Channel | Text | e.g. `#client-acme` |

#### Campaigns
A LinkedIn outreach campaign run for an account.

| Field | Type | Notes |
|---|---|---|
| Campaign Name | Text | Required |
| Account | Link | Array of Account record IDs |
| Purpose | Long text | |
| Requests Sent | Number | |
| Requests Accepted | Number | |
| Replies | Number | |
| Acceptance Rate | Formula | Computed by Airtable, read-only |
| Reply Rate | Formula | Computed by Airtable, read-only |

#### Meetings
A meeting booked as a result of a campaign.

| Field | Type | Notes |
|---|---|---|
| Attendee Name | Text | Required |
| Account | Link | Array of Account record IDs |
| Campaign | Link | Array of Campaign record IDs |
| Meeting Taker | Text | A8N person who takes the meeting |
| Meeting Taker Email | Email | |
| Meeting Creation Date | Date | When the meeting was booked |
| Scheduled Meeting Date | Date | When the meeting takes place |
| Attendee Email | Email | |
| Attendee Phone | Text | |
| Attendee LinkedIn | URL | |
| Attendee Company | Text | Added manually |
| Attendee Website | URL | |
| Attendee Background | Long text | AI-generated, stored back to Airtable |
| Outcome / Next Steps | Long text | |

#### Users
Internal A8N users who can log into the CRM.

| Field | Type | Notes |
|---|---|---|
| Name | Text | |
| Email | Email | Must be unique |
| Password Hash | Text | bcrypt, **never returned to client** |
| Status | Select | `Active` or `Suspended` |
| Added By | Text | Email of creator |
| Added At | Date | |
| Last Login | DateTime | Updated on each successful login |

#### Audit Log
Immutable record of all create/update/delete operations.

| Field | Type | Notes |
|---|---|---|
| Action | Text | e.g. `Created`, `Updated`, `Deleted` |
| Entity Type | Select | `Account`, `Campaign`, or `Meeting` |
| Entity Name | Text | |
| Entity ID | Text | Airtable record ID |
| Performed By | Text | Email of the logged-in user |
| Performed At | DateTime | ISO timestamp |
| Details | Long text | JSON: before/after field values |

---

## Authentication

NextAuth v5 (beta) with the Credentials provider and JWT session strategy.

**Flow:**
1. User submits email + password at `/login`
2. NextAuth calls the `authorize` function
3. Queries Airtable Users table by email
4. If not found, inactive, or wrong password → returns `null` (generic error, no specifics leaked)
5. On success → updates `Last Login`, returns user object
6. NextAuth stores user in a signed JWT cookie

**Protecting routes:**
`proxy.ts` exports the NextAuth `auth` function as the named export `proxy` (Next.js 16 renamed `middleware` → `proxy`). The matcher excludes public paths:

```
/((?!login|api/auth|accounts/[^/]+$|_next/static|_next/image|favicon.ico).*)
```

The `(protected)` route group also calls `auth()` directly and redirects to `/login` if the session is null — a second layer of protection for page renders.

---

## Client Dashboard (Public, Token-Protected)

Clients receive a unique dashboard link: `/client/[accountId]?token=[64-char-token]`

**Token generation:**
- UUID (hyphens stripped) + 32 bytes of `crypto.randomBytes` → 64 hex chars
- Stored in the account's `Dashboard Link` field in Airtable

**Token validation (on every request):**
1. Extract `?token=` from the incoming request
2. Fetch the account from Airtable by ID
3. Parse the stored token from the `Dashboard Link` field URL
4. `crypto.timingSafeEqual` comparison to prevent timing attacks
5. 403 if missing or mismatched, 404 if account not found

**Field filtering:**
The public API routes (`/api/client/...`) only return a safe subset of fields — PII fields (email, phone, LinkedIn, background, taker email) are never included in the response.

**Search engine protection:**
- `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` response header
- `Cache-Control: no-store, no-cache, private` response header
- `robots.txt` disallows `/client/` for all bots
- Page metadata sets `robots: { index: false, follow: false }`

---

## Slack Notifications

When a meeting is created, a Slack notification is sent fire-and-forget (never blocks the API response).

**Priority order:**
1. Slack Bot Token (`SLACK_BOT_TOKEN`) + Web API — preferred, supports channel lookup by name
2. Incoming Webhook (`SLACK_WEBHOOK_URL`) — fallback if bot token not available

**Bot token flow:**
1. Look up channel ID by name using `conversations.list`
   - Tries `public_channel,private_channel` first
   - Falls back to `public_channel` only on `missing_scope` error
2. Post message with Block Kit blocks via `chat.postMessage`
3. If `not_in_channel` error → surface clear message to invite the bot manually

**Message format:**
- Header: `📅 New Meeting Set`
- Body: attendee name, company, campaign, scheduled date, meeting taker (one field per line)
- Buttons: "View Dashboard →" and "View Meeting →" (when meeting ID available)

---

## AI Background Generation

`POST /api/generate-background` calls Claude to generate a brief about the meeting attendee.

**Input fields used:** Attendee Name, Email, LinkedIn, Website, Company, Account Name, Campaign Name, Campaign Purpose

**Output format:**
```
**Company**
2 sentences on what the attendee's company does and who their customers are.

**About [First Name]**
• Bullet on their likely role and seniority
• Bullet on their professional background
• Bullet on why they likely agreed to this meeting
• Bullet on anything relevant to the campaign context
```

The generated text is stored back to the `Attendee Background` field in Airtable via a PATCH to `/api/meetings/[id]`.

---

## Key Next.js 16 Conventions

- **Dynamic params are Promises.** Always `await params` before destructuring:
  ```typescript
  export async function GET(req, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  }
  ```
- **Middleware is named `proxy`.** The file is `proxy.ts` and exports a named `proxy` function, not `middleware`.
- **`next build` does not run the linter.** Run `npm run lint` separately.
- **Turbopack** is the default bundler in dev.
- **Tailwind CSS v4** uses `@import "tailwindcss"` and `@theme {}` blocks in CSS — there is no `tailwind.config.ts`.
