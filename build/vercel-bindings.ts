/**
 * Build boundary for the existing Cloudflare backend on Vercel.
 * No database or bucket is fabricated: runtime access fails explicitly until
 * the backend has been migrated. The Worker build uses its real bindings.
 */
export const env = {
  get DB(): D1Database {
    throw new Error("storage_unavailable");
  },
  get BUCKET(): R2Bucket {
    throw new Error("storage_unavailable");
  },
  SOLAREDGE_API_KEY: process.env.SOLAREDGE_API_KEY,
};
