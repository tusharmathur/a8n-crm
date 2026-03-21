# A8N CRM — Contributing Guide

## Prerequisites

- Node.js 20+
- npm 10+
- Access to the Airtable base (`appPpY4aZ9bOR8JVC`)
- An Airtable Personal Access Token with read/write scopes on the base
- An Anthropic API key (for background generation)
- A Slack bot token (optional, for notifications)

---

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/tusharmathur/a8n-crm.git
cd a8n-crm
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example and fill in the values:

```bash
cp .env.example .env.local
```

`.env.local` should contain:

```env
# Required
AIRTABLE_TOKEN=patXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appPpY4aZ9bOR8JVC
AUTH_SECRET=                        # Generate: openssl rand -base64 32
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional — AI background generation
ANTHROPIC_API_KEY=sk-ant-...

# Optional — Slack notifications
SLACK_BOT_TOKEN=xoxb-...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

Log in with an existing user from the Airtable Users table. If none exist, create one by calling `POST /api/users` directly or via a tool like Postman.

---

## Project Scripts

| Script | Command | Description |
|---|---|---|
| Dev server | `npm run dev` | Starts Next.js with Turbopack on port 3000 |
| Production build | `npm run build` | Builds the app for production |
| Start production | `npm run start` | Runs the production build locally |
| Lint | `npm run lint` | Runs ESLint (not run automatically on build) |
| Tests | `npm run test` | Runs the full test suite once |
| Tests (watch) | `npm run test:watch` | Watches for changes and re-runs tests |
| Tests (coverage) | `npm run test:coverage` | Runs tests with v8 coverage report |
| Tests (CI) | `npm run test:ci` | Verbose output — used in CI pipelines |

---

## Running Tests

Tests use Vitest + React Testing Library. All external dependencies (Airtable, Auth, Slack, Anthropic) are mocked.

```bash
npm run test
```

Expected output:
```
Test Files  19 passed (19)
     Tests  214 passed (214)
```

### Test structure

```
__tests__/
├── api/
│   ├── accounts.test.ts
│   ├── campaigns.test.ts
│   ├── meetings.test.ts
│   ├── users.test.ts
│   ├── audit.test.ts (via client-dashboard.test.ts)
│   ├── client-dashboard.test.ts
│   ├── client-meeting-detail.test.ts
│   ├── generate-background.test.ts
│   ├── slack-notification.test.ts
│   ├── delete-records.test.ts
│   ├── edit-records.test.ts
│   └── campaign-performance.test.ts
├── auth/
│   └── login.test.ts
├── components/
│   ├── LoginForm.test.tsx
│   ├── AccountForm.test.tsx
│   ├── CampaignForm.test.tsx
│   └── MeetingForm.test.tsx
└── lib/
    ├── audit.test.ts
    └── slack.test.ts
```

### Mocking pattern

All tests mock Airtable and Auth at the module level:

```typescript
vi.mock("@/lib/airtable", () => ({
  airtableFetchOne: vi.fn(),
  airtableFetch: vi.fn(),
  airtableCreate: vi.fn(),
  airtableUpdate: vi.fn(),
  airtableDelete: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockFetchOne = vi.mocked(airtableFetchOne);
const mockAuth = vi.mocked(auth);

beforeEach(() => {
  mockFetchOne.mockReset();
  mockAuth.mockReset();
});
```

> **Note:** The Slack WebClient mock must use a regular function, not an arrow function, because it's used as a constructor:
> ```typescript
> vi.mock("@slack/web-api", () => ({
>   WebClient: vi.fn(function () {
>     return { chat: { postMessage: mockPostMessage }, ... };
>   }),
> }));
> ```

### Coverage thresholds

The coverage threshold is 80% line coverage. Run `npm run test:coverage` to check.

---

## Making Changes

### Adding a new API route

1. Create the file under `app/api/[route]/route.ts`
2. Import and call `auth()` at the top — return `401` if no session (unless the route is public)
3. Use the helpers in `lib/airtable.ts` for all data access
4. Call `writeAuditLog()` from `lib/audit.ts` for create/update/delete operations
5. Add tests in `__tests__/api/`

Example skeleton:

```typescript
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { airtableFetch } from "@/lib/airtable";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const records = await airtableFetch("TableName");
  return Response.json(records);
}
```

### Adding a new page

Protected pages go under `app/(protected)/`. The layout at `app/(protected)/layout.tsx` handles session checking and the sidebar — no need to repeat auth logic in individual pages.

Public pages go directly under `app/`.

### Dynamic route params

Always `await` params before destructuring — they are Promises in Next.js 16:

```typescript
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // ...
}
```

### Adding a new Airtable field

1. Add the field to the Airtable base manually via the web interface
2. Add it to the relevant interface in `types/index.ts`
3. Update any API routes that create or update that record to include the new field
4. Update form components if the field should be editable in the UI

---

## Deployment

The app deploys automatically to Vercel on every push to `main`.

### Manual deploy

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

vercel --prod
```

### Environment variables on Vercel

Set env vars via the Vercel dashboard or CLI. When using the CLI, use `printf` to avoid trailing newlines (especially important for tokens):

```bash
# Correct — no trailing newline
printf 'your-token-value' | vercel env add SLACK_BOT_TOKEN production

# Incorrect — adds trailing \n which breaks HTTP Authorization headers
echo 'your-token-value' | vercel env add SLACK_BOT_TOKEN production
```

### Post-deploy checks

After a deploy:
1. Log in and verify the dashboard loads
2. Create a test meeting and confirm the Slack notification fires
3. Open the client dashboard link for an account and verify it loads with the token
4. Confirm `robots.txt` is accessible at `/robots.txt`

---

## Code Style

- TypeScript strict mode — no `any` unless unavoidable
- No default exports from lib files — named exports only
- Server Components by default; add `"use client"` only when needed (event handlers, hooks, browser APIs)
- Tailwind for all styling — use the CSS token variables defined in `globals.css` for the brand palette:
  - `--color-primary: #6B21A8` (deep purple)
  - `--color-primary-hover: #7C3AED`
  - `--color-primary-dark: #4C1D95`
  - `--color-primary-tint: #F5F3FF`
  - `--color-primary-border: #DDD6FE`
- Errors that shouldn't block the user (e.g. audit logging, Slack notifications) must be fire-and-forget with `.catch()` — never `await` them in the main response path

---

## Common Gotchas

**Airtable linked fields return arrays of record IDs, not objects.**
```typescript
// Airtable gives you this:
meeting.fields["Account"] // => ["recXXX"]

// Not this:
meeting.fields["Account"] // => { id: "recXXX", name: "Acme" }
```
Enrichment (resolving IDs to names) is done manually in the API routes.

**Airtable formula fields are read-only.**
`Acceptance Rate` and `Reply Rate` on Campaigns are computed by Airtable. Never try to write them via the API — Airtable will return an error.

**The proxy matcher uses a negative lookahead.**
When adding a new public route, update the regex in `proxy.ts` to exclude it:
```typescript
matcher: ["/((?!login|api/auth|your-new-public-path|...).*)",]
```

**Module-level variables in route handlers persist across Vitest tests.**
If a route uses a module-level cache variable, tests may share state. Test observable behavior (response shape) rather than internal call counts.
