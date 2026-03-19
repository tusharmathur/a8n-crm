/** Airtable record wrapper */
export interface AirtableRecord<T> {
  id: string;
  fields: T;
  createdTime: string;
}

/** Accounts table fields */
export interface AccountFields {
  Name: string;
  Status?: "Current" | "Past";
  Website?: string;
  "Account Owner"?: string;
  "Main Contact Name"?: string;
  Address?: string;
  "Engagement Goals"?: string;
}

export type Account = AirtableRecord<AccountFields>;

/** Campaigns table fields */
export interface CampaignFields {
  "Campaign Name": string;
  Account?: string[];           // linked record IDs
  Purpose?: string;
  "Requests Sent"?: number;
  "Requests Accepted"?: number;
  Replies?: number;
  "Acceptance Rate"?: string;   // formula — read-only string like "45.2%"
  "Reply Rate"?: string;        // formula — read-only string like "12.3%"
}

export interface Campaign extends AirtableRecord<CampaignFields> {
  /** Enriched account name resolved from linked record */
  accountName?: string;
}

/** Meetings table fields */
export interface MeetingFields {
  "Attendee Name": string;
  Account?: string[];           // linked record IDs
  Campaign?: string[];          // linked record IDs
  "Meeting Taker"?: string;
  "Meeting Taker Email"?: string;
  "Meeting Creation Date"?: string;
  "Scheduled Meeting Date"?: string;
  "Attendee Email"?: string;
  "Attendee Phone"?: string;
  "Attendee LinkedIn"?: string;
  "Attendee Company"?: string;
  "Attendee Background"?: string;
}

export interface Meeting extends AirtableRecord<MeetingFields> {
  /** Enriched account name resolved from linked record */
  accountName?: string;
  /** Enriched campaign name resolved from linked record */
  campaignName?: string;
}

/** Users table fields */
export interface UserFields {
  Name: string;
  Email: string;
  "Password Hash"?: string;     // never returned to client
  Status: "Active" | "Suspended";
  "Added By"?: string;
  "Added At"?: string;
  "Last Login"?: string;
}

export type User = AirtableRecord<UserFields>;

/** Safe user — Password Hash stripped */
export type SafeUser = AirtableRecord<Omit<UserFields, "Password Hash">>;

/** Audit Log table fields */
export interface AuditLogFields {
  Action: string;
  "Entity Type": "Account" | "Campaign" | "Meeting";
  "Entity Name": string;
  "Entity ID": string;
  "Performed By": string;
  "Performed At": string;
  Details?: string;
}

export type AuditLog = AirtableRecord<AuditLogFields>;

/** Params for writeAuditLog */
export interface AuditLogParams {
  action: string;
  entityType: "Account" | "Campaign" | "Meeting";
  entityName: string;
  entityId: string;
  performedBy: string;
  details?: Record<string, unknown>;
}
