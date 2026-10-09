import { createClient, type Client, type InStatement, type ResultSet, type InValue } from '@libsql/client';
import migrations from './migrations.json' with {type:'json'};

let client: Client | undefined;
let ready: Promise<void> | undefined;
export function sqlClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || process.env.STORAGE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN || process.env.STORAGE_AUTH_TOKEN;
    if (!url || (!url.startsWith('file:') && !authToken)) throw new Error('storage_unavailable');
    client = createClient({ url, authToken, intMode: 'number' });
  }
  return client;
}
// Schema and ledger commit under one write lock, including concurrent cold starts.
export async function ensureSchema() {
  if (!ready) ready = migrate().catch(error => { ready = undefined; throw error; });
  return ready;
}
async function migrate() {
  const tx = await sqlClient().transaction('write');
  try {
    await tx.execute('CREATE TABLE IF NOT EXISTS solar_migrations (name TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL)');
    const existing = new Set((await tx.execute('SELECT name FROM solar_migrations')).rows.map(r => r.name));
    const pending: InStatement[] = [];
    for (const m of migrations) if (!existing.has(m.name)) {
      pending.push(...m.statements.map(sql => ({ sql, args: [] })));
      pending.push({ sql: 'INSERT INTO solar_migrations(name,applied_at) VALUES(?,?)', args: [m.name, new Date().toISOString()] });
    }
    if (pending.length) await tx.batch(pending);
    await tx.commit();
  } catch (error) { await tx.rollback(); throw error; }
  finally { tx.close(); }
}
function result<T>(r: ResultSet) {
  return { results: r.rows.map(row => Object.fromEntries(r.columns.map(c => [c, row[c]]))) as T[], success: true,
    meta: { changes: r.rowsAffected, last_row_id: Number(r.lastInsertRowid ?? 0) } };
}
export class Statement {
  readonly sql:string;
  readonly args:InValue[];
  constructor(sql:string,args:InValue[]=[]){this.sql=sql;this.args=args;}
  bind(...args: InValue[]) { return new Statement(this.sql, args); }
  private async execute() { await ensureSchema(); return sqlClient().execute({ sql: this.sql, args: this.args }); }
  async all<T = Record<string, unknown>>() { return result<T>(await this.execute()); }
  async run<T = Record<string, unknown>>() { return this.all<T>(); }
  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const row = (await this.all<Record<string, unknown>>()).results[0];
    return row ? (column ? row[column] : row) as T : null;
  }
  async raw<T = unknown[]>() { const r = await this.execute(); return r.rows.map(row => r.columns.map(c => row[c])) as T[]; }
}
const adapter = {
  prepare(sql: string) { return new Statement(sql); },
  async batch<T = Record<string, unknown>>(statements: Statement[]) {
    await ensureSchema();
    if (!statements.length) return [];
    const input=statements.map(s => ({sql:s.sql,args:s.args}));
    const chunks:InStatement[][]=[];
    let chunk:InStatement[]=[],bytes=0;
    for(const statement of input){
      const size=new TextEncoder().encode(JSON.stringify(statement)).byteLength;
      if(chunk.length&&(bytes+size>512000||chunk.length>=100)){chunks.push(chunk);chunk=[];bytes=0;}
      chunk.push(statement);bytes+=size;
    }
    if(chunk.length)chunks.push(chunk);
    // Small operations keep one round trip. Large seeds use bounded requests
    // within ONE write transaction; failures roll back every preceding chunk.
    if(chunks.length===1)return (await sqlClient().batch(input,'write')).map(r=>result<T>(r));
    const tx=await sqlClient().transaction('write');
    try {
      const results:ResultSet[]=[];
      for(const part of chunks)results.push(...await tx.batch(part));
      await tx.commit();return results.map(r=>result<T>(r));
    }catch(error){await tx.rollback();throw error;}
    finally{tx.close();}
  },
};
export function database() { return adapter; }
