import { supabase } from "@/integrations/supabase/client";

/**
 * Batches a .in() filter into chunks to prevent URL overflow.
 * Supabase uses GET requests with query params, and very large .in() lists
 * can exceed URL length limits (~8KB). This utility splits queries into
 * chunks of BATCH_SIZE and merges results.
 */
const BATCH_SIZE = 200;

interface BatchedInQueryOptions {
  table: string;
  column: string;
  values: string[];
  select?: string;
  additionalFilters?: (query: any) => any;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
}

export async function batchedInQuery<T = any>({
  table,
  column,
  values,
  select = "*",
  additionalFilters,
  orderBy,
  limit,
}: BatchedInQueryOptions): Promise<T[]> {
  if (values.length === 0) return [];

  const runChunk = async (chunk: string[]): Promise<T[]> => {
    let query = (supabase.from as any)(table).select(select).in(column, chunk);
    if (additionalFilters) query = additionalFilters(query);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as T[];
  };

  // If small enough, do a single query
  if (values.length <= BATCH_SIZE) {
    let query = (supabase.from as any)(table).select(select).in(column, values);
    if (additionalFilters) query = additionalFilters(query);
    if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as T[];
  }

  // Chunk the values and run in parallel
  const chunks: string[][] = [];
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    chunks.push(values.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(chunks.map(runChunk));
  let merged = results.flat();

  // Sort after merge if needed
  if (orderBy) {
    merged.sort((a: any, b: any) => {
      const aVal = a[orderBy.column];
      const bVal = b[orderBy.column];
      if (aVal < bVal) return orderBy.ascending !== false ? -1 : 1;
      if (aVal > bVal) return orderBy.ascending !== false ? 1 : -1;
      return 0;
    });
  }

  // Apply limit after merge
  if (limit && merged.length > limit) {
    merged = merged.slice(0, limit);
  }

  return merged;
}
