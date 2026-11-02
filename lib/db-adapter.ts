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

// Fallback in-memory and file-backed store for Node.js / Vercel environments
declare global {
  // eslint-disable-next-line no-var
  var __journeysStore: Map<string, JourneyRow> | undefined;
}

function getStoreFile(): string {
  // Use /tmp on Vercel/serverless environments, local directory in development
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

class LocalDbAdapter implements DbAdapter {
  prepare(query: string) {
    return {
      bind(...args: any[]) {
        return {
          async first<T = JourneyRow>(): Promise<T | null> {
            const store = loadStore();
            const normalized = query.toLowerCase();
            if (normalized.includes("select data,revision") || normalized.includes("select data, revision")) {
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

export async function getDatabase(): Promise<DbAdapter> {
  // If running in Cloudflare Workers environment with D1 bound
  const cfEnv = (globalThis as any).env;
  if (cfEnv?.DB) {
    return cfEnv.DB;
  }

  // Fallback to local / Vercel persistent adapter
  return new LocalDbAdapter();
}
