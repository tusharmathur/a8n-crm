# A8N CRM — API Reference

All protected endpoints require an active session (NextAuth JWT cookie). Unauthenticated requests return `401 Unauthorized`. Public endpoints are marked explicitly.

---

## Accounts

### `GET /api/accounts`
Returns all accounts.

**Auth:** Required

**Response `200`**
```json
[
  {
    "id": "recXXX",
    "createdTime": "2026-01-01T00:00:00.000Z",
    "fields": {
      "Name": "Acme Corp",
      "Status": "Current",
      "Website": "https://acme.com",
      "Account Owner": "Jane Smith",
      "Dashboard Link": "https://a8n-crm.vercel.app/client/recXXX?token=..."
    }
  }
]
```

---

### `POST /api/accounts`
Creates a new account. Auto-generates a dashboard link with a 64-char token and saves it to Airtable.

**Auth:** Required

**Request body**
```json
{
  "Name": "Acme Corp",
  "Status": "Current",
  "Website": "https://acme.com",
  "Account Owner": "Jane Smith",
  "Main Contact Name": "Bob Jones",
  "Address": "123 Main St",
  "Engagement Goals": "Book 10 meetings per month",
  "Slack Channel": "#client-acme"
}
```
`Name` is required. All other fields are optional.

**Response `201`**
```json
{
  "id": "recXXX",
  "fields": { "Name": "Acme Corp", ... }
}
```

**Errors:** `400` if Name missing, `500` on Airtable error

---

### `GET /api/accounts/[id]`
Returns a single account by Airtable record ID.

**Auth:** Required

**Response `200`** — same shape as the array item above

**Errors:** `404` if not found

---

### `PATCH /api/accounts/[id]`
Updates an account. Only fields included in the body are changed. Writes an audit log entry with before/after values.

**Auth:** Required

**Request body** — any subset of account fields

**Response `200`** — updated record

---

### `DELETE /api/accounts/[id]`
Deletes an account. Snapshots the record in the audit log before deletion.

**Auth:** Required

**Response `200`**
```json
{ "success": true }
```

---

### `POST /api/accounts/[id]/generate-link`
Generates a new dashboard token for the account and saves it to Airtable. Overwrites any existing token.

**Auth:** Required

**Response `200`**
```json
{
  "dashboardLink": "https://a8n-crm.vercel.app/client/recXXX?token=abc123..."
}
```

**Errors:** `404` if account not found

---

## Campaigns

### `GET /api/campaigns`
Returns all campaigns. Optionally filter by account.

**Auth:** Required

**Query params**
| Param | Type | Description |
|---|---|---|
| `account` | string | Airtable account record ID |

Each campaign is enriched with `accountName` (resolved from the linked Account record).

**Response `200`**
```json
[
  {
    "id": "recYYY",
    "fields": {
      "Campaign Name": "Q1 Outreach",
      "Account": ["recXXX"],
      "Purpose": "Book intro calls",
      "Requests Sent": 200,
      "Requests Accepted": 80,
      "Replies": 40,
      "Acceptance Rate": "40.0%",
      "Reply Rate": "20.0%"
    },
    "accountName": "Acme Corp"
  }
]
```

---

### `POST /api/campaigns`
Creates a new campaign.

**Auth:** Required

**Request body**
```json
{
  "Campaign Name": "Q1 Outreach",
  "Account": ["recXXX"],
  "Purpose": "Book intro calls",
  "Requests Sent": 200,
  "Requests Accepted": 80,
  "Replies": 40
}
```
`Campaign Name` and `Account` are required.

**Response `201`** — created record

---

### `GET /api/campaigns/[id]`
Returns a single campaign, enriched with `accountName`.

**Auth:** Required

---

### `PATCH /api/campaigns/[id]`
Updates a campaign. Writes an audit log entry.

**Auth:** Required

---

### `DELETE /api/campaigns/[id]`
Deletes a campaign. Snapshots record in audit log.

