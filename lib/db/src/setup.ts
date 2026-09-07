import { pool } from "./index";

export async function ensureSearchIndexes(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
    await client.query(`
      CREATE INDEX IF NOT EXISTS products_name_trgm_idx
        ON products USING gin (name gin_trgm_ops)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS products_category_trgm_idx
        ON products USING gin (category gin_trgm_ops)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS products_description_trgm_idx
        ON products USING gin (description gin_trgm_ops)
    `);
  } finally {
    client.release();
  }
}
