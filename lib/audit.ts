import { airtableCreate } from "@/lib/airtable";
import { AuditLogFields, AuditLogParams } from "@/types";

/**
 * Write an entry to the Audit Log table.
 * Failures are caught silently — never blocks the calling response.
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const fields: AuditLogFields = {
      Action: params.action,
      "Entity Type": params.entityType,
      "Entity Name": params.entityName,
      "Entity ID": params.entityId,
      "Performed By": params.performedBy,
      "Performed At": new Date().toISOString(),
      Details: params.details ? JSON.stringify(params.details) : undefined,
    };
    await airtableCreate<AuditLogFields>("Audit Log", fields);
  } catch {
    // Silent failure — audit log errors must never block the main response
  }
}