**Auth:** Required

---

## Meetings

### `GET /api/meetings`
Returns all meetings. Optionally filter by account.

**Auth:** Required

**Query params**
| Param | Type | Description |
|---|---|---|
| `accountId` | string | Airtable account record ID |

Each meeting is enriched with `accountName` and `campaignName`.

**Response `200`**
```json
[
  {
    "id": "recZZZ",
    "fields": {
      "Attendee Name": "Bob Smith",
      "Attendee Company": "SmithCo",
      "Account": ["recXXX"],
      "Campaign": ["recYYY"],
      "Meeting Taker": "Jane",
      "Scheduled Meeting Date": "2026-03-15",
      "Meeting Creation Date": "2026-03-01",
      "Outcome / Next Steps": "Follow up in 2 weeks"
    },
    "accountName": "Acme Corp",
    "campaignName": "Q1 Outreach"
  }
]
```

---

### `POST /api/meetings`
Creates a new meeting. Triggers a Slack notification fire-and-forget (never blocks the response).

**Auth:** Required

**Request body**
```json
{
  "Attendee Name": "Bob Smith",
  "Account": ["recXXX"],
  "Campaign": ["recYYY"],
  "Meeting Taker": "Jane",
  "Meeting Taker Email": "jane@acceler8now.com",
  "Meeting Creation Date": "2026-03-01",
  "Scheduled Meeting Date": "2026-03-15",
  "Attendee Email": "bob@smithco.com",
  "Attendee Phone": "555-1234",
  "Attendee LinkedIn": "linkedin.com/in/bobsmith",
  "Attendee Company": "SmithCo",
  "Attendee Website": "https://smithco.com",
  "Attendee Background": "Optional pre-written background"
}
```
`Attendee Name` and `Account` are required.

**Response `201`** — created record

---

### `GET /api/meetings/[id]`
Returns a single meeting, enriched with `accountName` and `campaignName`.

**Auth:** Required

---

### `PATCH /api/meetings/[id]`
Updates a meeting. Writes an audit log entry with before/after values.

**Auth:** Required

---

### `DELETE /api/meetings/[id]`
Deletes a meeting. Snapshots record in audit log.

**Auth:** Required

---

## Users

### `GET /api/users`
Returns all users. `Password Hash` field is never included.

**Auth:** Required

**Response `200`**
```json
[
  {
    "id": "recUUU",
    "fields": {
      "Name": "Jane Smith",
      "Email": "jane@acceler8now.com",
      "Status": "Active",
      "Added By": "admin@acceler8now.com",
      "Added At": "2026-01-01",
      "Last Login": "2026-03-21T09:00:00.000Z"
    }
  }
]
```

---

### `POST /api/users`
Creates a new user. Password is hashed with bcrypt (10 rounds) before storage.

**Auth:** Required

**Request body**
```json
{
  "Name": "Jane Smith",
  "Email": "jane@acceler8now.com",
  "Password": "securepassword123"
}
```

**Errors:**
- `400` if Name, Email, or Password missing
- `400` if password < 8 characters
- `409` if email already exists

**Response `201`** — created user (no `Password Hash`)

---

### `PATCH /api/users/[id]`
Updates a user's status.

**Auth:** Required

**Request body**
```json
{ "Status": "Suspended" }
```

**Response `200`** — updated user

---

### `DELETE /api/users/[id]`
Deletes a user. A user cannot delete their own account.

**Auth:** Required

**Errors:** `403` if attempting to delete own account

---

## Audit Log

### `GET /api/audit`
Returns all audit log entries, newest first.

**Auth:** Required

**Response `200`**
```json
[
  {
    "id": "recAAA",
    "fields": {
      "Action": "Updated",
      "Entity Type": "Meeting",
      "Entity Name": "Bob Smith",
      "Entity ID": "recZZZ",
      "Performed By": "jane@acceler8now.com",
      "Performed At": "2026-03-21T09:00:00.000Z",
      "Details": "{\"before\":{\"Meeting Taker\":\"Tom\"},\"after\":{\"Meeting Taker\":\"Jane\"}}"
    }
  }
]
```

