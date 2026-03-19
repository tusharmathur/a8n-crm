import { AirtableRecord } from "@/types";

const BASE_URL = "https://api.airtable.com/v0";

function getHeaders(): HeadersInit {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) throw new Error("AIRTABLE_TOKEN is not set");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function getBaseId(): string {
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!baseId) throw new Error("AIRTABLE_BASE_ID is not set");
  return baseId;
}

/**
 * Fetch all records from a table, optionally filtered by a formula.
 */
export async function airtableFetch<T>(
  table: string,
  filterFormula?: string
): Promise<AirtableRecord<T>[]> {
  const baseId = getBaseId();
  const params = new URLSearchParams({ pageSize: "100" });
  if (filterFormula) params.set("filterByFormula", filterFormula);

  let records: AirtableRecord<T>[] = [];
  let offset: string | undefined;

  do {
    if (offset) params.set("offset", offset);
    const res = await fetch(
      `${BASE_URL}/${baseId}/${encodeURIComponent(table)}?${params}`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Airtable fetch error ${res.status}: ${err}`);
    }
    const data = await res.json();
    records = records.concat(data.records ?? []);
    offset = data.offset;
  } while (offset);

  return records;
}

/**
 * Fetch a single record by ID from a table.
 */
export async function airtableFetchOne<T>(
  table: string,
  id: string
): Promise<AirtableRecord<T> | null> {
  const baseId = getBaseId();
  const res = await fetch(
    `${BASE_URL}/${baseId}/${encodeURIComponent(table)}/${id}`,
    { headers: getHeaders(), cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable fetch error ${res.status}: ${err}`);
  }
  return res.json();
}

/**
 * Create a new record in a table.
 */
export async function airtableCreate<T>(
  table: string,
  fields: Partial<T>
): Promise<AirtableRecord<T>> {
  const baseId = getBaseId();
  const res = await fetch(
    `${BASE_URL}/${baseId}/${encodeURIComponent(table)}`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ fields }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable create error ${res.status}: ${err}`);
  }
  return res.json();
}

/**
 * Update fields on an existing record.
 */
export async function airtableUpdate<T>(
  table: string,
  id: string,
  fields: Partial<T>
): Promise<AirtableRecord<T>> {
  const baseId = getBaseId();
  const res = await fetch(
    `${BASE_URL}/${baseId}/${encodeURIComponent(table)}/${id}`,
    {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ fields }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable update error ${res.status}: ${err}`);
  }
  return res.json();
}

/**
 * Delete a record from a table.
 */
export async function airtableDelete(
  table: string,
  id: string
): Promise<void> {
  const baseId = getBaseId();
  const res = await fetch(
    `${BASE_URL}/${baseId}/${encodeURIComponent(table)}/${id}`,
    { method: "DELETE", headers: getHeaders() }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable delete error ${res.status}: ${err}`);
  }
}
