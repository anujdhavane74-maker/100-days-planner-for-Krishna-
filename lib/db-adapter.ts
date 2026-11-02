import fs from "node:fs";
import path from "node:path";

export interface JourneyRow {
  data: string;
  revision: number;
}

export interface DbAdapter {
  prepare(query: string): {
    bind(...args: any[]): {
      first<T = JourneyRow>(): Promise<T | null>;
      run(): Promise<{ meta: { changes: number } }>;
    };
  };
}

// In-memory and file-backed fallback store
declare global {
  // eslint-disable-next-line no-var
  var __journeysStore: Map<string, JourneyRow> | undefined;
}

function getStoreFile(): string {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return "/tmp/journeys-store.json";
  }
  return path.join(process.cwd(), ".data-journeys.json");
}

function loadStore(): Map<string, JourneyRow> {
  if (!globalThis.__journeysStore) {
    const store = new Map<string, JourneyRow>();
    const filePath = getStoreFile();
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        for (const [k, v] of Object.entries(parsed)) {
          store.set(k, v as JourneyRow);
        }
      }
    } catch {
      // Ignore initial file load errors
    }
    globalThis.__journeysStore = store;
  }
  return globalThis.__journeysStore;
}

function persistStore(store: Map<string, JourneyRow>) {
  try {
    const filePath = getStoreFile();
    const obj: Record<string, JourneyRow> = {};
    for (const [k, v] of store.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf-8");
  } catch {
    // File persistence is best-effort in serverless
  }
}

/**
 * Local file-backed database adapter (default fallback)
 */
class LocalDbAdapter implements DbAdapter {
  prepare(query: string) {
    return {
      bind(...args: any[]) {
        return {
          async first<T = JourneyRow>(): Promise<T | null> {
            const store = loadStore();
            const normalized = query.toLowerCase();
            if (
              normalized.includes("select data,revision") ||
              normalized.includes("select data, revision")
            ) {
              const userId = String(args[0]);
              const row = store.get(userId);
              return (row as unknown as T) || null;
            }
            return null;
          },
          async run(): Promise<{ meta: { changes: number } }> {
            const store = loadStore();
            const normalized = query.toLowerCase();

            if (normalized.includes("insert or ignore")) {
              const userId = String(args[0]);
              const data = String(args[1]);
              if (store.has(userId)) {
                return { meta: { changes: 0 } };
              }
              store.set(userId, { data, revision: 1 });
              persistStore(store);
              return { meta: { changes: 1 } };
            }

            if (normalized.includes("update journeys")) {
              const data = String(args[0]);
              const userId = String(args[1]);
              const expectedRevision = Number(args[2]);
              const current = store.get(userId);

              if (!current || current.revision !== expectedRevision) {
                return { meta: { changes: 0 } };
              }

              store.set(userId, { data, revision: expectedRevision + 1 });
              persistStore(store);
              return { meta: { changes: 1 } };
            }

            return { meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

/**
 * Turso / libSQL Cloud adapter for cross-device SQLite synchronization
 */
class TursoDbAdapter implements DbAdapter {
  private url: string;
  private token: string;
  private tableReady: Promise<boolean> | null = null;

  constructor(url: string, token: string) {
    this.url = url.replace(/^libsql:\/\//, "https://").replace(/\/$/, "");
    this.token = token;
  }

  private async ensureTable(): Promise<boolean> {
    if (!this.tableReady) {
      this.tableReady = (async () => {
        try {
          await fetch(`${this.url}/v2/pipeline`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requests: [
                {
                  type: "execute",
                  stmt: {
                    sql: "CREATE TABLE IF NOT EXISTS journeys (user_id TEXT PRIMARY KEY, data TEXT, revision INTEGER);",
                  },
                },
                { type: "close" },
              ],
            }),
          });
          return true;
        } catch {
          return false;
        }
      })();
    }
    return this.tableReady;
  }

  prepare(query: string) {
    const self = this;
    return {
      bind(...args: any[]) {
        return {
          async first<T = JourneyRow>(): Promise<T | null> {
            await self.ensureTable();
            const formattedArgs = args.map((arg) => {
              if (typeof arg === "number")
                return { type: "integer", value: String(arg) };
              if (typeof arg === "string") return { type: "text", value: arg };
              if (arg === null || arg === undefined) return { type: "null" };
              return { type: "text", value: JSON.stringify(arg) };
            });

            try {
              const res = await fetch(`${self.url}/v2/pipeline`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${self.token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  requests: [
                    {
                      type: "execute",
                      stmt: { sql: query, args: formattedArgs },
                    },
                    { type: "close" },
                  ],
                }),
              });

              if (!res.ok) return null;
              const body = (await res.json()) as any;
              const result = body?.results?.[0]?.response?.result;
              if (!result || !result.rows || result.rows.length === 0)
                return null;

              const cols = result.cols.map((c: any) => c.name);
              const rowValues = result.rows[0];
              const obj: any = {};
              cols.forEach((colName: string, i: number) => {
                const val = rowValues[i]?.value;
                obj[colName] = colName === "revision" ? Number(val) : val;
              });
              return obj as T;
            } catch {
              return null;
            }
          },

          async run(): Promise<{ meta: { changes: number } }> {
            await self.ensureTable();
            const formattedArgs = args.map((arg) => {
              if (typeof arg === "number")
                return { type: "integer", value: String(arg) };
              if (typeof arg === "string") return { type: "text", value: arg };
              if (arg === null || arg === undefined) return { type: "null" };
              return { type: "text", value: JSON.stringify(arg) };
            });

            try {
              const res = await fetch(`${self.url}/v2/pipeline`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${self.token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  requests: [
                    {
                      type: "execute",
                      stmt: { sql: query, args: formattedArgs },
                    },
                    { type: "close" },
                  ],
                }),
              });

              if (!res.ok) return { meta: { changes: 0 } };
              const body = (await res.json()) as any;
              const changes =
                body?.results?.[0]?.response?.result?.affected_row_count ?? 0;
              return { meta: { changes: Number(changes) } };
            } catch {
              return { meta: { changes: 0 } };
            }
          },
        };
      },
    };
  }
}

/**
 * Upstash Redis / Vercel KV adapter for global serverless synchronization
 */
class UpstashKvDbAdapter implements DbAdapter {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, "");
    this.token = token;
  }

  prepare(query: string) {
    const self = this;
    const normalized = query.toLowerCase();

    return {
      bind(...args: any[]) {
        return {
          async first<T = JourneyRow>(): Promise<T | null> {
            const userId = String(args[0]);
            try {
              const res = await fetch(
                `${self.url}/get/journey:${encodeURIComponent(userId)}`,
                {
                  headers: { Authorization: `Bearer ${self.token}` },
                  cache: "no-store",
                },
              );
              if (!res.ok) return null;
              const json = (await res.json()) as any;
              if (!json.result) return null;
              const parsed =
                typeof json.result === "string"
                  ? JSON.parse(json.result)
                  : json.result;
              return parsed as T;
            } catch {
              return null;
            }
          },

          async run(): Promise<{ meta: { changes: number } }> {
            if (normalized.includes("insert or ignore")) {
              const userId = String(args[0]);
              const data = String(args[1]);

              try {
                const checkRes = await fetch(
                  `${self.url}/get/journey:${encodeURIComponent(userId)}`,
                  {
                    headers: { Authorization: `Bearer ${self.token}` },
                    cache: "no-store",
                  },
                );
                const checkJson = (await checkRes.json()) as any;
                if (checkJson.result) {
                  return { meta: { changes: 0 } }; // already exists
                }

                const newRow: JourneyRow = { data, revision: 1 };
                const setRes = await fetch(
                  `${self.url}/set/journey:${encodeURIComponent(userId)}`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${self.token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(JSON.stringify(newRow)),
                  },
                );
                return { meta: { changes: setRes.ok ? 1 : 0 } };
              } catch {
                return { meta: { changes: 0 } };
              }
            }

            if (normalized.includes("update journeys")) {
              const data = String(args[0]);
              const userId = String(args[1]);
              const expectedRevision = Number(args[2]);

              try {
                const getRes = await fetch(
                  `${self.url}/get/journey:${encodeURIComponent(userId)}`,
                  {
                    headers: { Authorization: `Bearer ${self.token}` },
                    cache: "no-store",
                  },
                );
                const getJson = (await getRes.json()) as any;
                if (!getJson.result) return { meta: { changes: 0 } };
                const current: JourneyRow =
                  typeof getJson.result === "string"
                    ? JSON.parse(getJson.result)
                    : getJson.result;

                if (!current || current.revision !== expectedRevision) {
                  return { meta: { changes: 0 } };
                }

                const updatedRow: JourneyRow = {
                  data,
                  revision: expectedRevision + 1,
                };
                const setRes = await fetch(
                  `${self.url}/set/journey:${encodeURIComponent(userId)}`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${self.token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(JSON.stringify(updatedRow)),
                  },
                );
                return { meta: { changes: setRes.ok ? 1 : 0 } };
              } catch {
                return { meta: { changes: 0 } };
              }
            }

            return { meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

/**
 * Universal Database Provider: automatically selects the best available storage
 */
export async function getDatabase(): Promise<DbAdapter> {
  // 1. Cloudflare Workers native binding (when run inside Cloudflare Worker runtime)
  const cfEnv = (globalThis as any).env;
  if (cfEnv?.DB) {
    return cfEnv.DB;
  }

  // 2. Turso libSQL Cloud (free persistent SQLite in the cloud)
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl && tursoToken) {
    return new TursoDbAdapter(tursoUrl, tursoToken);
  }

  // 3. Upstash Redis / Vercel KV (1-click Vercel marketplace integration)
  const kvUrl =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (kvUrl && kvToken) {
    return new UpstashKvDbAdapter(kvUrl, kvToken);
  }

  // 4. Default fallback: file and in-memory persistent store
  return new LocalDbAdapter();
}
