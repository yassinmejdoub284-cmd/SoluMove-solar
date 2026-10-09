import { database } from '../lib/vercel/database';
import { bucket } from '../lib/vercel/blob';
// Real bindings for the existing business handlers on Vercel.
export const env = {
  get DB(): D1Database { return database() as unknown as D1Database; },
  get BUCKET(): R2Bucket { return bucket as unknown as R2Bucket; },
  get SOLAREDGE_API_KEY() { return process.env.SOLAREDGE_API_KEY; },
};