---

## AI

### `POST /api/generate-background`
Generates a background brief for a meeting attendee using Claude. Requires an active session.

**Auth:** Required

**Request body**
```json
{
  "attendeeName": "Bob Smith",
  "attendeeEmail": "bob@smithco.com",
  "attendeeLinkedIn": "linkedin.com/in/bobsmith",
  "attendeeWebsite": "https://smithco.com",
  "attendeeCompany": "SmithCo",
  "accountName": "Acme Corp",
  "campaignName": "Q1 Outreach",
  "campaignPurpose": "Book intro calls with ops leaders"
}
```
Only `attendeeName` is required.

**Response `200`**
```json
{
  "background": "**Company**\nSmithCo is a...\n\n**About Bob**\n• ..."
}
```

**Errors:** `400` if attendeeName missing, `500` on AI error

---

## Slack

### `POST /api/slack/test`
Sends a test Slack message to the channel configured on an account. Used to verify bot setup.

**Auth:** Required

**Request body**
```json
{ "accountId": "recXXX" }
```

**Response `200` (success)**
```json
{
  "success": true,
  "channel": "#client-acme",
  "botInvited": false
}
```

**Response `200` (failure — success is false)**
```json
{
  "success": false,
  "error": "Bot is not in #client-acme. Please /invite @YourBotName to the channel in Slack, then retry."
}
```

---

## Client (Public, Token-Protected)

These routes are public — no session required. They are protected by a per-account token using timing-safe comparison.

### `GET /api/client/[accountId]?token=[token]`
Returns account, campaign, and meeting data for the client dashboard.

**Auth:** None (token-protected)

**Query params**
| Param | Type | Description |
|---|---|---|
| `token` | string | 64-char token from the account's Dashboard Link |

**Response `200`**
```json
{
  "account": {
    "id": "recXXX",
    "fields": {
      "Name": "Acme Corp",
      "Status": "Current",
      "Website": "https://acme.com"
    }
  },
  "campaigns": [...],
  "meetings": [
    {
      "id": "recZZZ",
      "fields": {
        "Attendee Name": "Bob Smith",
        "Attendee Company": "SmithCo",
        "Scheduled Meeting Date": "2026-03-15",
        "Meeting Creation Date": "2026-03-01",
        "Meeting Taker": "Jane",
        "Outcome / Next Steps": "Follow up next week"
      }
    }
  ]
}
```

Fields never returned: `Attendee Email`, `Attendee Phone`, `Attendee LinkedIn`, `Attendee Background`, `Meeting Taker Email`, `Account Owner`, `Engagement Goals`, `Address`, `Dashboard Link`.

**Errors:** `403` if token missing or invalid, `404` if account not found

---

### `GET /api/client/[accountId]/meetings/[meetingId]?token=[token]`
Returns a single meeting's safe public fields.

**Auth:** None (token-protected)

**Response `200`**
```json
{
  "id": "recZZZ",
  "fields": {
    "Attendee Name": "Bob Smith",
    "Attendee Company": "SmithCo",
    "Scheduled Meeting Date": "2026-03-15",
    "Meeting Creation Date": "2026-03-01",
    "Meeting Taker": "Jane",
    "Outcome / Next Steps": "Follow up next week"
  }
}
```

Response headers include:
```
X-Robots-Tag: noindex, nofollow, noarchive, nosnippet
Cache-Control: no-store, no-cache, private
```

**Errors:** `403` if token missing or invalid, `404` if account or meeting not found, `404` if meeting does not belong to the account

---

## NextAuth

### `GET /api/auth/[...nextauth]`
### `POST /api/auth/[...nextauth]`

Handled by NextAuth v5. Manages session creation, callbacks, and sign-out. See [NextAuth docs](https://authjs.dev) for details.

**Public** — no auth required.
